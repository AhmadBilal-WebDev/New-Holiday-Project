"use client";
import styles from "./voucher.module.css";
import {
  FaFileInvoice,
  FaCar,
  FaUser,
  FaUserFriends,
  FaSuitcase,
  FaMapMarkedAlt,
  FaHome,
} from "react-icons/fa";
import { MdLocationOn, MdOutlineFileDownload } from "react-icons/md";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelVoucherLoader from "@/components/Loader/HotelVoucherLoader";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";

export default function Page() {
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
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/booking/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_reference: id }),
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
      console.error("Error fetching transfer details:", err);
    }
  };

  function capitalize(text) {
    if (!text) return "";
    const s = String(text);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function convertToCustomerCurrency(price) {
    if (!price || !voucherDetail.pricing?.supplier_to_display_rate) return Number(price || 0).toFixed(2);
    if (voucherDetail.pricing?.supplier_currency === voucherDetail.pricing?.display_currency) {
      return Number(price).toFixed(2);
    }
    const convertedPrice = Number(price) * Number(voucherDetail.pricing?.supplier_to_display_rate);
    return convertedPrice.toFixed(2);
  }

  const handlePrint = () => window.print();

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
                  <h1 className={styles.mainTitle}>Transfer Confirmation<br />Voucher</h1>
                  <p className={styles.mainSubtitle}>Thank you for choosing Alhijaz Tours</p>
                </div>
                <div className={styles.titleRight}>
                  <div className={styles.qrWrapper}>
                    <QRCode
                      value={voucherUrl || ' '}
                      size={78}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                  </div>
                  <span className={styles.qrLabel}>Scan the QR code<br />to verify your booking</span>
                </div>
              </div>

              {/* ── Gold Divider ── */}
              <div className={styles.goldDivider} />

              {/* ── Voucher Details Band ── */}
              <div className={styles.voucherDetailsBand}>
                <div className={styles.voucherBandInner}>
                  <span className={styles.voucherSectionLabel}>Booking Reference:</span>
                  <div className={styles.voucherDetailsRow}>
                    <div className={styles.voucherDetailsLeft}>
                      <h2 className={styles.voucherNumber}>{voucherDetail?.booking_reference}</h2>
                      <span className={styles.confirmedBadge}>
                        Status: {voucherDetail?.booking_status?.toUpperCase()}
                      </span>
                      <br />
                      {voucherDetail?.payment_status && (
                        <span className={`${styles.confirmedBadge} ${styles.paymentBadge} ${styles[`payment_${voucherDetail.payment_status.toLowerCase()}`]}`}>
                          Payment: {voucherDetail?.payment_status.toUpperCase()}
                        </span>
                      )}

                    </div>
                    <div className={styles.voucherDetailsDivider} />
                    <div className={styles.voucherDetailsRight}>
                      <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Lead Passenger:</span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.lead_passenger?.title}{' '}
                          {voucherDetail?.lead_passenger?.first_name}{' '}
                          {voucherDetail?.lead_passenger?.last_name}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Transfer Type:</span>
                        <span className={styles.bookingDetailValue}>
                          {capitalize(voucherDetail?.booking_criteria?.transfer_type)}
                        </span>
                      </p>
                      <p className={styles.bookingDetailSmallLabel}>Booking Date:</p>
                      <p className={styles.bookingDateValue}>
                        {moment(voucherDetail?.created_at).format('DD MMMM YYYY')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Journey Details ── */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaCar size={13} /></span>
                    Transfer Details
                  </div>
                </div>
                <div className={styles.segmentsWrapper}>
                  <div className={styles.flightSegmentCard}>
                    <div className={styles.routeGrid}>
                      {/* Pickup */}
                      <div className={styles.routeStation}>
                        <p className={styles.routeCity}>PICKUP</p>
                        <p className={styles.routeAirport}>{voucherDetail?.exact_pickup_point ? voucherDetail?.exact_pickup_point : voucherDetail?.booking_criteria?.pickup_location}</p>
                        <p className={styles.routeTime}>
                          {moment(voucherDetail?.booking_criteria?.pickup_date).format('DD MMM YYYY ')}
                          {voucherDetail?.booking_criteria?.pickup_time && ` · ${moment(voucherDetail.booking_criteria.pickup_time, 'HH:mm:ss').format('hh:mm A')}`}
                        </p>
                      </div>
                      {/* Arrow */}
                      <div className={styles.routeArrow}>
                        <span className={styles.durationLabel}>{capitalize(voucherDetail?.booking_criteria?.transfer_type)}</span>
                        <div className={styles.arrowLine}>
                          <FaCar className={styles.planeIcon} />
                        </div>
                      </div>
                      {/* Dropoff */}
                      <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                        <p className={styles.routeCity}>DROPOFF</p>
                        <p className={styles.routeAirport}>{voucherDetail?.exact_dropoff_point ? voucherDetail?.exact_dropoff_point : voucherDetail?.booking_criteria?.dropoff_location}</p>
                        {voucherDetail?.booking_criteria?.dropoff_date && (
                          <p className={styles.routeTime}>
                            {moment(voucherDetail?.booking_criteria?.dropoff_date).format('DD MMM YYYY')}
                            {voucherDetail?.booking_criteria?.dropoff_time && ` · ${moment(voucherDetail.booking_criteria.dropoff_time, 'HH:mm:ss').format('hh:mm A')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {voucherDetail?.flight_number && (
                      <div className="mt-1 px-3 py-2" style={{ background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>
                        <strong>Flight Number:</strong> {voucherDetail.flight_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Vehicle Details ── */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaCar size={13} /></span>
                    Vehicle Details
                  </div>
                </div>
                <div className={`p-3 ${styles.tableWrap}`}>
                  <table className={styles.premiumTable}>
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Transfer Type</th>
                        <th><FaUserFriends size={12} style={{ marginRight: 4 }} />Passenger Capacity</th>
                        <th><FaSuitcase size={12} style={{ marginRight: 4 }} />Luggage Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td data-label="Vehicle" style={{ fontWeight: 600 }}>{capitalize(voucherDetail?.transfer?.vehicle_name)} x {voucherDetail?.booked_qty || 1} </td>
                        <td data-label="Transfer Type">{capitalize(voucherDetail?.transfer?.trip_type)} </td>
                        <td data-label="Passenger Capacity" className="text-center">{voucherDetail?.vehicle_details?.passenger_capacity || 'N/A'}</td>
                        <td data-label="Luggage Capacity" className="text-center">{voucherDetail?.vehicle_details?.luggage_capacity || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Passenger Information ── */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaUser size={13} /></span>
                    Passenger Information
                  </div>
                </div>
                <div className={`p-3 ${styles.tableWrap}`}>
                  <table className={styles.premiumTable}>
                    <thead>
                      <tr>
                        <th className={styles.srCell}>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
                        <th>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.srCell} data-label="#">1</td>
                        <td data-label="Name" style={{ fontWeight: 600 }}>
                          {voucherDetail?.lead_passenger?.title}{' '}
                          {voucherDetail?.lead_passenger?.first_name}{' '}
                          {voucherDetail?.lead_passenger?.last_name}
                        </td>
                        <td data-label="Email">{voucherDetail?.lead_passenger?.email || '—'}</td>
                        <td data-label="Phone">{voucherDetail?.lead_passenger?.phone_number || '—'}</td>
                        <td data-label="Gender">{capitalize(voucherDetail?.lead_passenger?.gender) || '—'}</td>
                        <td data-label="Country">{voucherDetail?.lead_passenger?.country || '—'}</td>
                      </tr>
                      {voucherDetail?.guest_details?.map((guest, index) => (
                        <tr key={index}>
                          <td className={styles.srCell} data-label="#">{index + 2}</td>
                          <td data-label="Name" style={{ fontWeight: 600 }}>{guest.first_name} {guest.last_name}</td>
                          <td data-label="Email">—</td>
                          <td data-label="Phone">—</td>
                          <td data-label="Gender">{capitalize(guest.gender) || '—'}</td>
                          <td data-label="Country">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Multiple Locations (all-around / return) ── */}
              {(voucherDetail?.transfer?.trip_type === 'all-around' || voucherDetail?.transfer?.trip_type === 'all-round' || voucherDetail?.transfer?.trip_type === 'return') && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><FaMapMarkedAlt size={13} /></span>
                      MULTIPLE LOCATIONS
                    </div>
                  </div>
                  <div className={`p-3 ${styles.tableWrap}`}>
                    <table className={styles.premiumTable}>
                      <thead>
                        <tr>
                          <th className={styles.srCell}>#</th>
                          <th>Pickup Address</th>
                          <th>Dropoff Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail?.transfer?.locations?.map((location, index) => (
                          <tr key={index}>
                            <td className={styles.srCell} data-label="#">{index + 1}</td>
                            <td data-label="Pickup Address">{location.pickup_address}</td>
                            <td data-label="Dropoff Address">{location.dropoff_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Special Request ── */}
              {voucherDetail?.special_request && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      SPECIAL REQUEST
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="mb-0" style={{ fontSize: '0.875rem' }}>{voucherDetail.special_request}</p>
                  </div>
                </div>
              )}

              {/* ── Cancellation Policy ── */}
              {voucherDetail?.cancellation_policies?.cancel_policy && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      Cancellation Policy
                    </div>
                  </div>
                  <div className="p-3">
                    {voucherDetail.cancellation_policies.cancel_policy === 'refundable' ? (
                      <>
                        {voucherDetail.cancellation_policies.policies?.length > 0 && (
                          <ul className="mb-0 ps-3" style={{ fontSize: '0.85rem' }}>
                            {voucherDetail.cancellation_policies.policies.map((policy, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>
                                If cancelled from <strong>{moment(policy.from).format('DD MMM YYYY')}</strong>, a cancellation fee of{' '}
                                <strong style={{ color: '#dc3545' }}>{voucherDetail?.pricing?.display_currency} {convertToCustomerCurrency(policy.amount)}</strong> will be charged.
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <p className="mb-0" style={{ fontSize: '0.875rem', color: '#dc3545', fontWeight: 600 }}>
                        ✗ This transfer is non-refundable. No refund will be issued in case of cancellation.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Important Information ── */}
              <div className={styles.importantSection}>
                <p className={styles.importantTitle}>Important Information</p>
                <div className={styles.importantDivider} />
                <ul className={styles.importantList}>
                  <li>Please be at the pickup location at least 15 minutes before the scheduled pickup time.</li>
                  <li>The driver will wait for a maximum of 30 minutes from the scheduled pickup time.</li>
                  <li>This voucher must be presented to the driver on the day of travel.</li>
                  <li>Additional stops or route changes may incur extra charges.</li>
                  <li>This voucher is valid only for the specified travel date, passenger(s), and vehicle.</li>
                  <li>This is a computer-generated voucher and does not require a physical signature.</li>
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
            <button className={styles.btnPrimary} onClick={handlePrint}>
              <MdOutlineFileDownload size={17} />
              Print Voucher
            </button>
            <Link href={`/transfers/invoice/${voucherDetail?.booking_reference}`} style={{ textDecoration: 'none' }}>
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
