"use client";

import { GoogleMap, LoadScriptNext, Marker } from "@react-google-maps/api";
import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef, useCallback, memo } from "react";
import { Modal } from "@mantine/core";
import { FaStar, FaCheck } from "react-icons/fa";
import { MdMap, MdClose } from "react-icons/md";
import { IoLocationSharp } from "react-icons/io5";
import { LiaAngleDownSolid, LiaAngleUpSolid } from "react-icons/lia";
import { ConvertPrice } from "@/components/Currency/ConvertPrice";
import Link from "next/link";
import Image from "next/image";
import { useCurrency } from "@/util/currency";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useHotelList } from "./HotelListingContext";
import PriceRange from "./Filters/PriceRange";
import StarFilter from "./Filters/StarFilter";
import MealType from "./Filters/MealType";
import SortOption from "./Filters/SortOption";
import DistanceFilter from "./Filters/DistanceFilter";
import SearchBar from "./Filters/SearchBar";
import styles from "./HotelMap.module.css";

const BRAND_PRIMARY = "#E7247A";
const PRICE_MARKER_PATH =
    "M0,0 h80 a5,5 0 0 1 5,5 v25 a5,5 0 0 1 -5,5 h-35 l-5,8 l-5,-8 h-35 a5,5 0 0 1 -5,-5 v-25 a5,5 0 0 1 5,-5 z";
/** Soft cap for individual price pins in the viewport before grid-clustering kicks in */
const MAX_PRICE_MARKERS = 80;
/** Below this zoom, prefer clustered count pins over dense price tags */
const CLUSTER_ZOOM = 13;

const hotelKey = (hotel) =>
    hotel ? `${hotel.id}-${hotel.provider}` : '';

const getGridCellSize = (zoom) => {
    if (zoom <= 10) return 0.1;
    if (zoom <= 11) return 0.05;
    if (zoom <= 12) return 0.025;
    if (zoom <= 13) return 0.012;
    if (zoom <= 14) return 0.006;
    return 0.003;
};

/** Stable icon refs — recreating Symbol objects on every hover makes all pins flicker */
let cachedPriceIconActive = null;
let cachedPriceIconInactive = null;
let cachedClusterIcon = null;

const getPriceMarkerIcon = (isActive) => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    if (isActive) {
        if (!cachedPriceIconActive) {
            cachedPriceIconActive = {
                path: PRICE_MARKER_PATH,
                fillColor: BRAND_PRIMARY,
                fillOpacity: 1,
                strokeWeight: 0,
                strokeColor: BRAND_PRIMARY,
                scale: 1.08,
                anchor: new window.google.maps.Point(40, 43),
                labelOrigin: new window.google.maps.Point(40, 18),
            };
        }
        return cachedPriceIconActive;
    }
    if (!cachedPriceIconInactive) {
        cachedPriceIconInactive = {
            path: PRICE_MARKER_PATH,
            fillColor: '#ffffff',
            fillOpacity: 1,
            strokeWeight: 1.5,
            strokeColor: BRAND_PRIMARY,
            scale: 1,
            anchor: new window.google.maps.Point(40, 43),
            labelOrigin: new window.google.maps.Point(40, 18),
        };
    }
    return cachedPriceIconInactive;
};

const getClusterMarkerIcon = () => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    if (!cachedClusterIcon) {
        cachedClusterIcon = {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 24,
            fillColor: BRAND_PRIMARY,
            fillOpacity: 0.95,
            strokeWeight: 3,
            strokeColor: '#ffffff',
            labelOrigin: new window.google.maps.Point(0, 0),
        };
    }
    return cachedClusterIcon;
};

/**
 * Keep only hotels in (padded) viewport, then grid-cluster when zoomed out.
 * When zoomed in but still dense, cap to cheapest price pins (plus selection).
 * Intentionally ignores hover — rebuilding the marker set on hover remounts
 * Google overlays and makes every pin flicker.
 */
