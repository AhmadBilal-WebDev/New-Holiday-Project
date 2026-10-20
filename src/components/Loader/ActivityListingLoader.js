'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaCompass } from 'react-icons/fa';
import styles from './ActivityListingSkeletonLoader.module.css';

function ActivityCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cardMedia}>
        <span className={`${styles.shimmer} ${styles.badgeSkel}`} />
        <span className={`${styles.shimmer} ${styles.imageSkel}`} />
      </div>
      <div className={styles.cardBody}>
        <span className={`${styles.shimmer} ${styles.titleSkel}`} />
        <span className={`${styles.shimmer} ${styles.titleSkelShort}`} />
        <span className={`${styles.shimmer} ${styles.descSkel}`} />
        <span className={`${styles.shimmer} ${styles.descSkelShort}`} />
        <span className={`${styles.shimmer} ${styles.locationSkel}`} />
        <div className={styles.metaRow}>
          <span className={`${styles.shimmer} ${styles.metaSkel}`} />
          <span className={`${styles.shimmer} ${styles.metaSkel}`} />
        </div>
        <div className={styles.cardFooter}>
          <div>
            <span className={`${styles.shimmer} ${styles.priceSkel}`} />
            <span className={`${styles.shimmer} ${styles.priceNoteSkel}`} />
          </div>
          <span className={`${styles.shimmer} ${styles.btnSkel}`} />
        </div>
      </div>
    </div>
  );
}

export function FilterSidebarSkeleton() {
  return (
    <aside className={`${styles.filterSidebar} d-none d-md-block`} aria-hidden="true">
      <div className={styles.filterHeader}>
        <span className={`${styles.shimmer} ${styles.filterTitle}`} />
        <span className={`${styles.shimmer} ${styles.filterIcon}`} />
      </div>
      <div className={styles.filterBody}>
        <div className={styles.filterSection}>
          <span className={`${styles.shimmer} ${styles.filterLabel}`} />
          <span className={`${styles.shimmer} ${styles.filterCalendar}`} />
        </div>
        <div className={styles.filterSection}>
          <span className={`${styles.shimmer} ${styles.filterLabel}`} />
          <span className={`${styles.shimmer} ${styles.filterInput}`} />
          <span className={`${styles.shimmer} ${styles.filterCheck}`} />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className={styles.filterSection}>
            <span className={`${styles.shimmer} ${styles.filterLabel}`} />
            <span className={`${styles.shimmer} ${styles.filterCheck}`} />
            <span className={`${styles.shimmer} ${styles.filterCheck}`} />
            <span className={`${styles.shimmer} ${styles.filterCheck}`} />
          </div>
        ))}
        <span className={`${styles.shimmer} ${styles.filterReset}`} />
      </div>
    </aside>
  );
}

function ActivitySearchStatus({ locationLabel }) {
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = useMemo(
    () => [
      'Matching experiences to your dates…',
      'Checking local attractions and tours…',
      'Comparing prices and durations…',
      'Almost ready to show activity results…',
    ],
    []
  );

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, [messages.length]);

  const place = locationLabel || 'your destination';

  return (
    <div className={styles.statusCard} role="status" aria-live="polite">
      <div className={styles.statusStage}>
        <div className={styles.radar} aria-hidden="true">
          <span className={`${styles.orbit} ${styles.orbitA}`} />
          <span className={`${styles.orbit} ${styles.orbitB}`} />
          <span className={`${styles.orbit} ${styles.orbitC}`} />
          <span className={styles.scan} />
          <span className={`${styles.blip} ${styles.blip1}`} />
          <span className={`${styles.blip} ${styles.blip2}`} />
          <span className={`${styles.blip} ${styles.blip3}`} />
          <div className={styles.pin}>
            <FaCompass />
          </div>
        </div>

        <div className={styles.story}>
          <span className={styles.eyebrow}>Live activity search</span>
          <h3 className={styles.headline}>
            Finding experiences in <em>{place}</em>
          </h3>
          <p className={styles.live}>{messages[msgIndex]}</p>
        </div>
      </div>
    </div>
  );
}

/** Right-column loader (hotel/transfer style: status + skeletons) */
export default function ActivityListingLoader({ locationLabel = '' }) {
  return (
    <div className={styles.resultsCol} aria-busy="true" aria-label="Searching activities">
      <ActivitySearchStatus locationLabel={locationLabel} />

      <div className={`d-md-none ${styles.mobilePills}`} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`${styles.shimmer} ${styles.pill}`} />
        ))}
      </div>

      <div className={styles.cardGrid}>
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
      </div>
    </div>
  );
}
