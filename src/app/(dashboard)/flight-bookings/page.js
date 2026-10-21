"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaPlane,
  FaRegFileAlt,
  FaTimesCircle,
  FaUserEdit,
} from "react-icons/fa";
import { CgCalendar } from "react-icons/cg";
import { Menu } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { FiSearch, FiDownload } from "react-icons/fi";
import { useSession } from "next-auth/react";
import Link from "next/link";
import moment from "moment";
import { useRouter } from "next/navigation";
import { RiDeleteBin6Line } from "react-icons/ri";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
import EditPassengerModal from "@/dashboard_components/EditPassengerModal/EditPassengerModal";
import RefundQuoteModal from "@/dashboard_components/RefundQuoteModal/RefundQuoteModal";
import {
  getBookingTripType,
  groupSegments,
} from "@/components/Flights/Checkout/flightHelpers";

const airportCode = (point) =>
  point?.airport_code || point?.iata_code || point?.code || "";

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

/**
 * Build FLIGHT / DATE rows for the bookings table.
 * - one_way: Departure → Arrival
 * - return: outbound + return (2 lines)
 * - multi_city: each leg Departure → Arrival (connection stops skipped)
 */
function getFlightRouteLines(booking) {
  const details = booking?.flight_details || {};
  const segments = booking?.segments || [];
  const flight = {
    trip_type: details.trip_type,
    search_criteria: booking?.search_criteria || details.search_criteria,
    segments,
  };
  const tripType = getBookingTripType(flight);

  const formatDate = (seg) => {
    const raw = seg?.departure?.datetime || seg?.departure?.date;
    return raw ? moment(raw).format("DD MMM YYYY") : "";
  };

  const lineFromSegments = (segs) => {
    if (!segs?.length) return null;
    const from = airportCode(segs[0]?.departure);
    const to = airportCode(segs[segs.length - 1]?.arrival);
    if (!from && !to) return null;
    return {
      from: from || details.departure_code || "—",
      to: to || details.arrival_code || "—",
      date: formatDate(segs[0]),
    };
  };

  if (!segments.length) {
    return [
      {
        from: details.departure_code || "—",
        to: details.arrival_code || "—",
        date: details.departure_date
          ? moment(details.departure_date).format("DD MMM YYYY")
          : "",
      },
    ];
  }

  const groups = groupSegments(flight);

  if (tripType === "one_way") {
    const line = lineFromSegments(groups[0]?.segments || segments);
    return line ? [line] : [];
  }

  return groups
    .map((group) => lineFromSegments(group.segments))
    .filter(Boolean);
}

