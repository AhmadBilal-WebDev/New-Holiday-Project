import React from 'react'
import styles from './PackageCardLoader.module.css'

function SkeletonCard() {
  return (
    <article className={styles.card} aria-hidden="true">
      <div className={styles.media}>
        <span className={`${styles.shimmer} ${styles.img}`} />
        <span className={`${styles.shimmer} ${styles.badge} ${styles.badgeLeft}`} />
        <span className={`${styles.shimmer} ${styles.badge} ${styles.badgeRight}`} />
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.titleCol}>
            <span className={`${styles.shimmer} ${styles.title}`} />
            <span className={`${styles.shimmer} ${styles.location}`} />
          </div>
          <div className={styles.priceCol}>
            <span className={`${styles.shimmer} ${styles.priceLabel}`} />
            <span className={`${styles.shimmer} ${styles.price}`} />
            <span className={`${styles.shimmer} ${styles.priceSub}`} />
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className={`${styles.shimmer} ${styles.chip}`} />
          <span className={`${styles.shimmer} ${styles.chip} ${styles.chipMd}`} />
          <span className={`${styles.shimmer} ${styles.chip} ${styles.chipLg}`} />
        </div>

        <span className={`${styles.shimmer} ${styles.line}`} />
        <span className={`${styles.shimmer} ${styles.line} ${styles.lineShort}`} />

        <div className={styles.infoCol}>
          <span className={`${styles.shimmer} ${styles.info}`} />
          <span className={`${styles.shimmer} ${styles.info} ${styles.infoSm}`} />
        </div>

        <span className={`${styles.shimmer} ${styles.btn}`} />
      </div>
    </article>
  )
}

export default function PackageCardLoader({ count = 3 }) {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading packages">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
