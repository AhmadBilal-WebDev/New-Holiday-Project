'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Modal } from '@mantine/core';
import { FaSuitcaseRolling, FaShieldAlt, FaSyncAlt, FaTicketAlt, FaBed, FaHotel } from 'react-icons/fa';
import styles from './page.module.css';

import {
    REVISE_ACTIONS,
    setReviseContext as persistReviseContext,
    setReviseAction as persistReviseAction,
    ChangeHotelModal,
    ChangeFlightModal,
} from '@/components/HolidayPackages/Revision';
import moment from 'moment';

const POLL_INTERVAL_MS = 3000;

const PROGRESS_STEPS = [
    { id: 'payment', label: 'Payment verified', Icon: FaShieldAlt },
    { id: 'booking', label: 'Confirming your package', Icon: FaSyncAlt },
    { id: 'voucher', label: 'Preparing your voucher', Icon: FaTicketAlt },
];

function normalizeStatus(value) {
    if (value === true) return 'completed';
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

function isGloballyCompleted(payload) {
    const value =
        payload?.all_services_booked
        ?? payload?.all_booked
        ?? payload?.is_completed
        ?? payload?.completed
        ?? payload?.status;

    if (value === true) return true;
    const status = normalizeStatus(value);
    return ['confirmed', 'completed', 'complete', 'success', 'successful', 'done', 'booked'].includes(status);
}

function extractErrorMessage(data) {
    return (
        data?.Content?.message
        || data?.Content?.error
        || data?.error?.message
        || data?.Description
        || data?.Title
        || data?.message
        || ''
    );
}

function formatFailedService(raw) {
    if (!raw) return '';
    return String(raw).replace(/_/g, ' ').trim();
}

function isExpiredMessage(message) {
    return /expired/i.test(String(message || ''));
}

function makingSlug(name) {
    if (!name) return 'hotel';
    return String(name).toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}

function encodeProvider(str) {
    if (!str) return '';
    return [...String(str)].map((c) => (c.charCodeAt(0) + 3).toString(36)).join('');
}

function providerShortName(provider) {
    if (!provider) return '';
    return encodeProvider(provider).toLowerCase();
}

function buildCheckoutUrl(packageId) {
    const id = String(packageId || '').trim();
    return id
        ? `/holiday-packages/checkout?package_id=${encodeURIComponent(id)}`
        : '/holiday-packages/checkout';
}

function getNightsCount(checkIn, checkOut) {
    const nights = moment(checkOut).diff(moment(checkIn), 'days');
    return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

function buildRevisionPkg(content, fallbackPackageId) {
    const searchRooms = Array.isArray(content?.original_search_rooms) && content.original_search_rooms.length > 0
        ? content.original_search_rooms
        : (Array.isArray(content?.search_rooms) ? content.search_rooms : []);
    const normalizedRooms = searchRooms.map((room) => ({
        adults: Number(room?.adults || 0),
        children: Array.isArray(room?.children)
            ? room.children
            : Array.isArray(room?.childrenAges)
                ? room.childrenAges
                : Array.from({ length: Number(room?.children || 0) }, () => ({ age: 8 })),
    }));
    const adults = Number(content?.adults || 0);
    const children = Number(content?.children || 0);
    const packageCurrency = content?.currency || content?.pricing?.currency || 'GBP';
    const currentFlight = content?.current_flight || content?.flight || null;
    const flightTotal = Number(
        currentFlight?.pricing?.total_amount
        || content?.pricing?.flight_price
        || 0
    );

    return {
        package_id: content?.package_id || fallbackPackageId,
        booking_reference: content?.booking_reference || '',
        currency: packageCurrency,
        adults,
        children,
        original_request: {
            rooms: normalizedRooms,
            adult: adults,
            child: children,
            infant: Number(currentFlight?.search_criteria?.infant || 0),
        },
        pricing: {
            currency: packageCurrency,
            total_price: Number(content?.pricing?.total_price || flightTotal || 0),
            hotel_price: Number(content?.pricing?.hotel_price || 0),
            flight_price: Number(content?.pricing?.flight_price || flightTotal || 0),
            transfer_price: Number(content?.pricing?.transfer_price || 0),
        },
        flight: currentFlight,
    };
}

function buildStayHotel(content) {
    return {
        id: content?.current_hotel?.id || content?.hotel?.id || '',
        name: content?.current_hotel?.name || content?.hotel?.name || '',
        check_in: content?.check_in || content?.hotel?.checkIn,
        check_out: content?.check_out || content?.hotel?.checkOut,
        nights: getNightsCount(
            content?.check_in || content?.hotel?.checkIn,
            content?.check_out || content?.hotel?.checkOut
        ),
        location: {
            latitude: content?.latitude || content?.destination?.latitude,
            longitude: content?.longitude || content?.destination?.longitude,
            address: content?.hotel?.address || '',
        },
        destination: content?.destination || {
            city: content?.hotel?.city || content?.city,
            latitude: content?.latitude,
            longitude: content?.longitude,
            countryCode: content?.destination?.countryCode || null,
        },
        provider: content?.hotel?.provider || '',
    };
}

function Page() {
    const params = useParams();
    const router = useRouter();

    const [isPolling, setIsPolling] = useState(true);
    const [error, setError] = useState('');
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [serviceFailureMessage, setServiceFailureMessage] = useState('');
    const [checkoutRedirect, setCheckoutRedirect] = useState({ message: '', packageId: '' });
    const [activeStep, setActiveStep] = useState(1);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [bookingReference, setBookingReference] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const [hotelRevisionModalOpen, setHotelRevisionModalOpen] = useState(false);
    const [reviseContext, setReviseContext] = useState(null);
    const [failedService, setFailedService] = useState('');
    const [changeHotelModalOpen, setChangeHotelModalOpen] = useState(false);
    const [changeHotelPkg, setChangeHotelPkg] = useState(null);
    const [changeHotelStay, setChangeHotelStay] = useState(null);
    const [changeHotelCity, setChangeHotelCity] = useState('');
    const [changeFlightModalOpen, setChangeFlightModalOpen] = useState(false);
    const [changeFlightPkg, setChangeFlightPkg] = useState(null);
    const [changeFlight, setChangeFlight] = useState(null);

    const routeParams = Array.isArray(params?.params) ? params.params : [];
    const packageId = routeParams[0] || '';
    const bookingCode = routeParams[1] || '';

    const endpoint = useMemo(
        () => (
            bookingCode && packageId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/booking/payment-status/${bookingCode}?package_id=${packageId}`
                : ''
        ),
        [bookingCode, packageId]
    );

    const fetchBookingStatus = useCallback(async () => {
        if (sessionExpiredMessage || serviceFailureMessage || checkoutRedirect.packageId) return;

        if (!endpoint) {
            setError('Package ID or booking code is missing in the URL.');
            setIsPolling(false);
            return;
        }

        try {
            const response = await fetch(endpoint, {
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            });
            const data = await response.json();

            const apiOk = data?.Success !== false && data?.success !== false;
            const content = data?.Content ?? data?.data ?? data;
            const apiStatus = String(content?.status ?? data?.status ?? '').trim().toLowerCase();
            const failureType = String(content?.failure_type ?? data?.failure_type ?? '').trim().toLowerCase();
            const ref = content?.booking_reference || data?.booking_reference || bookingCode;
            if (ref) setBookingReference(ref);

            setLastUpdated(new Date());
            setPollCount((c) => c + 1);
            setActiveStep((prev) => Math.min(prev + (prev < 2 ? 1 : 0), 2));

            if (apiStatus === 'confirmed' || apiStatus === 'completed' || apiStatus === 'success' || isGloballyCompleted(content)) {
                setIsPolling(false);
                setError('');
                setActiveStep(3);
                if (ref) {
                    router.push(`/holiday-packages/voucher/${ref}`);
                }
                return;
            }

            if (failureType === 'session_expired' || apiStatus === 'expired') {
                setSessionExpiredMessage(
                    extractErrorMessage(data) || 'Your booking session has expired. Please search again.'
                );
                setError('');
                setIsPolling(false);
                return;
            }

            if (
                apiStatus === 'needs_revision'
                || apiStatus === 'failed'
                || (!apiOk && apiStatus)
            ) {
                const failedPackageId = content?.package_id || packageId;
                const redirectTarget = String(content?.redirect ?? '').trim().toLowerCase();
                const redirectSection = String(content?.redirect_section ?? '').trim().toLowerCase();
                const failedServiceRaw = content?.failed_service || redirectSection || '';
                const failedServiceLabel = formatFailedService(failedServiceRaw);

                if (redirectTarget === 'checkout' || redirectSection === 'checkout') {
                    setIsPolling(false);
                    setError('');
                    setCheckoutRedirect({
                        message: extractErrorMessage(data) || 'Please update your details and try again.',
                        packageId: failedPackageId,
                    });
                    return;
                }

                setServiceFailureMessage(
                    failedServiceLabel
                        ? `We couldn't confirm your ${failedServiceLabel} just now. Please try another option. If you have any questions, feel free to contact us for assistance.`
                        : `We couldn't confirm one part of your booking just now. Please try another option. If you have any questions, feel free to contact us for assistance.`
                );
                setError('');
                setIsPolling(false);

                if (failedPackageId && failedServiceRaw) {
                    try {
                        const reviseResponse = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/revise/context`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Accept: 'application/json',
                                },
                                body: JSON.stringify({
                                    package_id: failedPackageId,
                                    service: failedServiceRaw,
                                }),
                            }
                        );
                        const reviseData = await reviseResponse.json();
                        const reviseContent = reviseData?.Content;
                        const reviseFailedService = String(
                            reviseContent?.failed_service || failedServiceRaw
                        ).trim().toLowerCase();

                        if (reviseData?.Success && reviseContent) {
                            persistReviseContext(reviseContent);
                            setReviseContext(reviseContent);
                            setFailedService(reviseFailedService);

                            if (reviseFailedService === 'hotel') {
                                setChangeHotelPkg(buildRevisionPkg(reviseContent, failedPackageId));
                                setChangeHotelStay(buildStayHotel(reviseContent));
                                setChangeHotelCity(
                                    reviseContent?.hotel?.city
                                    || reviseContent?.city
                                    || reviseContent?.destination?.city
                                    || reviseContent?.destination?.location
                                    || 'Destination'
                                );
                                setHotelRevisionModalOpen(true);
                            } else if (reviseFailedService === 'flight') {
                                const revisionPkg = buildRevisionPkg(reviseContent, failedPackageId);
                                const currentFlight = reviseContent?.current_flight
                                    || reviseContent?.flight
                                    || null;
                                setChangeFlightPkg(revisionPkg);
                                setChangeFlight(currentFlight);
                                setChangeFlightModalOpen(true);
                            }
                        } else {
                            console.log('Revise context response:', reviseData);
                        }
                    } catch (reviseError) {
                        console.log('Revise context error:', reviseError);
                    }
                }
                return;
            }

            if (data?.Success === false || data?.success === false) {
                const message = extractErrorMessage(data) || 'Unable to fetch booking status.';
                if (isExpiredMessage(message) || apiStatus === 'expired') {
                    setSessionExpiredMessage(message);
                    setError('');
                    setIsPolling(false);
                    return;
                }
                setError(message);
                setIsPolling(false);
                return;
            }

            setError('');
        } catch (err) {
            setError(err?.message || 'Unable to fetch booking status.');
            setIsPolling(false);
        }
    }, [
        bookingCode,
        checkoutRedirect.packageId,
        endpoint,
        packageId,
        router,
        serviceFailureMessage,
        sessionExpiredMessage,
    ]);

    useEffect(() => {
        if (!checkoutRedirect.packageId) return undefined;

        const timerId = setTimeout(() => {
            router.push(buildCheckoutUrl(checkoutRedirect.packageId));
        }, 2200);

        return () => clearTimeout(timerId);
    }, [checkoutRedirect.packageId, router]);

    useEffect(() => {
        let timerId;
        let isMounted = true;

        const poll = async () => {
            if (!isMounted) return;
            await fetchBookingStatus();
        };

        poll();

        if (isPolling) {
            timerId = setInterval(poll, POLL_INTERVAL_MS);
        }

        return () => {
            isMounted = false;
            if (timerId) clearInterval(timerId);
        };
    }, [fetchBookingStatus, isPolling]);

    const handleChangeRoom = () => {
        const ctx = reviseContext;
        const hotel = ctx?.hotel || ctx?.current_hotel || {};
        const hotelName = hotel?.name || ctx?.current_hotel?.name || 'hotel';
        const hotelId = hotel?.id || ctx?.current_hotel?.id || '';
        const provider = hotel?.provider || '';
        const pkgId = ctx?.package_id || packageId;

        if (!hotelId || !pkgId) {
            router.push(buildCheckoutUrl(pkgId));
            return;
        }

        persistReviseContext(ctx);
        persistReviseAction(REVISE_ACTIONS.CHANGE_ROOM);

        const params = new URLSearchParams({
            packageId: pkgId,
            id: String(hotelId),
            code: providerShortName(provider),
            edit: 'true',
            revise: 'true',
        });

        setHotelRevisionModalOpen(false);
        router.push(`/hotels/${makingSlug(hotelName)}?${params.toString()}`);
    };

    const handleChangeHotel = () => {
        const ctx = reviseContext;
        if (!ctx) return;

        persistReviseContext(ctx);
        persistReviseAction(REVISE_ACTIONS.CHANGE_HOTEL);

        if (!changeHotelPkg) {
            setChangeHotelPkg(buildRevisionPkg(ctx, packageId));
        }
        if (!changeHotelStay) {
            setChangeHotelStay(buildStayHotel(ctx));
        }
        if (!changeHotelCity) {
            setChangeHotelCity(
                ctx?.hotel?.city
                || ctx?.city
                || ctx?.destination?.city
                || 'Destination'
            );
        }

        setHotelRevisionModalOpen(false);
        setChangeHotelModalOpen(true);
    };

    const hotelNameForModal = reviseContext?.current_hotel?.name
        || reviseContext?.hotel?.name
        || 'your selected hotel';

    const hasSessionExpired = Boolean(sessionExpiredMessage);
    const hasServiceFailure = Boolean(serviceFailureMessage);
    const hasCheckoutRedirect = Boolean(checkoutRedirect.message);
    const hasError = Boolean(error);
    const isTerminal = hasSessionExpired || hasServiceFailure || hasCheckoutRedirect || hasError;

    const bannerClass = hasSessionExpired || (hasError && isExpiredMessage(error))
        ? styles.expired
        : hasServiceFailure || hasCheckoutRedirect || hasError
            ? styles.failed
            : isPolling
                ? styles.polling
                : styles.done;

    const bannerText = hasSessionExpired || (hasError && isExpiredMessage(error))
        ? 'Session expired'
        : hasCheckoutRedirect
            ? 'Redirecting…'
            : hasServiceFailure || hasError
                ? 'Action needed'
                : isPolling
                    ? 'Please wait…'
                    : 'Almost done';

    const progressPercent = isTerminal
        ? 100
        : Math.min(20 + activeStep * 28 + Math.min(pollCount * 4, 16), 92);

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <div className={styles.brandMark} aria-hidden="true">
                        <FaSuitcaseRolling />
                    </div>
                    <h1 className={styles.heading}>
                        {hasServiceFailure
                            ? 'Almost There'
                            : hasSessionExpired || (hasError && isExpiredMessage(error))
                                ? 'Session Expired'
                                : hasError
                                    ? 'Something Went Wrong'
                                    : 'Booking In Progress'}
                    </h1>
                </div>

                <p className={styles.subtitle}>
                    {hasServiceFailure
                        ? 'Most of your booking is secure — we just need you to choose a new option for the part that didn\'t go through.'
                        : hasSessionExpired || (hasError && isExpiredMessage(error))
                            ? 'Your payment session is no longer valid.'
                            : hasError
                                ? 'We ran into a problem while finalizing your booking.'
                                : 'Payment received. Please wait while we finalize your booking.'}
                </p>

                <div className={styles.statusBanner}>
                    <span className={styles.statusBannerLabel}>
                        {isTerminal ? 'Status' : 'We are processing your booking'}
                    </span>
                    <span className={`${styles.statusBannerValue} ${bannerClass}`}>{bannerText}</span>
                </div>

                {!isTerminal ? (
                    <>
                        <div className={styles.loaderWrap} aria-hidden="true">
                            <span className={styles.spinner} />
                        </div>

                        <div className={styles.progressTrack} aria-hidden="true">
                            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                        </div>

                        <ol className={styles.steps}>
                            {PROGRESS_STEPS.map((step, index) => {
                                const stepNumber = index + 1;
                                const done = activeStep > stepNumber || (!isPolling && activeStep >= 3);
                                const current = isPolling && activeStep === stepNumber;
                                const Icon = step.Icon;

                                return (
                                    <li
                                        key={step.id}
                                        className={[
                                            styles.step,
                                            done ? styles.stepDone : '',
                                            current ? styles.stepCurrent : '',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        <span className={styles.stepIcon}>
                                            <Icon />
                                        </span>
                                        <span className={styles.stepLabel}>{step.label}</span>
                                    </li>
                                );
                            })}
                        </ol>

                        <p className={styles.waitMessage}>
                            Please do not refresh or close this page. We check your booking status automatically every few seconds.
                        </p>
                    </>
                ) : null}

                {sessionExpiredMessage ? (
                    <div className={styles.warnBox}>
                        <p>{sessionExpiredMessage}</p>
                    </div>
                ) : null}

                {checkoutRedirect.message ? (
                    <div className={styles.errorBox}>
                        <p>{checkoutRedirect.message}</p>
                    </div>
                ) : null}

                {hasCheckoutRedirect ? (
                    <p className={styles.waitMessage}>Taking you back to checkout…</p>
                ) : null}

                {serviceFailureMessage ? (
                    <div className={styles.errorBox}>
                        <p>{serviceFailureMessage}</p>
                    </div>
                ) : null}

                {error ? (
                    <div className={styles.errorBox}>
                        <p>{error}</p>
                    </div>
                ) : null}

                {(hasSessionExpired || hasServiceFailure || hasError) ? (
                    <div className={styles.actions}>
                        {hasServiceFailure && reviseContext && failedService === 'hotel' ? (
                            <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => setHotelRevisionModalOpen(true)}
                            >
                                Choose Room or Hotel
                            </button>
                        ) : null}
                        {hasServiceFailure && reviseContext && failedService === 'flight' ? (
                            <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => setChangeFlightModalOpen(true)}
                            >
                                Choose Another Flight
                            </button>
                        ) : null}
                        {hasServiceFailure ? (
                            <button
                                type="button"
                                className={reviseContext ? styles.btnSecondary : styles.btnPrimary}
                                onClick={() => router.push(buildCheckoutUrl(checkoutRedirect.packageId || packageId))}
                            >
                                Back to Checkout
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className={hasServiceFailure ? styles.btnSecondary : styles.btnPrimary}
                            onClick={() => router.push('/')}
                        >
                            Go Home
                        </button>
                    </div>
                ) : null}

                {bookingReference ? (
                    <p className={styles.refCode}>Ref: {bookingReference}</p>
                ) : null}
                {lastUpdated ? (
                    <p className={styles.meta}>Last update: {lastUpdated.toLocaleTimeString()}</p>
                ) : null}
            </div>

            <Modal
                opened={hotelRevisionModalOpen}
                onClose={() => setHotelRevisionModalOpen(false)}
                centered
                withCloseButton={false}
                radius="lg"
                size="md"
                padding={0}
                classNames={{
                    content: styles.revisionModalContent,
                    body: styles.revisionModalBody,
                }}
            >
                <div className={styles.revisionModal}>
                    <div className={styles.revisionModalIcon} aria-hidden="true">
                        <FaHotel />
                    </div>
                    <h2 className={styles.revisionModalTitle}>Hotel Unavailable</h2>
                    <p className={styles.revisionModalText}>
                        We couldn&apos;t confirm <strong>{hotelNameForModal}</strong>.
                        Would you like to change the room at this hotel, or pick a different hotel?
                    </p>
                    <div className={styles.revisionModalActions}>
                        <button
                            type="button"
                            className={styles.revisionChoiceBtn}
                            onClick={handleChangeRoom}
                        >
                            <span className={styles.revisionChoiceIcon}><FaBed /></span>
                            <span className={styles.revisionChoiceCopy}>
                                <span className={styles.revisionChoiceLabel}>Change Room</span>
                                <span className={styles.revisionChoiceHint}>Keep this hotel, pick another room</span>
                            </span>
                        </button>
                        <button
                            type="button"
                            className={styles.revisionChoiceBtn}
                            onClick={handleChangeHotel}
                        >
                            <span className={styles.revisionChoiceIcon}><FaHotel /></span>
                            <span className={styles.revisionChoiceCopy}>
                                <span className={styles.revisionChoiceLabel}>Change Hotel</span>
                                <span className={styles.revisionChoiceHint}>Browse other hotels nearby</span>
                            </span>
                        </button>
                    </div>
                </div>
            </Modal>

            <ChangeHotelModal
                opened={changeHotelModalOpen}
                onClose={() => setChangeHotelModalOpen(false)}
                reviseContext={reviseContext}
                pkg={changeHotelPkg}
                hotel={changeHotelStay}
                cityName={changeHotelCity || 'Destination'}
            />

            <ChangeFlightModal
                opened={changeFlightModalOpen}
                onClose={() => setChangeFlightModalOpen(false)}
                pkg={changeFlightPkg}
                flight={changeFlight}
            />
        </div>
    );
}

export default Page;
