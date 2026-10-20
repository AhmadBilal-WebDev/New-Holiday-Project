'use client'
import React, { useRef, useEffect, useState } from 'react'
import styles from '../../../hotels/invoice/[id]/Invoice.module.css'
import VoucherStyles from '../../voucher/[id]/voucher.module.css'
import localStyles from './local.module.css'
import moment from 'moment'
import { FaUser, FaPrint, FaFileInvoice, FaHome, FaSuitcase, FaPhone, FaEnvelope, FaGlobe, FaChair } from 'react-icons/fa'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import FlightBookingDetailLoader from '@/components/Loader/FlightBookinfDetailLoader'
import Image from 'next/image'
import { PiDownloadSimpleThin } from 'react-icons/pi'
import { Tooltip } from '@mantine/core'
import { MdFlight, MdLuggage, MdConfirmationNumber } from 'react-icons/md'
import { groupSegments } from '@/components/Flights/Checkout/flightHelpers'

export default function page() {
  const voucherRef = useRef()
  const { id } = useParams()
  const [voucherDetail, setVoucherDetail] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => { fetchDetails() }, [id])

  const fetchDetails = async () => {
    setIsLoading(true)
    try {
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_reference: id }),
      })
      const res = await responses.json()
      setIsLoading(false)
      if (res.success) {
        setVoucherDetail(res?.data)
      } else {
        setErrorMessage(res?.message)
      }
    } catch (err) {
      setIsLoading(false)
      console.error('Error fetching flight details:', err)
    }
  }

  const getCityName = (point) => point?.city || point?.airport_code || point?.iata_code || ''
  const getAirportName = (point) => point?.airport_name || point?.name || point?.airport_code || point?.iata_code || ''
  const getAirportCode = (point) => point?.airport_code || point?.iata_code || ''
  const getAirlineName = (airline) => airline?.name || airline?.code || airline?.iata_code || ''
  const getAirlineCode = (airline) => airline?.code || airline?.iata_code || ''

  const getTotalPassengers = () => {
    if (!voucherDetail?.passenger_counts) return ''
    const { adults = 0, children = 0, infants = 0 } = voucherDetail.passenger_counts
    const parts = []
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`)
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`)
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`)
    return parts.join(', ')
  }

  const getInvoiceCurrency = () =>
    voucherDetail?.pricing?.display_currency ||
    voucherDetail?.pricing?.currency ||
    ''

  function convertToCustomerCurrency(price, sourceCurrency) {
    const pricing = voucherDetail?.pricing
    const displayCurrency = getInvoiceCurrency()
    if (price == null || price === '') return Number(0).toFixed(2)

    const fromCurrency =
      sourceCurrency || pricing?.supplier_currency || ''

    // Already in invoice/display currency — no conversion
    if (fromCurrency && displayCurrency && fromCurrency === displayCurrency) {
      return Number(price).toFixed(2)
    }

    if (!pricing?.supplier_to_display_rate) return Number(price || 0).toFixed(2)
    return (Number(price) * Number(pricing.supplier_to_display_rate)).toFixed(2)
  }

  const getDisplayTotal = () => {
    const total =
      voucherDetail?.pricing?.amount_in_display_currency ??
      voucherDetail?.pricing?.amount ??
      0
    return Number(total).toFixed(2)
  }

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '—'
    const mins = Number(minutes)
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const getTripTypeLabel = () => {
    const t = voucherDetail?.flight_details?.trip_type
    if (t === 'one_way') return 'One Way Flight'
    if (t === 'return') return 'Return Flight'
    if (t === 'multi_city' || t === 'multicity') return 'Multi City Flight'
    return 'Flight Details'
  }

  const getSegmentGroups = () => {
    const groups = groupSegments({
      segments: voucherDetail?.segments || [],
      trip_type: voucherDetail?.flight_details?.trip_type,
      search_criteria:
        voucherDetail?.flight_details?.search_criteria ||
        voucherDetail?.search_criteria,
    })

    return groups.map((group, idx) => {
      let displayLabel = group.label || `Flight ${idx + 1}`
      if (displayLabel === 'Departure') displayLabel = 'Departure Flight'
      if (displayLabel === 'Return') displayLabel = 'Return Flight'

      const first = group.segments?.[0]?.departure
      const last = group.segments?.[group.segments.length - 1]?.arrival
      const routeLabel =
        first && last
          ? `${getCityName(first)} (${getAirportCode(first)}) → ${getCityName(last)} (${getAirportCode(last)})`
          : ''

      return { ...group, displayLabel, routeLabel }
    })
  }

  const getPassengerTypeLabel = (type) => {
    if (!type) return ''
    if (type === 'adult' || type === 'ADT') return 'Adult'
    if (type === 'child' || type === 'CHD') return 'Child'
    if (type === 'infant' || type === 'infant_without_seat' || type === 'INF') return 'Infant'
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getCardTypeLabel = (cardType) => {
    if (!cardType) return '—'
    const type = String(cardType).toLowerCase()
    if (type === 'p' || type === 'passport') return 'Passport'
    if (type === 'n' || type === 'id' || type === 'id_card') return 'ID Card'
    if (type === 'o' || type === 'other') return 'Other'
    return cardType
  }

  const getPnrForFlight = (flightNum) => {
    return voucherDetail?.pnr_list?.find(
      (p) => String(p.flightNum) === String(flightNum)
    )
  }

  const getSeatForPassenger = (passenger, flightNum) => {
    return passenger?.seats?.find(
      (s) => String(s.flightNum) === String(flightNum) && s.seatNum
    )?.seatNum || ''
  }

  const getTicketForSegment = (flightNum, passengerIndex) => {
    const pnr = getPnrForFlight(flightNum)
    const ticket = pnr?.ticketNums?.find(
      (t) => Number(t.passengerIndex) === Number(passengerIndex)
    )
    return ticket?.ticketNum || ''
  }

  const getLayoverMinutes = (currentSeg, nextSeg) => {
    if (!currentSeg?.arrival?.datetime || !nextSeg?.departure?.datetime) return null
    return moment(nextSeg.departure.datetime).diff(moment(currentSeg.arrival.datetime), 'minutes')
  }

  const paidAncillaries = voucherDetail?.baggage_info?.paid
  const hasPaidBaggage = paidAncillaries?.baggage?.length > 0
  const hasPaidSeats = paidAncillaries?.seat?.length > 0

  const matchPassengerName = (passenger, firstName, lastName) => {
    const pFirst = String(passenger?.firstName || '').trim().toLowerCase()
    const pLast = String(passenger?.lastName || '').trim().toLowerCase()
    const aFirst = String(firstName || '').trim().toLowerCase()
    const aLast = String(lastName || '').trim().toLowerCase()
    return pFirst === aFirst && pLast === aLast
  }

  const getPassengerBaggage = (passenger) => {
    return (paidAncillaries?.baggage || []).filter((bag) =>
      matchPassengerName(passenger, bag.passenger?.first_name, bag.passenger?.last_name)
    )
  }

  const getPassengerSeatLabels = (passenger) => {
    const fromPassengerSeats = (passenger.seats || [])
      .filter((s) => s.seatNum)
      .map((s) => `${s.airline || ''}${s.flightNum}: ${s.seatNum}`)

    if (fromPassengerSeats.length) return fromPassengerSeats.join(', ')

    return (paidAncillaries?.seat || [])
      .filter((seat) =>
        matchPassengerName(passenger, seat.passenger?.first_name, seat.passenger?.last_name)
      )
      .map((seat) => {
        const flight = seat.segment
          ? `${seat.segment.airline || ''}${seat.segment.flightNum}`
          : ''
        return flight ? `${flight}: ${seat.seat_name}` : seat.seat_name
      })
      .filter(Boolean)
      .join(', ')
  }

  const leadPassenger = voucherDetail?.passenger_details?.[0]

  if (isLoading) {
    return (
      <div className={styles.invoicecontainerwrap}>
        <div className={styles.invoicecontainer}>
          <div className={`${styles.themeholyinvoice} p-3`}><FlightBookingDetailLoader /></div>
        </div>
      </div>
    )
  }

  if (errorMessage || !voucherDetail) {
    return (
      <div className={styles.invoicecontainerwrap}>
        <div className={styles.invoicecontainer}>
          <div className="alert alert-danger">{errorMessage || 'Failed to load invoice details'}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.invoicecontainerwrap}>
        <div className={styles.invoicecontainer}>

          {/* ── Action buttons ── */}
          <div className={styles.invoiceprintbutton}>
            <Tooltip label='Print Invoice' color="blue">
              <div onClick={() => window.print()} className="bg-primary-subtle cursor-pointer p-2 text-primary rounded">
                <PiDownloadSimpleThin size={25} />
              </div>
            </Tooltip>
            <Tooltip label='View Voucher' color="teal">
              <Link href={`/flights/voucher/${voucherDetail.booking_reference}`}>
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

          <div ref={voucherRef} id="invoice" className={styles.themeholyinvoice}>

            {/* ── HEADER ── */}
            <div className={styles.invHeader}>
              <div className={styles.invHeaderLeft}>
                <div className={`${styles.invHeaderLogo} text-center`}>
                  <Image src='/images/logoblack.png' height={100} width={150} className="h-auto" quality={100} alt="Logo" />
                </div>
                <div className={styles.invHeaderMeta}>
                  <span>Date: <b>{moment(voucherDetail?.created_at).format('DD-MM-YYYY')}</b></span>
                  <span>Ref: <b>{voucherDetail?.booking_reference}</b></span>
                </div>
                <div className={styles.invHeaderTitle}>INVOICE</div>
              </div>

              <div className={styles.invHeaderRight}>
                <div className={styles.invBookingFor}>Booking For:</div>
                <div className={styles.invGuestName}>
                  {leadPassenger?.title && `${leadPassenger.title}. `}
                  {leadPassenger?.firstName} {leadPassenger?.lastName}
                </div>
                <div className={styles.invHeaderDivider}></div>
                <div className={styles.invContactInfo}>
                  {voucherDetail?.email && <p>{voucherDetail.email}</p>}
                  {leadPassenger?.phone && <p>{leadPassenger.phone}</p>}
                  <p>{leadPassenger.gender === 'm' ? ' Male' : ' Female'}</p>
                </div>
                <div className={styles.invHeaderDivider}></div>
                <div className={styles.invStatusRow}>
                  <span className={`${styles.invStatusBadge} ${voucherDetail?.booking_status === 'confirmed' ? styles.confirmedStatus : voucherDetail?.booking_status === 'cancelled' ? styles.cancelledStatus : styles.pandingStatus}`}>
                   STATUS: {voucherDetail?.booking_status?.toUpperCase()}
                  </span>
                  <span className={`${styles.invStatusBadge} ${voucherDetail?.payment_status === 'paid' ? styles.confirmedStatus : voucherDetail?.payment_status === 'pending' ? styles.pandingStatus : styles.cancelledStatus} mt-1`}>
                    PAYMENT: {voucherDetail?.payment_status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── CONTENT ── */}
            <div className={styles.downloadinner}>

              <div className={`${styles.accomBlock} mb-3`}>
                <div className={styles.accomHeader}>
                  <span className={styles.accomTitle}>• Flight Details</span>
                  <span className={styles.accomCity} style={{ color: '#E7247A' }}>
                    {getTripTypeLabel().toUpperCase()}
                  </span>
                </div>


              </div>

              {/* ── Flight Segments ── */}
              {voucherDetail?.segments?.length > 0 &&
                getSegmentGroups().map((group, groupIndex) => (
                  <div key={`leg-${groupIndex}`} className={`${VoucherStyles.sectionBlock} mb-3`}>
                    <div className={VoucherStyles.sectionHeader}>
                      <div className="d-flex align-items-center gap-2">
                        <span className={VoucherStyles.sectionIconWrap}><MdFlight size={13} /></span>
                        {group.displayLabel.toUpperCase()}
                      </div>
                      {group.routeLabel && (
                        <span className={VoucherStyles.sectionHeaderRoute}>{group.routeLabel}</span>
                      )}
                    </div>
                    <div className={`${VoucherStyles.segmentsWrapper} p-0`}>
                        {group.segments.map((segment, segIndex) => {
                          const dep = segment.departure
                          const arr = segment.arrival
                          const pnrInfo = getPnrForFlight(segment.flight_number)
                          const nextSegment = group.segments[segIndex + 1]
                          const layoverMins = nextSegment
                            ? getLayoverMinutes(segment, nextSegment)
                            : null

                          return (
                            <React.Fragment key={segment.segment_key || `${groupIndex}-${segIndex}`}>
                              <div className={VoucherStyles.flightSegmentCard}>
                                <div className={VoucherStyles.airlineRow}>
                                  {segment.airline?.logo_url && (
                                    <img
                                      src={segment.airline.logo_url}
                                      alt={getAirlineName(segment.airline)}
                                      className={VoucherStyles.airlineLogo}
                                    />
                                  )}
                                  <div className={VoucherStyles.airlineMeta}>
                                    <p className={VoucherStyles.airlineNameText}>{getAirlineName(segment.airline)}</p>
                                    <p className={VoucherStyles.flightNumberText}>
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
                                    <div className={VoucherStyles.pnrBadgeWrap}>
                                      <span className={VoucherStyles.pnrBadge}>
                                        PNR: {pnrInfo.pnr || pnrInfo.airPnr}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className={VoucherStyles.routeGrid}>
                                  <div className={VoucherStyles.routeStation}>
                                    <h4 className={VoucherStyles.routeCity}>{getCityName(dep)}</h4>
                                    <p className={VoucherStyles.routeAirport}>{getAirportName(dep)}</p>
                                    <p className={VoucherStyles.routeCode}>
                                      {getAirportCode(dep)}
                                      {dep?.terminal && ` · Terminal ${dep.terminal}`}
                                    </p>
                                    <p className={VoucherStyles.routeTime}>
                                      {dep?.datetime
                                        ? moment(dep.datetime).format('DD MMM YYYY, HH:mm')
                                        : '—'}
                                    </p>
                                  </div>

                                  <div className={VoucherStyles.routeArrow}>
                                    <span className={VoucherStyles.durationLabel}>{formatDuration(segment.duration)}</span>
                                    <div className={VoucherStyles.arrowLine}>
                                      <MdFlight className={VoucherStyles.planeIcon} />
                                    </div>
                                  </div>

                                  <div className={`${VoucherStyles.routeStation} ${VoucherStyles.routeStationRight}`}>
                                    <h4 className={VoucherStyles.routeCity}>{getCityName(arr)}</h4>
                                    <p className={VoucherStyles.routeAirport}>{getAirportName(arr)}</p>
                                    <p className={VoucherStyles.routeCode}>
                                      {getAirportCode(arr)}
                                      {arr?.terminal && ` · Terminal ${arr.terminal}`}
                                    </p>
                                    <p className={VoucherStyles.routeTime}>
                                      {arr?.datetime
                                        ? moment(arr.datetime).format('DD MMM YYYY, HH:mm')
                                        : '—'}
                                    </p>
                                  </div>
                                </div>

                                {voucherDetail?.passenger_details?.length > 0 && (
                                  <div className={VoucherStyles.segmentMetaRow}>
                                    {voucherDetail.passenger_details.map((passenger, pIdx) => {
                                      const ticketNo = getTicketForSegment(
                                        segment.flight_number,
                                        passenger.passengerIndex || pIdx + 1
                                      )
                                      const seatNo = getSeatForPassenger(passenger, segment.flight_number)
                                      if (!ticketNo && !seatNo) return null
                                      return (
                                        <div key={pIdx} className={VoucherStyles.segmentMetaChip}>
                                          <span className={VoucherStyles.segmentMetaName}>
                                            {passenger.firstName} {passenger.lastName}
                                          </span>
                                          {ticketNo && (
                                            <span className={VoucherStyles.segmentMetaItem}>
                                              <MdConfirmationNumber size={12} /> E-Ticket: {ticketNo}
                                            </span>
                                          )}
                                          {seatNo && (
                                            <span className={VoucherStyles.segmentMetaItem}>
                                              <FaChair size={11} /> Seat: {seatNo}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {(segment?.baggage_info?.adult || segment?.baggage_info?.child || segment?.baggage_info?.infant) && (
                                  <div className={VoucherStyles.baggageRow}>
                                    <span className={VoucherStyles.baggageTitle}><MdLuggage size={14} /> Baggage:</span>
                                    {segment?.baggage_info?.adult && (
                                      <span className={VoucherStyles.baggageChip}>
                                        Adult: {segment.baggage_info.adult.cabin} | {segment.baggage_info.adult.checked}
                                      </span>
                                    )}
                                    {segment?.baggage_info?.child && (
                                      <span className={VoucherStyles.baggageChip}>
                                        Child: {segment.baggage_info.child.cabin} | {segment.baggage_info.child.checked}
                                      </span>
                                    )}
                                    {segment?.baggage_info?.infant && (
                                      <span className={VoucherStyles.baggageChip}>
                                        Infant: {segment.baggage_info.infant.cabin} | {segment.baggage_info.infant.checked}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {layoverMins != null && layoverMins > 0 && (
                                <div className={VoucherStyles.layoverBanner}>
                                  <span className={VoucherStyles.layoverDot} />
                                  Layover in {getCityName(arr)} ({getAirportCode(arr)}) — {formatDuration(layoverMins)}
                                </div>
                              )}
                            </React.Fragment>
                          )
                        })}
                    </div>
                  </div>
                ))}

              {/* ── PASSENGER DETAILS ── */}
              {voucherDetail?.passenger_details?.length > 0 && (
                <div className={`${styles.accomBlock} mb-3 mt-3`}>
                  <div className={styles.accomHeader}>
                    <span className={styles.accomTitle}>• Passenger Details</span>
                    <span className={styles.accomCity}>{getTotalPassengers()}</span>
                  </div>
                  <div className={styles.accomDivider}></div>
                  <div className={localStyles.passengerList}>
                    {voucherDetail.passenger_details.map((passenger, index) => {
                      const ticketNo = passenger.ticketNum || passenger.checkIn?.ticketNum
                      const contactParts = [passenger.email, passenger.phone].filter(Boolean)
                      const seatLabels = getPassengerSeatLabels(passenger)
                      const passengerBags = getPassengerBaggage(passenger)
                      const baggageLabel = passengerBags
                        .map((bag) => bag.description || `Checked baggage ${bag.baggage_weight || ''}`.trim())
                        .filter(Boolean)
                        .join(', ')

                      return (
                        <div key={index} className={localStyles.passengerCard}>
                          <div className={localStyles.passengerCardHeader}>
                            <div className={localStyles.passengerIdentity}>
                              <span className={localStyles.passengerIndex}>{index + 1}</span>
                              <div className={localStyles.passengerNameBlock}>
                                <p className={localStyles.passengerName}>
                                  {passenger.title?.toUpperCase()} {passenger.firstName} {passenger.lastName}
                                </p>
                                {ticketNo && (
                                  <p className={localStyles.passengerTicket}>E-Ticket No: {ticketNo}</p>
                                )}
                              </div>
                            </div>
                            {passenger.type && (
                              <span className={localStyles.typeBadge}>
                                {getPassengerTypeLabel(passenger.type)}
                              </span>
                            )}
                          </div>

                          <div className={localStyles.passengerMetaGrid}>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Gender</span>
                              <span className={localStyles.metaValue}>
                                {passenger.gender === 'm' ? 'Male' : passenger.gender === 'f' ? 'Female' : '—'}
                              </span>
                            </div>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Date of Birth</span>
                              <span className={localStyles.metaValue}>
                                {passenger.dateOfBirth
                                  ? moment(passenger.dateOfBirth).format('DD MMM YYYY')
                                  : '—'}
                              </span>
                            </div>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Document</span>
                              <span className={localStyles.metaValue}>
                                {getCardTypeLabel(passenger.cardType)}
                              </span>
                            </div>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Doc. Number</span>
                              <span className={localStyles.metaValue}>
                                {passenger.cardNum || '—'}
                              </span>
                            </div>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Expiry</span>
                              <span className={localStyles.metaValue}>
                                {passenger.cardExpiredDate
                                  ? moment(passenger.cardExpiredDate).format('DD MMM YYYY')
                                  : '—'}
                              </span>
                            </div>
                            <div className={localStyles.metaItem}>
                              <span className={localStyles.metaLabel}>Contact</span>
                              <span className={`${localStyles.metaValue} ${!contactParts.length ? localStyles.metaValueMuted : ''}`}>
                                {contactParts.length ? contactParts.join(' · ') : '—'}
                              </span>
                            </div>
                            {seatLabels && (
                              <div className={localStyles.metaItem}>
                                <span className={localStyles.metaLabel}>Seats</span>
                                <span className={localStyles.metaValue}>{seatLabels}</span>
                              </div>
                            )}
                            {baggageLabel && (
                              <div className={localStyles.metaItem}>
                                <span className={localStyles.metaLabel}>Extra Baggage</span>
                                <span className={localStyles.metaValue}>{baggageLabel}</span>
                              </div>
                            )}
                          </div>

                          {passengerBags.length > 0 && (
                            <div className={localStyles.passengerExtras}>
                              {passengerBags.map((bag, bagIdx) => (
                                <div key={bagIdx} className={localStyles.extraChip}>
                                  <MdLuggage size={13} />
                                  <span>
                                    {bag.description || `Checked baggage ${bag.baggage_weight || ''}`.trim()}
                                    {bag.journeys?.length > 0 && (
                                      <> — {bag.journeys.map((j) => `${j.airline}${j.flightNum}`).join(', ')}</>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── ADDITIONAL SERVICES ── */}
              {(hasPaidBaggage || hasPaidSeats) && (
                <div className={`${styles.accomBlock} mb-3`}>
                  <div className={styles.accomHeader}>
                    <span className={styles.accomTitle}>• Additional Services</span>
                  </div>
                  <div className={styles.accomDivider}></div>
                  <div className={localStyles.ancillaryList}>
                    {hasPaidBaggage && (
                      <div className={localStyles.ancillaryGroup}>
                        <p className={localStyles.ancillaryGroupTitle}>Extra Baggage</p>
                        <div className={localStyles.ancillaryGrid}>
                          {paidAncillaries.baggage.map((bag, idx) => (
                            <div key={idx} className={localStyles.ancillaryCard}>
                              <div className={localStyles.ancillaryCardTop}>
                                <span className={localStyles.ancillaryName}>
                                  {bag.passenger?.first_name} {bag.passenger?.last_name}
                                </span>
                                <span className={localStyles.ancillaryPrice}>
                                  {getInvoiceCurrency()}{' '}
                                  {convertToCustomerCurrency(
                                    bag.price,
                                    bag.currency || paidAncillaries.currency
                                  )}
                                </span>
                              </div>
                              <p className={localStyles.ancillaryDesc}>
                                {bag.description || `Checked baggage ${bag.baggage_weight || ''}`.trim()}
                              </p>
                              {bag.journeys?.length > 0 && (
                                <p className={localStyles.ancillaryMeta}>
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
                      <div className={localStyles.ancillaryGroup}>
                        <p className={localStyles.ancillaryGroupTitle}>Seat Selection</p>
                        <div className={localStyles.ancillaryGrid}>
                          {paidAncillaries.seat.map((seat, idx) => (
                            <div key={idx} className={localStyles.ancillaryCard}>
                              <div className={localStyles.ancillaryCardTop}>
                                <span className={localStyles.ancillaryName}>
                                  {seat.passenger?.first_name} {seat.passenger?.last_name} — Seat {seat.seat_name}
                                </span>
                                <span className={localStyles.ancillaryPrice}>
                                  {getInvoiceCurrency()}{' '}
                                  {convertToCustomerCurrency(
                                    seat.price,
                                    seat.currency || paidAncillaries.currency
                                  )}
                                </span>
                              </div>
                              {seat.segment && (
                                <p className={localStyles.ancillaryMeta}>
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

              {/* ── PAYMENT SUMMARY ── */}
              <div className="text-end">
                <table className={`${styles.totaltable} w-100`}>
                  <tbody>
                    <tr>
                      <td>
                        Base Fare: {getInvoiceCurrency()}{' '}
                        {convertToCustomerCurrency(
                          Number(voucherDetail?.pricing?.base_amount) +
                            Number(voucherDetail?.pricing?.total_markup_amount)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Taxes &amp; Fees: {getInvoiceCurrency()}{' '}
                        {convertToCustomerCurrency(voucherDetail?.pricing?.tax_amount)}
                      </td>
                    </tr>
                    {(hasPaidBaggage || hasPaidSeats) && paidAncillaries?.total_amount ? (
                      <tr>
                        <td>
                          Additional Services: {getInvoiceCurrency()}{' '}
                          {convertToCustomerCurrency(
                            paidAncillaries.total_amount,
                            paidAncillaries.currency
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className={styles.invTotalSection}>
                <div className={styles.invTotalLabel}>Total:</div>
                <div className={styles.invTotalAmount}>
                  {getInvoiceCurrency()} {getDisplayTotal()}
                </div>
                <span className='small'>Included VAT and Taxes</span>
              </div>

              <div className={styles.invTotalDivider}></div>

              <div className={styles.invTotalNote}>
                <b>Important Information</b>
                <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
                  <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Please arrive at the airport at least 3 hours before international flights and 2 hours before domestic flights.</li>
                  <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Valid passport and visa (if required) must be presented at check-in.</li>
                  <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Check-in closes 60 minutes before departure for international flights and 45 minutes for domestic flights.</li>
                  <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Baggage allowance is subject to airline terms and conditions.</li>
                  <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>This is an electronic ticket. No paper ticket is required for travel.</li>
                </ul>
              </div>
              <div className={styles.invTotalDivider}></div>
            </div>
            <div className="text-end mt-4 mb-4 me-3">
              <p className="mb-0">Thank you and Best Regards</p>
              <p className="fw-bold">Al-Hijaz Tours </p>
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
      </div>
    </div>
  )
}
