'use client'
import React, { useState, useEffect } from 'react'
import styles from '../Bookings.module.css'
import { FaClock, FaCalendarAlt, FaCheckCircle, FaArrowRight, FaPlane, FaRegFileAlt, FaTimesCircle, FaUserEdit, FaUndo } from 'react-icons/fa'
import { CgCalendar } from 'react-icons/cg';
import { Menu, Pagination } from "@mantine/core";
import { Popover } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { LiaAngleDownSolid } from "react-icons/lia";
import { IoMdCheckmark } from "react-icons/io";
import { useSession } from "next-auth/react";
import Link from "next/link";
import moment from "moment";
import { useRouter } from "next/navigation";
import { RiDeleteBin6Line } from 'react-icons/ri';
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
import EditPassengerModal from "@/dashboard_components/EditPassengerModal/EditPassengerModal";
import RefundQuoteModal from "@/dashboard_components/RefundQuoteModal/RefundQuoteModal";
import { getBookingTripType, groupSegments } from '@/components/Flights/Checkout/flightHelpers';

const airportCode = (point) =>
  point?.airport_code || point?.iata_code || point?.code || '';

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
    return raw ? moment(raw).format('DD MMM YYYY') : '';
  };

  const lineFromSegments = (segs) => {
    if (!segs?.length) return null;
    const from = airportCode(segs[0]?.departure);
    const to = airportCode(segs[segs.length - 1]?.arrival);
    if (!from && !to) return null;
    return {
      from: from || details.departure_code || '—',
      to: to || details.arrival_code || '—',
      date: formatDate(segs[0]),
    };
  };

  if (!segments.length) {
    return [{
      from: details.departure_code || '—',
      to: details.arrival_code || '—',
      date: details.departure_date
        ? moment(details.departure_date).format('DD MMM YYYY')
        : '',
    }];
  }

  const groups = groupSegments(flight);

  if (tripType === 'one_way') {
    const line = lineFromSegments(groups[0]?.segments || segments);
    return line ? [line] : [];
  }

  // return + multi_city: one row per leg (stops already merged inside group)
  return groups.map((group) => lineFromSegments(group.segments)).filter(Boolean);
}

