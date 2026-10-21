"use client";
import styles from "./invoice.module.css";
import moment from "moment";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import {
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaCar,
} from "react-icons/fa";
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
  const [invoiceDetail, setInvoiceDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
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
        setInvoiceDetail(res?.data);
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
    if (!price || !invoiceDetail.pricing?.supplier_to_display_rate)
      return Number(price || 0).toFixed(2);
    if (
      invoiceDetail.pricing?.supplier_currency ===
      invoiceDetail.pricing?.display_currency
    ) {
      return Number(price).toFixed(2);
    }
    return (
      Number(price) * Number(invoiceDetail.pricing?.supplier_to_display_rate)
    ).toFixed(2);
  }

  function PerTransferPrice(price, qty) {
    if (!price || !qty) return Number(price || 0).toFixed(2);
    const perTransferPrice = Number(price) / Number(qty);
    return perTransferPrice % 1 === 0
      ? perTransferPrice.toFixed(0)
      : perTransferPrice.toFixed(2);
  }

  const lead = invoiceDetail?.lead_passenger;
  const leadName = [
    lead?.title,
    lead?.first_name,
    lead?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const transferTypeLabel = capitalize(
    invoiceDetail?.booking_criteria?.transfer_type ||
      invoiceDetail?.transfer?.trip_type ||
      ""
  );

  const pickupLabel =
    invoiceDetail?.exact_pickup_point ||
    invoiceDetail?.booking_criteria?.pickup_location ||
    "—";
  const dropoffLabel =
    invoiceDetail?.exact_dropoff_point ||
    invoiceDetail?.booking_criteria?.dropoff_location ||
    "—";

  const passengerCount = 1 + (invoiceDetail?.guest_details?.length || 0);

  const hasMultiLocations =
    invoiceDetail?.transfer?.trip_type === "all-around" ||
    invoiceDetail?.transfer?.trip_type === "all-round" ||
    invoiceDetail?.transfer?.trip_type === "return";

  const hasCancel = Boolean(
    invoiceDetail?.cancellation_policies?.cancel_policy
  );
  const hasSpecial = Boolean(invoiceDetail?.special_request);

  const pad = (n) => String(n).padStart(2, "0");
  let stepN = 0;
  const step = {
    booking: pad(++stepN),
    transfer: pad(++stepN),
    multi: hasMultiLocations ? pad(++stepN) : null,
    vehicle: pad(++stepN),
    guests: pad(++stepN),
    pricing: pad(++stepN),
    cancel: hasCancel ? pad(++stepN) : null,
    special: hasSpecial ? pad(++stepN) : null,
    important: pad(++stepN),
  };

  const currency =
    invoiceDetail?.pricing?.currency ||
    invoiceDetail?.pricing?.display_currency ||
    "";

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.invoiceContainer}>
          <div className={styles.invoiceCard}>
            <HotelInvoiceLoader />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.invoiceContainer}>
          <div className={styles.errorCard}>
            <h5>{errorMessage}</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.invoiceContainer}>
        <main>
          <div ref={ref} id="invoice" className={styles.invoiceCard}>
            <div className={styles.invHeader}>
              <div className={styles.invHeaderBand}>
                <span className={styles.invHeaderCircle} aria-hidden="true" />
                <div className={styles.invHeaderBrand}>
                  <h2
                    className={`${styles.invHeaderDocTitle} ${merriweather.className}`}
                  >
                    Transfer Invoice
                  </h2>
                </div>
                <div className={styles.invHeaderContacts}>
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

              <div className={styles.invHeaderSub}>
                <div className={styles.invForBlock}>
                  <div className={styles.invForLabel}>INVOICE FOR</div>
                  <h1
                    className={`${styles.invGuestName} ${merriweather.className}`}
                  >
                    {leadName || "—"}
                  </h1>
                  <p className={styles.invForDesc}>
                    {[
                      transferTypeLabel || "Transfer Booking",
                      capitalize(invoiceDetail?.transfer?.vehicle_name),
                      `${passengerCount} Passenger${passengerCount > 1 ? "s" : ""}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className={styles.invMetaBlock}>
                  <div className={styles.invStatusRow}>
                    <span
                      className={`${styles.invStatusBadge} ${
                        invoiceDetail?.booking_status === "confirmed"
                          ? styles.statusConfirmed
                          : invoiceDetail?.booking_status === "cancelled"
                            ? styles.statusCancelled
                            : styles.statusPending
                      }`}
                    >
                      <FaCheckCircle size={12} />
                      {invoiceDetail?.booking_status
                        ? String(invoiceDetail.booking_status).toUpperCase()
                        : "—"}
                    </span>
                    {invoiceDetail?.payment_status && (
                      <span
                        className={`${styles.invStatusBadge} ${
                          styles[
                            `payment_${String(
                              invoiceDetail.payment_status
                            ).toLowerCase()}`
                          ] || styles.statusPending
                        }`}
                      >
                        {String(invoiceDetail.payment_status).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={styles.invBookingRef}>
                    Invoice Number: {invoiceDetail?.invoice_number || "—"}
                  </div>
                  <div className={styles.invBookingDate}>
                    Booking Date:{" "}
                    {invoiceDetail?.created_at
                      ? moment(invoiceDetail.created_at).format("DD-MM-YYYY")
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bodyInner}>
              {/* Booking By */}
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.booking}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Booking By
                  </h3>
                </div>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Full Name</span>
                    <span className={styles.detailValue}>{leadName || "—"}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>
                      {lead?.email || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValue}>
                      {lead?.phone_number || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Gender</span>
                    <span className={styles.detailValue}>
                      {capitalize(lead?.gender) || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Country</span>
                    <span className={styles.detailValue}>
                      {lead?.country || "—"}
                    </span>
                  </div>
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
                        {invoiceDetail?.booking_criteria?.pickup_date
                          ? moment(
                              invoiceDetail.booking_criteria.pickup_date
                            ).format("DD MMM YYYY")
                          : "—"}
                        {invoiceDetail?.booking_criteria?.pickup_time &&
                          ` · ${moment(
                            invoiceDetail.booking_criteria.pickup_time,
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
                      {invoiceDetail?.booking_criteria?.dropoff_date && (
                        <p className={styles.routeTime}>
                          {moment(
                            invoiceDetail.booking_criteria.dropoff_date
                          ).format("DD MMM YYYY")}
                          {invoiceDetail?.booking_criteria?.dropoff_time &&
                            ` · ${moment(
                              invoiceDetail.booking_criteria.dropoff_time,
                              "HH:mm:ss"
                            ).format("hh:mm A")}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {invoiceDetail?.flight_number && (
                    <div className={styles.flightChip}>
                      Flight Number: {invoiceDetail.flight_number}
                    </div>
                  )}
                </div>
              </section>

              {/* Multiple Locations */}
              {hasMultiLocations &&
                invoiceDetail?.transfer?.locations?.length > 0 && (
                  <section className={styles.detailCard}>
                    <div className={styles.detailCardHead}>
                      <span className={styles.detailStep}>{step.multi}</span>
                      <h3
                        className={`${styles.detailCardTitle} ${merriweather.className}`}
                      >
                        Multiple Locations
                      </h3>
                    </div>

                    {invoiceDetail.transfer.locations.map((location, index) => (
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
                              {invoiceDetail?.transfer?.trip_type === "return"
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
                      {capitalize(invoiceDetail?.selected_transfers?.vehicle?.name) || "—"}
                    </h4>
                    <div className={styles.vehicleGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Quantity</span>
                        <span className={styles.stayValue}>
                          {invoiceDetail?.booked_qty || "—"}
                          {invoiceDetail?.booked_qty
                            ? ` × ${currency} ${PerTransferPrice(
                                invoiceDetail?.pricing?.amount_after_exchange,
                                invoiceDetail?.booked_qty
                              )}`
                            : ""}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Transfer Type</span>
                        <span className={styles.stayValue}>
                          {capitalize(invoiceDetail?.selected_transfers?.trip_type) ||
                            "—"}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>
                          Passenger Capacity
                        </span>
                        <span className={styles.stayValue}>
                          {invoiceDetail?.vehicle_details?.passenger_capacity ||
                            "N/A"}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>
                          Luggage Capacity
                        </span>
                        <span className={styles.stayValue}>
                          {invoiceDetail?.vehicle_details?.luggage_capacity ||
                            "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Passenger Details */}
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
                        <span className={styles.guestGender}>
                          {lead.country}
                        </span>
                      )}
                      <span className={styles.guestType}>Lead</span>
                    </div>
                  </div>

                  {invoiceDetail?.guest_details?.map((guest, index) => (
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

              {/* Payment Summary */}
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.pricing}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Payment Summary
                  </h3>
                </div>

                <div className={styles.priceSummary}>
                  <div className={styles.priceSummaryRow}>
                    <span>Subtotal</span>
                    <span>
                      {currency}{" "}
                      {invoiceDetail?.pricing?.amount_after_exchange ?? "0.00"}
                    </span>
                  </div>
                  <p className={styles.priceVatNote}>Included VAT and Taxes</p>
                </div>

                <div className={styles.totalAmountBar}>
                  <span>Total Amount</span>
                  <span className={styles.totalAmountValue}>
                    {currency}{" "}
                    {invoiceDetail?.pricing?.amount_after_exchange ?? "0.00"}
                  </span>
                </div>
              </section>

              {/* Cancellation Policy */}
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

                  {invoiceDetail.cancellation_policies.cancel_policy ===
                  "refundable" ? (
                    invoiceDetail.cancellation_policies.policies?.length > 0 ? (
                      <ul className={styles.cancelList}>
                        {invoiceDetail.cancellation_policies.policies.map(
                          (policy, idx) => (
                            <li key={idx}>
                              If cancelled from{" "}
                              <strong>
                                {moment(policy.from).format("DD MMM YYYY")}
                              </strong>
                              , a cancellation fee of{" "}
                              <strong>
                                {invoiceDetail?.pricing?.display_currency ||
                                  currency}{" "}
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
                      This transfer is non-refundable. No refund will be issued
                      in case of cancellation.
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
                    {invoiceDetail.special_request}
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
                    Please be ready at the pickup location at least 15 minutes
                    before the scheduled pickup time.
                  </li>
                  <li>
                    Ensure your contact details are accurate so the driver can
                    reach you.
                  </li>
                  <li>
                    The driver will wait up to 30 minutes after the scheduled
                    pickup time.
                  </li>
                  <li>
                    Luggage allowance is subject to the vehicle capacity
                    confirmed at the time of booking.
                  </li>
                  <li>
                    This booking confirmation is non-transferable and must be
                    presented to the driver.
                  </li>
                  <li>
                    This is an electronic confirmation. No paper copy is
                    required.
                  </li>
                  <li>
                    This is a computer-generated invoice and does not require
                    any physical signature.
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
              Print Invoice
            </button>
            <Link
              href={`/transfers/voucher/${invoiceDetail?.invoice_number || id}`}
              className={styles.btnVoucher}
            >
              View Voucher
            </Link>
            <Link href="/" className={styles.btnHome}>
              Go to Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
