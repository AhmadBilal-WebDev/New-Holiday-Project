"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FaCar } from "react-icons/fa6";
import styles from "./TransferListingSkeletonLoader.module.css";

function TransferCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cardMedia}>
        <span className={`${styles.shimmer} ${styles.badgeSkel}`} />
        <span className={`${styles.shimmer} ${styles.imageSkel}`} />
      </div>
      <div className={styles.cardBody}>
        <div>
          <span className={`${styles.shimmer} ${styles.titleSkel}`} />
          <span className={`${styles.shimmer} ${styles.routeSkel}`} />
          <span className={`${styles.shimmer} ${styles.dateSkel}`} />
          <span className={`${styles.shimmer} ${styles.descSkel}`} />
          <span className={`${styles.shimmer} ${styles.descSkelShort}`} />
          <div className={styles.specsGrid}>
            <span className={`${styles.shimmer} ${styles.specSkel}`} />
            <span className={`${styles.shimmer} ${styles.specSkel}`} />
            <span className={`${styles.shimmer} ${styles.specSkel}`} />
            <span className={`${styles.shimmer} ${styles.specSkel}`} />
          </div>
        </div>
        <div className={styles.cardFooter}>
          <div>
            <span className={`${styles.shimmer} ${styles.priceSkel}`} />
            <span className={`${styles.shimmer} ${styles.priceNoteSkel}`} />
          </div>
          <div className={styles.actions}>
            <span className={`${styles.shimmer} ${styles.btnSkel}`} />
            <span className={`${styles.shimmer} ${styles.btnSkelOutline}`} />
          </div>
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
          <span className={`${styles.shimmer} ${styles.filterInput}`} />
        </div>
        <div className={styles.filterSection}>
          <span className={`${styles.shimmer} ${styles.filterLabel}`} />
          <span className={`${styles.shimmer} ${styles.filterInput}`} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.filterSection}>
            <span className={`${styles.shimmer} ${styles.filterLabel}`} />
            <span className={`${styles.shimmer} ${styles.filterCheck}`} />
            <span className={`${styles.shimmer} ${styles.filterCheck}`} />
          </div>
        ))}
        <span className={`${styles.shimmer} ${styles.filterReset}`} />
      </div>
    </aside>
  );
}

function TransferSearchStatus({ fromLabel, toLabel, tripLabel }) {
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = useMemo(
    () => [
      "Locating available vehicles near pickup…",
      "Matching cars to passengers and luggage…",
      "Comparing one-way and return options…",
      "Almost ready to show transfer results…",
    ],
    []
  );

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, [messages.length]);

  const routeLabel =
    fromLabel && toLabel
      ? `${fromLabel} → ${toLabel}`
      : toLabel || fromLabel || "your route";

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
            <FaCar />
          </div>
        </div>

        <div className={styles.story}>
          <span className={styles.eyebrow}>{tripLabel || "Live transfer search"}</span>
          <h3 className={styles.headline}>
            Finding transfers for <em>{routeLabel}</em>
          </h3>
          <p className={styles.live}>{messages[msgIndex]}</p>
        </div>
      </div>
    </div>
  );
}

function shortLocation(value) {
  if (!value) return "";
  const parts = String(value).split(",");
  return parts[0]?.trim() || value;
}

function tripTypeLabel(type) {
  if (type === "return") return "Return transfer search";
  if (type === "all-round") return "All-round transfer search";
  return "One-way transfer search";
}

/** Right-column loader only (hotel-style: sits beside filters) */
export default function TransferListingLoader({
  pickupLocation = "",
  dropoffLocation = "",
  transferType = "one-way",
}) {
  const fromLabel = shortLocation(pickupLocation);
  const toLabel = shortLocation(dropoffLocation);

  return (
    <div className={styles.resultsCol} aria-busy="true" aria-label="Searching transfers">
      <TransferSearchStatus
        fromLabel={fromLabel}
        toLabel={toLabel}
        tripLabel={tripTypeLabel(transferType)}
      />

      <div className={`d-md-none ${styles.mobilePills}`} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`${styles.shimmer} ${styles.pill}`} />
        ))}
      </div>

      <div className={styles.cardList}>
        <TransferCardSkeleton />
        <TransferCardSkeleton />
        <TransferCardSkeleton />
      </div>
    </div>
  );
}
