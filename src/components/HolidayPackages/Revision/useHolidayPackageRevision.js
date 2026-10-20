'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { REVISE_ACTIONS } from './constants';
import {
  getReviseAction,
  getReviseContext,
  getReviseHotelCandidate,
} from './revisionStorage';

/**
 * Detect holiday-package hotel revision mode from URL + sessionStorage.
 * Does not affect umrah-getaway or normal hotel flows.
 */
export function useHolidayPackageRevision() {
  const searchParams = useSearchParams();

  const isReviseMode = searchParams.get('revise') === 'true';
  const packageIdFromUrl = searchParams.get('packageId') || '';

  const reviseContext = useMemo(() => {
    if (!isReviseMode) return null;
    return getReviseContext();
  }, [isReviseMode, packageIdFromUrl]);

  const reviseAction = useMemo(() => {
    if (!isReviseMode) return '';
    const fromStorage = getReviseAction();
    if (fromStorage) return fromStorage;
    if (searchParams.get('changeHotel') === 'true') return REVISE_ACTIONS.CHANGE_HOTEL;
    return REVISE_ACTIONS.CHANGE_ROOM;
  }, [isReviseMode, searchParams]);

  const isChangeHotel = reviseAction === REVISE_ACTIONS.CHANGE_HOTEL;
  const isChangeRoom = isReviseMode && !isChangeHotel;

  const packageId = packageIdFromUrl
    || reviseContext?.package_id
    || '';

  const bookingReference = reviseContext?.booking_reference || '';

  const checkIn = reviseContext?.check_in
    || reviseContext?.hotel?.checkIn
    || null;

  const checkOut = reviseContext?.check_out
    || reviseContext?.hotel?.checkOut
    || null;

  const hotelCandidate = useMemo(() => {
    if (!isReviseMode) return null;
    return getReviseHotelCandidate();
  }, [isReviseMode, packageIdFromUrl, reviseAction]);

  return {
    isReviseMode,
    isChangeHotel,
    isChangeRoom,
    reviseAction,
    reviseContext,
    packageId,
    bookingReference,
    checkIn,
    checkOut,
    hotelCandidate,
  };
}
