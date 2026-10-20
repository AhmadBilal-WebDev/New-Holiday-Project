"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@mantine/core";
import { useRouter } from "next/navigation";
import { FaRegClock } from "react-icons/fa6";
import styles from "./Checkout.module.css";
import { redirectToUmrahSearch } from "@/util/umrahSearchRedirect";

function formatRemainingTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CheckoutTimer({
  expiresAt,
  ttlMinutes,
  onExpire,
  packageData,
  onGoToSearch,
}) {
  const router = useRouter();
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const expireCalledForRef = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;

    const getRemaining = () =>
      Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

    const triggerExpire = () => {
      if (expireCalledForRef.current === expiresAt) return;
      expireCalledForRef.current = expiresAt;
      onExpire?.();
    };

    const initialRemaining = getRemaining();
    setRemainingSeconds(initialRemaining);

    if (initialRemaining === 0) {
      triggerExpire();
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = getRemaining();
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        clearInterval(intervalId);
        triggerExpire();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt, onExpire]);

  if (remainingSeconds === null) return null;

  const isExpired = remainingSeconds === 0;
  const sessionDuration = ttlMinutes ? `${ttlMinutes} minutes` : "a limited time";

  const handleGoToSearch = () => {
    if (onGoToSearch) {
      onGoToSearch();
      return;
    }
    redirectToUmrahSearch(packageData, router);
  };

  return (
    <>
    <div
      className={`${styles.checkoutTimerBanner} ${isExpired ? styles.checkoutTimerExpired : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.checkoutTimerInfo}>
        <span className={styles.checkoutTimerIconBox} aria-hidden="true">
          <FaRegClock />
        </span>
        <div>
          <p className={styles.checkoutTimerTitle}>
            {isExpired
              ? "Your checkout session has expired"
              : "Your package is reserved — complete booking before time runs out"}
          </p>
          <p className={styles.checkoutTimerSubtext}>
            {isExpired
              ? "The held price, flight seats, and hotel availability for this package are no longer guaranteed. Please search again to view the latest options and start a fresh booking."
              : `We have temporarily held your selected flights, hotels and package price. Once the timer ends, this reservation will be released and rates or availability may change.`}
          </p>
        </div>
      </div>

      {!isExpired && (
        <div className={styles.checkoutTimerDisplayWrap}>
          <span className={styles.checkoutTimerDisplayLabel}>Time remaining</span>
          <div className={styles.checkoutTimerDisplay} aria-label="Time remaining">
            {formatRemainingTime(remainingSeconds)}
          </div>
        </div>
      )}
    </div>

    <Modal
      opened={isExpired}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      size="md"
      overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
      title={
        <div className={styles.checkoutExpiredModalTitle}>
          <FaRegClock aria-hidden="true" />
          <span>Checkout session expired</span>
        </div>
      }
    >
      <div className={styles.checkoutExpiredModalBody}>
        <p>
          Your reserved package, price, flight seats, and hotel availability are no longer
          guaranteed. The {sessionDuration} hold on this booking has ended.
        </p>
        <p>
          Please search again to view the latest packages and start a fresh booking.
        </p>
        <button
          type="button"
          onClick={handleGoToSearch}
          className={styles.confirmBtn}
        >
          Go to search page
        </button>
      </div>
    </Modal>
    </>
  );
}
