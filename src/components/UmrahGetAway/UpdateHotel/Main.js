'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Modal, Text, Group, Stack, Loader, Alert, Tooltip, Button, Drawer } from '@mantine/core';
import { FaMoon, FaStar } from 'react-icons/fa';
import { CiLocationOn } from 'react-icons/ci';
import { MdDirectionsWalk, MdErrorOutline } from 'react-icons/md';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import moment from 'moment';
import Image from 'next/image';
import styles from './UpdateHotel.module.css';
import { TbRulerMeasure } from 'react-icons/tb';
import { useFilters } from '../Listing/Filter/FilterContext';
import { FiCheckCircle, FiRefreshCw, FiSearch, FiSliders } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import UmrahPagination from '../Listing/UmrahPagination';
import RevisionHotelDetailModal from './RevisionHotelDetailModal';
import { getRateSeqNo } from '@/components/Hotels/utils/roomSequence';
import { mergeHotels, streamHotelSearch } from '@/util/streamHotelSearch';

function childrenCount(value) {
    if (Array.isArray(value)) return value.length;
    return Number(value || 0);
}

function isHotelstonProvider(item) {
    return String(item?.provider || '').toLowerCase() === 'hotelston';
}

function collectHotelstonSeqNos(hotelItem) {
    const seqs = new Set();
    (hotelItem?.rooms || []).forEach((room) => {
        (room?.rates || []).forEach((rate) => {
            const seq = getRateSeqNo(rate, room);
            if (seq !== null) seqs.add(seq);
        });
    });
    return [...seqs].sort((a, b) => a - b);
}

/** Cheapest rate for one Hotelston sequence slot (optionally occupancy-filtered). */
function findCheapestMatchForSeq(hotelItem, seqNo, searchRoom = null) {
    const filterOccupancy = searchRoom != null;
    const needAdults = filterOccupancy ? Number(searchRoom?.adults ?? 0) : null;
    const needChildren = filterOccupancy ? childrenCount(searchRoom?.children) : null;
    let best = null;

    (hotelItem?.rooms || []).forEach((room, roomIndex) => {
        (room?.rates || []).forEach((rate, rateIndex) => {
            const rateSeq = getRateSeqNo(rate, room);
            if (rateSeq === null || Number(rateSeq) !== Number(seqNo)) return;

            if (filterOccupancy) {
                const rateAdults = Number(rate?.adults ?? 0);
                const rateChildren = childrenCount(rate?.children);
                if (rateAdults !== needAdults || rateChildren !== needChildren) return;
            }

            const price = Number(rate?.price);
            if (!Number.isFinite(price)) return;
            if (!best || price < best.price) {
                best = { roomIndex, rateIndex, price, room, rate, seqNo: rateSeq };
            }
        });
    });

    return best;
}

/** Cheapest hotel rate whose adults/children match one search room. */
function findCheapestMatchForSearchRoom(hotelItem, searchRoom) {
    const needAdults = Number(searchRoom?.adults ?? 0);
    const needChildren = childrenCount(searchRoom?.children);
    let best = null;

    (hotelItem?.rooms || []).forEach((room, roomIndex) => {
        (room?.rates || []).forEach((rate, rateIndex) => {
            const rateAdults = Number(rate?.adults ?? 0);
            const rateChildren = childrenCount(rate?.children);
            if (rateAdults !== needAdults || rateChildren !== needChildren) return;

            const price = Number(rate?.price);
            if (!Number.isFinite(price)) return;
            if (!best || price < best.price) {
                best = {
                    roomIndex,
                    rateIndex,
                    price,
                    room,
                    rate,
                    seqNo: getRateSeqNo(rate, room),
                };
            }
        });
    });

    return best;
}

/**
 * Hotelston: one cheapest room per seq_no (search room slot).
 * Falls back to occupancy matching when seq_no is missing on rates.
 */
function resolveHotelstonSequenceSelection(hotelItem, searchRooms = []) {
    if (!isHotelstonProvider(hotelItem)) return null;

    const rooms = Array.isArray(searchRooms) ? searchRooms : [];
    const seqNos = collectHotelstonSeqNos(hotelItem);
    const slotCount = Math.max(rooms.length, seqNos.length > 1 ? seqNos.length : 0);

    // Single-slot hotelston: keep existing cheapest / occupancy path
    if (slotCount <= 1) return null;

    const matches = [];
    for (let i = 0; i < (rooms.length > 0 ? rooms.length : seqNos.length); i++) {
        const searchRoom = rooms[i] || null;
        const preferredSeq = seqNos[i] ?? i;
        let match = findCheapestMatchForSeq(hotelItem, preferredSeq, searchRoom);

        // Occupancy may not align — still pick cheapest for that sequence
        if (!match) match = findCheapestMatchForSeq(hotelItem, preferredSeq, null);

        // Try adjacent seq conventions (0-based vs 1-based) before giving up
        if (!match && seqNos[i] === undefined) {
            match = findCheapestMatchForSeq(hotelItem, i + 1, searchRoom)
                || findCheapestMatchForSeq(hotelItem, i + 1, null);
        }

        // Last resort: occupancy-only match for this search room
        if (!match && searchRoom) {
            match = findCheapestMatchForSearchRoom(hotelItem, searchRoom);
        }

        if (!match) return null;
        matches.push(match);
    }

    return {
        matches,
        price: matches.reduce((sum, item) => sum + item.price, 0),
        roomIndex: matches[0].roomIndex,
        rateIndex: matches[0].rateIndex,
    };
}

/**
 * Multi-room search: match each search room occupancy, sum cheapest prices.
 * Returns null when not multi-room or any room has no match.
 */
function resolveMultiRoomSelectionByOccupancy(hotelItem, searchRooms = []) {
    if (!Array.isArray(searchRooms) || searchRooms.length <= 1) return null;

    const matches = [];
    for (const searchRoom of searchRooms) {
        const match = findCheapestMatchForSearchRoom(hotelItem, searchRoom);
        if (!match) return null;
        matches.push(match);
    }

    return {
        matches,
        price: matches.reduce((sum, item) => sum + item.price, 0),
        roomIndex: matches[0].roomIndex,
        rateIndex: matches[0].rateIndex,
    };
}

/** Hotelston uses seq slots; other providers use occupancy multi-room matching. */
function resolveMultiRoomSelection(hotelItem, searchRooms = []) {
    if (isHotelstonProvider(hotelItem)) {
        const hotelstonSelection = resolveHotelstonSequenceSelection(hotelItem, searchRooms);
        if (hotelstonSelection) return hotelstonSelection;
    }
    return resolveMultiRoomSelectionByOccupancy(hotelItem, searchRooms);
}

