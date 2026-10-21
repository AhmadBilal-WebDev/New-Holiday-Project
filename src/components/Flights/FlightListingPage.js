'use client'
import React, { useEffect, useState, useRef } from 'react'
import { MdEdit, MdLocationOn, MdPeople } from "react-icons/md";
import FlightCard from '@/components/Flights/FlightCard';
import moment from 'moment';
import SortOption from '@/components/Flights/Filters/SortOption';
import DepartureTimes from '@/components/Flights/Filters/DepartureTimes';
import JourneyDuration from '@/components/Flights/Filters/JourneyDuration';
import AirlineFilter from '@/components/Flights/Filters/AirlineFilter';
import FlightClass from '@/components/Flights/Filters/FlightClass';
import ResetFilter from '@/components/Flights/Filters/ResetFilter';
import LayoverTime from './Filters/Layovertime';
import Stops from '@/components/Flights/Filters/Stops';
import { useSearchParams } from 'next/navigation';
import FlightListingFullLoader from '@/components/Loader/FlightListingFullLoader';
import { FlightProvider, useFlightList } from '@/components/Flights/FlightListingContext';
import FlightListingPaginations from '@/components/Flights/FlightListingPaginations';
// import MapView from '@/components/Flights/MapView/MapView';
// import ScrollList from '@/components/Flights/ScrollList/ScrollList';
import FlightSearch from '../Home/Search/FlightSearch';
import { LiaAngleDownSolid } from "react-icons/lia";
import { Drawer } from "@mantine/core";
import { PackageModeBanner } from '../Store/PackageModeHelper';
import { FaPlane } from 'react-icons/fa';
import { Outfit, Inter } from 'next/font/google';
import heroStyles from './FlightListingHero.module.css';
import filterStyles from './Filters/FlightFilters.module.css';
import TopContact from '../Home/TopContact/TopContact';

const outfit = Outfit({
    subsets: ['latin'],
    weight: ['700'],
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    display: 'swap',
});

function MobileFilterPills({ setActiveDrawer, isFilterStuck }) {
    const {
        selectedStops,
        selectedDepartureSlots,
        selectedArrivalSlots,
        durationRange,
        minDuration,
        maxDuration,
        selectedAirlines,
        layoverRange,
        minLayover,
        maxLayover,
        selectedCabinClass,
    } = useFlightList();

    const isStopsApplied = selectedStops.length > 0;
    const isTimesApplied = selectedDepartureSlots.length > 0 || selectedArrivalSlots.length > 0;
    const isDurationApplied =
        Number(durationRange?.[0]) !== Number(minDuration) ||
        Number(durationRange?.[1]) !== Number(maxDuration);
    const isAirlinesApplied = selectedAirlines.length > 0;
    const isLayoverApplied =
        Number(layoverRange?.[0]) !== Number(minLayover) ||
        Number(layoverRange?.[1]) !== Number(maxLayover);
    const isCabinApplied = selectedCabinClass.length > 0;

    return (
        <div className={`filter-scroll d-flex gap-2 d-md-none mb-3${isFilterStuck ? ' filter-scroll--stuck' : ''}`}>
            <button
                type="button"
                onClick={() => setActiveDrawer('stops')}
                className={`filter-pill${isStopsApplied ? ' filter-pill--applied' : ''}`}
            >
                Stops <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('departureTimes')}
                className={`filter-pill${isTimesApplied ? ' filter-pill--applied' : ''}`}
            >
                Flight Times <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('duration')}
                className={`filter-pill${isDurationApplied ? ' filter-pill--applied' : ''}`}
            >
                Duration <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('airlines')}
                className={`filter-pill${isAirlinesApplied ? ' filter-pill--applied' : ''}`}
            >
                Airlines <span className="arrow"><LiaAngleDownSolid /></span>
            </button>
            <button
                type="button"
                onClick={() => setActiveDrawer('layover')}
                className={`filter-pill${isLayoverApplied ? ' filter-pill--applied' : ''}`}
            >
                Layover Time <span className="arrow"><LiaAngleDownSolid /></span>
            </button>
            <button
                type="button"
                onClick={() => setActiveDrawer('flightType')}
                className={`filter-pill${isCabinApplied ? ' filter-pill--applied' : ''}`}
            >
                Cabin <span className="arrow"><LiaAngleDownSolid /></span>
            </button>
        </div>
    );
}

function FlightResultCount() {
    const { totalFlights, allFlights } = useFlightList();
    const total = allFlights.length;
    const isFiltered = totalFlights !== total;
    const label = totalFlights === 1 ? 'Flight' : 'Flights';

    return (
        <div className="flight-result-count" aria-live="polite">
            <span className="flight-result-count__icon-wrap" aria-hidden="true">
                <FaPlane />
            </span>
            <p className="flight-result-count__text">
                {totalFlights === 0 ? (
                    <>No flights match your filters</>
                ) : isFiltered ? (
                    <>
                        Showing <strong>{totalFlights}</strong> of <strong>{total}</strong> {label}
                    </>
                ) : (
                    <>
                        <strong>{totalFlights}</strong> {label} Available
                    </>
                )}
            </p>
        </div>
    );
}

