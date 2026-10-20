"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  FaMoneyCheckAlt,
  FaCloudUploadAlt,
  FaTimesCircle,
  FaCheckCircle,
} from "react-icons/fa";
import { MdReceipt } from "react-icons/md";
import { useSession } from "next-auth/react";
import { Select } from "@mantine/core";
import moment from "moment";
import { DateInput } from "@mantine/dates";
import { useRouter } from "next/navigation";
function page() {
  const { data: session } = useSession();
  const router = useRouter();
  const [invoiceNo, setInvoiceNo] = useState("");
  const [bookingref, setBookingRef] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [image, setImage] = useState(null);
  const [date, setDate] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingids, setBookingIds] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    fetchinvoice();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
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
      formtoSendData.append("invoice_snapshot", image);
      formtoSendData.append("payment_date", moment(date).format("YYYY-MM-DD"));
      formtoSendData.append("email", email);
      formtoSendData.append("otp", otp);
      // return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/payment-request/create`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: formtoSendData,
        },
      );
      const data = await response.json();

      if (!data?.success && data?.message?.toLowerCase().includes('otp')) {
        router.push(`/verify-otp?email=${encodeURIComponent(session?.user?.email || '')}`);
        return;
      }

      if (response.ok) {
        setSubmitted(true);
        setInvoiceNo("");
        setServiceType("");
        setBookingRef("");
        setTransactionId("");
        setDate(null);
        handleRemoveImage();
        fetchinvoice()
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
    setInvoiceNo(selected.id);
    setBookingRef(selected?.invoice_number || "");
    setServiceType(selected?.type || "");
  };

  const fetchinvoice = async () => {
    const { email, otp } = session.user;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/pending-bookings-ids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();
      if (!data?.success && data?.message?.toLowerCase().includes('otp')) {
        router.push(`/verify-otp?email=${encodeURIComponent(session?.user?.email || '')}`);
        return;
      }

      setBookingIds(data.data || []);
    } catch (error) {
      console.log(error);
    }
  };





  return (
    <div style={{ minHeight: "100vh"}}>
      {/* Page Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: "rgb(0 76 76)",
            color: "#fff",
          }}
        >
          <FaMoneyCheckAlt size={20} />
        </div>
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: "rgb(0 76 76)" }}>
            Make Payments
          </h5>
          <p className="mb-0 text-muted" style={{ fontSize: "13px" }}>
            Submit your payment details and proof of transaction
          </p>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-7 col-xl-6">
          {submitted ? (
            <div
              className="rounded-3 p-5 text-center"
              style={{
                background:
                  "linear-gradient(160deg, #ffffff 60%, #fdf8f2 100%)",
                boxShadow:
                  "0 4px 24px rgba(31,59,66,0.10), 0 1px 4px rgba(155,131,87,0.08)",
                border: "1px solid rgba(155,131,87,0.12)",
              }}
            >
              <FaCheckCircle size={52} color="#2e7d63" className="mb-3" />
              <h5 className="fw-bold mb-1" style={{ color: "#1f3b42" }}>
                Payment Submitted!
              </h5>
              <p className="text-muted mb-4" style={{ fontSize: "18px" }}>
                Your payment details have been received and are under review.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setInvoiceNo("");
                  setTransactionId("");
                  handleRemoveImage();
                }}
                className="btn"
                style={{
                  background: "rgb(0 76 76)",
                  color: "#fff",
                  padding: "9px 28px",
                  borderRadius: "8px",
                  fontWeight: 600,
                }}
              >
                Submit Another
              </button>
            </div>
          ) : (
            <div
              className="rounded-3"
              style={{
                background:
                  "linear-gradient(160deg, #ffffff 60%, #fdf8f2 100%)",
                boxShadow:
                  "0 4px 24px rgba(31,59,66,0.10), 0 1px 4px rgba(155,131,87,0.08)",
                border: "1px solid rgba(155,131,87,0.12)",
                overflow: "hidden",
              }}
            >
              {/* Card Header */}
              <div
                className="d-flex align-items-center gap-2 px-4 py-3"
                style={{
                  background:
                    "linear-gradient(90deg, rgb(0 76 76) 0%, rgb(0 76 76) 60%, #3a6b5e 100%)",
                  borderBottom: "1px solid rgba(155,131,87,0.25)",
                }}
              >
                <MdReceipt size={18} color="#9b8357" />
                <span
                  className="fw-semibold"
                  style={{ color: "#fff", fontSize: "15px" }}
                >
                  Payment Details
                </span>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-4"
                style={{
                  background:
                    "linear-gradient(160deg, #f8fbfc 0%, #fdf8f2 100%)",
                }}
              >
                <div className="mb-4">
                  <label
                    className="form-label fw-semibold"
                    style={{
                      color: "#1f3b42",
                      fontSize: "13px",
                      marginBottom: "6px",
                    }}
                  >
                    Invoice No <span style={{ color: "#c0392b" }}>*</span>
                  </label>
                  <Select
                    placeholder="Select Invoice No"
                    onChange={handleBookingSelect}
                    autoSelectOnBlur
                    searchable
                    clearable
                    styles={{
                      input: { fontSize: 16 },
                    }}
                    data={
                      bookingids
                        ?.filter((item) => item.invoice_number) // null/undefined/empty skip
                        .map((item) => ({
                          value: item.invoice_number,
                          label: item.invoice_number + " - " + item.type,
                        })) || []
                    }
                  />
                </div>

                {/* Transaction ID */}
                <div className="mb-4">
                  <label
                    className="form-label fw-semibold"
                    style={{
                      color: "#1f3b42",
                      fontSize: "13px",
                      marginBottom: "6px",
                    }}
                  >
                    Transaction ID <span style={{ color: "#c0392b" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="transaction_id"
                    placeholder="e.g. TXN-20240227-00123"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    // required
                    style={{
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "16px",
                      boxShadow: "none",
                      outline: "none",
                    }}
                  />
                </div>
                <div className="mb-4">
                  <label
                    className="form-label fw-semibold"
                    style={{
                      color: "#1f3b42",
                      fontSize: "13px",
                      marginBottom: "6px",
                    }}
                  >
                    Select Date <span style={{ color: "#c0392b" }}>*</span>
                  </label>
                  <DateInput
                    value={date}
                    name="date"
                    onChange={setDate}
                    valueFormat="DD-MM-YYYY"
                    placeholder="Select Payment Date"
                    styles={{
                      input: { fontSize: 16 },
                    }}
                  />
                </div>

                {/* Payment Proof Upload */}
                <div className="mb-4">
                  <label
                    className="form-label fw-semibold"
                    style={{
                      color: "#1f3b42",
                      fontSize: "13px",
                      marginBottom: "6px",
                    }}
                  >
                    Payment Proof <span style={{ color: "#c0392b" }}>*</span>
                  </label>

                  {!preview ? (
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: "2px dashed #d0d7de",
                        borderRadius: "10px",
                        padding: "36px 20px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#fafbfc",
                        transition: "border-color 0.2s, background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#9b8357";
                        e.currentTarget.style.background = "#fffdf8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#d0d7de";
                        e.currentTarget.style.background = "#fafbfc";
                      }}
                    >
                      <FaCloudUploadAlt size={36} color="#9b8357" />
                      <p
                        className="mb-1 mt-2 fw-semibold"
                        style={{ color: "#1f3b42", fontSize: "14px" }}
                      >
                        Click to upload receipt / screenshot
                      </p>
                      <p
                        className="mb-0 text-muted"
                        style={{ fontSize: "12px" }}
                      >
                        PNG, JPG, or JPEG — max 5 MB
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid #e2e8f0",
                      }}
                    >
                      <img
                        src={preview}
                        alt="Payment proof"
                        style={{
                          width: "100%",
                          maxHeight: "260px",
                          objectFit: "contain",
                          display: "block",
                          background: "#f8f9fa",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(255,255,255,0.9)",
                          border: "none",
                          borderRadius: "50%",
                          width: 30,
                          height: 30,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                        }}
                      >
                        <FaTimesCircle size={16} color="#c0392b" />
                      </button>
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#6c757d",
                          borderTop: "1px solid #f0f0f0",
                          background: "#fafbfc",
                        }}
                      >
                        {image?.name}
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    // required={!image}
                    name="transaction_image"
                  />
                </div>
                {errorMessage && (
                  <div
                    className="alert alert-danger alert-dismissible fade show mb-4"
                    role="alert"
                  >
                    {errorMessage}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setErrorMessage("")}
                    />
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="btn w-100"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? "#4a7a84" : "rgb(0 76 76)",
                    color: "#fff",
                    padding: "11px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "15px",
                    letterSpacing: "0.3px",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
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
                    "Submit Payment"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default page;
