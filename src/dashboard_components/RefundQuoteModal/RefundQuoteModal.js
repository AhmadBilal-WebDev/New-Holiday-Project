'use client';
import React, { useEffect, useState } from 'react';
import { Modal, Loader } from '@mantine/core';
import { FaUndo } from 'react-icons/fa';
import styles from './RefundQuoteModal.module.css';

const STATIC_REFUND_REASON = 'Personal';

async function fetchRefundQuote({ provider, bookingReference }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking/refund/quote`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        provider,
        booking_reference: bookingReference,
        refund_reason: STATIC_REFUND_REASON,
      }),
    },
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

function pickAmount(data) {
  if (!data || typeof data !== 'object') return null;
  const nested = data?.data?.data || data?.data || data;
  const candidates = [
    nested?.refundAmount,
    nested?.refund_amount,
    nested?.amount,
    nested?.totalRefund,
    nested?.total_refund,
    nested?.refundableAmount,
    nested?.refundable_amount,
    nested?.customerRefundAmount,
  ];
  const found = candidates.find((v) => v != null && v !== '');
  if (found == null) return null;
  const currency =
    nested?.currency ||
    nested?.refundCurrency ||
    nested?.refund_currency ||
    '';
  return { amount: found, currency };
}

function pickStatus(data) {
  const nested = data?.data?.data || data?.data || data;
  return (
    nested?.orderStatus ||
    nested?.status ||
    nested?.refundStatus ||
    data?.message ||
    null
  );
}

function getErrorMessage(data) {
  return (
    data?.message ||
    data?.error?.message ||
    data?.data?.errorMsg ||
    'Failed to get refund quote.'
  );
}

export default function RefundQuoteModal({
  opened,
  onClose,
  bookingReference,
  provider,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  useEffect(() => {
    if (!opened || !bookingReference || !provider) return;

    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setError('');
      setResponse(null);

      try {
        const { ok, data } = await fetchRefundQuote({
          provider,
          bookingReference,
        });
        if (cancelled) return;

        if (!ok || data?.success === false) {
          setError(getErrorMessage(data));
          setResponse(data || null);
          return;
        }

        setResponse(data);
      } catch {
        if (cancelled) return;
        setError('A network error occurred. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuote();
    return () => {
      cancelled = true;
    };
  }, [opened, bookingReference, provider]);

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

  const handleRetry = async () => {
    if (!bookingReference || !provider || loading) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const { ok, data } = await fetchRefundQuote({
        provider,
        bookingReference,
      });

      if (!ok || data?.success === false) {
        setError(getErrorMessage(data));
        setResponse(data || null);
        return;
      }

      setResponse(data);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const amountInfo = !error ? pickAmount(response) : null;
  const statusInfo = !error ? pickStatus(response) : null;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <div className="d-flex align-items-center gap-2">
          <FaUndo size={16} color="#E7247A" />
          <span>Refund Quote</span>
        </div>
      }
      centered
      size="md"
      overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      {loading ? (
        <div className={styles.loaderWrap}>
          <Loader color="#E7247A" size="md" />
          <p className={styles.loaderText}>Fetching refund quote…</p>
        </div>
      ) : (
        <>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {(amountInfo || statusInfo) && (
            <div className={styles.summaryGrid}>
              {statusInfo && (
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Status / Message</p>
                  <p className={styles.summaryValue}>{String(statusInfo)}</p>
                </div>
              )}
              {amountInfo && (
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Refund Amount</p>
                  <p className={styles.summaryValue}>
                    {amountInfo.currency ? `${amountInfo.currency} ` : ''}
                    {String(amountInfo.amount)}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleClose}
          disabled={loading}
        >
          Close
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleRetry}
          disabled={loading}
        >
          {loading ? 'Fetching…' : 'Retry Quote'}
        </button>
      </div>
    </Modal>
  );
}
