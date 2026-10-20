'use client'

import React from 'react'
import styles from './PackageDetailLoader.module.css'

function Bone({ className }) {
  return <span className={`${styles.shimmer} ${className || ''}`.trim()} />
}

export default function PackageDetailLoader() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading package details…</span>

      {/* Gallery banner */}
      <div className={styles.galleryWrap}>
        <Bone className={styles.gallery} />
      </div>

      <div className="container mt-4">
        <div className="row g-4">
          {/* Main column */}
          <div className="col-md-8 col-12">
            {/* Hero summary */}
            <section className={styles.heroBlock}>
              <Bone className={styles.catTag} />
              <div className={styles.titleRow}>
                <Bone className={styles.title} />
                <div className={styles.iconActions}>
                  <Bone className={styles.iconBtn} />
                  <Bone className={styles.iconBtn} />
                </div>
              </div>
              <Bone className={styles.location} />
              <div className={styles.metaRow}>
                <Bone className={styles.rating} />
                <Bone className={styles.duration} />
              </div>
              <div className={styles.priceList}>
                <Bone className={styles.priceBar} />
                <Bone className={styles.priceBar} />
                <Bone className={styles.priceBar} />
              </div>
            </section>

            {/* About */}
            <section className={styles.block}>
              <Bone className={styles.sectionTitle} />
              <Bone className={styles.line} />
              <Bone className={styles.line} />
              <Bone className={`${styles.line} ${styles.lineShort}`} />
            </section>

            {/* Package summary */}
            <section className={styles.block}>
              <Bone className={styles.sectionTitle} />
              <div className={styles.summaryGrid}>
                <Bone className={styles.summaryCard} />
                <Bone className={styles.summaryCard} />
                <Bone className={styles.summaryCard} />
                <Bone className={styles.summaryCard} />
              </div>
            </section>

            {/* Incl / Excl */}
            <section className={styles.block}>
              <Bone className={styles.sectionTitle} />
              <div className={styles.pills}>
                <Bone className={styles.pill} />
                <Bone className={`${styles.pill} ${styles.pillMd}`} />
                <Bone className={`${styles.pill} ${styles.pillLg}`} />
                <Bone className={styles.pill} />
                <Bone className={`${styles.pill} ${styles.pillMd}`} />
              </div>
            </section>

            {/* Hotel card */}
            <section className={styles.block}>
              <Bone className={styles.sectionTitle} />
              <div className={styles.hotelCard}>
                <Bone className={styles.hotelMedia} />
                <div className={styles.hotelBody}>
                  <Bone className={styles.hotelName} />
                  <Bone className={styles.hotelAddr} />
                  <div className={styles.datePills}>
                    <Bone className={styles.datePill} />
                    <Bone className={styles.datePill} />
                  </div>
                  <div className={styles.pills}>
                    <Bone className={styles.pill} />
                    <Bone className={`${styles.pill} ${styles.pillMd}`} />
                    <Bone className={styles.pill} />
                  </div>
                </div>
              </div>
            </section>

            {/* Flight card */}
            <section className={styles.block}>
              <Bone className={styles.sectionTitle} />
              <Bone className={styles.flightCard} />
            </section>
          </div>

          {/* Sidebar */}
          <div className="col-md-4 col-12">
            <div className={styles.sidebar}>
              <div className={styles.bookingCard}>
                <Bone className={styles.bookingTitle} />
                <div className={styles.bookingRows}>
                  <div className={styles.bookingRow}>
                    <Bone className={styles.bookingLabel} />
                    <Bone className={styles.bookingPrice} />
                  </div>
                  <div className={styles.bookingRow}>
                    <Bone className={styles.bookingLabel} />
                    <Bone className={styles.bookingPrice} />
                  </div>
                </div>
                <Bone className={styles.shareNote} />
                <Bone className={styles.divider} />
                <div className={styles.bookingRow}>
                  <Bone className={styles.totalLabel} />
                  <Bone className={styles.totalPrice} />
                </div>
                <Bone className={styles.bookBtn} />
              </div>
              <Bone className={styles.cancelCard} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
