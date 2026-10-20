'use client';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState, Suspense } from 'react';
import { MdEdit, MdLocationOn, MdPeople } from 'react-icons/md';
import Index from '@/components/Transfer/Listing/Index';
import TransferInfo from '@/components/Transfer/Listing/TransferInfo';
import TransferRouteMap from '@/components/Transfer/Listing/TransferRouteMap';
import { TransferListProvider } from '@/components/Transfer/Listing/TransferListingContext';
import TransferListingLoader, {
    FilterSidebarSkeleton,
} from '../../components/Loader/TransferListingLoader';
import TransferModify from '@/components/Home/Search/ModifySearch/TransferModify';
import { PackageModeBanner } from '@/components/Store/PackageModeHelper';
import moment from 'moment';
function TransferPageContent() {
    const searchParams = useSearchParams();
    // Convert to normal object
    const params = Object.fromEntries(searchParams.entries());

    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const getTransfers = async (params) => {
        try {
            // Support both new (pickupLatitude) and legacy (fromLat) URL keys
            const pickupLatitude = params.pickupLatitude ?? params.fromLat ?? null;
            const pickupLongitude = params.pickupLongitude ?? params.fromLng ?? null;
            const dropoffLatitude = params.dropoffLatitude ?? params.toLat ?? null;
            const dropoffLongitude = params.dropoffLongitude ?? params.toLng ?? null;

            const adults = Number(params.adults) || 0;
            const children = Number(params.children) || 0;
            const infants = Number(params.infants) || 0;
            const passengers = Number(params.passengers) || adults + children + infants || 1;

            const searchPayload = {
                pickupLocation: params.pickupLocation || '',
                dropoffLocation: params.dropoffLocation || '',
                pickupLatitude: pickupLatitude === '' || pickupLatitude == null ? null : Number(pickupLatitude),
                pickupLongitude: pickupLongitude === '' || pickupLongitude == null ? null : Number(pickupLongitude),
                dropoffLatitude: dropoffLatitude === '' || dropoffLatitude == null || dropoffLatitude === 'null'
                    ? null
                    : Number(dropoffLatitude),
                dropoffLongitude: dropoffLongitude === '' || dropoffLongitude == null || dropoffLongitude === 'null'
                    ? null
                    : Number(dropoffLongitude),
                pickupDate: params.pickupDate || '',
                pickupTime: params.pickupTime || '',
                passengers,
                adults: adults || passengers,
                children,
                infants,
                transferType: params.transferType || 'one-way',
            };

            if (params.dropoffDate) searchPayload.dropoffDate = params.dropoffDate;
            if (params.dropoffTime) searchPayload.dropoffTime = params.dropoffTime;

            // Package mode often passes airport-list labels like "King Abdulaziz Intl."
            // which the transfer API cannot resolve — swap to city name when possible.
            const pickup = searchPayload.pickupLocation || '';
            if (/\b(Intl\.?|Arpt\.?)\b/i.test(pickup) && !pickup.includes(',')) {
                try {
                    const { AirportList } = await import('@/util/AirportList');
                    const airport = AirportList.find((a) => a.airportName === pickup);
                    if (airport?.cityName) {
                        searchPayload.pickupLocation = airport.cityName;
                    }
                } catch (e) {
                    console.warn('Could not resolve abbreviated pickup location', e);
                }
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/transfers/search`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                    body: JSON.stringify(searchPayload),
                }
            );

            const data = await res.json();
            return data?.data?.transfers || [];
        } catch (error) {
            console.error('Error fetching transfers:', error);
            return [];
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const result = await getTransfers(params);
            setTransfers(result);
            setLoading(false);
        };

        fetchData();
    }, [searchParams]); // re-run when URL changes

    return (
        <div>
            <PackageModeBanner serviceName="transfer" />

            {/* Mobile: compact summary + collapsible search */}
            <div className='d-block d-md-none'>
                <div className='msb-bar'>
                    <div
                        className='d-flex align-items-center gap-3 cursor-pointer'
                        onClick={() => setShowMobileSearch(prev => !prev)}
                    >
                        <div className='msb-icon'>
                            <MdLocationOn size={20} color="#E7247A" />
                        </div>
                        <div className='flex-grow-1' style={{ minWidth: 0 }}>
                            <div className='msb-title'>
                                {params?.pickupLocation || 'Search Transfers'}
                                {params?.dropoffLocation && (
                                    <span className='msb-title-secondary'> → {params.dropoffLocation}</span>
                                )}
                            </div>
                            <div className='msb-subtitle'>
                                <MdPeople size={12} className='msb-subtitle-icon' />
                                {(() => {
                                    const adults = Number(params?.adults || 0);
                                    const children = Number(params?.children || 0);
                                    const infants = Number(params?.infants || 0);
                                    const parts = [];
                                    if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? 's' : ''}`);
                                    if (children > 0) parts.push(`${children} Child${children !== 1 ? 'ren' : ''}`);
                                    if (infants > 0) parts.push(`${infants} Infant${infants !== 1 ? 's' : ''}`);
                                    if (parts.length) return parts.join(', ');
                                    if (params?.passengers) {
                                        return `${params.passengers} Passenger${Number(params.passengers) !== 1 ? 's' : ''}`;
                                    }
                                    return 'Tap to search';
                                })()}
                                {params?.pickupDate && (
                                    <span className='msb-subtitle-date'>· {moment(params.pickupDate).format('DD-MM-YYYY')}</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); setShowMobileSearch(prev => !prev); }}
                            className='msb-modify-btn'
                        >
                            <MdEdit size={13} />
                            Modify
                        </button>
                    </div>
                </div>

                <div
                    className='msb-collapse'
                    style={{ maxHeight: showMobileSearch ? '1200px' : '0' }}
                >
                    <div className='msb-collapse-inner'>
                        <TransferModify onSearch={() => setShowMobileSearch(false)} />
                    </div>
                </div>
            </div>

            {/* Desktop: hero search (also in package mode) */}
            <div className="hotel-search-modify hotel-search-modify--hero d-none d-md-block">
                <TransferModify />
            </div>

            {loading ? (
                <div className="container mb-5 mt-3">
                    <div className="row g-3">
                        <div className="col-lg-3 col-md-4 col-12">
                            <FilterSidebarSkeleton />
                        </div>
                        <div className="col-lg-9 col-md-8 col-12">
                            <TransferListingLoader
                                pickupLocation={params?.pickupLocation}
                                dropoffLocation={params?.dropoffLocation}
                                transferType={params?.transferType}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className='container mb-5 mt-3'>
                        <TransferListProvider transfers={transfers}>
                            {/* <div className='row g-3 mb-3 d-none d-md-flex'>
                                <div className='col-md-3'>
                                    <TransferInfo searchInfo={params} />
                                </div>
                                <div className='col-md-9'>
                                    <TransferRouteMap searchParams={params} />
                                </div>
                            </div> */}

                            <Index searchParams={params} />
                        </TransferListProvider>
                    </div>
                </>
            )}
        </div>
    )
}

function TransferPageFallback() {
    return (
        <div className="container mb-5 mt-3">
            <div className="row g-3">
                <div className="col-lg-3 col-md-4 col-12">
                    <FilterSidebarSkeleton />
                </div>
                <div className="col-lg-9 col-md-8 col-12">
                    <TransferListingLoader />
                </div>
            </div>
        </div>
    );
}

export default function page() {
    return (
        <Suspense fallback={<TransferPageFallback />}>
            <TransferPageContent />
        </Suspense>
    );
}
