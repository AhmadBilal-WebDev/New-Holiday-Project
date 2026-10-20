"use client";
import styles from "./voucher.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import {
  FaBus,
  FaFileInvoice,
  FaHotel,
  FaPlaneArrival,
  FaPlaneDeparture,
  FaUser,
  FaUserFriends,
  FaHome,
  FaStar,
  FaConciergeBell,
  FaPassport,
  FaMapMarkerAlt,
  FaFileAlt,
  FaFileContract,
} from "react-icons/fa";
import { MdFlight, MdOutlineFileDownload } from "react-icons/md";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";

export default function Page() {
  const { id } = useParams();
  const ref = useRef();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setVoucherUrl(window.location.href);
    document.body.style.backgroundColor = "#efefef";
    fetchDetails();
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/packages/booking/${id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const res = await responses.json();
      setIsLoading(false);
      if (res.Success) {
        const uniqueRooms = [
          ...new Map(
            res?.Content?.booking.room_selections_original.map((room) => [
              room.type,
              room,
            ]),
          ).values(),
        ];
        res.Content.booking.room_selections_original = uniqueRooms;
        setVoucherDetail(res?.Content?.booking);
      } else {
        setErrorMessage(res?.Description);
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error fetching package details:", err);
    }
  };

  function capitalize(text) {
    if (!text) return "";
    return String(text).charAt(0).toUpperCase() + String(text).slice(1);
  }

  function capitalizeString(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const EXCURSION_CITY_ORDER = ["Makkah", "Madinah"];

  function groupExcursionsByCity(excursions) {
    if (!Array.isArray(excursions) || excursions.length === 0) return {};
    const groups = {};
    excursions.forEach((exc) => {
      const city = exc?.city || "Other";
      if (!groups[city]) groups[city] = [];
      groups[city].push(exc);
    });
    const ordered = {};
    EXCURSION_CITY_ORDER.forEach((city) => {
      if (groups[city]) ordered[city] = groups[city];
    });
    Object.keys(groups)
      .filter((city) => !EXCURSION_CITY_ORDER.includes(city))
      .sort()
      .forEach((city) => {
        ordered[city] = groups[city];
      });
    return ordered;
  }

  function getTransferExcursions(transfer) {
    return transfer?.items?.data?.excursions ?? [];
  }

  const getTotalGuests = () => {
    const op = voucherDetail?.other_passengers || {};
    const adults = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.adultsInRoom >= 0 ? room?.adultsInRoom : room.adults || 0) +
        (room.adults_without_bed || 0),
      0,
    );
    const children = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.childrenInRoom >= 0
          ? room?.childrenInRoom
          : room.children || 0) +
        (room.children_without_bed || 0),
      0,
    );
    const infants = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.infantsInRoom >= 0 ? room?.infantsInRoom : room.infants || 0) +
        (room.infants_without_bed || 0),
      0,
    );
    return [
      `${adults} Adult${adults !== 1 ? "s" : ""}`,
      children > 0 && `${children} Child${children !== 1 ? "ren" : ""}`,
      infants > 0 && `${infants} Infant${infants !== 1 ? "s" : ""}`,
    ]
      .filter(Boolean)
      .join(", ");
  };
  const CalculateWithoutBeds = (type) => {
    const RoomList =
      voucherDetail?.room_selections_original.filter(
        (room) => room.type === type,
      ) || [];

    const adults = RoomList.reduce(
      (sum, room) => sum + (room.adults_without_bed || 0),
      0,
    );
    const children = RoomList.reduce(
      (sum, room) => sum + (room.children_without_bed || 0),
      0,
    );
    const infants = RoomList.reduce(
      (sum, room) => sum + (room.infants_without_bed || 0),
      0,
    );

    // ✅ agar sab zero hain
    if (adults === 0 && children === 0 && infants === 0) {
      return "-";
    }

    return `${adults} Adult${adults !== 1 ? "s" : ""}, ${children} Child${children !== 1 ? "ren" : ""}, ${infants} Infant${infants !== 1 ? "s" : ""}`;
  };
  function convertToCustomerCurrency(price) {
    if (!price || !voucherDetail.customer_exchange_rate)
      return Number(price || 0).toFixed(2);
    if (voucherDetail.currency_code === voucherDetail.customer_currency) {
      return Number(price).toFixed(2);
    }
    const convertedPrice =
      Number(price) * Number(voucherDetail.customer_exchange_rate);
    return convertedPrice.toFixed(2);
  }
  return (
    <div className={styles.pageWrapper}>
      {isLoading ? (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          <div className="bg-white rounded shadow p-3">
            <HotelInvoiceLoader />
          </div>
        </div>
      ) : (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          {errorMessage ? (
            <div className="bg-white shadow text-center p-5 rounded">
              <IoWarningOutline className="text-warning" size={120} />
              <h5 className="mt-4">{errorMessage}</h5>
            </div>
          ) : (
            <div ref={ref} className={styles.voucherCard}>
              {/* ── Watermark ── */}
              <div className={styles.watermark}>
                <Image
                  src="/watermark.png"
                  width={450}
                  height={450}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                  alt="Watermark"
                  quality={100}
                />
              </div>
              {/* ── Company Header ── */}
              <Image
                src={voucherDetail?.client?.client_images?.header_image}
                height={150}
                width={1000}
                className="w-100 h-auto d-block"
                quality={100}
                alt="Company Header"
              />
              {/* ── Title + QR Band ── */}
              <div className={styles.titleBand}>
                <div className={styles.titleLeft}>
                  <h1 className={styles.mainTitle}>Package Booking Voucher</h1>
                  <p className={styles.mainSubtitle}>
                    Thank you for choosing Alhijaz Tours
                  </p>
                </div>
                <div className={styles.titleRight}>
                  <div className={styles.qrWrapper}>
                    <QRCode
                      value={voucherUrl || " "}
                      size={78}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                  </div>
                  <span className={styles.qrLabel}>
                    Scan the QR Code
                    <br />
                    to Verify Booking
                  </span>
                </div>
              </div>
              {/* ── Gold Divider ── */}
              <div className={styles.goldDivider} />
              {/* ── Voucher Details Band ── */}
              <div className={styles.voucherDetailsBand}>
                <div className={styles.voucherBandInner}>
                  <span className={styles.voucherSectionLabel}>
                    Voucher Details
                  </span>
                  <div className={styles.voucherDetailsRow}>
                    <div className={styles.voucherDetailsLeft}>
                      <p className={styles.voucherNoLabel}>
                        BOOKING REFERENCE:
                      </p>
                      <h2 className={styles.voucherNumber}>
                        {voucherDetail?.booking_reference}
                      </h2>
                      <p className={styles.bookingDetailSmallLabel}>
                        Booking Date:
                      </p>
                      <p className={styles.bookingDateValue}>
                        {moment(
                          voucherDetail?.created_at,
                          "DD-MM-YYYY HH:mm:ss",
                        ).format("DD-MM-YYYY")}
                      </p>
                      <span
                        className={`${styles.confirmedBadge} ${voucherDetail?.booking_status === "cancelled" ? styles.cancelledBadge : voucherDetail?.booking_status === "tentative" || voucherDetail?.booking_status === "pending" ? styles.tentativeBadge : ""}`}
                      >
                        Status:{" "}
                        {voucherDetail?.booking_status?.toUpperCase() ||
                          "CONFIRMED"}
                      </span>
                      <span
                        className={`${styles.confirmedBadge} mt-1 ${voucherDetail?.payment_status === "paid" ? styles.paidBadge : voucherDetail?.payment_status === "pending" ? styles.pendingBadge : ""}`}
                      >
                        Payment:{" "}
                        {voucherDetail?.payment_status?.toUpperCase() ||
                          "PENDING"}
                      </span>
                    </div>
                    <div className={styles.voucherDetailsDivider} />
                    <div className={styles.voucherDetailsRight}>
                      <p className={styles.bookingDetailsTitle}>
                        BOOKING DETAILS
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>
                          Lead Passenger:
                        </span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.lead_title}{" "}
                          {voucherDetail?.lead_first_name}{" "}
                          {voucherDetail?.lead_last_name}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>
                          Package:
                        </span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.packageDetails?.title}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>
                          Total Guests:
                        </span>
                        <span className={styles.bookingDetailValue}>
                          {getTotalGuests()}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>
                          Duration:
                        </span>
                        <span className={styles.bookingDetailValue}>
                          {moment(voucherDetail?.packageDetails?.end_date).diff(
                            moment(voucherDetail?.packageDetails?.start_date),
                            "days",
                          )}{" "}
                          Nights
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════
                                PACKAGE DETAILS
                            ══════════════════════════════════ */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}>
                      <FaStar size={12} />
                    </span>
                    PACKAGE DETAILS
                  </div>
                </div>
                <div className={styles.packageInfoGrid}>
                  <div className={styles.packageInfoMain}>
                    <h3 className={styles.packageTitle}>
                      {voucherDetail?.packageDetails?.title}
                    </h3>
                    {voucherDetail?.packageDetails?.star_rating && (
                      <div className={styles.starRow}>
                        {Array(
                          Math.floor(
                            Number(
                              voucherDetail?.packageDetails?.star_rating || 0,
                            ),
                          ),
                        )
                          .fill(0)
                          .map((_, i) => (
                            <FaStar key={i} size={13} color="#c49a2a" />
                          ))}
                        <span className={styles.starLabel}>
                          {voucherDetail?.packageDetails?.star_rating} Star
                          Package
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.packageInfoDates}>
                    <div className={styles.hotelDateRow}>
                      <span className={styles.hotelDateLabel}>Start Date:</span>
                      <span className={styles.hotelDateValue}>
                        {moment(
                          voucherDetail?.packageDetails?.start_date,
                        ).format("DD-MM-YYYY")}
                      </span>
                    </div>
                    <div className={styles.hotelDateRow}>
                      <span className={styles.hotelDateLabel}>End Date:</span>
                      <span className={styles.hotelDateValue}>
                        {moment(voucherDetail?.packageDetails?.end_date).format(
                          "DD-MM-YYYY",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════
                                LEAD PASSENGER
                            ══════════════════════════════════ */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}>
                      <FaUser size={12} />
                    </span>
                    LEAD PASSENGER
                  </div>
                </div>
                <div className="p-3">
                  <table className={styles.premiumTable}>
                    <thead>
                      <tr>
                        <th className={styles.srCell}>#</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
                        <th>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.srCell}>1</td>
                        <td style={{ fontWeight: 600 }}>
                          {voucherDetail?.lead_title}{" "}
                          {voucherDetail?.lead_first_name}{" "}
                          {voucherDetail?.lead_last_name}
                        </td>
                        <td>{voucherDetail?.lead_email || "—"}</td>
                        <td>
                          {voucherDetail?.lead_phone_code}
                          {voucherDetail?.lead_phone || "—"}
                        </td>
                        <td>{capitalize(voucherDetail?.lead_gender) || "—"}</td>
                        <td>{voucherDetail?.lead_country || "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                  {voucherDetail?.lead_address && (
                    <div className={styles.addressRow}>
                      <span className={styles.addressLabel}>Address:</span>
                      <span className={styles.addressValue}>
                        {voucherDetail?.lead_address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════
                                ADDITIONAL GUESTS
                            ══════════════════════════════════ */}
              {(voucherDetail?.other_passengers?.additional_adults?.length >
                0 ||
                voucherDetail?.other_passengers?.children_details?.length > 0 ||
                voucherDetail?.other_passengers?.infants_details?.length >
                0) && (
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <div className="d-flex align-items-center gap-2">
                        <span className={styles.sectionIconWrap}>
                          <FaUserFriends size={12} />
                        </span>
                        ADDITIONAL GUESTS
                      </div>
                    </div>
                    <div className="p-3">
                      <table className={styles.premiumTable}>
                        <thead>
                          <tr>
                            <th className={styles.srCell}>#</th>
                            <th>Full Name</th>
                            <th>Gender</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {voucherDetail?.other_passengers?.additional_adults?.map(
                            (adult, i) => (
                              <tr key={`adult-${i}`}>
                                <td className={styles.srCell}>{i + 2}</td>
                                <td style={{ fontWeight: 600 }}>
                                  {adult.first_name} {adult.last_name}
                                </td>
                                <td>{capitalize(adult.gender)}</td>
                                <td>
                                  <span className={styles.typeBadge}>Adult</span>
                                </td>
                              </tr>
                            ),
                          )}
                          {voucherDetail?.other_passengers?.children_details?.map(
                            (child, i) => (
                              <tr key={`child-${i}`}>
                                <td className={styles.srCell}>
                                  {(voucherDetail?.other_passengers
                                    ?.additional_adults?.length || 0) +
                                    i +
                                    2}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {child.first_name} {child.last_name}
                                </td>
                                <td>{capitalize(child.gender)}</td>
                                <td>
                                  <span
                                    className={`${styles.typeBadge} ${styles.typeBadgeChild}`}
                                  >
                                    Child
                                  </span>
                                </td>
                              </tr>
                            ),
                          )}
                          {voucherDetail?.other_passengers?.infants_details?.map(
                            (infant, i) => {
                              const offset =
                                (voucherDetail?.other_passengers
                                  ?.additional_adults?.length || 0) +
                                (voucherDetail?.other_passengers?.children_details
                                  ?.length || 0);
                              return (
                                <tr key={`infant-${i}`}>
                                  <td className={styles.srCell}>
                                    {offset + i + 2}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {infant.first_name} {infant.last_name}
                                  </td>
                                  <td>{capitalize(infant.gender)}</td>
                                  <td>
                                    <span
                                      className={`${styles.typeBadge} ${styles.typeBadgeInfant}`}
                                    >
                                      Infant
                                    </span>
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* ══════════════════════════════════
                                ACCOMMODATION DETAILS
                            ══════════════════════════════════ */}
              {voucherDetail?.room_selections?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <FaHotel size={12} />
                      </span>
                      ACCOMMODATION DETAILS
                    </div>
                  </div>
                  <div className={styles.segmentsWrapper}>
                    {voucherDetail.room_selections.map((item, index) => (
                      <div key={index} className={styles.flightSegmentCard}>
                        {/* Hotel header row */}
                        <div className={styles.airlineRow}>
                          <FaHotel size={22} color="#E7247A" />
                          <div>
                            <p className={styles.airlineNameText}>
                              {capitalizeString(item?.hotel?.name)}
                              <span className={styles.cityChip}>
                                {item?.hotel?.city}
                              </span>
                            </p>
                            <p className={styles.flightNumberText}>
                              {item?.hotel?.address}
                            </p>
                          </div>
                        </div>
                        {/* Check-in / Check-out route */}
                        <div className={styles.routeGrid}>
                          <div className={styles.routeStation}>
                            <h4 className={styles.routeCity}>CHECK-IN</h4>
                            <p className={styles.routeTime}>
                              {moment(item?.hotel?.booked_from).format(
                                "DD MMM YYYY",
                              )}
                            </p>
                          </div>
                          <div className={styles.routeArrow}>
                            <span className={styles.durationLabel}>
                              {moment(item?.hotel?.booked_to).diff(
                                moment(item?.hotel?.booked_from),
                                "days",
                              )}{" "}
                              Nights
                            </span>
                            <div className={styles.arrowLine}>
                              <FaHotel className={styles.planeIcon} />
                            </div>
                          </div>
                          <div
                            className={`${styles.routeStation} ${styles.routeStationRight}`}
                          >
                            <h4 className={styles.routeCity}>CHECK-OUT</h4>
                            <p className={styles.routeTime}>
                              {moment(item?.hotel?.booked_to).format(
                                "DD MMM YYYY",
                              )}
                            </p>
                          </div>
                        </div>
                        {/* Room table */}
                        <div className={styles.innerTableWrap}>
                          <table className={styles.premiumTable}>
                            <thead>
                              <tr>
                                <th className={styles.srCell}>#</th>
                                <th>Room Type</th>
                                <th>Meal / View</th>
                                <th>Adults</th>
                                <th>Children</th>
                                <th>Infant</th>
                                <th>Without Beds</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.rooms.map((room, rindex) => (
                                <tr key={rindex}>
                                  <td className={styles.srCell}>
                                    {rindex + 1}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {room.selection.label === "without_beds"
                                      ? "Without Beds"
                                      : `${room.selection.label} × ${room.selection.rooms}`}
                                  </td>
                                  <td>
                                    {[
                                      room?.rooms?.items?.data?.meal,
                                      room?.rooms?.items?.data?.view,
                                    ]
                                      .filter(Boolean)
                                      .join(" + ") || "—"}
                                  </td>
                                  <td className="text-center">
                                    {room.selection.adults}
                                  </td>
                                  <td className="text-center">
                                    {room.selection.children}
                                  </td>
                                  <td className="text-center">
                                    {room.selection.infants}
                                  </td>
                                  <td className="text-center">
                                    {CalculateWithoutBeds(room.selection.type)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════
                                DEPARTURE FLIGHTS
                            ══════════════════════════════════ */}
              {voucherDetail?.flights?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <FaPlaneDeparture size={12} />
                      </span>
                      FLIGHT DETAILS
                    </div>
                  </div>
                  <div className={styles.segmentsWrapper}>
                    {voucherDetail.flights.map((item, index) =>
                      item.stops
                        ?.filter((s) => s.is_return === false)
                        .map((flight, fIndex) => (
                          <div
                            key={`dep-${index}-${fIndex}`}
                            className={styles.flightSegmentCard}
                          >
                            <div className={styles.airlineRow}>
                              <MdFlight size={26} color="#E7247A" />
                              <div>
                                <p className={styles.airlineNameText}>
                                  {flight.airline_name}
                                </p>
                                <p className={styles.flightNumberText}>
                                  {flight.flight_number}&nbsp;·&nbsp;
                                  {capitalize(flight.type)}
                                </p>
                              </div>
                            </div>
                            <div className={styles.routeGrid}>
                              <div className={styles.routeStation}>
                                <h4 className={styles.routeCity}>
                                  {flight?.departure_from}
                                </h4>
                                <p className={styles.routeAirport}>Departure</p>
                                <p className={styles.routeTime}>
                                  {moment
                                    .utc(flight.datetime_from)
                                    .format("DD MMM YYYY, LT")}
                                </p>
                              </div>
                              <div className={styles.routeArrow}>
                                <span className={styles.durationLabel}>
                                  {flight.duration}
                                </span>
                                <div className={styles.arrowLine}>
                                  <MdFlight className={styles.planeIcon} />
                                </div>
                              </div>
                              <div
                                className={`${styles.routeStation} ${styles.routeStationRight}`}
                              >
                                <h4 className={styles.routeCity}>
                                  {flight?.departure_to}
                                </h4>
                                <p className={styles.routeAirport}>Arrival</p>
                                <p className={styles.routeTime}>
                                  {moment
                                    .utc(flight.datetime_to)
                                    .format("DD MMM YYYY, LT")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )),
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════
                                RETURN FLIGHTS
                            ══════════════════════════════════ */}
              {voucherDetail?.flights?.some((f) =>
                f.stops?.some((s) => s.is_return === true),
              ) && (
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <div className="d-flex align-items-center gap-2">
                        <span className={styles.sectionIconWrap}>
                          <FaPlaneArrival size={12} />
                        </span>
                        RETURN FLIGHT DETAILS
                      </div>
                    </div>
                    <div className={styles.segmentsWrapper}>
                      {voucherDetail.flights.map((item, index) =>
                        item.stops
                          ?.filter((s) => s.is_return === true)
                          .map((flight, fIndex) => (
                            <div
                              key={`ret-${index}-${fIndex}`}
                              className={styles.flightSegmentCard}
                            >
                              <div className={styles.airlineRow}>
                                <MdFlight size={26} color="#E7247A" />
                                <div>
                                  <p className={styles.airlineNameText}>
                                    {flight.airline_name}
                                  </p>
                                  <p className={styles.flightNumberText}>
                                    {flight.flight_number}&nbsp;·&nbsp;
                                    {capitalize(flight.type)}
                                  </p>
                                </div>
                              </div>
                              <div className={styles.routeGrid}>
                                <div className={styles.routeStation}>
                                  <h4 className={styles.routeCity}>
                                    {flight?.departure_from}
                                  </h4>
                                  <p className={styles.routeAirport}>Departure</p>
                                  <p className={styles.routeTime}>
                                    {moment
                                      .utc(flight.datetime_from)
                                      .format("DD MMM YYYY, LT")}
                                  </p>
                                </div>
                                <div className={styles.routeArrow}>
                                  <span className={styles.durationLabel}>
                                    {flight.duration}
                                  </span>
                                  <div className={styles.arrowLine}>
                                    <MdFlight className={styles.planeIcon} />
                                  </div>
                                </div>
                                <div
                                  className={`${styles.routeStation} ${styles.routeStationRight}`}
                                >
                                  <h4 className={styles.routeCity}>
                                    {flight?.departure_to}
                                  </h4>
                                  <p className={styles.routeAirport}>Arrival</p>
                                  <p className={styles.routeTime}>
                                    {moment
                                      .utc(flight.datetime_to)
                                      .format("DD MMM YYYY, LT")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )),
                      )}
                    </div>
                  </div>
                )}

              {/* ══════════════════════════════════
                                TRANSFER DETAILS
                            ══════════════════════════════════ */}
              {voucherDetail?.transfers?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <FaBus size={12} />
                      </span>
                      TRANSFER DETAILS
                    </div>
                  </div>
                  <div className={styles.segmentsWrapper}>
                    {voucherDetail.transfers.map((item, index) => (
                      <div key={index} className={styles.flightSegmentCard}>
                        <div className={styles.airlineRow}>
                          <FaBus size={22} color="#E7247A" />
                          <div>
                            <p className={styles.airlineNameText}>
                              {capitalize(item?.vehicle)}
                            </p>
                            <p className={styles.flightNumberText}>
                              {capitalize(item?.trip_type)}
                            </p>
                          </div>
                        </div>
                        {item.locations.map((loc, idx) => (
                          <div key={idx} className={styles.routeGrid}>
                            <div className={styles.routeStation}>
                              <h4 className={styles.routeCity}>PICKUP</h4>
                              <p className={styles.routeAirport}>
                                {loc.pickup_address}
                              </p>
                              <p className={styles.routeTime}>
                                {moment(loc.outbound).format(
                                  "DD MMM YYYY, HH:mm",
                                )}
                              </p>
                            </div>
                            <div className={styles.routeArrow}>
                              <span className={styles.durationLabel}>
                                {capitalize(item?.trip_type)}
                              </span>
                              <div className={styles.arrowLine}>
                                <FaBus className={styles.planeIcon} />
                              </div>
                            </div>
                            <div
                              className={`${styles.routeStation} ${styles.routeStationRight}`}
                            >
                              <h4 className={styles.routeCity}>DROPOFF</h4>
                              <p className={styles.routeAirport}>
                                {loc.dropoff_address}
                              </p>
                            </div>
                          </div>
                        ))}
                        {(() => {
                          const excursions = getTransferExcursions(item);
                          const byCity = groupExcursionsByCity(excursions);
                          const cities = Object.keys(byCity);
                          if (!cities.length) return null;
                          return (
                            <div className={styles.excursionsSection}>
                              <div className={styles.excursionsHeader}>
                                <FaMapMarkerAlt
                                  size={14}
                                  className={styles.excursionsHeaderIcon}
                                />
                                <span>Included Ziyarat &amp; Excursions</span>
                              </div>
                              <div className={styles.excursionsCityGrid}>
                                {cities.map((city) => (
                                  <div
                                    key={city}
                                    className={styles.excursionCityGroup}
                                  >
                                    <div className={styles.excursionCityHeader}>
                                      <span className={styles.excursionCityName}>
                                        {city}
                                      </span>
                                      {/* <span className={styles.excursionCityCount}>
                                        {byCity[city].length}{" "}
                                        {byCity[city].length === 1
                                          ? "site"
                                          : "sites"}
                                      </span> */}
                                    </div>
                                    <ul className={styles.excursionList}>
                                      {byCity[city].map((exc, i) => (
                                        <li
                                          key={exc.id ?? `${city}-${i}`}
                                          className={styles.excursionItem}
                                        >
                                          <span className={styles.excursionIndex}>
                                            {i + 1}
                                          </span>
                                          <span className={styles.excursionName}>
                                            {exc.name}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════
                                ADDITIONAL SERVICES
                            ══════════════════════════════════ */}
              {voucherDetail?.additional_services?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <FaConciergeBell size={12} />
                      </span>
                      ADDITIONAL SERVICES
                    </div>
                  </div>
                  <div className="p-3">
                    <table className={styles.premiumTable}>
                      <thead>
                        <tr>
                          <th className={styles.srCell}>#</th>
                          <th>Service Name</th>
                          <th className="text-center">Quantity / Pax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.additional_services.map(
                          (item, index) => (
                            <tr key={index}>
                              <td className={styles.srCell}>{index + 1}</td>
                              <td style={{ fontWeight: 600 }}>{item.name}</td>
                              <td className="text-center">{item.quantity}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════
                                VISA DETAILS
                            ══════════════════════════════════ */}
              {voucherDetail?.visas?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <FaPassport size={12} />
                      </span>
                      VISA DETAILS
                    </div>
                  </div>
                  <div className="p-3">
                    <table className={styles.premiumTable}>
                      <thead>
                        <tr>
                          <th className={styles.srCell}>#</th>
                          <th>Visa Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.visas.map((item, index) => (
                          <tr key={index}>
                            <td className={styles.srCell}>{index + 1}</td>
                            <td style={{ fontWeight: 600 }}>
                              {item?.visa_type || "—"} <br />{" "}
                              {item?.visa_description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CANCELLATION POLICY SECTION */}
              {voucherDetail?.packageDetails?.cancellation_policy && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <IoWarningOutline size={13} />
                      </span>
                      CANCELLATION POLICY
                    </div>
                  </div>
                  <div className="p-3">
                    {voucherDetail.packageDetails.cancellation_policy
                      .cancel_policy === "refundable" &&
                      !!voucherDetail.packageDetails.cancellation_policy
                        .cancellation_policies?.length ? (
                      <ul
                        className={styles.importantList}
                        style={{ fontSize: "1rem" }}
                      >
                        {voucherDetail.packageDetails.cancellation_policy.cancellation_policies.map(
                          (policy, i) => (
                            <li key={i}>
                              If cancelled{" "}
                              <strong>{policy.time_duration} hours</strong>{" "}
                              before departure, a{" "}
                              {policy.type === "percentage" ? (
                                <>
                                  <strong>{policy.value}%</strong> cancellation
                                  charge
                                </>
                              ) : (
                                <>
                                  fixed cancellation charge of{" "}
                                  <strong>
                                    {voucherDetail.customer_currency}{" "}
                                    {convertToCustomerCurrency(policy.value)}
                                  </strong>
                                </>
                              )}{" "}
                              will apply.
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <div className="text-danger small mt-2">
                        This booking is non-refundable. No refund will be issued
                        for cancellations.
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* SPECIAL REQUEST SECTION */}
              {voucherDetail?.special_request && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}>
                        <IoWarningOutline size={13} />
                      </span>
                      SPECIAL REQUEST
                    </div>
                  </div>
                  <div className="p-3">
                    <div
                      className={styles.importantList}
                      style={{ fontSize: "1rem" }}
                    >
                      {voucherDetail.special_request}
                    </div>
                  </div>
                </div>
              )}
              {/* ── Important Information ── */}
              <div className={styles.importantSection}>
                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                <div className={styles.importantDivider} />
                <ul className={styles.importantList}>
                  <li>
                    Please present this voucher at check-in for all included
                    services.
                  </li>
                  <li>
                    All passengers must carry valid photo identification at all
                    times.
                  </li>
                  <li>
                    Check-in times and service schedules are subject to operator
                    confirmation.
                  </li>
                  <li>
                    This package voucher covers only the services listed above.
                  </li>
                  <li>
                    This is a computer-generated receipt and does not require a
                    physical signature.
                  </li>
                </ul>
              </div>

              {/* ── Company Footer ── */}
              <Image
                src={voucherDetail?.client?.client_images?.footer_image}
                height={150}
                width={1000}
                className="w-100 h-auto d-block"
                quality={100}
                alt="Company Footer"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
      {!isLoading && !errorMessage && (
        <div className={`container mb-3 px-0 ${styles.confirmationWrapper}`}>
          <div className={styles.actionRow}>
            <button
              className={styles.btnPrimary}
              onClick={() => window.print()}
            >
              <MdOutlineFileDownload size={17} />
              Print / Download Voucher
            </button>
            <Link
              href={`/${voucherDetail?.packageDetails?.category?.slug}/invoice/${voucherDetail?.booking_reference}`}
              style={{ textDecoration: "none" }}
            >
              <button className={styles.btnGold}>
                <FaFileInvoice size={14} />
                View Invoice
              </button>
            </Link>
            {voucherDetail?.atol_url && (
              <a
                href={voucherDetail.atol_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button type="button" className={styles.btnGold}>
                  <FaFileAlt size={14} />
                  View Atol
                </button>
              </a>
            )}
            {voucherDetail?.indemnity_url && (
              <a
                href={voucherDetail.indemnity_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <button type="button" className={styles.btnGold}>
                  <FaFileContract size={14} />
                  View Indemnity
                </button>
              </a>
            )}
            <Link href="/" style={{ textDecoration: "none" }}>
              <button
                className={styles.btnPrimary}
                style={{ background: "linear-gradient(135deg, #444, #666)" }}
              >
                <FaHome size={14} />
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
