'use client'
import styles from "./Invoice.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import { FaPhone, FaEnvelope, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
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
    const [errorMessage, setErrorMessage] = useState('');
    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        setIsLoading(true);
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/booking/details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({ 'invoice_number': id }),
            });
            const res = await responses.json();
            setIsLoading(false);
            if (res.success) {
                const duration = moment(res?.data?.check_out).diff(moment(res?.data?.check_in), 'days')
                res.data.nights = duration;
                setVoucherDetail(res?.data);
            } else {
                setErrorMessage(res?.message)
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching hotel details:", err);
        }
    };

    const handleDownload = async () => {
        window.print()
    };

    function convertToCustomerCurrency(price) {
        if (!price || !voucherDetail.pricing?.supplier_to_display_rate) return Number(price || 0).toFixed(2);
        if (voucherDetail.currency_code === voucherDetail.pricing?.display_currency) {
            return Number(price).toFixed(2);
        }
        const convertedPrice = Number(price) * Number(voucherDetail.pricing?.supplier_to_display_rate);
        return convertedPrice.toFixed(2);
    }

    return (
        <div>
            <div className={styles.invoicecontainerwrap}>
                <div className={styles.invoicecontainer}>
                    {isLoading ? (
                        <div className={styles.themeholyinvoice}>
                            <HotelInvoiceLoader />
                        </div>
                    ) : (
                        <main>
                            <div ref={ref} id="voucher" className={styles.themeholyinvoice}>
                                {/* ── Watermark ── */}
                                {/* <div className={styles.watermark}>
                                    <Image
                                        src='/watermark.png'
                                        width={450}
                                        height={450}
                                        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                                        alt="Watermark"
                                        quality={100}
                                    />
                                </div> */}
                                {/* ── Invoice Header ── */}
                                <div className={styles.invHeader}>
                                    <div className={styles.invHeaderBand}>
                                        <span className={styles.invHeaderCircle} aria-hidden="true" />
                                        <div className={styles.invHeaderBrand}>
                                            <h2 className={`${styles.invHeaderDocTitle} ${merriweather.className}`}>
                                                Hotel Invoice
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
                                            <h1 className={`${styles.invGuestName} ${merriweather.className}`}>
                                                {voucherDetail?.holder_details?.title
                                                    ? `${voucherDetail.holder_details.title} `
                                                    : ""}
                                                {voucherDetail?.holder_details?.name}{" "}
                                                {voucherDetail?.holder_details?.surname}
                                            </h1>
                                            <p className={styles.invForDesc}>
                                                {voucherDetail?.hotel_details?.name || "Hotel Booking"}
                                                {voucherDetail?.nights
                                                    ? ` · ${voucherDetail.nights} ${voucherDetail.nights > 1 ? "Nights" : "Night"}`
                                                    : ""}
                                                {voucherDetail?.hotel_details?.destinationName
                                                    ? ` · ${voucherDetail.hotel_details.destinationName}`
                                                    : ""}
                                            </p>
                                        </div>

                                        <div className={styles.invMetaBlock}>
                                            <div className={styles.invStatusRow}>
                                                <span
                                                    className={`${styles.invStatusBadge} ${
                                                        voucherDetail?.booking_status === "confirmed"
                                                            ? styles.confirmedStatus
                                                            : voucherDetail?.booking_status === "cancelled"
                                                              ? styles.cancelledStatus
                                                              : styles.pandingStatus
                                                    }`}
                                                >
                                                    <FaCheckCircle size={12} />
                                                    {voucherDetail?.booking_status
                                                        ? voucherDetail.booking_status.charAt(0).toUpperCase() +
                                                          voucherDetail.booking_status.slice(1)
                                                        : "—"}
                                                </span>
                                                {voucherDetail?.payment_status && (
                                                    <span
                                                        className={`${styles.invStatusBadge} ${
                                                            styles[
                                                                `payment_${voucherDetail.payment_status.toLowerCase()}`
                                                            ]
                                                        }`}
                                                    >
                                                        {voucherDetail.payment_status.charAt(0).toUpperCase() +
                                                            voucherDetail.payment_status.slice(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.invBookingRef}>
                                                Booking Ref: {voucherDetail?.booking_reference || voucherDetail?.invoice_number}
                                            </div>
                                            <div className={styles.invBookingDate}>
                                                Booking Date:{" "}
                                                {voucherDetail?.created_at
                                                    ? moment(voucherDetail.created_at).format("DD-MM-YYYY")
                                                    : "—"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={styles.downloadinner}>
                                    {/* ── Booking By ── */}
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>01</span>
                                            <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                Booking By
                                            </h3>
                                        </div>
                                        <div className={styles.detailGrid}>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Full Name</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.title
                                                        ? `${voucherDetail.holder_details.title} `
                                                        : ""}
                                                    {voucherDetail?.holder_details?.name}{" "}
                                                    {voucherDetail?.holder_details?.surname}
                                                </span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Email</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.email || "—"}
                                                </span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Phone</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.phone || "—"}
                                                </span>
                                            </div>
                                            {/* <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Gender</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.gender || "—"}
                                                </span>
                                            </div> */}
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Country</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.country || "—"}
                                                </span>
                                            </div>
                                            {/* <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Address</span>
                                                <span className={styles.detailValue}>
                                                    {voucherDetail?.holder_details?.address || "—"}
                                                </span>
                                            </div> */}
                                        </div>
                                    </section>

                                    {/* ── Accommodation ── */}
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>02</span>
                                            <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                Accommodation
                                            </h3>
                                        </div>

                                        <div className={styles.hotelCard}>
                                            <div className={styles.hotelCardHead}>
                                                <div className={styles.hotelCardTop}>
                                                    <div className={styles.hotelNameWrap}>
                                                        <span className={styles.hotelIcon} aria-hidden="true">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                                <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16M10 8h2M10 12h2M10 16h2M16 21V11h4v10" stroke="#E7247A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </span>
                                                        <h4 className={styles.hotelName}>
                                                            {voucherDetail?.hotel_details?.name || "—"}
                                                        </h4>
                                                    </div>
                                                    <span className={styles.hotelCity}>
                                                        {voucherDetail?.hotel_details?.destinationName || "—"}
                                                    </span>
                                                </div>

                                                <p className={styles.hotelAddress}>
                                                    {voucherDetail?.hotel?.address
                                                        || voucherDetail?.hotel_details?.address
                                                        || voucherDetail?.hotel_details?.destinationName
                                                        || "—"}
                                                </p>

                                                {voucherDetail?.hotel_confirmation_code && (
                                                    <div className={styles.hotelHcn}>
                                                        <span className={styles.detailLabel}>HCN No</span>
                                                        <span className={styles.detailValue}>
                                                            {voucherDetail.hotel_confirmation_code}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className={styles.stayGrid}>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Check-In</span>
                                                        <span className={styles.stayValue}>
                                                            {voucherDetail?.check_in
                                                                ? moment(voucherDetail.check_in).format("DD-MM-YYYY")
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Check-Out</span>
                                                        <span className={styles.stayValue}>
                                                            {voucherDetail?.check_out
                                                                ? moment(voucherDetail.check_out).format("DD-MM-YYYY")
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Nights</span>
                                                        <span className={styles.stayValue}>
                                                            {voucherDetail?.nights ?? "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.roomList}>
                                                {voucherDetail?.rooms_details?.map((item, index) =>
                                                    item?.rates?.map((rate, rateIndex) => {
                                                        const adults = Number(rate?.adults) || 0;
                                                        const childrenCount = Array.isArray(rate?.children)
                                                            ? rate.children.length
                                                            : Number(rate?.children) || 0;
                                                        const infants = Number(rate?.infants) || 0;
                                                        const occupancyParts = [];
                                                        if (adults > 0) occupancyParts.push(`${adults} Ad`);
                                                        if (childrenCount > 0) occupancyParts.push(`${childrenCount} Ch`);
                                                        if (infants > 0) occupancyParts.push(`${infants} Inf`);

                                                        return (
                                                            <div
                                                                key={`${index}-${rateIndex}`}
                                                                className={styles.roomItem}
                                                            >
                                                                <div className={styles.roomItemRow}>
                                                                    <span className={styles.roomType}>
                                                                        {item?.name || "Room"}
                                                                        {rate?.rooms
                                                                            ? ` × ${rate.rooms}`
                                                                            : ""}
                                                                    </span>
                                                                    <span className={styles.roomBoard}>
                                                                        {rate?.boardName || "—"}
                                                                    </span>
                                                                    <span className={styles.roomOccupancy}>
                                                                        {occupancyParts.length > 0
                                                                            ? occupancyParts.join(" · ")
                                                                            : "—"}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.roomMeta}>
                                                                    {/* <span className={styles.roomPrice}>
                                                                        {voucherDetail?.pricing?.display_currency}{" "}
                                                                        {convertToCustomerCurrency(item?.booking_price)}
                                                                    </span> */}
                                                                    {rate?.cancellationPolicies?.length > 0 ? (
                                                                        <ul className={styles.cancelList}>
                                                                            {rate.cancellationPolicies.map((policy, i) => (
                                                                                <li key={i}>
                                                                                    After {moment.utc(policy.from).format("MMM DD")},
                                                                                    a cancellation fee of{" "}
                                                                                    <strong>
                                                                                        {voucherDetail?.pricing?.display_currency}{" "}
                                                                                        {convertToCustomerCurrency(policy.amount)}
                                                                                    </strong>{" "}
                                                                                    will be charged.
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <span className={styles.nonRefundable}>
                                                                            Non-Refundable
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {(() => {
                                        const extraAdults = voucherDetail?.adults_details?.filter(
                                            (item) =>
                                                item.name !== voucherDetail?.holder_details?.name ||
                                                item.surname !== voucherDetail?.holder_details?.surname
                                        ) || [];
                                        const children = voucherDetail?.children_details || [];
                                        const guests = [
                                            ...extraAdults.map((item) => ({
                                                name: `${item?.name || ""} ${item?.surname || ""}`.trim(),
                                                gender: item?.gender || null,
                                                type: "Adult",
                                                age: item?.age,
                                            })),
                                            ...children.map((item) => ({
                                                name: `${item?.name || ""} ${item?.surname || ""}`.trim(),
                                                gender: item?.gender || null,
                                                type: "Child",
                                                age: item?.age,
                                            })),
                                        ];
                                        if (guests.length === 0) return null;

                                        return (
                                            <section className={styles.detailCard}>
                                                <div className={styles.detailCardHead}>
                                                    <span className={styles.detailStep}>03</span>
                                                    <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                        Additional Guests
                                                    </h3>
                                                </div>
                                                <div className={styles.guestList}>
                                                    {guests.map((guest, index) => (
                                                        <div key={`guest-${index}`} className={styles.guestRow}>
                                                            <div className={styles.guestLeft}>
                                                                <span className={styles.guestIndex}>{index + 1}</span>
                                                                <span className={styles.guestName}>
                                                                    {guest.name || "—"}
                                                                </span>
                                                            </div>
                                                            <div className={styles.guestMeta}>
                                                                {guest.gender && (
                                                                    <span className={styles.guestGender}>
                                                                        {guest.gender}
                                                                    </span>
                                                                )}
                                                                {guest.age != null && (
                                                                    <span className={styles.guestGender}>
                                                                        {guest.age} Y/O
                                                                    </span>
                                                                )}
                                                                <span className={styles.guestType}>{guest.type}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        );
                                    })()}

                                    {/* ── Room Price Details ── */}
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>04</span>
                                            <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                Room Price Details
                                            </h3>
                                        </div>

                                        <div className={styles.priceTable}>
                                            <div className={`${styles.priceRow} ${styles.priceHead}`}>
                                                <span>#</span>
                                                <span>Room Type</span>
                                                <span>Pax</span>
                                                <span>Total</span>
                                            </div>
                                            {(() => {
                                                let rowNum = 0;
                                                const currency = voucherDetail?.pricing?.display_currency || "";
                                                return voucherDetail?.rooms_details?.map((item, index) =>
                                                    item?.rates?.map((rate, rateIndex) => {
                                                        rowNum += 1;
                                                        const adults = Number(rate?.adults) || 0;
                                                        const childrenCount = Array.isArray(rate?.children)
                                                            ? rate.children.length
                                                            : Number(rate?.children) || 0;
                                                        const infants = Number(rate?.infants) || 0;
                                                        const adultLabel = adults === 1 ? "Adult" : "Adults";
                                                        const childLabel = childrenCount === 1 ? "Child" : "Children";
                                                        const infantLabel = infants === 1 ? "Infant" : "Infants";
                                                        const pax = `${adults} ${adultLabel} — ${childrenCount} ${childLabel} — ${infants} ${infantLabel}`;

                                                        return (
                                                            <div
                                                                key={`price-${index}-${rateIndex}`}
                                                                className={styles.priceRow}
                                                            >
                                                                <span className={styles.priceIndex}>{rowNum}</span>
                                                                <span className={styles.priceRoom}>
                                                                    {item?.name || "Room"}
                                                                    {rate?.rooms ? ` × ${rate.rooms}` : ""}
                                                                </span>
                                                                <span className={styles.pricePax}>{pax}</span>
                                                                <span className={styles.priceTotal}>
                                                                    {currency}{" "}
                                                                    {convertToCustomerCurrency(item?.booking_price)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                );
                                            })()}
                                        </div>

                                        <div className={styles.priceSummary}>
                                            <div className={styles.priceSummaryRow}>
                                                <span>Discount</span>
                                                <span>
                                                    {voucherDetail?.pricing?.display_currency}{" "}
                                                    {voucherDetail?.pricing?.discount ?? "0.00"}
                                                </span>
                                            </div>
                                            <div className={styles.priceSummaryRow}>
                                                <span>Sub Total</span>
                                                <span>
                                                    {voucherDetail?.pricing?.display_currency}{" "}
                                                    {voucherDetail?.pricing?.booking_amount}
                                                </span>
                                            </div>
                                            <p className={styles.priceVatNote}>Included VAT and Taxes</p>
                                        </div>

                                        <div className={styles.totalAmountBar}>
                                            <span>Total Amount</span>
                                            <span className={styles.totalAmountValue}>
                                                {voucherDetail?.pricing?.display_currency}{" "}
                                                {voucherDetail?.pricing?.booking_amount}
                                            </span>
                                        </div>
                                    </section>

                                    {/* ── Account Details ── */}
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>05</span>
                                            <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                Account Details
                                            </h3>
                                        </div>
                                        <div className={styles.detailGrid}>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Account Holder Name</span>
                                                <span className={styles.detailValue}>Al Hijaz Tours Ltd</span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Account Number</span>
                                                <span className={styles.detailValue}>58516868</span>
                                            </div>
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Sort Code</span>
                                                <span className={styles.detailValue}>309950</span>
                                            </div>
                                        </div>
                                    </section>

                                    {voucherDetail?.remark && (
                                        <section className={styles.detailCard}>
                                            <div className={styles.detailCardHead}>
                                                <span className={styles.detailStep}>06</span>
                                                <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                    Special Request
                                                </h3>
                                            </div>
                                            <p className={styles.specialRequestText}>{voucherDetail.remark}</p>
                                        </section>
                                    )}

                                    {/* ── Important Information ── */}
                                    <section className={styles.detailCard}>
                                        <div className={styles.detailCardHead}>
                                            <span className={styles.detailStep}>
                                                {voucherDetail?.remark ? "07" : "06"}
                                            </span>
                                            <h3 className={`${styles.detailCardTitle} ${merriweather.className}`}>
                                                Important Information
                                            </h3>
                                        </div>
                                        <ul className={styles.infoBullets}>
                                            <li>Standard Check-in time is 16:00 and Check-out time is 12:00.</li>
                                            <li>Early check-in and late check-out are subject to hotel availability and may incur additional charges.</li>
                                            <li>For group bookings, separate cancellation policies may apply as per the confirmed agreement.</li>
                                            <li>No-show bookings will be charged the full amount of the reservation.</li>
                                            <li>All bookings are subject to the hotel’s standard terms and local regulations.</li>
                                            <li>This is a computer-generated receipt and does not require any physical signature.</li>
                                        </ul>
                                    </section>

                                </div>

                                {/* ── Thanks Footer ── */}
                                <div className={styles.thanksFooter}>
                                    <div className={styles.thanksFooterContent}>
                                        <h3 className={`${styles.thanksFooterTitle} ${merriweather.className}`}>
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

                            {/* ── Action Buttons ── */}
                            <div className={styles.actionRow}>
                                <button
                                    type="button"
                                    className={styles.btnPrint}
                                    onClick={handleDownload}
                                >
                                    Print Invoice
                                </button>
                                <Link
                                    href={`/hotels/voucher/${id}`}
                                    className={styles.btnVoucher}
                                >
                                    View Voucher
                                </Link>
                                <Link href="/" className={styles.btnHome}>
                                    Go to Home
                                </Link>
                            </div>
                        </main>
                    )}
                </div>
            </div>
        </div>
    )
}
