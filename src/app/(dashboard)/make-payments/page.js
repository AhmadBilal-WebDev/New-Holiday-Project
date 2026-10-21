"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FaMoneyCheckAlt,
  FaCloudUploadAlt,
  FaTimesCircle,
  FaCheckCircle,
  FaHome,
  FaFileAlt,
  FaClock,
  FaMoneyBillWave,
} from "react-icons/fa";
import { MdReceipt, MdQrCode, MdOutlineCurrencyExchange } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi2";
import { CgCalendar } from "react-icons/cg";
import { useSession } from "next-auth/react";
import { Select } from "@mantine/core";
import moment from "moment";
import { DateInput } from "@mantine/dates";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrency } from "@/util/currency";

const FALLBACK_CURRENCIES = [
  "USD", "EUR", "GBP", "SAR", "AED", "PKR", "INR", "CAD", "AUD", "CHF",
  "JPY", "CNY", "TRY", "MYR", "SGD", "QAR", "KWD", "BHD", "OMR", "EGP",
];

function getWorldCurrencies(rates = {}) {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("currency");
    } catch {
      /* fall through */
    }
  }
  const fromRates = Object.keys(rates || {});
  if (fromRates.length) return fromRates.sort();
  return FALLBACK_CURRENCIES;
}

function normalizePaymentStatus(status) {
  const s = (status || "").toLowerCase().trim();
  if (s === "confirmed" || s === "paid" || s === "approved") return "confirmed";
  if (s === "pending" || s === "tentative") return "pending";
  return s;
}

