"use client";
import styles from "./Voucher.module.css";
import moment from "moment";
import Image from "next/image";
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
} from "react-icons/fa";
import { Merriweather } from "next/font/google";

const merriweather = Merriweather({
    subsets: ["latin"],
    weight: ["700"],
    style: ["normal", "italic"],
    display: "swap",
});

const Page = () => {
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
                `${process.env.NEXT_PUBLIC_API_URL}/api/hotel/booking/details`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invoice_number: id }),
                }
            );
            const res = await responses.json();
            setIsLoading(false);
            if (res.success) {
                const nights = moment(res?.data?.check_out).diff(
                    moment(res?.data?.check_in),
                    "days"
                );
                res.data.nights = nights;
                setVoucherDetail(res?.data);
            } else {
                setErrorMessage(res?.message);
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching hotel details:", err);
        }
    };

    function convertToCustomerCurrency(price) {
        if (!price || !voucherDetail.pricing?.supplier_to_display_rate)
            return Number(price || 0).toFixed(2);
        if (
            voucherDetail.currency_code ===
            voucherDetail.pricing?.display_currency
        ) {
            return Number(price).toFixed(2);
        }
        const convertedPrice =
            Number(price) *
            Number(voucherDetail.pricing?.supplier_to_display_rate);
        return convertedPrice.toFixed(2);
    }

    const handleDownload = () => window.print();

    const nights =
        voucherDetail?.nights ??
        (voucherDetail?.check_in && voucherDetail?.check_out
            ? moment(voucherDetail.check_out).diff(
                  moment(voucherDetail.check_in),
                  "days"
              )
            : null);

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.voucherContainer}>
                {isLoading ? (
                    <div className={styles.voucherCard}>
                        <HotelVoucherLoader />
                    </div>
                ) : errorMessage ? (
                    <div className={styles.errorCard}>
                        <IoWarningOutline className={styles.errorIcon} size={96} />
                        <h5 className={styles.errorText}>{errorMessage}</h5>
                    </div>
                ) : (
                    <>
                        <div ref={ref} id="voucher" className={styles.voucherCard}>
                            {/* {voucherDetail?.client?.header_image && (
                                <div className={styles.brandImageWrap}>
                                    <Image
                                        src={voucherDetail.client.header_image}
                                        height={150}
                                        width={1000}
                                        className={styles.brandImage}
                                        quality={100}
                                        alt="Company Header"
                                    />
                                </div>
                            )} */}

                            {/* ── Header ── */}
                            <div className={styles.vchHeader}>
                                <div className={styles.vchHeaderBand}>
                                    <span
                                        className={styles.vchHeaderCircle}
                                        aria-hidden="true"
                                    />
                                    <div className={styles.vchHeaderBrand}>
                                        <h2
                                            className={`${styles.vchHeaderDocTitle} ${merriweather.className}`}
                                        >
                                            Hotel Booking Voucher
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
                                            <div className={styles.vchForLabel}>
                                                VOUCHER FOR
                                            </div>
                                            <h1
                                                className={`${styles.vchGuestName} ${merriweather.className}`}
                                            >
                                                {voucherDetail?.holder_details?.title
                                                    ? `${voucherDetail.holder_details.title} `
                                                    : ""}
                                                {voucherDetail?.holder_details?.name}{" "}
                                                {voucherDetail?.holder_details?.surname}
                                            </h1>
                                            <p className={styles.vchForDesc}>
                                                {voucherDetail?.hotel_details?.name ||
                                                    "Hotel Booking"}
                                                {nights
                                                    ? ` · ${nights} ${
                                                          nights > 1
                                                              ? "Nights"
                                                              : "Night"
                                                      }`
                                                    : ""}
                                                {voucherDetail?.hotel_details
                                                    ?.destinationName
                                                    ? ` · ${voucherDetail.hotel_details.destinationName}`
                                                    : ""}
                                            </p>
                                        </div>

                                        <div className={styles.vchMetaBlock}>
                                            <div className={styles.vchStatusRow}>
                                                <span
                                                    className={`${styles.vchStatusBadge} ${
                                                        voucherDetail?.booking_status ===
                                                        "confirmed"
                                                            ? styles.statusConfirmed
                                                            : voucherDetail?.booking_status ===
                                                                "cancelled"
                                                              ? styles.statusCancelled
                                                              : styles.statusPending
                                                    }`}
                                                >
                                                    <FaCheckCircle size={12} />
                                                    {voucherDetail?.booking_status
                                                        ? voucherDetail.booking_status
                                                              .charAt(0)
                                                              .toUpperCase() +
                                                          voucherDetail.booking_status.slice(
                                                              1
                                                          )
                                                        : "—"}
                                                </span>
                                                {voucherDetail?.payment_status && (
                                                    <span
                                                        className={`${styles.vchStatusBadge} ${
                                                            styles[
                                                                `payment_${voucherDetail.payment_status.toLowerCase()}`
                                                            ] || styles.statusPending
                                                        }`}
                                                    >
                                                        {voucherDetail.payment_status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            voucherDetail.payment_status.slice(
                                                                1
                                                            )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.vchBookingRef}>
                                                Booking Ref:{" "}
                                                {voucherDetail?.booking_reference ||
                                                    voucherDetail?.invoice_number}
                                            </div>
                                            <div className={styles.vchBookingDate}>
                                                Booking Date:{" "}
                                                {voucherDetail?.created_at
                                                    ? moment(
                                                          voucherDetail.created_at
                                                      ).format("DD-MM-YYYY")
                                                    : "—"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR — voucher-only extra */}
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
                                            <span className={styles.qrTitle}>
                                                Verify Booking
                                            </span>
                                            <span className={styles.qrLabel}>
                                                Scan this QR code to verify your
                                                hotel booking voucher
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.bodyInner}>
                                {/* ── 01 Voucher Details ── */}
                                <section className={styles.detailCard}>
                                    <div className={styles.detailCardHead}>
                                        <span className={styles.detailStep}>01</span>
                                        <h3
                                            className={`${styles.detailCardTitle} ${merriweather.className}`}
                                        >
                                            Voucher Details
                                        </h3>
                                    </div>
                                    <div className={styles.detailGrid}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>
                                                Voucher No
                                            </span>
                                            <span className={styles.detailValue}>
                                                {voucherDetail?.invoice_number || "—"}
                                            </span>
                                        </div>
                                        {voucherDetail?.hotel_confirmation_code && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>
                                                    HCN No
                                                </span>
                                                <span className={styles.detailValue}>
                                                    {
                                                        voucherDetail.hotel_confirmation_code
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>
                                                Lead Passenger
                                            </span>
                                            <span className={styles.detailValue}>
                                                {voucherDetail?.holder_details?.title
                                                    ? `${voucherDetail.holder_details.title} `
                                                    : ""}
                                                {voucherDetail?.holder_details?.name}{" "}
                                                {voucherDetail?.holder_details?.surname}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>
                                                Phone
                                            </span>
                                            <span className={styles.detailValue}>
                                                {voucherDetail?.holder_details?.phone ||
                                                    "—"}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>
                                                Email
                                            </span>
                                            <span className={styles.detailValue}>
                                                {voucherDetail?.holder_details?.email ||
                                                    "—"}
                                            </span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>
                                                Country
                                            </span>
                                            <span className={styles.detailValue}>
                                                {voucherDetail?.holder_details
                                                    ?.country || "—"}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* ── 02 Accommodation ── */}
                                <section className={styles.detailCard}>
                                    <div className={styles.detailCardHead}>
                                        <span className={styles.detailStep}>02</span>
                                        <h3
                                            className={`${styles.detailCardTitle} ${merriweather.className}`}
                                        >
                                            Accommodation
                                        </h3>
                                    </div>

                                    <div className={styles.hotelCard}>
                                        <div className={styles.hotelCardHead}>
                                            <div className={styles.hotelCardTop}>
                                                <div className={styles.hotelNameWrap}>
                                                    <span
                                                        className={styles.hotelIcon}
                                                        aria-hidden="true"
                                                    >
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16M10 8h2M10 12h2M10 16h2M16 21V11h4v10"
                                                                stroke="#E7247A"
                                                                strokeWidth="1.7"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </span>
                                                    <h4 className={styles.hotelName}>
                                                        {voucherDetail?.hotel_details
                                                            ?.name || "—"}
                                                    </h4>
                                                </div>
                                                <span className={styles.hotelCity}>
                                                    {voucherDetail?.hotel_details
                                                        ?.destinationName || "—"}
                                                </span>
                                            </div>
                                            <p className={styles.hotelAddress}>
                                                {voucherDetail?.hotel?.address ||
                                                    voucherDetail?.hotel_details
                                                        ?.address ||
                                                    voucherDetail?.hotel_details
                                                        ?.destinationName ||
                                                    "—"}
                                            </p>
                                            <div className={styles.stayGrid}>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailLabel}>
                                                        Check-In
                                                    </span>
                                                    <span className={styles.stayValue}>
                                                        {voucherDetail?.check_in
                                                            ? moment(
                                                                  voucherDetail.check_in
                                                              ).format("DD-MM-YYYY")
                                                            : "—"}
                                                    </span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailLabel}>
                                                        Check-Out
                                                    </span>
                                                    <span className={styles.stayValue}>
                                                        {voucherDetail?.check_out
                                                            ? moment(
                                                                  voucherDetail.check_out
                                                              ).format("DD-MM-YYYY")
                                                            : "—"}
                                                    </span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailLabel}>
                                                        Nights
                                                    </span>
                                                    <span className={styles.stayValue}>
                                                        {nights ?? "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.roomList}>
                                            {voucherDetail?.rooms_details?.map(
                                                (item, index) =>
                                                    item?.rates?.map(
                                                        (rate, rateIndex) => {
                                                            const adults =
                                                                Number(
                                                                    rate?.adults
                                                                ) || 0;
                                                            const childrenCount =
                                                                Array.isArray(
                                                                    rate?.children
                                                                )
                                                                    ? rate.children
                                                                          .length
                                                                    : Number(
                                                                          rate?.children
                                                                      ) || 0;
                                                            const occupancyParts =
                                                                [];
                                                            if (adults > 0)
                                                                occupancyParts.push(
                                                                    `${adults} Ad`
                                                                );
                                                            if (childrenCount > 0)
                                                                occupancyParts.push(
                                                                    `${childrenCount} Ch`
                                                                );

                                                            return (
                                                                <div
                                                                    key={`${index}-${rateIndex}`}
                                                                    className={
                                                                        styles.roomItem
                                                                    }
                                                                >
                                                                    <div
                                                                        className={
                                                                            styles.roomItemRow
                                                                        }
                                                                    >
                                                                        <span
                                                                            className={
                                                                                styles.roomType
                                                                            }
                                                                        >
                                                                            {item?.name ||
                                                                                "Room"}
                                                                            {rate?.rooms
                                                                                ? ` × ${rate.rooms}`
                                                                                : ""}
                                                                        </span>
                                                                        <span
                                                                            className={
                                                                                styles.roomBoard
                                                                            }
                                                                        >
                                                                            {rate?.boardName ||
                                                                                "—"}
                                                                        </span>
                                                                        <span
                                                                            className={
                                                                                styles.roomOccupancy
                                                                            }
                                                                        >
                                                                            {occupancyParts.length >
                                                                            0
                                                                                ? occupancyParts.join(
                                                                                      " · "
                                                                                  )
                                                                                : "—"}
                                                                        </span>
                                                                    </div>
                                                                    <div
                                                                        className={
                                                                            styles.roomMeta
                                                                        }
                                                                    >
                                                                        {rate
                                                                            ?.cancellationPolicies
                                                                            ?.length >
                                                                        0 ? (
                                                                            <ul
                                                                                className={
                                                                                    styles.cancelList
                                                                                }
                                                                            >
                                                                                {rate.cancellationPolicies.map(
                                                                                    (
                                                                                        policy,
                                                                                        i
                                                                                    ) => (
                                                                                        <li
                                                                                            key={
                                                                                                i
                                                                                            }
                                                                                        >
                                                                                            After{" "}
                                                                                            {moment
                                                                                                .utc(
                                                                                                    policy.from
                                                                                                )
                                                                                                .format(
                                                                                                    "MMM DD"
                                                                                                )}
                                                                                            , a
                                                                                            cancellation
                                                                                            fee of{" "}
                                                                                            <strong>
                                                                                                {
                                                                                                    voucherDetail
                                                                                                        ?.pricing
                                                                                                        ?.display_currency
                                                                                                }{" "}
                                                                                                {convertToCustomerCurrency(
                                                                                                    policy.amount
                                                                                                )}
                                                                                            </strong>{" "}
                                                                                            will be
                                                                                            charged.
                                                                                        </li>
                                                                                    )
                                                                                )}
                                                                            </ul>
                                                                        ) : (
                                                                            <span
                                                                                className={
                                                                                    styles.nonRefundable
                                                                                }
                                                                            >
                                                                                Non-Refundable
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* ── 03 Guest Details ── */}
                                <section className={styles.detailCard}>
                                    <div className={styles.detailCardHead}>
                                        <span className={styles.detailStep}>03</span>
                                        <h3
                                            className={`${styles.detailCardTitle} ${merriweather.className}`}
                                        >
                                            Guest Details
                                        </h3>
                                    </div>
                                    <div className={styles.guestList}>
                                        {(() => {
                                            const extraAdults =
                                                voucherDetail?.adults_details?.filter(
                                                    (item) =>
                                                        item.name !==
                                                            voucherDetail
                                                                ?.holder_details
                                                                ?.name ||
                                                        item.surname !==
                                                            voucherDetail
                                                                ?.holder_details
                                                                ?.surname
                                                ) || [];
                                            const children =
                                                voucherDetail?.children_details ||
                                                [];
                                            const guests = [
                                                {
                                                    name: `${
                                                        voucherDetail?.holder_details
                                                            ?.title
                                                            ? `${voucherDetail.holder_details.title} `
                                                            : ""
                                                    }${
                                                        voucherDetail?.holder_details
                                                            ?.name || ""
                                                    } ${
                                                        voucherDetail?.holder_details
                                                            ?.surname || ""
                                                    }`.trim(),
                                                    phone:
                                                        voucherDetail?.holder_details
                                                            ?.phone || null,
                                                    country:
                                                        voucherDetail?.holder_details
                                                            ?.country || null,
                                                    type: "Lead",
                                                    age: voucherDetail
                                                        ?.holder_details?.age,
                                                },
                                                ...extraAdults.map((item) => ({
                                                    name: `${item?.name || ""} ${
                                                        item?.surname || ""
                                                    }`.trim(),
                                                    phone: item?.phone || null,
                                                    country: item?.country || null,
                                                    type: "Adult",
                                                    age: item?.age,
                                                })),
                                                ...children.map((item) => ({
                                                    name: `${item?.name || ""} ${
                                                        item?.surname || ""
                                                    }`.trim(),
                                                    phone: null,
                                                    country: null,
                                                    type: "Child",
                                                    age: item?.age,
                                                })),
                                            ];

                                            return guests.map((guest, index) => (
                                                <div
                                                    key={`guest-${index}`}
                                                    className={styles.guestRow}
                                                >
                                                    <div className={styles.guestLeft}>
                                                        <span
                                                            className={
                                                                styles.guestIndex
                                                            }
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <div
                                                            className={
                                                                styles.guestInfo
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.guestName
                                                                }
                                                            >
                                                                {guest.name || "—"}
                                                            </span>
                                                            {(guest.phone ||
                                                                guest.country) && (
                                                                <span
                                                                    className={
                                                                        styles.guestSub
                                                                    }
                                                                >
                                                                    {[
                                                                        guest.phone,
                                                                        guest.country,
                                                                    ]
                                                                        .filter(
                                                                            Boolean
                                                                        )
                                                                        .join(
                                                                            " · "
                                                                        )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.guestMeta}>
                                                        {guest.age != null && (
                                                            <span
                                                                className={
                                                                    styles.guestGender
                                                                }
                                                            >
                                                                {guest.age} Y/O
                                                            </span>
                                                        )}
                                                        <span
                                                            className={
                                                                styles.guestType
                                                            }
                                                        >
                                                            {guest.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </section>

                                {voucherDetail?.remark && (
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>
                                                04
                                            </span>
                                            <h3
                                                className={`${styles.detailCardTitle} ${merriweather.className}`}
                                            >
                                                Special Request
                                            </h3>
                                        </div>
                                        <p className={styles.specialRequestText}>
                                            {voucherDetail.remark}
                                        </p>
                                    </section>
                                )}

                                {/* ── Important Information ── */}
                                <section className={styles.detailCard}>
                                    <div className={styles.detailCardHead}>
                                        <span className={styles.detailStep}>
                                            {voucherDetail?.remark ? "05" : "04"}
                                        </span>
                                        <h3
                                            className={`${styles.detailCardTitle} ${merriweather.className}`}
                                        >
                                            Important Information
                                        </h3>
                                    </div>
                                    <ul className={styles.infoBullets}>
                                        <li>
                                            This voucher must be presented upon
                                            arrival.
                                        </li>
                                        <li>
                                            Standard Check-in time is 16:00 and
                                            Check-out time is 12:00.
                                        </li>
                                        <li>
                                            Early check-in and late check-out are
                                            subject to hotel availability.
                                        </li>
                                        <li>
                                            Any extras not mentioned are payable
                                            directly to the hotel.
                                        </li>
                                        <li>
                                            This voucher is valid only for the
                                            specified dates and guests.
                                        </li>
                                        <li>
                                            This is a computer-generated voucher
                                            and does not require any physical
                                            signature.
                                        </li>
                                    </ul>
                                </section>
                            </div>

                            {/* ── Thanks Footer ── */}
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
                                        <span>
                                            693a Stratford Road, Birmingham B11
                                            4DX, UK
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* {voucherDetail?.client?.footer_image && (
                                <div className={styles.brandImageWrap}>
                                    <Image
                                        src={voucherDetail.client.footer_image}
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
                                onClick={handleDownload}
                            >
                                Print Voucher
                            </button>
                            <Link
                                href={`/hotels/invoice/${
                                    voucherDetail?.invoice_number || id
                                }`}
                                className={styles.btnInvoice}
                            >
                                View Invoice
                            </Link>
                            <Link href="/" className={styles.btnHome}>
                                Go to Home
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Page;