const buildViewportMarkers = (mapHotels, bounds, zoom, selectedKey) => {
    let candidates = mapHotels;

    if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latPad = Math.max((ne.lat() - sw.lat()) * 0.15, 0.002);
        const lngPad = Math.max((ne.lng() - sw.lng()) * 0.15, 0.002);
        const minLat = sw.lat() - latPad;
        const maxLat = ne.lat() + latPad;
        const minLng = sw.lng() - lngPad;
        const maxLng = ne.lng() + lngPad;

        candidates = mapHotels.filter(({ position }) =>
            position.lat >= minLat &&
            position.lat <= maxLat &&
            position.lng >= minLng &&
            position.lng <= maxLng
        );
    } else {
        // Before first idle, avoid mounting hundreds of markers
        candidates = mapHotels.slice(0, MAX_PRICE_MARKERS);
    }

    const pinned = [];
    if (selectedKey) {
        for (const m of mapHotels) {
            if (m.key === selectedKey) {
                pinned.push({ type: 'hotel', ...m });
                break;
            }
        }
    }

    // Zoomed out → count clusters (Booking/Airbnb-style)
    if (zoom < CLUSTER_ZOOM) {
        const cell = getGridCellSize(zoom);
        const grid = new Map();

        for (const m of candidates) {
            if (selectedKey && m.key === selectedKey) continue;
            const gx = Math.floor(m.position.lat / cell);
            const gy = Math.floor(m.position.lng / cell);
            const gkey = `${gx}:${gy}`;
            let group = grid.get(gkey);
            if (!group) {
                group = [];
                grid.set(gkey, group);
            }
            group.push(m);
        }

        const result = [...pinned];

        for (const group of grid.values()) {
            if (group.length === 1) {
                result.push({ type: 'hotel', ...group[0] });
                continue;
            }

            let lat = 0;
            let lng = 0;
            for (const m of group) {
                lat += m.position.lat;
                lng += m.position.lng;
            }
            result.push({
                type: 'cluster',
                id: `cluster-${group[0].key}-${group.length}`,
                count: group.length,
                position: {
                    lat: lat / group.length,
                    lng: lng / group.length,
                },
            });
        }

        return result;
    }

    // Zoomed in → individual price tags, capped for performance
    const seen = new Set(pinned.map((p) => p.key));
    let rest = candidates.filter((m) => !seen.has(m.key));

    if (rest.length > MAX_PRICE_MARKERS - pinned.length) {
        rest = [...rest]
            .sort((a, b) => {
                const pa = Number(a.hotel?.metadata?.min_price) || 0;
                const pb = Number(b.hotel?.metadata?.min_price) || 0;
                return pa - pb;
            })
            .slice(0, Math.max(0, MAX_PRICE_MARKERS - pinned.length));
    }

    return [
        ...pinned,
        ...rest.map((m) => ({ type: 'hotel', ...m })),
    ];
};

const encodeProvider = (str) => {
    return [...str].map(c => (c.charCodeAt(0) + 3).toString(36)).join('');
};

const getProviderCode = (provider) => {
    if (!provider) return '';
    return encodeProvider(provider).toLowerCase();
};

const makingSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

const formatPrice = (price) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const normalizeImageSrc = (raw) => {
    if (!raw) return '/images/hotelloadimg.jpg';
    if (raw.startsWith('data:') || raw.startsWith('/')) return raw;
    // CSP img-src allows https only — upgrade http:// and protocol-relative URLs
    if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
    if (raw.startsWith('//')) return 'https:' + raw;
    return 'https://' + raw.replace(/^\/+/, '');
};

const hasFreeCancellation = (hotel) => {
    if (!hotel?.rooms?.length) return false;

    const now = moment.utc();

    for (const room of hotel.rooms) {
        for (const rate of room?.rates || []) {
            const policies = rate?.cancellation_policies;
            if (!Array.isArray(policies) || policies.length === 0) continue;

            const allDatesInFuture = policies.every(
                (policy) => policy?.from && moment.utc(policy.from).isAfter(now)
            );
            if (allDatesInFuture) return true;
        }
    }

    return false;
};

const containerStyle = { width: "100%", height: "100%" };

const FILTER_KEYS = {
    budget: 'budget',
    stars: 'stars',
    meal: 'meal',
    name: 'name',
    sort: 'sort',
    distance: 'distance',
};

