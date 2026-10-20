'use client'
import styles from "./Invoice.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import { PiDownloadSimpleThin } from "react-icons/pi";
import { Tooltip } from '@mantine/core';
import { FaHome, FaPhone, FaEnvelope, FaGlobe, FaCalendarAlt, FaFileInvoice, FaCheckCircle, FaMapMarkerAlt } from "react-icons/fa";
import Link from "next/link";
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
                            <div className={styles?.invoiceprintbutton}>
                                <Tooltip label='Print Invoice' color="blue">
                                    <div onClick={handleDownload} className="bg-primary-subtle cursor-pointer p-2 text-primary rounded"><PiDownloadSimpleThin size={25} /></div>
                                </Tooltip>
                                <Tooltip label='Go Home' color="green">
                                    <Link href='/'>
                                        <div className="bg-success-subtle cursor-pointer p-2 text-success rounded mt-2"><FaHome size={25} /></div>
                                    </Link>
                                </Tooltip>
                            </div>
                            <div ref={ref} id="voucher" className={styles.themeholyinvoice}>
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
                                {/* ── Invoice Header ── */}
                                <div className={styles.invHeader}>
                                    {/* Left panel */}
                                    <div className={styles.invHeaderLeft}>
                                        <div className={`${styles.invHeaderLogo} text-center`}>
                                            <Image src='/images/logoblack.png' height={100} width={150} className="h-auto" quality={100} alt="Logo" />

                                        </div>
                                        <div className={styles.invHeaderMeta}>
                                            <span><FaCalendarAlt size={13} className={styles.invMetaIcon} />Date: <b>{moment(voucherDetail?.created_at).format('DD-MM-YYYY')}</b></span>
                                            <span><FaFileInvoice size={13} className={styles.invMetaIcon} />No: <b>{voucherDetail?.invoice_number}</b></span>
                                        </div>
                                        <div className={styles.invHeaderTitle}>INVOICE</div>
                                    </div>
                                    {/* Right panel */}
                                    <div className={styles.invHeaderRight}>
                                        <div className={styles.invBookingFor}>Booking For:</div>
                                        <div className={styles.invGuestName}>
                                            {voucherDetail?.holder_details?.name} {voucherDetail?.holder_details?.surname}
                                            {(voucherDetail?.holder_details?.gender || voucherDetail?.holder_details?.age) && (
                                                <span className={styles.invGuestMeta}>
                                                    {voucherDetail?.holder_details?.gender ? ` - ${voucherDetail.holder_details.gender}` : ''}
                                                    {voucherDetail?.holder_details?.age ? ` - ${voucherDetail.holder_details.age} Y/O` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-white small">Booking Ref: {voucherDetail?.booking_reference}</div>
                                        <div className={styles.invHeaderDivider}></div>
                                        <div className={styles.invContactInfo}>
                                            {voucherDetail?.holder_details?.address && <p><FaMapMarkerAlt size={12} className={styles.invContactIcon} />{voucherDetail.holder_details.address}</p>}
                                            {!voucherDetail?.holder_details?.address && voucherDetail?.holder_details?.country && <p><FaMapMarkerAlt size={12} className={styles.invContactIcon} />{voucherDetail.holder_details.country}</p>}
                                            {voucherDetail?.holder_details?.email && <p><FaEnvelope size={12} className={styles.invContactIcon} />{voucherDetail.holder_details.email}</p>}
                                            {voucherDetail?.holder_details?.phone && <p><FaPhone size={12} className={styles.invContactIcon} />{voucherDetail.holder_details.phone}</p>}
                                        </div>
                                        <div className={styles.invHeaderDivider}></div>
                                        <div className={styles.invStatusRow}>
                                            <span className={`${styles.invStatusBadge} ${voucherDetail?.booking_status === 'confirmed' ? styles.confirmedStatus : voucherDetail?.booking_status === 'cancelled' ? styles.cancelledStatus : styles.pandingStatus}`}>
                                                <FaCheckCircle size={12} />
                                                STATUS: {voucherDetail?.booking_status?.toUpperCase()}
                                            </span>
                                            {voucherDetail?.payment_status && (
                                                <span className={`${styles.invStatusBadge} ms-1 ${styles[`payment_${voucherDetail.payment_status.toLowerCase()}`]}`}>
                                                    Payment: {voucherDetail.payment_status.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.downloadinner}>
                                    {/* Accommodation & Room Details Section */}
                                    <div className={`${styles.accomBlock} mb-3`}>
                                        <div className={styles.accomHeader}>
                                            <span className={styles.accomTitle}>• Accommodation Details</span>
                                            <span className={styles.accomCity}>
                                                {voucherDetail?.hotel_details?.destinationName} &ndash; {voucherDetail?.nights} {voucherDetail?.nights > 1 ? 'Nights' : 'Night'}
                                            </span>
                                        </div>
                                        <div className={styles.accomDivider}></div>
                                        {voucherDetail?.hotel_confirmation_code && (
                                            <div className={styles.accomRow}>
                                                <span className={styles.accomLabel}>HCN No</span>
                                                <span className={styles.accomValue}>{voucherDetail?.hotel_confirmation_code}</span>
                                            </div>
                                        )}

                                        <div className={styles.accomRow}>
                                            <span className={styles.accomLabel}>Hotel Name</span>
                                            <span className={styles.accomValue}>{voucherDetail?.hotel_details?.name}</span>
                                        </div>
                                        <div className={styles.accomRowDivider}></div>
                                        <div className={styles.accomRow}>
                                            <span className={styles.accomLabel}>Check-In</span>
                                            <span className={styles.accomValue}>
                                                {moment(voucherDetail?.check_in).format('DD-MM-YYYY')}
                                            </span>
                                        </div>
                                        <div className={styles.accomRow}>
                                            <span className={styles.accomLabel}>Check-Out</span>
                                            <span className={styles.accomValue}>
                                                {moment(voucherDetail?.check_out).format('DD-MM-YYYY')}
                                            </span>
                                        </div>
                                        <div className={styles.accomRow}>
                                            <span className={styles.accomLabel}>Duration</span>
                                            <span className={styles.accomValue}>
                                                {voucherDetail?.nights} {voucherDetail?.nights > 1 ? 'Nights' : 'Night'}
                                            </span>
                                        </div>
                                        <div className={styles.accomRowDivider}></div>
                                        <div className={styles.accomRow}>
                                            <span className={`${styles.accomLabel}`}>Location</span>
                                            <span className={`${styles.accomValue} `}>
                                                {voucherDetail?.hotel?.address
                                                    ? voucherDetail?.hotel?.address || '-'
                                                    : `${voucherDetail?.hotel_details?.destinationName || '-'}`
                                                }
                                            </span>
                                        </div>
                                        <div className={styles.accomRowDividerThick}></div>
                                        {/* Room Details */}
                                        <div className={styles.roomDetailsBox}>
                                            <div className={styles.roomDetailsLeft}>
                                                <b className={styles.roomDetailsTitle}>Room Details</b>
                                            </div>
                                            <div className={styles.roomDetailsRight}>
                                                {voucherDetail?.rooms_details?.map((item, index) => (
                                                    item?.rates?.map((rate, rateIndex) => (
                                                        <div key={`${index}-${rateIndex}`}>
                                                            <div className={styles.roomRow}>
                                                                <span className={styles.roomName}>
                                                                    {rate?.rooms}x {item.name}{rate.boardName ? ` – ${rate.boardName}` : ''}
                                                                </span>
                                                                <span className={styles.roomSep}>|</span>
                                                                <span className={styles.roomAdults}>
                                                                    {voucherDetail?.pricing?.display_currency} {convertToCustomerCurrency(item?.booking_price)}
                                                                </span>
                                                            </div>
                                                            {/* Cancellation Policy */}
                                                            <div className="mt-1" style={{ fontSize: '0.85rem' }}>
                                                                { rate?.cancellationPolicies?.length > 0 ? (
                                                                    <ul className="mb-0 ps-3" style={{ listStyle: 'disc' }}>
                                                                        {rate.cancellationPolicies.map((policy, i) => {
                                                                            const dateObj = moment.utc(policy.from);
                                                                            return (
                                                                                <li key={i} className="small">
                                                                                    After {dateObj.format('MMM DD')}, a cancellation fee of <strong>{voucherDetail?.pricing?.display_currency} {convertToCustomerCurrency(policy.amount)}</strong> will be charged.
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>
                                                                ) : (
                                                                    <span className="badge bg-danger-subtle small text-danger border border-danger">Non-Refundable</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.accomRowDivider}></div>
                                    </div>

                                    {(() => {
                                        const extraAdults = voucherDetail?.adults_details?.filter(
                                            (item) =>
                                                item.name !== voucherDetail?.holder_details?.name ||
                                                item.surname !== voucherDetail?.holder_details?.surname
                                        ) || [];
                                        const children = voucherDetail?.children_details || [];
                                        if (extraAdults.length === 0 && children.length === 0) return null;

                                        return (
                                            <div className={`${styles.accomBlock} mb-3`}>
                                                <div className={styles.accomHeader}>
                                                    <span className={styles.accomTitle}>• Guest Details</span>
                                                    <span className={styles.accomCity}>
                                                        {1 + extraAdults.length + children.length} Guests
                                                    </span>
                                                </div>
                                                <div className={styles.accomDivider}></div>
                                                <div className="p-3">
                                                    <table className={`${styles.invoicetable} w-100`}>
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>Guest Name</th>
                                                                <th>Type</th>
                                                                <th>Age</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td>1</td>
                                                                <td>
                                                                    <strong>
                                                                        {voucherDetail?.holder_details?.title
                                                                            ? `${voucherDetail.holder_details.title} `
                                                                            : ''}
                                                                        {voucherDetail?.holder_details?.name}{' '}
                                                                        {voucherDetail?.holder_details?.surname}
                                                                    </strong>
                                                                </td>
                                                                <td>Adult (Lead)</td>
                                                                <td>
                                                                    {voucherDetail?.holder_details?.age != null
                                                                        ? `${voucherDetail.holder_details.age} Y/O`
                                                                        : '—'}
                                                                </td>
                                                            </tr>
                                                            {extraAdults.map((item, index) => (
                                                                <tr key={`adult-${index}`}>
                                                                    <td>{index + 2}</td>
                                                                    <td>
                                                                        <strong>{item.name} {item.surname}</strong>
                                                                    </td>
                                                                    <td>Adult</td>
                                                                    <td>{item.age != null ? `${item.age} Y/O` : '—'}</td>
                                                                </tr>
                                                            ))}
                                                            {children.map((item, index) => (
                                                                <tr key={`child-${index}`}>
                                                                    <td>{extraAdults.length + index + 2}</td>
                                                                    <td>
                                                                        <strong>{item.name} {item.surname}</strong>
                                                                    </td>
                                                                    <td>Child</td>
                                                                    <td>{item.age != null ? `${item.age} Y/O` : '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="text-end">
                                        <table className={`${styles.totaltable} w-100`}>
                                            <tr>
                                                <td className="fw-bold">Sub Total: {voucherDetail?.pricing?.display_currency} {voucherDetail?.pricing?.booking_amount} <br/> <span className="small text-muted">Included VAT and Taxes</span></td>
                                            </tr>
                                        </table>
                                    </div>
                                    {/* ── Total & Footer ── */}
                                    <div className={styles.invTotalSection}>
                                        <div className={styles.invTotalLabel}>Total:</div>
                                        <div className={styles.invTotalAmount}>
                                            {voucherDetail?.pricing?.display_currency} {voucherDetail?.pricing?.booking_amount}
                                        </div>
                                        <span className="small">Included VAT and Taxes</span>
                                    </div>
                                    <div className={styles.invTotalDivider}></div>
                                    <div className={styles.invTotalNote}>
                                        <b>Account Details</b>
                                        <p>Account Holder Name: Al Hijaz Tours Ltd <br /> Account Number: 58516868 <br /> Sort Code: 309950</p>
                                    </div>
                                    <div className={styles.invTotalDivider}></div>
                                    {voucherDetail?.remark && (
                                        <>
                                            <div className={styles.invTotalNote}>
                                                <b>Special Request</b>
                                                <p>{voucherDetail.remark}</p>
                                            </div>
                                            <div className={styles.invTotalDivider}></div>
                                        </>
                                    )}
                                    <div className={styles.importantInfo}>
                                        <h6 className='fw-bold'>Important Information</h6>
                                        <ul className={styles.infoList}>
                                            <li>Standard Check-in time is 16:00 and Check-out time is 12:00.</li>
                                            <li>Early check-in and late check-out are subject to hotel availability and may incur additional charges.</li>
                                            <li>For group bookings, separate cancellation policies may apply as per the confirmed agreement.</li>
                                            <li>No-show bookings will be charged the full amount of the reservation.</li>
                                            {/* <li>Last-minute cancellations may be subject to charges equivalent to one or more nights depending on the hotel policy.</li> */}
                                            <li>All bookings are subject to the hotel’s standard terms and local regulations.</li>
                                        </ul>
                                    </div>
                                    <div className="text-end mt-4 mb-4">
                                        <p className="mb-0">Thank you and Best Regards</p>
                                        <p className="fw-bold">Al-Hijaz Tours </p>
                                    </div>
                                    <p className="text-center mt-3"><b>Note:</b> This is a computer generated receipt and does not require any physical signature.</p>

                                </div>

                                {/* ── Invoice Footer Bar ── */}
                                <div className={styles.invFooterBar}>
                                    <div className={styles.invFooterLeft}>
                                        <span className={styles.invFooterItem}>
                                            <FaPhone size={13} className={styles.invFooterIcon} />
                                            01217772522
                                        </span>
                                        <span className={styles.invFooterItem}>
                                            <FaEnvelope size={13} className={styles.invFooterIcon} />
                                            info@alhijaztours.net
                                        </span>
                                    </div>
                                    <div className={styles.invFooterRight}>
                                        <span className={styles.invFooterCompany}>
                                            Al-Hijaz Tours
                                        </span>
                                        <span className={styles.invFooterItem}>
                                            www.alhijaztours.net
                                            <FaGlobe size={13} className={styles.invFooterIcon} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </main>
                    )}
                </div>
            </div>
        </div>
    )
}
