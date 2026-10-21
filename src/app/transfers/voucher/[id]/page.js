"use client";
import styles from "./voucher.module.css";
import moment from "moment";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";
import {
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaCar,
} from "react-icons/fa";
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
    if (typeof window !== "undefined") {
      setVoucherUrl(window.location.href);
    }
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transfers/booking/details`,
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
      console.error("Error fetching transfer details:", err);
    }
  };

  function capitalize(text) {
    if (!text) return "";
    const s = String(text);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function convertToCustomerCurrency(price) {
    if (!price || !voucherDetail.pricing?.supplier_to_display_rate)
      return Number(price || 0).toFixed(2);
    if (
      voucherDetail.pricing?.supplier_currency ===
      voucherDetail.pricing?.display_currency
    ) {
      return Number(price).toFixed(2);
    }
    return (
      Number(price) * Number(voucherDetail.pricing?.supplier_to_display_rate)
    ).toFixed(2);
  }

  const handlePrint = () => window.print();

  const lead = voucherDetail?.lead_passenger;
  const leadName = [lead?.title, lead?.first_name, lead?.last_name]
    .filter(Boolean)
    .join(" ");

  const transferTypeLabel = capitalize(
    voucherDetail?.booking_criteria?.transfer_type ||
      voucherDetail?.transfer?.trip_type ||
      ""
  );

  const pickupLabel =
    voucherDetail?.exact_pickup_point ||
    voucherDetail?.booking_criteria?.pickup_location ||
    "—";
  const dropoffLabel =
    voucherDetail?.exact_dropoff_point ||
    voucherDetail?.booking_criteria?.dropoff_location ||
    "—";

  const passengerCount = 1 + (voucherDetail?.guest_details?.length || 0);

  const hasMultiLocations =
    voucherDetail?.transfer?.trip_type === "all-around" ||
    voucherDetail?.transfer?.trip_type === "all-round" ||
    voucherDetail?.transfer?.trip_type === "return";

  const hasCancel = Boolean(
    voucherDetail?.cancellation_policies?.cancel_policy
  );
  const hasSpecial = Boolean(voucherDetail?.special_request);

  const pad = (n) => String(n).padStart(2, "0");
  let stepN = 0;
  const step = {
    details: pad(++stepN),
    transfer: pad(++stepN),
    vehicle: pad(++stepN),
    guests: pad(++stepN),
    multi:
      hasMultiLocations && voucherDetail?.transfer?.locations?.length
        ? pad(++stepN)
        : null,
    special: hasSpecial ? pad(++stepN) : null,
    cancel: hasCancel ? pad(++stepN) : null,
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
        <div ref={ref} id="voucher" className={styles.voucherCard}>
          <div className={styles.vchHeader}>
            <div className={styles.vchHeaderBand}>
              <span className={styles.vchHeaderCircle} aria-hidden="true" />
              <div className={styles.vchHeaderBrand}>
                <h2
                  className={`${styles.vchHeaderDocTitle} ${merriweather.className}`}
                >
                  Transfer Booking Voucher
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
                      transferTypeLabel || "Transfer Booking",
                      capitalize(voucherDetail?.transfer?.vehicle_name),
                      voucherDetail?.booking_criteria?.pickup_date
                        ? moment(
                            voucherDetail.booking_criteria.pickup_date
                          ).format("DD MMM YYYY")
                        : "",
                      `${passengerCount} Passenger${passengerCount > 1 ? "s" : ""}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
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
                    Invoice Number: {voucherDetail?.invoice_number || "—"}
                  </div>
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
                    Scan this QR code to verify your transfer booking voucher
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
                {/* <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Voucher No</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.booking_reference || "—"}
                  </span>
                </div> */}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lead Passenger</span>
                  <span className={styles.detailValue}>{leadName || "—"}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Phone</span>
                  <span className={styles.detailValue}>
                    {lead?.phone_number || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>
                    {lead?.email || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Country</span>
                  <span className={styles.detailValue}>
                    {lead?.country || "—"}
                  </span>
                </div>
                {/* <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Transfer Type</span>
                  <span className={styles.detailValue}>
                    {transferTypeLabel || "—"}
                  </span>
                </div> */}
              </div>
            </section>

            {/* Transfer Details */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.transfer}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Transfer Details
                </h3>
              </div>

              <div className={styles.routeCard}>
                <div className={styles.routeCardHead}>
                  Pickup &amp; Dropoff
                  {transferTypeLabel ? ` · ${transferTypeLabel}` : ""}
                </div>
                <div className={styles.routeGrid}>
                  <div className={styles.routeStation}>
                    <p className={styles.routeCity}>Pickup</p>
                    <p className={styles.routeAirport}>{pickupLabel}</p>
                    <p className={styles.routeTime}>
                      {voucherDetail?.booking_criteria?.pickup_date
                        ? moment(
                            voucherDetail.booking_criteria.pickup_date
                          ).format("DD MMM YYYY")
                        : "—"}
                      {voucherDetail?.booking_criteria?.pickup_time &&
                        ` · ${moment(
                          voucherDetail.booking_criteria.pickup_time,
                          "HH:mm:ss"
                        ).format("hh:mm A")}`}
                    </p>
                  </div>

                  <div className={styles.routeArrow}>
                    <span className={styles.durationLabel}>
                      {transferTypeLabel || "Transfer"}
                    </span>
                    <div className={styles.arrowLine}>
                      <FaCar className={styles.planeIcon} />
                    </div>
                  </div>

                  <div
                    className={`${styles.routeStation} ${styles.routeStationRight}`}
                  >
                    <p className={styles.routeCity}>Dropoff</p>
                    <p className={styles.routeAirport}>{dropoffLabel}</p>
                    {voucherDetail?.booking_criteria?.dropoff_date && (
                      <p className={styles.routeTime}>
                        {moment(
                          voucherDetail.booking_criteria.dropoff_date
                        ).format("DD MMM YYYY")}
                        {voucherDetail?.booking_criteria?.dropoff_time &&
                          ` · ${moment(
                            voucherDetail.booking_criteria.dropoff_time,
                            "HH:mm:ss"
                          ).format("hh:mm A")}`}
                      </p>
                    )}
                  </div>
                </div>

                {voucherDetail?.flight_number && (
                  <div className={styles.flightChip}>
                    Flight Number: {voucherDetail.flight_number}
                  </div>
                )}
              </div>
            </section>

            {/* Vehicle Details */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.vehicle}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Vehicle Details
                </h3>
              </div>

              <div className={styles.vehicleCard}>
                <div className={styles.vehicleCardHead}>
                  <h4 className={styles.vehicleName}>
                    {capitalize(voucherDetail?.selected_transfers?.vehicle?.name) || "—"}
                    {voucherDetail?.booked_qty
                      ? ` × ${voucherDetail.booked_qty}`
                      : ""}
                  </h4>
                  <div className={styles.vehicleGrid}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Transfer Type</span>
                      <span className={styles.stayValue}>
                        {capitalize(voucherDetail?.selected_transfers?.trip_type) || "—"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>
                        Passenger Capacity
                      </span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.vehicle_details?.passenger_capacity ||
                          "N/A"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>
                        Luggage Capacity
                      </span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.vehicle_details?.luggage_capacity ||
                          "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Passengers */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.guests}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Passenger Details
                </h3>
              </div>
              <p className={styles.detailValue} style={{ marginBottom: 12 }}>
                {passengerCount} Passenger{passengerCount > 1 ? "s" : ""}
              </p>

              <div className={styles.guestList}>
                <div className={styles.guestRow}>
                  <div className={styles.guestLeft}>
                    <span className={styles.guestIndex}>1</span>
                    <div className={styles.guestInfo}>
                      <span className={styles.guestName}>
                        {leadName || "—"}
                      </span>
                      <span className={styles.guestSub}>
                        {[lead?.email, lead?.phone_number]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.guestMeta}>
                    {lead?.gender && (
                      <span className={styles.guestGender}>
                        {capitalize(lead.gender)}
                      </span>
                    )}
                    {lead?.country && (
                      <span className={styles.guestGender}>{lead.country}</span>
                    )}
                    <span className={styles.guestType}>Lead</span>
                  </div>
                </div>

                {voucherDetail?.guest_details?.map((guest, index) => (
                  <div key={index} className={styles.guestRow}>
                    <div className={styles.guestLeft}>
                      <span className={styles.guestIndex}>{index + 2}</span>
                      <div className={styles.guestInfo}>
                        <span className={styles.guestName}>
                          {guest.first_name} {guest.last_name}
                        </span>
                      </div>
                    </div>
                    <div className={styles.guestMeta}>
                      {guest.gender && (
                        <span className={styles.guestGender}>
                          {capitalize(guest.gender)}
                        </span>
                      )}
                      <span className={styles.guestType}>Guest</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Multiple Locations */}
            {hasMultiLocations &&
              voucherDetail?.transfer?.locations?.length > 0 && (
                <section className={styles.detailCard}>
                  <div className={styles.detailCardHead}>
                    <span className={styles.detailStep}>{step.multi}</span>
                    <h3
                      className={`${styles.detailCardTitle} ${merriweather.className}`}
                    >
                      Multiple Locations
                    </h3>
                  </div>

                  {voucherDetail.transfer.locations.map((location, index) => (
                    <div key={index} className={styles.routeCard}>
                      <div className={styles.routeGrid}>
                        <div className={styles.routeStation}>
                          <p className={styles.routeCity}>Pickup</p>
                          <p className={styles.routeAirport}>
                            {location.pickup_address || "—"}
                          </p>
                        </div>
                        <div className={styles.routeArrow}>
                          <span className={styles.durationLabel}>
                            {voucherDetail?.transfer?.trip_type === "return"
                              ? "Return"
                              : `Stop ${index + 1}`}
                          </span>
                          <div className={styles.arrowLine}>
                            <FaCar className={styles.planeIcon} />
                          </div>
                        </div>
                        <div
                          className={`${styles.routeStation} ${styles.routeStationRight}`}
                        >
                          <p className={styles.routeCity}>Dropoff</p>
                          <p className={styles.routeAirport}>
                            {location.dropoff_address || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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

                {voucherDetail.cancellation_policies.cancel_policy ===
                "refundable" ? (
                  voucherDetail.cancellation_policies.policies?.length > 0 ? (
                    <ul className={styles.cancelList}>
                      {voucherDetail.cancellation_policies.policies.map(
                        (policy, idx) => (
                          <li key={idx}>
                            If cancelled from{" "}
                            <strong>
                              {moment(policy.from).format("DD MMM YYYY")}
                            </strong>
                            , a cancellation fee of{" "}
                            <strong>
                              {voucherDetail?.pricing?.display_currency}{" "}
                              {convertToCustomerCurrency(policy.amount)}
                            </strong>{" "}
                            will be charged.
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className={styles.detailValue}>
                      This booking is refundable. Please contact support for
                      cancellation terms.
                    </p>
                  )
                ) : (
                  <span className={styles.nonRefundable}>
                    This transfer is non-refundable. No refund will be issued in
                    case of cancellation.
                  </span>
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
                  Please be at the pickup location at least 15 minutes before
                  the scheduled pickup time.
                </li>
                <li>
                  The driver will wait for a maximum of 30 minutes from the
                  scheduled pickup time.
                </li>
                <li>
                  This voucher must be presented to the driver on the day of
                  travel.
                </li>
                <li>
                  Additional stops or route changes may incur extra charges.
                </li>
                <li>
                  This voucher is valid only for the specified travel date,
                  passenger(s), and vehicle.
                </li>
                <li>
                  This is a computer-generated voucher and does not require a
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
            onClick={handlePrint}
          >
            Print Voucher
          </button>
          <Link
            href={`/transfers/invoice/${voucherDetail?.booking_reference || id}`}
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