function buildSelectedRoomUnits(rooms, selectedPairs, packageCurrency) {
    return (selectedPairs || []).reduce((units, item) => {
        const room = rooms?.[item.roomIndex];
        const rate = room?.rates?.[item.rateIndex];
        if (!room || !rate) return units;

        const qty = Math.max(1, Number(item.qty || 1));
        const unitPrice = Number(rate?.price || 0);
        const price = Number(parseFloat(Number((Number.isFinite(unitPrice) ? unitPrice : 0) * qty).toFixed(2)));
        const rateKey = String(rate?.rate_key || item.ratekey || '');
        const roomId = String(room?.id || room?.code || '');
        const seqNo = item.seqNo ?? item.searchRoomIndex ?? getRateSeqNo(rate, room);

        units.push({
            rateKey,
            rate_key: rateKey,
            roomIndex: Number(item.roomIndex),
            room_index: Number(item.roomIndex),
            rateIndex: Number(item.rateIndex),
            rate_index: Number(item.rateIndex),
            room_id: roomId,
            quantity: qty,
            adults: Number(item.adults ?? rate?.adults ?? 0),
            children: childrenCount(item.children ?? rate?.children),
            price,
            currency: packageCurrency || rate?.currency || '',
            boardName: rate?.board_name || '',
            roomType: room?.name || '',
            optionId: rate?.metadata?.optionId,
            roomTypeId: String(rate?.metadata?.room_type_id || room?.id || ''),
            boardTypeId: String(rate?.metadata?.board_type_id || ''),
            ...(seqNo !== null && seqNo !== undefined
                ? { seqNo, searchRoomIndex: seqNo }
                : {}),
        });
        return units;
    }, []);
}

