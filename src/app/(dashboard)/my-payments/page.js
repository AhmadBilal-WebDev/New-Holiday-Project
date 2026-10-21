"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { DatePickerInput } from "@mantine/dates";
import { CgCalendar } from "react-icons/cg";
import { FiSearch, FiDownload } from "react-icons/fi";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaMoneyCheckAlt,
} from "react-icons/fa";
import moment from "moment";
import Image from "next/image";
import { useRouter } from "next/navigation";

function formatStatusLabel(status) {
  if (!status) return "-";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePaymentStatus(status) {
  const s = (status || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (s === "confirmed" || s === "paid" || s === "approved") return "confirmed";
  if (s === "pending" || s === "tentative") return "pending";
  if (s === "rejected" || s === "cancelled") return "rejected";
  return s;
}

function formatPaymentDate(value) {
  if (!value) return "—";
  const parsed = moment(
    value,
    ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", moment.ISO_8601],
    true,
  );
  if (parsed.isValid()) return parsed.format("MMM DD, YYYY");
  const fallback = moment(value);
  return fallback.isValid() ? fallback.format("MMM DD, YYYY") : String(value);
}

function formatAmount(amount, currency) {
  if (amount == null || amount === "") return "—";
  const num = Number(amount);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(amount);
  return currency ? `${currency} ${formatted}` : formatted;
}

export default function MyPaymentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);

  const fetchPayments = useCallback(async () => {
    const email = session?.user?.email;
    const otp = session?.user?.otp;
    if (!email || !otp) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/payment-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();
      if (!data?.success && data?.message?.toLowerCase().includes("otp")) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(session?.user?.email || "")}`,
        );
        return;
      }
      setPayments(data?.data || data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user?.email || !session?.user?.otp) return;
    fetchPayments();
  }, [session, fetchPayments]);

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p?.invoice_number?.toLowerCase().includes(q) ||
      p?.booking_type?.toLowerCase().includes(q) ||
      p?.booking_id?.toString().includes(q) ||
      p?.booking_reference?.toString().toLowerCase().includes(q) ||
      p?.transaction_id?.toLowerCase().includes(q) ||
      p?.currency?.toLowerCase().includes(q) ||
      p?.amount?.toString().includes(q) ||
      p?.payment_amount?.toString().includes(q) ||
      p?.name?.toLowerCase().includes(q) ||
      p?.email?.toLowerCase().includes(q);

    const matchesStatus =
      selectedStatus === "all" ||
      normalizePaymentStatus(p?.status || p?.payment_status) ===
        selectedStatus;

    let matchesDate = true;
    if (dateRange[0] && dateRange[1]) {
      const d = moment(p?.payment_date || p?.created_at);
      matchesDate =
        d.isSameOrAfter(moment(dateRange[0]), "day") &&
        d.isSameOrBefore(moment(dateRange[1]), "day");
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedStatus !== "all" ||
    Boolean(dateRange[0] && dateRange[1]);

  const statusCounts = useMemo(() => {
    const counts = {
      total: payments.length,
      confirmed: 0,
      pending: 0,
      rejected: 0,
    };
    payments.forEach((p) => {
      const st = normalizePaymentStatus(p?.status || p?.payment_status);
      if (st === "confirmed") counts.confirmed += 1;
      else if (st === "pending") counts.pending += 1;
      else if (st === "rejected") counts.rejected += 1;
    });
    return counts;
  }, [payments]);

  const statCards = [
    {
      badge: "Total Payments",
      title: "Total Payments",
      value: statusCounts.total,
      icon: <FaMoneyCheckAlt size={18} />,
      badgeTone: "",
    },
    {
      badge: "Confirmed",
      title: "Confirmed Payments",
      value: statusCounts.confirmed,
      icon: <FaCheckCircle size={18} />,
      badgeTone: "",
    },
    {
      badge: "Pending",
      title: "Pending Payments",
      value: statusCounts.pending,
      icon: <FaClock size={18} />,
      badgeTone: "pending",
    },
    {
      badge: "Rejected",
      title: "Rejected Payments",
      value: statusCounts.rejected,
      icon: <FaTimesCircle size={18} />,
      badgeTone: "cancelled",
    },
  ];

  const statusBadgeClass = {
    confirmed: "hb-badge-confirmed",
    paid: "hb-badge-confirmed",
    pending: "hb-badge-pending",
    rejected: "hb-badge-cancelled",
    cancelled: "hb-badge-cancelled",
  };

  const downloadReport = () => {
    const headers = [
      "Invoice No",
      "Booking Type",
      "Transaction ID",
      "Amount",
      "Currency",
      "Payment Date",
      "Status",
    ];
    const rows = filteredPayments.map((p) => [
      p?.invoice_number || "",
      p?.booking_type || "",
      p?.transaction_id || "",
      p?.amount ?? p?.payment_amount ?? "",
      p?.currency || "",
      formatPaymentDate(p?.payment_date || p?.created_at).replace("—", ""),
      formatStatusLabel(p?.status || p?.payment_status),
    ]);
    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-payments-${moment().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hb-page">
      <div className="hb-stats">
        {statCards.map((s) => (
          <article className="hb-stat-card" key={s.title}>
            <div className="hb-stat-top">
              <span className="hb-stat-icon">{s.icon}</span>
              <span className={`hb-stat-badge ${s.badgeTone}`.trim()}>
                {s.badge}
              </span>
            </div>
            <p className="hb-stat-title">{s.title}</p>
            <h3 className="hb-stat-value">{s.value ?? "-"}</h3>
          </article>
        ))}
      </div>

      <section className="hb-panel">
        <div className="hb-panel-head">
          <h2 className="hb-panel-title">My Payments</h2>
        </div>

        <form className="hb-toolbar" onSubmit={(e) => e.preventDefault()}>
          <div className="hb-search">
            <FiSearch className="hb-search-icon" size={16} />
            <input
              type="text"
              className="hb-search-input"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search payments"
            />
          </div>

          <div className="hb-status-row" role="group" aria-label="Status filter">
            {[
              { key: "all", label: "All" },
              { key: "confirmed", label: "Confirmed" },
              { key: "pending", label: "Pending" },
              { key: "rejected", label: "Rejected" },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                className={`hb-status-chip${selectedStatus === s.key ? " active" : ""}`}
                onClick={() => setSelectedStatus(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <DatePickerInput
            type="range"
            placeholder="Date Range"
            value={dateRange}
            onChange={setDateRange}
            leftSection={<CgCalendar size={15} />}
            clearable
            className="hb-date-input"
            classNames={{ input: "hb-date-input-field" }}
            valueFormat="MMM DD"
            popoverProps={{
              position: "bottom-start",
              withinPortal: true,
              middlewares: { flip: true, shift: true },
            }}
          />

          {hasActiveFilters && (
            <button
              type="button"
              className="hb-btn-clear"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
                setDateRange([null, null]);
              }}
            >
              Clear
            </button>
          )}

          <button
            type="button"
            className="hb-btn-download"
            onClick={downloadReport}
            disabled={loading || filteredPayments.length === 0}
          >
            <FiDownload size={15} />
            Download Report
          </button>
        </form>

        <div className="hb-results-meta">
          {filteredPayments.length} of {payments.length} result
          {payments.length !== 1 ? "s" : ""}
          {hasActiveFilters ? " (filtered)" : ""}
        </div>

        <div className="hb-table-wrap">
          <table className="hb-table">
            <thead>
              <tr>
                {[
                  "Invoice No",
                  "Transaction ID",
                  "Amount",
                  "Payment Date",
                  "Status",
                  "Snapshot",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="mp-skeleton-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div
                          className={`mp-skeleton-bar${j === 5 ? " mp-skeleton-bar-short" : ""}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="hb-empty">
                    {hasActiveFilters
                      ? "No matching payments found."
                      : "You have no payment records yet."}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, i) => {
                  const st = normalizePaymentStatus(
                    p?.status || p?.payment_status,
                  );
                  const badgeClass =
                    statusBadgeClass[st] || "hb-badge-default";

                  return (
                    <tr key={p?.id || i}>
                      <td>
                        <span className="hb-code">
                          {p?.invoice_number || "—"}
                        </span>
                        {p?.booking_type && (
                          <span className="hb-code-sub">{p.booking_type}</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {p?.transaction_id || "—"}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                        {formatAmount(
                          p?.amount ?? p?.payment_amount,
                          p?.currency,
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatPaymentDate(p?.payment_date || p?.created_at)}
                      </td>
                      <td>
                        <span className={`hb-badge ${badgeClass}`}>
                          {formatStatusLabel(p?.status || p?.payment_status)}
                        </span>
                      </td>
                      <td>
                        {p?.invoice_snapshot_url ? (
                          <a
                            href={p.invoice_snapshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Image
                              src={p.invoice_snapshot_url}
                              alt={`Invoice-${p.invoice_number} Snapshot`}
                              width={56}
                              height={56}
                              quality={100}
                              className="rounded"
                              style={{ objectFit: "cover" }}
                            />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
