'use client';

import React, { useEffect, useState } from 'react';
import { Loader, Modal, Text } from '@mantine/core';
import moment from 'moment';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaPlane } from 'react-icons/fa';
import { FiCheckCircle } from 'react-icons/fi';
import { MdErrorOutline } from 'react-icons/md';
import { notifications } from '@mantine/notifications';
import airline from '@/util/airlines.json';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { useCurrency } from '@/util/currency';
import { retryRevisionPayment } from './retryRevisionPayment';
import compareStyles from '@/components/UmrahGetAway/UpdateFlight/FlightCompareModal.module.css';
import style from '@/components/UmrahGetAway/Detail/FlightSelection.module.css';

function buildFlightWithClientPricing(flight, rates = {}) {
  if (!flight?.pricing) return flight;

  const pricing = flight.pricing;
  const clientCurrency = flight.client_currency || pricing.currency;
  const originalCurrency = pricing.currency;
  const originalTotalAmount = pricing.total_amount;

  if (!clientCurrency || !originalCurrency || clientCurrency === originalCurrency) {
    return {
      ...flight,
      pricing: {
        ...pricing,
        original_currency: originalCurrency || clientCurrency,
        original_total_amount: String(originalTotalAmount ?? ''),
        currency: clientCurrency || originalCurrency,
        total_amount: String(originalTotalAmount ?? ''),
      },
    };
  }

  const { newprice, newcurrency } = ConvertPrice(
    originalTotalAmount,
    originalCurrency,
    clientCurrency,
    rates
  );

  return {
    ...flight,
    pricing: {
      ...pricing,
      original_currency: originalCurrency,
      original_total_amount: String(originalTotalAmount ?? ''),
      currency: newcurrency || clientCurrency,
      total_amount: String(newprice ?? originalTotalAmount ?? ''),
    },
  };
}

function groupSegments(flight) {
  if (!flight?.segments?.length) return [];

  if (flight.trip_type === 'return') {
    const legs = flight?.search_criteria?.legs || [];
    if (legs.length === 0) {
      const midpoint = Math.ceil(flight.segments.length / 2);
      return [
        { segments: flight.segments.slice(0, midpoint), label: 'Departure' },
        { segments: flight.segments.slice(midpoint), label: 'Return' },
      ];
    }

    const groupedLegs = [];
    let segmentIndex = 0;
    const labels = ['Departure', 'Return'];

    legs.forEach((leg, legIndex) => {
      const legSegments = [];
      while (segmentIndex < flight.segments.length) {
        const segment = flight.segments[segmentIndex];
        legSegments.push(segment);
        segmentIndex += 1;
        if (segment.arrival?.airport_code === leg.destination) break;
      }
      if (legSegments.length) {
        groupedLegs.push({
          segments: legSegments,
          label: labels[legIndex] || `Flight ${legIndex + 1}`,
        });
      }
    });

    return groupedLegs;
  }

  return [{ segments: flight.segments, label: 'Departure' }];
}