export default function UpdateHotelModal({ opened, onClose, pkg, hotel, cityName, onHotelCacheUpdate, isRevisionMode = false, onApply, failedService = '' }) {
    const { googleDistanceCache, fetchSingleDistance } = useFilters();
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // keyed by hotel id: { loading, images, address, facilities }
    const [hotelDetailsCache, setHotelDetailsCache] = useState({});

    // Filters
    const [searchText, setSearchText] = useState('');
    const [selectedStars, setSelectedStars] = useState([]);
    const [selectedDistances, setSelectedDistances] = useState([]);
    const [selectedViews, setSelectedViews] = useState([]);
    const [sortBy, setSortBy] = useState('default');
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);
    const [searchRefreshKey, setSearchRefreshKey] = useState(0);
    const hydratedHotelIdsRef = useRef(new Set());
    const itemsPerPage = 10;

    // Confirmation modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmHotel, setConfirmHotel] = useState(null);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [ratesError, setRatesError] = useState(null);
    const [convertedPrice, setConvertedPrice] = useState(null);
    const [currencyMismatch, setCurrencyMismatch] = useState(false);
    const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
    const daysDiff = moment(hotel?.check_out).diff(moment(hotel?.check_in), 'days');
    const confirmDaysDiff = Math.max(daysDiff, 1);

    const fetchRates = async () => {
        try {
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.NEXT_PUBLIC_CURRENCY_KEY}/latest/GBP`);
            if (!response.ok) throw new Error('Failed to fetch exchange rates');
            const data = await response.json();
            return data.conversion_rates;
        } catch (error) {
            console.error('Failed to fetch exchange rates', error);
            return null;
        }
    };

    const convertPrice = (price, fromCurrency, toCurrency, ratesMap) => {
        if (!ratesMap || !fromCurrency || !toCurrency) return null;
        if (fromCurrency === toCurrency) return price;
        const fromRate = ratesMap[fromCurrency];
        const toRate = ratesMap[toCurrency];
        if (!fromRate || !toRate) return null;
        return (price / fromRate) * toRate;
    };

    const handleSelectClick = async (item) => {
        if (isRevisionMode) {
            setConfirmHotel(item);
            setRevisionDetailOpen(true);
            return;
        }

        setConfirmHotel(item);
        setConvertedPrice(null);
        setRatesError(null);
        const hotelCurrency = item?.metadata?.currency;
        const pkgCurrency = pkg?.currency || pkg?.pricing?.currency;
        const isMismatch = hotelCurrency && pkgCurrency && hotelCurrency !== pkgCurrency;
        setCurrencyMismatch(isMismatch);
        if (isMismatch) {
            setRatesLoading(true);
            setConfirmOpen(true);
            const ratesMap = await fetchRates();
            if (ratesMap) {
                const converted = convertPrice(item?.metadata?.min_price, hotelCurrency, pkgCurrency, ratesMap);
                setConvertedPrice(converted);
            } else {
                setRatesError('Unable to fetch exchange rates. Please try again.');
            }
            setRatesLoading(false);
        } else {
            setConfirmOpen(true);
        }
    };

    const handleRetry = async () => {
        if (!confirmHotel) return;
        setRatesError(null);
        setRatesLoading(true);
        const ratesMap = await fetchRates();
        if (ratesMap) {
            const converted = convertPrice(
                confirmHotel?.metadata?.min_price,
                confirmHotel?.metadata?.currency,
                pkg?.currency || pkg?.pricing?.currency,
                ratesMap
            );
            setConvertedPrice(converted);
        } else {
            setRatesError('Unable to fetch exchange rates. Please try again.');
        }
        setRatesLoading(false);
    };

    const fetchHotelDetail = useCallback(async (item) => {
        const id = item?.id;
        if (!id) return;
        setHotelDetailsCache(prev => ({ ...prev, [id]: { loading: true } }));
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: item.provider,
                    hotelId: item.id,
                    checkIn: hotel?.check_in,
                    checkOut: hotel?.check_out,
                }),
            });
            const res = await response.json();
            setHotelDetailsCache(prev => ({
                ...prev,
                [id]: {
                    loading: false,
                    images: Array.isArray(res.data?.main_images) && res.data.main_images.length > 0
                        ? res.data.main_images[0].url || ''
                        : '',
                    all_images: res.data?.main_images || [],
                    address: res.data?.address || '',
                    facilities: res.data?.facilities || [],
                },
            }));
        } catch {
            setHotelDetailsCache(prev => ({ ...prev, [id]: { loading: false, error: true } }));
        }
    }, [hotel?.check_in, hotel?.check_out]);

    const handleRefreshSearch = useCallback(() => {
        if (loading) return;
        setSearchRefreshKey(prev => prev + 1);
    }, [loading]);

    useEffect(() => {
        if (!opened || !hotel || !pkg) return;

        // Reset all filters on every open
        setSearchText('');
        setSelectedStars([]);
        setSelectedDistances([]);
        setSelectedViews([]);
        setSortBy('default');
        setVisibleCount(10);

        const abortController = new AbortController();
        const cityLower = cityName?.toLowerCase().includes('madinah') ? 'madinah' : 'makkah';
        hydratedHotelIdsRef.current = new Set();

        const hydrateHotelChunk = (chunk = []) => {
            if (!chunk.length) return;
            chunk.forEach((item) => {
                if (!item?.id || hydratedHotelIdsRef.current.has(item.id)) return;
                hydratedHotelIdsRef.current.add(item.id);
                fetchHotelDetail(item);
                if (googleDistanceCache[item.id]) return;
                const label = [item.name, item?.location?.address].filter(Boolean).join(', ');
                fetchSingleDistance({
                    id: item.id,
                    hotel: label,
                    city: cityLower,
                    lat: item?.location?.latitude,
                    lon: item?.location?.longitude,
                });
            });
        };

        const fetchHotels = async () => {
            setLoading(true);
            setError(null);
            setHotels([]);
            setHotelDetailsCache({});

            const clientNationality = localStorage.getItem('clientNationality') || 'GB';
            const request = {
                checkIn: hotel?.check_in,
                checkOut: hotel?.check_out,
                destination: {
                    city: cityName,
                    latitude: hotel?.destination?.latitude || hotel?.location?.latitude,
                    longitude: hotel?.destination?.longitude || hotel?.location?.longitude,
                    countryCode: hotel?.destination?.countryCode || 'SA',
                    clientNationality,
                },
                currency: pkg?.currency,
                rooms: pkg?.original_request?.rooms,
            };

            try {
                await streamHotelSearch({
                    request,
                    signal: abortController.signal,
                    onProvider: ({ hotels: chunk }) => {
                        if (!chunk?.length) return;
                        setHotels((prev) => mergeHotels(prev, chunk));
                        hydrateHotelChunk(chunk);
                    },
                });
            } catch (err) {
                if (err?.name === 'AbortError') return;
                console.error('Hotel search error:', err);
                setError('Failed to load available hotels. Please try again.');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchHotels();

        return () => abortController.abort();
    }, [opened, hotel?.id, cityName, searchRefreshKey]);

    useEffect(() => {
        if (!opened) {
            setConfirmOpen(false);
            setRevisionDetailOpen(false);
            setConfirmHotel(null);
        }
    }, [opened]);

    useEffect(() => {
        setVisibleCount(10);
    }, [searchText, selectedStars, selectedDistances, selectedViews, sortBy, hotels.length]);

    if (!hotel) return null;

    // ── Filter helpers ──────────────────────────────────────────
    const toggleFilter = (setter, value) =>
        setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

    const getDistanceMeters = (item) => {
        // Prefer the real Google Distance Matrix value
        const googleDist = googleDistanceCache[item?.id];
        if (googleDist && !googleDist.loading && !googleDist.error && googleDist.distanceMeters != null) {
            return googleDist.distanceMeters;
        }
        // Fallback to metadata field
        const raw = item?.metadata?.distance_from_haram ?? item?.distance_from_haram;
        if (raw == null) return null;
        return typeof raw === 'string' ? parseFloat(raw) : raw;
    };

    const matchesDistance = (item) => {
        if (!selectedDistances.length) return true;
        const googleDist = googleDistanceCache[item?.id];
        // If Google data is still loading, treat as unspecified — skip filtering until ready
        if (googleDist?.loading) return !selectedDistances.includes('unspecified') ? true : false;
        const m = getDistanceMeters(item);
        return selectedDistances.some(range => {
            if (range === 'unspecified') return m == null;
            if (m == null) return false;
            if (range === '0-500') return m <= 500;
            if (range === '500-1000') return m > 500 && m <= 1000;
            if (range === '1000-2000') return m > 1000 && m <= 2000;
            if (range === '2000+') return m > 2000;
            return false;
        });
    };

    const matchesView = (item) => {
        if (!selectedViews.length) return true;
        const facilities = (hotelDetailsCache[item?.id]?.facilities || [])
            .map(f => (typeof f === 'string' ? f : f?.name || '').toLowerCase());
        return selectedViews.some(v => facilities.some(f => f.includes(v.toLowerCase())));
    };

    const currentHotelId = String(
        hotel?.id
        || (cityName === 'Makkah' ? pkg?.makkah_hotel?.id : pkg?.madinah_hotel?.id)
        || ''
    );
    const currentHotelNameNorm = String(
        hotel?.name
        || (cityName === 'Makkah' ? pkg?.makkah_hotel?.name : pkg?.madinah_hotel?.name)
        || ''
    ).trim().toLowerCase();

    const filteredHotels = hotels.filter(item => {
        // Exclude the hotel already selected on the package
        if (currentHotelId && String(item?.id) === currentHotelId) return false;
        if (
            currentHotelNameNorm
            && String(item?.name || '').trim().toLowerCase() === currentHotelNameNorm
        ) {
            return false;
        }
        if (searchText && !item?.name?.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (selectedStars.length) {
            const rawStars = item?.metadata?.stars;
            const stars = Math.round(Number(rawStars));
            // Treat null/undefined/NaN/0 the same as UI "No Rating"
            const ratingKey = (!Number.isFinite(stars) || stars <= 0) ? 'unrated' : stars;
            if (!selectedStars.includes(ratingKey)) return false;
        }
        if (!matchesDistance(item)) return false;
        if (!matchesView(item)) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'price_asc') return (a.metadata?.min_price ?? 0) - (b.metadata?.min_price ?? 0);
        if (sortBy === 'price_desc') return (b.metadata?.min_price ?? 0) - (a.metadata?.min_price ?? 0);
        return 0;
    });

    const visibleHotels = filteredHotels.slice(0, visibleCount);
    const hasMore = visibleCount < filteredHotels.length;

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + itemsPerPage, filteredHotels.length));
    };

    const confirmHotelStars = confirmHotel ? Math.round(Number(confirmHotel?.metadata?.stars)) : 0;

    const activeFilterCount =
        (searchText ? 1 : 0) +
        selectedStars.length +
        selectedDistances.length +
        selectedViews.length +
        (sortBy !== 'default' ? 1 : 0);

    const clearAllFilters = () => {
        setSearchText('');
        setSelectedStars([]);
        setSelectedDistances([]);
        setSelectedViews([]);
        setSortBy('default');
    };

    const renderStars = (count, size = 12) => {
        const stars = Math.round(Number(count));
        if (!stars || isNaN(stars) || stars <= 0) return null;
        return Array(stars).fill(0).map((_, i) => <FaStar key={i} size={size} />);
    };

    const renderSearchInput = (wrapClass = '') => (
        <div className={`${styles.searchWrap} ${wrapClass}`}>
            <FiSearch className={styles.searchIcon} size={15} />
            <input
                type="text"
                className={styles.searchInput}
                placeholder="Search Hotels"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
            />
        </div>
    );

    const renderFilterPanel = (idPrefix = '') => (
        <div className={styles.filterPanel}>
            <div>
                <p className={styles.filterSectionTitle}>Sort By</p>
                <div className={styles.pillGroup}>
                    {[
                        { value: 'default', label: 'Default' },
                        { value: 'price_asc', label: 'Price ↑' },
                        { value: 'price_desc', label: 'Price ↓' },
                    ].map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            className={`${styles.sortPill} ${sortBy === value ? styles.sortPillActive : ''}`}
                            onClick={() => setSortBy(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className={styles.filterSectionTitle}>Property Rating</p>
                <div className={styles.filterOptions}>
                    {[5, 4, 3, 2, 1].map(star => (
                        <label key={star} className={styles.filterOption} htmlFor={`${idPrefix}star-${star}`}>
                            <input
                                type="checkbox"
                                id={`${idPrefix}star-${star}`}
                                checked={selectedStars.includes(star)}
                                onChange={() => toggleFilter(setSelectedStars, star)}
                            />
                            <span className={styles.starLabel}>{star} Star{star > 1 ? 's' : ''}</span>
                        </label>
                    ))}
                    <label className={styles.filterOption} htmlFor={`${idPrefix}star-unrated`}>
                        <input
                            type="checkbox"
                            id={`${idPrefix}star-unrated`}
                            checked={selectedStars.includes('unrated')}
                            onChange={() => toggleFilter(setSelectedStars, 'unrated')}
                        />
                        <span className={styles.starLabel}>Unrated</span>
                    </label>
                </div>
            </div>

            <div>
                <p className={styles.filterSectionTitle}>Distance from Haram</p>
                <div className={styles.filterOptions}>
                    {[
                        { value: '0-500', label: '0–500m from Haram' },
                        { value: '500-1000', label: '500m–1km from Haram' },
                        { value: '1000-2000', label: '1–2km from Haram' },
                        { value: '2000+', label: 'More than 2km' },
                        { value: 'unspecified', label: 'Distance not specified' },
                    ].map(({ value, label }) => (
                        <label key={value} className={styles.filterOption} htmlFor={`${idPrefix}dist-${value}`}>
                            <input
                                type="checkbox"
                                id={`${idPrefix}dist-${value}`}
                                checked={selectedDistances.includes(value)}
                                onChange={() => toggleFilter(setSelectedDistances, value)}
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {activeFilterCount > 0 && (
                <button type="button" className={styles.clearFiltersBtn} onClick={clearAllFilters}>
                    Clear All Filters
                </button>
            )}
        </div>
    );

    const renderHotelCard = (item, index) => {
        const detail = hotelDetailsCache[item?.id];
        const detailLoading = !detail || detail?.loading;
        const dist = googleDistanceCache[item?.id];
        const cardSearchRooms = pkg?.original_request?.rooms || [];
        const cardNeedsSlotResolve = (Array.isArray(cardSearchRooms) && cardSearchRooms.length > 1)
            || (isHotelstonProvider(item) && collectHotelstonSeqNos(item).length > 1);
        const cardMultiRoom = cardNeedsSlotResolve
            ? resolveMultiRoomSelection(item, cardSearchRooms)
            : null;
        const cardPrice = cardMultiRoom
            ? cardMultiRoom.price
            : Number(item?.metadata?.min_price);

        return (
            <article key={item?.id || index} className={styles.hotelCard}>
                <div className={styles.hotelCardInner}>
                    <div className={styles.hotelImageWrap}>
                        {detailLoading ? (
                            <div className={styles.imageSkeleton} />
                        ) : detail?.images ? (
                            <Image
                                src={detail.images}
                                fill
                                className={styles.hotelImage}
                                alt={item.name}
                                unoptimized
                            />
                        ) : (
                            <div className={styles.imagePlaceholder}>No Image</div>
                        )}
                        {item?.provider === 'custom' && (
                            <span className={styles.alBadge}>AL Hijaz</span>
                        )}
                        {Array.isArray(item?.rooms) && (
                            <span className={styles.roomsBadge}>Rooms: {item.rooms.length}</span>
                        )}
                    </div>

                    <div className={styles.hotelBody}>
                        <div className={styles.hotelContent}>
                            <div className={styles.hotelInfo}>
                                <div className={styles.starsRow}>
                                    {item?.metadata?.stars && !isNaN(item.metadata.stars)
                                        ? renderStars(item.metadata.stars, 13)
                                        : <span className={styles.noRating}>No Rating</span>}
                                </div>

                                <h3 className={styles.hotelName}>{item.name}</h3>

                                {detailLoading ? (
                                    <p className={styles.hotelAddress}>
                                        <CiLocationOn size={14} />
                                        <span className={styles.addressSkeleton} />
                                    </p>
                                ) : detail?.address ? (
                                    <p className={styles.hotelAddress}>
                                        <CiLocationOn size={14} />
                                        <span>{detail.address}</span>
                                    </p>
                                ) : null}

                                {detailLoading ? (
                                    <div className={styles.facilitiesRow}>
                                        <span className={styles.facilitySkeleton} style={{ width: 80 }} />
                                        <span className={styles.facilitySkeleton} style={{ width: 90 }} />
                                    </div>
                                ) : detail?.facilities?.length > 0 ? (
                                    <div className={styles.facilitiesRow}>
                                        {detail.facilities.slice(0, 3).map((amenity, i) => (
                                            <span key={i} className={styles.facilityChip}>{amenity}</span>
                                        ))}
                                        {detail.facilities.length > 3 && (
                                            <span className={styles.facilityMore}>+{detail.facilities.length - 3} more</span>
                                        )}
                                    </div>
                                ) : null}

                                <div className={styles.distRow}>
                                    {dist?.loading ? (
                                        <>
                                            <span className={styles.distSkeleton} style={{ width: 130 }} />
                                            <span className={styles.distSkeleton} style={{ width: 90 }} />
                                        </>
                                    ) : dist && !dist.error ? (
                                        <>
                                            <Tooltip
                                                label={cityName === 'Madinah' ? 'Walking distance from Masjid Al-Nabawi' : 'Walking distance from Haram'}
                                                position="top"
                                                withArrow
                                                fz="xs"
                                            >
                                                <span className={styles.distBadge}>
                                                    <TbRulerMeasure size={12} />
                                                    {dist.distance} {cityName === 'Madinah' ? 'from Masjid Al-Nabawi' : 'from Haram'}
                                                </span>
                                            </Tooltip>
                                            <Tooltip
                                                label={cityName === 'Madinah' ? 'Estimated walking time from Masjid Al-Nabawi' : 'Estimated walking time'}
                                                position="top"
                                                withArrow
                                                fz="xs"
                                            >
                                                <span className={styles.distBadge}>
                                                    <MdDirectionsWalk size={13} />
                                                    {dist.walking}
                                                </span>
                                            </Tooltip>
                                        </>
                                    ) : dist ? (
                                        <span className={styles.distBadge}>
                                            <TbRulerMeasure size={12} />
                                            Distance N/A
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className={styles.hotelAside}>
                                <div className={styles.priceGroup}>
                                    <div className={styles.priceBlock}>
                                        <div className={styles.priceNight}>
                                            <PriceDisplay price={cardPrice / confirmDaysDiff} currency={item?.metadata.currency} /> / Night
                                        </div>
                                        <div className={styles.priceNightSub}>VAT &amp; taxes included</div>
                                    </div>
                                    <div className={styles.priceBlock}>
                                        <div className={styles.priceTotal}>
                                            <PriceDisplay price={cardPrice} currency={item?.metadata.currency} />
                                        </div>
                                        <div className={styles.priceTotalSub}>Total for {hotel?.nights} {hotel?.nights === 1 ? 'night' : 'nights'}</div>
                                    </div>
                                </div>
                                <button type="button" className={styles.selectBtn} onClick={() => handleSelectClick(item)}>
                                    Select Hotel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        );
    };

    const ApplyPriceChanges = (preferredSelection = null) => {
        const rooms = confirmHotel?.rooms || [];
        let minRoomIndex = 0;
        let minRateIndex = 0;

        // Ignore React click events accidentally passed as preferredSelection
        const hasPreferredSelection = preferredSelection
            && typeof preferredSelection === 'object'
            && !preferredSelection.nativeEvent
            && (preferredSelection.roomIndex != null || preferredSelection.rateIndex != null);

        if (hasPreferredSelection) {
            minRoomIndex = Number(preferredSelection.roomIndex) || 0;
            minRateIndex = Number(preferredSelection.rateIndex) || 0;
        } else {
            let minPrice = Infinity;
            rooms.forEach((room, rIdx) => {
                (room.rates || []).forEach((rate, tIdx) => {
                    const price = Number(rate.price);
                    if (Number.isFinite(price) && price < minPrice) {
                        minPrice = price;
                        minRoomIndex = rIdx;
                        minRateIndex = tIdx;
                    }
                });
            });
        }

        const searchRoomsForApply = pkg?.original_request?.rooms || [];
        const preferredSelectedRooms = Array.isArray(preferredSelection?.selectedRooms)
            ? preferredSelection.selectedRooms
            : null;
        const needsSlotResolve = !hasPreferredSelection && (
            (Array.isArray(searchRoomsForApply) && searchRoomsForApply.length > 1)
            || (isHotelstonProvider(confirmHotel) && collectHotelstonSeqNos(confirmHotel).length > 1)
        );
        const multiRoomSelection = needsSlotResolve
            ? resolveMultiRoomSelection(confirmHotel, searchRoomsForApply)
            : null;

        if (multiRoomSelection?.matches?.length) {
            minRoomIndex = multiRoomSelection.matches[0].roomIndex;
            minRateIndex = multiRoomSelection.matches[0].rateIndex;
        } else if (preferredSelectedRooms?.length) {
            minRoomIndex = Number(preferredSelectedRooms[0]?.roomIndex) || 0;
            minRateIndex = Number(preferredSelectedRooms[0]?.rateIndex) || 0;
        }

        const minRoom = rooms[minRoomIndex];
        const minRate = minRoom?.rates?.[minRateIndex];
        const totalPax = Number(pkg?.original_request?.adult || pkg?.adults || 0) + Number(pkg?.original_request?.child || pkg?.children || 0) + Number(pkg?.original_request?.infant || pkg?.infants || 0);
        const packageCurrency = pkg?.currency || pkg?.pricing?.currency || '';

        // Compute per-unit conversion factor from the already-resolved convertedPrice
        const rawMinPrice = Number(confirmHotel?.metadata?.min_price);
        const conversionFactor = currencyMismatch && convertedPrice != null && Number.isFinite(rawMinPrice) && rawMinPrice !== 0
            ? Number(convertedPrice) / rawMinPrice
            : currencyMismatch ? null : 1;

        const selectedRatePrice = multiRoomSelection
            ? Number(multiRoomSelection.price)
            : preferredSelectedRooms?.length
                ? preferredSelectedRooms.reduce((sum, item) => {
                    const room = rooms?.[item.roomIndex];
                    const rate = room?.rates?.[item.rateIndex];
                    const unit = Number(rate?.price || 0);
                    const qty = Math.max(1, Number(item.qty || 1));
                    return sum + (Number.isFinite(unit) ? unit * qty : 0);
                }, 0)
                : Number(minRate?.price);
        const fallbackMinPrice = Number.isFinite(rawMinPrice) ? rawMinPrice : 0;
        const rawSelectedPrice = Number.isFinite(selectedRatePrice) ? selectedRatePrice : fallbackMinPrice;

        // Always store hotel price in package currency
        let newHotelPrice;
        if (conversionFactor != null) {
            newHotelPrice = rawSelectedPrice * conversionFactor;
        } else if (convertedPrice != null && Number.isFinite(Number(convertedPrice))) {
            newHotelPrice = Number(convertedPrice);
        } else {
            newHotelPrice = rawSelectedPrice;
        }

        const selectedPairs = multiRoomSelection?.matches?.length
            ? multiRoomSelection.matches.map((item, index) => {
                const seqNo = item.seqNo ?? getRateSeqNo(item.rate, item.room);
                return {
                    ...item,
                    qty: Math.max(1, Number(searchRoomsForApply[index]?.quantity || searchRoomsForApply[index]?.qty || 1)),
                    adults: searchRoomsForApply[index]?.adults ?? item.rate?.adults,
                    children: searchRoomsForApply[index]?.children ?? item.rate?.children,
                    ...(seqNo !== null && seqNo !== undefined
                        ? { seqNo, searchRoomIndex: seqNo }
                        : {}),
                };
            })
            : preferredSelectedRooms?.length
                ? preferredSelectedRooms.map((item) => {
                    const room = rooms?.[item.roomIndex];
                    const rate = room?.rates?.[item.rateIndex];
                    const seqNo = item.seqNo ?? item.searchRoomIndex ?? getRateSeqNo(rate, room);
                    return {
                        roomIndex: Number(item.roomIndex) || 0,
                        rateIndex: Number(item.rateIndex) || 0,
                        qty: Math.max(1, Number(item.qty || 1)),
                        adults: item.adults ?? rate?.adults,
                        children: item.children ?? rate?.children,
                        ...(seqNo !== null && seqNo !== undefined
                            ? { seqNo, searchRoomIndex: seqNo }
                            : {}),
                    };
                })
                : (() => {
                    const seqNo = getRateSeqNo(minRate, minRoom);
                    return [{
                        roomIndex: minRoomIndex,
                        rateIndex: minRateIndex,
                        qty: Math.max(1, Number(preferredSelection?.qty || 1)),
                        adults: preferredSelection?.adults ?? minRate?.adults,
                        children: preferredSelection?.children ?? minRate?.children,
                        ...(isHotelstonProvider(confirmHotel) && seqNo !== null
                            ? { seqNo, searchRoomIndex: seqNo }
                            : {}),
                    }];
                })();
        const selectedRoomIndexes = new Set(selectedPairs.map((item) => item.roomIndex));

        // Annotate every rate with original_price / conversion_rate / price,
        // and mark selected room(s) + rate(s) with price_added_to_package / selected_for_package
        const annotatedRooms = rooms.map((room, rIdx) => ({
            ...room,
            ...(selectedRoomIndexes.has(rIdx) ? { price_added_to_package: true, selected_for_package: true } : {}),
            rates: (room.rates || []).map((rate, tIdx) => {
                const selectedPair = selectedPairs.find((item) => item.roomIndex === rIdx && item.rateIndex === tIdx);
                const seqNo = selectedPair?.seqNo ?? selectedPair?.searchRoomIndex ?? getRateSeqNo(rate, room);
                return {
                    ...rate,
                    original_price: rate.price ?? '',
                    conversion_rate: conversionFactor != null ? conversionFactor : '',
                    original_currency: rate.currency ?? '',
                    currency: packageCurrency || rate.currency || '',
                    price: conversionFactor != null ? Number(rate.price) * conversionFactor : (rate.price ?? ''),
                    ...(selectedPair
                        ? {
                            price_added_to_package: true,
                            selected_for_package: true,
                            quantity: selectedPair.qty || 1,
                            ...(seqNo !== null && seqNo !== undefined
                                ? {
                                    metadata: {
                                        ...(rate.metadata || {}),
                                        seq_no: seqNo,
                                    },
                                }
                                : {}),
                        }
                        : {}),
                };
            }),
        }));

        const selectedRoomUnits = buildSelectedRoomUnits(annotatedRooms, selectedPairs, packageCurrency);

        if (!pkg.pricing) pkg.pricing = {};

        if (cityName === 'Makkah') {
            const oldHotelPrice = Number(pkg?.pricing?.makkah_hotel_price ?? pkg?.makkah_hotel?.price) || 0;
            pkg.makkah_hotel.first_image = [];
            pkg.makkah_hotel.id = confirmHotel?.id;
            pkg.makkah_hotel.images = [];
            pkg.makkah_hotel.location = confirmHotel?.location;
            pkg.makkah_hotel.name = confirmHotel?.name;
            pkg.makkah_hotel.provider = confirmHotel?.provider;
            pkg.makkah_hotel.provider_code = confirmHotel?.provider_code;
            pkg.makkah_hotel.rooms = annotatedRooms;
            pkg.makkah_hotel.star_rating = confirmHotel?.metadata?.stars;
            pkg.makkah_hotel.price = newHotelPrice;
            pkg.makkah_hotel.selected_rate_index = minRateIndex;
            pkg.makkah_hotel.selected_rate_key = minRate?.rate_key ?? '';
            if (confirmHotel?.provider !== 'custom') {
                pkg.makkah_hotel.haram_view = false;
                pkg.makkah_hotel.kaaba_view = false;
            } else {
                let haramView = false;
                let kaabaView = false;
                (confirmHotel?.rooms || []).forEach(room => {
                    (room.rates || []).forEach(rate => {
                        const view = (rate?.metadata?.view || '').toLowerCase();
                        if (view.includes('haram')) haramView = true;
                        if (view.includes('kab')) kaabaView = true;
                    });
                });
                pkg.makkah_hotel.haram_view = haramView;
                pkg.makkah_hotel.kaaba_view = kaabaView;
            }
            pkg.makkah_hotel.selected_room_id = minRoom?.id ?? '';
            pkg.makkah_hotel.selected_room_index = minRoomIndex;
            pkg.makkah_hotel.selected_room_name = minRoom?.name ?? '';
            pkg.makkah_hotel.selected_board_name = minRate?.board_name ?? '';
            pkg.makkah_hotel.selected_room_units = selectedRoomUnits;
            pkg.pricing.makkah_hotel_price = newHotelPrice;
            pkg.pricing.total_price = Number(pkg.pricing.total_price || pkg.total_price || 0) - oldHotelPrice + newHotelPrice;
        } else if (cityName === 'Madinah') {
            const oldHotelPrice = Number(pkg?.pricing?.madinah_hotel_price ?? pkg?.madinah_hotel?.price) || 0;
            pkg.madinah_hotel.first_image = [];
            pkg.madinah_hotel.id = confirmHotel?.id;
            pkg.madinah_hotel.images = [];
            pkg.madinah_hotel.location = confirmHotel?.location;
            pkg.madinah_hotel.name = confirmHotel?.name;
            pkg.madinah_hotel.provider = confirmHotel?.provider;
            pkg.madinah_hotel.provider_code = confirmHotel?.provider_code;
            pkg.madinah_hotel.rooms = annotatedRooms;
            pkg.madinah_hotel.star_rating = confirmHotel?.metadata?.stars;
            pkg.madinah_hotel.price = newHotelPrice;
            pkg.madinah_hotel.selected_rate_index = minRateIndex;
            pkg.madinah_hotel.selected_rate_key = minRate?.rate_key ?? '';
            pkg.madinah_hotel.selected_room_id = minRoom?.id ?? '';
            pkg.madinah_hotel.selected_room_index = minRoomIndex;
            pkg.madinah_hotel.selected_room_name = minRoom?.name ?? '';
            pkg.madinah_hotel.selected_board_name = minRate?.board_name ?? '';
            pkg.madinah_hotel.selected_room_units = selectedRoomUnits;
            if (confirmHotel?.provider !== 'custom') {
                pkg.madinah_hotel.haram_view = false;
                pkg.madinah_hotel.kaaba_view = false;
            } else {
                let haramView = false;
                let kaabaView = false;
                (confirmHotel?.rooms || []).forEach(room => {
                    (room.rates || []).forEach(rate => {
                        const view = (rate?.metadata?.view || '').toLowerCase();
                        if (view.includes('haram')) haramView = true;
                        if (view.includes('kab')) kaabaView = true;
                    });
                });
                pkg.madinah_hotel.haram_view = haramView;
                pkg.madinah_hotel.kaaba_view = kaabaView;
            }
            pkg.pricing.madinah_hotel_price = newHotelPrice;
            pkg.pricing.total_price = Number(pkg.pricing.total_price || pkg.total_price || 0) - oldHotelPrice + newHotelPrice;
        }

        if (totalPax > 0) {
            pkg.pricing.price_per_person = pkg.pricing.total_price / totalPax;
            pkg.price_per_person = pkg.pricing.price_per_person;
        }
        pkg.total_price = pkg.pricing.total_price;

        // Push new hotel details into the parent ListingCard's hotelDetailsCache
        if (onHotelCacheUpdate && confirmHotel?.id) {
            const detail = hotelDetailsCache[confirmHotel.id];
            onHotelCacheUpdate(confirmHotel.id, {
                loading: false,
                address: detail?.address || confirmHotel?.location?.address || '',
                all_images: detail?.all_images || [],
            });
        }

        if (onApply) {
            onApply(pkg, {
                cityName,
                selectedHotel: confirmHotel,
                selectedRoom: minRoom,
                selectedRate: minRate,
            });
        }

        setConfirmOpen(false);
        setRevisionDetailOpen(false);
        onClose();
    };

    const currentHotelName = cityName === 'Makkah' ? pkg?.makkah_hotel?.name : pkg?.madinah_hotel?.name;
    const currentHotelPrice = cityName === 'Makkah'
        ? (pkg?.pricing?.makkah_hotel_price ?? pkg?.makkah_hotel?.price)
        : (pkg?.pricing?.madinah_hotel_price ?? pkg?.madinah_hotel?.price);
    const currentHotelStars = cityName === 'Makkah' ? pkg?.makkah_hotel?.star_rating : pkg?.madinah_hotel?.star_rating;

    // Single room: keep metadata.min_price.
    // Multi room / Hotelston sequences: one cheapest rate per slot, sum prices.
    const searchRooms = pkg?.original_request?.rooms || [];
    const confirmNeedsSlotResolve = confirmHotel && (
        (Array.isArray(searchRooms) && searchRooms.length > 1)
        || (isHotelstonProvider(confirmHotel) && collectHotelstonSeqNos(confirmHotel).length > 1)
    );
    const multiRoomMatch = confirmNeedsSlotResolve
        ? resolveMultiRoomSelection(confirmHotel, searchRooms)
        : null;
    const confirmNewHotelPrice = multiRoomMatch
        ? multiRoomMatch.price
        : Number(confirmHotel?.metadata?.min_price);

    return (
        <>
            <Modal
                opened={confirmOpen && !isRevisionMode}
                onClose={() => setConfirmOpen(false)}
                title={
                    <div className={styles.confirmHeader}>
                        <div className={styles.confirmIcon}><FiCheckCircle size={18} /></div>
                        <Text fw={700} size="lg">Confirm Hotel Selection</Text>
                    </div>
                }
                centered
                size="md"
                radius="lg"
                transitionProps={{ transition: 'pop', duration: 200 }}
                zIndex={300}
            >
                {confirmHotel && (
                    <Stack gap="md">
                        {ratesLoading && (
                            <Group justify="center" gap="xs">
                                <Loader size="xs" color="teal" />
                                <Text size="xs" c="dimmed">Fetching exchange rates…</Text>
                            </Group>
                        )}
                        {ratesError && !ratesLoading && (
                            <Alert icon={<MdErrorOutline size={14} />} color="red" variant="light" py="xs">
                                <Group justify="space-between" align="center" gap="xs">
                                    <Text size="xs" style={{ flex: 1 }}>{ratesError}</Text>
                                    <Button size="xs" variant="light" color="red" leftSection={<FiRefreshCw size={11} />} onClick={handleRetry}>Retry</Button>
                                </Group>
                            </Alert>
                        )}

                        <div className={`${styles.compareCard} ${styles.compareCurrent}`}>
                            <div className={styles.compareLabel} style={{ color: '#dc2626' }}>Current Hotel</div>
                            <div className={styles.compareName}>{currentHotelName}</div>
                            <div className={styles.compareMeta}>
                                {renderStars(currentHotelStars, 10)}
                                <span className={styles.nightsPill}><FaMoon size={9} /> {hotel?.nights} {hotel?.nights === 1 ? 'night' : 'nights'}</span>
                                <span>{moment(hotel?.check_in).format('DD MMM')} → {moment(hotel?.check_out).format('DD MMM YYYY')}</span>
                            </div>
                            <div className={styles.compareRow}>
                                <span>Per night</span>
                                <strong><PriceDisplay price={currentHotelPrice / confirmDaysDiff} currency={pkg?.pricing?.currency} /></strong>
                            </div>
                            <div className={styles.compareRow}>
                                <span>Total</span>
                                <strong style={{ color: '#dc2626' }}><PriceDisplay price={currentHotelPrice} currency={pkg?.pricing?.currency} /></strong>
                            </div>
                        </div>

                        <div className={styles.compareVs}>vs</div>

                        <div className={`${styles.compareCard} ${styles.compareNew}`}>
                            <div className={styles.compareLabel} style={{ color: '#16a34a' }}>New Hotel</div>
                            <div className={styles.compareName}>{confirmHotel?.name}</div>
                            <div className={styles.compareMeta}>
                                {renderStars(confirmHotelStars, 10)}
                                <span className={styles.nightsPill}><FaMoon size={9} /> {hotel?.nights} {hotel?.nights === 1 ? 'night' : 'nights'}</span>
                                <span>{moment(hotel?.check_in).format('DD MMM')} → {moment(hotel?.check_out).format('DD MMM YYYY')}</span>
                            </div>
                            <div className={styles.compareRow}>
                                <span>Per night</span>
                                <strong><PriceDisplay price={Number(confirmNewHotelPrice) / confirmDaysDiff} currency={confirmHotel?.metadata?.currency} /></strong>
                            </div>
                            <div className={styles.compareRow}>
                                <span>Total</span>
                                <strong style={{ color: '#16a34a' }}><PriceDisplay price={Number(confirmNewHotelPrice)} currency={confirmHotel?.metadata?.currency} /></strong>
                            </div>
                        </div>

                        <div className={styles.confirmActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setConfirmOpen(false)}>Cancel</button>
                            <button
                                type="button"
                                className={styles.applyBtn}
                                disabled={ratesLoading || (currencyMismatch && (!!ratesError || convertedPrice === null))}
                                onClick={() => ApplyPriceChanges()}
                            >
                                <FiCheckCircle size={15} /> Apply Changes
                            </button>
                        </div>
                    </Stack>
                )}
            </Modal>

            <RevisionHotelDetailModal
                opened={revisionDetailOpen && isRevisionMode}
                onClose={() => setRevisionDetailOpen(false)}
                selectedHotel={confirmHotel}
                stayHotel={hotel}
                cityName={cityName}
                pkg={pkg}
                failedService={failedService}
                onConfirm={(selection) => ApplyPriceChanges(selection)}
            />

            <Modal
                opened={opened}
                onClose={onClose}
                fullScreen
                withCloseButton={false}
                padding={0}
                radius={0}
                transitionProps={{ transition: 'fade', duration: 200 }}
                classNames={{
                    content: styles.modalContent,
                    body: `${styles.modalBody}${revisionDetailOpen ? ` ${styles.modalBodyLocked}` : ''}`,
                }}
            >
                <div className={styles.modalShell}>
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerIcon}><HiOutlineBuildingOffice2 size={20} /></div>
                            <div className={styles.headerText}>
                                <h2 className={styles.headerTitle}>Change Hotel</h2>
                                <p className={styles.headerSub}>Find Better Accommodation in {cityName}</p>
                            </div>
                            <span className={styles.cityBadge}>{cityName}</span>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                type="button"
                                className={styles.headerRefreshBtn}
                                onClick={handleRefreshSearch}
                                disabled={loading}
                                aria-label={loading ? 'Refreshing search' : 'Refresh Search'}
                            >
                                <FiRefreshCw size={14} />
                                <span className={styles.headerRefreshLabel}>
                                    {loading ? 'Refreshing...' : 'Refresh Search'}
                                </span>
                            </button>
                            <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
                                <IoMdClose size={22} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.currentBar}>
                        <div className={styles.currentBarInner}>
                            <div>
                                <div className={styles.currentLabel}>Currently Selected</div>
                                <div className={styles.currentName}>{currentHotelName}</div>
                                <div className={styles.currentMeta}>
                                    <span className={styles.nightsPill}>
                                        <FaMoon size={9} /> {hotel?.nights} {hotel?.nights === 1 ? 'night' : 'nights'}
                                    </span>
                                    <span>{moment(hotel?.check_in).format('DD MMM')} → {moment(hotel?.check_out).format('DD MMM YYYY')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.toolbar} ${styles.toolbarMobile}`}>
                        {renderSearchInput()}
                        <button type="button" className={styles.filterBtn} onClick={() => setFilterDrawerOpen(true)}>
                            <FiSliders size={14} />
                            Filters
                            {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
                        </button>
                    </div>

                    {activeFilterCount > 0 && (
                        <div className={`${styles.activeChips} ${styles.toolbarMobile}`}>
                            {sortBy !== 'default' && (
                                <span className={styles.chip} onClick={() => setSortBy('default')}>
                                    {sortBy === 'price_asc' ? 'Price ↑' : 'Price ↓'} ✕
                                </span>
                            )}
                            {selectedStars.map(s => (
                                <span key={s} className={styles.chip} onClick={() => toggleFilter(setSelectedStars, s)}>
                                    {s === 'unrated' ? 'Unrated' : `${s}★`} ✕
                                </span>
                            ))}
                            <button type="button" className={styles.chipClear} onClick={clearAllFilters}>Clear all</button>
                        </div>
                    )}

                    <div className={styles.pageContainer}>
                        <div className={styles.contentArea}>
                            <aside className={styles.filterSidebar}>
                                {renderFilterPanel('desktop-')}
                            </aside>

                            <main className={styles.resultsArea}>
                                {loading && hotels.length === 0 && (
                                    <div className={styles.stateBox}>
                                        <Loader size="md" color="teal" />
                                        <p className={styles.stateText}>Searching for available hotels in {cityName}…</p>
                                    </div>
                                )}

                                {loading && hotels.length > 0 && (
                                    <div className={styles.streamingBanner}>
                                        <Loader size="xs" color="teal" />
                                        <span>Finding more stays for you…</span>
                                    </div>
                                )}

                                {error && !loading && hotels.length === 0 && (
                                    <div className={styles.errorBox}>
                                        <MdErrorOutline size={20} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {!loading && !error && hotels.length === 0 && (
                                    <div className={styles.stateBox}>
                                        <HiOutlineBuildingOffice2 size={36} color="#9ca3af" />
                                        <p className={styles.stateText}>No alternative hotels found for {cityName}.</p>
                                    </div>
                                )}

                                {hotels.length > 0 && (
                                    <>
                                        <div className={styles.resultsHeader}>
                                            <div>
                                                <div className={styles.resultsCount}>
                                                    Showing {filteredHotels.length} Hotels
                                                </div>
                                                <div className={styles.resultsSub}>Alternative Hotels in {cityName}</div>
                                            </div>
                                            {renderSearchInput(styles.resultsSearch)}
                                        </div>

                                        {filteredHotels.length === 0 ? (
                                            <div className={styles.stateBox}>
                                                <p className={styles.stateText}>No hotels match your filters. Try adjusting them.</p>
                                                <button type="button" className={styles.clearFiltersBtn} style={{ width: 'auto', padding: '10px 24px' }} onClick={clearAllFilters}>
                                                    Clear Filters
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={styles.hotelList}>
                                                {visibleHotels.map((item, index) => renderHotelCard(item, index))}
                                                <UmrahPagination hasMore={hasMore} onLoadMore={loadMore} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            </Modal>

            <Drawer
                opened={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                title={<Text fw={700} size="md">Filters &amp; Sort</Text>}
                position="bottom"
                size="88%"
                radius="lg"
                overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
                transitionProps={{ duration: 200 }}
                withinPortal
                lockScroll
                trapFocus={false}
                zIndex={400}
            >
                <div style={{ overflowY: 'auto', paddingBottom: 80 }}>
                    {renderFilterPanel('drawer-')}
                </div>
                <div className={styles.drawerFooter}>
                    {activeFilterCount > 0 && (
                        <button type="button" className={styles.drawerClearBtn} onClick={clearAllFilters}>
                            Clear All
                        </button>
                    )}
                    <button type="button" className={styles.drawerShowBtn} onClick={() => setFilterDrawerOpen(false)}>
                        Show {filteredHotels.length} {filteredHotels.length === 1 ? 'Hotel' : 'Hotels'}
                    </button>
                </div>
            </Drawer>
        </>
    );
}
