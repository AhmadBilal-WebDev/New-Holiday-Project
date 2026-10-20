"use client";
import React, { useState, useEffect } from "react";
import styles from "../Bookings.module.css";
import { AiOutlineBars } from "react-icons/ai";
import { useSession } from "next-auth/react";
import { Menu, Pagination } from "@mantine/core";
import { LiaAngleDownSolid } from "react-icons/lia";
import { IoMdCheckmark } from "react-icons/io";
import { CgCalendar } from "react-icons/cg";
import { Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import moment from "moment";
import Image from "next/image";

const statusBadgeClass = {
  confirmed: "mp-badge-confirmed",
  pending: "mp-badge-pending",
  rejected: "mp-badge-rejected",
};

const PAGE_SIZE = 10;

function page() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [activePage, setActivePage] = useState(1);
  const [calendarColumns, setCalendarColumns] = useState(2);

  useEffect(() => {
    const update = () => setCalendarColumns(window.innerWidth < 768 ? 1 : 2);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    fetchPayments();
  }, []);

  async function fetchPayments() {
    const { email, otp } = session.user;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/payment-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();
      if (!data?.success && data?.message?.toLowerCase().includes('otp')) {
        router.push(`/verify-otp?email=${encodeURIComponent(session?.user?.email || '')}`);
        return;
      }
      setPayments(data?.data || data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p?.invoice_number?.toLowerCase().includes(q) ||
      p?.booking_type?.toLowerCase().includes(q) ||
      p?.booking_id?.toString().includes(q) ||
      p?.transaction_id?.toLowerCase().includes(q) ||
      p?.name?.toLowerCase().includes(q) ||
      p?.email?.toLowerCase().includes(q);

    const matchesStatus =
      selectedStatus === "all" ||
      p?.status?.toLowerCase() === selectedStatus ||
      p?.payment_status?.toLowerCase() === selectedStatus;

    let matchesDate = true;
    if (dateRange[0] && dateRange[1]) {
      const d = moment(p?.payment_date || p?.created_at);
      matchesDate =
        d.isSameOrAfter(moment(dateRange[0]), "day") &&
        d.isSameOrBefore(moment(dateRange[1]), "day");
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const pagedPayments = filteredPayments.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );

  const hasActiveFilters = searchQuery || selectedStatus !== "all" || dateRange[0];

  const dateLabel =
    dateRange[0] && dateRange[1]
      ? `${moment(dateRange[0]).format("MMM DD")} – ${moment(dateRange[1]).format("MMM DD, YYYY")}`
      : "Date Range";

  return (
    <div className="mp-page-wrapper">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="mp-header-icon d-flex align-items-center justify-content-center rounded-2 flex-shrink-0">
          <AiOutlineBars size={22} />
        </div>
        <div>
          <h5 className="mp-header-title fw-bold">My Payments</h5>
          <p className="mp-header-subtitle text-muted">
            View and track all your payment transactions
          </p>
        </div>
      </div>

      {/* Table Card */}
      <div className="mp-table-card bg-white rounded-3">
        {/* Filter Bar */}
        <div className="mp-filter-bar">
          <input
            type="text"
            placeholder="Search by invoice or transaction ID..."
            className={styles.searchInput}
            style={{ flex: "1 1 220px", minWidth: 0, fontSize: 16 }}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActivePage(1); }}
          />
          <Menu shadow="md" position="bottom-end" width="target">
            <Menu.Target>
              <button className={styles.filterBtn}>
                {selectedStatus === "all"
                  ? "All Status"
                  : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}{" "}
                <LiaAngleDownSolid />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {["all", "confirmed", "pending", "rejected"].map((s) => (
                <Menu.Item
                  key={s}
                  leftSection={
                    selectedStatus === s ? (
                      <IoMdCheckmark size={14} />
                    ) : (
                      <span style={{ width: 14, display: "inline-block" }} />
                    )
                  }
                  onClick={() => { setSelectedStatus(s); setActivePage(1); }}
                >
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Popover width="auto" position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <button className={styles.filterBtn}>
                <CgCalendar size={15} /> {dateLabel}
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <DatePicker
                type="range"
                numberOfColumns={calendarColumns}
                value={dateRange}
                onChange={(v) => { setDateRange(v); setActivePage(1); }}
              />
              {dateRange[0] && (
                <div style={{ padding: "8px", borderTop: "1px solid #e9ecef" }}>
                  <button
                    onClick={() => setDateRange([null, null])}
                    style={{
                      width: "100%",
                      padding: "6px 12px",
                      background: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </Popover.Dropdown>
          </Popover>
          {hasActiveFilters && (
            <button
              className="mp-clear-all-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
                setDateRange([null, null]);
                setActivePage(1);
              }}
            >
              Clear All
            </button>
          )}
          <span className="mp-results-count text-muted">
            {filteredPayments.length} of {payments.length} result
            {payments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="w-100" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Invoice No", "Transaction ID", "Payment Date", "Status", "Snapshot"].map((h) => (
                  <th key={h} className="mp-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="mp-skeleton-row">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}>
                        <div className={`mp-skeleton-bar${j === 4 ? " mp-skeleton-bar-short" : ""}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="mp-empty-state">
                    <div className="mp-empty-title">
                      {hasActiveFilters ? "No matching payments" : "No payments found"}
                    </div>
                    <div className="mp-empty-subtitle">
                      {hasActiveFilters
                        ? "Try adjusting your search or filters."
                        : "You have no payment records yet."}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedPayments.map((p, i) => {
                  const st = (p?.status || p?.payment_status || "").toLowerCase();
                  const badgeClass = statusBadgeClass[st] || "mp-badge-default";
                  return (
                    <tr key={p?.id || i} className="mp-table-row">
                      <td className="mp-cell-invoice">
                        {p?.invoice_number || "—"} - {p.booking_type}
                      </td>
                      <td className="mp-cell-default">
                        {p?.transaction_id || "—"}
                      </td>
                      <td className="mp-cell-date">
                        {p?.payment_date || p?.created_at
                          ? moment(p?.payment_date).format("MMM DD, YYYY")
                          : "—"}
                      </td>
                      <td className="mp-cell-status">
                        <span className={`mp-status-badge ${badgeClass}`}>
                          {st ? st.charAt(0).toUpperCase() + st.slice(1) : "—"}
                        </span>
                      </td>
                      <td className="mp-cell-date">
                        <Image src={p.invoice_snapshot_url} alt={`Invoice-${p.invoice_number} Snapshot`} width={60} height={60} quality={100} className="rounded" style={{ marginRight: 6 }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredPayments.length > PAGE_SIZE && (
          <div className="mp-pagination-wrapper d-flex flex-wrap justify-content-center align-items-center gap-2 py-3 px-2">
            <span className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Showing {(activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length}
            </span>
            <Pagination
              total={totalPages}
              value={activePage}
              onChange={setActivePage}
              size="sm"
              color="#9b8357"
              withEdges
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default page;

