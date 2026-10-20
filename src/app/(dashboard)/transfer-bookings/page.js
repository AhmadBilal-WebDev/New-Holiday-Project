"use client";
import React, { useState, useEffect } from "react";
import styles from "../Bookings.module.css";
import {
  FaCar,
  FaEye,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFile,
  FaRegFileAlt,
} from "react-icons/fa";
import { Menu, Pagination } from "@mantine/core";
import moment from "moment";
import { CgCalendar } from "react-icons/cg";
import { Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { LiaAngleDownSolid } from "react-icons/lia";
import { IoMdCheckmark } from "react-icons/io";
import { useSession } from "next-auth/react";
import { useRouter as useNextRouter } from "next/navigation";
import Link from "next/link";
import { CiFileOn } from "react-icons/ci";
import { RiDeleteBin6Line } from "react-icons/ri";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
export default function HotelBookingsPage() {
  const { data: session } = useSession();
  const router = useNextRouter();
  const [cancelModal, setCancelModal] = useState({
    opened: false,
    bookingReference: "",
    provider: "",
    transferCancellationPolicies: [],
    displayCurrency: "",
    supplierCurrency: "",
    supplierToDisplayRate: 1,
  });

  useEffect(() => {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    fetchBookings();
  }, []);

  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [activePage, setActivePage] = useState(1);
  const PAGE_SIZE = 10;
  const [calendarColumns, setCalendarColumns] = useState(2);

  useEffect(() => {
    const update = () => setCalendarColumns(window.innerWidth < 768 ? 1 : 2);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function fetchBookings() {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/transfer/bookings`,
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

      setBookings(data?.data || []);
      setMeta(data?.meta || {});
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  // useEffect(() => {
  //   fetchBookings();
  // }, []);

  // Filter bookings based on search, status, and date range
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      booking?.invoice_number
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_passenger?.first_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_passenger?.last_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_passenger?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.transfer?.vehicle_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      selectedStatus === "all" ||
      booking?.booking_status?.toLowerCase() === selectedStatus.toLowerCase();

    // Date range filter
    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const bookingDate = moment(booking?.booking_criteria?.pickup_date);
      const startDate = moment(dateRange[0]);
      const endDate = moment(dateRange[1]);
      matchesDateRange =
        bookingDate.isSameOrAfter(startDate, "day") &&
        bookingDate.isSameOrBefore(endDate, "day");
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
  const pagedBookings = filteredBookings.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );

  const statCards = [
    {
      label: "Total Bookings",
      value: meta?.total_count,
      icon: <FaCalendarAlt size={18} />,
      iconBg: "#00000057",
    },
    {
      label: "Confirmed",
      value: meta?.confirmed_count,
      icon: <FaCheckCircle size={18} />,
      iconBg: "#00000057",
    },
    {
      label: "Tentative",
      value: meta?.tentative_count,
      icon: <FaClock size={18} />,
      iconBg: "#00000057",
    },
    {
      label: "Cancelled",
      value: meta?.cancelled_count,
      icon: <FaTimesCircle size={18} />,
      iconBg: "#00000057",
    },
  ];

  const statusBadgeClass = {
    confirmed: "bk-badge-confirmed",
    paid: "bk-badge-confirmed",
    tentative: "bk-badge-tentative",
    pending: "bk-badge-pending",
    cancelled: "bk-badge-cancelled",
  };

  return (
    <div className="bk-page-wrapper">
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() =>
          setCancelModal({
            opened: false,
            bookingReference: "",
            provider: "",
            transferCancellationPolicies: [],
            displayCurrency: "",
            supplierCurrency: "",
            supplierToDisplayRate: 1,
          })
        }
        bookingReference={cancelModal.bookingReference}
        provider={cancelModal.provider}
        type="transfer"
        transferCancellationPolicies={cancelModal.transferCancellationPolicies}
        displayCurrency={cancelModal.displayCurrency}
        supplierCurrency={cancelModal.supplierCurrency}
        supplierToDisplayRate={cancelModal.supplierToDisplayRate}
        endPoint='/api/transfers/booking/cancel'
        onSuccess={() => fetchBookings()}
      />
      {/* Page Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="bk-header-icon d-flex align-items-center justify-content-center rounded-2 flex-shrink-0">
          <FaCar size={18} />
        </div>
        <div>
          <h5 className="bk-header-title fw-bold">Transfer Bookings</h5>
          <p className="bk-header-subtitle text-muted">
            Manage all your transfer reservations in one place
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {statCards.map((s) => (
          <div className="col-12 col-md-6 col-lg-3" key={s.label}>
            <div className="bk-stat-card rounded-3 p-3 h-100 text-white">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="bk-stat-label text-white">{s.label}</span>
                <div className="bk-stat-icon rounded-2 d-flex align-items-center justify-content-center">
                  {s.icon}
                </div>
              </div>
              <h4 className="fw-bold mb-0">{s.value ?? "-"}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bk-table-card bg-white rounded-3">
        {/* Filter Bar */}
        <div className="bk-filter-bar">
          <input
            type="text"
            placeholder="Search by name, email or invoice number..."
            className={`${styles.searchInput}`}
            style={{ fontSize: 16 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {["all", "confirmed", "pending", "cancelled"].map((s) => (
                <Menu.Item
                  key={s}
                  leftSection={
                    selectedStatus === s ? (
                      <IoMdCheckmark size={14} />
                    ) : (
                      <span style={{ width: 14, display: "inline-block" }} />
                    )
                  }
                  onClick={() => setSelectedStatus(s)}
                >
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Popover width="auto" position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <button className={styles.filterBtn}>
                <CgCalendar size={15} />
                {dateRange[0] && dateRange[1]
                  ? `${moment(dateRange[0]).format("MMM DD")} – ${moment(dateRange[1]).format("MMM DD")}`
                  : "Date Range"}
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <div>
                <h6 className="fw-normal my-2 text-center">Date of Transfer</h6>
              </div>
              <DatePicker
                type="range"
                numberOfColumns={calendarColumns}
                value={dateRange}
                onChange={setDateRange}
              />
              {dateRange[0] && dateRange[1] && (
                <div className="bk-date-clear-wrapper">
                  <button className="bk-date-clear-btn" onClick={() => setDateRange([null, null])}>
                    Clear
                  </button>
                </div>
              )}
            </Popover.Dropdown>
          </Popover>
          <span className="bk-results-count text-muted">
            {filteredBookings.length} of {bookings.length} result
            {bookings.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="bk-table">
            <thead>
              <tr className="bk-thead-tr">
                {["Invoice No", "Guest", "Vehicle / Pickup", "Trip Type", "Issued Date", "Status","Amount", "Actions"].map((h) => (
                  <th key={h} className="bk-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="mp-skeleton-row">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div className={`mp-skeleton-bar${j === 6 ? " mp-skeleton-bar-short" : ""}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="bk-empty-state">
                    No bookings found matching your filters.
                  </td>
                </tr>
              ) : (
                pagedBookings.map((booking, index) => {
                  const st = booking?.booking_status?.toLowerCase();
                  const badgeClass = statusBadgeClass[st] || "bk-badge-default";
                  const paymentBadgeClass = statusBadgeClass[booking?.payment_status?.toLowerCase()] || "bk-badge-default";
                  return (
                    <tr key={index} className="bk-tr">
                      <td className="bk-td-ref">{booking?.invoice_number} <br/><span className="small"> Ref : {booking?.booking_reference}</span></td>
                      <td className="bk-td-guest">
                        <div className="bk-guest-name">
                          {booking?.lead_passenger?.first_name}{" "}
                          {booking?.lead_passenger?.last_name}
                        </div>
                        <div className="bk-guest-email">
                          {booking?.lead_passenger?.email}
                        </div>
                      </td>
                      <td className="bk-td-detail">
                        <div className="bk-detail-primary">
                          {booking?.transfer?.vehicle_name}
                        </div>
                        <div className="bk-detail-secondary">
                          {booking?.booking_criteria?.pickup_location}
                        </div>
                        <div className="bk-detail-secondary">
                          {moment(booking?.booking_criteria?.pickup_date).format("MMM DD, YYYY")}
                        </div>
                      </td>
                      <td className="bk-td-text">
                        {booking?.transfer?.trip_type}
                      </td>
                      <td className="bk-td-text-nowrap">
                        {moment(booking?.created_at).format("MMM DD, YYYY")}
                      </td>
                      <td className="bk-td-ref">
                        <span className={`bk-status-badge ${badgeClass}`}>
                          Status: {st ? st.charAt(0).toUpperCase() + st.slice(1) : "â€”"}
                        </span>
                        <br />
                        <span className={`bk-status-badge mt-1 ${paymentBadgeClass}`}>
                          Payment: {booking?.payment_status ? booking?.payment_status.charAt(0).toUpperCase() + booking?.payment_status.slice(1) : "-"}
                        </span>
                      </td>
                      <td className="bk-td-status">
                        {booking?.pricing?.display_currency} {booking?.pricing?.amount_after_exchange}
                      </td>
                      <td className="bk-td-actions">
                        <button className={styles.actionsBtn}>
                          <Menu shadow="md" position="bottom-end" width={190}>
                            <Menu.Target>
                              <span className="bk-menu-dots">...</span>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                                <Link
                                  href={`/transfers/invoice/${booking?.booking_reference}`}
                                  target="_blank"
                                  className="text-dark"
                                >
                                  View Invoice
                                </Link>
                              </Menu.Item>
                              <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                                <Link
                                  href={`/transfers/voucher/${booking?.booking_reference}`}
                                  target="_blank"
                                  className="text-dark"
                                >
                                  View Voucher
                                </Link>
                              </Menu.Item>
                              {booking?.booking_status?.toLowerCase() !== "cancelled" &&
                                moment(booking?.booking_criteria?.pickup_date).isAfter(moment(), "day") && (
                                <Menu.Item
                                  leftSection={<RiDeleteBin6Line color="red" size={13} />}
                                  color="red"
                                  onClick={() =>
                                    setCancelModal({
                                      opened: true,
                                      bookingReference: booking?.booking_reference,
                                      provider: booking?.provider,
                                      transferCancellationPolicies:
                                        booking?.cancellation_policies ||
                                        booking?.transfer?.cancellation_policies ||
                                        [],
                                      displayCurrency:
                                        booking?.pricing?.display_currency ||
                                        booking?.client_currency ||
                                        "",
                                      supplierCurrency:
                                        booking?.currency_code ||
                                        booking?.supplier_currency ||
                                        booking?.pricing?.supplier_currency ||
                                        "",
                                      supplierToDisplayRate:
                                        Number(
                                          booking?.pricing?.supplier_to_display_rate ||
                                            booking?.supplier_to_display_rate ||
                                            1,
                                        ) || 1,
                                    })
                                  }
                                >
                                  Cancel Booking
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredBookings.length > PAGE_SIZE && (
          <div className="bk-pagination-wrapper d-flex flex-wrap justify-content-center align-items-center gap-2 py-3 px-2">
            <span className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Showing {(activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filteredBookings.length)} of {filteredBookings.length}
            </span>
            <Pagination
              total={totalPages}
              value={activePage}
              onChange={(p) => setActivePage(p)}
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
