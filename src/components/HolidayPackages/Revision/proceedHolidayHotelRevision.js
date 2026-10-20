'use client';

import { applyHotelRevision } from './applyHotelRevision';
import { retryRevisionPayment } from './retryRevisionPayment';
import { getReviseContext } from './revisionStorage';

/**
 * Full holiday-package hotel revision payment flow:
 * check-rates response → revise/apply → revise/retry-payment
 */
export async function proceedHolidayHotelRevision({
  hotelDetail,
  roomList,
  selectedRooms,
  checkRatesData,
  packageId,
  packageCurrency,
  rates = {},
  bookingReference = '',
}) {
  const reviseContext = getReviseContext();
  const resolvedPackageId = packageId || reviseContext?.package_id || '';
  const domain = typeof window !== 'undefined' ? window.location.origin : '';

  const applyResult = await applyHotelRevision({
    packageId: resolvedPackageId,
    hotelDetail,
    roomList,
    selectedRooms,
    checkRatesData,
    reviseContext,
    packageCurrency,
    rates,
  });

  if (!applyResult.success) {
    return applyResult;
  }

  const successPath = bookingReference || reviseContext?.booking_reference
    ? `/holiday-packages/${resolvedPackageId}/${bookingReference || reviseContext.booking_reference}`
    : `/holiday-packages/${resolvedPackageId}`;

  const paymentResult = await retryRevisionPayment({
    packageId: resolvedPackageId,
    successUrl: `${domain}${successPath}`,
    cancelUrl: `${domain}/holiday-packages/checkout`,
  });

  if (!paymentResult.success) {
    return {
      ...paymentResult,
      applyData: applyResult.data,
    };
  }

  return {
    success: true,
    checkoutUrl: paymentResult.checkoutUrl,
    applyData: applyResult.data,
    paymentData: paymentResult.data,
  };
}
