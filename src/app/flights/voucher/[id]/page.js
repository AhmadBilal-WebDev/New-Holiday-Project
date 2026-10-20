'use client'
import React, { useRef, useEffect, useState } from 'react'
import styles from './voucher.module.css'
import moment from 'moment'
import { FaUser, FaPrint, FaFileInvoice, FaHome, FaChair } from 'react-icons/fa'
import { MdFlight, MdLuggage, MdConfirmationNumber } from 'react-icons/md'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import FlightBookingDetailLoader from '@/components/Loader/FlightBookinfDetailLoader'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import { IoWarningOutline } from 'react-icons/io5'
import { groupSegments } from '@/components/Flights/Checkout/flightHelpers'

export default function FlightVoucher() {
  const voucherRef = useRef()
  const { id } = useParams();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [voucherUrl, setVoucherUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoucherUrl(window.location.href);
    }
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking/details`, {
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
      console.error("Error fetching flight details:", err);
    }
  };

  const getAirportName = (point) => point?.airport_name || point?.name || point?.airport_code || point?.iata_code || '';
  const getCityName = (point) => point?.city || point?.airport_code || point?.iata_code || '';
  const getAirportCode = (point) => point?.airport_code || point?.iata_code || '';
  const getAirlineName = (airline) => airline?.name || airline?.code || airline?.iata_code || '';
  const getAirlineCode = (airline) => airline?.code || airline?.iata_code || '';

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '—';
    const mins = Number(minutes);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getTripTypeLabel = () => {
    const t = voucherDetail?.flight_details?.trip_type;
    if (t === 'one_way') return 'One Way Flight';
    if (t === 'return') return 'Return Flight';
    if (t === 'multi_city' || t === 'multicity') return 'Multi City Flight';
    return 'Flight Details';
  };

  const getSegmentGroups = () => {
    const groups = groupSegments({
      segments: voucherDetail?.segments || [],
      trip_type: voucherDetail?.flight_details?.trip_type,
      search_criteria:
        voucherDetail?.flight_details?.search_criteria ||
        voucherDetail?.search_criteria,
    });

    return groups.map((group, idx) => {
      let displayLabel = group.label || `Flight ${idx + 1}`;
      if (displayLabel === 'Departure') displayLabel = 'Departure Flight';
      if (displayLabel === 'Return') displayLabel = 'Return Flight';

      const first = group.segments?.[0]?.departure;
      const last = group.segments?.[group.segments.length - 1]?.arrival;
      const routeLabel =
        first && last
          ? `${getCityName(first)} (${getAirportCode(first)}) → ${getCityName(last)} (${getAirportCode(last)})`
          : '';

      return { ...group, displayLabel, routeLabel };
    });
  };

  const getTotalPassengers = () => {
    if (!voucherDetail?.passenger_counts) return '';
    const { adults = 0, children = 0, infants = 0 } = voucherDetail.passenger_counts;
    return [
      adults > 0 && `${adults} Adult${adults > 1 ? 's' : ''}`,
      children > 0 && `${children} Child${children > 1 ? 'ren' : ''}`,
      infants > 0 && `${infants} Infant${infants > 1 ? 's' : ''}`,
    ].filter(Boolean).join(', ');
  };

  const getPassengerTypeLabel = (type) => {
    if (!type) return '';
    if (type === 'adult' || type === 'ADT') return 'Adult';
    if (type === 'child' || type === 'CHD') return 'Child';
    if (type === 'infant' || type === 'infant_without_seat' || type === 'INF') return 'Infant';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getCardTypeLabel = (cardType) => {
    if (!cardType) return '—';
    const type = String(cardType).toLowerCase();
    if (type === 'p' || type === 'passport') return 'Passport';
    if (type === 'n' || type === 'id' || type === 'id_card') return 'ID Card';
    if (type === 'o' || type === 'other') return 'Other';
    return cardType;
  };

  const getPnrForFlight = (flightNum) => {
    return voucherDetail?.pnr_list?.find(
      (p) => String(p.flightNum) === String(flightNum)
    );
  };

  const getSeatForPassenger = (passenger, flightNum) => {
    return passenger?.seats?.find(
      (s) => String(s.flightNum) === String(flightNum) && s.seatNum
    )?.seatNum || '';
  };

  const getTicketForSegment = (flightNum, passengerIndex) => {
    const pnr = getPnrForFlight(flightNum);
    const ticket = pnr?.ticketNums?.find(
      (t) => Number(t.passengerIndex) === Number(passengerIndex)
    );
    return ticket?.ticketNum || '';
  };

  const getLayoverMinutes = (currentSeg, nextSeg) => {
    if (!currentSeg?.arrival?.datetime || !nextSeg?.departure?.datetime) return null;
    return moment(nextSeg.departure.datetime).diff(moment(currentSeg.arrival.datetime), 'minutes');
  };

  const paidAncillaries = voucherDetail?.baggage_info?.paid;
  const hasPaidBaggage = paidAncillaries?.baggage?.length > 0;
  const hasPaidSeats = paidAncillaries?.seat?.length > 0;

  const routeSummary = () => {
    const segments = voucherDetail?.segments;
    if (!segments?.length) return '—';
    const first = segments[0]?.departure;
    const last = segments[segments.length - 1]?.arrival;
    return `${getCityName(first)} (${getAirportCode(first)}) → ${getCityName(last)} (${getAirportCode(last)})`;
  };

  return (
    <div className={styles.pageWrapper}>
      {isLoading ? (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          <div className="bg-white rounded shadow p-3">
            <FlightBookingDetailLoader />
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
            <div ref={voucherRef} className={styles.voucherCard}>

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
              {voucherDetail?.client?.header_image && (
                <Image
                  src={voucherDetail.client.header_image}
                  height={150}
                  width={1000}
                  className="w-100 h-auto d-block"
                  quality={100}
                  alt="Company Header"
                />
              )}

              {/* ── Title + QR Band ── */}
              <div className={styles.titleBand}>
                <div className={styles.titleLeft}>
                  <h1 className={styles.mainTitle}>Flight Booking<br />Voucher</h1>
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
                      <p className={styles.voucherNoLabel}>BOOKING REFERENCE / PNR:</p>
                      <h2 className={styles.voucherNumber}>{voucherDetail?.booking_reference}</h2>
                      {voucherDetail?.order_id && (
                        <>
                          <p className={styles.bookingDetailSmallLabel}>Order ID:</p>
                          <p className={styles.bookingDateValue}>{voucherDetail.order_id}</p>
                        </>
                      )}
                      <p className={styles.bookingDetailSmallLabel}>Booking Date:</p>
                      <p className={styles.bookingDateValue}>
                        {moment(voucherDetail?.created_at).format('DD MMMM YYYY, HH:mm')}
                      </p>
                      <span className={`${styles.confirmedBadge} ${voucherDetail?.booking_status === 'cancelled' ? styles.cancelledBadge : ''}`}>
                        Status: {voucherDetail?.booking_status?.toUpperCase()}
                      </span>
                      <br />
                      <span className={`${styles.confirmedBadge} ${voucherDetail?.payment_status === 'pending' ? styles.cancelledBadge : ''} mt-1`}>
                        Payment: {voucherDetail?.payment_status?.toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.voucherDetailsDivider} />
                    <div className={styles.voucherDetailsRight}>
                      <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Lead Passenger:</span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.passenger_details?.[0]?.title?.toUpperCase()}{' '}
                          {voucherDetail?.passenger_details?.[0]?.firstName}{' '}
                          {voucherDetail?.passenger_details?.[0]?.lastName}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Route:</span>
                        <span className={styles.bookingDetailValue}>{routeSummary()}</span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Trip Type:</span>
                        <span className={styles.bookingDetailValue}>{getTripTypeLabel()}</span>
                      </p>
                    
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Passengers:</span>
                        <span className={styles.bookingDetailValue}>{getTotalPassengers()}</span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Email:</span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.email || voucherDetail?.passenger_details?.[0]?.email || '—'}
                        </span>
                      </p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Contact:</span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.passenger_details?.[0]?.phone || '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Flight Segments ── */}
              {voucherDetail?.segments?.length > 0 &&
                getSegmentGroups().map((group, groupIndex) => (
                  <div key={`leg-${groupIndex}`} className={styles.sectionBlock}>
                    <div className={styles.sectionHeader}>
                      <div className="d-flex align-items-center gap-2">
                        <span className={styles.sectionIconWrap}><MdFlight size={13} /></span>
                        {group.displayLabel.toUpperCase()}
                      </div>
                      {group.routeLabel && (
                        <span className={styles.sectionHeaderRoute}>{group.routeLabel}</span>
                      )}
                    </div>
                    <div className={styles.segmentsWrapper}>
                        {group.segments.map((segment, segIndex) => {
                          const pnrInfo = getPnrForFlight(segment.flight_number);
                          const nextSegment = group.segments[segIndex + 1];
                          const layoverMins = nextSegment
                            ? getLayoverMinutes(segment, nextSegment)
                            : null;
                          const dep = segment.departure;
                          const arr = segment.arrival;

                          return (
                            <React.Fragment key={segment.segment_key || `${groupIndex}-${segIndex}`}>
                              <div className={styles.flightSegmentCard}>
                                {/* Airline Row */}
                                <div className={styles.airlineRow}>
                                  {segment.airline?.logo_url && (
                                    <img
                                      src={segment.airline.logo_url}
                                      alt={getAirlineName(segment.airline)}
                                      className={styles.airlineLogo}
                                    />
                                  )}
                                  <div className={styles.airlineMeta}>
                                    <p className={styles.airlineNameText}>{getAirlineName(segment.airline)}</p>
                                    <p className={styles.flightNumberText}>
                                      Flight: {getAirlineCode(segment.airline)} {segment.flight_number}
                                      {segment.cabin_class?.name && (
                                        <>&nbsp;|&nbsp;{segment.cabin_class.name}</>
                                      )}
                                      {segment.booking_class?.code && (
                                        <>&nbsp;|&nbsp;Class {segment.booking_class.code}</>
                                      )}
                                      {segment.aircraft && (
                                        <>&nbsp;|&nbsp;Aircraft {segment.aircraft}</>
                                      )}
                                    </p>
                                  </div>
                                  {(pnrInfo?.pnr || pnrInfo?.airPnr) && (
                                    <div className={styles.pnrBadgeWrap}>
                                      <span className={styles.pnrBadge}>
                                        PNR: {pnrInfo.pnr || pnrInfo.airPnr}
                                      </span>
                                      {pnrInfo.airPnr && pnrInfo.airPnr !== pnrInfo.pnr && (
                                        <span className={styles.pnrBadgeSecondary}>
                                          Air PNR: {pnrInfo.airPnr}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Route Grid */}
                                <div className={styles.routeGrid}>
                                  <div className={styles.routeStation}>
                                    <h4 className={styles.routeCity}>{getCityName(dep)}</h4>
                                    <p className={styles.routeAirport}>{getAirportName(dep)}</p>
                                    <p className={styles.routeCode}>
                                      {getAirportCode(dep)}
                                      {dep?.terminal && ` · Terminal ${dep.terminal}`}
                                    </p>
                                    <p className={styles.routeTime}>
                                      {dep?.datetime
                                        ? moment(dep.datetime).format('DD MMM YYYY, HH:mm')
                                        : '—'}
                                    </p>
                                  </div>

                                  <div className={styles.routeArrow}>
                                    <span className={styles.durationLabel}>{formatDuration(segment.duration)}</span>
                                    <div className={styles.arrowLine}>
                                      <MdFlight className={styles.planeIcon} />
                                    </div>
                                    {segment.stops > 0 && (
                                      <span className={styles.stopsLabel}>
                                        {segment.stops} Stop{segment.stops > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>

                                  <div className={`${styles.routeStation} ${styles.routeStationRight}`}>
                                    <h4 className={styles.routeCity}>{getCityName(arr)}</h4>
                                    <p className={styles.routeAirport}>{getAirportName(arr)}</p>
                                    <p className={styles.routeCode}>
                                      {getAirportCode(arr)}
                                      {arr?.terminal && ` · Terminal ${arr.terminal}`}
                                    </p>
                                    <p className={styles.routeTime}>
                                      {arr?.datetime
                                        ? moment(arr.datetime).format('DD MMM YYYY, HH:mm')
                                        : '—'}
                                    </p>
                                  </div>
                                </div>

                                {/* Segment Tickets & Seats */}
                                {voucherDetail?.passenger_details?.length > 0 && (
                                  <div className={styles.segmentMetaRow}>
                                    {voucherDetail.passenger_details.map((passenger, pIdx) => {
                                      const ticketNo = getTicketForSegment(
                                        segment.flight_number,
                                        passenger.passengerIndex || pIdx + 1
                                      );
                                      const seatNo = getSeatForPassenger(passenger, segment.flight_number);
                                      if (!ticketNo && !seatNo) return null;
                                      return (
                                        <div key={pIdx} className={styles.segmentMetaChip}>
                                          <span className={styles.segmentMetaName}>
                                            {passenger.firstName} {passenger.lastName}
                                          </span>
                                          {ticketNo && (
                                            <span className={styles.segmentMetaItem}>
                                              <MdConfirmationNumber size={12} /> E-Ticket: {ticketNo}
                                            </span>
                                          )}
                                          {seatNo && (
                                            <span className={styles.segmentMetaItem}>
                                              <FaChair size={11} /> Seat: {seatNo}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Baggage */}
                                {(segment?.baggage_info?.adult || segment?.baggage_info?.child || segment?.baggage_info?.infant) && (
                                  <div className={styles.baggageRow}>
                                    <span className={styles.baggageTitle}><MdLuggage size={14} /> Included Baggage:</span>
                                    {segment?.baggage_info?.adult && (
                                      <span className={styles.baggageChip}>
                                        Adult: {segment.baggage_info.adult.cabin} | {segment.baggage_info.adult.checked}
                                      </span>
                                    )}
                                    {segment?.baggage_info?.child && (
                                      <span className={styles.baggageChip}>
                                        Child: {segment.baggage_info.child.cabin} | {segment.baggage_info.child.checked}
                                      </span>
                                    )}
                                    {segment?.baggage_info?.infant && (
                                      <span className={styles.baggageChip}>
                                        Infant: {segment.baggage_info.infant.cabin} | {segment.baggage_info.infant.checked}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Layover — only within same leg */}
                              {layoverMins != null && layoverMins > 0 && (
                                <div className={styles.layoverBanner}>
                                  <span className={styles.layoverDot} />
                                  Layover in {getCityName(arr)} ({getAirportCode(arr)}) — {formatDuration(layoverMins)}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </div>
                  </div>
                ))}

              {/* ── Passenger Details ── */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaUser size={13} /></span>
                    PASSENGER DETAILS
                  </div>
                </div>
                <div className={styles.passengerList}>
                  {voucherDetail?.passenger_details?.map((passenger, index) => {
                    const seatLabels = (passenger.seats || [])
                      .filter((s) => s.seatNum)
                      .map((s) => `${s.airline || ''}${s.flightNum}: ${s.seatNum}`)
                      .join(', ');
                    const ticketNo = passenger.ticketNum || passenger.checkIn?.ticketNum;

                    return (
                      <div key={index} className={styles.passengerCard}>
                        <div className={styles.passengerCardHeader}>
                          <div className={styles.passengerIdentity}>
                            <span className={styles.passengerIndex}>{index + 1}</span>
                            <div className={styles.passengerNameBlock}>
                              <p className={styles.passengerName}>
                                {passenger.title?.toUpperCase()} {passenger.firstName} {passenger.lastName}
                              </p>
                              {ticketNo && (
                                <p className={styles.passengerTicket}>E-Ticket No: {ticketNo}</p>
                              )}
                            </div>
                          </div>
                          {passenger.type && (
                            <span className={styles.typeBadge}>
                              {getPassengerTypeLabel(passenger.type)}
                            </span>
                          )}
                        </div>

                        <div className={styles.passengerMetaGrid}>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Gender</span>
                            <span className={styles.metaValue}>
                              {passenger.gender === 'm' ? 'Male' : passenger.gender === 'f' ? 'Female' : '—'}
                            </span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Date of Birth</span>
                            <span className={styles.metaValue}>
                              {passenger.dateOfBirth
                                ? moment(passenger.dateOfBirth).format('DD MMM YYYY')
                                : '—'}
                            </span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Document</span>
                            <span className={styles.metaValue}>{getCardTypeLabel(passenger.cardType)}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Doc. Number</span>
                            <span className={styles.metaValue}>{passenger.cardNum || '—'}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Expiry</span>
                            <span className={styles.metaValue}>
                              {passenger.cardExpiredDate
                                ? moment(passenger.cardExpiredDate).format('DD MMM YYYY')
                                : '—'}
                            </span>
                          </div>
                          {seatLabels && (
                            <div className={`${styles.metaItem} `}>
                              <span className={styles.metaLabel}>Seats</span>
                              <span className={styles.metaValue}>{seatLabels}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Paid Ancillaries ── */}
              {(hasPaidBaggage || hasPaidSeats) && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><MdLuggage size={13} /></span>
                      ADDITIONAL SERVICES
                    </div>
                  </div>
                  <div className={styles.ancillaryWrapper}>
                    {hasPaidBaggage && (
                      <div className={styles.ancillaryGroup}>
                        <p className={styles.ancillaryGroupTitle}>Extra Baggage</p>
                        <div className={styles.ancillaryGrid}>
                          {paidAncillaries.baggage.map((bag, idx) => (
                            <div key={idx} className={styles.ancillaryCard}>
                              <div className={styles.ancillaryCardTop}>
                                <span className={styles.ancillaryName}>
                                  {bag.passenger?.first_name} {bag.passenger?.last_name}
                                </span>
                              </div>
                              <p className={styles.ancillaryDesc}>
                                {bag.description || `Checked baggage ${bag.baggage_weight || ''}`.trim()}
                              </p>
                              {bag.journeys?.length > 0 && (
                                <p className={styles.ancillaryMeta}>
                                  Applies to:{' '}
                                  {bag.journeys
                                    .map((j) => `${j.airline}${j.flightNum} (${j.departure}→${j.arrival})`)
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasPaidSeats && (
                      <div className={styles.ancillaryGroup}>
                        <p className={styles.ancillaryGroupTitle}>Seat Selection</p>
                        <div className={styles.ancillaryGrid}>
                          {paidAncillaries.seat.map((seat, idx) => (
                            <div key={idx} className={styles.ancillaryCard}>
                              <div className={styles.ancillaryCardTop}>
                                <span className={styles.ancillaryName}>
                                  {seat.passenger?.first_name} {seat.passenger?.last_name} — Seat {seat.seat_name}
                                </span>
                              </div>
                              {seat.segment && (
                                <p className={styles.ancillaryMeta}>
                                  {seat.segment.airline}{seat.segment.flightNum}{' '}
                                  ({seat.segment.departure}→{seat.segment.arrival})
                                  {seat.characteristics?.length > 0 && (
                                    <> · {seat.characteristics.join(', ')}</>
                                  )}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Important Information ── */}
              <div className={styles.importantSection}>
                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                <div className={styles.importantDivider} />
                <ul className={styles.importantList}>
                  <li>Please arrive at the airport at least 3 hours before international flights and 2 hours before domestic flights.</li>
                  <li>Valid passport and visa (if required) must be presented at check-in.</li>
                  <li>Check-in closes 60 minutes before departure for international flights and 45 minutes for domestic flights.</li>
                  <li>Baggage allowance is subject to airline terms and conditions.</li>
                  <li>This is an electronic ticket. No paper ticket is required for travel.</li>
                  <li>Please keep this voucher and your booking reference (PNR) handy for check-in and airport assistance.</li>
                </ul>
              </div>

              {/* ── Company Footer Image ── */}
              {voucherDetail?.client?.footer_image && (
                <Image
                  src={voucherDetail.client.footer_image}
                  height={150}
                  width={1000}
                  className="w-100 h-auto d-block"
                  quality={100}
                  alt="Company Footer"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
      {!isLoading && !errorMessage && (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          <div className={styles.actionRow}>
            <button className={styles.btnPrimary} onClick={() => window.print()}>
              <FaPrint size={14} />
              Print Voucher
            </button>
            <Link href={`/flights/invoice/${voucherDetail?.booking_reference}`} style={{ textDecoration: 'none' }}>
              <button className={styles.btnGold}>
                <FaFileInvoice size={14} />
                View Invoice
              </button>
            </Link>
            <Link href='/' style={{ textDecoration: 'none' }}>
              <button className={styles.btnOutline}>
                <FaHome size={14} />
                Go Home
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
