'use client'

import React, { useMemo } from 'react'
import { FaSuitcaseRolling } from 'react-icons/fa'
import styles from './PackageSearchLoader.module.css'

export default function PackageSearchLoader({ progress = 0, categoryLabel = 'packages' }) {
  const liveMsg = useMemo(() => {
    if (progress < 25) return 'Gathering matching holiday packages…'
    if (progress < 55) return 'Comparing prices and travel dates…'
    if (progress < 85) return 'Sorting the strongest package deals…'
    return 'Almost ready to show results…'
  }, [progress])

  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0))

  return (
    <div className={styles.loader} role="status" aria-live="polite" aria-label="Searching packages">
      <div className={styles.stage}>
        <div className={styles.orbitWrap} aria-hidden="true">
          <span className={`${styles.ring} ${styles.ringA}`} />
          <span className={`${styles.ring} ${styles.ringB}`} />
          <span className={`${styles.ring} ${styles.ringC}`} />
          <span className={styles.scan} />
          <span className={`${styles.blip} ${styles.blip1}`} />
          <span className={`${styles.blip} ${styles.blip2}`} />
          <span className={`${styles.blip} ${styles.blip3}`} />
          <span className={`${styles.blip} ${styles.blip4}`} />
          <div className={styles.pin}>
            <FaSuitcaseRolling size={20} />
          </div>
        </div>

        <div className={styles.story}>
          <span className={styles.eyebrow}>Live package search</span>
          <h3 className={styles.headline}>
            Finding the best <em>{categoryLabel}</em>
          </h3>
          <p className={styles.live}>{liveMsg}</p>
        </div>

        {/* <div
          className={styles.score}
          role="progressbar"
          aria-valuenow={safeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Search progress"
        >
          <strong>{safeProgress}%</strong>
          <span>complete</span>
        </div> */}
      </div>

      <div className={styles.barTrack} aria-hidden="true">
        <div className={styles.barFill} style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  )
}
