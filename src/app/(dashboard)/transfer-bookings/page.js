"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaCar,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaRegFileAlt,
} from "react-icons/fa";
import { Menu } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { CgCalendar } from "react-icons/cg";
import { FiSearch, FiDownload } from "react-icons/fi";
import moment from "moment";
import { useSession } from "next-auth/react";
import { useRouter as useNextRouter } from "next/navigation";
import Link from "next/link";
import { RiDeleteBin6Line } from "react-icons/ri";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";

function formatStatusLabel(status) {
  if (!status) return "-";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeBookingStatus(status) {
  const s = (status || "").toLowerCase().trim().replace(/\s+/g, "_");
  if (s === "pending" || s === "tentative") return "tentative";
  return s;
}

export default function TransferBookingsPage() {
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);

  const fetchBookings = useCallback(async () => {
    const email = session?.user?.email;
    const otp = session?.user?.otp;
    if (!email || !otp) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/transfer/bookings`,
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
      setBookings(data?.data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user?.email || !session?.user?.otp) return;
    fetchBookings();
  }, [session, fetchBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchQuery === "" ||
      booking?.invoice_number
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.booking_reference
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

    const matchesStatus =
      selectedStatus === "all" ||
      normalizeBookingStatus(booking?.booking_status) ===
        selectedStatus.toLowerCase();

    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const bookingDate = moment(booking?.booking_criteria?.pickup_date);
      matchesDateRange =
        bookingDate.isSameOrAfter(moment(dateRange[0]), "day") &&
        bookingDate.isSameOrBefore(moment(dateRange[1]), "day");
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const hasActiveFilters =
    selectedStatus !== "all" || Boolean(dateRange[0] && dateRange[1]);

  const statusCounts = useMemo(() => {
    const counts = { total: bookings.length, confirmed: 0, tentative: 0, cancelled: 0 };
    bookings.forEach((booking) => {
      const status = normalizeBookingStatus(booking?.booking_status);
      if (status === "confirmed") counts.confirmed += 1;
      else if (status === "tentative") counts.tentative += 1;
      else if (status === "cancelled") counts.cancelled += 1;
    });
    return counts;
  }, [bookings]);

  const statCards = [
    {
      badge: "Total Bookings",
      title: "Total Transfer Bookings",
      value: statusCounts.total,
      icon: <FaCar size={18} />,
      badgeTone: "",
    },
    {
      badge: "Confirmed",
      title: "Confirmed Transfer Bookings",
      value: statusCounts.confirmed,
      icon: <FaCheckCircle size={18} />,
      badgeTone: "",
    },
    {
      badge: "Tentative",
      title: "Tentative Transfer Bookings",
      value: statusCounts.tentative,
      icon: <FaClock size={18} />,
      badgeTone: "pending",
    },
    {
      badge: "Cancelled",
      title: "Cancelled Transfer Bookings",
      value: statusCounts.cancelled,
      icon: <FaTimesCircle size={18} />,
      badgeTone: "cancelled",
    },
  ];

  const statusBadgeClass = {
    confirmed: "hb-badge-confirmed",
    paid: "hb-badge-confirmed",
    tentative: "hb-badge-tentative",
    pending: "hb-badge-pending",
    cancelled: "hb-badge-cancelled",
  };

  const downloadReport = () => {
    const headers = [
      "Invoice No",
      "Reference",
      "Guest Name",
      "Guest Email",
      "Vehicle",
      "Pickup",
      "Trip Type",
      "Pickup Date",
      "Issued Date",
      "Price",
      "Booking Status",
      "Payment Status",
    ];
    const rows = filteredBookings.map((booking) => [
      booking?.invoice_number || "",
      booking?.booking_reference || "",
      `${booking?.lead_passenger?.first_name || ""} ${booking?.lead_passenger?.last_name || ""}`.trim(),
      booking?.lead_passenger?.email || "",
      booking?.transfer?.vehicle_name || "",
      booking?.booking_criteria?.pickup_location || "",
      booking?.transfer?.trip_type || "",
      booking?.booking_criteria?.pickup_date
        ? moment(booking.booking_criteria.pickup_date).format("MMM DD, YYYY")
        : "",
      booking?.created_at
        ? moment(booking.created_at).format("MMM DD, YYYY")
        : "",
      `${booking?.pricing?.display_currency || ""} ${booking?.pricing?.amount_after_exchange ?? ""}`.trim(),
      formatStatusLabel(booking?.booking_status),
      formatStatusLabel(booking?.payment_status),
    ]);
    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transfer-bookings-${moment().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hb-page">
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
        endPoint="/api/transfers/booking/cancel"
        onSuccess={() => fetchBookings()}
      />

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
          <h2 className="hb-panel-title">Transfer Bookings</h2>
        </div>

        <form className="hb-toolbar" onSubmit={(e) => e.preventDefault()}>
          <div className="hb-search">
            <FiSearch className="hb-search-icon" size={16} />
            <input
              type="text"
              className="hb-search-input"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search bookings"
            />
          </div>

          <div className="hb-status-row" role="group" aria-label="Status filter">
            {[
              { key: "all", label: "All" },
              { key: "confirmed", label: "Confirmed" },
              { key: "tentative", label: "Tentative" },
              { key: "cancelled", label: "Cancelled" },
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
            disabled={loading || filteredBookings.length === 0}
          >
            <FiDownload size={15} />
            Download Report
          </button>
        </form>

        <div className="hb-results-meta">
          {filteredBookings.length} of {bookings.length} result
          {bookings.length !== 1 ? "s" : ""}
          {hasActiveFilters ? " (filtered)" : ""}
        </div>

        <div className="hb-table-wrap">
          <table className="hb-table">
            <thead>
              <tr>
                {[
                  "Invoice No",
                  "Guest",
                  "Vehicle / Pickup",
                  "Trip Type",
                  "Issued Date",
                  "Status",
                  "Amount",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="mp-skeleton-row">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div
                          className={`mp-skeleton-bar${j === 7 ? " mp-skeleton-bar-short" : ""}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="hb-empty">
                    No bookings found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, index) => {
                  const st = booking?.booking_status?.toLowerCase();
                  const badgeClass =
                    statusBadgeClass[st] || "hb-badge-default";
                  const paymentBadgeClass =
                    statusBadgeClass[
                      booking?.payment_status?.toLowerCase()
                    ] || "hb-badge-default";

                  return (
                    <tr
                      key={
                        booking?.id ||
                        booking?.invoice_number ||
                        booking?.booking_reference ||
                        index
                      }
                    >
                      <td>
                        <span className="hb-code">
                          {booking?.invoice_number || "-"}
                        </span>
                        {booking?.booking_reference && (
                          <span className="hb-code-sub">
                            Ref: {booking.booking_reference}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="hb-guest-name">
                          {booking?.lead_passenger?.first_name}{" "}
                          {booking?.lead_passenger?.last_name}
                        </div>
                        <div className="hb-guest-email">
                          {booking?.lead_passenger?.email}
                        </div>
                      </td>
                      <td>
                        <div className="hb-hotel">
                          {booking?.selected_transfers?.vehicle.name || "-"}
                        </div>
                        <div className="hb-guest-email">
                          {booking?.booking_criteria?.pickup_location}
                        </div>
                        <div className="hb-guest-email">
                          {booking?.booking_criteria?.pickup_date
                            ? moment(
                                booking.booking_criteria.pickup_date,
                              ).format("MMM DD, YYYY")
                            : "-"}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {booking?.selected_transfers?.trip_type || "-"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {booking?.created_at
                          ? moment(booking.created_at).format("MMM DD, YYYY")
                          : "-"}
                      </td>
                      <td>
                        <span className={`hb-badge ${badgeClass}`}>
                          Status: {formatStatusLabel(booking?.booking_status)}
                        </span>
                        <br />
                        <span className={`hb-badge ${paymentBadgeClass}`}>
                          Payment:{" "}
                          {formatStatusLabel(booking?.payment_status)}
                        </span>
                      </td>
                      <td className="hb-price">
                        {booking?.pricing?.display_currency}{" "}
                        {booking?.pricing?.amount_after_exchange}
                      </td>
                      <td>
                        <Menu shadow="md" position="bottom-end" width={190}>
                          <Menu.Target>
                            <button
                              type="button"
                              className="hb-actions-btn"
                              aria-label="Booking actions"
                            >
                              ...
                            </button>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                              <Link
                                href={`/transfers/invoice/${booking?.invoice_number}`}
                                target="_blank"
                                className="text-dark"
                              >
                                View Invoice
                              </Link>
                            </Menu.Item>
                            <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                              <Link
                                href={`/transfers/voucher/${booking?.invoice_number}`}
                                target="_blank"
                                className="text-dark"
                              >
                                View Voucher
                              </Link>
                            </Menu.Item>
                            {booking?.booking_status?.toLowerCase() !==
                              "cancelled" &&
                              moment(
                                booking?.booking_criteria?.pickup_date,
                              ).isAfter(moment(), "day") && (
                                <Menu.Item
                                  leftSection={
                                    <RiDeleteBin6Line color="red" size={13} />
                                  }
                                  color="red"
                                  onClick={() =>
                                    setCancelModal({
                                      opened: true,
                                      bookingReference:
                                        booking?.booking_reference,
                                      provider: booking?.provider,
                                      transferCancellationPolicies:
                                        booking?.cancellation_policies ||
                                        booking?.transfer
                                          ?.cancellation_policies ||
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
                                          booking?.pricing
                                            ?.supplier_to_display_rate ||
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
