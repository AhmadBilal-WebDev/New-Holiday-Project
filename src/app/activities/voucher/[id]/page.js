"use client";
import styles from "./voucher.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ActivityVoucherLoader from "@/components/Loader/ActivityVoucherLoader";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";
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

  const handlePrint = () => window.print();
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

  const headerImage =
    voucherDetail?.client?.client_images?.header_image ||
    voucherDetail?.client?.header_image;
  const footerImage =
    voucherDetail?.client?.client_images?.footer_image ||
    voucherDetail?.client?.footer_image;

  const activityTitle = voucherDetail?.activity?.title || "Activity Booking";
  const headerDesc = (() => {
    const packageLabel =
      modalityName &&
      modalityName.trim().toLowerCase() !== activityTitle.trim().toLowerCase()
        ? modalityName
        : "";
    return [activityTitle, packageLabel].filter(Boolean).join(" · ");
  })();

  const hasRemarks = contractRemarkItems.length > 0;
  const hasServices = voucherDetail?.additional_services?.length > 0;
  const hasSpecial = Boolean(voucherDetail?.special_request);
  const hasCancel = Boolean(cancellationPolicy);
  const pad = (n) => String(n).padStart(2, "0");
  let n = 0;
  const step = {
    details: pad(++n),
    activity: pad(++n),
    guests: pad(++n),
    services: hasServices ? pad(++n) : null,
    special: hasSpecial ? pad(++n) : null,
    remarks: hasRemarks ? pad(++n) : null,
    cancel: hasCancel ? pad(++n) : null,
    important: pad(++n),
  };

  if (isLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.voucherContainer}>
          <div className={styles.voucherCard}>
            <ActivityVoucherLoader />
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
          {/* {headerImage && (
            <div className={styles.brandImageWrap}>
              <Image
                src={headerImage}
                height={150}
                width={1000}
                className={styles.brandImage}
                quality={100}
                alt="Company Header"
              />
            </div>
          )} */}

          <div className={styles.vchHeader}>
            <div className={styles.vchHeaderBand}>
              <span className={styles.vchHeaderCircle} aria-hidden="true" />
              <div className={styles.vchHeaderBrand}>
                <h2
                  className={`${styles.vchHeaderDocTitle} ${merriweather.className}`}
                >
                  Activity Booking Voucher
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
                    {voucherDetail?.lead_title} {voucherDetail?.lead_first_name}{" "}
                    {voucherDetail?.lead_last_name}
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
                  {voucherDetail?.provider_reference && (
                    <div className={styles.vchBookingDate}>
                      Provider Ref: {voucherDetail.provider_reference}
                    </div>
                  )}
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
                    Scan this QR code to verify your activity booking voucher
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bodyInner}>
            {/* 01 Voucher Details */}
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
                  <span className={styles.detailLabel}>Voucher No</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.booking_reference || "—"}
                  </span>
                </div>
                {voucherDetail?.provider_reference && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Provider Ref</span>
                    <span className={styles.detailValue}>
                      {voucherDetail.provider_reference}
                    </span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lead Passenger</span>
                  <span className={styles.detailValue}>
                    {voucherDetail?.lead_title} {voucherDetail?.lead_first_name}{" "}
                    {voucherDetail?.lead_last_name}
                  </span>
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

              <div className={styles.hotelCard}>
                <div className={styles.hotelCardHead}>
                  <div className={styles.hotelCardTop}>
                    <h4 className={styles.hotelName}>{activityTitle}</h4>
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
                            <FaRegStar
                              key={index}
                              className={styles.starMuted}
                            />
                          );
                        })}
                        <span className={styles.ratingValue}>
                          (
                          {Number(voucherDetail.activity.rating_stars).toFixed(
                            1
                          )}
                          )
                        </span>
                      </div>
                    )}
                  </div>

                  {meetingPoint && (
                    <p className={styles.activityAddress}>
                      <FaLocationDot size={12} />
                      <span>{meetingPoint}</span>
                    </p>
                  )}
                  {String(voucherDetail?.activity?.address || "").trim() && (
                    <p className={styles.activityAddress}>
                      <FaLocationDot size={12} />
                      <span>{voucherDetail.activity.address}</span>
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
                              "DD-MM-YYYY"
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Day</span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.travel_date
                          ? moment(voucherDetail.travel_date).format("dddd")
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
                      <span className={styles.detailLabel}>Adults</span>
                      <span className={styles.stayValue}>
                        {voucherDetail?.adults || 0}
                      </span>
                    </div>
                    {childrenAgeSummary.map((item, index) => (
                      <div key={index} className={styles.detailItem}>
                        <span className={styles.detailLabel}>{item.label}</span>
                        <span className={styles.stayValue}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 03 Guests */}
            <section className={styles.detailCard}>
              <div className={styles.detailCardHead}>
                <span className={styles.detailStep}>{step.guests}</span>
                <h3
                  className={`${styles.detailCardTitle} ${merriweather.className}`}
                >
                  Guest Information
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
                    <div key={`adult-${index}`} className={styles.guestRow}>
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

            {hasRemarks && (
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
                  {contractRemarkItems.map((item, index) => (
                    <div key={index} className={styles.infoItem}>
                      <span className={styles.detailLabel}>
                        {item.label || "Note"}
                      </span>
                      <p className={styles.infoBlockText}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                {renderCancellationPolicyContent()}
              </section>
            )}

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
                  Please present this voucher on arrival at the activity
                  location.
                </li>
                <li>
                  Arrive at least 15 minutes before the scheduled activity start
                  time.
                </li>
                <li>
                  Valid passport or photo ID must be presented at check-in.
                </li>
                <li>
                  This voucher is valid only for the specified dates, passenger,
                  and activity.
                </li>
                <li>
                  Activity schedules are subject to weather conditions and
                  operator availability.
                </li>
                <li>
                  This is a computer-generated confirmation and does not require
                  a physical signature.
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

          {/* {footerImage && (
            <div className={styles.brandImageWrap}>
              <Image
                src={footerImage}
                height={150}
                width={1000}
                className={styles.brandImage}
                quality={100}
                alt="Company Footer"
              />
            </div>
          )} */}
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
            href={`/activities/invoice/${voucherDetail?.booking_reference || id}`}
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
