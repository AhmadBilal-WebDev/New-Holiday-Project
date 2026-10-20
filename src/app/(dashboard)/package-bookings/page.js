"use client";
import React, { useState, useEffect } from "react";
import styles from "../Bookings.module.css";
import { FaEye, FaHotel, FaArrowRight, FaRegFileAlt } from "react-icons/fa";
import { Menu, Pagination } from "@mantine/core";
import { CgCalendar } from "react-icons/cg";
import { Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { LiaAngleDownSolid } from "react-icons/lia";
import { IoMdCheckmark } from "react-icons/io";
import moment from "moment";
import Link from "next/link";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
import { useRouter } from "next/navigation"; 
import { RiDeleteBin6Line } from "react-icons/ri";
export default function PackageBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState({ opened: false, bookingReference: "", provider: "" , bookingId: ""});
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [activePage, setActivePage] = useState(1);
  const ITEMS_PER_PAGE = 10;
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/package/bookings`,
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

  // Filter bookings based on search, status, and date range
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      booking?.booking_reference
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking?.lead_last_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking?.lead_email
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
      const checkInDate = moment(booking?.package_details?.startDate);
      const startDate = moment(dateRange[0]);
      const endDate = moment(dateRange[1]);
      matchesDateRange =
        checkInDate.isSameOrAfter(startDate, "day") &&
        checkInDate.isSameOrBefore(endDate, "day");
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setActivePage(1);
  }, [searchQuery, selectedStatus, dateRange]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
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
console.log(bookings)
  return (
    <>
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() => setCancelModal({ opened: false, bookingReference: "", provider: "", bookingId: "" })}
        bookingReference={cancelModal.bookingReference}
        provider={cancelModal.provider}
        bookingId={cancelModal.bookingId}
        type="package"
        endPoint='/api/packages/cancel-booking'
        onSuccess={() => fetchBookings()}
      />
      <div className="bk-page-wrapper">
        {/* Page Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bk-header-icon d-flex align-items-center justify-content-center rounded-2 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width='22' height='22' fill="none" viewBox="0 0 33 33" aria-hidden="true" style={{ display: 'block', width: 22, height: 22, flexShrink: 0 }}><path fill='#ffffff' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#ffffff' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#ffffff' stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#ffffff' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#ffffff' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#ffffff' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#ffffff' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></svg>
          </div>
          <div>
            <h5 className="bk-header-title fw-bold">Package Bookings</h5>
            <p className="bk-header-subtitle text-muted">
              Manage all your package bookings in one place
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
                  <h6 className="fw-normal my-2 text-center">Package Start Date</h6>
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
                  {["Invoice No.", "Guest", "Package Detail", "Issued Date", "Status","Amount", "Actions"].map((h) => (
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
                     const paymentbadgeClass = statusBadgeClass[booking?.payment_status?.toLowerCase()] || "bk-badge-default";
                    return (
                      <tr key={index} className="bk-tr">
                        <td className="bk-td-ref">{booking?.booking_reference}</td>
                        <td className="bk-td-guest">
                          <div className="bk-guest-name">
                            {booking?.lead_title} {booking?.lead_first_name} {booking?.lead_last_name}
                          </div>
                          <div className="bk-guest-email">{booking?.lead_email}</div>
                        </td>
                        <td className="bk-td-detail">
                          <div className="bk-detail-primary">{booking?.package_details?.title}</div>
                          <div className="bk-detail-secondary">
                            {moment(booking?.package_details?.startDate).format("MMM DD, YYYY")}{" "}
                            <FaArrowRight size={9} />{" "}
                            {moment(booking?.package_details?.endDate).format("MMM DD, YYYY")}
                          </div>
                        </td>
                        <td className="bk-td-text-nowrap">
                          {moment(booking?.created_at).format("DD MMM YYYY")}
                        </td>
                        <td className="bk-td-ref">
                          <span className={`bk-status-badge ${badgeClass}`}>
                            Status: {st ? st.charAt(0).toUpperCase() + st.slice(1) : "-"}
                          </span>
                          <br/>
                          <span className={`bk-status-badge mt-1 ${paymentbadgeClass}`}>
                            Payment: {booking?.payment_status ? booking?.payment_status.charAt(0).toUpperCase() + booking?.payment_status.slice(1) : "-"}
                          </span>
                        </td>
                          <td className="bk-td-status">
                          {booking?.customer_currency} {booking?.amount}
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
                                    href={`/${booking?.package_details?.slug}/invoice/${booking?.booking_reference}`}
                                    target="_blank"
                                    className="text-dark"
                                  >
                                    View Invoice
                                  </Link>
                                </Menu.Item>
                                <Menu.Item leftSection={<FaRegFileAlt size={13} />}>
                                  <Link
                                    href={`/${booking?.package_details?.slug}/voucher/${booking?.booking_reference}`}
                                    target="_blank"
                                    className="text-dark"
                                  >
                                    View Voucher
                                  </Link>
                                </Menu.Item>
                                {booking?.booking_status?.toLowerCase() !== "cancelled" &&
                                  moment(booking?.package_details?.startDate).isAfter(moment(), "day") && (
                                    <Menu.Item
                                      leftSection={<RiDeleteBin6Line color="red" size={13} />}
                                      color="red"
                                      onClick={() =>
                                        setCancelModal({ opened: true, bookingReference: booking?.booking_reference, provider: '', bookingId: booking?.id })
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
                Showing {(activePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(activePage * ITEMS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}
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
    </>
  );
}
