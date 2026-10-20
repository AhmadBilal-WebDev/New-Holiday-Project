'use client'

import React from 'react'
import { FaBus } from 'react-icons/fa'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageTransferDetail.module.css'

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

const formatTripType = (type) => {
  const labels = {
    'one-way': 'One Way',
    return: 'Return',
    'all-round': 'All Round',
  }
  return labels[type] || type
}

function buildSubtitle(item) {
  const parts = []
  if (item?.vehicle) parts.push(item.vehicle)
  if (item?.trip_type) parts.push(formatTripType(item.trip_type))
  return parts.filter(Boolean).join(' · ')
}

function TransferCard({ route, subtitle }) {
  return (
    <article className={styles.card}>
      <div className={styles.iconBadge} aria-hidden="true">
        <FaBus size={16} />
      </div>
      <div className={styles.content}>
        <p className={`${styles.route} ${outfit.className}`}>{route}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </article>
  )
}

export default function PackageTransferDetail({ PackageDetail }) {
  const transfers = PackageDetail?.transfers
  if (!Array.isArray(transfers) || transfers.length === 0) return null

  const cards = []

  transfers.forEach((item, index) => {
    const subtitle = buildSubtitle(item)
    const locations = Array.isArray(item?.locations) ? item.locations : []

    if (locations.length === 0) {
      cards.push(
        <TransferCard
          key={`t-${index}`}
          route={item?.vehicle || formatTripType(item?.trip_type) || 'Ground Transfer'}
          subtitle={subtitle}
        />
      )
      return
    }

    locations.forEach((location, locIndex) => {
      const pickup = location?.pickup_address || 'Pickup'
      const dropoff = location?.dropoff_address || 'Drop-off'
      cards.push(
        <TransferCard
          key={`t-${index}-${locIndex}`}
          route={`${pickup} → ${dropoff}`}
          subtitle={subtitle}
        />
      )
    })
  })

  return (
    <section className={`${styles.section} ${inter.className}`}>
      <h2 className={`${styles.sectionTitle} ${outfit.className}`}>
        <FaBus size={20} className={styles.sectionIcon} aria-hidden="true" />
        Ground Transfers
      </h2>
      {cards}
    </section>
  )
}
