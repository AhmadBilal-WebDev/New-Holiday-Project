"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaMapMarkerAlt,
  FaCreditCard,
  FaTimes,
  FaCheck,
  FaCalendarCheck,
  FaShieldAlt,
} from "react-icons/fa";
import styles from "./PackageBookingLoader.module.css";

export default function PackageBookingLoader({
  showLoader,
  confirmStatus = "pending", // "pending" | "validate" | "reserve" | "payment" | "success" | "error"
  errorMessage,
  componentName,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [failedStep, setFailedStep] = useState(null);
  const currentStepRef = useRef(0);

  const steps = [
    { id: "validate", label: "Validating Details", icon: <FaMapMarkerAlt /> },
    {
      id: "reserve",
      label: `Reserving Your ${componentName || "Booking"}`,
      icon: <FaCalendarCheck />,
    },
    { id: "payment", label: "Generating Payment Link", icon: <FaCreditCard /> },
  ];

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (confirmStatus === "pending") {
      setCurrentStep(0);
      setIsComplete(false);
      setFailedStep(null);
      return;
    }
    if (confirmStatus === "validate") {
      setCurrentStep(1);
      return;
    }
    if (confirmStatus === "reserve") {
      setCurrentStep(2);
      return;
    }
    if (confirmStatus === "payment") {
      setCurrentStep(3);
      return;
    }
    if (confirmStatus === "success") {
      setIsComplete(true);
      setFailedStep(null);
      return;
    }
    if (confirmStatus === "error") {
      setFailedStep((prev) => (prev == null ? currentStepRef.current : prev));
      setIsComplete(true);
    }
  }, [confirmStatus]);

  if (!showLoader) return null;

  const progressWidth = isComplete
    ? 100
    : Math.min(100, Math.max(8, (currentStep / steps.length) * 100));

  const progressClass =
    confirmStatus === "error"
      ? `${styles.progressBar} ${styles.progressBarError}`
      : confirmStatus === "success"
        ? `${styles.progressBar} ${styles.progressBarSuccess}`
        : styles.progressBar;

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="pbl-title">
      <div className={styles.card}>
        <div className={styles.brandStrip} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.logoMark} aria-hidden="true">
            <FaShieldAlt />
          </div>
          <h2 id="pbl-title" className={styles.title}>
            Processing Your Booking
          </h2>
          <p className={styles.subtitle}>
            Please wait while we securely complete your reservation.
          </p>
        </div>

        <div className={styles.body}>
          <div className={styles.steps}>
            {steps.map((step, index) => {
              const isActive = index === currentStep && !isComplete;
              const isCompleted = index < currentStep && confirmStatus !== "error";
              const isFailed = failedStep === index;

              const stepClass = [
                styles.step,
                isFailed ? styles.stepFailed : "",
                isCompleted ? styles.stepDone : "",
                isActive ? styles.stepActive : "",
              ]
                .filter(Boolean)
                .join(" ");

              const statusLabel = isFailed
                ? "Failed"
                : isCompleted
                  ? "Completed"
                  : isActive
                    ? "In progress"
                    : "Pending";

              return (
                <div key={step.id} className={stepClass}>
                  <div className={styles.stepIcon} aria-hidden="true">
                    {isCompleted ? (
                      <FaCheck />
                    ) : isFailed ? (
                      <FaTimes />
                    ) : isActive ? (
                      <span className={styles.spinner} />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className={styles.stepMeta}>
                    <p className={styles.stepLabel}>{step.label}</p>
                    <span className={styles.stepStatus}>{statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={progressClass} style={{ width: `${progressWidth}%` }} />
          </div>
        </div>

        {confirmStatus === "error" && (
          <div className={styles.errorBox} role="alert">
            {errorMessage || "Something went wrong. Please try again."}
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.stepCount}>
            {confirmStatus === "error"
              ? "Booking interrupted"
              : confirmStatus === "success"
                ? "All steps complete"
                : `Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`}
          </p>
        </div>
      </div>
    </div>
  );
}