export default function FlightBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState({
    opened: false,
    bookingReference: "",
    provider: "",
  });
  const [editPassengerModal, setEditPassengerModal] = useState({
    opened: false,
    bookingReference: "",
    provider: "",
    passengers: [],
  });
  const [refundModal, setRefundModal] = useState({
    opened: false,
    bookingReference: "",
    provider: "",
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/flight/bookings`,
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
    const passenger = booking?.passenger_details?.[0];
    const matchesSearch =
      searchQuery === "" ||
      booking?.booking_reference
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.holder_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.holder_surname
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.holder_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      passenger?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      passenger?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      passenger?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.hotel?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" ||
      normalizeBookingStatus(booking?.booking_status) ===
        selectedStatus.toLowerCase();

    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const travelDate = moment(booking?.flight_details?.departure_date);
      matchesDateRange =
        travelDate.isSameOrAfter(moment(dateRange[0]), "day") &&
        travelDate.isSameOrBefore(moment(dateRange[1]), "day");
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
      title: "Total Flight Bookings",
      value: statusCounts.total,
      icon: <FaPlane size={18} />,
      badgeTone: "",
    },
    {
      badge: "Confirmed",
      title: "Confirmed Flight Bookings",
      value: statusCounts.confirmed,
      icon: <FaCheckCircle size={18} />,
      badgeTone: "",
    },
    {
      badge: "Tentative",
      title: "Tentative Flight Bookings",
      value: statusCounts.tentative,
      icon: <FaClock size={18} />,
      badgeTone: "pending",
    },
    {
      badge: "Cancelled",
      title: "Cancelled Flight Bookings",
      value: statusCounts.cancelled,
      icon: <FaTimesCircle size={18} />,
      badgeTone: "cancelled",
    },
  ];

  const statusBadgeClass = {
    confirmed: "hb-badge-confirmed",
    tentative: "hb-badge-tentative",
    pending: "hb-badge-pending",
    cancelled: "hb-badge-cancelled",
    paid: "hb-badge-confirmed",
  };

  const downloadReport = () => {
    const headers = [
      "Booking Ref",
      "Guest Name",
      "Guest Email",
      "Route",
      "Departure Date",
      "Issued Date",
      "Price",
      "Booking Status",
      "Payment Status",
    ];
    const rows = filteredBookings.map((booking) => {
      const passenger = booking?.passenger_details?.[0];
      const routes = getFlightRouteLines(booking)
        .map((line) => `${line.from} → ${line.to}${line.date ? ` (${line.date})` : ""}`)
        .join(" | ");
      return [
        booking?.booking_reference || "",
        `${passenger?.firstName || ""} ${passenger?.lastName || ""}`.trim(),
        passenger?.email || "",
        routes,
        booking?.flight_details?.departure_date
          ? moment(booking.flight_details.departure_date).format("DD MMM YYYY")
          : "",
        booking?.created_at
          ? moment(booking.created_at).format("DD MMM YYYY")
          : "",
        `${booking?.pricing?.display_currency || ""} ${booking?.pricing?.amount ?? ""}`.trim(),
        formatStatusLabel(booking?.booking_status),
        formatStatusLabel(booking?.payment_status),
      ];
    });
    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flight-bookings-${moment().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hb-page">
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() =>
          setCancelModal({ opened: false, bookingReference: "", provider: "" })
        }
        bookingReference={cancelModal.bookingReference}
        provider={cancelModal.provider}
        type="flight"
        endPoint="/api/flights/booking/cancel"
        onSuccess={() => fetchBookings()}
      />
      <EditPassengerModal
        opened={editPassengerModal.opened}
        onClose={() =>
          setEditPassengerModal({
            opened: false,
            bookingReference: "",
            provider: "",
            passengers: [],
          })
        }
        bookingReference={editPassengerModal.bookingReference}
        provider={editPassengerModal.provider}
        passengers={editPassengerModal.passengers}
        onSuccess={() => fetchBookings()}
      />
      <RefundQuoteModal
        opened={refundModal.opened}
        onClose={() =>
          setRefundModal({
            opened: false,
            bookingReference: "",
            provider: "",
          })
        }
        bookingReference={refundModal.bookingReference}
        provider={refundModal.provider}
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
          <h2 className="hb-panel-title">Flight Bookings</h2>
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
                  "Booked By",
                  "Flight / Date",
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
                  const routeLines = getFlightRouteLines(booking);
                  const isConfirmed = st === "confirmed";
                  const isPaid =
                    booking?.payment_status?.toLowerCase() === "paid";
                  const departureInFuture = moment(
                    booking?.flight_details?.departure_date,
                  ).isAfter(moment(), "day");
                  const canEditOrRefund =
                    isConfirmed && isPaid && departureInFuture;
                  const passenger = booking?.passenger_details?.[0];

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
                          {passenger?.firstName} {passenger?.lastName}
                        </div>
                        <div className="hb-guest-email">{passenger?.email}</div>
                      </td>
                      <td>
                        {routeLines.map((line, lineIdx) => (
                          <div
                            key={lineIdx}
                            style={lineIdx > 0 ? { marginTop: 4 } : undefined}
                          >
                            <div className="hb-hotel d-flex align-items-center gap-1">
                              {line.from}
                              <FaArrowRight size={9} />
                              {line.to}
                            </div>
                            {line.date && (
                              <div className="hb-guest-email">{line.date}</div>
                            )}
                          </div>
                        ))}
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
                        {booking?.pricing?.display_currency}{" "}
                        {booking?.pricing?.amount}
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
                                href={`/flights/invoice/${booking?.booking_reference}`}
                                target="_blank"
                                className="text-dark"
                              >
                                View Invoice
                              </Link>
                            </Menu.Item>
                            <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                              <Link
                                href={`/flights/voucher/${booking?.booking_reference}`}
                                target="_blank"
                                className="text-dark"
                              >
                                View Voucher
                              </Link>
                            </Menu.Item>
                            {canEditOrRefund && (
                              <Menu.Item
                                leftSection={<FaUserEdit size={13} />}
                                onClick={() =>
                                  setEditPassengerModal({
                                    opened: true,
                                    bookingReference:
                                      booking?.booking_reference,
                                    provider: booking?.provider,
                                    passengers:
                                      booking?.passenger_details || [],
                                  })
                                }
                              >
                                Edit Passenger
                              </Menu.Item>
                            )}
                            {booking?.booking_status?.toLowerCase() !==
                              "cancelled" &&
                              departureInFuture && (
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