export default function FlightListingPage() {
    const searchParams = useSearchParams();
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [flightList, setFlightList] = useState([]);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFilterStuck, setIsFilterStuck] = useState(false);
    const filterSentinelRef = useRef(null);
    useEffect(() => {
        async function getFlights() {
            setIsLoading(true);
            const airTripType = searchParams.get('AirTripType');
            // Build legs array for all flight types
            const legs = [];

            if (airTripType === 'MultiCity') {
                // Build multi-city request with legs array
                let index = 1;
                while (searchParams.get(`flight${index}_from`)) {
                    legs.push({
                        origin: searchParams.get(`flight${index}_from`),
                        destination: searchParams.get(`flight${index}_to`),
                        departure_date: searchParams.get(`flight${index}_date`)
                    });
                    index++;
                }
            } else if (airTripType === 'Return') {
                // Return trip - 2 legs
                legs.push({
                    origin: searchParams.get('DepartureCode'),
                    destination: searchParams.get('ArrivalCode'),
                    departure_date: searchParams.get('DepartureDate')
                });
                legs.push({
                    origin: searchParams.get('ArrivalCode'),
                    destination: searchParams.get('DepartureCode'),
                    departure_date: searchParams.get('ReturnDate')
                });
            } else {
                // One-way trip - 1 leg
                legs.push({
                    origin: searchParams.get('DepartureCode'),
                    destination: searchParams.get('ArrivalCode'),
                    departure_date: searchParams.get('DepartureDate')
                });
            }

            // Unified params for all flight types
            const params = {
                "legs": legs,
                "adult": Number(searchParams.get('adult')) || 1,
                "child": Number(searchParams.get('child')) || 0,
                "infant": Number(searchParams.get('infant')) || 0,
                "CabinType": searchParams.get('CabinType') || "Y",
                "MaxStopsQuantity": "All",
                "PricingSourceType": "All",
                "IsRefundable": false,
                "RequestOptions": "fifty",
                "NearByAirports": false,
                "AirTripType": airTripType,
                "Target": "Test",
                "ConversationId": "395923377895446"
            };
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/search`,
                    {
                        method: 'POST',
                        // cache: 'no-store',
                        headers: {
                            'Content-Type': 'application/json',
                            // 'ngrok-skip-browser-warning': '69420',
                        },
                        body: JSON.stringify(params)
                    });
                const response = await res.json();
                setIsLoading(false)
                // console.log("Flight search response:", response);
                if (response.success) {
                    // Enrich flights so listing cards can group multi-city / return legs
                    // even when API omits search_criteria or uses alternate trip_type values
                    const flights = (response?.data?.flights || []).map((flight) => {
                        const existingCriteria = flight?.search_criteria || {}
                        const normalizedTripType =
                            airTripType === 'MultiCity'
                                ? 'multicity'
                                : airTripType === 'Return'
                                    ? 'return'
                                    : airTripType === 'OneWay'
                                        ? 'one_way'
                                        : flight?.trip_type

                        return {
                            ...flight,
                            trip_type: flight?.trip_type || normalizedTripType,
                            search_criteria: {
                                ...existingCriteria,
                                AirTripType:
                                    existingCriteria.AirTripType || airTripType || '',
                                legs:
                                    Array.isArray(existingCriteria.legs) &&
                                        existingCriteria.legs.length > 0
                                        ? existingCriteria.legs
                                        : legs,
                                adult: existingCriteria.adult ?? params.adult,
                                child: existingCriteria.child ?? params.child,
                                infant: existingCriteria.infant ?? params.infant,
                            },
                        }
                    })
                    setFlightList(flights)
                }
            } catch (error) {
                setIsLoading(false)
                console.log(error)
            }
        }
        getFlights();
    }, [searchParams]);

    useEffect(() => {
        const sentinel = filterSentinelRef.current;
        if (!sentinel || isLoading) return;

        let ticking = false;
        const updateStuck = () => {
            setIsFilterStuck(sentinel.getBoundingClientRect().bottom <= 0);
            ticking = false;
        };
        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateStuck);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        updateStuck();
        return () => window.removeEventListener('scroll', onScroll);
    }, [isLoading]);
    return (
        <div className="flight-listing-page">
            <PackageModeBanner serviceName="flight" />
            <FlightProvider flights={flightList} infiniteScroll>
                {/* Desktop: always FlightSearch (also in package mode — not GeneralPackages) */}
                <div className={`${heroStyles.hero} d-none d-md-block`}>
                    <div className={`container ${heroStyles.heroInner} ${inter.className}`}>
                        <h1 className={`${heroStyles.headline} ${outfit.className}`}>
                            Which exciting place is your next adventure
                            <span className={heroStyles.headlineAccent}> taking you?</span>
                        </h1>
                        <p className={heroStyles.subhead}>
                            Discover exclusive deals to match your ideal travel plans today!
                        </p>
                        <div className={heroStyles.searchShell}>
                            <FlightSearch variant="listing" />
                        </div>
                    </div>
                </div>

                {/* Mobile: compact summary + collapsible search */}
                <div className={`d-block d-md-none${showMobileSearch ? ' msb-mobile-search--open' : ''}`}>
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
                                    {searchParams.get('DepartureCode') || 'Search'}
                                    {searchParams.get('ArrivalCode') && (
                                        <span className='msb-title-secondary'> → {searchParams.get('ArrivalCode')}</span>
                                    )}
                                </div>
                                <div className='msb-subtitle'>
                                    {(() => {
                                        const tripType = searchParams.get('AirTripType');
                                        const label = tripType === 'Return' ? 'Return' : tripType === 'MultiCity' ? 'Multi-City' : 'One Way';
                                        return <span className='msb-subtitle-date' style={{ marginLeft: 0, marginRight: 6 }}>{label} ·</span>;
                                    })()}
                                    <MdPeople size={12} className='msb-subtitle-icon' />
                                    {(() => {
                                        const adults = Number(searchParams.get('adult')) || 0;
                                        const children = Number(searchParams.get('child')) || 0;
                                        const infants = Number(searchParams.get('infant')) || 0;
                                        const parts = [];
                                        if (adults) parts.push(`${adults} Adult${adults !== 1 ? 's' : ''}`);
                                        if (children) parts.push(`${children} Child${children !== 1 ? 'ren' : ''}`);
                                        if (infants) parts.push(`${infants} Infant${infants !== 1 ? 's' : ''}`);
                                        return parts.length ? parts.join(', ') : 'Tap to search';
                                    })()}
                                    {searchParams.get('DepartureDate') && (
                                        <span className='msb-subtitle-date'>· {moment(searchParams.get('DepartureDate')).format('DD MMM YYYY')}</span>
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
                        className={`msb-collapse${showMobileSearch ? ' msb-collapse--open' : ''}`}
                        style={{ maxHeight: showMobileSearch ? '5000px' : '0' }}
                    >
                        <div className='msb-collapse-inner'>
                            <FlightSearch variant="listing" onSearch={() => setShowMobileSearch(false)} />
                        </div>
                    </div>
                </div>
                {isLoading ? (
                    <div>
                        <FlightListingFullLoader />
                    </div>
                ) : (
                    <div className='container flight-listing-results'>
                        <div ref={filterSentinelRef} className="filter-scroll-sentinel d-md-none" aria-hidden="true" />
                        <MobileFilterPills setActiveDrawer={setActiveDrawer} isFilterStuck={isFilterStuck} />
                        <div className='row'>
                            {/* <div className='col-12 mb-4 d-none d-md-block'>
                                <ScrollList flightList={flightList} />
                            </div> */}
                            <div className="col-12">
                                <SortOption />
                            </div>

                            <div className='col-md-3 col-sm-12 col-12'>
                                <aside className={`d-none d-md-block ${filterStyles.sidebar}`}>
                                    <div className={filterStyles.header}>
                                        <h2 className={filterStyles.title}>Filter</h2>
                                    </div>
                                    <div className={filterStyles.body}>
                                        <Stops />
                                        <DepartureTimes />
                                        <JourneyDuration />
                                        <AirlineFilter />
                                        <LayoverTime />
                                        <FlightClass />
                                        <div className={filterStyles.footer}>
                                            <ResetFilter setActiveDrawer={setActiveDrawer} />
                                        </div>
                                    </div>
                                </aside>
                                <Drawer
                                    opened={activeDrawer === 'stops'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Filter"
                                    position="bottom"
                                    size="50%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <Stops />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>
                                <Drawer
                                    opened={activeDrawer === 'departureTimes'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Flight Times"
                                    position="bottom"
                                    size="90%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <DepartureTimes />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>
                                <Drawer
                                    opened={activeDrawer === 'duration'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Filter"
                                    position="bottom"
                                    size="50%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <JourneyDuration />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>
                                <Drawer
                                    opened={activeDrawer === 'airlines'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Filter"
                                    position="bottom"
                                    size="100%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <AirlineFilter />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>
                                <Drawer
                                    opened={activeDrawer === 'flightType'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Filter"
                                    position="bottom"
                                    size="50%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <FlightClass />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>
                                <Drawer
                                    opened={activeDrawer === 'layover'}
                                    onClose={() => setActiveDrawer(null)}
                                    title="Filter"
                                    position="bottom"
                                    size="50%"
                                    overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                                >
                                    <div>
                                        <LayoverTime />
                                    </div>
                                    <ResetFilter setActiveDrawer={setActiveDrawer} variant="drawer" />
                                    <div className={filterStyles.drawerFooter}>
                                        <button
                                            type="button"
                                            className={filterStyles.drawerDone}
                                            onClick={() => setActiveDrawer(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </Drawer>

                            </div>

                            <div className='col-md-9 col-sm-12 col-12'>
                                {/* Total Flight Count */}
                                <FlightResultCount />
                                <FlightCard />
                                <FlightListingPaginations />
                            </div>

                            {/* <TopContact/> */}
                        </div>
                    </div>
                )}
            </FlightProvider>
        </div>
    )
}
