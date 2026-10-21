"use client";
import styles from "./voucher.module.css";
import moment from "moment";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import {
  FaBus,
  FaHotel,
  FaPlaneArrival,
  FaPlaneDeparture,
  FaStar,
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaFileAlt,
  FaFileContract,
  FaRegStar,
} from "react-icons/fa";
import { MdFlight } from "react-icons/md";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Merriweather } from "next/font/google";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function Page() {
  const { id } = useParams();
  const ref = useRef();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setVoucherUrl(window.location.href);
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/packages/booking/${id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await responses.json();
      setIsLoading(false);
      if (res.Success) {
        const uniqueRooms = [
          ...new Map(
            (res?.Content?.booking?.room_selections_original || []).map(
              (room) => [room.type, room]
            )
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
    const adults = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.adultsInRoom >= 0 ? room?.adultsInRoom : room.adults || 0) +
        (room.adults_without_bed || 0),
      0
    );
    const children = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.childrenInRoom >= 0
          ? room?.childrenInRoom
          : room.children || 0) +
        (room.children_without_bed || 0),
      0
    );
    const infants = voucherDetail?.room_selections_original?.reduce(
      (sum, room) =>
        sum +
        (room?.infantsInRoom >= 0 ? room?.infantsInRoom : room.infants || 0) +
        (room.infants_without_bed || 0),
      0
    );
    return [
      `${adults || 0} Adult${adults !== 1 ? "s" : ""}`,
      children > 0 && `${children} Child${children !== 1 ? "ren" : ""}`,
      infants > 0 && `${infants} Infant${infants !== 1 ? "s" : ""}`,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const CalculateWithoutBeds = (type) => {
    const RoomList =
      voucherDetail?.room_selections_original?.filter(
        (room) => room.type === type
      ) || [];

    const adults = RoomList.reduce(
      (sum, room) => sum + (room.adults_without_bed || 0),
      0
    );
    const children = RoomList.reduce(
      (sum, room) => sum + (room.children_without_bed || 0),
      0
    );
    const infants = RoomList.reduce(
      (sum, room) => sum + (room.infants_without_bed || 0),
      0
    );

    if (adults === 0 && children === 0 && infants === 0) {
      return "—";
    }

    return `${adults} Adult${adults !== 1 ? "s" : ""}, ${children} Child${children !== 1 ? "ren" : ""}, ${infants} Infant${infants !== 1 ? "s" : ""}`;
  };

  function convertToCustomerCurrency(price) {
    if (!price || !voucherDetail.customer_exchange_rate)
      return Number(price || 0).toFixed(2);
    if (voucherDetail.currency_code === voucherDetail.customer_currency) {
      return Number(price).toFixed(2);
    }
    return (
      Number(price) * Number(voucherDetail.customer_exchange_rate)
    ).toFixed(2);
  }

  const leadName = [
    voucherDetail?.lead_title,
    voucherDetail?.lead_first_name,
    voucherDetail?.lead_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const leadPhone = `${voucherDetail?.lead_phone_code || ""}${voucherDetail?.lead_phone || ""
    }`.trim();

  const nights =
    voucherDetail?.packageDetails?.start_date &&
      voucherDetail?.packageDetails?.end_date
      ? moment(voucherDetail.packageDetails.end_date).diff(
        moment(voucherDetail.packageDetails.start_date),
        "days"
      )
      : null;

  const hasAdditionalGuests =
    voucherDetail?.other_passengers?.additional_adults?.length > 0 ||
    voucherDetail?.other_passengers?.children_details?.length > 0 ||
    voucherDetail?.other_passengers?.infants_details?.length > 0;

  const hasRooms = voucherDetail?.room_selections?.length > 0;
  const hasFlights = voucherDetail?.flights?.length > 0;
  const hasReturnFlights = voucherDetail?.flights?.some((f) =>
    f.stops?.some((s) => s.is_return === true)
  );
  const hasTransfers = voucherDetail?.transfers?.length > 0;
  const hasServices = voucherDetail?.additional_services?.length > 0;
  const hasVisas = voucherDetail?.visas?.length > 0;
  const hasCancel = Boolean(
    voucherDetail?.packageDetails?.cancellation_policy
  );
  const hasSpecial = Boolean(voucherDetail?.special_request);

  const pad = (n) => String(n).padStart(2, "0");
  let stepN = 0;
  const step = {
    details: pad(++stepN),
    package: pad(++stepN),
    guests: pad(++stepN),
    rooms: hasRooms ? pad(++stepN) : null,
    flights: hasFlights ? pad(++stepN) : null,
    returns: hasReturnFlights ? pad(++stepN) : null,
    transfers: hasTransfers ? pad(++stepN) : null,
    services: hasServices ? pad(++stepN) : null,
    visas: hasVisas ? pad(++stepN) : null,
    cancel: hasCancel ? pad(++stepN) : null,
    special: hasSpecial ? pad(++stepN) : null,
    important: pad(++stepN),
  };

  const starRating = Number(voucherDetail?.packageDetails?.star_rating || 0);

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.voucherContainer}>
          <div className={styles.voucherCard}>
            <HotelVoucherLoader />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.voucherContainer}>
          <div className={styles.errorCard}>
            <IoWarningOutline className={styles.errorIcon} size={96} />
            <h5 className={styles.errorText}>{errorMessage}</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.voucherContainer}>
        <div ref={ref} id="voucher" className={styles.voucherCard}>
          <div className={styles.vchHeader}>
            <div className={styles.vchHeaderBand}>
              <span className={styles.vchHeaderCircle} aria-hidden="true" />
              <div className={styles.vchHeaderBrand}>
                <h2
                  className={`${styles.vchHeaderDocTitle} ${merriweather.className}`}
                >
                  Package Booking Voucher
                </h2>
                <p className={styles.vchHeaderTagline}>
                  Thank you for choosing Al-Hijaz Tours
                </p>
              </div>
              <div className={styles.vchHeaderContacts}>
                <span>
                  <FaPhone size={13} />
                  00000000000
                </span>
                <span>
                  <FaEnvelope size={13} />
                  info@example.com

                </span>
              </div>
            </div>

            <div className={styles.vchHeaderSub}>
              <div className={styles.vchHeaderMain}>
                <div className={styles.vchForBlock}>
                  <div className={styles.vchForLabel}>VOUCHER FOR</div>
                  <h1
                    className={`${styles.vchGuestName} ${merriweather.className}`}
                  >
                    {leadName || "—"}
                  </h1>
                  <p className={styles.vchForDesc}>
                    {[
                      voucherDetail?.packageDetails?.title,
                      nights != null ? `${nights} Nights` : "",
                      getTotalGuests(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className={styles.vchMetaBlock}>
                  <div className={styles.vchStatusRow}>
                    <span
                      className={`${styles.vchStatusBadge} ${voucherDetail?.booking_status === "confirmed"
                          ? styles.statusConfirmed
                          : voucherDetail?.booking_status === "cancelled"
                            ? styles.statusCancelled
                            : styles.statusPending
                        }`}
                    >
                      <FaCheckCircle size={12} />
                      {voucherDetail?.booking_status
                        ? String(voucherDetail.booking_status).toUpperCase()
                        : "CONFIRMED"}
                    </span>
                    {voucherDetail?.payment_status && (
                      <span
                        className={`${styles.vchStatusBadge} ${styles[
                          `payment_${String(
                            voucherDetail.payment_status
                          ).toLowerCase()}`
                          ] || styles.statusPending
                          }`}
                      >
                        {String(voucherDetail.payment_status).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={styles.vchBookingRef}>
                    Booking Ref: {voucherDetail?.booking_reference || "—"}
                  </div>
                  <div className={styles.vchBookingDate}>
                    Booking Date:{" "}
                    {voucherDetail?.created_at
                      ? moment(
                        voucherDetail.created_at,
                        "DD-MM-YYYY HH:mm:ss"
                      ).format("DD-MM-YYYY")
                      : "—"}
                  </div>
                </div>
              </div>

              <div className={styles.qrCard}>
                <div className={styles.qrBox}>
                  {voucherUrl ? (
                    <QRCode
                      value={voucherUrl}
                      size={96}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                      style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: 92,
                        maxHeight: 92,
                      }}
                    />
                  ) : null}
                </div>
                <div className={styles.qrText}>
                  <span className={styles.qrTitle}>Verify Booking</span>
                  <span className={styles.qrLabel}>
                    Scan this QR code to verify your package booking voucher
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bodyInner}>
            {/* Voucher Details */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.details}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Booking By
                </h3>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Booking Ref</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.booking_reference || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lead Passenger</span>
                  <span className={styles.detailValue}>{leadName || "—"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Phone</span>
                  <span className={styles.detailValue}>
                    {leadPhone || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.lead_email || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Country</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.lead_country || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Total Guests</span>
                  <span className={styles.detailValue}>
                    {getTotalGuests() || "—"}
                  </span>
                </div>
              </div>
              {voucherDetail?.lead_address && (
                <div className={styles.addressNote}>
                  <strong>Address:</strong> {voucherDetail.lead_address}
                </div>
              )}
            </section>

            {/* Package Details */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.package}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Package Details
                </h3>
              </div>

              <div className={styles.packageCard}>
                <div className={styles.packageCardHead}>
                  <h4 className={styles.packageTitle}>
                    {voucherDetail?.packageDetails?.title || "—"}
                  </h4>
                  {starRating > 0 && (
                    <div className={styles.ratingRow}>
                      {Array.from({ length: 5 }).map((_, index) => {
                        const fullStars = Math.floor(starRating);
                        if (index < fullStars)
                          return (
                            <FaStar key={index} className={styles.star} />
                          );
                        return (
                          <FaRegStar
                            key={index}
                            className={styles.starMuted}
                          />
                        );
                      })}
                      <span className={styles.ratingValue}>
                        {starRating} Star Package
                      </span>
                    </div>
                  )}
                  <div className={styles.stayGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Start Date</span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.packageDetails?.start_date
                          ? moment(
                            voucherDetail.packageDetails.start_date
                          ).format("DD-MM-YYYY")
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>End Date</span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.packageDetails?.end_date
                          ? moment(
                            voucherDetail.packageDetails.end_date
                          ).format("DD-MM-YYYY")
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Duration</span>
                      <span className={styles.stayValue}>
                        {nights != null ? `${nights} Nights` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Guests */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.guests}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Guest Details
                </h3>
              </div>
              {/* <p className={styles.detailValue} style={{ marginBottom: 12 }}>
                {getTotalGuests()}
              </p> */}

              <div className={styles.guestList}>
                {/* <div className={styles.guestRow}>
                  <div className={styles.guestLeft}>
                    <span className={styles.guestIndex}>1</span>
                    <div className={styles.guestInfo}>
                      <span className={styles.guestName}>
                        {leadName || "—"}
                      </span>
                      <span className={styles.guestSub}>
                        {[voucherDetail?.lead_email, leadPhone || null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.guestMeta}>
                    {voucherDetail?.lead_gender && (
                      <span className={styles.guestGender}>
                        {capitalize(voucherDetail.lead_gender)}
                      </span>
                    )}
                    {voucherDetail?.lead_country && (
                      <span className={styles.guestGender}>
                        {voucherDetail.lead_country}
                      </span>
                    )}
                    <span className={styles.guestType}>Lead</span>
                  </div>
                </div> */}

                {hasAdditionalGuests && (
                  <>
                    {voucherDetail?.other_passengers?.additional_adults?.map(
                      (adult, i) => (
                        <div key={`adult-${i}`} className={styles.guestRow}>
                          <div className={styles.guestLeft}>
                            <span className={styles.guestIndex}>{i + 2}</span>
                            <div className={styles.guestInfo}>
                              <span className={styles.guestName}>
                                {adult.first_name} {adult.last_name}
                              </span>
                            </div>
                          </div>
                          <div className={styles.guestMeta}>
                            {adult.gender && (
                              <span className={styles.guestGender}>
                                {capitalize(adult.gender)}
                              </span>
                            )}
                            <span className={styles.guestType}>Adult</span>
                          </div>
                        </div>
                      )
                    )}
                    {voucherDetail?.other_passengers?.children_details?.map(
                      (child, i) => (
                        <div key={`child-${i}`} className={styles.guestRow}>
                          <div className={styles.guestLeft}>
                            <span className={styles.guestIndex}>
                              {(voucherDetail?.other_passengers
                                ?.additional_adults?.length || 0) +
                                i +
                                2}
                            </span>
                            <div className={styles.guestInfo}>
                              <span className={styles.guestName}>
                                {child.first_name} {child.last_name}
                              </span>
                            </div>
                          </div>
                          <div className={styles.guestMeta}>
                            {child.gender && (
                              <span className={styles.guestGender}>
                                {capitalize(child.gender)}
                              </span>
                            )}
                            <span className={styles.guestType}>Child</span>
                          </div>
                        </div>
                      )
                    )}
                    {voucherDetail?.other_passengers?.infants_details?.map(
                      (infant, i) => {
                        const offset =
                          (voucherDetail?.other_passengers?.additional_adults
                            ?.length || 0) +
                          (voucherDetail?.other_passengers?.children_details
                            ?.length || 0);
                        return (
                          <div key={`infant-${i}`} className={styles.guestRow}>
                            <div className={styles.guestLeft}>
                              <span className={styles.guestIndex}>
                                {offset + i + 2}
                              </span>
                              <div className={styles.guestInfo}>
                                <span className={styles.guestName}>
                                  {infant.first_name} {infant.last_name}
                                </span>
                              </div>
                            </div>
                            <div className={styles.guestMeta}>
                              {infant.gender && (
                                <span className={styles.guestGender}>
                                  {capitalize(infant.gender)}
                                </span>
                              )}
                              <span className={styles.guestType}>Infant</span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Accommodation */}
            {hasRooms && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.rooms}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Accommodation Details
                  </h3>
                </div>

                {voucherDetail.room_selections.map((item, index) => (
                  <div key={index} className={styles.legCard}>
                    <div className={styles.legHead}>
                      <FaHotel size={18} color="#E7247A" />
                      <h4 className={styles.legTitle}>
                        {capitalizeString(item?.hotel?.name)}
                        {item?.hotel?.city && (
                          <span className={styles.cityChip}>
                            {item.hotel.city}
                          </span>
                        )}
                      </h4>
                      {item?.hotel?.address && (
                        <p className={styles.legSub}>{item.hotel.address}</p>
                      )}
                    </div>

                    <div className={styles.flightSegmentCard}>
                      <div className={styles.routeGrid}>
                        <div className={styles.routeStation}>
                          <p className={styles.routeCity}>Check-In</p>
                          <p className={styles.routeTime}>
                            {item?.hotel?.booked_from
                              ? moment(item.hotel.booked_from).format(
                                "DD MMM YYYY"
                              )
                              : "—"}
                          </p>
                        </div>
                        <div className={styles.routeArrow}>
                          <span className={styles.durationLabel}>
                            {item?.hotel?.booked_from && item?.hotel?.booked_to
                              ? `${moment(item.hotel.booked_to).diff(
                                moment(item.hotel.booked_from),
                                "days"
                              )} Nights`
                              : "—"}
                          </span>
                          <div className={styles.arrowLine}>
                            <FaHotel className={styles.planeIcon} />
                          </div>
                        </div>
                        <div
                          className={`${styles.routeStation} ${styles.routeStationRight}`}
                        >
                          <p className={styles.routeCity}>Check-Out</p>
                          <p className={styles.routeTime}>
                            {item?.hotel?.booked_to
                              ? moment(item.hotel.booked_to).format(
                                "DD MMM YYYY"
                              )
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <table className={styles.roomTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Room Type</th>
                            <th>Meal / View</th>
                            <th>Adults</th>
                            <th>Children</th>
                            <th>Infant</th>
                            <th>Without Beds</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.rooms?.map((room, rindex) => (
                            <tr key={rindex}>
                              <td data-label="#">{rindex + 1}</td>
                              <td data-label="Room Type">
                                <strong>
                                  {room.selection.label === "without_beds"
                                    ? "Without Beds"
                                    : `${room.selection.label} × ${room.selection.rooms}`}
                                </strong>
                              </td>
                              <td data-label="Meal / View">
                                {[
                                  room?.rooms?.items?.data?.meal,
                                  room?.rooms?.items?.data?.view,
                                ]
                                  .filter(Boolean)
                                  .join(" + ") || "—"}
                              </td>
                              <td data-label="Adults">
                                {room.selection.adults}
                              </td>
                              <td data-label="Children">
                                {room.selection.children}
                              </td>
                              <td data-label="Infant">
                                {room.selection.infants}
                              </td>
                              <td data-label="Without Beds">
                                {CalculateWithoutBeds(room.selection.type)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Departure Flights */}
            {hasFlights && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.flights}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Flight Details
                  </h3>
                </div>

                {voucherDetail.flights.map((item, index) =>
                  item.stops
                    ?.filter((s) => s.is_return === false)
                    .map((flight, fIndex) => (
                      <div
                        key={`dep-${index}-${fIndex}`}
                        className={styles.legCard}
                      >
                        <div className={styles.flightSegmentCard}>
                          <div className={styles.airlineRow}>
                            <FaPlaneDeparture size={22} color="#E7247A" />
                            <div>
                              <p className={styles.airlineNameText}>
                                {flight.airline_name}
                              </p>
                              <p className={styles.flightNumberText}>
                                {flight.flight_number}
                                &nbsp;·&nbsp;
                                {capitalize(flight.type)}
                              </p>
                            </div>
                          </div>
                          <div className={styles.routeGrid}>
                            <div className={styles.routeStation}>
                              <p className={styles.routeCity}>Departure</p>
                              <p className={styles.routeAirport}>
                                {flight?.departure_from}
                              </p>
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
                              <p className={styles.routeCity}>Arrival</p>
                              <p className={styles.routeAirport}>
                                {flight?.departure_to}
                              </p>
                              <p className={styles.routeTime}>
                                {moment
                                  .utc(flight.datetime_to)
                                  .format("DD MMM YYYY, LT")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </section>
            )}

            {/* Return Flights */}
            {hasReturnFlights && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.returns}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Return Flight Details
                  </h3>
                </div>

                {voucherDetail.flights.map((item, index) =>
                  item.stops
                    ?.filter((s) => s.is_return === true)
                    .map((flight, fIndex) => (
                      <div
                        key={`ret-${index}-${fIndex}`}
                        className={styles.legCard}
                      >
                        <div className={styles.flightSegmentCard}>
                          <div className={styles.airlineRow}>
                            <FaPlaneArrival size={22} color="#E7247A" />
                            <div>
                              <p className={styles.airlineNameText}>
                                {flight.airline_name}
                              </p>
                              <p className={styles.flightNumberText}>
                                {flight.flight_number}
                                &nbsp;·&nbsp;
                                {capitalize(flight.type)}
                              </p>
                            </div>
                          </div>
                          <div className={styles.routeGrid}>
                            <div className={styles.routeStation}>
                              <p className={styles.routeCity}>Departure</p>
                              <p className={styles.routeAirport}>
                                {flight?.departure_from}
                              </p>
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
                              <p className={styles.routeCity}>Arrival</p>
                              <p className={styles.routeAirport}>
                                {flight?.departure_to}
                              </p>
                              <p className={styles.routeTime}>
                                {moment
                                  .utc(flight.datetime_to)
                                  .format("DD MMM YYYY, LT")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </section>
            )}

            {/* Transfers */}
            {hasTransfers && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.transfers}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Transfer Details
                  </h3>
                </div>

                {voucherDetail.transfers.map((item, index) => (
                  <div key={index} className={styles.legCard}>
                    <div className={styles.legHead}>
                      <FaBus size={18} color="#E7247A" />
                      <h4 className={styles.legTitle}>
                        {capitalize(item?.vehicle)}
                      </h4>
                      <p className={styles.legSub}>
                        {capitalize(item?.trip_type)}
                      </p>
                    </div>

                    <div className={styles.flightSegmentCard}>
                      {item.locations?.map((loc, idx) => (
                        <div key={idx} className={styles.routeGrid}>
                          <div className={styles.routeStation}>
                            <p className={styles.routeCity}>Pickup</p>
                            <p className={styles.routeAirport}>
                              {loc.pickup_address}
                            </p>
                            <p className={styles.routeTime}>
                              {loc.outbound
                                ? moment(loc.outbound).format(
                                  "DD MMM YYYY, HH:mm"
                                )
                                : "—"}
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
                            <p className={styles.routeCity}>Dropoff</p>
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
                  </div>
                ))}
              </section>
            )}

            {/* Additional Services */}
            {hasServices && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.services}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Additional Services
                  </h3>
                </div>
                {voucherDetail.additional_services.map((item, index) => (
                  <div key={index} className={styles.serviceRow}>
                    <span className={styles.serviceIndex}>{index + 1}</span>
                    <span className={styles.serviceName}>{item.name}</span>
                    <span className={styles.serviceQty}>
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {/* Visas */}
            {hasVisas && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.visas}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Visa Details
                  </h3>
                </div>
                {voucherDetail.visas.map((item, index) => (
                  <div key={index} className={styles.visaCard}>
                    <p className={styles.visaName}>
                      {index + 1}. {item?.visa_type || "—"}
                    </p>
                    {item?.visa_description && (
                      <p className={styles.visaDesc}>{item.visa_description}</p>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Cancellation */}
            {hasCancel && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.cancel}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Cancellation Policy
                  </h3>
                </div>
                {voucherDetail.packageDetails.cancellation_policy
                  .cancel_policy === "refundable" &&
                  voucherDetail.packageDetails.cancellation_policy
                    .cancellation_policies?.length ? (
                  <ul className={styles.cancelList}>
                    {voucherDetail.packageDetails.cancellation_policy.cancellation_policies.map(
                      (policy, i) => (
                        <li key={i}>
                          If cancelled{" "}
                          <strong>{policy.time_duration} hours</strong> before
                          departure, a{" "}
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
                      )
                    )}
                  </ul>
                ) : (
                  <span className={styles.nonRefundable}>
                    This booking is non-refundable. No refund will be issued for
                    cancellations.
                  </span>
                )}
              </section>
            )}

            {/* Special Request */}
            {hasSpecial && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.special}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Special Request
                  </h3>
                </div>
                <p className={styles.specialRequestText}>
                  {voucherDetail.special_request}
                </p>
              </section>
            )}

            {/* Important */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.important}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Important Information
                </h3>
              </div>
              <ul className={styles.infoBullets}>
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
            </section>
          </div>

          <div className={styles.thanksFooter}>
            <div className={styles.thanksFooterContent}>
              <h3
                className={`${styles.thanksFooterTitle} ${merriweather.className}`}
              >
                Thanks For Choosing Us
              </h3>
              <div className={styles.thanksFooterContacts}>
                <span>
                  <FaPhone size={12} />
                  00000000000
                </span>
                <span>
                  <FaEnvelope size={12} />
                  info@example.com

                </span>
              </div>
              <div className={styles.thanksFooterAddress}>
                <FaMapMarkerAlt size={12} />
                <span>XXXXXXXXXXXXXXXXXXXXXXXXX</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.btnPrint}
            onClick={() => window.print()}
          >
            Print Voucher
          </button>
          <Link
            href={`/${voucherDetail?.packageDetails?.category?.slug}/invoice/${voucherDetail?.booking_reference || id}`}
            className={styles.btnInvoice}
          >
            View Invoice
          </Link>
          {voucherDetail?.atol_url && (
            <a
              href={voucherDetail.atol_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnExtra}
            >
              <FaFileAlt size={14} style={{ marginRight: 6 }} />
              View Atol
            </a>
          )}
          {voucherDetail?.indemnity_url && (
            <a
              href={voucherDetail.indemnity_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnExtra}
            >
              <FaFileContract size={14} style={{ marginRight: 6 }} />
              View Indemnity
            </a>
          )}
          <Link href="/" className={styles.btnHome}>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
