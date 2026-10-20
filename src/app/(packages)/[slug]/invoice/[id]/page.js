'use client'
import styles from "./invoice.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import {
    FaBus, FaFileInvoice, FaHotel, FaPlaneArrival, FaPlaneDeparture,
    FaUser, FaUserFriends, FaHome, FaStar, FaConciergeBell, FaPassport,
    FaCheckCircle, FaPhone, FaEnvelope, FaGlobe, FaCalendarAlt, FaMapMarkerAlt,
    FaFileAlt, FaFileContract,
} from "react-icons/fa";
import { MdFlight, MdOutlineFileDownload } from "react-icons/md";
import Link from "next/link";
import { IoWarningOutline } from "react-icons/io5";

export default function Page() {
    const { id } = useParams();
    const ref = useRef();
    const [voucherDetail, setVoucherDetail] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        document.body.style.backgroundColor = '#efefef';
        fetchDetails();
        return () => { document.body.style.backgroundColor = ''; };
    }, [id]);

    const fetchDetails = async () => {
        setIsLoading(true);
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/packages/booking/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await responses.json();
            setIsLoading(false);
            if (res.Success) {
                const uniqueRooms = [
                    ...new Map(res?.Content?.booking.room_selections_original.map(room => [room.type, room])).values()
                ];
                res.Content.booking.room_selections_original = uniqueRooms;
                setVoucherDetail(res?.Content?.booking);
            } else {
                setErrorMessage(res?.Title);
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching package details:", err);
        }
    };

    function formatLabel(count, singular, plural) {
        return `${count} ${count === 1 ? singular : plural}`;
    }

    function capitalize(text) {
        if (!text) return "";
        return String(text).charAt(0).toUpperCase() + String(text).slice(1);
    }

    function convertToCustomerCurrency(price) {
        if (!price || !voucherDetail.customer_exchange_rate) return Number(price || 0).toFixed(2);
        if (voucherDetail.currency_code === voucherDetail.customer_currency) {
            return Number(price).toFixed(2);
        }
        const convertedPrice = Number(price) * Number(voucherDetail.customer_exchange_rate);
        return convertedPrice.toFixed(2);
    }

    function CalCulateRoomPrice(room) {
        let price = 0;
        price += Number(room.adultsInRoom >= 0 ? room.adultsInRoom : room.adults) * Number(room?.sale_per_person ? room.sale_per_person : room.adultPrice);
        price += Number(room.childrenInRoom >= 0 ? room.childrenInRoom : room.children) * Number(room?.child_sale_per_person ? room.child_sale_per_person : room.childPrice);
        price += Number(room.infantsInRoom >= 0 ? room.infantsInRoom : room.infants) * Number(room?.infant_sale_per_person ? room.infant_sale_per_person : room.infantPrice);
        if (room.adults_without_bed) {
            price += Number(room.adults_without_bed || 0) * Number(room?.adult_without_bed_price);
        }
        if (room.children_without_bed) {
            price += Number(room.children_without_bed || 0) * Number(room?.child_without_bed_price);
        }
        if (room.infants_without_bed) {
            price += Number(room.infants_without_bed || 0) * Number(room?.infant_without_bed_price);
        }

        return convertToCustomerCurrency(price);
    }
    function capitalizeString(str) {
        if (!str) return "";
        return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }

    const EXCURSION_CITY_ORDER = ['Makkah', 'Madinah'];

    function groupExcursionsByCity(excursions) {
        if (!Array.isArray(excursions) || excursions.length === 0) return {};
        const groups = {};
        excursions.forEach((exc) => {
            const city = exc?.city || 'Other';
            if (!groups[city]) groups[city] = [];
            groups[city].push(exc);
        });
        const ordered = {};
        EXCURSION_CITY_ORDER.forEach((city) => {
            if (groups[city]) ordered[city] = groups[city];
        });
        Object.keys(groups)
            .filter((city) => !EXCURSION_CITY_ORDER.includes(city))
            .sort()
            .forEach((city) => {
                ordered[city] = groups[city];
            });
        return ordered;
    }

    function getTransferExcursions(transfer) {
        return transfer?.items?.data?.excursions ?? [];
    }

    const CalculateWithoutBeds = (type) => {
        const RoomList = voucherDetail?.room_selections_original.filter(room => room.type === type) || [];

        const adults = RoomList.reduce((sum, room) => sum + (room.adults_without_bed || 0), 0);
        const children = RoomList.reduce((sum, room) => sum + (room.children_without_bed || 0), 0);
        const infants = RoomList.reduce((sum, room) => sum + (room.infants_without_bed || 0), 0);

        // ✅ agar sab zero hain
        if (adults === 0 && children === 0 && infants === 0) {
            return "-";
        }

        return `${adults} Adult${adults !== 1 ? 's' : ''}, ${children} Child${children !== 1 ? 'ren' : ''}, ${infants} Infant${infants !== 1 ? 's' : ''}`;
    };
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
                    <div ref={ref} className={styles.voucherCard}>

                        {/* ── Watermark ── */}
                        <div className={styles.watermark}>
                            <Image src='/watermark.png' width={450} height={450}
                                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                                alt="Watermark" quality={100} />
                        </div>

                        {/* ── Invoice Header (Hotel Invoice Style) ── */}
                        <div className={styles.invHeader}>
                            {/* Left panel */}
                            <div className={styles.invHeaderLeft}>
                                <div className={`${styles.invHeaderLogo} text-center`}>
                                    <Image src='/images/logoblack.png' height={100} width={150} className="h-auto" quality={100} alt="Logo" />
                                </div>
                                <div className={styles.invHeaderMeta}>
                                    <span>
                                        <FaCalendarAlt size={13} className={styles.invMetaIcon} />
                                        Date: <b>  {moment(voucherDetail?.created_at, 'DD-MM-YYYY HH:mm:ss').format('DD-MM-YYYY')}</b>
                                    </span>
                                    <span>
                                        <FaFileInvoice size={13} className={styles.invMetaIcon} />
                                        No: <b>{voucherDetail?.booking_reference}</b>
                                    </span>
                                </div>
                                <div className={styles.invHeaderTitle}>INVOICE</div>
                            </div>
                            {/* Right panel */}
                            <div className={styles.invHeaderRight}>
                                <div className={styles.invBookingFor}>Booking For:</div>
                                <div className={styles.invGuestName}>
                                    {voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}

                                </div>
                                <div className={styles.invHeaderDivider} />
                                <div className={styles.invContactInfo}>
                                    {(voucherDetail?.lead_address || voucherDetail?.lead_country) && (
                                        <p>
                                            <FaMapMarkerAlt size={12} className={styles.invContactIcon} />
                                            {voucherDetail?.lead_address || voucherDetail?.lead_country}
                                        </p>
                                    )}
                                    {voucherDetail?.lead_email && (
                                        <p><FaEnvelope size={12} className={styles.invContactIcon} />{voucherDetail.lead_email}</p>
                                    )}
                                    {voucherDetail?.lead_phone && (
                                        <p><FaPhone size={12} className={styles.invContactIcon} />{voucherDetail?.lead_phone_code}{voucherDetail.lead_phone}</p>
                                    )}
                                </div>
                                <div className={styles.invHeaderDivider} />
                                <div className={styles.invStatusRow}>
                                    <span className={`${styles.invStatusBadge} ${voucherDetail?.booking_status === 'confirmed'
                                        ? styles.confirmedStatus
                                        : voucherDetail?.booking_status === 'cancelled'
                                            ? styles.cancelledStatus
                                            : styles.pandingStatus}`}>
                                        STATUS: {voucherDetail?.booking_status?.toUpperCase()}
                                    </span>
                                    <span className={`${styles.invStatusBadge} ms-1 ${voucherDetail?.payment_status === 'paid'
                                        ? styles.confirmedStatus
                                        : voucherDetail?.payment_status === 'pending'
                                            ? styles.cancelledStatus
                                            : styles.pandingStatus}`}>
                                        PAYMENT: {voucherDetail?.payment_status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Gold Divider ── */}
                        {/* <div className={styles.goldDivider} /> */}

                        <div className={styles.downloadinner}>
                            {/* ══════════════════════════════════
                                PACKAGE DETAILS
                            ══════════════════════════════════ */}
                            <div className={styles.sectionBlock}>
                                {/* <div className={styles.sectionHeader}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className={styles.sectionIconWrap}><FaStar size={12} /></span>
                                        PACKAGE DETAILS
                                    </div>
                                </div> */}
                                <div className={styles.accomHeader}>
                                    <span className={styles.accomTitle}>• Package Details</span>
                                </div>
                                <div className={styles.accomDivider}></div>
                                <div className={styles.packageInfoGrid}>
                                    <div className={styles.packageInfoMain}>
                                        <h3 className={styles.packageTitle}>{voucherDetail?.packageDetails?.title}</h3>
                                        {voucherDetail?.packageDetails?.star_rating && (
                                            <div className={styles.starRow}>
                                                {Array(Math.floor(Number(voucherDetail?.packageDetails?.star_rating || 0))).fill(0).map((_, i) => (
                                                    <FaStar key={i} size={13} color="#c49a2a" />
                                                ))}
                                                <span className={styles.starLabel}>{voucherDetail?.packageDetails?.star_rating} Star Package</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.packageInfoDates}>
                                        <div className={styles.hotelDateRow}>
                                            <span className={styles.hotelDateLabel}>Start Date:</span>
                                            <span className={styles.hotelDateValue}>{moment(voucherDetail?.packageDetails?.start_date).format('DD MMMM YYYY')}</span>
                                        </div>
                                        <div className={styles.hotelDateRow}>
                                            <span className={styles.hotelDateLabel}>End Date:</span>
                                            <span className={styles.hotelDateValue}>{moment(voucherDetail?.packageDetails?.end_date).format('DD MMMM YYYY')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

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
                                                <th className={styles.srCell}>#</th>
                                                <th>Full Name</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Gender</th>
                                                <th>Country</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className={styles.srCell}>1</td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}
                                                </td>
                                                <td>{voucherDetail?.lead_email || '—'}</td>
                                                <td>{voucherDetail?.lead_phone_code}{voucherDetail?.lead_phone || '—'}</td>
                                                <td>{capitalize(voucherDetail?.lead_gender) || '—'}</td>
                                                <td>{voucherDetail?.lead_country || '—'}</td>
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
                                                        <th>Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {voucherDetail?.other_passengers?.additional_adults?.map((adult, i) => (
                                                        <tr key={`adult-${i}`}>
                                                            <td className={styles.srCell}>{i + 2}</td>
                                                            <td style={{ fontWeight: 600 }}>{adult.first_name} {adult.last_name}</td>
                                                            <td>{capitalize(adult.gender)}</td>
                                                            <td><span className={styles.typeBadge}>Adult</span></td>
                                                        </tr>
                                                    ))}
                                                    {voucherDetail?.other_passengers?.children_details?.map((child, i) => (
                                                        <tr key={`child-${i}`}>
                                                            <td className={styles.srCell}>{(voucherDetail?.other_passengers?.additional_adults?.length || 0) + i + 2}</td>
                                                            <td style={{ fontWeight: 600 }}>{child.first_name} {child.last_name}</td>
                                                            <td>{capitalize(child.gender)}</td>
                                                            <td><span className={`${styles.typeBadge} ${styles.typeBadgeChild}`}>Child</span></td>
                                                        </tr>
                                                    ))}
                                                    {voucherDetail?.other_passengers?.infants_details?.map((infant, i) => {
                                                        const offset = (voucherDetail?.other_passengers?.additional_adults?.length || 0) + (voucherDetail?.other_passengers?.children_details?.length || 0);
                                                        return (
                                                            <tr key={`infant-${i}`}>
                                                                <td className={styles.srCell}>{offset + i + 2}</td>
                                                                <td style={{ fontWeight: 600 }}>{infant.first_name} {infant.last_name}</td>
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
                            {voucherDetail?.room_selections?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>•  Accommodation Details</span>
                                        <span className={styles.accomCity}>
                                            {moment(voucherDetail?.packageDetails?.end_date).diff(moment(voucherDetail?.packageDetails?.start_date), 'days')} Nights
                                        </span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {voucherDetail.room_selections.map((item, index) => (
                                            <div key={index} className={styles.flightSegmentCard}>
                                                <div className={styles.airlineRow}>
                                                    <FaHotel size={22} color="#E7247A" />
                                                    <div>
                                                        <p className={styles.airlineNameText}>
                                                            {capitalizeString(item?.hotel?.name)}
                                                            <span className={styles.cityChip}>{item?.hotel?.city}</span>
                                                        </p>
                                                        <p className={styles.flightNumberText}>{item?.hotel?.address}</p>
                                                    </div>
                                                </div>
                                                <div className={styles.routeGrid}>
                                                    <div className={styles.routeStation}>
                                                        <h4 className={styles.routeCity}>CHECK-IN</h4>
                                                        <p className={styles.routeTime}>{moment(item?.hotel?.booked_from).format('DD MMM YYYY')}</p>
                                                    </div>
                                                    <div className={styles.routeArrow}>
                                                        <span className={styles.durationLabel}>
                                                            {moment(item?.hotel?.booked_to).diff(moment(item?.hotel?.booked_from), 'days')} Nights
                                                        </span>
                                                        <div className={styles.arrowLine}>
                                                            <FaHotel className={styles.planeIcon} />
                                                        </div>
                                                    </div>
                                                    <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                        <h4 className={styles.routeCity}>CHECK-OUT</h4>
                                                        <p className={styles.routeTime}>{moment(item?.hotel?.booked_to).format('DD MMM YYYY')}</p>
                                                    </div>
                                                </div>
                                                <div className={styles.innerTableWrap}>
                                                    <table className={styles.premiumTable}>
                                                        <thead>
                                                            <tr>
                                                                <th className={styles.srCell}>#</th>
                                                                <th>Room Type</th>
                                                                <th>Meal / View</th>
                                                                <th className="text-center">Adults</th>
                                                                <th className="text-center">Children</th>
                                                                <th className="text-center">Infants</th>
                                                                <th>Without Beds</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.rooms.map((room, rindex) => (
                                                                <tr key={rindex}>
                                                                    <td className={styles.srCell}>{rindex + 1}</td>
                                                                    <td style={{ fontWeight: 600 }}>
                                                                        {room.selection.label === 'without_beds'
                                                                            ? 'Without Beds'
                                                                            : `${room.selection.label} × ${room.selection.rooms}`}
                                                                    </td>
                                                                    <td>
                                                                        {[room?.rooms?.items?.data?.meal, room?.rooms?.items?.data?.view].filter(Boolean).join(' + ') || '—'}
                                                                    </td>
                                                                    <td className="text-center">{room.selection.adults}</td>
                                                                    <td className="text-center">{room.selection.children}</td>
                                                                    <td className="text-center">{room.selection.infants}</td>
                                                                    <td className="text-center">{CalculateWithoutBeds(room.selection.type)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                FLIGHT DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.flights?.length > 0 && (
                                <div className={styles.sectionBlock}>

                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Flight Details</span>

                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {voucherDetail.flights.map((item, index) =>
                                            item.stops?.filter(s => s.is_return === false).map((flight, fIndex) => (
                                                <div key={`dep-${index}-${fIndex}`} className={styles.flightSegmentCard}>
                                                    <div className={styles.airlineRow}>
                                                        <MdFlight size={26} color="#E7247A" />
                                                        <div>
                                                            <p className={styles.airlineNameText}>{flight.airline_name}</p>
                                                            <p className={styles.flightNumberText}>
                                                                {flight.flight_number}&nbsp;·&nbsp;{capitalize(flight.type)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.routeGrid}>
                                                        <div className={styles.routeStation}>
                                                            <h4 className={styles.routeCity}>{flight?.departure_from}</h4>
                                                            <p className={styles.routeAirport}>Departure</p>
                                                            <p className={styles.routeTime}>{moment.utc(flight.datetime_from).format('DD MMM YYYY, LT')}</p>
                                                        </div>
                                                        <div className={styles.routeArrow}>
                                                            <span className={styles.durationLabel}>{flight.duration}</span>
                                                            <div className={styles.arrowLine}>
                                                                <MdFlight className={styles.planeIcon} />
                                                            </div>
                                                        </div>
                                                        <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                            <h4 className={styles.routeCity}>{flight?.departure_to}</h4>
                                                            <p className={styles.routeAirport}>Arrival</p>
                                                            <p className={styles.routeTime}>{moment.utc(flight.datetime_to).format('DD MMM YYYY, LT')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                RETURN FLIGHT DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.flights?.some(f => f.stops?.some(s => s.is_return === true)) && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Return Flight Details</span>

                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {voucherDetail.flights.map((item, index) =>
                                            item.stops?.filter(s => s.is_return === true).map((flight, fIndex) => (
                                                <div key={`ret-${index}-${fIndex}`} className={styles.flightSegmentCard}>
                                                    <div className={styles.airlineRow}>
                                                        <MdFlight size={26} color="#E7247A" />
                                                        <div>
                                                            <p className={styles.airlineNameText}>{flight.airline_name}</p>
                                                            <p className={styles.flightNumberText}>
                                                                {flight.flight_number}&nbsp;·&nbsp;{capitalize(flight.type)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.routeGrid}>
                                                        <div className={styles.routeStation}>
                                                            <h4 className={styles.routeCity}>{flight?.departure_from}</h4>
                                                            <p className={styles.routeAirport}>Departure</p>
                                                            <p className={styles.routeTime}>{moment.utc(flight.datetime_from).format('DD MMM YYYY, LT')}</p>
                                                        </div>
                                                        <div className={styles.routeArrow}>
                                                            <span className={styles.durationLabel}>{flight.duration}</span>
                                                            <div className={styles.arrowLine}>
                                                                <MdFlight className={styles.planeIcon} />
                                                            </div>
                                                        </div>
                                                        <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                            <h4 className={styles.routeCity}>{flight?.departure_to}</h4>
                                                            <p className={styles.routeAirport}>Arrival</p>
                                                            <p className={styles.routeTime}>{moment.utc(flight.datetime_to).format('DD MMM YYYY, LT')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                TRANSFER DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.transfers?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Transfer Details</span>

                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={styles.segmentsWrapper}>
                                        {voucherDetail.transfers.map((item, index) => (
                                            <div key={index} className={styles.flightSegmentCard}>
                                                <div className={styles.airlineRow}>
                                                    <FaBus size={22} color="#E7247A" />
                                                    <div>
                                                        <p className={styles.airlineNameText}>{capitalize(item?.vehicle)}</p>
                                                        <p className={styles.flightNumberText}>{capitalize(item?.trip_type)}</p>
                                                    </div>
                                                </div>
                                                {item.locations.map((loc, idx) => (
                                                    <div key={idx} className={styles.routeGrid}>
                                                        <div className={styles.routeStation}>
                                                            <h4 className={styles.routeCity}>PICKUP</h4>
                                                            <p className={styles.routeAirport}>{loc.pickup_address}</p>
                                                            <p className={styles.routeTime}>{moment(loc.outbound).format('DD MMM YYYY, HH:mm')}</p>
                                                        </div>
                                                        <div className={styles.routeArrow}>
                                                            <span className={styles.durationLabel}>{capitalize(item?.trip_type)}</span>
                                                            <div className={styles.arrowLine}>
                                                                <FaBus className={styles.planeIcon} />
                                                            </div>
                                                        </div>
                                                        <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                                            <h4 className={styles.routeCity}>DROPOFF</h4>
                                                            <p className={styles.routeAirport}>{loc.dropoff_address}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(() => {
                                                    const excursions = getTransferExcursions(item);
                                                    const byCity = groupExcursionsByCity(excursions);
                                                    const cities = Object.keys(byCity);
                                                    if (!cities.length) return null;
                                                    return (
                                                        <div className={styles.excursionsSection}>
                                                            <div className={styles.excursionsHeader}>
                                                                <FaMapMarkerAlt size={14} className={styles.excursionsHeaderIcon} />
                                                                <span>Included Ziyarat &amp; Excursions</span>
                                                            </div>
                                                            <div className={styles.excursionsCityGrid}>
                                                                {cities.map((city) => (
                                                                    <div key={city} className={styles.excursionCityGroup}>
                                                                        <div className={styles.excursionCityHeader}>
                                                                            <span className={styles.excursionCityName}>{city}</span>
                                                                            {/* <span className={styles.excursionCityCount}>
                                                                                {byCity[city].length} {byCity[city].length === 1 ? 'site' : 'sites'}
                                                                            </span> */}
                                                                        </div>
                                                                        <ul className={styles.excursionList}>
                                                                            {byCity[city].map((exc, i) => (
                                                                                <li key={exc.id ?? `${city}-${i}`} className={styles.excursionItem}>
                                                                                    <span className={styles.excursionIndex}>{i + 1}</span>
                                                                                    <span className={styles.excursionName}>{exc.name}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                VISA DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.visas?.length > 0 && (
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
                            {/* SPECIAL REQUEST SECTION */}
                            {voucherDetail?.special_request && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><IoWarningOutline size={13} /></span>
                                            SPECIAL REQUEST
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <div className={styles.importantList} style={{ fontSize: '1rem' }}>
                                            {voucherDetail.special_request}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* ══════════════════════════════════
                                ADDITIONAL SERVICES (with pricing)
                            ══════════════════════════════════ */}
                            {voucherDetail?.additional_services?.length > 0 && (
                                <div className={styles.sectionBlock}>

                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Additional Services</span>

                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Service Name</th>
                                                    <th className="text-center">Quantity / Pax</th>
                                                    <th className="text-end">Price / Person</th>
                                                    <th className="text-end">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.additional_services.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className={styles.srCell}>{index + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                                        <td className="text-center">{item.quantity}</td>
                                                        <td className="text-end">{voucherDetail.customer_currency} {convertToCustomerCurrency(item.price_per_person)}</td>
                                                        <td className="text-end">{voucherDetail.customer_currency} {convertToCustomerCurrency(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════════════════════
                                ROOM PRICE DETAILS
                            ══════════════════════════════════ */}
                            {voucherDetail?.room_selections_original?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Room Price Details</span>

                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className="p-3">
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Room Type</th>
                                                    <th className="text-center">Pax</th>
                                                    <th className="text-end">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.room_selections_original.map((room, rindex) => (
                                                    <tr key={rindex}>
                                                        <td className={styles.srCell}>{rindex + 1}</td>
                                                        <td style={{ fontWeight: 600 }}>
                                                            {room.type === 'without_beds' ? 'Without Beds' : `${room.type}`}
                                                        </td>
                                                        <td className="text-center">
                                                            {formatLabel(room.adultsInRoom >= 0 ? room.adultsInRoom + room?.adults_without_bed : room.adults + (room?.adults_without_bed || 0), "Adult", "Adults")} &ndash;{' '}
                                                            {formatLabel(room.childrenInRoom >= 0 ? room.childrenInRoom + room?.children_without_bed : room.children + (room?.children_without_bed || 0), "Child", "Children")} &ndash;{' '}
                                                            {formatLabel(room.infantsInRoom >= 0 ? room.infantsInRoom + room?.infants_without_bed : room.infants + (room?.infants_without_bed || 0), "Infant", "Infants")}
                                                        </td>
                                                        <td className="text-end">{voucherDetail?.customer_currency ? voucherDetail.customer_currency : voucherDetail?.currency_code} {CalCulateRoomPrice(room)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="text-end me-3 mt-2">
                                <table className={`${styles.totaltable} w-100`}>
                                    {voucherDetail?.total_discount > 0 && (
                                        <tr>
                                            <td>Discount: {voucherDetail?.customer_currency ? voucherDetail.customer_currency : voucherDetail?.currency_code} {voucherDetail?.total_discount}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td>Sub Total: {voucherDetail?.customer_currency ? voucherDetail.customer_currency : voucherDetail?.currency_code} {voucherDetail?.customer_total_after_discount === 0 ? voucherDetail?.grand_total_after_discount : voucherDetail?.customer_total_after_discount}</td>
                                    </tr>
                                </table>
                            </div>
                            {/* ── Total Summary ── */}
                            <div className={styles.invTotalSection}>
                                <div className={styles.invTotalLabel}>Total Amount:</div>
                                <div className={styles.invTotalAmount}>
                                    {voucherDetail?.customer_currency ? voucherDetail.customer_currency : voucherDetail?.currency_code} {voucherDetail?.customer_total_after_discount ? voucherDetail.customer_total_after_discount : voucherDetail?.grand_total_after_discount}
                                </div>
                                <span className='small'>Included VAT and Taxes</span>
                            </div>

                            {voucherDetail?.invoice_payments?.length > 0 && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.accomHeader}>
                                        <span className={styles.accomTitle}>• Payment Summary</span>
                                    </div>
                                    <div className={styles.accomDivider}></div>
                                    <div className={`p-3 ${styles.tableScroll}`}>
                                        <table className={styles.premiumTable}>
                                            <thead>
                                                <tr>
                                                    <th className={styles.srCell}>#</th>
                                                    <th>Payment Date</th>
                                                    <th className="text-end">Total Amount</th>
                                                    <th className="text-end">Received</th>
                                                    <th className="text-end">Remaining</th>
                                                    <th>Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {voucherDetail.invoice_payments.map((payment, index) => {
                                                    const currency = payment.currency || voucherDetail?.customer_currency || voucherDetail?.currency_code;
                                                    return (
                                                        <tr key={payment.id || index}>
                                                            <td className={styles.srCell}>{index + 1}</td>
                                                            <td style={{ fontWeight: 600 }}>
                                                                {payment.payment_date
                                                                    ? (moment(payment.payment_date, 'DD-MM-YYYY', true).isValid()
                                                                        ? moment(payment.payment_date, 'DD-MM-YYYY').format('DD-MM-YYYY')
                                                                        : moment(payment.payment_date).format('DD-MM-YYYY'))
                                                                    : '—'}
                                                            </td>
                                                            <td className="text-end">
                                                                {currency} {Number(payment.total_amount ?? 0).toFixed(2)}
                                                            </td>
                                                            <td className="text-end">
                                                                {currency} {Number(payment.received ?? 0).toFixed(2)}
                                                            </td>
                                                            <td className="text-end">
                                                                {currency} {Number(payment.remaining ?? 0).toFixed(2)}
                                                            </td>
                                                            <td className={styles.remarksCell}>{payment.remarks || '—'}</td></tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}


                            {/* CANCELLATION POLICY SECTION */}
                            {voucherDetail?.packageDetails?.cancellation_policy && (
                                <div className={styles.sectionBlock}>
                                    <div className={styles.sectionHeader}>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={styles.sectionIconWrap}><IoWarningOutline size={13} /></span>
                                            CANCELLATION POLICY
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        {voucherDetail.packageDetails.cancellation_policy.cancel_policy === 'refundable' && !!voucherDetail.packageDetails.cancellation_policy.cancellation_policies?.length ? (
                                            <ul className={styles.importantList} style={{ fontSize: '1rem' }}>
                                                {voucherDetail.packageDetails.cancellation_policy.cancellation_policies.map((policy, i) => (
                                                    <li key={i}>
                                                        If cancelled <strong>{policy.time_duration} hours</strong> before departure, a{' '}
                                                        {policy.type === 'percentage'
                                                            ? <><strong>{policy.value}%</strong> cancellation charge</>
                                                            : <>fixed cancellation charge of <strong>{voucherDetail.customer_currency} {convertToCustomerCurrency(policy.value)}</strong></>
                                                        } will apply.
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-danger small mt-2">This booking is non-refundable. No refund will be issued for cancellations.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* <div className={styles.invTotalDivider} /> */}

                            {/* ── Important Information ── */}
                            <div className={styles.importantSection}>
                                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                                <div className={styles.importantDivider} />
                                <ul className={styles.importantList}>
                                    <li>The invoice displays the complete pricing details of your package booking, inclusive of all applicable taxes.</li>
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
                        <Link href={`/${voucherDetail?.packageDetails?.category?.slug}/voucher/${voucherDetail?.booking_reference}`} style={{ textDecoration: 'none' }}>
                            <button className={styles.btnGold}>
                                <FaFileInvoice size={14} />
                                View Voucher
                            </button>
                        </Link>
                         {voucherDetail?.atol_url && ( 
                            <a
                                href={voucherDetail.atol_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <button type="button" className={styles.btnGold}>
                                    <FaFileAlt size={14} />
                                    View Atol
                                </button>
                            </a>
                         )} 
                        {voucherDetail?.indemnity_url && (
                            <a
                                href={voucherDetail.indemnity_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <button type="button" className={styles.btnGold}>
                                    <FaFileContract size={14} />
                                    View Indemnity
                                </button>
                            </a>
                        )} 
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
