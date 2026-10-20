'use client'
import styles from '../../../hotels/invoice/[id]/Invoice.module.css'
import localStyles from './invoice.module.css'
import VoucherStyles from '../../voucher/[id]/voucher.module.css'
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import { FaFileInvoice, FaHome, FaPhone, FaEnvelope, FaGlobe, FaCar, FaUser, FaUserFriends, FaSuitcase, FaMapMarkedAlt } from "react-icons/fa";
import Link from "next/link";
import { PiDownloadSimpleThin } from 'react-icons/pi'
import { Tooltip } from '@mantine/core'

export default function Page() {
  const { id } = useParams();
  const ref = useRef();
  const [invoiceDetail, setInvoiceDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/booking/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_reference: id })
      });
      const res = await responses.json();
      setIsLoading(false);
      if (res.success) {
        setInvoiceDetail(res?.data);
      } else {
        setErrorMessage(res?.message)
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
  };

  function convertToCustomerCurrency(price) {
    if (!price || !invoiceDetail.pricing?.supplier_to_display_rate) return Number(price || 0).toFixed(2);
    if (invoiceDetail.pricing?.supplier_currency === invoiceDetail.pricing?.display_currency) {
      return Number(price).toFixed(2);
    }
    const convertedPrice = Number(price) * Number(invoiceDetail.pricing?.supplier_to_display_rate);
    return convertedPrice.toFixed(2);
  }

  function PerTransferPrice(price, qty) {
    if (!price || !qty) return Number(price || 0).toFixed(2);
    const perTransferPrice = Number(price) / Number(qty);
    return perTransferPrice % 1 === 0 ? perTransferPrice.toFixed(0) : perTransferPrice.toFixed(2);
  }
  return (
    <div>
      <div className={styles.invoicecontainerwrap}>
        <div className={styles.invoicecontainer}>
          {isLoading ? (
            <div className={styles.themeholyinvoice}>
              <HotelInvoiceLoader />
            </div>
          ) : errorMessage ? (
            <div className="alert alert-danger">{errorMessage}</div>
          ) : (
            <div>
              {/* ── Action buttons ── */}
              <div className={styles.invoiceprintbutton}>
                <Tooltip label='Print Invoice' color="blue">
                  <div onClick={() => window.print()} className="bg-primary-subtle cursor-pointer p-2 text-primary rounded">
                    <PiDownloadSimpleThin size={25} />
                  </div>
                </Tooltip>
                <Tooltip label='View Voucher' color="teal">
                  <Link href={`/transfers/voucher/${invoiceDetail?.booking_reference}`}>
                    <div className="bg-info-subtle cursor-pointer p-2 text-info rounded mt-2">
                      <FaFileInvoice size={22} />
                    </div>
                  </Link>
                </Tooltip>
                <Tooltip label='Go Home' color="green">
                  <Link href='/'>
                    <div className="bg-success-subtle cursor-pointer p-2 text-success rounded mt-2">
                      <FaHome size={25} />
                    </div>
                  </Link>
                </Tooltip>
              </div>

              <div ref={ref} id="invoice" className={styles.themeholyinvoice}>

                {/* ── HEADER ── */}
                <div className={styles.invHeader}>
                  <div className={styles.invHeaderLeft}>
                    <div className={`${styles.invHeaderLogo} text-center`}>
                      <Image src='/images/logoblack.png' height={100} width={150} className="h-auto" quality={100} alt="Logo" />
                    </div>
                    <div className={styles.invHeaderMeta}>
                      <span>Date: <b>{moment(invoiceDetail?.created_at).format('DD-MM-YYYY')}</b></span>
                      <span>Ref: <b>{invoiceDetail?.booking_reference}</b></span>
                    </div>
                    <div className={styles.invHeaderTitle}>INVOICE</div>
                  </div>

                  <div className={styles.invHeaderRight}>
                    <div className={styles.invBookingFor}>Booking For:</div>
                    <div className={styles.invGuestName}>
                      {invoiceDetail?.lead_passenger?.title && `${invoiceDetail.lead_passenger.title} `}
                      {invoiceDetail?.lead_passenger?.first_name} {invoiceDetail?.lead_passenger?.last_name}
                    </div>
                    <div className={styles.invHeaderDivider}></div>
                    <div className={styles.invContactInfo}>
                      {invoiceDetail?.lead_passenger?.email && <p>{invoiceDetail.lead_passenger.email}</p>}
                      {invoiceDetail?.lead_passenger?.phone_number && <p>{invoiceDetail.lead_passenger.phone_number}</p>}
                      {invoiceDetail?.lead_passenger?.gender && <p>{capitalize(invoiceDetail.lead_passenger.gender)}</p>}
                    </div>
                    <div className={styles.invHeaderDivider}></div>
                    <div className={styles.invStatusRow}>
                      <span className={`${styles.invStatusBadge} ${invoiceDetail?.booking_status === 'confirmed' ? styles.confirmedStatus : invoiceDetail?.booking_status === 'cancelled' ? styles.cancelledStatus : styles.pandingStatus}`}>
                        STATUS: {invoiceDetail?.booking_status?.toUpperCase()}
                      </span>
                      <br />
                      {invoiceDetail?.payment_status && (
                        <span className={`${styles.confirmedBadge} ${styles.invStatusBadge} ms-1 ${styles[`payment_${invoiceDetail.payment_status.toLowerCase()}`]}`}>
                          Payment: {invoiceDetail?.payment_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── CONTENT ── */}
                <div className={styles.downloadinner}>

                  {/* ── JOURNEY DETAILS ── */}
                  <div className={`${styles.accomBlock} mb-3`}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Transfer Details</span>
                      <span className={styles.accomCity} style={{ color: '#E7247A' }}>
                        {capitalize(invoiceDetail?.booking_criteria?.transfer_type)}
                      </span>
                    </div>
                    <div className={styles.accomDivider}></div>
                  </div>

                  <div className={VoucherStyles.sectionBlock}>
                    <div className={VoucherStyles.sectionHeader}>
                      <div className="d-flex align-items-center gap-2">
                        <span className={VoucherStyles.sectionIconWrap}><FaCar size={13} /></span>
                        PICKUP &amp; DROPOFF
                      </div>
                    </div>
                    <div className={VoucherStyles.segmentsWrapper}>
                      <div className={VoucherStyles.flightSegmentCard}>
                        <div className={VoucherStyles.routeGrid}>
                          {/* Pickup */}
                          <div className={VoucherStyles.routeStation}>
                            <p className={VoucherStyles.routeCity}>PICKUP</p>
                            <p className={VoucherStyles.routeAirport}>{invoiceDetail?.exact_pickup_point ? invoiceDetail?.exact_pickup_point : invoiceDetail?.booking_criteria?.pickup_location}</p>
                            <p className={VoucherStyles.routeTime}>
                              {moment(invoiceDetail?.booking_criteria?.pickup_date).format('DD MMM YYYY')}
                              {invoiceDetail?.booking_criteria?.pickup_time && ` · ${moment(invoiceDetail.booking_criteria.pickup_time, 'HH:mm:ss').format('hh:mm A')}`}
                            </p>
                          </div>
                          {/* Arrow */}
                          <div className={VoucherStyles.routeArrow}>
                            <span className={VoucherStyles.durationLabel}>{capitalize(invoiceDetail?.booking_criteria?.transfer_type)}</span>
                            <div className={VoucherStyles.arrowLine}>
                              <FaCar className={VoucherStyles.planeIcon} />
                            </div>
                          </div>
                          {/* Dropoff */}
                          <div className={`${VoucherStyles.routeStation} ${VoucherStyles.routeStationRight}`}>
                            <p className={VoucherStyles.routeCity}>DROPOFF</p>
                            <p className={VoucherStyles.routeAirport}>{invoiceDetail?.exact_dropoff_point ? invoiceDetail?.exact_dropoff_point : invoiceDetail?.booking_criteria?.dropoff_location}</p>
                            {invoiceDetail?.booking_criteria?.dropoff_date && (
                              <p className={VoucherStyles.routeTime}>
                                {moment(invoiceDetail?.booking_criteria?.dropoff_date).format('DD MMM YYYY')}
                                {invoiceDetail?.booking_criteria?.dropoff_time && ` · ${moment(invoiceDetail.booking_criteria.dropoff_time, 'HH:mm:ss').format('hh:mm A')}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {invoiceDetail?.flight_number && (
                          <div className="mt-1 px-3 py-2" style={{ background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>
                            <strong>Flight Number:</strong> {invoiceDetail.flight_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── MULTIPLE LOCATIONS (all-around / return) ── */}
                  {(invoiceDetail?.transfer?.trip_type === 'all-around' || invoiceDetail?.transfer?.trip_type === 'all-round' || invoiceDetail?.transfer?.trip_type === 'return') && (
                    <div className={VoucherStyles.sectionBlock} style={{ marginTop: '12px' }}>
                      <div className={VoucherStyles.sectionHeader}>
                        <div className="d-flex align-items-center gap-2">
                          <span className={VoucherStyles.sectionIconWrap}><FaMapMarkedAlt size={13} /></span>
                          MULTIPLE LOCATIONS
                        </div>
                      </div>
                      <div className={VoucherStyles.segmentsWrapper}>
                        {invoiceDetail?.transfer?.locations?.map((location, index) => (
                          <div key={index} className={VoucherStyles.flightSegmentCard}>
                            <div className={VoucherStyles.routeGrid}>
                              <div className={VoucherStyles.routeStation}>
                                <p className={VoucherStyles.routeCity}>PICKUP</p>
                                <p className={VoucherStyles.routeAirport}>{location.pickup_address}</p>
                              </div>
                              <div className={VoucherStyles.routeArrow}>
                                <span className={VoucherStyles.durationLabel}>{invoiceDetail?.transfer?.trip_type === 'return' ? '' : `Stop ${index + 1}`}</span>
                                <div className={VoucherStyles.arrowLine}>
                                  <FaCar className={VoucherStyles.planeIcon} />
                                </div>
                              </div>
                              <div className={`${VoucherStyles.routeStation} ${VoucherStyles.routeStationRight}`}>
                                <p className={VoucherStyles.routeCity}>DROPOFF</p>
                                <p className={VoucherStyles.routeAirport}>{location.dropoff_address}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── VEHICLE DETAILS ── */}
                  <div className={`${styles.accomBlock} `}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Vehicle Details</span>
                    </div>
                    <div className={styles.accomDivider}></div>
                    <div className={localStyles.tableResponsive}>
                      <table className={`${styles.invoicetable} ${localStyles.mobileTable} w-100`}>
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Quantity</th>
                            <th>Transfer Type</th>
                            <th>Passenger Capacity</th>
                            <th>Luggage Capacity</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td data-label="Vehicle"><strong>{capitalize(invoiceDetail?.transfer?.vehicle_name)}</strong></td>
                            <td data-label="Quantity">{invoiceDetail?.booked_qty} x {invoiceDetail?.pricing?.currency} {PerTransferPrice(invoiceDetail?.pricing?.amount_after_exchange , invoiceDetail?.booked_qty)}</td>
                            <td data-label="Transfer Type">{capitalize(invoiceDetail?.transfer?.trip_type)}</td>
                            <td data-label="Passenger Capacity">{invoiceDetail?.vehicle_details?.passenger_capacity || 'N/A'}</td>
                            <td data-label="Luggage Capacity">{invoiceDetail?.vehicle_details?.luggage_capacity || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── PASSENGER DETAILS ── */}
                  <div className={`${styles.accomBlock} mt-2`}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Passenger Details</span>
                      <span className={styles.accomCity}>
                        {invoiceDetail?.guest_details?.length
                          ? `${1 + invoiceDetail.guest_details.length} Passenger${1 + invoiceDetail.guest_details.length > 1 ? 's' : ''}`
                          : '1 Passenger'}
                      </span>
                    </div>
                    <div className={styles.accomDivider}></div>
                    <div className={localStyles.tableResponsive}>
                      <table className={`${styles.invoicetable} ${localStyles.mobileTable} w-100`}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Gender</th>
                            <th>Country</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td data-label="#">1</td>
                            <td data-label="Full Name"><strong>{invoiceDetail?.lead_passenger?.title} {invoiceDetail?.lead_passenger?.first_name} {invoiceDetail?.lead_passenger?.last_name}</strong></td>
                            <td data-label="Email">{invoiceDetail?.lead_passenger?.email || '—'}</td>
                            <td data-label="Phone">{invoiceDetail?.lead_passenger?.phone_number || '—'}</td>
                            <td data-label="Gender">{capitalize(invoiceDetail?.lead_passenger?.gender) || '—'}</td>
                            <td data-label="Country">{invoiceDetail?.lead_passenger?.country || '—'}</td>
                          </tr>
                          {invoiceDetail?.guest_details?.map((guest, index) => (
                            <tr key={index}>
                              <td data-label="#">{index + 2}</td>
                              <td data-label="Full Name"><strong>{guest.first_name} {guest.last_name}</strong></td>
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

                  {/* ── PAYMENT SUMMARY ── */}
                  <div className="text-end mt-3">
                    <table className={`${styles.totaltable} w-100`}>
                      <tbody>
                        <tr>
                          <td>Subtotal: {invoiceDetail?.pricing?.currency} {invoiceDetail?.pricing?.amount_after_exchange}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.invTotalSection}>
                    <div className={styles.invTotalLabel}>Total:</div>
                    <div className={styles.invTotalAmount}>
                      {invoiceDetail?.pricing?.currency} {invoiceDetail?.pricing?.amount_after_exchange}
                    </div>
                      <span className='small'>Included VAT and Taxes</span>
                  </div>
                  {/* ── Cancellation Policy ── */}
                  {invoiceDetail?.cancellation_policies?.cancel_policy && (
                    <div className={styles.sectionBlock}>
                      <div className="d-flex fw-bold align-items-center mt-2 gap-2">
                        Cancellation Policy
                      </div>
                      <div className="p-2">
                        {invoiceDetail.cancellation_policies.cancel_policy === 'refundable' ? (
                          <>
                            {invoiceDetail.cancellation_policies.policies?.length > 0 && (
                              <ul className="mb-0 ps-3" style={{ fontSize: '0.85rem' }}>
                                {invoiceDetail.cancellation_policies.policies.map((policy, idx) => (
                                  <li key={idx} style={{ marginBottom: '4px' }}>
                                    If cancelled from <strong>{moment(policy.from).format('DD MMM YYYY')}</strong>, a cancellation fee of{' '}
                                    <strong style={{ color: '#dc3545' }}>{invoiceDetail?.pricing?.display_currency} {convertToCustomerCurrency(policy.amount)}</strong> will be charged.
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <p className="mb-0" style={{ fontSize: '0.875rem', color: '#dc3545', fontWeight: 600 }}>
                            This transfer is non-refundable. No refund will be issued in case of cancellation.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.invTotalDivider}></div>

                  {invoiceDetail?.special_request && (
                    <>
                      <div className={styles.invTotalNote}>
                        <b>Special Request</b>
                        <p>{invoiceDetail.special_request}</p>
                      </div>
                      <div className={styles.invTotalDivider}></div>
                    </>
                  )}

                  <div className={styles.invTotalNote}>
                    <b>Important Information</b>
                    <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Please be ready at the pickup location at least 15 minutes before the scheduled pickup time.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Ensure your contact details are accurate so the driver can reach you.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>The driver will wait up to 30 minutes after the scheduled pickup time.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Luggage allowance is subject to the vehicle capacity confirmed at the time of booking.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>This booking confirmation is non-transferable and must be presented to the driver.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>This is an electronic confirmation. No paper copy is required.</li>
                    </ul>
                  </div>
                  <div className={styles.invTotalDivider}></div>
                </div>

                <div className="text-end mt-4 mb-4 me-3">
                  <p className="mb-0">Thanks, and Best Regards</p>
                  <p className="fw-bold">Al-Hijaz Tours</p>
                </div>
                <p className="text-center mt-1">
                  <b>Note:</b> This is a computer generated invoice and does not require any physical signature.
                </p>

                {/* ── FOOTER BAR ── */}
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
          )}
        </div>
      </div>
    </div>
  )
}
