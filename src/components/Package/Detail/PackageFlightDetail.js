'use client'

import React from 'react'
import { FaPlane } from 'react-icons/fa'
import { MdFlight } from 'react-icons/md'
import moment from 'moment'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageFlightDetail.module.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

function calcDuration(from, to) {
  const diff = moment(to).diff(moment(from), 'minutes')
  if (!diff || diff < 0) return null
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(value) {
  return moment.utc(value).format('HH:mm')
}

function formatDate(value) {
  return moment.utc(value).format('MMMM D, YYYY')
}

function getClassLabel(item) {
  return item?.cabin_class || item?.travel_class || item?.class || item?.flight_class || 'Economy'
}

function getStopsLabel(stopCount) {
  if (!stopCount || stopCount <= 1) return 'Direct'
  const stops = stopCount - 1
  return `${stops} Stop${stops > 1 ? 's' : ''}`
}

function FlightCard({ item, directionLabel, stopsLabel }) {
  const duration = calcDuration(item.datetime_from, item.datetime_to)
  const airlineName = item.airline_name || 'Airline'
  const flightNumber = item.flight_number ? `Flight ${item.flight_number}` : null
  const classLabel = getClassLabel(item)

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardTopLeft}>
          <span className={styles.directionLabel}>{directionLabel}</span>
          <h4 className={`${styles.airlineTitle} ${outfit.className}`}>
            {airlineName}
            {flightNumber ? ` - ${flightNumber}` : ''}
          </h4>
        </div>
        <div className={styles.cardTopRight}>
          {stopsLabel} · Class: {classLabel}
        </div>
      </div>

      <div className={styles.routeRow}>
        <div className={styles.endpoint}>
          <span className={styles.endpointLabel}>Departure</span>
          <div className={`${styles.endpointTime} ${outfit.className}`}>
            {formatTime(item.datetime_from)}
          </div>
          <p className={styles.endpointPlace}>{item.departure_from}</p>
          <p className={styles.endpointDate}>{formatDate(item.datetime_from)}</p>
        </div>

        <div className={styles.middle}>
          <FaPlane size={16} className={styles.middlePlane} aria-hidden="true" />
          {duration ? <span className={styles.duration}>{duration}</span> : null}
          <span className={styles.middleLine} aria-hidden="true" />
        </div>

        <div className={`${styles.endpoint} ${styles.endpointRight}`}>
          <span className={styles.endpointLabel}>Arrival</span>
          <div className={`${styles.endpointTime} ${outfit.className}`}>
            {formatTime(item.datetime_to)}
          </div>
          <p className={styles.endpointPlace}>{item.departure_to}</p>
          <p className={styles.endpointDate}>{formatDate(item.datetime_to)}</p>
        </div>
      </div>
    </article>
  )
}

export default function PackageFlightDetail({ PackageDetail }) {
  if (!PackageDetail?.flights?.length) return null

  const flights = PackageDetail.flights

  const departStops = flights.flatMap((flight) =>
    (flight.stops || []).filter((s) => s.is_return === false)
  )
  const returnStops = flights.flatMap((flight) =>
    (flight.stops || []).filter((s) => s.is_return === true)
  )

  const departStopsLabel = getStopsLabel(departStops.length)
  const returnStopsLabel = getStopsLabel(returnStops.length)

  return (
    <section className={`${styles.section} ${inter.className}`}>
      <h2 className={`${styles.sectionTitle} ${outfit.className}`}>
        <MdFlight size={22} className={styles.sectionIcon} aria-hidden="true" />
        Flight Details
      </h2>

      {departStops.map((item, index) => (
        <FlightCard
          key={`dep-${index}`}
          item={item}
          directionLabel="Outbound Flight"
          stopsLabel={departStopsLabel}
        />
      ))}

      {returnStops.map((item, index) => (
        <FlightCard
          key={`ret-${index}`}
          item={item}
          directionLabel="Return Flight"
          stopsLabel={returnStopsLabel}
        />
      ))}
    </section>
  )
}
