'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './voucher.module.css';
import Image from 'next/image';
import FlightDetail from '@/components/UmrahGetAway/Voucher/FlightDetail';
import HotelDetail from '@/components/UmrahGetAway/Voucher/HotelDetail';
import Transfer from '@/components/UmrahGetAway/Voucher/Transfer';
import VisaDetail from '@/components/UmrahGetAway/Voucher/VisaDetail';
import HotelInvoiceLoader from '@/components/Loader/HotelInvoiceLoader';
import { FaFileInvoice, FaHome, FaUser, FaUserFriends} from 'react-icons/fa';
import { MdOutlineFileDownload } from 'react-icons/md';
import { IoWarningOutline } from 'react-icons/io5';
import QRCode from 'react-qr-code';
import moment from 'moment';
import Link from 'next/link';

export default function Page() {
    const { id } = useParams();
    const [voucherDetail, setvoucherDetail] = useState({});
    const [voucherResponse, setvoucherResponse] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedTransfer, setSelectedTransfer] = useState([]);
    const [selectedVisa, setSelectedVisa] = useState([]);
    const [clientInfo, setClientInfo] = useState({});

    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        setIsLoading(true);
        const Request = { "booking_reference": id };
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/booking/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Request)
            });
            const res = await responses.json();
            setIsLoading(false);
            if (res.Success) {
                if (res?.Content?.booking.temp_cart.transfer_selected_id !== null) {
                    setSelectedTransfer([res?.Content?.booking.temp_cart.transfer]);
                }
                if (res?.Content?.booking.temp_cart.visa_selected_id !== null) {
                    setSelectedVisa([res?.Content?.booking.temp_cart.visa]);
                }
                setvoucherDetail(res?.Content?.booking.temp_cart);
                setClientInfo(res?.Content?.client);
                setvoucherResponse(res?.Content.booking);
            } else {
                setErrorMessage(res?.Description);
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching voucher details:", err);
        }
    };

    function capitalize(text) {
        if (!text) return "";
        const s = String(text);
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    const getTotalGuests = () => {
        const adults = voucherResponse?.other_passengers?.additional_adults?.length || 0;
        const children = voucherResponse?.other_passengers?.children_details?.length || 0;
        return adults + children + 1;
    };

    const voucherUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className={styles.pageWrapper}>
            {isLoading ? (
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className="bg-white rounded shadow p-3">
                        <HotelInvoiceLoader />
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
                        <div className={styles.voucherCard}>

                            {/* ── Watermark ── */}
                            <div className={styles.watermark}>
                                <Image src='/watermark.png' width={450} height={450}
                                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                                    alt="Watermark" quality={100} />
                            </div>

                            {/* ── Company Header ── */}
                            {clientInfo?.client_images?.header_image && (
                                <Image src={clientInfo.client_images.header_image}
                                    height={150} width={1000} className="w-100 h-auto d-block"
                                    quality={100} alt="Company Header" />
                            )}

                            {/* ── Title + QR Band ── */}
                            <div className={styles.titleBand}>
                                <div className={styles.titleLeft}>
                                    <h1 className={styles.mainTitle}>Umrah Getaway Voucher</h1>
                                    <p className={styles.mainSubtitle}>Thank you for choosing Alhijaz Tours</p>
                                </div>
                                <div className={styles.titleRight}>
                                    <div className={styles.qrWrapper}>
                                        <QRCode value={voucherUrl || ' '} size={78} bgColor="#ffffff" fgColor="#1a1a1a" />
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
                                            <p className={styles.voucherNoLabel}>BOOKING REFERENCE:</p>
                                            <h2 className={styles.voucherNumber}>{voucherResponse?.booking_reference}</h2>
                                            <p className={styles.bookingDetailSmallLabel}>Booking Date:</p>
                                            <p className={styles.bookingDateValue}>
                                                {moment(voucherResponse?.created_at).format('DD-MM-YYYY')}
                                            </p>
                                            <span className={`${styles.confirmedBadge} ${voucherResponse?.booking_status === 'cancelled' ? styles.cancelledBadge : voucherResponse?.booking_status === 'tentative' || voucherResponse?.booking_status === 'pending' ? styles.tentativeBadge : ''}`}>
                                                Status: {voucherResponse?.booking_status?.toUpperCase() || 'CONFIRMED'}
                                            </span>
                                            {voucherResponse?.payment_status && (
                                                <span className={`${styles.confirmedBadge} mt-1`}>
                                                    Payment: {voucherResponse?.payment_status.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.voucherDetailsDivider} />
                                        <div className={styles.voucherDetailsRight}>
                                            <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Lead Passenger:</span>
                                                <span className={styles.bookingDetailValue}>
                                                    {voucherResponse?.lead_details?.title} {voucherResponse?.lead_details?.firstName} {voucherResponse?.lead_details?.lastName}
                                                </span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Total Guests:</span>
                                                <span className={styles.bookingDetailValue}>{getTotalGuests()}</span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Email:</span>
                                                <span className={styles.bookingDetailValue}>{voucherResponse?.lead_details?.email || '—'}</span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Phone:</span>
                                                <span className={styles.bookingDetailValue}>{voucherResponse?.lead_details?.phone || '—'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ══════════════════════════════════
                                LEAD PASSENGER
                            ══════════════════════════════════ */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeader}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={styles.sectionIconWrap}><FaUser size={12} /></span>
                                        LEAD PASSENGER
                                    </div>
                                </div>
                                <div className="p-3">
                                    <table className={styles.premiumTable}>
                                        <thead>
                                            <tr>
                                                <th>Full Name</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Gender</th>
                                                <th>Country</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: 600 }}>
                                                    {voucherResponse?.lead_details?.title} {voucherResponse?.lead_details?.firstName} {voucherResponse?.lead_details?.lastName}
                                                </td>
                                                <td>{voucherResponse?.lead_details?.email || '—'}</td>
                                                <td>{voucherResponse?.lead_details?.phone || '—'}</td>
                                                <td>{capitalize(voucherResponse?.lead_details?.gender) || '—'}</td>
                                                <td>{voucherResponse?.lead_details?.country || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    {voucherResponse?.lead_details?.address && (
                                        <div className={styles.addressRow}>
                                            <span className={styles.addressLabel}>Address:</span>
                                            <span className={styles.addressValue}>{voucherResponse.lead_details.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ══════════════════════════════════
                                ADDITIONAL GUESTS
                            ══════════════════════════════════ */}
                            {(voucherResponse?.other_passengers?.additional_adults?.length > 0 || voucherResponse?.other_passengers?.children_details?.length > 0) && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaUserFriends size={12} /></span>
                                            ADDITIONAL GUESTS
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Full Name</th>
                                                    <th>Gender</th>
                                                    <th>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherResponse?.other_passengers?.additional_adults?.map((adult, i) => (
                                                    <tr key={`adult-${i}`}>
                                                        <td className={styles.srCell}>{i + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{adult.firstName} {adult.lastName}</td>
                                                        <td>{capitalize(adult.gender)}</td>
                                                        <td><span className={styles.typeBadge}>Adult</span></td>
                                                    </tr>
                                                ))}
                                                {voucherResponse?.other_passengers?.children_details?.map((child, i) => (
                                                    <tr key={`child-${i}`}>
                                                        <td className={styles.srCell}>{(voucherResponse?.other_passengers?.additional_adults?.length || 0) + i + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{child.firstName} {child.lastName}</td>
                                                        <td>{capitalize(child.gender)}</td>
                                                        <td><span className={`${styles.typeBadge} ${styles.typeBadgeChild}`}>Child</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                SERVICE DETAILS (existing components)
                            ══════════════════════════════════ */}
                            {voucherDetail?.flight && <FlightDetail FlightData={voucherDetail?.flight || {}} type='receipt' />}
                            {voucherDetail?.makkah_hotel && <HotelDetail HotelData={voucherDetail?.makkah_hotel || {}} type='receipt' />}
                            {voucherDetail?.madinah_hotel && <HotelDetail HotelData={voucherDetail?.madinah_hotel || {}} type='receipt' />}
                            {selectedTransfer.length > 0 && <Transfer TransferData={selectedTransfer} />}
                            {selectedVisa.length > 0 && <VisaDetail VisaDetail={selectedVisa} type='receipt' />}

                            {/* ── Important Information ── */}
                            <div className={styles.importantSection}>
                                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                                <div className={styles.importantDivider} />
                                <ul className={styles.importantList}>
                                    <li>Please present this voucher at check-in for all included services.</li>
                                    <li>All passengers must carry valid photo identification at all times.</li>
                                    <li>Check-in times and service schedules are subject to operator confirmation.</li>
                                    <li>This voucher covers only the services listed above.</li>
                                    <li>This is a computer-generated receipt and does not require a physical signature.</li>
                                </ul>
                            </div>

                            {/* ── Company Footer ── */}
                            {clientInfo?.client_images?.footer_image && (
                                <Image src={clientInfo.client_images.footer_image}
                                    height={150} width={1000} className="w-100 h-auto d-block"
                                    quality={100} alt="Company Footer" />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Action Buttons ── */}
            {!isLoading && !errorMessage && (
                <div className={`container mb-3 px-0 ${styles.confirmationWrapper}`}>
                    <div className={styles.actionRow}>
                        <button className={styles.btnPrimary} onClick={() => window.print()}>
                            <MdOutlineFileDownload size={17} />
                            Print / Download Voucher
                        </button>
                        <Link href={`/umrah-getaway/invoice/${voucherResponse?.booking_reference}`} style={{ textDecoration: 'none' }}>
                            <button className={styles.btnGold}>
                                <FaFileInvoice size={14} />
                                View Invoice
                            </button>
                        </Link>
                        <Link href='/' style={{ textDecoration: 'none' }}>
                            <button className={styles.btnPrimary} style={{ background: 'linear-gradient(135deg, #444, #666)' }}>
                                <FaHome size={14} />
                                Go to Home
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