function MapFilterBar({ onHideMap }) {
    const {
        search,
        sort,
        star,
        meal,
        distances,
        setDistances,
        priceRange,
        minPrice,
        maxPrice,
        setSearch,
        setStar,
        setMeal,
        setSort,
        resetPriceRange,
        showDistance,
    } = useHotelList();
    const [openKey, setOpenKey] = useState(null);
    const barRef = useRef(null);

    const isBudgetApplied =
        Number(priceRange?.[0]) !== Number(minPrice) ||
        Number(priceRange?.[1]) !== Number(maxPrice);
    const isStarsApplied = star?.length > 0;
    const isMealApplied = meal?.length > 0;
    const isNameApplied = Boolean(search?.trim());
    const isSortApplied = Boolean(sort && sort !== 'recommended');
    const isDistanceApplied = distances?.length > 0;

    const toggle = (key) => {
        setOpenKey((prev) => (prev === key ? null : key));
    };

    const clearFilter = (key) => {
        if (key === FILTER_KEYS.budget) resetPriceRange();
        if (key === FILTER_KEYS.stars) setStar([]);
        if (key === FILTER_KEYS.meal) setMeal([]);
        if (key === FILTER_KEYS.name) setSearch(null);
        if (key === FILTER_KEYS.sort) setSort('recommended');
        if (key === FILTER_KEYS.distance) setDistances([]);
        setOpenKey(null);
    };

    useEffect(() => {
        if (!openKey) return;
        const onPointerDown = (e) => {
            if (barRef.current && !barRef.current.contains(e.target)) {
                setOpenKey(null);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpenKey(null);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openKey]);

    const pills = [
        {
            key: FILTER_KEYS.budget,
            label: 'Budget',
            applied: isBudgetApplied,
            content: <PriceRange />,
            wide: true,
        },
        {
            key: FILTER_KEYS.stars,
            label: 'Stars',
            applied: isStarsApplied,
            content: <StarFilter />,
        },
        {
            key: FILTER_KEYS.meal,
            label: 'Meal plan',
            applied: isMealApplied,
            content: <MealType />,
        },
        {
            key: FILTER_KEYS.name,
            label: 'Name',
            applied: isNameApplied,
            content: <SearchBar />,
            wide: true,
        },
        {
            key: FILTER_KEYS.sort,
            label: 'Sort',
            applied: isSortApplied,
            content: <SortOption />,
        },
        ...(showDistance
            ? [{
                key: FILTER_KEYS.distance,
                label: 'Distance',
                applied: isDistanceApplied,
                content: <DistanceFilter />,
            }]
            : []),
    ];

    return (
        <div className={`${styles.filterBar} ${openKey ? styles.filterBarOpen : ''}`} ref={barRef}>
            <div className={styles.filterBarInner}>
                <button
                    type="button"
                    className={styles.filterPill}
                    onClick={onHideMap}
                >
                    <MdMap size={15} />
                    Hide map
                </button>

                <div className={styles.filterDivider} aria-hidden="true" />

                {pills.map((pill) => {
                    const isOpen = openKey === pill.key;
                    return (
                        <div key={pill.key} className={styles.filterPillWrap}>
                            <button
                                type="button"
                                className={`${styles.filterPill} ${pill.applied ? styles.filterPillApplied : ''} ${isOpen ? styles.filterPillOpen : ''}`}
                                onClick={() => toggle(pill.key)}
                                aria-expanded={isOpen}
                            >
                                {pill.label}
                                {isOpen ? <LiaAngleUpSolid size={12} /> : <LiaAngleDownSolid size={12} />}
                            </button>
                            {isOpen && (
                                <div
                                    className={`${styles.filterDropdown} ${pill.wide ? styles.filterDropdownWide : ''}`}
                                    role="dialog"
                                    aria-label={pill.label}
                                >
                                    <div className={styles.filterDropdownBody}>
                                        {pill.content}
                                    </div>
                                    <div className={styles.filterDropdownActions}>
                                        <button
                                            type="button"
                                            className={styles.filterClearBtn}
                                            onClick={() => clearFilter(pill.key)}
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.filterApplyBtn}
                                            onClick={() => setOpenKey(null)}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function HotelMapMobileTrigger({ onClick }) {
    return (
        <button
            type="button"
            className={`d-md-none ${styles.mobileMapLink}`}
            onClick={onClick}
        >
            <MdMap size={16} />
            Map View
        </button>
    );
}

function useHotelBasicDetail(item, check_in, check_out) {
    return useQuery({
        queryKey: ['hotelDetail', item.id, item.provider, check_in, check_out],
        queryFn: async () => {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: item.provider,
                        hotelId: item.id,
                        checkIn: check_in,
                        checkOut: check_out,
                    }),
                }
            );
            const res = await response.json();
            return {
                images:
                    Array.isArray(res.data.main_images) && res.data.main_images.length > 0
                        ? res.data.main_images[0].url || ''
                        : '',
                address: res.data.address || '',
                facilities: res.data.facilities || [],
            };
        },
        enabled: !!item?.id && !!check_in && !!check_out,
        cacheTime: 20 * 60 * 1000,
        staleTime: 20 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });
}

function MapListCard({ hotel, isSelected, isHovered, onSelect, onHover, check_in, check_out, nights, currency, rates }) {
    const [imgFallback, setImgFallback] = useState(false);
    const cardRef = useRef(null);
    const { data: detail } = useHotelBasicDetail(hotel, check_in, check_out);
    const { showDistance, distanceCache, distanceLandmarkLabel } = useHotelList();
    const dist = showDistance ? distanceCache?.[hotel?.id] : null;

    const { newcurrency, newprice } = ConvertPrice(
        hotel.metadata?.min_price,
        hotel.metadata?.currency,
        currency,
        rates
    );

    const totalPrice = Number(newprice);
    const perNightPrice = Number.isFinite(totalPrice) && nights > 0
        ? totalPrice / nights
        : totalPrice;

    const starCount = hotel?.metadata?.stars && !isNaN(hotel.metadata.stars)
        ? Math.round(Number(hotel.metadata.stars))
        : 0;
    const freeCancel = hasFreeCancellation(hotel);

    useEffect(() => {
        if (isSelected && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected]);

    return (
        <article
            ref={cardRef}
            className={`${styles.listCard} ${isSelected ? styles.listCardSelected : ''} ${isHovered && !isSelected ? styles.listCardHovered : ''}`}
            onClick={() => onSelect(hotel)}
            onMouseEnter={() => onHover?.(hotel)}
            onMouseLeave={() => onHover?.(null)}
        >
            <div className={styles.listCardMedia}>
                <Image
                    src={
                        imgFallback
                            ? '/images/hotelloadimg.jpg'
                            : normalizeImageSrc(detail?.images || '/images/hotelloadimg.jpg')
                    }
                    width={200}
                    height={160}
                    className={styles.listCardImg}
                    alt={hotel.name}
                    quality={80}
                    onError={() => setImgFallback(true)}
                    unoptimized={true}
                />
                {hotel?.provider === 'custom' && (
                    <span className={styles.listCardBadge}>AL</span>
                )}
                <div className={styles.listCardStars}>
                    {starCount > 0 ? (
                        Array(starCount).fill(0).map((_, i) => (
                            <FaStar key={i} className={styles.listCardStar} />
                        ))
                    ) : (
                        <span className={styles.listCardNoRating}>No Rating</span>
                    )}
                </div>
            </div>

            <div className={styles.listCardBody}>
                <div className={styles.listCardTitleRow}>
                    <h4 className={styles.listCardTitle}>{hotel.name}</h4>
                    {showDistance && (
                        dist?.loading ? (
                            <span className={`${styles.listCardDistance} ${styles.listCardDistanceLoading}`} aria-hidden="true" />
                        ) : dist && !dist.error && dist.distance ? (
                            <span className={styles.listCardDistance}>{dist.distance} {distanceLandmarkLabel}</span>
                        ) : null
                    )}
                </div>

                <p className={styles.listCardLocation}>
                    <IoLocationSharp size={12} />
                    <span>{detail?.address || 'Address loading…'}</span>
                </p>

                {freeCancel && (
                    <span className={styles.listCardCancel}>
                        <FaCheck size={10} /> Free Cancellation
                    </span>
                )}

                <div className={styles.listCardBottom}>
                    <div className={styles.listCardPricing}>
                        <span className={styles.listCardPrice}>
                            {newcurrency} {formatPrice(totalPrice)}
                        </span>
                        <span className={styles.listCardPerNight}>
                            {newcurrency} {formatPrice(perNightPrice)} / night
                        </span>
                        <span className={styles.listCardNights}>
                            {nights} {nights === 1 ? 'night' : 'nights'} · incl. taxes
                        </span>
                    </div>

                    <Link
                        target="_blank"
                        className={styles.listCardCta}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (hotel?.rooms) {
                                localStorage.setItem('roomSelection', JSON.stringify(hotel.rooms));
                            }
                        }}
                        href={`/hotels/${makingSlug(hotel.name)}?id=${hotel.id}&code=${getProviderCode(hotel.provider)}`}
                    >
                        View deal
                    </Link>
                </div>
            </div>
        </article>
    );
}

function MapFloatingCard({ hotel, onClose, check_in, check_out, nights, currency, rates }) {
    const [imgFallback, setImgFallback] = useState(false);
    const { data: detail } = useHotelBasicDetail(hotel, check_in, check_out);
    const { showDistance, distanceCache, distanceLandmarkLabel } = useHotelList();
    const dist = showDistance ? distanceCache?.[hotel?.id] : null;

    useEffect(() => {
        setImgFallback(false);
    }, [hotel.id, hotel.provider]);

    const { newcurrency, newprice } = ConvertPrice(
        hotel.metadata?.min_price,
        hotel.metadata?.currency,
        currency,
        rates
    );

    const totalPrice = Number(newprice);
    const perNightPrice = Number.isFinite(totalPrice) && nights > 0
        ? totalPrice / nights
        : totalPrice;

    const starCount = hotel?.metadata?.stars && !isNaN(hotel.metadata.stars)
        ? Math.round(Number(hotel.metadata.stars))
        : 0;

    const freeCancel = hasFreeCancellation(hotel);

    const shortLocation = detail?.address
        ? detail.address.split(',').slice(0, 2).join(',').trim()
        : '';

    return (
        <div className={styles.floatingCard} role="dialog" aria-label={hotel.name}>
            <div className={styles.floatingCardMedia}>
                <Image
                    src={
                        imgFallback
                            ? '/images/hotelloadimg.jpg'
                            : normalizeImageSrc(detail?.images || '/images/hotelloadimg.jpg')
                    }
                    width={120}
                    height={110}
                    className={styles.floatingCardImg}
                    alt={hotel.name}
                    quality={80}
                    onError={() => setImgFallback(true)}
                    unoptimized={true}
                />
            </div>

            <div className={styles.floatingCardBody}>
                <div className={styles.floatingCardTop}>
                    <h4 className={styles.floatingCardTitle}>{hotel.name}</h4>
                    <button
                        type="button"
                        className={styles.floatingCardClose}
                        onClick={onClose}
                        aria-label="Close hotel preview"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                <div className={styles.floatingCardMeta}>
                    {starCount > 0 && (
                        <span className={styles.floatingCardStars}>
                            {Array(starCount).fill(0).map((_, i) => (
                                <FaStar key={i} className={styles.floatingCardStar} />
                            ))}
                        </span>
                    )}
                    {shortLocation && (
                        <span className={styles.floatingCardLocation}>{shortLocation}</span>
                    )}
                </div>

                {showDistance && (
                    dist?.loading ? (
                        <span className={`${styles.floatingCardDistance} ${styles.floatingCardDistanceLoading}`} aria-hidden="true" />
                    ) : dist && !dist.error && dist.distance ? (
                        <span className={styles.floatingCardDistance}>{dist.distance} {distanceLandmarkLabel}</span>
                    ) : null
                )}

                <div className={styles.floatingCardBottom}>
                    <div className={styles.floatingCardLeft}>
                        {freeCancel && (
                            <span className={styles.floatingCardCancel}>
                                <FaCheck size={10} /> Free Cancellation
                            </span>
                        )}
                        <Link
                            target="_blank"
                            className={styles.floatingCardCta}
                            onClick={() => {
                                if (hotel?.rooms) {
                                    localStorage.setItem('roomSelection', JSON.stringify(hotel.rooms));
                                }
                            }}
                            href={`/hotels/${makingSlug(hotel.name)}?id=${hotel.id}&code=${getProviderCode(hotel.provider)}`}
                        >
                            View deal
                        </Link>
                    </div>
                    <div className={styles.floatingCardPricing}>
                        <span className={styles.floatingCardPrice}>
                            {newcurrency} {formatPrice(totalPrice)}
                        </span>
                        <span className={styles.floatingCardPerNight}>
                            {newcurrency} {formatPrice(perNightPrice)} / night
                        </span>
                        <span className={styles.floatingCardTaxes}>
                            {nights} {nights === 1 ? 'night' : 'nights'} · incl. taxes
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const HotelPriceMarker = memo(function HotelPriceMarker({
    position,
    labelText,
    isActive,
    zIndex,
    hotel,
    onSelect,
    onHover,
}) {
    const icon = getPriceMarkerIcon(isActive);
    const labelColor = isActive ? '#fff' : BRAND_PRIMARY;

    return (
        <Marker
            position={position}
            onClick={() => onSelect(hotel)}
            onMouseOver={() => onHover(hotel)}
            onMouseOut={() => onHover(null)}
            icon={icon}
            zIndex={zIndex}
            label={{
                text: labelText,
                color: labelColor,
                fontSize: '11px',
                fontWeight: 'bold',
            }}
        />
    );
}, (prev, next) =>
    prev.isActive === next.isActive &&
    prev.zIndex === next.zIndex &&
    prev.labelText === next.labelText &&
    prev.hotel === next.hotel &&
    prev.position.lat === next.position.lat &&
    prev.position.lng === next.position.lng
);

const HotelClusterMarker = memo(function HotelClusterMarker({
    position,
    count,
    onZoomIn,
}) {
    const icon = useMemo(() => getClusterMarkerIcon(), []);
    const label = useMemo(
        () => ({
            text: String(count),
            color: '#ffffff',
            fontSize: count > 99 ? '11px' : '13px',
            fontWeight: 'bold',
        }),
        [count]
    );

    return (
        <Marker
            position={position}
            onClick={() => onZoomIn(position)}
            icon={icon}
            zIndex={500}
            label={label}
            title={`${count} properties — zoom in`}
        />
    );
}, (prev, next) =>
    prev.count === next.count &&
    prev.position.lat === next.position.lat &&
    prev.position.lng === next.position.lng
);

const HotelMap = forwardRef(function HotelMap({ hotels = [], lat, long, location, showPreview = true }, ref) {
    const [modalChange, setModalChange] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [hoveredHotel, setHoveredHotel] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [mapCenter] = useState({ lat: Number(lat), lng: Number(long) });
    const [mapBounds, setMapBounds] = useState(null);
    const [mapZoom, setMapZoom] = useState(14);
    const mapInstanceRef = useRef(null);
    const listScrollRef = useRef(null);
    const hoverClearTimerRef = useRef(null);
    const [visibleCount, setVisibleCount] = useState(10);
    const PAGE_SIZE = 10;
    const { currency, rates } = useCurrency();
    const { filteredHotels, totalHotels, search, sort, star, meal, distances, priceRange } = useHotelList();
    const searchParams = useSearchParams();
    const check_in = searchParams.get("checkIn");
    const check_out = searchParams.get("checkOut");
    const nights = Math.max(1, moment(check_out).diff(moment(check_in), 'days') || 1);
    const placeLabel = location || searchParams.get("location") || searchParams.get("city") || '';

    // Prefer context-filtered hotels so map stays in sync with filters
    const sourceHotels = useMemo(
        () => (Array.isArray(filteredHotels) ? filteredHotels : hotels),
        [filteredHotels, hotels]
    );

    /** Precompute positions + price labels once (not on every hover/select) */
    const mapHotels = useMemo(() => {
        const items = [];
        for (let index = 0; index < sourceHotels.length; index++) {
            const hotel = sourceHotels[index];
            const latNum = Number(hotel?.location?.latitude);
            const lngNum = Number(hotel?.location?.longitude);
            if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) continue;

            const { newcurrency, newprice } = ConvertPrice(
                hotel.metadata?.min_price,
                hotel.metadata?.currency,
                currency,
                rates
            );

            items.push({
                key: hotelKey(hotel),
                hotel,
                index,
                position: { lat: latNum, lng: lngNum },
                labelText: `${newcurrency} ${formatPrice(newprice)}`,
            });
        }
        return items;
    }, [sourceHotels, currency, rates]);

    const selectedKey = hotelKey(selectedHotel);
    const hoveredKey = hotelKey(hoveredHotel);

    // Viewport/cluster set must stay stable on hover — only selection/pan/zoom rebuilds it
    const baseDisplayMarkers = useMemo(
        () => buildViewportMarkers(mapHotels, mapBounds, mapZoom, selectedKey),
        [mapHotels, mapBounds, mapZoom, selectedKey]
    );

    // If the hovered hotel was capped out of the viewport set (e.g. list hover),
    // append it without reshuffling the rest of the pins.
    const displayMarkers = useMemo(() => {
        if (!hoveredKey) return baseDisplayMarkers;
        const alreadyVisible = baseDisplayMarkers.some(
            (m) => m.type === 'hotel' && m.key === hoveredKey
        );
        if (alreadyVisible) return baseDisplayMarkers;
        const hovered = mapHotels.find((m) => m.key === hoveredKey);
        if (!hovered) return baseDisplayMarkers;
        return [...baseDisplayMarkers, { type: 'hotel', ...hovered }];
    }, [baseDisplayMarkers, hoveredKey, mapHotels]);

    const handleSelectHotel = useCallback((hotel) => {
        setSelectedHotel(hotel);
    }, []);

    const handleHoverHotel = useCallback((hotel) => {
        // Icon/zIndex updates can briefly fire mouseout — debounce clear to avoid flicker loops
        if (hoverClearTimerRef.current) {
            clearTimeout(hoverClearTimerRef.current);
            hoverClearTimerRef.current = null;
        }

        if (!hotel) {
            hoverClearTimerRef.current = setTimeout(() => {
                setHoveredHotel(null);
                hoverClearTimerRef.current = null;
            }, 40);
            return;
        }

        setHoveredHotel((prev) => {
            if (prev && prev.id === hotel.id && prev.provider === hotel.provider) return prev;
            return hotel;
        });
    }, []);

    useEffect(() => {
        return () => {
            if (hoverClearTimerRef.current) clearTimeout(hoverClearTimerRef.current);
        };
    }, []);

    const handleClusterZoom = useCallback((position) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const nextZoom = Math.min((map.getZoom() || 14) + 2, 18);
        map.panTo(position);
        map.setZoom(nextZoom);
    }, []);

    const syncMapViewport = useCallback(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const nextZoom = map.getZoom();
        if (typeof nextZoom === 'number') {
            setMapZoom((prev) => (prev === nextZoom ? prev : nextZoom));
        }

        const nextBounds = map.getBounds();
        if (!nextBounds) return;

        setMapBounds((prev) => {
            if (prev) {
                const pne = prev.getNorthEast();
                const psw = prev.getSouthWest();
                const nne = nextBounds.getNorthEast();
                const nsw = nextBounds.getSouthWest();
                if (
                    pne.lat() === nne.lat() &&
                    pne.lng() === nne.lng() &&
                    psw.lat() === nsw.lat() &&
                    psw.lng() === nsw.lng()
                ) {
                    return prev;
                }
            }
            return nextBounds;
        });
    }, []);

    const filterSignature = useMemo(
        () =>
            [
                sourceHotels.length,
                search || '',
                sort || '',
                (star || []).join(','),
                (meal || []).join(','),
                (distances || []).join(','),
                priceRange?.[0],
                priceRange?.[1],
            ].join('|'),
        [sourceHotels.length, search, sort, star, meal, distances, priceRange]
    );

    useEffect(() => {
        if (!selectedHotel?.location || !mapInstanceRef.current) return;
        mapInstanceRef.current.panTo({
            lat: Number(selectedHotel.location.latitude),
            lng: Number(selectedHotel.location.longitude),
        });
        // Offset up so marker stays visible above the bottom card
        mapInstanceRef.current.panBy(0, 80);
    }, [selectedHotel]);

    const visibleHotels = useMemo(
        () => sourceHotels.slice(0, visibleCount),
        [sourceHotels, visibleCount]
    );
    const hasMoreHotels = visibleCount < sourceHotels.length;

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        setSelectedHotel(null);
        if (listScrollRef.current) {
            listScrollRef.current.scrollTop = 0;
        }
    }, [modalChange, filterSignature]);

    const handleListScroll = () => {
        const el = listScrollRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        if (nearBottom) {
            setVisibleCount((prev) => {
                if (prev >= sourceHotels.length) return prev;
                return Math.min(prev + PAGE_SIZE, sourceHotels.length);
            });
        }
    };

    // If list is shorter than the panel, keep loading until scrollable or finished
    useEffect(() => {
        if (!modalChange || visibleCount >= sourceHotels.length) return;
        const el = listScrollRef.current;
        if (!el) return;
        if (el.scrollHeight <= el.clientHeight + 20) {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sourceHotels.length));
        }
    }, [modalChange, visibleCount, sourceHotels.length]);

    useImperativeHandle(ref, () => ({
        openMap: () => setModalChange(true),
    }));

    useEffect(() => {
        let timer;
        if (modalChange) {
            if (window.google?.maps) {
                setScriptLoaded(true);
            }
            timer = setTimeout(() => setShowMap(true), 300);
        } else {
            setShowMap(false);
            setMapReady(false);
            setMapBounds(null);
            setMapZoom(14);
            setSelectedHotel(null);
            setHoveredHotel(null);
        }
        return () => clearTimeout(timer);
    }, [modalChange]);

    const isSameHotel = (a, b) =>
        !!a && !!b && a.id === b.id && a.provider === b.provider;

    const canRenderMarkers = scriptLoaded && mapReady;
    const propertyCount = totalHotels || sourceHotels.length;

    return (
        <>
            {showPreview && (
                <div className="mb-4 d-none d-md-block">
                    <div className="position-relative" style={{ width: "100%", height: "200px" }}>
                        <iframe
                            width="100%"
                            height="200"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight="0"
                            marginWidth="0"
                            src={`https://maps.google.com/maps?q=${lat},${long}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
                            style={{ border: "0", borderRadius: "8px" }}
                            title="Hotel location map preview"
                        />

                        <div
                            className={`position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center ${styles.previewOverlay}`}
                        >
                            <button
                                type="button"
                                className={`${styles.showMapBtn}`}
                                onClick={() => setModalChange(true)}
                            >
                                Show on Map
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                opened={modalChange}
                onClose={() => setModalChange(false)}
                withCloseButton={false}
                fullScreen
                radius={0}
                padding={0}
                transitionProps={{ transition: "fade", duration: 200 }}
                classNames={{ body: styles.modalBody, content: styles.modalContent }}
            >
                <div className={styles.mapView}>
                    <MapFilterBar onHideMap={() => setModalChange(false)} />

                    <div className={styles.splitLayout}>
                        <aside className={styles.listPanel}>
                            <div className={styles.listHeader}>
                                <div className={styles.listHeaderTop}>
                                    <p className={styles.listCount}>
                                        {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                                        {placeLabel ? ` in ${placeLabel}` : ''}
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.closeBtn}
                                        onClick={() => setModalChange(false)}
                                        aria-label="Close map view"
                                    >
                                        <MdClose size={22} />
                                    </button>
                                </div>
                            </div>

                            <div
                                className={styles.listScroll}
                                ref={listScrollRef}
                                onScroll={handleListScroll}
                            >
                                {visibleHotels.length === 0 ? (
                                    <div className={styles.listEmpty}>
                                        No properties match your filters.
                                    </div>
                                ) : (
                                    visibleHotels.map((hotel, index) => (
                                        <MapListCard
                                            key={`${hotel.id}-${hotel.provider}-${index}`}
                                            hotel={hotel}
                                            isSelected={isSameHotel(selectedHotel, hotel)}
                                            isHovered={isSameHotel(hoveredHotel, hotel)}
                                            onSelect={handleSelectHotel}
                                            onHover={handleHoverHotel}
                                            check_in={check_in}
                                            check_out={check_out}
                                            nights={nights}
                                            currency={currency}
                                            rates={rates}
                                        />
                                    ))
                                )}
                                {hasMoreHotels && (
                                    <div className={styles.listLoadMore}>
                                        Scroll for more…
                                    </div>
                                )}
                            </div>
                        </aside>

                        <div className={styles.mapPanel}>
                            <button
                                type="button"
                                className={`${styles.closeBtn} ${styles.closeBtnMap}`}
                                onClick={() => setModalChange(false)}
                                aria-label="Close map view"
                            >
                                <MdClose size={22} />
                            </button>

                            {!mapReady && (
                                <div className={styles.mapLoading} role="status" aria-live="polite">
                                    <MdMap className={styles.mapLoadingIcon} size={36} aria-hidden="true" />
                                    <p className={styles.mapLoadingText}>
                                        Loading map{placeLabel ? ` of ${placeLabel}` : ''}
                                    </p>
                                    <span className={styles.mapLoadingSpinner} aria-hidden="true" />
                                </div>
                            )}

                            {showMap && lat && long && (
                                <div className={styles.mapContainer}>
                                    <LoadScriptNext
                                        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                        onLoad={() => setScriptLoaded(true)}
                                    >
                                        <GoogleMap
                                            mapContainerStyle={containerStyle}
                                            center={mapCenter}
                                            zoom={14}
                                            options={{
                                                gestureHandling: 'greedy',
                                                mapTypeControl: false,
                                                streetViewControl: false,
                                                fullscreenControl: false,
                                            }}
                                            onLoad={(map) => {
                                                mapInstanceRef.current = map;
                                                setMapReady(true);
                                                const bounds = map.getBounds();
                                                const zoom = map.getZoom();
                                                if (bounds) setMapBounds(bounds);
                                                if (typeof zoom === 'number') setMapZoom(zoom);
                                            }}
                                            onIdle={syncMapViewport}
                                            onClick={() => setSelectedHotel(null)}
                                        >
                                            {canRenderMarkers && displayMarkers.map((item) => {
                                                if (item.type === 'cluster') {
                                                    return (
                                                        <HotelClusterMarker
                                                            key={item.id}
                                                            position={item.position}
                                                            count={item.count}
                                                            onZoomIn={handleClusterZoom}
                                                        />
                                                    );
                                                }

                                                const isSelected = item.key === selectedKey;
                                                const isHovered = item.key === hoveredKey;
                                                const isActive = isSelected || isHovered;

                                                return (
                                                    <HotelPriceMarker
                                                        key={item.key}
                                                        hotel={item.hotel}
                                                        position={item.position}
                                                        labelText={item.labelText}
                                                        isActive={isActive}
                                                        zIndex={isSelected ? 1000 : isHovered ? 999 : item.index}
                                                        onSelect={handleSelectHotel}
                                                        onHover={handleHoverHotel}
                                                    />
                                                );
                                            })}
                                        </GoogleMap>
                                    </LoadScriptNext>

                                    {selectedHotel && (
                                        <MapFloatingCard
                                            key={`${selectedHotel.id}-${selectedHotel.provider}`}
                                            hotel={selectedHotel}
                                            onClose={() => setSelectedHotel(null)}
                                            check_in={check_in}
                                            check_out={check_out}
                                            nights={nights}
                                            currency={currency}
                                            rates={rates}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
});

export default HotelMap;
