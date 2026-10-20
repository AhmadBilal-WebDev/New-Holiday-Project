"use client";
import styles from "./Voucher.module.css";
import {
    FaFileInvoice,
    FaHotel,
    FaUser,
    FaBed,
} from "react-icons/fa";
import moment from "moment";
import { MdOutlineFileDownload } from "react-icons/md";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";

const Page = () => {
    const { id } = useParams();
    const ref = useRef();
    const [voucherDetail, setVoucherDetail] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
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
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/booking/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'invoice_number': id }),
            });
            const res = await responses.json();
            setIsLoading(false);
            if (res.success) {
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
        if (!price || !voucherDetail.pricing?.supplier_to_display_rate) return Number(price || 0).toFixed(2);
        if (voucherDetail.currency_code === voucherDetail.pricing?.display_currency) {
            return Number(price).toFixed(2);
        }
        const convertedPrice = Number(price) * Number(voucherDetail.pricing?.supplier_to_display_rate);
        return convertedPrice.toFixed(2);
    }
    const handleDownload = () => window.print();

    return (
        <div className={styles.pageWrapper}>
            {isLoading ? (
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className="bg-white rounded shadow p-3">
                        <HotelVoucherLoader />
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
                                    src='/watermark.png'
                                    width={450}
                                    height={450}
                                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                                    alt="Watermark"
                                    quality={100}
                                />
                            </div>

                            {/* ── Company Header Image ── */}
                            <Image
                                src={voucherDetail?.client?.header_image}
                                height={150}
                                width={1000}
                                className="w-100 h-auto d-block"
                                quality={100}
                                alt="Company Header"
                            />

                            {/* ── Title + QR Band ── */}
                            <div className={styles.titleBand}>
                                <div className={styles.titleLeft}>
                                    <h1 className={styles.mainTitle}>Hotel Booking Voucher</h1>
                                    <p className={styles.mainSubtitle}>Thank you for choosing Alhijaz Tours</p>
                                </div>
                                <div className={styles.titleRight}>
                                    <div className={styles.qrWrapper}>
                                        <QRCode
                                            value={voucherUrl}
                                            size={78}
                                            bgColor="#ffffff"
                                            fgColor="#1a1a1a"
                                        />
                                    </div>
                                    <span className={styles.qrLabel}>Scan the QR Code<br />to Verify Booking</span>
                                </div>
                            </div>

                            {/* ── Gold Divider ── */}
                            <div className={styles.goldDivider} />

                            {/* ── Voucher Details Band ── */}
                            <div className={styles.voucherDetailsBand}>
                                <div className={styles.voucherBandInner}>
                                    <span className={styles.voucherSectionLabel}>Voucher Details</span>
                                    <div className={styles.voucherDetailsRow}>
                                        <div className={styles.voucherDetailsLeft}>
                                            <div className="d-flex justify-content-between w-100 w-md-50 flex-wrap gap-2">
                                                <div>
                                                    <p className={styles.voucherNoLabel}>VOUCHER NO:</p>
                                                    <h5 className="fw-bold">{voucherDetail?.invoice_number}</h5>
                                                </div>
                                                {voucherDetail?.hotel_confirmation_code && (
                                                    <div className="text-start">
                                                        <p className={styles.voucherNoLabel}>HCN NO:</p>
                                                        <h5 className="fw-bold">{voucherDetail?.hotel_confirmation_code}</h5>
                                                    </div>
                                                )}
                                            </div>


                                            <span className={voucherDetail?.booking_status === 'confirmed' ? styles.confirmedBadge : voucherDetail?.booking_status === 'pending' ? styles.pendingBadge : styles.cancelledBadge}>
                                                Status: {voucherDetail?.booking_status?.toUpperCase()}
                                            </span>
                                            <br />
                                            {voucherDetail?.payment_status && (
                                                <span className={`${voucherDetail.payment_status === 'paid' ? styles.confirmedBadge : voucherDetail.payment_status === 'pending' ? styles.pendingBadge : styles.cancelledBadge} ${styles.paymentBadge} `}>
                                                    Payment: {voucherDetail.payment_status.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.voucherDetailsDivider} />
                                        <div className={styles.voucherDetailsRight}>
                                            <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                                            <p className={styles.bookingDetailLine}>
                                                <span>Lead Passenger:</span>
                                                <span className={styles.bookingDetailValue}>
                                                    {voucherDetail?.holder_details?.title}{' '}
                                                    {voucherDetail?.holder_details?.name}{' '}
                                                    {voucherDetail?.holder_details?.surname}
                                                </span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>Booking Ref: {voucherDetail?.booking_reference}</p>
                                            <p className={styles.bookingDetailSmallLabel}>Booking Date:</p>
                                            <p className={styles.bookingDateValue}>
                                                {moment(voucherDetail?.created_at).format('DD-MM-YYYY')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Hotel Information ── */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeader}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={styles.sectionIconWrap}><FaHotel size={13} /></span>
                                        HOTEL INFORMATION
                                    </div>
                                </div>
                                <div className={styles.hotelInfoGrid}>
                                    <div className={styles.hotelInfoLeft}>
                                        <h3 className={styles.hotelTitle}>{voucherDetail?.hotel_details?.name}</h3>
                                        <p className={styles.hotelAddressLine}>
                                            Address:  {voucherDetail?.hotel?.address ? voucherDetail?.hotel?.address : voucherDetail?.hotel_details?.destinationName}
                                        </p>
                                    </div>
                                    <div className={styles.hotelInfoRight}>
                                        <div className={styles.hotelDateRow}>
                                            <span className={styles.hotelDateLabel}>Check-In Date:</span>
                                            <span className={styles.hotelDateValue}>
                                                {moment(voucherDetail?.check_in).format('DD-MM-YYYY')}
                                            </span>
                                        </div>
                                        <div className={styles.hotelDateRow}>
                                            <span className={styles.hotelDateLabel}>Check-Out Date:</span>
                                            <span className={styles.hotelDateValue}>
                                                {moment(voucherDetail?.check_out).format('DD-MM-YYYY')}
                                            </span>
                                        </div>
                                        <div className={styles.hotelDateRow}>
                                            <span className={styles.hotelDateLabel}>Duration:</span>
                                            <span className={`${styles.hotelDateValue}`}>
                                                {moment(voucherDetail?.check_out).diff(moment(voucherDetail?.check_in), 'days')} Night{moment(voucherDetail?.check_out).diff(moment(voucherDetail?.check_in), 'days') > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Room Details ── */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeader}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={styles.sectionIconWrap}><FaBed size={13} /></span>
                                        ROOM DETAILS
                                    </div>
                                </div>
                                <div className={`p-3 ${styles.tableWrap}`}>
                                    <table className={styles.premiumTable}>
                                        <thead>
                                            <tr>
                                                <th className={styles.srCell}>#</th>
                                                <th>Room Type &amp; View</th>
                                                <th>Meal Plan</th>
                                                <th>Occupancy</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voucherDetail?.rooms_details?.map((item, index) => (
                                                item?.rates?.map((rate, rateIndex) => (
                                                    <>
                                                        <tr key={`${index}-${rateIndex}`}>
                                                            <td className={styles.srCell} data-label="#">{index + 1}</td>
                                                            <td data-label="Room Type & View" style={{ fontWeight: 600 }}>{item.name}</td>
                                                            <td data-label="Meal Plan">{rate.boardName}</td>
                                                            <td data-label="Occupancy">
                                                                {rate.adults} {Number(rate.adults) > 1 ? 'Adults' : 'Adult'}
                                                                {Number(rate.children) > 0 && `, ${rate.children} ${Number(rate.children) > 1 ? 'Children' : 'Child'}`}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td colSpan={4} data-label="Cancellation Policy" className={styles.fullWidthCell}>
                                                                {rate?.cancellationPolicies.length > 0 ? (
                                                                    <div>
                                                                        {rate?.cancellationPolicies.map((policy, i) => {
                                                                            const dateObj = moment.utc(policy.from);
                                                                            return (
                                                                                <p key={i} className="mb-1"> After {dateObj.format('MMM DD ')}, a cancellation fee of <strong> {voucherDetail?.pricing?.display_currency} {convertToCustomerCurrency(policy.amount)}</strong> will be charged.</p>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <p className="mb-1"> This Room is non-refundable. No cancellation or modification is allowed.</p>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    </>
                                                ))
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Guest Details ── */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeader}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={styles.sectionIconWrap}><FaUser size={13} /></span>
                                        GUEST DETAILS
                                    </div>
                                </div>
                                <div className={`p-3 ${styles.tableWrap}`}>
                                    <table className={styles.premiumTable}>
                                        <thead>
                                            <tr>
                                                <th className={styles.srCell}>#</th>
                                                <th>Guest Name</th>
                                                <th>Contact Info</th>
                                                <th>Nationality</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const extraAdults = voucherDetail?.adults_details?.filter(
                                                    (item) =>
                                                        item.name !== voucherDetail?.holder_details?.name ||
                                                        item.surname !== voucherDetail?.holder_details?.surname
                                                ) || [];
                                                const children = voucherDetail?.children_details || [];

                                                return (
                                                    <>
                                                        <tr>
                                                            <td className={styles.srCell} data-label="#">1</td>
                                                            <td data-label="Guest Name" style={{ fontWeight: 600 }}>
                                                                {voucherDetail?.holder_details?.title}{' '}
                                                                {voucherDetail?.holder_details?.name}{' '}
                                                                {voucherDetail?.holder_details?.surname}
                                                            </td>
                                                            <td data-label="Contact Info">{voucherDetail?.holder_details?.phone || '—'}</td>
                                                            <td data-label="Nationality">{voucherDetail?.holder_details?.country || '—'}</td>
                                                        </tr>
                                                        {extraAdults.map((item, index) => (
                                                            <tr key={`adult-${index}`}>
                                                                <td className={styles.srCell} data-label="#">{index + 2}</td>
                                                                <td data-label="Guest Name" style={{ fontWeight: 600 }}>{item.name} {item.surname}</td>
                                                                <td data-label="Contact Info">—</td>
                                                                <td data-label="Nationality">—</td>
                                                            </tr>
                                                        ))}
                                                        {children.map((item, index) => (
                                                            <tr key={`child-${index}`}>
                                                                <td className={styles.srCell} data-label="#">{extraAdults.length + index + 2}</td>
                                                                <td data-label="Guest Name" style={{ fontWeight: 600 }}>
                                                                    {item.name} {item.surname}
                                                                    {item.age != null && (
                                                                        <span className="text-muted ms-1" style={{ fontWeight: 500, fontSize: '0.85em' }}>
                                                                            (Child, {item.age} Y/O)
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td data-label="Contact Info">—</td>
                                                                <td data-label="Nationality">—</td>
                                                            </tr>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── Remarks / Special Request ── */}
                            {voucherDetail?.remark && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            SPECIAL REQUEST
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="mb-0" style={{ fontSize: '0.875rem' }}>{voucherDetail.remark}</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Important Information ── */}
                            <div className={styles.importantSection}>
                                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                                <div className={styles.importantDivider} />
                                <ul className={styles.importantList}>
                                    <li>This voucher must be presented upon arrival.</li>
                                    <li>Standard Check-in time is 16:00 and Check-out time is 12:00.</li>
                                    <li>Early check-in and late check-out are subject to hotel availability.</li>
                                    <li>Any extras not mentioned are payable directly to the hotel.</li>
                                    <li>This voucher is valid only for the specified dates and guests.</li>
                                </ul>
                            </div>

                            {/* ── Company Footer Image ── */}
                            <Image
                                src={voucherDetail?.client?.footer_image}
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
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className={styles.actionRow}>
                        <button className={styles.btnPrimary} onClick={handleDownload}>
                            <MdOutlineFileDownload size={17} />
                            Print Voucher
                        </button>
                        <Link href={`/hotels/invoice/${voucherDetail?.invoice_number}`} style={{ textDecoration: 'none' }}>
                            <button className={styles.btnGold}>
                                <FaFileInvoice size={14} />
                                View Invoice
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Page;
