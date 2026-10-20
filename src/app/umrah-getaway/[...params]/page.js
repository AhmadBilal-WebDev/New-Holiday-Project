'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import UpdateHotelModal from '@/components/UmrahGetAway/UpdateHotel/Main';
import UpdateFlightModal from '@/components/UmrahGetAway/UpdateFlight/Index';
import { FilterProvider } from '@/components/UmrahGetAway/Listing/Filter/FilterContext';

const POLL_INTERVAL_MS = 3000;
const SERVICE_DISPLAY_NAMES = {
    makkah_hotel: 'Makkah hotel',
    madinah_hotel: 'Madinah hotel',
    hotel_makkah: 'Makkah hotel',
    hotel_madinah: 'Madinah hotel',
    flight: 'flight',
    transfer: 'transfer',
    visa: 'visa',
};

const SERVICE_META = [
    { id: 'hotel_makkah', label: 'Hotel Makkah', aliases: ['hotel_makkah', 'makkah_hotel', 'makkahhotel', 'makkah'] },
    { id: 'hotel_madinah', label: 'Hotel Madinah', aliases: ['hotel_madinah', 'madinah_hotel', 'madinahhotel', 'madinah'] },
    { id: 'flight', label: 'Flight', aliases: ['flight', 'flights'] },
    { id: 'transfer', label: 'Transfer', aliases: ['transfer', 'transfers'] },
    { id: 'visa', label: 'Visa', aliases: ['visa', 'visas'] },
];

function normalizeStatus(value) {
    if (value === true) return 'completed';
    if (value === false) return 'pending';
    if (typeof value !== 'string') return 'pending';

    const status = value.trim().toLowerCase();

    if (['booked', 'completed', 'complete', 'success', 'successful', 'done', 'confirmed'].includes(status)) {
        return 'completed';
    }
    if (['processing', 'in_progress', 'in progress', 'booking', 'initiated', 'started', 'running'].includes(status)) {
        return 'in_progress';
    }
    if (['failed', 'error', 'cancelled', 'canceled', 'rejected'].includes(status)) {
        return 'failed';
    }
    return 'pending';
}

function normalizeKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findServiceStatus(payload, aliases) {
    const aliasSet = new Set(aliases.map(normalizeKey));

    function searchNode(node, parentKey = '') {
        if (!node || typeof node !== 'object') return null;

        for (const [rawKey, rawValue] of Object.entries(node)) {
            const combinedKey = normalizeKey(`${parentKey}_${rawKey}`);
            const keyOnly = normalizeKey(rawKey);
            const matchedAlias = [...aliasSet].some((alias) => combinedKey.includes(alias) || keyOnly.includes(alias));

            if (matchedAlias) {
                if (typeof rawValue === 'string' || typeof rawValue === 'boolean') {
                    return normalizeStatus(rawValue);
                }
                if (rawValue && typeof rawValue === 'object') {
                    const directStatus = rawValue.status ?? rawValue.booking_status ?? rawValue.state ?? rawValue.booked;
                    if (directStatus !== undefined) {
                        return normalizeStatus(directStatus);
                    }
                }
            }

            if (rawValue && typeof rawValue === 'object') {
                const nested = searchNode(rawValue, `${parentKey}_${rawKey}`);
                if (nested) return nested;
            }
        }

        return null;
    }

    return searchNode(payload) ?? 'pending';
}

function isBookingCompleted(payload, statuses) {
    const globalCompletionValue = payload?.all_services_booked
        ?? payload?.all_booked
        ?? payload?.is_completed
        ?? payload?.completed
        ?? payload?.status;

    if (globalCompletionValue !== undefined && normalizeStatus(globalCompletionValue) === 'completed') {
        return true;
    }

    return Object.values(statuses).every((status) => status === 'completed');
}