export default function MakePaymentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const currencyCtx = useCurrency();
  const rates = currencyCtx?.rates || {};
  const [invoiceNo, setInvoiceNo] = useState("");
  const [bookingref, setBookingRef] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [image, setImage] = useState(null);
  const [date, setDate] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingids, setBookingIds] = useState([]);
  const [payments, setPayments] = useState([]);
  const fileRef = useRef(null);

  const currencyOptions = useMemo(
    () =>
      getWorldCurrencies(rates).map((code) => ({
        value: code,
        label: code,
      })),
    [rates],
  );

  const fetchinvoice = useCallback(async () => {
    const email = session?.user?.email;
    const otp = session?.user?.otp;
    if (!email || !otp) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/pending-bookings-ids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();
      if (!data?.success && data?.message?.toLowerCase().includes("otp")) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(session?.user?.email || "")}`,
        );
        return;
      }
      setBookingIds(data.data || []);
    } catch (error) {
      console.log(error);
    }
  }, [session, router]);

  const fetchPayments = useCallback(async () => {
    const email = session?.user?.email;
    const otp = session?.user?.otp;
    if (!email || !otp) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/payment-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();
      if (!data?.success && data?.message?.toLowerCase().includes("otp")) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(session?.user?.email || "")}`,
        );
        return;
      }
      setPayments(data?.data || data || []);
    } catch (error) {
      console.log(error);
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user?.email || !session?.user?.otp) return;
    fetchinvoice();
    fetchPayments();
  }, [session, fetchinvoice, fetchPayments]);

  const paymentCounts = useMemo(() => {
    const counts = { total: payments.length, confirmed: 0, pending: 0 };
    payments.forEach((p) => {
      const st = normalizePaymentStatus(p?.status || p?.payment_status);
      if (st === "confirmed") counts.confirmed += 1;
      else if (st === "pending") counts.pending += 1;
    });
    return counts;
  }, [payments]);

  const statCards = [
    {
      badge: "Total Payments",
      title: "Total Payments Make",
      value: paymentCounts.total,
      icon: <HiOutlineSparkles size={18} />,
      badgeTone: "",
    },
    {
      badge: "Confirmed",
      title: "Confirmed Payments",
      value: paymentCounts.confirmed,
      icon: <FaCheckCircle size={18} />,
      badgeTone: "",
    },
    {
      badge: "Pending",
      title: "Pending Payments",
      value: paymentCounts.pending,
      icon: <FaClock size={18} />,
      badgeTone: "pending",
    },
  ];

  const applySelectedFile = (file) => {
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage("Payment proof must be 5 MB or less.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setErrorMessage("");
    setImage(file);
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    applySelectedFile(e.target.files?.[0]);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applySelectedFile(e.dataTransfer?.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!invoiceNo) {
      setErrorMessage("Please select an Invoice No.");
      return;
    }
    if (!transactionId) {
      setErrorMessage("Please enter a Transaction ID.");
      return;
    }
    if (!currency) {
      setErrorMessage("Please select a currency.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }
    if (!date) {
      setErrorMessage("Please select a payment date.");
      return;
    }
    if (!image) {
      setErrorMessage("Please upload payment proof before submitting.");
      return;
    }

    setIsSubmitting(true);
    const { email, otp } = session.user;
    try {
      const formtoSendData = new FormData();
      formtoSendData.append("service_id", invoiceNo);
      formtoSendData.append("service_type", serviceType);
      formtoSendData.append("booking_reference", bookingref);
      formtoSendData.append("transaction_id", transactionId);
      formtoSendData.append("currency", currency);
      formtoSendData.append("payment_amount", String(amount));
      formtoSendData.append("invoice_snapshot", image);
      formtoSendData.append("payment_date", moment(date).format("YYYY-MM-DD"));
      formtoSendData.append("email", email);
      formtoSendData.append("otp", otp);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/payment-request/create`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formtoSendData,
        },
      );
      const data = await response.json();

      if (!data?.success && data?.message?.toLowerCase().includes("otp")) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(session?.user?.email || "")}`,
        );
        return;
      }

      if (response.ok) {
        setSubmitted(true);
        setInvoiceNo("");
        setServiceType("");
        setBookingRef("");
        setTransactionId("");
        setCurrency("");
        setAmount("");
        setDate(null);
        handleRemoveImage();
        fetchinvoice();
        fetchPayments();
      } else {
        setErrorMessage(
          data?.message || "Failed to submit payment. Please try again.",
        );
      }
    } catch (error) {
      console.log(error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookingSelect = (value) => {
    const selected = bookingids?.find((item) => item.invoice_number === value);
    if (!selected) return;
    setInvoiceNo(selected.id);
    setBookingRef(selected?.invoice_number || "");
    setServiceType(selected?.type || "");
  };

  return (
    <div className="hb-page pay-page">
      <div className="hb-stats pay-stats">
        {statCards.map((s) => (
          <article className="hb-stat-card" key={s.title}>
            <div className="hb-stat-top">
              <span className="hb-stat-icon">{s.icon}</span>
              <span className={`hb-stat-badge ${s.badgeTone}`.trim()}>
                {s.badge}
              </span>
            </div>
            <p className="hb-stat-title">{s.title}</p>
            <h3 className="hb-stat-value">{s.value ?? "-"}</h3>
          </article>
        ))}
      </div>

      {submitted ? (
        <section className="pay-panel">
          <div className="pay-success">
            <FaCheckCircle size={52} color="#e7247a" />
            <h2>Payment Submitted!</h2>
            <p>Your payment details have been received and are under review.</p>
            <button
              type="button"
              className="pay-btn-primary"
              onClick={() => {
                setSubmitted(false);
                setInvoiceNo("");
                setTransactionId("");
                setCurrency("");
                setAmount("");
                handleRemoveImage();
              }}
            >
              Submit Another
            </button>
          </div>
        </section>
      ) : (
        <section className="pay-panel">
          <div className="pay-panel-head">
            <span className="pay-head-icon">
              <FaMoneyCheckAlt size={18} />
            </span>
            <h2 className="pay-panel-title">Payment Details</h2>
          </div>

          <form className="pay-form" onSubmit={handleSubmit}>
            <div className="pay-field">
              <span className="pay-field-icon">
                <MdReceipt size={18} />
              </span>
              <div className="pay-field-body">
                <label className="pay-label">Invoice No</label>
                <Select
                  placeholder="Enter invoice number..."
                  onChange={handleBookingSelect}
                  autoSelectOnBlur
                  searchable
                  clearable
                  className="pay-select"
                  classNames={{ input: "pay-select-input" }}
                  data={
                    bookingids
                      ?.filter((item) => item.invoice_number)
                      .map((item) => ({
                        value: item.invoice_number,
                        label: `${item.invoice_number} - ${item.type}`,
                      })) || []
                  }
                />
              </div>
            </div>

            <div className="pay-field">
              <span className="pay-field-icon">
                <MdQrCode size={18} />
              </span>
              <div className="pay-field-body">
                <label className="pay-label" htmlFor="transaction_id">
                  Transaction ID
                </label>
                <input
                  id="transaction_id"
                  type="text"
                  className="pay-input"
                  name="transaction_id"
                  placeholder="Enter transaction ID..."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
            </div>

            <div className="pay-field">
              <span className="pay-field-icon">
                <MdOutlineCurrencyExchange size={18} />
              </span>
              <div className="pay-field-body">
                <label className="pay-label">Currency</label>
                <Select
                  placeholder="Select currency..."
                  searchable
                  clearable
                  value={currency || null}
                  onChange={(value) => setCurrency(value || "")}
                  data={currencyOptions}
                  className="pay-select"
                  classNames={{ input: "pay-select-input" }}
                />
              </div>
            </div>

            <div className="pay-field">
              <span className="pay-field-icon">
                <FaMoneyBillWave size={18} />
              </span>
              <div className="pay-field-body">
                <label className="pay-label" htmlFor="payment_amount">
                  Amount
                </label>
                <input
                  id="payment_amount"
                  type="number"
                  className="pay-input"
                  name="amount"
                  placeholder="Enter amount..."
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="pay-field">
              <span className="pay-field-icon">
                <CgCalendar size={18} />
              </span>
              <div className="pay-field-body">
                <label className="pay-label">Select Date</label>
                <DateInput
                  value={date}
                  name="date"
                  onChange={setDate}
                  valueFormat="DD-MM-YYYY"
                  placeholder="Select a date..."
                  className="pay-date"
                  classNames={{ input: "pay-date-input" }}
                />
              </div>
            </div>

            <div className="pay-upload-block">
              {!image ? (
                <div
                  className="pay-upload-zone"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={onDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileRef.current?.click();
                    }
                  }}
                >
                  <FaCloudUploadAlt size={42} className="pay-upload-icon" />
                  <p className="pay-upload-title">
                    Click to upload receipt / screenshot
                  </p>
                  <p className="pay-upload-sub">
                    PNG, JPG, JPEG, or PDF — max 5 MB
                  </p>
                  <button
                    type="button"
                    className="pay-btn-upload"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileRef.current?.click();
                    }}
                  >
                    Upload A File
                  </button>
                </div>
              ) : (
                <div className="pay-preview">
                  {preview ? (
                    <img src={preview} alt="Payment proof" />
                  ) : (
                    <div
                      className="pay-preview-name"
                      style={{ padding: "2rem 1rem", textAlign: "center" }}
                    >
                      <FaFileAlt size={28} style={{ marginBottom: 8 }} />
                      <div>{image?.name}</div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="pay-preview-remove"
                    onClick={handleRemoveImage}
                    aria-label="Remove file"
                  >
                    <FaTimesCircle size={16} />
                  </button>
                  {preview && (
                    <div className="pay-preview-name">{image?.name}</div>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleImageChange}
                style={{ display: "none" }}
                name="transaction_image"
              />
            </div>

            {errorMessage && (
              <div className="pay-error" role="alert">
                {errorMessage}
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            <div className="pay-actions">
              <Link href="/dashboard" className="pay-btn-secondary">
                <FaHome size={15} />
                Back To Dashboard
              </Link>
              <button
                type="submit"
                className="pay-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaFileAlt size={15} />
                    Submit Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
