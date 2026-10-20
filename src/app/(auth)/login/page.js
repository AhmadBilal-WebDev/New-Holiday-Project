"use client";
import React, { useState } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MdEmail, MdArrowForward, MdKey } from "react-icons/md";
import { IoWarning } from "react-icons/io5";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { FaCheckCircle } from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        setError(data?.message);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError("");
    setSuccess("");
  };

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel} aria-label="Travel inspiration">
        <div className={styles.brandMedia}>
          <Image
            src="/updatedImages/loginSiteImg.jpg"
            alt="Travel destination"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.brandImage}
          />
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.formColumn}>
          {/* <div className={styles.mobileBrand}>
            <Link href="/">
              <Image
                src="/updatedImages/Main-Logo.svg"
                alt="Voyara"
                width={140}
                height={44}
                className={styles.mobileLogo}
                priority
              />
            </Link>
          </div> */}

          <header className={styles.welcomeBlock}>
            <h1 className={styles.formTitle}>Welcome Back</h1>
            <p className={styles.formSubtitle}>
              Login to continue with your Journey
            </p>
          </header>

          <div className={styles.formShell}>
            <div className={styles.methodTab}>
              <MdKey size={16} aria-hidden="true" />
              Email + OTP
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>
                  Email Address
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <MdEmail size={18} />
                  </span>
                  <input
                    type="email"
                    className={styles.formInput}
                    id="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>

              {error && (
                <div className={styles.errorAlert} role="alert">
                  <IoWarning size={16} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className={styles.successAlert} role="status">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className={styles.loginbtn}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    />
                    Sending OTP…
                  </>
                ) : (
                  <>
                    Send OTP
                    <MdArrowForward size={18} />
                  </>
                )}
              </button>
            </form>

            {/* <p className={styles.signupNote}>
              Don&apos;t have an account?{" "}
              <Link href="/contact-us">Sign Up</Link>
            </p> */}
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