function Page() {
    const params = useParams();
    const router = useRouter();
    const [isPolling, setIsPolling] = useState(true);
    const [error, setError] = useState('');
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [serviceFailureMessage, setServiceFailureMessage] = useState('');
    const [checkoutRedirect, setCheckoutRedirect] = useState({ message: '', packageId: '' });
    const [revisionModalOpen, setRevisionModalOpen] = useState(false);
    const [revisionChangeHotel, setRevisionChangeHotel] = useState({
        pkg: null,
        hotel: null,
        cityName: '',
        failedService: '',
    });
    const [revisionFlightModalOpen, setRevisionFlightModalOpen] = useState(false);
    const [revisionChangeFlight, setRevisionChangeFlight] = useState({
        pkg: null,
        flight: null,
    });
    const [lastUpdated, setLastUpdated] = useState(null);

    const routeParams = Array.isArray(params?.params) ? params.params : [];
    const packageId = routeParams[0] || '';
    const bookingCode = routeParams[1] || '';

    const endpoint = useMemo(
        () => (
            bookingCode && packageId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/booking/payment-status/${bookingCode}?package_id=${packageId}`
                : ''
        ),
        [bookingCode, packageId]
    );

    const getNightsCount = useCallback((checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 1;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const milliseconds = checkOutDate.getTime() - checkInDate.getTime();
        const nights = Math.round(milliseconds / (1000 * 60 * 60 * 24));
        return nights > 0 ? nights : 1;
    }, []);

    const updateStatusesFromPayload = useCallback((payload) => {
        const detectedStatuses = SERVICE_META.reduce((acc, service) => {
            acc[service.id] = findServiceStatus(payload, service.aliases);
            return acc;
        }, {});

        setLastUpdated(new Date());

        const allCompleted = isBookingCompleted(payload, detectedStatuses);
        if (allCompleted) {
            setIsPolling(false);
        }
    }, []);

    const fetchBookingStatus = useCallback(async () => {
        if (sessionExpiredMessage || serviceFailureMessage || checkoutRedirect.packageId) return;

        if (!endpoint) {
            router.replace('/');
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
            const apiStatus = String(data?.Content?.status ?? data?.status ?? '').trim().toLowerCase();

            if (apiStatus === 'confirmed') {
                const bookingReference = data?.Content?.booking_reference || data?.booking_reference || bookingCode;
                if (bookingReference) {
                    setIsPolling(false);
                    setError('');
                    router.push(`/umrah-getaway/voucher/${bookingReference}`);
                    return;
                }
            }

            if (apiStatus === 'expired') {
                setSessionExpiredMessage(
                    data?.Content?.message
                    || data?.Description
                    || data?.Title
                    || 'Your booking session has expired. Please search again.'
                );
                setError('');
                setIsPolling(false);
                return;
            }

            if (apiStatus === 'failed') {
                const failedPackageId = data?.Content?.package_id || packageId;
                const redirectTarget = String(data?.Content?.redirect ?? '').trim().toLowerCase();
                const redirectSection = String(data?.Content?.redirect_section ?? '').trim().toLowerCase();

                if (redirectTarget === 'checkout' || redirectSection === 'checkout') {
                    setIsPolling(false);
                    setError('');
                    setCheckoutRedirect({
                        message: data?.Content?.message
                            || data?.Description
                            || data?.Title
                            || 'Please update your details and try again.',
                        packageId: failedPackageId,
                    });
                    return;
                }

                const failedService = data?.Content?.failed_service || 'makkah_hotel';
                const serviceLabel = SERVICE_DISPLAY_NAMES[failedService] || failedService.replace(/_/g, ' ');
                const isHotelService = failedService.includes('hotel');
                const isFlightService = failedService === 'flight';

                setServiceFailureMessage(
                    data?.Content?.message
                    || (isHotelService
                        ? `The selected ${serviceLabel} is currently unavailable. You can change the hotel and choose another available option.`
                        : `The selected ${serviceLabel} is currently unavailable. Please choose another available option to continue.`)
                );
                setError('');
                setIsPolling(false);

                try {
                    const reviseResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/revise/context`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Accept: 'application/json',
                            },
                            body: JSON.stringify({
                                package_id: failedPackageId,
                                service: failedService,
                            }),
                        }
                    );
                    const reviseData = await reviseResponse.json();
                    if (reviseData?.Success && reviseData?.Content && isFlightService) {
                        const content = reviseData.Content;
                        const searchCriteria = content?.current_flight?.search_criteria || {};
                        const legs = Array.isArray(searchCriteria.legs) ? searchCriteria.legs : [];
                        const journeyType = searchCriteria.journeyType || searchCriteria.journey_type || 'makkahFirst';
                        const returnLeg = legs[1] || {};
                        const searchRooms = Array.isArray(content?.original_search_rooms) && content.original_search_rooms.length > 0
                            ? content.original_search_rooms
                            : (Array.isArray(content?.search_rooms) ? content.search_rooms : []);
                        const normalizedRooms = searchRooms.map((room) => ({
                            adults: Number(room?.adults || 0),
                            children: Array.isArray(room?.children)
                                ? room.children
                                : Array.from({ length: Number(room?.children || 0) }, () => ({ age: 8 })),
                        }));
                        const adults = Number(content?.adults || searchCriteria.adult || 0);
                        const children = Number(content?.children || searchCriteria.child || 0);
                        const flightTotal = Number(
                            content?.current_flight?.pricing?.total_amount
                            || content?.current_flight?.total_amount
                            || 0
                        );
                        const packageCurrency = content?.currency
                            || content?.current_flight?.pricing?.currency
                            || content?.current_flight?.total_currency
                            || 'SAR';
                        const detailsRequestInfo = {
                            departure_city: searchCriteria.departureCity || searchCriteria.departure_city || '',
                            journey_type: journeyType,
                            departure_date: searchCriteria.departureDate || searchCriteria.departure_date || '',
                            makkah_nights: searchCriteria.makkahNights || searchCriteria.makkah_nights || '',
                            madinah_nights: searchCriteria.madinahNights || searchCriteria.madinah_nights || '',
                        };

                        if (journeyType === 'makkahFirst') {
                            detailsRequestInfo.madinah_check_out = returnLeg?.departure_date || '';
                        } else {
                            detailsRequestInfo.makkah_check_out = returnLeg?.departure_date || '';
                        }

                        const revisionPkg = {
                            package_id: content?.package_id || packageId,
                            currency: packageCurrency,
                            adults,
                            children,
                            original_request: {
                                rooms: normalizedRooms,
                                adult: adults,
                                child: children,
                                infant: Number(searchCriteria.infant || 0),
                            },
                            details_request_info: detailsRequestInfo,
                            pricing: {
                                currency: packageCurrency,
                                total_price: flightTotal,
                                flight_price: flightTotal,
                            },
                            flight: content?.current_flight || null,
                        };

                        setRevisionChangeFlight({
                            pkg: revisionPkg,
                            flight: content?.current_flight || null,
                        });
                        setRevisionFlightModalOpen(true);
                    } else if (reviseData?.Success && reviseData?.Content && isHotelService) {
                        const content = reviseData.Content;
                        const cityRaw = String(content?.city || '').toLowerCase();
                        const normalizedCity = cityRaw.includes('madinah') ? 'Madinah' : 'Makkah';
                        const searchRooms = Array.isArray(content?.original_search_rooms) && content.original_search_rooms.length > 0
                            ? content.original_search_rooms
                            : (Array.isArray(content?.search_rooms) ? content.search_rooms : []);
                        const normalizedRooms = searchRooms.map((room) => ({
                            adults: Number(room?.adults || 0),
                            children: Array.isArray(room?.children)
                                ? room.children
                                : Array.from({ length: Number(room?.children || 0) }, () => ({ age: 8 })),
                        }));
                        const adults = Number(content?.adults || 0);
                        const children = Number(content?.children || 0);
                        const flightTotal = Number(content?.current_flight?.pricing?.total_amount || content?.current_flight?.total_amount || 0);
                        const hotelPrice = 0;
                        const packageCurrency = content?.currency || content?.current_flight?.pricing?.currency ;
                        const revisionPkg = {
                            package_id: content?.package_id || packageId,
                            currency: packageCurrency,
                            adults,
                            children,
                            original_request: {
                                rooms: normalizedRooms,
                                adult: adults,
                                child: children,
                                infant: 0,
                            },
                            pricing: {
                                currency: packageCurrency,
                                total_price: flightTotal + hotelPrice,
                                makkah_hotel_price: cityRaw.includes('makkah') ? hotelPrice : 0,
                                madinah_hotel_price: cityRaw.includes('madinah') ? hotelPrice : 0,
                            },
                            makkah_hotel: cityRaw.includes('makkah')
                                ? {
                                    id: content?.current_hotel?.id || '',
                                    name: content?.current_hotel?.name || '',
                                    check_in: content?.check_in,
                                    check_out: content?.check_out,
                                    nights: getNightsCount(content?.check_in, content?.check_out),
                                    location: {},
                                    destination: content?.destination,
                                    rooms: [],
                                    price: hotelPrice,
                                }
                                : { rooms: [] },
                            madinah_hotel: cityRaw.includes('madinah')
                                ? {
                                    id: content?.current_hotel?.id || '',
                                    name: content?.current_hotel?.name || '',
                                    check_in: content?.check_in,
                                    check_out: content?.check_out,
                                    nights: getNightsCount(content?.check_in, content?.check_out),
                                    location: {},
                                    destination: content?.destination,
                                    rooms: [],
                                    price: hotelPrice,
                                }
                                : { rooms: [] },
                        };

                        const currentHotel = {
                            id: content?.current_hotel?.id || '',
                            name: content?.current_hotel?.name || '',
                            check_in: content?.check_in,
                            check_out: content?.check_out,
                            nights: getNightsCount(content?.check_in, content?.check_out),
                            location: {},
                            destination: content?.destination,
                        };

                        setRevisionChangeHotel({
                            pkg: revisionPkg,
                            hotel: currentHotel,
                            cityName: normalizedCity,
                            failedService: content?.failed_service || failedService,
                        });
                        setRevisionModalOpen(true);
                    } else {
                        console.log('Revise context response:', reviseData);
                    }
                } catch (reviseError) {
                    console.log('Revise context error:', reviseError);
                }
                return;
            }

            const payload = data?.data ?? data;
            updateStatusesFromPayload(payload);
            setError('');



        } catch (err) {
            setError(err?.message || 'Unable to fetch booking status.');
        }
    }, [bookingCode, checkoutRedirect.packageId, endpoint, getNightsCount, packageId, router, serviceFailureMessage, sessionExpiredMessage, updateStatusesFromPayload]);

    useEffect(() => {
        if (!checkoutRedirect.packageId) return undefined;

        const timerId = setTimeout(() => {
            router.push(`/umrah-getaway/checkout?packageId=${checkoutRedirect.packageId}`);
        }, 2000);

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

    const hasSessionExpired = Boolean(sessionExpiredMessage);
    const hasServiceFailure = Boolean(serviceFailureMessage);
    const hasCheckoutRedirect = Boolean(checkoutRedirect.message);

    return (
        <div className={styles.bookingLoaderPage}>
            <div className={styles.loaderCard}>
                <h1 className={styles.heading}>Booking In Progress</h1>
                <p className={styles.subtitle}>Your request is being processed. Please wait while your services are being booked.</p>

                <div className={styles.progressSummary}>
                    <span>We are processing your booking request</span>
                    <span className={isPolling ? styles.polling : styles.done}>
                        {hasSessionExpired
                            ? 'Session expired'
                            : hasCheckoutRedirect
                                ? 'Redirecting to checkout'
                                : hasServiceFailure
                                    ? 'Service unavailable'
                                    : isPolling
                                        ? 'Please wait...'
                                        : 'Booking completed'}
                    </span>
                </div>

                {!hasSessionExpired && !hasServiceFailure && !hasCheckoutRedirect ? (
                    <>
                        <div className={styles.loaderArea} aria-hidden="true">
                            <span className={styles.spinner}></span>
                        </div>
                        <p className={styles.waitMessage}>
                            Please do not refresh or close this page. We will keep checking your booking status automatically.
                        </p>
                    </>
                ) : null}

                {sessionExpiredMessage ? <p className={styles.errorText}>{sessionExpiredMessage}</p> : null}
                {checkoutRedirect.message ? <p className={styles.errorText}>{checkoutRedirect.message}</p> : null}
                {hasCheckoutRedirect ? (
                    <p className={styles.waitMessage}>Redirecting you to checkout in a moment…</p>
                ) : null}
                {serviceFailureMessage ? <p className={styles.errorText}>{serviceFailureMessage}</p> : null}
                {hasSessionExpired ? (
                    <button
                        type="button"
                        className={styles.goHomeButton}
                        onClick={() => router.push('/')}
                    >
                        Go Home
                    </button>
                ) : null}
                {error ? <p className={styles.errorText}>{error}</p> : null}
                {lastUpdated ? <p className={styles.updatedAt}>Last update: {lastUpdated.toLocaleTimeString()}</p> : null}
            </div>
            <FilterProvider packages={[]}>
                <UpdateHotelModal
                    opened={revisionModalOpen}
                    onClose={() => setRevisionModalOpen(false)}
                    pkg={revisionChangeHotel.pkg}
                    hotel={revisionChangeHotel.hotel}
                    cityName={revisionChangeHotel.cityName}
                    failedService={revisionChangeHotel.failedService}
                    isRevisionMode
                />
            </FilterProvider>
            <UpdateFlightModal
                opened={revisionFlightModalOpen}
                onClose={() => setRevisionFlightModalOpen(false)}
                pkg={revisionChangeFlight.pkg}
                flight={revisionChangeFlight.flight}
                isRevisionMode
            />
        </div>
    )
}

export default Page;