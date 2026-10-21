"use client";
import React, { useRef, useEffect, useState } from "react";
import styles from "./voucher.module.css";
import moment from "moment";
import {
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaChair,
} from "react-icons/fa";
import { MdFlight, MdLuggage, MdConfirmationNumber } from "react-icons/md";
import { useParams } from "next/navigation";
import Link from "next/link";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import QRCode from "react-qr-code";
import { IoWarningOutline } from "react-icons/io5";
import { groupSegments } from "@/components/Flights/Checkout/flightHelpers";
import { Merriweather } from "next/font/google";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function FlightVoucher() {
  const voucherRef = useRef();
  const { id } = useParams();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [voucherUrl, setVoucherUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setVoucherUrl(window.location.href);
    }
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking/details`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_reference: id }),
        }
      );
      const res = await responses.json();
      setIsLoading(false);
      if (res.success) {
        setVoucherDetail(res?.data);
      } else {
        setErrorMessage(res?.message);
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error fetching flight details:", err);
    }
  };

  const getAirportName = (point) =>
    point?.airport_name ||
    point?.name ||
    point?.airport_code ||
    point?.iata_code ||
    "";
  const getCityName = (point) =>
    point?.city || point?.airport_code || point?.iata_code || "";
  const getAirportCode = (point) =>
    point?.airport_code || point?.iata_code || "";
  const getAirlineName = (airline) =>
    airline?.name || airline?.code || airline?.iata_code || "";
  const getAirlineCode = (airline) =>
    airline?.code || airline?.iata_code || "";

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "—";
    const mins = Number(minutes);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getTripTypeLabel = () => {
    const t = voucherDetail?.flight_details?.trip_type;
    if (t === "one_way") return "One Way Flight";
    if (t === "return") return "Return Flight";
    if (t === "multi_city" || t === "multicity") return "Multi City Flight";
    return "Flight Details";
  };

  const getSegmentGroups = () => {
    const groups = groupSegments({
      segments: voucherDetail?.segments || [],
      trip_type: voucherDetail?.flight_details?.trip_type,
      search_criteria:
        voucherDetail?.flight_details?.search_criteria ||
        voucherDetail?.search_criteria,
    });

    return groups.map((group, idx) => {
      let displayLabel = group.label || `Flight ${idx + 1}`;
      if (displayLabel === "Departure") displayLabel = "Departure Flight";
      if (displayLabel === "Return") displayLabel = "Return Flight";

      const first = group.segments?.[0]?.departure;
      const last = group.segments?.[group.segments.length - 1]?.arrival;
      const routeLabel =
        first && last
          ? `${getCityName(first)} (${getAirportCode(first)}) → ${getCityName(last)} (${getAirportCode(last)})`
          : "";

      return { ...group, displayLabel, routeLabel };
    });
  };

  const getTotalPassengers = () => {
    if (!voucherDetail?.passenger_counts) return "";
    const { adults = 0, children = 0, infants = 0 } =
      voucherDetail.passenger_counts;
    return [
      adults > 0 && `${adults} Adult${adults > 1 ? "s" : ""}`,
      children > 0 && `${children} Child${children > 1 ? "ren" : ""}`,
      infants > 0 && `${infants} Infant${infants > 1 ? "s" : ""}`,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const getPassengerTypeLabel = (type) => {
    if (!type) return "";
    if (type === "adult" || type === "ADT") return "Adult";
    if (type === "child" || type === "CHD") return "Child";
    if (
      type === "infant" ||
      type === "infant_without_seat" ||
      type === "INF"
    )
      return "Infant";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getCardTypeLabel = (cardType) => {
    if (!cardType) return "—";
    const type = String(cardType).toLowerCase();
    if (type === "p" || type === "passport") return "Passport";
    if (type === "n" || type === "id" || type === "id_card") return "ID Card";
    if (type === "o" || type === "other") return "Other";
    return cardType;
  };

  const getPnrForFlight = (flightNum) => {
    return voucherDetail?.pnr_list?.find(
      (p) => String(p.flightNum) === String(flightNum)
    );
  };

  const getSeatForPassenger = (passenger, flightNum) => {
    return (
      passenger?.seats?.find(
        (s) => String(s.flightNum) === String(flightNum) && s.seatNum
      )?.seatNum || ""
    );
  };

  const getTicketForSegment = (flightNum, passengerIndex) => {
    const pnr = getPnrForFlight(flightNum);
    const ticket = pnr?.ticketNums?.find(
      (t) => Number(t.passengerIndex) === Number(passengerIndex)
    );
    return ticket?.ticketNum || "";
  };

  const getLayoverMinutes = (currentSeg, nextSeg) => {
    if (!currentSeg?.arrival?.datetime || !nextSeg?.departure?.datetime)
      return null;
    return moment(nextSeg.departure.datetime).diff(
      moment(currentSeg.arrival.datetime),
      "minutes"
    );
  };

  const paidAncillaries = voucherDetail?.baggage_info?.paid;
  const hasPaidBaggage = paidAncillaries?.baggage?.length > 0;
  const hasPaidSeats = paidAncillaries?.seat?.length > 0;

  const routeSummary = () => {
    const segments = voucherDetail?.segments;
    if (!segments?.length) return "—";
    const first = segments[0]?.departure;
    const last = segments[segments.length - 1]?.arrival;
    return `${getCityName(first)} (${getAirportCode(first)}) → ${getCityName(last)} (${getAirportCode(last)})`;
  };

  const leadPassenger = voucherDetail?.passenger_details?.[0];
  const headerDesc = [
    getTripTypeLabel(),
    routeSummary() !== "—" ? routeSummary() : "",
    getTotalPassengers(),
  ]
    .filter(Boolean)
    .join(" · ");

  const pad = (n) => String(n).padStart(2, "0");
  let stepN = 0;
  const step = {
    details: pad(++stepN),
    flights: pad(++stepN),
    passengers: voucherDetail?.passenger_details?.length
      ? pad(++stepN)
      : null,
    services: hasPaidBaggage || hasPaidSeats ? pad(++stepN) : null,
    important: pad(++stepN),
  };

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
        <div ref={voucherRef} id="voucher" className={styles.voucherCard}>
          <div className={styles.vchHeader}>
            <div className={styles.vchHeaderBand}>
              <span className={styles.vchHeaderCircle} aria-hidden="true" />
              <div className={styles.vchHeaderBrand}>
                <h2
                  className={`${styles.vchHeaderDocTitle} ${merriweather.className}`}
                >
                  Flight Booking Voucher
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
                    {leadPassenger?.title
                      ? `${String(leadPassenger.title).toUpperCase()} `
                      : ""}
                    {leadPassenger?.firstName} {leadPassenger?.lastName}
                  </h1>
                  <p className={styles.vchForDesc}>{headerDesc}</p>
                </div>

                <div className={styles.vchMetaBlock}>
                  <div className={styles.vchStatusRow}>
                    <span
                      className={`${styles.vchStatusBadge} ${
                        voucherDetail?.booking_status === "confirmed"
                          ? styles.statusConfirmed
                          : voucherDetail?.booking_status === "cancelled"
                            ? styles.statusCancelled
                            : styles.statusPending
                      }`}
                    >
                      <FaCheckCircle size={12} />
                      {voucherDetail?.booking_status
                        ? String(voucherDetail.booking_status).toUpperCase()
                        : "—"}
                    </span>
                    {voucherDetail?.payment_status && (
                      <span
                        className={`${styles.vchStatusBadge} ${
                          styles[
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
                  {voucherDetail?.order_id && (
                    <div className={styles.vchBookingDate}>
                      Order ID: {voucherDetail.order_id}
                    </div>
                  )}
                  <div className={styles.vchBookingDate}>
                    Booking Date:{" "}
                    {voucherDetail?.created_at
                      ? moment(voucherDetail.created_at).format("DD-MM-YYYY")
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
                    Scan this QR code to verify your flight booking voucher
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
                  Voucher Details
                </h3>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Booking Ref / PNR</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.booking_reference || "—"}
                  </span>
                </div>
                {voucherDetail?.order_id && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Order ID</span>
                    <span className={styles.detailValue}>
                      {voucherDetail.order_id}
                    </span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lead Passenger</span>
                  <span className={styles.detailValue}>
                    {leadPassenger?.title
                      ? `${String(leadPassenger.title).toUpperCase()} `
                      : ""}
                    {leadPassenger?.firstName} {leadPassenger?.lastName}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Phone</span>
                  <span className={styles.detailValue}>
                    {leadPassenger?.phone || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.email || leadPassenger?.email || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Trip Type</span>
                  <span className={styles.detailValue}>
                    {getTripTypeLabel()}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Route</span>
                  <span className={styles.detailValue}>{routeSummary()}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Passengers</span>
                  <span className={styles.detailValue}>
                    {getTotalPassengers() || "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* Flight Details */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.flights}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Flight Details
                </h3>
              </div>

              {voucherDetail?.segments?.length > 0 ? (
                getSegmentGroups().map((group, groupIndex) => (
                  <div key={`leg-${groupIndex}`} className={styles.legCard}>
                    <div className={styles.legHead}>
                      <h4 className={styles.legTitle}>{group.displayLabel}</h4>
                      {group.routeLabel && (
                        <span className={styles.legRoute}>
                          {group.routeLabel}
                        </span>
                      )}
                    </div>

                    {group.segments.map((segment, segIndex) => {
                      const pnrInfo = getPnrForFlight(segment.flight_number);
                      const nextSegment = group.segments[segIndex + 1];
                      const layoverMins = nextSegment
                        ? getLayoverMinutes(segment, nextSegment)
                        : null;
                      const dep = segment.departure;
                      const arr = segment.arrival;

                      return (
                        <React.Fragment
                          key={
                            segment.segment_key || `${groupIndex}-${segIndex}`
                          }
                        >
                          <div className={styles.flightSegmentCard}>
                            <div className={styles.airlineRow}>
                              {segment.airline?.logo_url && (
                                <img
                                  src={segment.airline.logo_url}
                                  alt={getAirlineName(segment.airline)}
                                  className={styles.airlineLogo}
                                />
                              )}
                              <div className={styles.airlineMeta}>
                                <p className={styles.airlineNameText}>
                                  {getAirlineName(segment.airline)}
                                </p>
                                <p className={styles.flightNumberText}>
                                  Flight: {getAirlineCode(segment.airline)}{" "}
                                  {segment.flight_number}
                                  {segment.cabin_class?.name && (
                                    <>&nbsp;|&nbsp;{segment.cabin_class.name}</>
                                  )}
                                  {segment.booking_class?.code && (
                                    <>
                                      &nbsp;|&nbsp;Class{" "}
                                      {segment.booking_class.code}
                                    </>
                                  )}
                                  {segment.aircraft && (
                                    <>&nbsp;|&nbsp;Aircraft {segment.aircraft}</>
                                  )}
                                </p>
                              </div>
                              {(pnrInfo?.pnr || pnrInfo?.airPnr) && (
                                <div className={styles.pnrBadgeWrap}>
                                  <span className={styles.pnrBadge}>
                                    PNR: {pnrInfo.pnr || pnrInfo.airPnr}
                                  </span>
                                  {pnrInfo.airPnr &&
                                    pnrInfo.airPnr !== pnrInfo.pnr && (
                                      <span className={styles.pnrBadgeSecondary}>
                                        Air PNR: {pnrInfo.airPnr}
                                      </span>
                                    )}
                                </div>
                              )}
                            </div>

                            <div className={styles.routeGrid}>
                              <div className={styles.routeStation}>
                                <h4 className={styles.routeCity}>
                                  {getCityName(dep)}
                                </h4>
                                <p className={styles.routeAirport}>
                                  {getAirportName(dep)}
                                </p>
                                <p className={styles.routeCode}>
                                  {getAirportCode(dep)}
                                  {dep?.terminal &&
                                    ` · Terminal ${dep.terminal}`}
                                </p>
                                <p className={styles.routeTime}>
                                  {dep?.datetime
                                    ? moment(dep.datetime).format(
                                        "DD MMM YYYY, HH:mm"
                                      )
                                    : "—"}
                                </p>
                              </div>

                              <div className={styles.routeArrow}>
                                <span className={styles.durationLabel}>
                                  {formatDuration(segment.duration)}
                                </span>
                                <div className={styles.arrowLine}>
                                  <MdFlight className={styles.planeIcon} />
                                </div>
                                {segment.stops > 0 && (
                                  <span className={styles.stopsLabel}>
                                    {segment.stops} Stop
                                    {segment.stops > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>

                              <div
                                className={`${styles.routeStation} ${styles.routeStationRight}`}
                              >
                                <h4 className={styles.routeCity}>
                                  {getCityName(arr)}
                                </h4>
                                <p className={styles.routeAirport}>
                                  {getAirportName(arr)}
                                </p>
                                <p className={styles.routeCode}>
                                  {getAirportCode(arr)}
                                  {arr?.terminal &&
                                    ` · Terminal ${arr.terminal}`}
                                </p>
                                <p className={styles.routeTime}>
                                  {arr?.datetime
                                    ? moment(arr.datetime).format(
                                        "DD MMM YYYY, HH:mm"
                                      )
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            {voucherDetail?.passenger_details?.length > 0 && (
                              <div className={styles.segmentMetaRow}>
                                {voucherDetail.passenger_details.map(
                                  (passenger, pIdx) => {
                                    const ticketNo = getTicketForSegment(
                                      segment.flight_number,
                                      passenger.passengerIndex || pIdx + 1
                                    );
                                    const seatNo = getSeatForPassenger(
                                      passenger,
                                      segment.flight_number
                                    );
                                    if (!ticketNo && !seatNo) return null;
                                    return (
                                      <div
                                        key={pIdx}
                                        className={styles.segmentMetaChip}
                                      >
                                        <span
                                          className={styles.segmentMetaName}
                                        >
                                          {passenger.firstName}{" "}
                                          {passenger.lastName}
                                        </span>
                                        {ticketNo && (
                                          <span
                                            className={styles.segmentMetaItem}
                                          >
                                            <MdConfirmationNumber size={12} />{" "}
                                            E-Ticket: {ticketNo}
                                          </span>
                                        )}
                                        {seatNo && (
                                          <span
                                            className={styles.segmentMetaItem}
                                          >
                                            <FaChair size={11} /> Seat:{" "}
                                            {seatNo}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}

                            {(segment?.baggage_info?.adult ||
                              segment?.baggage_info?.child ||
                              segment?.baggage_info?.infant) && (
                              <div className={styles.baggageRow}>
                                <span className={styles.baggageTitle}>
                                  <MdLuggage size={14} /> Included Baggage:
                                </span>
                                {segment?.baggage_info?.adult && (
                                  <span className={styles.baggageChip}>
                                    Adult: {segment.baggage_info.adult.cabin} |{" "}
                                    {segment.baggage_info.adult.checked}
                                  </span>
                                )}
                                {segment?.baggage_info?.child && (
                                  <span className={styles.baggageChip}>
                                    Child: {segment.baggage_info.child.cabin} |{" "}
                                    {segment.baggage_info.child.checked}
                                  </span>
                                )}
                                {segment?.baggage_info?.infant && (
                                  <span className={styles.baggageChip}>
                                    Infant: {segment.baggage_info.infant.cabin}{" "}
                                    | {segment.baggage_info.infant.checked}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {layoverMins != null && layoverMins > 0 && (
                            <div className={styles.layoverBanner}>
                              <span className={styles.layoverDot} />
                              Layover in {getCityName(arr)} (
                              {getAirportCode(arr)}) —{" "}
                              {formatDuration(layoverMins)}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                ))
              ) : (
                <p className={styles.detailValue}>No flight segments found.</p>
              )}
            </section>

            {/* Passengers */}
            {voucherDetail?.passenger_details?.length > 0 && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.passengers}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Passenger Details
                  </h3>
                </div>
                {getTotalPassengers() && (
                  <p className={styles.legRoute} style={{ marginBottom: 12 }}>
                    {getTotalPassengers()}
                  </p>
                )}

                {voucherDetail.passenger_details.map((passenger, index) => {
                  const seatLabels = (passenger.seats || [])
                    .filter((s) => s.seatNum)
                    .map((s) => `${s.airline || ""}${s.flightNum}: ${s.seatNum}`)
                    .join(", ");
                  const ticketNo =
                    passenger.ticketNum || passenger.checkIn?.ticketNum;

                  return (
                    <div key={index} className={styles.passengerCard}>
                      <div className={styles.passengerCardHeader}>
                        <div className={styles.passengerIdentity}>
                          <span className={styles.guestIndex}>{index + 1}</span>
                          <div>
                            <span className={styles.guestName}>
                              {passenger.title?.toUpperCase()}{" "}
                              {passenger.firstName} {passenger.lastName}
                            </span>
                            {ticketNo && (
                              <p className={styles.passengerTicket}>
                                E-Ticket No: {ticketNo}
                              </p>
                            )}
                          </div>
                        </div>
                        {passenger.type && (
                          <span className={styles.guestType}>
                            {getPassengerTypeLabel(passenger.type)}
                          </span>
                        )}
                      </div>

                      <div className={styles.passengerMetaGrid}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Gender</span>
                          <span className={styles.metaValue}>
                            {passenger.gender === "m"
                              ? "Male"
                              : passenger.gender === "f"
                                ? "Female"
                                : "—"}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Date of Birth</span>
                          <span className={styles.metaValue}>
                            {passenger.dateOfBirth
                              ? moment(passenger.dateOfBirth).format(
                                  "DD MMM YYYY"
                                )
                              : "—"}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Document</span>
                          <span className={styles.metaValue}>
                            {getCardTypeLabel(passenger.cardType)}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Doc. Number</span>
                          <span className={styles.metaValue}>
                            {passenger.cardNum || "—"}
                          </span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Expiry</span>
                          <span className={styles.metaValue}>
                            {passenger.cardExpiredDate
                              ? moment(passenger.cardExpiredDate).format(
                                  "DD MMM YYYY"
                                )
                              : "—"}
                          </span>
                        </div>
                        {seatLabels && (
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Seats</span>
                            <span className={styles.metaValue}>
                              {seatLabels}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Additional Services */}
            {(hasPaidBaggage || hasPaidSeats) && (
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.services}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Additional Services
                  </h3>
                </div>

                {hasPaidBaggage && (
                  <div className={styles.ancillaryGroup}>
                    <p className={styles.ancillaryGroupTitle}>Extra Baggage</p>
                    <div className={styles.ancillaryGrid}>
                      {paidAncillaries.baggage.map((bag, idx) => (
                        <div key={idx} className={styles.ancillaryCard}>
                          <div className={styles.ancillaryCardTop}>
                            <span className={styles.ancillaryName}>
                              {bag.passenger?.first_name}{" "}
                              {bag.passenger?.last_name}
                            </span>
                          </div>
                          <p className={styles.ancillaryDesc}>
                            {(
                              bag.description ||
                              `Checked baggage ${bag.baggage_weight || ""}`
                            ).trim()}
                          </p>
                          {bag.journeys?.length > 0 && (
                            <p className={styles.ancillaryMeta}>
                              Applies to:{" "}
                              {bag.journeys
                                .map(
                                  (j) =>
                                    `${j.airline}${j.flightNum} (${j.departure}→${j.arrival})`
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasPaidSeats && (
                  <div className={styles.ancillaryGroup}>
                    <p className={styles.ancillaryGroupTitle}>Seat Selection</p>
                    <div className={styles.ancillaryGrid}>
                      {paidAncillaries.seat.map((seat, idx) => (
                        <div key={idx} className={styles.ancillaryCard}>
                          <div className={styles.ancillaryCardTop}>
                            <span className={styles.ancillaryName}>
                              {seat.passenger?.first_name}{" "}
                              {seat.passenger?.last_name} — Seat{" "}
                              {seat.seat_name}
                            </span>
                          </div>
                          {seat.segment && (
                            <p className={styles.ancillaryMeta}>
                              {seat.segment.airline}
                              {seat.segment.flightNum} (
                              {seat.segment.departure}→{seat.segment.arrival})
                              {seat.characteristics?.length > 0 && (
                                <> · {seat.characteristics.join(", ")}</>
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  Please arrive at the airport at least 3 hours before
                  international flights and 2 hours before domestic flights.
                </li>
                <li>
                  Valid passport and visa (if required) must be presented at
                  check-in.
                </li>
                <li>
                  Check-in closes 60 minutes before departure for international
                  flights and 45 minutes for domestic flights.
                </li>
                <li>
                  Baggage allowance is subject to airline terms and conditions.
                </li>
                <li>
                  This is an electronic ticket. No paper ticket is required for
                  travel.
                </li>
                <li>
                  Please keep this voucher and your booking reference (PNR)
                  handy for check-in and airport assistance.
                </li>
                <li>
                  This is a computer-generated voucher and does not require any
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
            href={`/flights/invoice/${voucherDetail?.booking_reference || id}`}
            className={styles.btnInvoice}
          >
            View Invoice
          </Link>
          <Link href="/" className={styles.btnHome}>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
