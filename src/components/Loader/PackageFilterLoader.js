import React from 'react'
import styles from './PackageFilterLoader.module.css'

export default function PackageFilterLoader() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading filters">
      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        <span className={`${styles.shimmer} ${styles.calendar}`} />
      </div>

      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        <span className={`${styles.shimmer} ${styles.slider}`} />
        <div className={styles.priceRow}>
          <span className={`${styles.shimmer} ${styles.priceChip}`} />
          <span className={`${styles.shimmer} ${styles.priceChip}`} />
        </div>
      </div>

      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        <span className={`${styles.shimmer} ${styles.select}`} />
      </div>

      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.starRow}>
            <span className={`${styles.shimmer} ${styles.check}`} />
            <span className={`${styles.shimmer} ${styles.stars}`} />
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        <span className={`${styles.shimmer} ${styles.select}`} />
      </div>

      <div className={styles.section}>
        <span className={`${styles.shimmer} ${styles.label}`} />
        <span className={`${styles.shimmer} ${styles.select}`} />
      </div>

      <div className={styles.footer}>
        <span className={`${styles.shimmer} ${styles.reset}`} />
      </div>
    </div>
  )
}
