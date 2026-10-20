"use client";
import React, { useState, useEffect } from "react";
import styles from "../Bookings.module.css";
import { FaRegFileAlt, FaKaaba } from "react-icons/fa";
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
import { useRouter } from "next/navigation";
import CancelBookingModal from "@/dashboard_components/CancelBookingModal/CancelBookingModal";
import { RiDeleteBin6Line } from "react-icons/ri";

export default function UmrahGetawayBookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState({
    opened: false,
    bookingReference: "",
    packageId: "",
  });
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/umrah-getaway/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      setMeta(data?.meta || {});
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const SERVICE_LABELS = {
    flight: "Flight",
    makkah_hotel: "Makkah Hotel",
    madinah_hotel: "Madinah Hotel",
    transfer: "Transfer",
    visa: "Visa",
  };

  const formatServiceLabel = (key) =>
    SERVICE_LABELS[key] ||
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getLeadName = (booking) => {
    if (booking?.lead_name) {
      return [booking?.lead_title, booking.lead_name].filter(Boolean).join(" ");
    }
    if (booking?.lead_first_name || booking?.lead_last_name) {
      return [booking?.lead_title, booking?.lead_first_name, booking?.lead_last_name]
        .filter(Boolean)
        .join(" ");
    }
    const lead = booking?.lead_details;
    if (lead) {
      return [lead?.title, lead?.firstName, lead?.lastName].filter(Boolean).join(" ");
    }
    return "-";
  };

  const getLeadEmail = (booking) =>
    booking?.lead_email || booking?.lead_details?.email || "-";

  const getServices = (booking) => {
    const status = booking?.service_booking_status;
    if (!status || typeof status !== "object") return [];
    return Object.keys(status).map((key) => ({
      key,
      label: formatServiceLabel(key),
    }));
  };

  const filteredBookings = bookings.filter((booking) => {
    const leadName = getLeadName(booking).toLowerCase();
    const leadEmail = getLeadEmail(booking).toLowerCase();
    const q = searchQuery.toLowerCase();
    const servicesText = getServices(booking)
      .map((s) => s.label)
      .join(" ")
      .toLowerCase();
    const hotelsText = [
      booking?.makkah_hotel_name,
      booking?.madinah_hotel_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchQuery === "" ||
      booking?.booking_reference?.toLowerCase().includes(q) ||
      leadName.includes(q) ||
      leadEmail.includes(q) ||
      servicesText.includes(q) ||
      hotelsText.includes(q);

    const matchesStatus =
      selectedStatus === "all" ||
      booking?.booking_status?.toLowerCase() === selectedStatus.toLowerCase();

    let matchesDateRange = true;
    if (dateRange[0] && dateRange[1]) {
      const bookingStartDate = moment(booking?.start_date);
      const startDate = moment(dateRange[0]);
      const endDate = moment(dateRange[1]);
      matchesDateRange =
        bookingStartDate.isValid() &&
        bookingStartDate.isSameOrAfter(startDate, "day") &&
        bookingStartDate.isSameOrBefore(endDate, "day");
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  useEffect(() => {
    setActivePage(1);
  }, [searchQuery, selectedStatus, dateRange]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );

  const statCards = [
    {
      label: "Total Bookings",
      value: meta?.total_count,
      icon: <FaCalendarAlt size={18} />,
    },
    {
      label: "Confirmed",
      value: meta?.confirmed_count,
      icon: <FaCheckCircle size={18} />,
    },
    {
      label: "Incomplete",
      value: meta?.incomplete_count,
      icon: <FaClock size={18} />,
    },
    {
      label: "Cancelled",
      value: meta?.cancelled_count,
      icon: <FaTimesCircle size={18} />,
    },
  ];

  const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "confirmed", label: "Confirmed" },
    { value: "pending", label: "Pending" },
    { value: "needs_revision", label: "Needs Revision" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const statusBadgeClass = {
    confirmed: "bk-badge-confirmed",
    paid: "bk-badge-confirmed",
    tentative: "bk-badge-tentative",
    pending: "bk-badge-pending",
    needs_revision: "bk-badge-pending",
    cancelled: "bk-badge-cancelled",
  };

  return (
    <>
      <CancelBookingModal
        opened={cancelModal.opened}
        onClose={() =>
          setCancelModal({
            opened: false,
            bookingReference: "",
            packageId: "",
          })
        }
        bookingReference={cancelModal.bookingReference}
        packageId={cancelModal.packageId}
        email={session?.user?.email}
        otp={session?.user?.otp}
        type="umrah-getaway"
        endPoint="/api/b2c/dashboard/umrah-getaway/cancel-booking"
        onSuccess={() => fetchBookings()}
      />
    <div className="bk-page-wrapper">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="bk-header-icon d-flex align-items-center justify-content-center rounded-2 flex-shrink-0">
          <FaKaaba size={20} />
        </div>
        <div>
          <h5 className="bk-header-title fw-bold">Umrah Getaway Bookings</h5>
          <p className="bk-header-subtitle text-muted">
            Manage all your Umrah Getaway reservations in one place
          </p>
        </div>
      </div>

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

      <div className="bk-table-card bg-white rounded-3">
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
                {STATUS_FILTER_OPTIONS.find((o) => o.value === selectedStatus)
                  ?.label || "All Status"}{" "}
                <LiaAngleDownSolid />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                <Menu.Item
                  key={value}
                  leftSection={
                    selectedStatus === value ? (
                      <IoMdCheckmark size={14} />
                    ) : (
                      <span style={{ width: 14, display: "inline-block" }} />
                    )
                  }
                  onClick={() => setSelectedStatus(value)}
                >
                  {label}
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
                <h6 className="fw-normal my-2 text-center">Start Date</h6>
              </div>
              <DatePicker
                type="range"
                numberOfColumns={calendarColumns}
                value={dateRange}
                onChange={setDateRange}
              />
              {dateRange[0] && dateRange[1] && (
                <div className="bk-date-clear-wrapper">
                  <button
                    className="bk-date-clear-btn"
                    onClick={() => setDateRange([null, null])}
                  >
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

        <div className="table-responsive">
          <table className="bk-table">
            <thead>
              <tr className="bk-thead-tr">
                {[
                  "Invoice No.",
                  "Guest",
                  "Hotels / Dates",
                  "Issued Date",
                  "Status",
                  "Amount",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="bk-th">
                    {h}
                  </th>
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
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="bk-empty-state">
                    No bookings found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking, index) => {
                  const st = booking?.booking_status?.toLowerCase();
                  const badgeClass =
                    statusBadgeClass[st] || "bk-badge-default";
                  const paymentBadgeClass =
                    statusBadgeClass[
                      booking?.payment_status?.toLowerCase()
                    ] || "bk-badge-default";
                  const services = getServices(booking);
                  const amount =
                    booking?.amount ??
                    booking?.customer_amount ??
                    booking?.booking_amount;
                  const currency =
                    booking?.customer_currency ||
                    booking?.display_currency ||
                    "";

                  return (
                    <tr key={index} className="bk-tr">
                      <td className="bk-td-ref">
                        {booking?.booking_reference}
                      </td>
                      <td className="bk-td-guest">
                        <div className="bk-guest-name">
                          {getLeadName(booking)}
                        </div>
                        <div className="bk-guest-email">
                          {getLeadEmail(booking)}
                        </div>
                      </td>
                      <td className="bk-td-detail">
                        {(booking?.makkah_hotel_name ||
                          booking?.madinah_hotel_name) && (
                          <div className="bk-detail-primary mb-1">
                            {booking?.makkah_hotel_name && (
                              <div className="bk-hotel-line">
                                <span className="bk-hotel-city">Makkah:</span>{" "}
                                {booking.makkah_hotel_name}
                              </div>
                            )}
                            {booking?.madinah_hotel_name && (
                              <div className="bk-hotel-line">
                                <span className="bk-hotel-city">Madinah:</span>{" "}
                                {booking.madinah_hotel_name}
                              </div>
                            )}
                          </div>
                        )}
                        {(booking?.start_date || booking?.end_date) && (
                          <div className="bk-detail-secondary text-muted" style={{ fontSize: "0.85rem" }}>
                            {booking?.start_date &&
                              moment(booking.start_date).format("DD MMM YYYY")}
                            {booking?.start_date && booking?.end_date && " – "}
                            {booking?.end_date &&
                              moment(booking.end_date).format("DD MMM YYYY")}
                          </div>
                        )}
                      </td>
                      <td className="bk-td-text-nowrap">
                        {booking?.created_at
                          ? moment(booking.created_at).format("DD MMM YYYY")
                          : "-"}
                      </td>
                      <td className="bk-td-ref">
                        <span className={`bk-status-badge ${badgeClass}`}>
                          Status:{" "}
                          {st
                            ? st.charAt(0).toUpperCase() + st.slice(1)
                            : "-"}
                        </span>
                        <br />
                        <span
                          className={`bk-status-badge mt-1 ${paymentBadgeClass}`}
                        >
                          Payment:{" "}
                          {booking?.payment_status
                            ? booking.payment_status.charAt(0).toUpperCase() +
                              booking.payment_status.slice(1)
                            : "-"}
                        </span>
                      </td>
                      <td className="bk-td-status">
                        {currency} {amount ?? "-"}
                      </td>
                      <td className="bk-td-actions">
                        <button className={styles.actionsBtn}>
                          <Menu shadow="md" position="bottom-end" width={190}>
                            <Menu.Target>
                              <span className="bk-menu-dots">...</span>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<FaRegFileAlt size={13} />}
                              >
                                <Link
                                  href={`/umrah-getaway/invoice/${booking?.booking_reference}`}
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
                                  href={`/umrah-getaway/voucher/${booking?.booking_reference}`}
                                  target="_blank"
                                  className="text-dark"
                                >
                                  View Voucher
                                </Link>
                              </Menu.Item>
                              {booking?.booking_status?.toLowerCase() !==
                                "cancelled" &&
                                booking?.start_date &&
                                moment(booking.start_date).isAfter(
                                  moment(),
                                  "day",
                                ) && (
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
                                        packageId:
                                          booking?.package_id ||
                                          booking?.id ||
                                          "",
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
        {!loading && totalPages > 1 && (
          <div className="bk-pagination-wrapper d-flex flex-wrap justify-content-center align-items-center gap-2 py-3 px-2">
            <span
              className="text-muted"
              style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              Showing {(activePage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(
                activePage * ITEMS_PER_PAGE,
                filteredBookings.length,
              )}{" "}
              of {filteredBookings.length}
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
