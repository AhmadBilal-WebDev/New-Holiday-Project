'use client'
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdFilterListAlt, MdEdit, MdLocationOn, MdPeople, MdClose, MdVerifiedUser } from "react-icons/md";
import SearchBar from '@/components/Hotels/HotelListing/Filters/SearchBar';
import HotelCard from '@/components/Hotels/HotelListing/HotelCard';
import PriceRange from '@/components/Hotels/HotelListing/Filters/PriceRange';
import SortOption from '@/components/Hotels/HotelListing/Filters/SortOption';
import StarFilter from '@/components/Hotels/HotelListing/Filters/StarFilter';
import MealType from '@/components/Hotels/HotelListing/Filters/MealType';
import DistanceFilter from '@/components/Hotels/HotelListing/Filters/DistanceFilter';
import ResetFilter from "@/components/Hotels/HotelListing/Filters/ResetFilter";
import { HotelListProvider, useHotelList } from '@/components/Hotels/HotelListing/HotelListingContext';
import HotelListingPaginations from '@/components/Hotels/HotelListing/HotelListingPaginations';
import HotelMap, { HotelMapMobileTrigger } from '@/components/Hotels/HotelListing/HotelMap';
import { useSearchParams } from "next/navigation";
import HotelCardLoader from "@/components/Loader/HotelCardLoader";
import HotelModify from "@/components/Home/Search/ModifySearch/HotelModify";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LiaAngleDownSolid } from "react-icons/lia";
import { Drawer } from "@mantine/core";
import moment from "moment";
import { mergeHotels, streamHotelSearch } from "@/util/streamHotelSearch";
import { createHotelCoordinateFiller } from "@/util/fillHotelCoordinates";

function PropertiesFound({ hasResults, onOpenMap, locationLabel, checkIn, checkOut, travellers }) {
    const { totalHotels } = useHotelList();
    if (!hasResults) return null;

    const dateRange =
        checkIn && checkOut
            ? `${moment(checkIn).format('DD MMM YYYY')} → ${moment(checkOut).format('DD MMM YYYY')}`
            : null;
    const travellerLabel =
        travellers > 0
            ? `${travellers} traveller${travellers !== 1 ? 's' : ''}`
            : null;
    const summaryParts = [locationLabel, dateRange, travellerLabel].filter(Boolean);

    return (
        <div className="hotel-properties-found mt-md-3">
            <div className="hotel-properties-found__main">
                <h2 className="hotel-properties-found__title">
                    {totalHotels} {totalHotels === 1 ? 'property' : 'properties'} found
                </h2>
                {summaryParts.length > 0 && (
                    <p className="hotel-properties-found__summary">
                        {summaryParts.join(' · ')}
                    </p>
                )}
            </div>
            <div className="hotel-properties-found__aside">
                <span className="hotel-properties-found__vat">
                    <MdVerifiedUser size={16} aria-hidden="true" />
                    VAT &amp; taxes included
                </span>
                {onOpenMap && <HotelMapMobileTrigger onClick={onOpenMap} />}
            </div>
        </div>
    );
}

function MobileFilterPills({ setActiveDrawer }) {
    const { search, sort, star, meal, distances, priceRange, minPrice, maxPrice, showDistance } = useHotelList();
    const isNameApplied = Boolean(search?.trim());
    const isSortApplied = Boolean(sort && sort !== 'recommended');
    const isPriceApplied =
        Number(priceRange?.[0]) !== Number(minPrice) ||
        Number(priceRange?.[1]) !== Number(maxPrice);
    const isRatingApplied = star?.length > 0;
    const isMealApplied = meal?.length > 0;
    const isDistanceApplied = distances?.length > 0;

    return (
        <div className="filter-scroll d-flex gap-2 d-lg-none mb-1">
            <button
                type="button"
                onClick={() => setActiveDrawer('name')}
                className={`filter-pill${isNameApplied ? ' filter-pill--applied' : ''}`}
            >
                Name <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('sort')}
                className={`filter-pill${isSortApplied ? ' filter-pill--applied' : ''}`}
            >
                Sort By <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('price')}
                className={`filter-pill${isPriceApplied ? ' filter-pill--applied' : ''}`}
            >
                Price <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('rating')}
                className={`filter-pill${isRatingApplied ? ' filter-pill--applied' : ''}`}
            >
                Rating <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            <button
                type="button"
                onClick={() => setActiveDrawer('meal')}
                className={`filter-pill${isMealApplied ? ' filter-pill--applied' : ''}`}
            >
                Meal Type <span className="arrow"><LiaAngleDownSolid /></span>
            </button>

            {showDistance && (
                <button
                    type="button"
                    onClick={() => setActiveDrawer('distance')}
                    className={`filter-pill${isDistanceApplied ? ' filter-pill--applied' : ''}`}
                >
                    Distance <span className="arrow"><LiaAngleDownSolid /></span>
                </button>
            )}
        </div>
    );
}

