"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MdEmail,
  MdArrowForward,
  MdKey,
  MdLockOutline,
} from "react-icons/md";
import { IoWarning } from "react-icons/io5";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { FaCheckCircle } from "react-icons/fa";
import styles from "../login/login.module.css";

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 5;

export default function VerifyOtpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams.get("email") || "";
  const email = emailFromQuery || session?.user?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  useEffect(() => {
    if (status === "unauthenticated" && !emailFromQuery) {
      router.replace("/login");
    }
  }, [status, emailFromQuery, router]);

  const sendOtp = useCallback(async () => {
    if (!email) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/send-otp`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (res.ok && data?.success !== false) {
        setSuccess(data?.message);
        startCooldown();
      } else {
        setError(data?.message);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }, [email, startCooldown]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await signIn("credentials", {
      email,
      otp,
      redirect: false,
    });

    if (!result?.ok) {
      setError(result?.error);
      setOtp("");
      setLoading(false);
      return;
    }

    setSuccess("Verified! Redirecting...");
    router.push(searchParams.get("redirect") || "/dashboard");
  };

  useEffect(() => {
    if (otp.length === OTP_LENGTH) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(value);
    setError("");
    setSuccess("");
  };

  if (status === "loading" && !emailFromQuery) {
    return (
      <div className={styles.page}>
        <div className={styles.formPanel} style={{ gridColumn: "1 / -1" }}>
          <div
            className="spinner-border"
            style={{ color: "#e7247a" }}
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <aside className={`${styles.brandPanel} d-none d-md-block`} aria-label="Travel inspiration">
        <div className={`${styles.brandMedia}`}>
          <Image
            src="/updatedImages/otpVerifySiteImg.jpg"
            alt="Tropical island destination"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.brandImage}
          />
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.formColumn}>
          <header className={styles.welcomeBlock}>
            <h1 className={styles.formTitle}>Welcome Back</h1>
            <p className={styles.formSubtitle}>
              Login to continue with your Journey
            </p>
          </header>

          <div className={styles.formShell}>
            <div className={styles.methodTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected="true"
                className={`${styles.methodTabBtn} ${styles.methodTabActive}`}
              >
                <MdKey size={15} aria-hidden="true" />
                Email + OTP
              </button>
              <button
                type="button"
                role="tab"
                aria-selected="false"
                className={`${styles.methodTabBtn} ${styles.methodTabIdle}`}
                disabled
                title="Coming soon"
              >
                <MdLockOutline size={15} aria-hidden="true" />
                Email + Password
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="verify-email" className={styles.inputLabel}>
                  Email Address
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <MdEmail size={18} />
                  </span>
                  <input
                    type="email"
                    id="verify-email"
                    className={styles.formInput}
                    value={email}
                    readOnly
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="otp" className={styles.inputLabel}>
                  Enter OTP
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <MdKey size={18} />
                  </span>
                  <input
                    type="text"
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={`${styles.formInput} ${styles.otpInput}`}
                    placeholder={"0".repeat(OTP_LENGTH)}
                    value={otp}
                    onChange={handleOtpChange}
                    required
                    disabled={loading}
                    maxLength={OTP_LENGTH}
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.changeEmailRow}>
                <Link href="/login" className={styles.changeEmailLink}>
                  Change email address
                </Link>
              </div>

              {error && (
                <div className={styles.errorAlert} role="alert">
                  <IoWarning size={16} />
                  <span>{error}</span>
                </div>
              )}

              {success && !error && (
                <div className={styles.successAlert} role="status">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className={styles.loginbtn}
                disabled={loading || otp.length !== OTP_LENGTH}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify &amp; Login
                    <MdArrowForward size={18} />
                  </>
                )}
              </button>
            </form>

            <div className={styles.resendRow}>
              Didn&apos;t receive it?{" "}
              {cooldown > 0 ? (
                <span className={styles.resendWait}>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sending}
                  className={styles.resendBtn}
                >
                  {sending ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          </div>

          <div className={styles.secureBox}>
            <div className={styles.secureHeader}>
              <HiOutlineShieldCheck size={20} className={styles.secureIcon} />
              <strong>Your data is secure</strong>
            </div>
            <ul className={styles.secureList}>
              <li>
                <FaCheckCircle /> 256-bit SSL encryption
              </li>
              <li>
                <FaCheckCircle /> OTP valid for 10 minutes
              </li>
              <li>
                <FaCheckCircle /> We never share your data
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
