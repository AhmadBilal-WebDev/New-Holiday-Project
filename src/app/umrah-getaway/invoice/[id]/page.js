'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './invoice.module.css';
import Image from 'next/image';
import HotelInvoiceLoader from '@/components/Loader/HotelInvoiceLoader';
import moment from 'moment';
import Link from 'next/link';
import {
    FaBus, FaFileInvoice, FaHotel,
    FaHome, FaCheckCircle, FaPhone, FaEnvelope, FaGlobe, FaCalendarAlt, FaMapMarkerAlt,
} from 'react-icons/fa';
import { MdFlight, MdOutlineFileDownload } from 'react-icons/md';
import { IoAirplaneSharp } from 'react-icons/io5';
import airline from '@/util/airlines.json';

export default function Page() {
    const { id } = useParams();
    const [voucherDetail, setVoucherDetail] = useState({});
    const [voucherResponse, setVoucherResponse] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedTransfer, setSelectedTransfer] = useState([]);
    const [selectedVisa, setSelectedVisa] = useState([]);
    const [clientInfo, setClientInfo] = useState({});

    useEffect(() => {
        document.body.style.backgroundColor = '#efefef';
        if (id) { fetchDetails(); }
        return () => { document.body.style.backgroundColor = ''; };
    }, [id]);

    const fetchDetails = async () => {
        setIsLoading(true);
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/booking/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_reference: id }),
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
                setVoucherDetail(res?.Content?.booking.temp_cart);
                setClientInfo(res?.Content?.client);
                setVoucherResponse(res?.Content.booking);
            } else {
                setErrorMessage(res?.Description);
            }
        } catch (err) {
            setIsLoading(false);
            console.error('Error fetching hotel details:', err);
        }
    };

    function capitalize(text) {
        if (!text) return '';
        return String(text).charAt(0).toUpperCase() + String(text).slice(1);
    };

    function getChildrenCount(children) {
        if (Array.isArray(children)) return children.length;
        return Number(children || 0);
    }

    function groupFlightSegments(flight) {
        if (!flight?.segments?.length) return [];
        if (flight.trip_type === 'return') {
            const mid = Math.ceil(flight.segments.length / 2);
            return [
                { segments: flight.segments.slice(0, mid), label: 'Departure' },
                { segments: flight.segments.slice(mid), label: 'Return' },
            ];
        }
        return [{ segments: flight.segments, label: 'Departure' }];
    };

    function convertToCustomerCurrency(price) {
        if (!price || !voucherResponse?.customer_exchange_rate) return Number(price || 0).toFixed(2);
        if (voucherResponse.currency === voucherResponse.customer_currency) {
            return Number(price).toFixed(2);
        }
        const convertedPrice = Number(price) * Number(voucherResponse?.customer_exchange_rate);
        return convertedPrice.toFixed(2);
    }

    return (
        <div className={styles.pageWrapper}>
            {isLoading ? (
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className="bg-white rounded shadow p-3">
                        <HotelInvoiceLoader />
                    </div>
                </div>
            ) : errorMessage ? (
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className={styles.errormessagecontainer}>
                        <div className={styles.errormessagebox}>
                            <div className={styles.erroricon}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="64" height="64">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h2 className={styles.errortitle}>Oops! Something went wrong</h2>
                            <p className={styles.errordescription}>{errorMessage}</p>
                            <Link href="/" className={styles.errorhomebutton}>
                                <FaHome size={16} />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`container px-0 ${styles.confirmationWrapper}`}>
                    <div className={styles.voucherCard}>

                        {/* ── Invoice Header ── */}
                        <div className={styles.invHeader}>
                            <div className={styles.invHeaderLeft}>
                                <div className={`${styles.invHeaderLogo} text-center`}>
                                    <Image src='/images/logoblack.png' height={100} width={150} className="h-auto" quality={100} alt="Logo" />
                                </div>
                                <div className={styles.invHeaderMeta}>
                                    <span>
                                        <FaCalendarAlt size={13} className={styles.invMetaIcon} />
                                        Date: <b>{moment(voucherResponse?.created_at).format('DD-MM-YYYY')}</b>
                                    </span>
                                    <span>
                                        <FaFileInvoice size={13} className={styles.invMetaIcon} />
                                        No: <b>{voucherResponse?.booking_reference}</b>
                                    </span>
                                </div>
                                <div className={styles.invHeaderTitle}>INVOICE</div>
                            </div>
                            <div className={styles.invHeaderRight}>
                                <div className={styles.invBookingFor}>Booking For:</div>
                                <div className={styles.invGuestName}>
                                    {voucherResponse?.lead_details?.title} {voucherResponse?.lead_details?.firstName} {voucherResponse?.lead_details?.lastName}
                                </div>
                                <div className={styles.invHeaderDivider} />
                                <div className={styles.invContactInfo}>
                                    {voucherResponse?.lead_details?.country && (
                                        <p>
                                            <FaMapMarkerAlt size={12} className={styles.invContactIcon} />
                                            {voucherResponse.lead_details.country}
                                        </p>
                                    )}
                                    {voucherResponse?.lead_details?.email && (
                                        <p><FaEnvelope size={12} className={styles.invContactIcon} />{voucherResponse.lead_details.email}</p>
                                    )}
                                    {voucherResponse?.lead_details?.phone && (
                                        <p><FaPhone size={12} className={styles.invContactIcon} />{voucherResponse.lead_details.phone}</p>
                                    )}
                                </div>
                                <div className={styles.invHeaderDivider} />
                                <div className={styles.invStatusRow}>
                                    <span className={`${styles.invStatusBadge} ${voucherResponse?.booking_status === 'confirmed'
                                        ? styles.confirmedStatus
                                        : voucherResponse?.booking_status === 'cancelled'
                                            ? styles.cancelledStatus
                                            : styles.pandingStatus}`}>
                                        <FaCheckCircle size={12} />
                                        STATUS: {voucherResponse?.booking_status?.toUpperCase()}
                                    </span>
                                    {voucherResponse?.payment_status && (
                                        <span className={`${styles.invStatusBadge} ms-1 ${styles.confirmedStatus}`}>
                                            Payment: {voucherResponse?.payment_status.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.downloadinner}>

                            {/* ══════════════════════════════════
                                BOOKED BY
                            ══════════════════════════════════ */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.accomHeader}>
                                    <span className={styles.accomTitle}>• Booked By</span>
                                </div>
                                <div className={styles.accomDivider}></div>
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
                                </div>
                            </div>

                            {/* ══════════════════════════════════
                                ADDITIONAL GUESTS
                            ══════════════════════════════════ */}
                            {(voucherResponse?.other_passengers?.additional_adults?.length > 0
                                || voucherResponse?.other_passengers?.children_details?.length > 0) && (
                                    <div className={styles.sectionBlock}>
                                        <div className={styles.accomHeader}>
                                            <span className={styles.accomTitle}>• Additional Guests</span>
                                        </div>
                                        <div className={styles.accomDivider}></div>
                                        <div className="p-3">
                                            <table className={styles.premiumTable}>
                                                <thead>
                                                    <tr>
                                                        <th className={styles.srCell}>#</th>
                                                        <th>Full Name</th>
                                                        <th>Gender</th>
                                                        <th>Contact</th>
                                                        <th>Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {voucherResponse?.other_passengers?.additional_adults?.map((adult, i) => (
                                                        <tr key={`adult-${i}`}>
                                                            <td className={styles.srCell}>{i + 1}</td>
                                                            <td style={{ fontWeight: 600 }}>{adult.firstName} {adult.lastName}</td>
                                                            <td>{capitalize(adult.gender)}</td>
                                                            <td>{adult.email || '—'}<br/>{adult.phone}</td>
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
                                FLIGHT DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.flight && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Flight Details</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {groupFlightSegments(voucherDetail.flight).map((group, idx) => {
                                            const firstSeg = group.segments[0];
                                            const lastSeg = group.segments[group.segments.length - 1];
                                            const totalMin = group.segments.reduce((acc, seg, idx) => {
                                                let time = acc + seg.duration;
                                                const nextSeg = group.segments[idx + 1];
                                                if (nextSeg) {
                                                    time += moment(nextSeg.departure.datetime).diff(moment(seg.arrival.datetime), 'minutes');
                                                }
                                                return time;
                                            }, 0);
                                            const airlineData = airline.find(a => a.iata === firstSeg?.airline?.code);
                                            return (
                                                <div key={idx} className={styles.flightSegmentCard}>
                                                    <div className={styles.airlineRow}>
                                                        {firstSeg?.airline?.logo_url ? (
                                                            <Image src={firstSeg.airline.logo_url} height={32} width={32} quality={50} alt={firstSeg.airline.code} />
                                                        ) : airlineData?.logo ? (
                                                            <Image src={airlineData.logo} height={32} width={32} quality={50} alt={airlineData.icao || firstSeg?.airline?.code} />
                                                        ) : (
                                                            <MdFlight size={26} color="#E7247A" />
                                                        )}
                                                        <div>
                                                            <p className={styles.airlineNameText}>
                                                                {firstSeg?.airline?.name || airlineData?.name || firstSeg?.airline?.code}
                                                                <span className={styles.cityChip}>{group.label}</span>
                                                            </p>
                                                            <p className={styles.flightNumberText}>
                                                                {firstSeg?.flight_number}&nbsp;·&nbsp;{firstSeg?.cabin_class?.name || capitalize(voucherDetail.flight.trip_type)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.routeGrid}>
                                                        <div className={styles.routeStation}>
                                                            <h4 className={styles.routeCity}>{firstSeg?.departure?.airport_code}</h4>
                                                            <p className={styles.routeAirport}>Departure</p>
                                                            <p className={styles.routeTime}>{moment(firstSeg?.departure?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        </div>
                                                        <div className={styles.routeArrow}>
                                                            <span className={styles.durationLabel}>
                                                                {Math.floor(totalMin / 60)}h {totalMin % 60}m
                                                            </span>
                                                            <div className={styles.arrowLine}>
                                                                <IoAirplaneSharp className={styles.planeIcon} />
                                                            </div>
                                                            {group.segments.length > 1 && (
                                                                <span style={{ fontSize: '11px', color: '#888' }}>{group.segments.length - 1} stop(s)</span>
                                                            )}
                                                        </div>
                                                        <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                            <h4 className={styles.routeCity}>{lastSeg?.arrival?.airport_code}</h4>
                                                            <p className={styles.routeAirport}>Arrival</p>
                                                            <p className={styles.routeTime}>{moment(lastSeg?.arrival?.datetime).format('DD MMM YYYY, HH:mm')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                MAKKAH ACCOMMODATION
                            ══════════════════════════════════ */}
                            {voucherDetail?.makkah_hotel && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Makkah Accommodation</span>
                                        <span className={styles.accomCity}>{voucherDetail.makkah_hotel.nights} Night{voucherDetail.makkah_hotel.nights > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        <div className={styles.flightSegmentCard}>
                                            <div className={styles.airlineRow}>
                                                <FaHotel size={22} color="#E7247A" />
                                                <div>
                                                    <p className={styles.airlineNameText}>
                                                        {voucherDetail.makkah_hotel.name}
                                                        <span className={styles.cityChip}>{voucherDetail.makkah_hotel.city}</span>
                                                    </p>
                                                    <p className={styles.flightNumberText}>{voucherDetail.makkah_hotel.location?.address}</p>
                                                </div>
                                            </div>
                                            <div className={styles.routeGrid}>
                                                <div className={styles.routeStation}>
                                                    <h4 className={styles.routeCity}>CHECK-IN</h4>
                                                    <p className={styles.routeTime}>{moment(voucherDetail.makkah_hotel.check_in).format('DD MMM YYYY')}</p>
                                                </div>
                                                <div className={styles.routeArrow}>
                                                    <span className={styles.durationLabel}>{voucherDetail.makkah_hotel.nights} Night{voucherDetail.makkah_hotel.nights > 1 ? 's' : ''}</span>
                                                    <div className={styles.arrowLine}><FaHotel className={styles.planeIcon} /></div>
                                                </div>
                                                <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                    <h4 className={styles.routeCity}>CHECK-OUT</h4>
                                                    <p className={styles.routeTime}>{moment(voucherDetail.makkah_hotel.check_out).format('DD MMM YYYY')}</p>
                                                </div>
                                            </div>
                                            {voucherDetail.makkah_hotel.rooms?.some(r => r.price_added_to_package) && (
                                                <div className={styles.innerTableWrap}>
                                                    <table className={styles.premiumTable}>
                                                        <thead>
                                                            <tr>
                                                                <th className={styles.srCell}>#</th>
                                                                <th>Room Name</th>
                                                                <th>Board</th>
                                                                <th>Adults</th>
                                                                <th>Children</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {voucherDetail.makkah_hotel.rooms.filter(r => r.price_added_to_package).flatMap((room, ri) =>
                                                                room.rates.filter(rate => rate.price_added_to_package).map((rate, rti) => (
                                                                    <tr key={`mh-${ri}-${rti}`}>
                                                                        <td className={styles.srCell}>{ri + 1}</td>
                                                                        <td style={{ fontWeight: 600 }}>{room.name}</td>
                                                                        <td>{rate.board_name || '—'}</td>
                                                                        <td>{rate.adults ?? 0}</td>
                                                                        <td>{getChildrenCount(rate.children)}</td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                MADINAH ACCOMMODATION
                            ══════════════════════════════════ */}
                            {voucherDetail?.madinah_hotel && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Madinah Accommodation</span>
                                        <span className={styles.accomCity}>{voucherDetail.madinah_hotel.nights} Night{voucherDetail.madinah_hotel.nights > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        <div className={styles.flightSegmentCard}>
                                            <div className={styles.airlineRow}>
                                                <FaHotel size={22} color="#E7247A" />
                                                <div>
                                                    <p className={styles.airlineNameText}>
                                                        {voucherDetail.madinah_hotel.name}
                                                        <span className={styles.cityChip}>{voucherDetail.madinah_hotel.city}</span>
                                                    </p>
                                                    <p className={styles.flightNumberText}>{voucherDetail.madinah_hotel.location?.address}</p>
                                                </div>
                                            </div>
                                            <div className={styles.routeGrid}>
                                                <div className={styles.routeStation}>
                                                    <h4 className={styles.routeCity}>CHECK-IN</h4>
                                                    <p className={styles.routeTime}>{moment(voucherDetail.madinah_hotel.check_in).format('DD MMM YYYY')}</p>
                                                </div>
                                                <div className={styles.routeArrow}>
                                                    <span className={styles.durationLabel}>{voucherDetail.madinah_hotel.nights} Night{voucherDetail.madinah_hotel.nights > 1 ? 's' : ''}</span>
                                                    <div className={styles.arrowLine}><FaHotel className={styles.planeIcon} /></div>
                                                </div>
                                                <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                    <h4 className={styles.routeCity}>CHECK-OUT</h4>
                                                    <p className={styles.routeTime}>{moment(voucherDetail.madinah_hotel.check_out).format('DD MMM YYYY')}</p>
                                                </div>
                                            </div>
                                            {voucherDetail.madinah_hotel.rooms?.some(r => r.price_added_to_package) && (
                                                <div className={styles.innerTableWrap}>
                                                    <table className={styles.premiumTable}>
                                                        <thead>
                                                            <tr>
                                                                <th className={styles.srCell}>#</th>
                                                                <th>Room Name</th>
                                                                <th>Board</th>
                                                                <th>Adults</th>
                                                                <th>Children</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {voucherDetail.madinah_hotel.rooms.filter(r => r.price_added_to_package).flatMap((room, ri) =>
                                                                room.rates.filter(rate => rate.price_added_to_package).map((rate, rti) => (
                                                                    <tr key={`mdh-${ri}-${rti}`}>
                                                                        <td className={styles.srCell}>{ri + 1}</td>
                                                                        <td style={{ fontWeight: 600 }}>{room.name}</td>
                                                                        <td>{rate.board_name || '—'}</td>
                                                                        <td>{rate.adults ?? 0}</td>
                                                                        <td>{getChildrenCount(rate.children)}</td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                TRANSFER DETAILS
                            ══════════════════════════════════ */}
                            {selectedTransfer.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Transfer Details</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {selectedTransfer.map((transfer, index) => (
                                            <div key={index} className={styles.flightSegmentCard}>
                                                <div className={styles.airlineRow}>
                                                    <FaBus size={22} color="#E7247A" />
                                                    <div>
                                                        <p className={styles.airlineNameText}>
                                                            {capitalize(transfer?.vehicle_details?.name)} — {capitalize(transfer?.vehicle)}
                                                        </p>
                                                        <p className={styles.flightNumberText}>
                                                            {capitalize(transfer?.trip_type)}&nbsp;·&nbsp;{transfer?.vehicle_details?.passenger_capacity} Passengers&nbsp;·&nbsp;{transfer?.vehicle_details?.luggage_capacity} Luggage
                                                        </p>
                                                    </div>
                                                </div>
                                                {transfer?.locations?.map((loc, li) => (
                                                    <div key={li} className={styles.routeGrid}>
                                                        <div className={styles.routeStation}>
                                                            <h4 className={styles.routeCity}>PICKUP</h4>
                                                            <p className={styles.routeAirport}>{loc.pickup_address}</p>
                                                        </div>
                                                        <div className={styles.routeArrow}>
                                                            <span className={styles.durationLabel}>{capitalize(transfer?.trip_type)}</span>
                                                            <div className={styles.arrowLine}><FaBus className={styles.planeIcon} /></div>
                                                        </div>
                                                        <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                            <h4 className={styles.routeCity}>DROPOFF</h4>
                                                            <p className={styles.routeAirport}>{loc.dropoff_address}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                VISA DETAILS
                            ══════════════════════════════════ */}
                            {selectedVisa.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Visa Details</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Visa Type</th>
                                                    <th>Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVisa.map((visa, i) => (
                                                    <tr key={i}>
                                                        <td className={styles.srCell}>{i + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{visa?.visa_type || '—'}</td>
                                                        <td>{visa?.description || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                PRICE SUMMARY
                            ══════════════════════════════════ */}
                            {voucherDetail?.pricing && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Price Summary</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th className="text-end">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.pricing.flight_price && (
                                                    <tr>
                                                        <td>Flight</td>
                                                        <td className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(Number(voucherDetail.pricing.flight_price))}</td>
                                                    </tr>
                                                )}
                                                {voucherDetail.pricing.makkah_hotel_price && (
                                                    <tr>
                                                        <td>Hotel Makkah</td>
                                                        <td className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(Number(voucherDetail.pricing.makkah_hotel_price))}</td>
                                                    </tr>
                                                )}
                                                {voucherDetail.pricing.madinah_hotel_price && (
                                                    <tr>
                                                        <td>Hotel Madinah</td>
                                                        <td className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(Number(voucherDetail.pricing.madinah_hotel_price))}</td>
                                                    </tr>
                                                )}
                                                {voucherDetail.transfer_selected_id !== null && voucherDetail.pricing.transfer_price && (
                                                    <tr>
                                                        <td>Transfers</td>
                                                        <td className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(Number(voucherDetail.pricing.transfer_price))}</td>
                                                    </tr>
                                                )}
                                                {voucherDetail.visa_selected_id !== null && voucherDetail.pricing.visa_price && (
                                                    <tr>
                                                        <td>Visa</td>
                                                        <td className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(Number(voucherDetail.pricing.visa_price))}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Total Summary ── */}
                            <div className={styles.invTotalSection}>
                                <div className={styles.invTotalLabel}>Total Amount:</div>
                                <div className={styles.invTotalAmount}>
                                    {voucherDetail?.customer_currency} {Number(voucherDetail?.customer_amount || 0).toFixed(2)}
                                </div>
                                <span className="small">Included VAT and Taxes</span>
                            </div>
                            <div className={styles.invTotalDivider} />

                            {/* ── Important Information ── */}
                            <div className={styles.importantSection}>
                                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                                <div className={styles.importantDivider} />
                                <ul className={styles.importantList}>
                                    <li>The invoice displays the complete pricing details of your Umrah Getaway booking, inclusive of all applicable taxes.</li>
                                    <li>Please verify the information and retain this invoice for your records.</li>
                                    <li>This is a computer-generated receipt and does not require a physical signature.</li>
                                </ul>
                            </div>
                            <div className={styles.invTotalDivider} />

                            {/* ── Footer Bar ── */}
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
                                    <span className={styles.invFooterCompany}>Al-Hijaz Tours</span>
                                    <span className={styles.invFooterItem}>
                                        www.alhijaztours.net
                                        <FaGlobe size={13} className={styles.invFooterIcon} />
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── Action Buttons ── */}
                    <div className={styles.actionRow}>
                        <button className={styles.btnPrimary} onClick={() => window.print()}>
                            <MdOutlineFileDownload size={17} />
                            Print / Download Invoice
                        </button>
                        <Link href={`/umrah-getaway/voucher/${voucherResponse?.booking_reference}`} style={{ textDecoration: 'none' }}>
                            <button className={styles.btnGold}>
                                <FaFileInvoice size={14} />
                                View Voucher
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
