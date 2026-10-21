"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaArrowRight,
  FaRegFileAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi2";
import { Menu } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { CgCalendar } from "react-icons/cg";
import { FiSearch, FiDownload } from "react-icons/fi";
import moment from "moment";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
import { useRouter } from "next/navigation";
import { RiDeleteBin6Line } from "react-icons/ri";

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

export default function PackageBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState({
    opened: false,
    bookingReference: "",
    provider: "",
    bookingId: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/package/bookings`,
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
      booking?.booking_reference
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_first_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_last_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.package_details?.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.hotel?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" ||
      normalizeBookingStatus(booking?.booking_status) ===
        selectedStatus.toLowerCase();

    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const checkInDate = moment(booking?.package_details?.startDate);
      matchesDateRange =
        checkInDate.isSameOrAfter(moment(dateRange[0]), "day") &&
        checkInDate.isSameOrBefore(moment(dateRange[1]), "day");
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
      title: "Total Package Bookings",
      value: statusCounts.total,
      icon: <HiOutlineSparkles size={18} />,
      badgeTone: "",
    },
    {
      badge: "Confirmed",
      title: "Confirmed Package Bookings",
      value: statusCounts.confirmed,
      icon: <FaCheckCircle size={18} />,
      badgeTone: "",
    },
    {
      badge: "Tentative",
      title: "Tentative Package Bookings",
      value: statusCounts.tentative,
      icon: <FaClock size={18} />,
      badgeTone: "pending",
    },
    {
      badge: "Cancelled",
      title: "Cancelled Package Bookings",
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
      "Booking Ref",
      "Guest Name",
      "Guest Email",
      "Package",
      "Start Date",
      "End Date",
      "Issued Date",
      "Price",
      "Booking Status",
      "Payment Status",
    ];
    const rows = filteredBookings.map((booking) => [
      booking?.booking_reference || "",
      `${booking?.lead_title || ""} ${booking?.lead_first_name || ""} ${booking?.lead_last_name || ""}`.trim(),
      booking?.lead_email || "",
      booking?.package_details?.title || "",
      booking?.package_details?.startDate
        ? moment(booking.package_details.startDate).format("MMM DD, YYYY")
        : "",
      booking?.package_details?.endDate
        ? moment(booking.package_details.endDate).format("MMM DD, YYYY")
        : "",
      booking?.created_at
        ? moment(booking.created_at).format("DD MMM YYYY")
        : "",
      `${booking?.customer_currency || ""} ${booking?.amount ?? ""}`.trim(),
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
    link.download = `package-bookings-${moment().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() =>
          setCancelModal({
            opened: false,
            bookingReference: "",
            provider: "",
            bookingId: "",
          })
        }
        bookingReference={cancelModal.bookingReference}
        provider={cancelModal.provider}
        bookingId={cancelModal.bookingId}
        type="package"
        endPoint="/api/packages/cancel-booking"
        onSuccess={() => fetchBookings()}
      />

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
            <h2 className="hb-panel-title">Package Bookings</h2>
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
                    "Invoice No.",
                    "Guest",
                    "Package Detail",
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
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}>
                          <div
                            className={`mp-skeleton-bar${j === 6 ? " mp-skeleton-bar-short" : ""}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="hb-empty">
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
                        key={booking?.id || booking?.booking_reference || index}
                      >
                        <td>
                          <span className="hb-code">
                            {booking?.booking_reference || "-"}
                          </span>
                        </td>
                        <td>
                          <div className="hb-guest-name">
                            {booking?.lead_title} {booking?.lead_first_name}{" "}
                            {booking?.lead_last_name}
                          </div>
                          <div className="hb-guest-email">
                            {booking?.lead_email}
                          </div>
                        </td>
                        <td>
                          <div className="hb-hotel">
                            {booking?.package_details?.title || "-"}
                          </div>
                          <div className="hb-guest-email">
                            {booking?.package_details?.startDate
                              ? moment(
                                  booking.package_details.startDate,
                                ).format("MMM DD, YYYY")
                              : "-"}{" "}
                            <FaArrowRight size={9} />{" "}
                            {booking?.package_details?.endDate
                              ? moment(booking.package_details.endDate).format(
                                  "MMM DD, YYYY",
                                )
                              : "-"}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {booking?.created_at
                            ? moment(booking.created_at).format("DD MMM YYYY")
                            : "-"}
                        </td>
                        <td>
                          <span className={`hb-badge ${badgeClass}`}>
                            Status: {formatStatusLabel(booking?.booking_status)}
                          </span>
                          <br />
                          <span className={`hb-badge mt-1 ${paymentBadgeClass}`}>
                            Payment:{" "}
                            {formatStatusLabel(booking?.payment_status)}
                          </span>
                        </td>
                        <td className="hb-price">
                          {booking?.customer_currency} {booking?.amount}
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
                              <Menu.Item
                                leftSection={<FaRegFileAlt size={13} />}
                              >
                                <Link
                                  href={`/${booking?.package_details?.slug}/invoice/${booking?.booking_reference}`}
                                  target="_blank"
                                  className="text-dark"
                                >
                                  View Invoice
                                </Link>
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<FaRegFileAlt size={13} />}
                              >
                                <Link
                                  href={`/${booking?.package_details?.slug}/voucher/${booking?.booking_reference}`}
                                  target="_blank"
                                  className="text-dark"
                                >
                                  View Voucher
                                </Link>
                              </Menu.Item>
                              {booking?.booking_status?.toLowerCase() !==
                                "cancelled" &&
                                moment(
                                  booking?.package_details?.startDate,
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
                                        provider: "",
                                        bookingId: booking?.id,
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
    </>
  );
}
