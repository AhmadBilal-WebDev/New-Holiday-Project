import React from 'react'
import styles from '@/components/Hotels/HotelDetail/GalleryImages.module.css'
import propStyles from '@/components/Hotels/HotelDetail/HotelPropertyInfo.module.css'
import roomStyles from '@/components/Hotels/HotelDetail/RoomSelection/RoomList.module.css'

export default function HotelDetailLoader() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading hotel details">
      <div className={styles.skelBack} />

      <div className={styles.grid}>
        <div className={styles.main}>
          <span className={styles.skelShimmer} />
          <span className={styles.skelBtn} aria-hidden="true" />
        </div>

        <div className={styles.thumbs}>
          <div className={styles.thumb}>
            <span className={styles.skelShimmer} />
          </div>
          <div className={styles.thumb}>
            <span className={styles.skelShimmer} />
          </div>
          <div className={styles.thumb}>
            <span className={styles.skelShimmer} />
          </div>
          <div className={styles.thumb}>
            <span className={styles.skelShimmer} />
          </div>
        </div>
      </div>

      <div className={propStyles.skelCard}>
        <div className={propStyles.skelTitleRow}>
          <div className={`${propStyles.skelName} ${propStyles.skelShimmer}`} />
          <div className={`${propStyles.skelStars} ${propStyles.skelShimmer}`} />
          <div className={`${propStyles.skelBadge} ${propStyles.skelShimmer}`} />
        </div>
        <div className={`${propStyles.skelAddress} ${propStyles.skelShimmer}`} />

        <div className={`${propStyles.skelAboutTitle} ${propStyles.skelShimmer}`} />
        <div className={`${propStyles.skelLine} ${propStyles.skelShimmer}`} />
        <div className={`${propStyles.skelLine} ${propStyles.skelShimmer}`} />
        <div className={`${propStyles.skelLine} ${propStyles.skelLineShort} ${propStyles.skelShimmer}`} />

        <div className={`${propStyles.skelFacilitiesTitle} ${propStyles.skelShimmer}`} />
        <div className={propStyles.skelFacilitiesGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={propStyles.skelPill}>
              <span className={`${propStyles.skelPillIcon} ${propStyles.skelShimmer}`} />
              <span className={`${propStyles.skelPillLabel} ${propStyles.skelShimmer}`} />
            </div>
          ))}
        </div>
        <div className={`${propStyles.skelViewMore} ${propStyles.skelShimmer}`} />
      </div>

      <div className={roomStyles.skelHeader}>
        <div className={`${roomStyles.skelTitle} ${roomStyles.skelShimmer}`} />
        <div className={`${roomStyles.skelTabs} ${roomStyles.skelShimmer}`} />
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className={roomStyles.skelCard}>
          <div className={`${roomStyles.skelImage} ${roomStyles.skelShimmer}`} />
          <div className={roomStyles.skelBody}>
            <div className={`${roomStyles.skelRoomName} ${roomStyles.skelShimmer}`} />
            <div className={`${roomStyles.skelBadge} ${roomStyles.skelShimmer}`} />
            <div className={roomStyles.skelRates}>
              <div className={`${roomStyles.skelRate} ${roomStyles.skelShimmer}`} />
              <div className={`${roomStyles.skelRate} ${roomStyles.skelShimmer}`} />
            </div>
            <div className={`${roomStyles.skelLink} ${roomStyles.skelShimmer}`} />
          </div>
        </div>
      ))}
    </div>
  )
}