export default function HotelBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState({ opened: false, bookingReference: "", provider: ""  });
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

  useEffect(() => {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/flight/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // "ngrok-skip-browser-warning": "true",
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

  const filteredBookings = bookings.filter((booking) => {
    // Search filter
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
      booking?.hotel?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      selectedStatus === "all" ||
      booking?.booking_status?.toLowerCase() === selectedStatus.toLowerCase();

    // Date range filter
    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const travelDate = moment(booking?.flight_details?.departure_date);
      const startDate = moment(dateRange[0]);
      const endDate = moment(dateRange[1]);
      matchesDateRange =
        travelDate.isSameOrAfter(startDate, "day") &&
        travelDate.isSameOrBefore(endDate, "day");
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setActivePage(1);
  }, [searchQuery, selectedStatus, dateRange]);

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
  const paginatedBookings = filteredBookings.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
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
    tentative: "bk-badge-tentative",
    pending: "bk-badge-pending",
    cancelled: "bk-badge-cancelled",
    paid: "bk-badge-confirmed",
  };

  return (
    <div className='bk-page-wrapper'>
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() => setCancelModal({ opened: false, bookingReference: "", provider: "" })}
        bookingReference={cancelModal.bookingReference}
        provider={cancelModal.provider}
        type="flight"
        endPoint='/api/flights/booking/cancel'
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
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.icon}>
            <FaPlane size={30} />
          </div>
          <div className={styles.headerText}>
            <h1>Flight Bookings</h1>
            <p>Manage all your flight reservations in one place</p>
          </div>
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
            placeholder="Search by name, email or invoice..."
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
              {["all", "confirmed", "tentative", "cancelled"].map((s) => (
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
                  ? `${moment(dateRange[0]).format("MMM DD")} ${moment(dateRange[1]).format("MMM DD")}`
                  : "Date Range"}
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <div>
                <h6 className="fw-normal my-2 text-center">Departure Date</h6>
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
                {["Invoice No.", "Booked By", "Flight / Date", "Issued Date", "Status","Amount", "Actions"].map((h) => (
                  <th key={h} className="bk-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="mp-skeleton-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className={`mp-skeleton-bar${j === 5 ? " mp-skeleton-bar-short" : ""}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="bk-empty-state">
                    No bookings found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking, index) => {
                  const st = booking?.booking_status?.toLowerCase();
                  const badgeClass = statusBadgeClass[st] || "bk-badge-default";
                  const paymentBadgeClass = statusBadgeClass[booking?.payment_status] || "bk-badge-default";
                  const routeLines = getFlightRouteLines(booking);
                  const isConfirmed = st === 'confirmed';
                  const isPaid = booking?.payment_status?.toLowerCase() === 'paid';
                  const departureInFuture = moment(booking?.flight_details?.departure_date).isAfter(moment(), 'day');
                  const canEditOrRefund = isConfirmed && isPaid && departureInFuture;

                  return (
                    <tr key={index} className="bk-tr">
                      <td className="bk-td-ref">{booking?.booking_reference}</td>
                      <td className="bk-td-guest">
                        <div className="bk-guest-name">
                          {booking?.passenger_details[0].firstName} {booking?.passenger_details[0].lastName}
                        </div>
                        <div className="bk-guest-email">{booking?.passenger_details[0].email}</div>
                      </td>
                      <td className="bk-td-detail">
                        {routeLines.map((line, lineIdx) => (
                          <div key={lineIdx} className={lineIdx > 0 ? 'mt-1' : ''}>
                            <div className="bk-detail-primary d-flex align-items-center gap-1">
                              {line.from}
                              <FaArrowRight size={9} />
                              {line.to}
                            </div>
                            {line.date && (
                              <div className="bk-detail-secondary">{line.date}</div>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="bk-td-text-nowrap">
                        {moment(booking?.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="bk-td-ref">
                        <span className={`bk-status-badge ${badgeClass}`}>
                          Status: {st ? st.charAt(0).toUpperCase() + st.slice(1) : "-"}
                        </span>
                        <br />
                        <span className={`bk-status-badge mt-1 ${paymentBadgeClass}`}>
                          Payment: {booking?.payment_status}
                        </span>
                      </td>
                      <td className="bk-td-status">
                        {booking?.pricing?.display_currency} {booking?.pricing?.amount}
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
                                <>
                                  <Menu.Item
                                    leftSection={<FaUserEdit size={13} />}
                                    onClick={() =>
                                      setEditPassengerModal({
                                        opened: true,
                                        bookingReference: booking?.booking_reference,
                                        provider: booking?.provider,
                                        passengers: booking?.passenger_details || [],
                                      })
                                    }
                                  >
                                    Edit Passenger
                                  </Menu.Item>
                                  {/* <Menu.Item
                                    leftSection={<FaUndo size={13} />}
                                    onClick={() =>
                                      setRefundModal({
                                        opened: true,
                                        bookingReference: booking?.booking_reference,
                                        provider: booking?.provider,
                                      })
                                    }
                                  >
                                    Refund
                                  </Menu.Item> */}
                                </>
                              )}
                              {booking?.booking_status?.toLowerCase() !== "cancelled" &&
                                departureInFuture && (
                                  <Menu.Item
                                    leftSection={<RiDeleteBin6Line color="red" size={13} />}
                                    color="red"
                                    onClick={() =>
                                      setCancelModal({ opened: true, bookingReference: booking?.booking_reference, provider: booking?.provider })
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
        {!loading && totalPages > 1 && (
          <div className="bk-pagination-wrapper d-flex flex-wrap justify-content-center align-items-center gap-2 py-3 px-2">
            <span className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Showing {(activePage - 1) * PAGE_SIZE + 1}–{Math.min(activePage * PAGE_SIZE, filteredBookings.length)} of {filteredBookings.length}
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
  )
}
