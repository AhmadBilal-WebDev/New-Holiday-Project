'use client'
import styles from "./voucher.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import {
    FaBus, FaFileInvoice, FaHotel, FaPlaneArrival, FaPlaneDeparture,
    FaUser, FaUserFriends, FaHome, FaStar, FaConciergeBell, FaPassport,
} from "react-icons/fa";
import { MdFlight, MdOutlineFileDownload } from "react-icons/md";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";

export default function Page() {
    const { id } = useParams();
    const ref = useRef();
    const [voucherDetail, setVoucherDetail] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [voucherUrl, setVoucherUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') setVoucherUrl(window.location.href);
        document.body.style.backgroundColor = '#efefef';
        fetchDetails();
        return () => { document.body.style.backgroundColor = ''; };
    }, [id]);

    const fetchDetails = async () => {
        setIsLoading(true);
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/booking/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await responses.json();
            setIsLoading(false);
            if (res.Success) {
                setVoucherDetail(res?.Content);
            } else {
                setErrorMessage(res?.Description);
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching package details:", err);
        }
    };

    function capitalize(text) {
        if (!text) return "";
        return String(text).charAt(0).toUpperCase() + String(text).slice(1);
    };

    function capitalizeString(str) {
        if (!str) return "";
        return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    };

    const getTotalGuests = () => {
        const op = voucherDetail?.other_passengers || {};
        const adults = (op.additional_adults?.length || 0) + 1;
        const children = op.children_details?.length || 0;
        const infants = op.infants_details?.length || 0;
        return [
            `${adults} Adult${adults !== 1 ? 's' : ''}`,
            children > 0 && `${children} Child${children !== 1 ? 'ren' : ''}`,
            infants > 0 && `${infants} Infant${infants !== 1 ? 's' : ''}`,
        ].filter(Boolean).join(', ');
    };

    const ctx = voucherDetail?.package_context || {};
    const snapshot = voucherDetail?.package_snapshot || {};
    const hotel = ctx.hotel || snapshot.hotel;
    const flight = ctx.flight || snapshot.flight;
    const transfer = ctx.transfer?.data || ctx.transfer || snapshot.transfer?.data || snapshot.transfer;
    const flightSegments = flight?.segments || flight?.data?.segments || [];
    const originCode = ctx?.searchData?.leavingFrom?.airportCode
        || flight?.search_criteria?.legs?.[0]?.origin
        || flightSegments[0]?.departure?.airport_code;
    const isReturnTrip = ['return', 'Return'].includes(flight?.trip_type)
        || flight?.search_criteria?.AirTripType === 'Return'
        || (flight?.search_criteria?.legs?.length || 0) > 1;
    let outboundFlights = [];
    let returnFlights = [];
    if (isReturnTrip && flightSegments.length >= 2) {
        const mid = Math.ceil(flightSegments.length / 2);
        outboundFlights = flightSegments.slice(0, mid);
        returnFlights = flightSegments.slice(mid);
    } else {
        outboundFlights = originCode
            ? flightSegments.filter(s => s.departure?.airport_code === originCode)
            : flightSegments;
        returnFlights = originCode
            ? flightSegments.filter(s => s.departure?.airport_code !== originCode)
            : [];
        if (!outboundFlights.length && flightSegments.length) {
            outboundFlights = flightSegments;
            returnFlights = [];
        }
    }
    const serviceStatus = voucherDetail?.service_booking_status || {};
    const hotelRooms = ctx.selectedHotelRooms || snapshot.selectedHotelRooms || [];
    const packageServices = (ctx.services || snapshot.services || []).map(s => (s === 'stay' ? 'hotel' : s));
    const checkIn = hotel?.checkIn || ctx?.searchData?.dates?.checkIn || ctx?.searchData?.stayDates?.checkIn;
    const checkOut = hotel?.checkOut || ctx?.searchData?.dates?.checkOut || ctx?.searchData?.stayDates?.checkOut;
    const hotelLocation = [hotel?.city, hotel?.address].filter(Boolean).join(' · ') || hotel?.location || '—';

    const formatDuration = (mins) => {
        if (!mins && mins !== 0) return '—';
        const h = Math.floor(Number(mins) / 60);
        const m = Number(mins) % 60;
        return `${h}h ${m}m`;
    };

    const statusBadgeClass = (status) => {
        if (status === 'cancelled' || status === 'failed') return styles.cancelledBadge;
        if (status === 'tentative' || status === 'pending') return styles.tentativeBadge;
        return styles.confirmedBadge;
    };
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
                                <Image src='/watermark.png' width={450} height={450}
                                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                                    alt="Watermark" quality={100} />
                            </div>

                            {/* ── Company Header ── */}
                            <Image src={voucherDetail?.client?.client_images?.header_image}
                                height={150} width={1000} className="w-100 h-auto d-block"
                                quality={100} alt="Company Header" />

                            {/* ── Title + QR Band ── */}
                            <div className={styles.titleBand}>
                                <div className={styles.titleLeft}>
                                    <h1 className={styles.mainTitle}>Holiday Package Booking<br/> Voucher</h1>
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
                                            <h2 className={styles.voucherNumber}>{voucherDetail?.booking_reference}</h2>
                                            <p className={styles.bookingDetailSmallLabel}>Booking Date:</p>
                                            <p className={styles.bookingDateValue}>
                                                {moment(voucherDetail?.created_at).format('DD-MM-YYYY')}
                                            </p>
                                            <span className={`${styles.confirmedBadge} ${voucherDetail?.booking_status === 'cancelled' ? styles.cancelledBadge : voucherDetail?.booking_status === 'tentative' || voucherDetail?.booking_status === 'pending' ? styles.tentativeBadge : ''}`}>
                                                Status: {voucherDetail?.booking_status?.toUpperCase() || 'CONFIRMED'}
                                            </span>
                                            {voucherDetail?.payment_status && (
                                                <span className={`${styles.confirmedBadge} mt-1 ${voucherDetail?.payment_status === 'paid' ? styles.confirmedBadge : styles.tentativeBadge}`}>
                                                    Payment: {voucherDetail?.payment_status?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.voucherDetailsDivider} />
                                        <div className={styles.voucherDetailsRight}>
                                            <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Lead Passenger:</span>
                                                <span className={styles.bookingDetailValue}>
                                                    {voucherDetail?.lead_details?.title} {voucherDetail?.lead_details?.firstName} {voucherDetail?.lead_details?.lastName}
                                                </span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Route:</span>
                                                <span className={styles.bookingDetailValue}>
                                                    {ctx?.searchData?.leavingFrom?.city || flightSegments[0]?.departure?.city} &rarr; {ctx?.searchData?.goingTo?.city || flightSegments[0]?.arrival?.city}
                                                </span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Total Guests:</span>
                                                <span className={styles.bookingDetailValue}>{getTotalGuests()}</span>
                                            </p>
                                            <p className={styles.bookingDetailLine}>
                                                <span className={styles.bookingDetailLabel}>Duration:</span>
                                                <span className={styles.bookingDetailValue}>
                                                    {checkIn && checkOut ? `${moment(checkOut).diff(moment(checkIn), 'days')} Night(s)` : '—'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ══════════════════════════════════
                                BOOKED SERVICES STATUS
                            ══════════════════════════════════ */}
                            {Object.keys(serviceStatus).length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaConciergeBell size={12} /></span>
                                            BOOKED SERVICES
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Status</th>
                                                    <th>Confirmation Ref</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {serviceStatus.hotel && (
                                                    <tr>
                                                        <td style={{ fontWeight: 600 }}>Hotel</td>
                                                        <td>
                                                            <span className={`${styles.confirmedBadge} ${statusBadgeClass(serviceStatus.hotel.status)}`}>
                                                                {serviceStatus.hotel.status?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>{serviceStatus.hotel.reference || serviceStatus.hotel.invoice_number || '—'}</td>
                                                    </tr>
                                                )}
                                                {serviceStatus.flight && (
                                                    <tr>
                                                        <td style={{ fontWeight: 600 }}>Flight</td>
                                                        <td>
                                                            <span className={`${styles.confirmedBadge} ${statusBadgeClass(serviceStatus.flight.status)}`}>
                                                                {serviceStatus.flight.status?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>{serviceStatus.flight.reference || serviceStatus.flight.order_id || '—'}</td>
                                                    </tr>
                                                )}
                                                {serviceStatus.transfer && (
                                                    <tr>
                                                        <td style={{ fontWeight: 600 }}>Transfer</td>
                                                        <td>
                                                            <span className={`${styles.confirmedBadge} ${statusBadgeClass(serviceStatus.transfer.status)}`}>
                                                                {serviceStatus.transfer.status?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>{serviceStatus.transfer.reference || '—'}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

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
                                                    {voucherDetail?.lead_details?.title} {voucherDetail?.lead_details?.firstName} {voucherDetail?.lead_details?.lastName}
                                                </td>
                                                <td>{voucherDetail?.lead_details?.email || '—'}</td>
                                                <td>{voucherDetail?.lead_details?.phoneCode}{voucherDetail?.lead_details?.phone || '—'}</td>
                                                <td>{capitalize(voucherDetail?.lead_details?.gender) || '—'}</td>
                                                <td>{voucherDetail?.lead_details?.country || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    {voucherDetail?.lead_address && (
                                        <div className={styles.addressRow}>
                                            <span className={styles.addressLabel}>Address:</span>
                                            <span className={styles.addressValue}>{voucherDetail?.lead_address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ══════════════════════════════════
                                ADDITIONAL GUESTS
                            ══════════════════════════════════ */}
                            {(voucherDetail?.other_passengers?.additional_adults?.length > 0
                                || voucherDetail?.other_passengers?.children_details?.length > 0
                                || voucherDetail?.other_passengers?.infants_details?.length > 0
                            ) && (
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
                                                    {voucherDetail?.other_passengers?.additional_adults?.map((adult, i) => (
                                                        <tr key={`adult-${i}`}>
                                                            <td className={styles.srCell}>{i + 1}</td>
                                                            <td style={{ fontWeight: 600 }}>{adult.title} {adult.firstName} {adult.lastName}</td>
                                                            <td>{capitalize(adult.gender)}</td>
                                                            <td><span className={styles.typeBadge}>Adult</span></td>
                                                        </tr>
                                                    ))}
                                                    {voucherDetail?.other_passengers?.children_details?.map((child, i) => (
                                                        <tr key={`child-${i}`}>
                                                            <td className={styles.srCell}>{(voucherDetail?.other_passengers?.additional_adults?.length || 0) + i + 1}</td>
                                                            <td style={{ fontWeight: 600 }}>{child.title} {child.firstName} {child.lastName}</td>
                                                            <td>{capitalize(child.gender)}</td>
                                                            <td><span className={`${styles.typeBadge} ${styles.typeBadgeChild}`}>Child</span></td>
                                                        </tr>
                                                    ))}
                                                    {voucherDetail?.other_passengers?.infants_details?.map((infant, i) => {
                                                        const offset = (voucherDetail?.other_passengers?.additional_adults?.length || 0) + (voucherDetail?.other_passengers?.children_details?.length || 0);
                                                        return (
                                                            <tr key={`infant-${i}`}>
                                                                <td className={styles.srCell}>{offset + i + 1}</td>
                                                                <td style={{ fontWeight: 600 }}>{infant.title} {infant.firstName} {infant.lastName}</td>
                                                                <td>{capitalize(infant.gender)}</td>
                                                                <td><span className={`${styles.typeBadge} ${styles.typeBadgeInfant}`}>Infant</span></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                            {/* ══════════════════════════════════
                                ACCOMMODATION DETAILS
                            ══════════════════════════════════ */}
                            {hotel?.name && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaHotel size={12} /></span>
                                            ACCOMMODATION DETAILS
                                        </div>
                                    </div>
                                    <div className={styles.segmentsWrapper}>
                                        <div className={styles.flightSegmentCard}>
                                            <div className={styles.airlineRow}>
                                                <FaHotel size={22} color="#E7247A" />
                                                <div>
                                                    <p className={styles.airlineNameText}>
                                                        {capitalizeString(hotel.name)}
                                                    </p>
                                                    <p className={styles.flightNumberText}>Location: {capitalizeString(hotelLocation)}</p>
                                                    {serviceStatus.hotel?.reference && (
                                                        <p className={styles.flightNumberText}>
                                                            Confirmation: {serviceStatus.hotel.reference}
                                                            {serviceStatus.hotel.invoice_number ? ` · Invoice: ${serviceStatus.hotel.invoice_number}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.routeGrid}>
                                                <div className={styles.routeStation}>
                                                    <h4 className={styles.routeCity}>CHECK-IN</h4>
                                                    <p className={styles.routeTime}>{checkIn ? moment(checkIn).format('DD MMM YYYY') : '—'}</p>
                                                </div>
                                                <div className={styles.routeArrow}>
                                                    <span className={styles.durationLabel}>
                                                        {checkIn && checkOut ? `${moment(checkOut).diff(moment(checkIn), 'days')} Night(s)` : '—'}
                                                    </span>
                                                    <div className={styles.arrowLine}>
                                                        <FaHotel className={styles.planeIcon} />
                                                    </div>
                                                </div>
                                                <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                    <h4 className={styles.routeCity}>CHECK-OUT</h4>
                                                    <p className={styles.routeTime}>{checkOut ? moment(checkOut).format('DD MMM YYYY') : '—'}</p>
                                                </div>
                                            </div>
                                            {hotelRooms.length > 0 && (
                                                <div className={styles.innerTableWrap}>
                                                    <table className={styles.premiumTable}>
                                                        <thead>
                                                            <tr>
                                                                <th className={styles.srCell}>#</th>
                                                                <th>Room Type</th>
                                                                <th>Board</th>
                                                                <th>Qty</th>
                                                                <th>Adults</th>
                                                                <th>Children</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {hotelRooms.map((room, rindex) => (
                                                                <tr key={rindex}>
                                                                    <td className={styles.srCell}>{rindex + 1}</td>
                                                                    <td style={{ fontWeight: 600 }}>{room.roomType || '—'}</td>
                                                                    <td>{room.boardName || '—'}</td>
                                                                    <td className="text-center">{room.quantity}</td>
                                                                    <td className="text-center">{room.adults}</td>
                                                                    <td className="text-center">{room.children}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                OUTBOUND FLIGHT
                            ══════════════════════════════════ */}
                            {outboundFlights.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaPlaneDeparture size={12} /></span>
                                            OUTBOUND FLIGHT DETAILS
                                            
                                        </div>
                                    </div>
                                    <div className={styles.segmentsWrapper}>
                                        {outboundFlights.map((seg, fIndex) => (
                                            <div key={`dep-${fIndex}`} className={styles.flightSegmentCard}>
                                                <div className={styles.airlineRow}>
                                                    {seg.airline?.logo_url
                                                        ? <img src={seg.airline.logo_url} alt={seg.airline.name} style={{ height: 28, objectFit: 'contain' }} />
                                                        : <MdFlight size={26} color="#E7247A" />}
                                                    <div>
                                                        <p className={styles.airlineNameText}>{seg.airline?.name}</p>
                                                        <p className={styles.flightNumberText}>
                                                            Flight {seg.airline?.code}{seg.flight_number}&nbsp;·&nbsp;{seg.cabin_class?.name}
                                                            &nbsp;·&nbsp;{seg.stops === 0 ? 'Non-stop' : `${seg.stops} Stop(s)`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={styles.routeGrid}>
                                                    <div className={styles.routeStation}>
                                                        <h4 className={styles.routeCity}>{seg.departure?.airport_code}</h4>
                                                        <p className={styles.routeAirport}>{seg.departure?.city}</p>
                                                        <p className={styles.routeTime}>{moment(seg.departure?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        {seg.departure?.terminal && <p className={styles.routeAirport}>Terminal {seg.departure.terminal}</p>}
                                                    </div>
                                                    <div className={styles.routeArrow}>
                                                        <span className={styles.durationLabel}>{formatDuration(seg.duration)}</span>
                                                        <div className={styles.arrowLine}>
                                                            <MdFlight className={styles.planeIcon} />
                                                        </div>
                                                    </div>
                                                    <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                        <h4 className={styles.routeCity}>{seg.arrival?.airport_code}</h4>
                                                        <p className={styles.routeAirport}>{seg.arrival?.city}</p>
                                                        <p className={styles.routeTime}>{moment(seg.arrival?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        {seg.arrival?.terminal && <p className={styles.routeAirport}>Terminal {seg.arrival.terminal}</p>}
                                                    </div>
                                                </div>
                                                {seg.baggage_info?.adult && (
                                                    <div className={styles.innerTableWrap} style={{ marginTop: 8 }}>
                                                        <table className={styles.premiumTable}>
                                                            <thead><tr><th>Cabin Baggage</th><th>Checked Baggage</th></tr></thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{seg.baggage_info.adult.cabin || '—'}</td>
                                                                    <td>{seg.baggage_info.adult.checked || '—'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                RETURN FLIGHT
                            ══════════════════════════════════ */}
                            {returnFlights.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaPlaneArrival size={12} /></span>
                                            RETURN FLIGHT DETAILS
                                        </div>
                                    </div>
                                    <div className={styles.segmentsWrapper}>
                                        {returnFlights.map((seg, fIndex) => (
                                            <div key={`ret-${fIndex}`} className={styles.flightSegmentCard}>
                                                <div className={styles.airlineRow}>
                                                    {seg.airline?.logo_url
                                                        ? <img src={seg.airline.logo_url} alt={seg.airline.name} style={{ height: 28, objectFit: 'contain' }} />
                                                        : <MdFlight size={26} color="#E7247A" />}
                                                    <div>
                                                        <p className={styles.airlineNameText}>{seg.airline?.name}</p>
                                                        <p className={styles.flightNumberText}>
                                                            Flight {seg.airline?.code}{seg.flight_number}&nbsp;·&nbsp;{seg.cabin_class?.name}
                                                            &nbsp;·&nbsp;{seg.stops === 0 ? 'Non-stop' : `${seg.stops} Stop(s)`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={styles.routeGrid}>
                                                    <div className={styles.routeStation}>
                                                        <h4 className={styles.routeCity}>{seg.departure?.airport_code}</h4>
                                                        <p className={styles.routeAirport}>{seg.departure?.city}</p>
                                                        <p className={styles.routeTime}>{moment(seg.departure?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        {seg.departure?.terminal && <p className={styles.routeAirport}>Terminal {seg.departure.terminal}</p>}
                                                    </div>
                                                    <div className={styles.routeArrow}>
                                                        <span className={styles.durationLabel}>{formatDuration(seg.duration)}</span>
                                                        <div className={styles.arrowLine}>
                                                            <MdFlight className={styles.planeIcon} />
                                                        </div>
                                                    </div>
                                                    <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                        <h4 className={styles.routeCity}>{seg.arrival?.airport_code}</h4>
                                                        <p className={styles.routeAirport}>{seg.arrival?.city}</p>
                                                        <p className={styles.routeTime}>{moment(seg.arrival?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        {seg.arrival?.terminal && <p className={styles.routeAirport}>Terminal {seg.arrival.terminal}</p>}
                                                    </div>
                                                </div>
                                                {seg.baggage_info?.adult && (
                                                    <div className={styles.innerTableWrap} style={{ marginTop: 8 }}>
                                                        <table className={styles.premiumTable}>
                                                            <thead><tr><th>Cabin Baggage</th><th>Checked Baggage</th></tr></thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td>{seg.baggage_info.adult.cabin || '—'}</td>
                                                                    <td>{seg.baggage_info.adult.checked || '—'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                TRANSFER DETAILS
                            ══════════════════════════════════ */}
                            {(transfer?.locations?.length > 0 || transfer?.vehicle || transfer?.vehicle_details) && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaBus size={12} /></span>
                                            TRANSFER DETAILS
                                            {serviceStatus.transfer?.reference && (
                                                <span className={styles.cityChip} style={{ marginLeft: 8 }}>
                                                    Ref: {serviceStatus.transfer.reference}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.segmentsWrapper}>
                                        <div className={styles.flightSegmentCard}>
                                            <div className={styles.airlineRow}>
                                                <FaBus size={22} color="#E7247A" />
                                                <div>
                                                    <p className={styles.airlineNameText}>
                                                        {capitalize(transfer?.vehicle_details?.name || transfer?.vehicle || 'Transfer')}
                                                        {transfer?.vehiclecategory?.name && (
                                                            <span className={styles.cityChip}>{transfer.vehiclecategory.name}</span>
                                                        )}
                                                    </p>
                                                    <p className={styles.flightNumberText}>
                                                        {[
                                                            transfer?.trip_type && capitalize(transfer.trip_type),
                                                            transfer?.vehicle_details?.passenger_capacity && `${transfer.vehicle_details.passenger_capacity} Passengers`,
                                                            transfer?.vehicle_details?.transmission_type,
                                                        ].filter(Boolean).join(' · ') || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            {(transfer.locations || []).map((loc, idx) => (
                                                <div key={idx} className={styles.routeGrid}>
                                                    <div className={styles.routeStation}>
                                                        <h4 className={styles.routeCity}>PICKUP</h4>
                                                        <p className={styles.routeAirport}>{loc.pickup_title}</p>
                                                        <p className={styles.routeTime}>{loc.pickup_address}</p>
                                                    </div>
                                                    <div className={styles.routeArrow}>
                                                        <span className={styles.durationLabel}>{capitalize(transfer?.trip_type) || 'Transfer'}</span>
                                                        <div className={styles.arrowLine}>
                                                            <FaBus className={styles.planeIcon} />
                                                        </div>
                                                    </div>
                                                    <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                        <h4 className={styles.routeCity}>DROPOFF</h4>
                                                        <p className={styles.routeAirport}>{loc.dropoff_title}</p>
                                                        <p className={styles.routeTime}>{loc.dropoff_address}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                ADDITIONAL SERVICES
                            ══════════════════════════════════ */}
                            {voucherDetail?.additional_services?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaConciergeBell size={12} /></span>
                                            ADDITIONAL SERVICES
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Service Name</th>
                                                    <th className="text-center">Quantity / Pax</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.additional_services.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className={styles.srCell}>{index + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                                        <td className="text-center">{item.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                VISA DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.visas?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><FaPassport size={12} /></span>
                                            VISA DETAILS
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Visa Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.visas.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className={styles.srCell}>{index + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{item?.visa_type || '—'} <br /> {item?.visa_description}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Important Information ── */}
                            <div className={styles.importantSection}>
                                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                                <div className={styles.importantDivider} />
                                <ul className={styles.importantList}>
                                    <li>Please present this voucher at check-in for all included services.</li>
                                    <li>All passengers must carry valid photo identification at all times.</li>
                                    <li>Check-in times and service schedules are subject to operator confirmation.</li>
                                    <li>This package voucher covers only the services listed above.</li>
                                    <li>This is a computer-generated receipt and does not require a physical signature.</li>
                                </ul>
                            </div>

                            {/* ── Company Footer ── */}
                            <Image src={voucherDetail?.client?.client_images?.footer_image}
                                height={150} width={1000} className="w-100 h-auto d-block"
                                quality={100} alt="Company Footer" />
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
                        <Link href={`/holiday-packages/invoice/${voucherDetail?.booking_reference}`} style={{ textDecoration: 'none' }}>
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