export default function Page() {
    const [progress, setProgress] = useState(0);
    const [isDesktop, setIsDesktop] = useState(false);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [portalReady, setPortalReady] = useState(false);
    const nameFilterScrollYRef = useRef(0);
    const mapRef = useRef(null);
    const searchParams = useSearchParams();
    const city = searchParams.get("city");
    const countryCode = searchParams.get("code");
    const currency = searchParams.get("currency");
    const check_in = searchParams.get("checkIn");
    const check_out = searchParams.get("checkOut");
    const clientNationality = searchParams.get("nationality");
    const lat = searchParams.get("lat");
    const long = searchParams.get("lng");
    const location = searchParams.get("location");
    const country = searchParams.get("country");
    const place = searchParams.get("place");
    const refreshKey = searchParams.get("r") || "";
    const rooms = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('searchRoomSelection')) || [] : [];
    const totalAdults = rooms.reduce((acc, room) => acc + (room.adults || 0), 0);
    const totalChildren = rooms.reduce((acc, room) => acc + (room.children?.length || 0), 0);
    const queryParams = { city, countryCode, currency, check_in, check_out, lat, long, rooms, location, country, clientNationality, refreshKey };
    const queryClient = useQueryClient();
    const hotelQueryKey = ['hotels', queryParams];
    const { data: hotelsList = [], isFetching } = useQuery({
        queryKey: hotelQueryKey,
        queryFn: ({ signal }) => fetchHotelsFn({ queryKey: hotelQueryKey, signal, queryClient }),
        enabled: !!city && !!check_in && !!check_out,
        refetchOnWindowFocus: false,
        refetchOnMount: 'always',
        gcTime: 1000 * 60 * 5,
        staleTime: 0,
    });

    const hasHotels = hotelsList.length > 0;
    const showInitialLoader = isFetching && !hasHotels;
    const isStreaming = isFetching && hasHotels;

    // useEffect(() => {
    //     console.log('Hotel list:', hotelsList);
    // }, [hotelsList]);

    useEffect(() => {
        // Check screen size on mount and resize
        const checkScreenSize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        if (isFetching) {
            setProgress((prev) => (hasHotels ? Math.max(prev, 35) : 0));
            const interval = setInterval(() => {
                setProgress((prev) => {
                    const cap = hasHotels ? 95 : 90;
                    return prev < cap ? prev + (hasHotels ? 5 : 10) : prev;
                });
            }, 1500);
            return () => clearInterval(interval);
        }
        setProgress(100);
    }, [isFetching, hasHotels]);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    // iOS: full white lock so keyboard gaps never reveal the hotels page
    useEffect(() => {
        if (activeDrawer !== 'name') return;

        nameFilterScrollYRef.current = window.scrollY;
        const { body, documentElement: html } = document;
        const prev = {
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
            bodyHeight: body.style.height,
            bodyBg: body.style.backgroundColor,
            htmlOverflow: html.style.overflow,
            htmlBg: html.style.backgroundColor,
            htmlHeight: html.style.height,
        };

        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${nameFilterScrollYRef.current}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.backgroundColor = '#ffffff';
        html.style.overflow = 'hidden';
        html.style.backgroundColor = '#ffffff';
        html.style.height = '100%';

        const snap = () => window.scrollTo(0, 0);
        snap();
        const vv = window.visualViewport;
        vv?.addEventListener('scroll', snap);
        window.addEventListener('focusin', snap);

        return () => {
            vv?.removeEventListener('scroll', snap);
            window.removeEventListener('focusin', snap);
            body.style.overflow = prev.bodyOverflow;
            body.style.position = prev.bodyPosition;
            body.style.top = prev.bodyTop;
            body.style.left = prev.bodyLeft;
            body.style.right = prev.bodyRight;
            body.style.width = prev.bodyWidth;
            body.style.height = prev.bodyHeight;
            body.style.backgroundColor = prev.bodyBg;
            html.style.overflow = prev.htmlOverflow;
            html.style.backgroundColor = prev.htmlBg;
            html.style.height = prev.htmlHeight;
            window.scrollTo(0, nameFilterScrollYRef.current);
        };
    }, [activeDrawer]);

    return (
        <div>
            <HotelListProvider hotels={hotelsList} place={place} city={city} location={location}>
                {/* Desktop: always visible */}
                <div className="hotel-search-modify hotel-search-modify--hero d-none d-md-block">
                    <HotelModify />
                </div>

                {/* Mobile: compact summary + collapsible search */}
                <div className='d-block d-md-none'>
                    <div className='msb-bar'>
                        <div
                            className='msb-bar__inner'
                            onClick={() => setShowMobileSearch(prev => !prev)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setShowMobileSearch(prev => !prev);
                                }
                            }}
                        >
                            <div className='msb-icon' aria-hidden="true">
                                <MdLocationOn size={20} />
                            </div>

                            <div className='msb-info'>
                                <div className='msb-title'>
                                    {location || city || 'Search Hotels'}
                                </div>
                                <div className='msb-subtitle'>
                                    <MdPeople size={12} className='msb-subtitle-icon' />
                                    {totalAdults > 0
                                        ? `${totalAdults} Adult${totalAdults !== 1 ? 's' : ''}${totalChildren > 0 ? `, ${totalChildren} Child${totalChildren !== 1 ? 'ren' : ''}` : ''}`
                                        : 'Tap to search'}
                                    {check_in && check_out && (
                                        <span className='msb-subtitle-date'>
                                            · {moment(check_in).format('DD MMM')} → {moment(check_out).format('DD MMM YYYY')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setShowMobileSearch(prev => !prev); }}
                                className='msb-modify-btn'
                            >
                                <MdEdit size={14} />
                                {showMobileSearch ? 'Close' : 'Modify'}
                            </button>
                        </div>
                    </div>

                    {/* Smooth collapsible search panel */}
                    <div
                        className='msb-collapse'
                        style={{ maxHeight: showMobileSearch ? '1200px' : '0' }}
                    >
                        <div className='msb-collapse-inner'>
                            <HotelModify onSearch={() => setShowMobileSearch(false)} />
                        </div>
                    </div>
                </div>

                <div className='container mt-2 mb-5'>
                    <div className='row'>
                        <div className='col-lg-3 col-sm-12 col-12'>
                            {/* Mobile: Filter Pills */}
                            <MobileFilterPills setActiveDrawer={setActiveDrawer} />

                            {/* Desktop: Sidebar Filters */}
                            <div className='filter_box hotel-filter-sidebar rounded-5 mt-md-3 d-none d-lg-block'>
                                <div className="hotel-filter-sidebar__header">
                                    <p className="hotel-filter-sidebar__title">Filters</p>
                                    <MdFilterListAlt className="hotel-filter-sidebar__icon" size={20} />
                                </div>
                                <div className="hotel-filter-sidebar__section">
                                    <SearchBar />
                                </div>
                                <div className="hotel-filter-sidebar__section">
                                    <SortOption />
                                </div>
                                <div className="hotel-filter-sidebar__section">
                                    <PriceRange />
                                </div>
                                <div className="hotel-filter-sidebar__section">
                                    <StarFilter />
                                </div>
                                <div className="hotel-filter-sidebar__section">
                                    <MealType />
                                </div>
                                <DistanceFilter wrapSection />
                                <div className="hotel-filter-sidebar__footer">
                                    <ResetFilter setActiveDrawer={setActiveDrawer} />
                                </div>
                            </div>

                            {/* Mobile: Name filter — full-screen white sheet (iOS keyboard safe) */}
                            {portalReady && activeDrawer === 'name' && createPortal(
                                <>
                                    <div className="hotel-name-filter-mask" aria-hidden="true" />
                                    <div
                                        className="hotel-name-filter-sheet"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Filter"
                                    >
                                        <div className="hotel-name-filter-sheet__header">
                                            <span className="hotel-name-filter-sheet__title">Filter</span>
                                            <button
                                                type="button"
                                                className="hotel-name-filter-sheet__close"
                                                aria-label="Close"
                                                onClick={() => setActiveDrawer(null)}
                                            >
                                                <MdClose size={22} />
                                            </button>
                                        </div>
                                        <div className="hotel-name-filter-sheet__body">
                                            <div className="mb-2">
                                                <SearchBar />
                                            </div>
                                            <ResetFilter setActiveDrawer={setActiveDrawer} />
                                            <div className="border-top pt-3 mt-3">
                                                <button
                                                    type="button"
                                                    className="hotel-filter-reset__btn"
                                                    onClick={() => setActiveDrawer(null)}
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>,
                                document.body
                            )}

                            <Drawer
                                opened={activeDrawer === 'sort'}
                                onClose={() => setActiveDrawer(null)}
                                title="Filter"
                                position="bottom"
                                size="35%"
                                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                            >
                                <div className="mb-2">
                                    <SortOption />
                                </div>
                                <ResetFilter setActiveDrawer={setActiveDrawer} />
                                <div className="border-top pt-3 mt-3">
                                    <button
                                        type="button"
                                        className="hotel-filter-reset__btn"
                                        onClick={() => setActiveDrawer(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Drawer>

                            <Drawer
                                opened={activeDrawer === 'price'}
                                onClose={() => setActiveDrawer(null)}
                                title="Filter"
                                position="bottom"
                                size="44%"
                                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                            >
                                <div className="mb-2">
                                    <PriceRange />
                                </div>
                                <ResetFilter setActiveDrawer={setActiveDrawer} />
                                <div className="border-top pt-3 mt-3">
                                    <button
                                        type="button"
                                        className="hotel-filter-reset__btn"
                                        onClick={() => setActiveDrawer(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Drawer>

                            <Drawer
                                opened={activeDrawer === 'rating'}
                                onClose={() => setActiveDrawer(null)}
                                title="Filter"
                                position="bottom"
                                size="50%"
                                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                            >
                                <div className="mb-2">
                                    <StarFilter />
                                </div>
                                <ResetFilter setActiveDrawer={setActiveDrawer} />
                                <div className="border-top pt-3 mt-3">
                                    <button
                                        type="button"
                                        className="hotel-filter-reset__btn"
                                        onClick={() => setActiveDrawer(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Drawer>

                            <Drawer
                                opened={activeDrawer === 'meal'}
                                onClose={() => setActiveDrawer(null)}
                                title="Filter"
                                position="bottom"
                                size="50%"
                                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                            >
                                <div className="mb-2">
                                    <MealType />
                                </div>
                                <ResetFilter setActiveDrawer={setActiveDrawer} />
                                <div className="border-top pt-3 mt-3">
                                    <button
                                        type="button"
                                        className="hotel-filter-reset__btn"
                                        onClick={() => setActiveDrawer(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Drawer>

                            <Drawer
                                opened={activeDrawer === 'distance'}
                                onClose={() => setActiveDrawer(null)}
                                title="Filter"
                                position="bottom"
                                size="45%"
                                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                            >
                                <div className="mb-2">
                                    <DistanceFilter />
                                </div>
                                <ResetFilter setActiveDrawer={setActiveDrawer} />
                                <div className="border-top pt-3 mt-3">
                                    <button
                                        type="button"
                                        className="hotel-filter-reset__btn"
                                        onClick={() => setActiveDrawer(null)}
                                    >
                                        Done
                                    </button>
                                </div>
                            </Drawer>
                        </div>

                        <div className='col-lg-9 col-sm-12 col-12'>
                            {isFetching && (() => {
                                const dest = location || city || place || 'your destination';
                                const liveMsg = isStreaming
                                    ? 'Pulling extra matches to refine your list…'
                                    : progress < 25
                                        ? 'Mapping nearby stays…'
                                        : progress < 55
                                            ? 'Comparing live room rates…'
                                            : progress < 85
                                                ? 'Sorting the strongest deals…'
                                                : 'Almost ready to show results…';
                                return (
                                    <div className="hsl mb-3" role="status" aria-live="polite">
                                        <div className="hsl__stage">
                                            <div className="hsl__radar" aria-hidden="true">
                                                <span className="hsl__orbit hsl__orbit--a" />
                                                <span className="hsl__orbit hsl__orbit--b" />
                                                <span className="hsl__orbit hsl__orbit--c" />
                                                <span className="hsl__scan" />
                                                <span className="hsl__blip hsl__blip--1" />
                                                <span className="hsl__blip hsl__blip--2" />
                                                <span className="hsl__blip hsl__blip--3" />
                                                <span className="hsl__blip hsl__blip--4" />
                                                <div className="hsl__pin">
                                                    <MdLocationOn size={22} />
                                                </div>
                                            </div>

                                            <div className="hsl__story">
                                                <span className="hsl__eyebrow">
                                                    {isStreaming ? 'Expanding results' : 'Live hotel search'}
                                                </span>
                                                <h3 className="hsl__headline">
                                                    Scanning stays in <em>{dest}</em>
                                                </h3>
                                                <p className="hsl__live">{liveMsg}</p>

                                                {/* <div className="hsl__deck" aria-hidden="true">
                                                    <div className={`hsl__mini ${progress >= 15 ? 'hsl__mini--on' : ''}`}>
                                                        <span className="hsl__mini-img" />
                                                        <span className="hsl__mini-line" />
                                                        <span className="hsl__mini-line hsl__mini-line--short" />
                                                    </div>
                                                    <div className={`hsl__mini ${progress >= 45 ? 'hsl__mini--on' : ''}`}>
                                                        <span className="hsl__mini-img" />
                                                        <span className="hsl__mini-line" />
                                                        <span className="hsl__mini-line hsl__mini-line--short" />
                                                    </div>
                                                    <div className={`hsl__mini ${progress >= 75 ? 'hsl__mini--on' : ''}`}>
                                                        <span className="hsl__mini-img" />
                                                        <span className="hsl__mini-line" />
                                                        <span className="hsl__mini-line hsl__mini-line--short" />
                                                    </div>
                                                </div> */}
                                            </div>

                                            {/* <div
                                                className="hsl__score"
                                                role="progressbar"
                                                aria-valuenow={progress}
                                                aria-valuemin="0"
                                                aria-valuemax="100"
                                                aria-label="Search progress"
                                            >
                                                <strong>{progress}%</strong>
                                                <span>complete</span>
                                            </div> */}
                                        </div>
                                    </div>
                                );
                            })()}
                            {showInitialLoader && <HotelCardLoader />}
                            <PropertiesFound
                                hasResults={hasHotels}
                                onOpenMap={hasHotels ? () => mapRef.current?.openMap() : undefined}
                                locationLabel={location || city || place}
                                checkIn={check_in}
                                checkOut={check_out}
                                travellers={totalAdults + totalChildren}
                            />
                            {hasHotels && (
                                <HotelMap
                                    ref={mapRef}
                                    hotels={hotelsList}
                                    lat={lat}
                                    long={long}
                                    location={location || city}
                                />
                            )}
                            <HotelCard isLoading={showInitialLoader} />
                            <HotelListingPaginations />
                        </div>
                    </div>
                </div>
            </HotelListProvider>
        </div>
    )
}

async function fetchHotelsFn({ queryKey, signal, queryClient }) {
    const [, params] = queryKey;
    const {
        city,
        countryCode,
        currency,
        check_in,
        check_out,
        lat,
        long,
        rooms,
        location,
        country,
        clientNationality,
    } = params;

    const searchData = {
        city,
        countryCode,
        currency,
        check_in,
        check_out,
        lat,
        long,
        location,
        country,
        clientNationality,
    };
    localStorage.setItem('HotelSearchData', JSON.stringify(searchData));

    // Clear previous results so UI starts fresh for this search
    queryClient.setQueryData(queryKey, []);

    const request = {
        checkIn: check_in,
        checkOut: check_out,
        destination: {
            city,
            latitude: lat,
            longitude: long,
            countryCode,
            clientNationality,
        },
        currency,
        rooms,
    };

    // Missing lat/lng → Places geocode in background; listing is not blocked
    const fillMissingCoordinates = createHotelCoordinateFiller({
        queryClient,
        queryKey,
        city,
        country,
        signal,
    });

    try {
        const hotels = await streamHotelSearch({
            request,
            signal,
            onProvider: ({ hotels: chunk }) => {
                if (!chunk?.length) return;
                queryClient.setQueryData(queryKey, (prev = []) => mergeHotels(prev, chunk));
                fillMissingCoordinates(chunk);
            },
        });
        return hotels;
    } catch (err) {
        if (err?.name === 'AbortError') throw err;
        throw new Error(err?.message || 'Failed to fetch hotels');
    }
}