function renderFlightLeg(group, idx) {
  const firstSegment = group.segments[0];
  const lastSegment = group.segments[group.segments.length - 1];
  const totalTime = group.segments.reduce((acc, seg, segIdx) => {
    let time = acc + (seg.duration || 0);
    const nextSeg = group.segments[segIdx + 1];
    if (nextSeg) {
      time += moment(nextSeg.departure.datetime).diff(moment(seg.arrival.datetime), 'minutes');
    }
    return time;
  }, 0);
  const airlineData = airline.find((a) => a.iata === firstSegment?.airline?.code);
  const logoSrc = firstSegment?.airline?.logo_url || airlineData?.logo;
  const stopLabel = group.segments.length === 1 && group.segments[0]?.stops === 0
    ? 'Direct'
    : `${group.segments.length - 1} ${group.segments.length - 1 === 1 ? 'stop' : 'stops'}`;
  const isReturn = group.label === 'Return';
  const hours = Math.floor(totalTime / 60);
  const mins = totalTime % 60;

  return (
    <div key={idx} className={style.legCard}>
      <div className={style.legHeader}>
        <span className={`${style.legBadge} ${isReturn ? style.legBadgeReturn : style.legBadgeDeparture}`}>
          <FaPlane size={10} />
          {group.label}
        </span>
        <span className={style.legDate}>
          {moment(firstSegment?.departure?.datetime).format('ddd, DD MMM YYYY')}
        </span>
      </div>
      <div className={style.flightRow}>
        <div className={style.airlineCol}>
          <div className={style.airlineInfo}>
            <div className={style.airlineLogoWrap}>
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  height={32}
                  width={32}
                  alt={firstSegment?.airline?.code || 'airline'}
                  className={style.airlineLogo}
                  unoptimized
                />
              ) : (
                <span className={style.airlineCodeFallback}>{firstSegment?.airline?.code}</span>
              )}
            </div>
            <div className={style.airlineText}>
              <span className={style.airlineName}>
                {firstSegment?.airline?.name || airlineData?.name || firstSegment?.airline?.code}
              </span>
              <span className={style.airlineClass}>
                {firstSegment?.cabin_class?.name || 'Economy'}
              </span>
            </div>
          </div>
        </div>
        <div className={style.routeCol}>
          <div className={style.flightEndpoint}>
            <span className={style.flightTime}>
              {moment(firstSegment?.departure?.datetime).format('LT')}
            </span>
            <span className={style.airportCode}>{firstSegment?.departure?.airport_code}</span>
          </div>
          <div className={style.flightMiddle}>
            <span className={style.durationPill}>
              {hours}h {mins}m · {stopLabel}
            </span>
            <div className={style.flightLine}>
              <div className={style.line} />
              <FaPlane className={style.planeIcon} size={11} />
            </div>
          </div>
          <div className={style.flightEndpointRight}>
            <span className={style.flightTime}>
              {moment(lastSegment?.arrival?.datetime).format('LT')}
            </span>
            <span className={style.airportCode}>{lastSegment?.arrival?.airport_code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RevisionFlightDetailModal({
  opened,
  onClose,
  selectedFlight,
  pkg,
}) {
  const router = useRouter();
  const { rates } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshedFlight, setRefreshedFlight] = useState(null);
  const [refreshSummary, setRefreshSummary] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);

  useEffect(() => {
    if (!opened) {
      setLoading(false);
      setError(null);
      setRefreshedFlight(null);
      setRefreshSummary(null);
      setApplying(false);
      setApplyError(null);
      return undefined;
    }

    if (!selectedFlight || !pkg?.package_id) return undefined;

    let cancelled = false;

    async function refreshFlight() {
      setLoading(true);
      setError(null);
      setRefreshedFlight(null);
      setRefreshSummary(null);

      try {
        const flightPayload = buildFlightWithClientPricing(selectedFlight, rates);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/revise/refresh-flight`,
          {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              package_id: pkg.package_id,
              flight: flightPayload,
            }),
          }
        );
        const data = await response.json().catch(() => null);

        if (cancelled) return;

        const isSuccess = Boolean(data?.Success || data?.success);
        if (!isSuccess) {
          setError(
            data?.Content?.message
            || data?.Description
            || data?.message
            || data?.Title
            || 'Failed to refresh flight. Please try again.'
          );
          return;
        }

        const content = data?.Content || data?.content || {};
        const flightData = content?.flight || content?.current_flight || selectedFlight;
        setRefreshedFlight(flightData);
        setRefreshSummary(content);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to refresh flight. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refreshFlight();

    return () => {
      cancelled = true;
    };
  }, [opened, selectedFlight, pkg?.package_id, rates]);

  const displayFlight = refreshedFlight || selectedFlight;
  const summaryPricing = refreshSummary?.pricing || {};
  const flightPrice = Number(displayFlight?.pricing?.total_amount ?? 0);
  const flightCurrency = displayFlight?.pricing?.currency
    || pkg?.pricing?.currency
    || pkg?.currency;
  const totalPackagePrice = Number(
    summaryPricing?.total_price
    ?? pkg?.pricing?.total_price
    ?? 0
  );

  const handleProceedToPayment = async () => {
    if (applying || loading || !refreshedFlight || !pkg?.package_id) return;

    setApplying(true);
    setApplyError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/revise/apply`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            package_id: pkg.package_id,
            failed_service: 'flight',
            flight: refreshedFlight,
          }),
        }
      );
      const data = await response.json().catch(() => null);

      const isSuccess = Boolean(data?.Success || data?.success);
      if (!isSuccess) {
        setApplyError(
          data?.Content?.message
          || data?.Description
          || data?.message
          || data?.Title
          || 'Failed to apply flight revision. Please try again.'
        );
        return;
      }

      const packageId = pkg?.package_id || data?.Content?.package_id;
      const bookingReference = pkg?.booking_reference
        || data?.Content?.booking_reference
        || '';

      if (!packageId) {
        setApplyError('Package ID missing. Please refresh and try again.');
        notifications.show({
          title: 'Error',
          message: 'Package ID missing. Please refresh and try again.',
          color: 'red',
          autoClose: 3500,
        });
        return;
      }

      const domain = window.location.origin;
      const successPath = bookingReference
        ? `/holiday-packages/${packageId}/${bookingReference}`
        : `/holiday-packages/${packageId}`;

      const paymentResult = await retryRevisionPayment({
        packageId,
        successUrl: `${domain}${successPath}`,
        cancelUrl: `${domain}/holiday-packages/checkout`,
      });

      if (!paymentResult.success) {
        setApplyError(paymentResult.message);
        notifications.show({
          title: 'Payment retry failed',
          message: paymentResult.message,
          color: 'red',
          autoClose: 3500,
        });
        return;
      }

      router.push(paymentResult.checkoutUrl);
    } catch (err) {
      setApplyError(err?.message || 'Unable to apply flight revision. Please try again.');
      notifications.show({
        title: 'Network error',
        message: err?.message || 'Unable to retry payment right now.',
        color: 'red',
        autoClose: 3500,
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className={compareStyles.confirmHeader}>
          <div className={compareStyles.confirmIcon}><FiCheckCircle size={18} /></div>
          <Text fw={700} size="lg">Selected Flight</Text>
        </div>
      }
      centered
      size="lg"
      radius={16}
      padding={0}
      closeOnClickOutside={false}
      transitionProps={{ transition: 'pop', duration: 200 }}
      zIndex={350}
      classNames={{
        content: compareStyles.modalContent,
        header: compareStyles.modalHeader,
        body: compareStyles.modalBody,
      }}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Loader size="md" color="teal" />
          <p style={{ marginTop: 12, color: '#64748b', fontSize: '0.9rem' }}>
            Refreshing flight price…
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '16px 20px',
            padding: '12px 14px',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.88rem',
          }}
        >
          <MdErrorOutline size={20} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && displayFlight && (
        <div style={{ padding: '4px 4px 8px' }}>
          <div className={style.flightCard}>
            {groupSegments(displayFlight).map((group, idx) => renderFlightLeg(group, idx))}

            <div className={style.flightActions}>
              <div>
                Total Price:{' '}
                <PriceDisplay currency={flightCurrency} price={flightPrice} />
                <br />
                <span style={{ fontSize: '12px' }} className="small text-muted">
                  VAT and taxes included
                </span>
              </div>
            </div>
          </div>

          {refreshSummary?.pricing && (
            <div className={`${compareStyles.priceDiffBox} ${compareStyles.priceDiffSame}`} style={{ marginTop: 16 }}>
              <span>Package total</span>
              <strong>
                <PriceDisplay price={totalPackagePrice} currency={flightCurrency} />
              </strong>
            </div>
          )}

          {applyError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '12px 0 0',
                padding: '12px 14px',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.88rem',
              }}
            >
              <MdErrorOutline size={20} />
              <span>{applyError}</span>
            </div>
          )}

          <div className={compareStyles.confirmActions}>
            <button
              type="button"
              className={`${compareStyles.updateBtn} mt-3`}
              onClick={handleProceedToPayment}
              disabled={applying || !refreshedFlight}
            >
              {applying ? 'Applying…' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
