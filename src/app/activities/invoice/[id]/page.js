"use client";
import styles from "./invoice.module.css";
import moment from "moment";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ActivityInvoiceLoader from "@/components/Loader/ActivityInvoiceLoader";
import {
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaRegStar,
  FaStar,
  FaStarHalfAlt,
} from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
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

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/activities/booking/${id}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await responses.json();
      setIsLoading(false);
      if (res.Success) {
        setVoucherDetail(res?.Content?.booking);
      } else {
        setErrorMessage(res?.message);
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error fetching activity details:", err);
    }
  };

  function capitalize(text) {
    if (!text) return "";
    return String(text).charAt(0).toUpperCase() + String(text).slice(1);
  }

  function hasGuestName(guest) {
    return Boolean(
      String(guest?.first_name || "").trim() ||
        String(guest?.last_name || "").trim()
    );
  }

  function formatChildUnderLabel(age) {
    if (age == null || age === "") return "Child";
    return `Children (under ${age})`;
  }

  function getNamedChildren() {
    return (voucherDetail?.other_passengers?.children_details || []).filter(
      hasGuestName
    );
  }

  function getChildrenAgeSummary() {
    const details = voucherDetail?.other_passengers?.children_details || [];
    if (!details.length) {
      const count = Number(voucherDetail?.children || 0);
      return count > 0 ? [{ label: "Children", count }] : [];
    }
    const counts = {};
    details.forEach((child) => {
      const label = formatChildUnderLabel(child?.age);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }

  function getModalityName() {
    return (
      voucherDetail?.modality?.name ||
      voucherDetail?.voucher?.modality?.name ||
      ""
    );
  }

  function getStartTime() {
    const modalityName = getModalityName();
    const timeMatch = String(modalityName).match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const parsed = moment(timeMatch[1], ["HH:mm", "H:mm"], true);
      if (parsed.isValid()) return parsed.format("hh:mm A");
    }
    return "";
  }

  function getLanguageLabel() {
    const langs =
      voucherDetail?.languages || voucherDetail?.voucher?.languages || [];
    if (!langs.length) {
      const modalityName = getModalityName().toLowerCase();
      if (modalityName.includes("english") || modalityName.includes("eng"))
        return "English";
      return "";
    }
    return langs
      .map((l) =>
        l.description ||
        (l.code === "en" ? "English" : String(l.code || "").toUpperCase())
      )
      .filter(Boolean)
      .join(", ");
  }

  function getCancellationPolicy() {
    return (
      voucherDetail?.cancellation_policy ||
      voucherDetail?.cancellation_policies ||
      voucherDetail?.activity?.cancellation_policy ||
      null
    );
  }

  function getCancellationPoliciesList(policyWrapper) {
    if (!policyWrapper) return [];
    if (Array.isArray(policyWrapper?.cancellation_policies))
      return policyWrapper.cancellation_policies;
    if (Array.isArray(policyWrapper)) return policyWrapper;
    return [];
  }

  function parseContractRemarks() {
    const remarks =
      voucherDetail?.contract_remarks ||
      voucherDetail?.voucher?.contract_remarks ||
      voucherDetail?.voucher?.comments ||
      [];
    const text = remarks.map((r) => r?.text).filter(Boolean).join(" ");
    if (!text.trim()) return [];

    return text
      .split("//")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const sepIdx = part.indexOf(":");
        if (sepIdx === -1) return { label: "", value: part };
        return {
          label: part.slice(0, sepIdx).trim(),
          value: part.slice(sepIdx + 1).trim(),
        };
      })
      .filter((item) => item.value);
  }

  const SUPPLIER_REMARK_LABELS = [
    "supplier name",
    "supplier emergency phone",
    "supplier",
    "voucher type",
    "meeting point instructions",
    "start/opening time",
    "end/closing time",
  ];

  function getVisibleContractRemarks() {
    return parseContractRemarks().filter(
      (item) =>
        !SUPPLIER_REMARK_LABELS.includes(String(item.label || "").toLowerCase())
    );
  }

  function convertToCustomerCurrency(price) {
    if (price == null || price === "") return Number(0).toFixed(2);
    if (!voucherDetail.customer_exchange_rate)
      return Number(price || 0).toFixed(2);
    if (voucherDetail.currency_code === voucherDetail.customer_currency)
      return Number(price).toFixed(2);
    return (
      Number(price) * Number(voucherDetail.customer_exchange_rate)
    ).toFixed(2);
  }

  function getTotalPassengers() {
    const parts = [];
    const adults = Number(voucherDetail?.adults || 0);
    if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? "s" : ""}`);
    getChildrenAgeSummary().forEach((item) => {
      parts.push(`${item.count} ${item.label}`);
    });
    return parts.join(", ");
  }

  function formatRemarkValue(value) {
    const text = String(value || "").trim();
    if (!text) return [];

    const protectedText = text.replace(
      /\b(Min|Max|No|Nos|Dr|Mr|Mrs|Ms|Jr|Sr|vs|approx|kg|lbs?)\.\s+/gi,
      "$1.\u00A0"
    );

    const parts = protectedText
      .split(/\.\s+/)
      .map((part) => part.trim().replace(/\u00A0/g, " ").replace(/\.$/, ""))
      .filter(Boolean);

    const merged = [];
    for (let i = 0; i < parts.length; i++) {
      let current = parts[i];
      while (i + 1 < parts.length && current.length <= 4) {
        i += 1;
        current = `${current}. ${parts[i]}`;
      }
      merged.push(current.endsWith(".") ? current : `${current}.`);
    }

    return merged;
  }

  function isLongRemark(item) {
    const value = String(item?.value || "");
    const label = String(item?.label || "").toLowerCase();
    const longLabels = [
      "mandatory instructions",
      "recommendations",
      "voucher type",
      "inclusions",
    ];
    return (
      value.length > 70 ||
      longLabels.includes(label) ||
      formatRemarkValue(value).length > 1
    );
  }

  function renderCancellationPolicyContent() {
    const policyWrapper = getCancellationPolicy();
    if (!policyWrapper) return null;

    const cancelPolicy = policyWrapper.cancel_policy || "refundable";
    const policies = getCancellationPoliciesList(policyWrapper);

    if (cancelPolicy === "non-refundable") {
      return (
        <span className={styles.nonRefundable}>
          This booking is non-refundable. No refund will be issued for
          cancellations.
        </span>
      );
    }

    if (!policies.length) {
      return (
        <p className={styles.policyNote}>
          This booking is refundable. Please contact support for cancellation
          terms.
        </p>
      );
    }

    return (
      <ul className={styles.cancelList}>
        {policies.map((policy, i) => {
          const fromDate = policy.from || policy.dateFrom;
          const amount = policy.amount ?? policy.value ?? policy.original_amount;
          const dateLabel = fromDate
            ? moment(fromDate).format("D MMM YYYY")
            : null;

          if (fromDate || amount != null) {
            return (
              <li key={i}>
                {dateLabel ? (
                  <>
                    Free cancellation before <strong>{dateLabel}</strong>.
                    {Number(amount) > 0 && (
                      <>
                        {" "}
                        On or after this date, a cancellation fee of{" "}
                        <strong>
                          {voucherDetail.customer_currency}{" "}
                          {convertToCustomerCurrency(amount)}
                        </strong>{" "}
                        will apply.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    A cancellation fee of{" "}
                    <strong>
                      {voucherDetail.customer_currency}{" "}
                      {convertToCustomerCurrency(amount)}
                    </strong>{" "}
                    may apply.
                  </>
                )}
              </li>
            );
          }

          if (policy.time_duration != null) {
            return (
              <li key={i}>
                If cancelled <strong>{policy.time_duration} hours</strong> before
                departure, a{" "}
                {policy.type === "percentage" ? (
                  <>
                    <strong>{policy.value}%</strong> cancellation charge
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
            );
          }

          return null;
        })}
      </ul>
    );
  }

  const contractRemarkItems = getVisibleContractRemarks();
  const startTime = getStartTime();
  const languageLabel = getLanguageLabel();
  const modalityName = getModalityName();
  const cancellationPolicy = getCancellationPolicy();
  const allContractRemarks = parseContractRemarks();
  const durationFromRemarks = allContractRemarks.find(
    (item) => String(item.label).toLowerCase() === "duration"
  )?.value;
  const meetingPoint = allContractRemarks.find(
    (item) => String(item.label).toLowerCase() === "meeting point"
  )?.value;
  const childrenAgeSummary = getChildrenAgeSummary();

  const leadPhone = `${voucherDetail?.lead_phone_code || ""} ${
    voucherDetail?.lead_phone || ""
  }`.trim();

  const hasRemarks = contractRemarkItems.length > 0;
  const hasSpecial = Boolean(voucherDetail?.special_request);
  const hasCancel = Boolean(cancellationPolicy);
  const pad = (n) => String(n).padStart(2, "0");
  let n = 0;
  const step = {
    booking: pad(++n),
    activity: pad(++n),
    guests: pad(++n),
    remarks: hasRemarks ? pad(++n) : null,
    pricing: pad(++n),
    special: hasSpecial ? pad(++n) : null,
    cancel: hasCancel ? pad(++n) : null,
    important: pad(++n),
  };

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.invoiceContainer}>
          <div className={styles.invoiceCard}>
            <ActivityInvoiceLoader />
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
            {/* Header */}
            <div className={styles.invHeader}>
              <div className={styles.invHeaderBand}>
                <span className={styles.invHeaderCircle} aria-hidden="true" />
                <div className={styles.invHeaderBrand}>
                  <h2
                    className={`${styles.invHeaderDocTitle} ${merriweather.className}`}
                  >
                    Activity Invoice
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
                    {voucherDetail?.lead_title} {voucherDetail?.lead_first_name}{" "}
                    {voucherDetail?.lead_last_name}
                  </h1>
                  <p className={styles.invForDesc}>
                    {(() => {
                      const title =
                        voucherDetail?.activity?.title || "Activity Booking";
                      const packageLabel =
                        modalityName &&
                        modalityName.trim().toLowerCase() !==
                          title.trim().toLowerCase()
                          ? modalityName
                          : "";
                      return [title, packageLabel].filter(Boolean).join(" · ");
                    })()}
                  </p>
                </div>

                <div className={styles.invMetaBlock}>
                  <div className={styles.invStatusRow}>
                    <span
                      className={`${styles.invStatusBadge} ${
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
                        className={`${styles.invStatusBadge} ${
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
                  <div className={styles.invBookingRef}>
                    Booking Ref: {voucherDetail?.booking_reference || "—"}
                  </div>
                  {voucherDetail?.provider_reference && (
                    <div className={styles.invBookingDate}>
                      Provider Ref: {voucherDetail.provider_reference}
                    </div>
                  )}
                  <div className={styles.invBookingDate}>
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
            </div>

            <div className={styles.bodyInner}>
              {/* 01 Booking By */}
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
                    <span className={styles.detailValue}>
                      {voucherDetail?.lead_title}{" "}
                      {voucherDetail?.lead_first_name}{" "}
                      {voucherDetail?.lead_last_name}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>
                      {voucherDetail?.lead_email || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValue}>
                      {leadPhone || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Gender</span>
                    <span className={styles.detailValue}>
                      {capitalize(voucherDetail?.lead_gender) || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Country</span>
                    <span className={styles.detailValue}>
                      {voucherDetail?.lead_country || "—"}
                    </span>
                  </div>
                  {voucherDetail?.lead_address && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Address</span>
                      <span className={styles.detailValue}>
                        {voucherDetail.lead_address}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* 02 Activity Details */}
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.activity}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Activity Details
                  </h3>
                </div>

                <div className={styles.activityCard}>
                  <div className={styles.activityCardHead}>
                    <div className={styles.activityCardTop}>
                      <h4 className={styles.activityName}>
                        {voucherDetail?.activity?.title || "—"}
                      </h4>
                      {Number(voucherDetail?.activity?.rating_stars) > 0 && (
                        <div className={styles.ratingRow}>
                          {Array.from({ length: 5 }).map((_, index) => {
                            const rating = Number(
                              voucherDetail.activity.rating_stars
                            );
                            const fullStars = Math.floor(rating);
                            const hasHalfStar = rating - fullStars >= 0.5;
                            if (index < fullStars)
                              return (
                                <FaStar key={index} className={styles.star} />
                              );
                            if (index === fullStars && hasHalfStar)
                              return (
                                <FaStarHalfAlt
                                  key={index}
                                  className={styles.star}
                                />
                              );
                            return (
                              <FaRegStar key={index} className={styles.starMuted} />
                            );
                          })}
                          <span className={styles.ratingValue}>
                            ({Number(voucherDetail.activity.rating_stars).toFixed(1)})
                          </span>
                        </div>
                      )}
                    </div>

                    {(meetingPoint ||
                      String(voucherDetail?.activity?.address || "").trim()) && (
                      <p className={styles.activityAddress}>
                        <FaLocationDot size={12} />
                        <span>
                          {meetingPoint || voucherDetail.activity.address}
                        </span>
                      </p>
                    )}

                    <div className={styles.stayGrid}>
                      {modalityName && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Package</span>
                          <span className={styles.stayValue}>{modalityName}</span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Activity Date</span>
                        <span className={styles.stayValue}>
                          {voucherDetail?.travel_date
                            ? moment(voucherDetail.travel_date).format(
                                "DD-MM-YYYY dddd"
                              )
                            : "—"}
                        </span>
                      </div>
                      {startTime && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Start Time</span>
                          <span className={styles.stayValue}>{startTime}</span>
                        </div>
                      )}
                      {languageLabel && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Language</span>
                          <span className={styles.stayValue}>
                            {languageLabel}
                          </span>
                        </div>
                      )}
                      {(voucherDetail?.activity?.activity_duration ||
                        durationFromRemarks) && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Duration</span>
                          <span className={styles.stayValue}>
                            {voucherDetail?.activity?.activity_duration ||
                              durationFromRemarks}
                          </span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Travelers</span>
                        <span className={styles.stayValue}>
                          {getTotalPassengers() || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 03 Guest Details */}
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.guests}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Guest Details
                  </h3>
                </div>
                <div className={styles.guestList}>
                  <div className={styles.guestRow}>
                    <div className={styles.guestLeft}>
                      <span className={styles.guestIndex}>1</span>
                      <div className={styles.guestInfo}>
                        <span className={styles.guestName}>
                          {voucherDetail?.lead_title}{" "}
                          {voucherDetail?.lead_first_name}{" "}
                          {voucherDetail?.lead_last_name}
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
                  </div>

                  {voucherDetail?.other_passengers?.additional_adults?.map(
                    (adult, index) => (
                      <div
                        key={`adult-${index}`}
                        className={styles.guestRow}
                      >
                        <div className={styles.guestLeft}>
                          <span className={styles.guestIndex}>{index + 2}</span>
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

                  {getNamedChildren().map((child, index) => (
                    <div key={`child-${index}`} className={styles.guestRow}>
                      <div className={styles.guestLeft}>
                        <span className={styles.guestIndex}>
                          {(voucherDetail?.other_passengers?.additional_adults
                            ?.length || 0) +
                            index +
                            2}
                        </span>
                        <div className={styles.guestInfo}>
                          <span className={styles.guestName}>
                            {child.first_name} {child.last_name}
                          </span>
                          <span className={styles.guestSub}>
                            {formatChildUnderLabel(child.age)}
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
                  ))}
                </div>
              </section>

              {/* Activity Information */}
              {contractRemarkItems.length > 0 && (
                <section className={styles.detailCard}>
                  <div className={styles.detailCardHead}>
                    <span className={styles.detailStep}>{step.remarks}</span>
                    <h3
                      className={`${styles.detailCardTitle} ${merriweather.className}`}
                    >
                      Activity Information
                    </h3>
                  </div>
                  <div className={styles.infoList}>
                    {contractRemarkItems.map((item, index) => {
                      const longRemark = isLongRemark(item);
                      const points = formatRemarkValue(item.value);
                      return (
                        <div key={index} className={styles.infoItem}>
                          <span className={styles.detailLabel}>
                            {item.label || "Note"}
                          </span>
                          {longRemark && points.length > 1 ? (
                            <ul className={styles.infoBlockList}>
                              {points.map((point, pointIndex) => (
                                <li key={pointIndex}>{point}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.infoBlockText}>{item.value}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Pricing Details */}
              <section className={styles.detailCard}>
                <div className={styles.detailCardHead}>
                  <span className={styles.detailStep}>{step.pricing}</span>
                  <h3
                    className={`${styles.detailCardTitle} ${merriweather.className}`}
                  >
                    Pricing Details
                  </h3>
                </div>

                <div className={styles.priceTable}>
                  <div className={`${styles.priceRow} ${styles.priceHead}`}>
                    <span>Traveler Type</span>
                    <span>Qty × Unit</span>
                    <span>Total</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.priceType}>
                      Adult{Number(voucherDetail?.adults) !== 1 ? "s" : ""}
                    </span>
                    <span className={styles.priceQty}>
                      {voucherDetail?.adults} × {voucherDetail?.customer_currency}{" "}
                      {convertToCustomerCurrency(
                        voucherDetail?.activity?.sale_price
                      )}
                    </span>
                    <span className={styles.priceTotal}>
                      {voucherDetail?.customer_currency}{" "}
                      {convertToCustomerCurrency(voucherDetail?.adult_price)}
                    </span>
                  </div>
                  {Number(voucherDetail?.children) > 0 &&
                    (childrenAgeSummary.length > 0 ? (
                      childrenAgeSummary.map((item, index) => (
                        <div
                          key={`child-price-${index}`}
                          className={styles.priceRow}
                        >
                          <span className={styles.priceType}>{item.label}</span>
                          <span className={styles.priceQty}>
                            {item.count} × {voucherDetail?.customer_currency}{" "}
                            {convertToCustomerCurrency(
                              voucherDetail?.activity?.child_sale_price
                            )}
                          </span>
                          <span className={styles.priceTotal}>
                            {voucherDetail?.customer_currency}{" "}
                            {convertToCustomerCurrency(
                              Number(
                                voucherDetail?.activity?.child_sale_price || 0
                              ) * Number(item.count)
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className={styles.priceRow}>
                        <span className={styles.priceType}>
                          Child
                          {Number(voucherDetail?.children) !== 1 ? "ren" : ""}
                        </span>
                        <span className={styles.priceQty}>
                          {voucherDetail?.children} ×{" "}
                          {voucherDetail?.customer_currency}{" "}
                          {convertToCustomerCurrency(
                            voucherDetail?.activity?.child_sale_price
                          )}
                        </span>
                        <span className={styles.priceTotal}>
                          {voucherDetail?.customer_currency}{" "}
                          {convertToCustomerCurrency(voucherDetail?.child_price)}
                        </span>
                      </div>
                    ))}
                </div>

                {voucherDetail?.additional_services?.length > 0 && (
                  <div className={styles.extraServices}>
                    <p className={styles.extraTitle}>Additional Services</p>
                    {voucherDetail.additional_services.map((item, index) => (
                      <div key={index} className={styles.priceRow}>
                        <span className={styles.priceType}>{item.name}</span>
                        <span className={styles.priceQty}>
                          {item.quantity} × {voucherDetail?.customer_currency}{" "}
                          {convertToCustomerCurrency(item?.price)}
                        </span>
                        <span className={styles.priceTotal}>
                          {voucherDetail?.customer_currency}{" "}
                          {convertToCustomerCurrency(item?.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.priceSummary}>
                  <div className={styles.priceSummaryRow}>
                    <span>Sub Total</span>
                    <span>
                      {voucherDetail?.customer_currency}{" "}
                      {voucherDetail?.customer_total}
                    </span>
                  </div>
                  <p className={styles.priceVatNote}>Included VAT and Taxes</p>
                </div>

                <div className={styles.totalAmountBar}>
                  <span>Total Amount</span>
                  <span className={styles.totalAmountValue}>
                    {voucherDetail?.customer_currency}{" "}
                    {voucherDetail?.customer_total}
                  </span>
                </div>
              </section>

              {voucherDetail?.special_request && (
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

              {cancellationPolicy && (
                <section className={styles.detailCard}>
                  <div className={styles.detailCardHead}>
                    <span className={styles.detailStep}>{step.cancel}</span>
                    <h3
                      className={`${styles.detailCardTitle} ${merriweather.className}`}
                    >
                      Cancellation Policy
                    </h3>
                  </div>
                  {renderCancellationPolicyContent()}
                </section>
              )}

              {/* Important Information */}
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
                    Please present this invoice on arrival at the activity
                    location.
                  </li>
                  <li>
                    Arrive at least 15 minutes before the scheduled activity
                    start time.
                  </li>
                  <li>
                    Valid passport or photo ID must be presented at check-in.
                  </li>
                  <li>
                    This invoice is valid only for the specified dates,
                    passenger, and activity.
                  </li>
                  <li>
                    Activity schedules are subject to weather conditions and
                    operator availability.
                  </li>
                  <li>
                    The invoice displays the complete pricing details inclusive
                    of all applicable taxes.
                  </li>
                  <li>
                    This is a computer-generated receipt and does not require
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
              href={`/activities/voucher/${voucherDetail?.booking_reference}`}
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
