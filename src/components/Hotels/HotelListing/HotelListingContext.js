"use client";
import { useEffect, useCallback, useRef } from "react";
import { createContext, useContext, useState, useMemo } from "react";
const HotelListContext = createContext();
import { ConvertPrice } from "@/components/Currency/ConvertPrice";
import { useCurrency } from "@/util/currency";
import { groupSimilarHotels } from "@/util/groupSimilarHotels";

function getHolyCity(city, location) {
    const text = `${city || ""} ${location || ""}`.toLowerCase();
    if (text.includes("makkah") || text.includes("mecca") || text.includes("makka")) {
        return "makkah";
    }
    if (
        text.includes("madinah") ||
        text.includes("medina") ||
        text.includes("madina") ||
        text.includes("al-madinah")
    ) {
        return "madinah";
    }
    return null;
}

function getDistanceLandmarkLabel(holyCity) {
    return holyCity === "madinah" ? "from Al-Masjid an-Nabawi" : "from Masjid al-Haram";
}

function getDistanceFilterTitle(holyCity) {
    return holyCity === "madinah"
        ? "Distance from Al-Masjid an-Nabawi"
        : "Distance from Masjid al-Haram";
}

function parseDistanceStringToMeters(distanceStr) {
    if (!distanceStr) return null;
    const match = String(distanceStr).match(/([\d.]+)\s*(m|km)/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    return match[2].toLowerCase() === "km" ? Math.round(value * 1000) : Math.round(value);
}

function parseDistanceRange(rangeStr) {
    switch (rangeStr) {
        case "0-500":
            return [0, 500];
        case "500-1000":
            return [500, 1000];
        case "1000-2000":
            return [1000, 2000];
        case "2000+":
            return [2000, Infinity];
        default:
            return null;
    }
}

function hotelMatchesDistance(distanceMeters, selectedDistances) {
    if (!selectedDistances?.length) return true;
    return selectedDistances.some((key) => {
        const range = parseDistanceRange(key);
        return range && distanceMeters >= range[0] && distanceMeters <= range[1];
    });
}

export function HotelListProvider({ children, hotels, place, city, location }) {
    const [convertedHotels, setConvertedHotels] = useState([]);
    const [search, setSearch] = useState(null);
    const { currency, rates } = useCurrency();
    const [star, setStar] = useState([]);
    const [hotelNames, setHotelNames] = useState([]);
    const [sort, setSort] = useState("recommended");
    const [meal, setMeal] = useState([]);
    const [distances, setDistances] = useState([]);
    const [distanceCache, setDistanceCache] = useState({});
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(0);
    const [resetPrice, setResetPrice] = useState(0);
    const [priceRange, setPriceRange] = useState([0, 0]);
    const [visibleCount, setVisibleCount] = useState(10);
    const itemsPerPage = 10;
    const holyCity = getHolyCity(city, location);
    const isMakkah = holyCity === "makkah";
    const isMadinah = holyCity === "madinah";
    const showDistance = Boolean(holyCity);
    const distanceLandmarkLabel = getDistanceLandmarkLabel(holyCity);
    const distanceFilterTitle = getDistanceFilterTitle(holyCity);
    const distanceFetchStarted = useRef(new Set());
    const distanceFetchGeneration = useRef(0);

    useEffect(() => {
        if (hotels && hotels.length > 0) {
            const hotelListNew = hotels.map((item) => {
                const { newcurrency, newprice } = ConvertPrice(item.metadata?.min_price, item.metadata?.currency, currency, rates);
                return {
                    ...item,
                    'currency': newcurrency,
                    'price': newprice,
                };
            });
            const prices = hotelListNew.map((h) => h?.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            setMinPrice(min);
            setMaxPrice(max);
            setPriceRange([min, max]);
            const hotelNames = [...new Set(hotelListNew.map((h) => h.name))];
            setHotelNames(hotelNames);
            setConvertedHotels(hotelListNew);
        } else {
            setConvertedHotels([]);
        }
    }, [hotels, rates, currency]);

    const fetchSingleDistance = useCallback(async ({ id, hotel, lat, lon, cityKey, generation }) => {
        setDistanceCache((prev) => {
            if (prev[id]) return prev;
            return { ...prev, [id]: { loading: true } };
        });

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/api/bulk-route`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": process.env.NEXT_PUBLIC_AI_API_TOKEN,
                },
                body: JSON.stringify({ hotel, city: cityKey, lat, lon }),
            });
            const r = await res.json();

            // Ignore stale responses after a new search / city change
            if (generation !== distanceFetchGeneration.current) return;

            setDistanceCache((prev) => ({
                ...prev,
                [id]:
                    r && !r.error
                        ? {
                              loading: false,
                              distance: r.distance,
                              walking: r.walking,
                              difficulty: r.difficulty,
                              distanceMeters: parseDistanceStringToMeters(r.distance),
                          }
                        : { loading: false, error: true },
            }));
        } catch {
            if (generation !== distanceFetchGeneration.current) return;
            setDistanceCache((prev) => ({ ...prev, [id]: { loading: false, error: true } }));
        }
    }, []);

    // Clear distance state on city change, or when a new search resets results to empty
    useEffect(() => {
        distanceFetchGeneration.current += 1;
        setDistances([]);
        setDistanceCache({});
        distanceFetchStarted.current = new Set();
    }, [holyCity]);

    useEffect(() => {
        if (hotels?.length) return;
        distanceFetchGeneration.current += 1;
        setDistances([]);
        setDistanceCache({});
        distanceFetchStarted.current = new Set();
    }, [hotels]);

    // Fetch distances one-by-one; each completed hotel updates the UI immediately
    useEffect(() => {
        if (!holyCity || !convertedHotels?.length) return;

        let cancelled = false;
        const generation = distanceFetchGeneration.current;

        const runQueue = async () => {
            for (const h of convertedHotels) {
                if (cancelled || generation !== distanceFetchGeneration.current) break;

                const id = h?.id;
                if (!id || !h?.name || distanceFetchStarted.current.has(id)) continue;

                const lat = h?.location?.latitude;
                const lon = h?.location?.longitude;
                // Wait until coords exist (may arrive later via Places geocode)
                if (lat == null || lon == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
                    continue;
                }

                distanceFetchStarted.current.add(id);
                const hotelLabel = [h.name, h?.location?.address].filter(Boolean).join(", ");
                await fetchSingleDistance({
                    id,
                    hotel: hotelLabel,
                    lat,
                    lon,
                    cityKey: holyCity,
                    generation,
                });
            }
        };

        runQueue();

        return () => {
            cancelled = true;
        };
    }, [holyCity, convertedHotels, fetchSingleDistance]);

    const resetPriceRange = () => {
        setPriceRange([minPrice, maxPrice]);
        setResetPrice((prev) => prev + 1);
    };

    const resetFilters = () => {
        setSearch(null);
        setStar([]);
        setMeal([]);
        setDistances([]);
        setSort("recommended");
        resetPriceRange();
        setVisibleCount(10);
    };


    function isExactNameMatch(query, hotelName) {
        if (!query || !hotelName) return false;
        return hotelName.toLowerCase().trim() === query.toLowerCase().trim();
    }

    function getPlaceExactMatchScore(place, hotelName) {
        if (!place || !hotelName) return 0;
        if (hotelName.toLowerCase().trim() === place.toLowerCase().trim()) return 100;
        return 0;
    }

    const applySecondaryFilters = (hotelList, { includeDistance = true, includeStar = true } = {}) => {
        let filtered = [...hotelList];

        filtered = filtered.filter(
            (h) => h.price >= priceRange[0] && h.price <= priceRange[1]
        );

        if (includeStar && star.length > 0) {
            filtered = filtered.filter((h) => {
                const starValue = Math.round(Number(h.metadata?.stars));
                const isNumericStar = !isNaN(starValue) && starValue >= 1 && starValue <= 5;

                if (star.includes(0) && (!isNumericStar)) {
                    return true;
                }

                return star.includes(starValue);
            });
        }

        if (meal.length > 0) {
            filtered = filtered.filter((h) =>
                h.rooms?.some((room) =>
                    room.rates?.some((rate) =>
                        meal.includes(rate.board_name.toLowerCase())
                    )
                )
            );
        }

        if (includeDistance && showDistance && distances.length > 0) {
            filtered = filtered.filter((h) => {
                const dist = distanceCache[h?.id];
                // Only count resolved distances so facet counts match "properties found"
                if (!dist || dist.loading || dist.error || dist.distanceMeters == null) return false;
                return hotelMatchesDistance(dist.distanceMeters, distances);
            });
        }

        return filtered;
    };

    const sortByOption = (a, b) => {
        if (sort === "recommended") return 0;
        if (sort === "price-asc") return a?.price - b?.price;
        if (sort === "price-desc") return b?.price - a?.price;
        if (sort === "name-asc") return a.name.localeCompare(b.name);
        return 0;
    };

    const sortByNameAndPlace = (hotels, placeQuery) => {
        return [...hotels].sort((a, b) => {
            const scoreA = placeQuery ? getPlaceExactMatchScore(placeQuery, a.name) : 0;
            const scoreB = placeQuery ? getPlaceExactMatchScore(placeQuery, b.name) : 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            if (a.provider === "custom" && b.provider !== "custom") return -1;
            if (a.provider !== "custom" && b.provider === "custom") return 1;
            return sortByOption(a, b);
        });
    };

    const filteredHotels = useMemo(() => {
        const searchQuery = search?.trim() || "";
        const placeQuery = place?.trim() || "";

        if (searchQuery) {
            const nameMatches = convertedHotels.filter((h) =>
                isExactNameMatch(searchQuery, h.name)
            );
            const otherHotels = convertedHotels.filter((h) =>
                !isExactNameMatch(searchQuery, h.name)
            );

            const sortedNameMatches = [...nameMatches].sort(sortByOption);
            const filteredOthers = applySecondaryFilters(otherHotels);
            const sortedOthers = [...filteredOthers].sort(sortByOption);

            return [...sortedNameMatches, ...sortedOthers];
        }

        let result = applySecondaryFilters(convertedHotels);

        if (placeQuery) {
            result = sortByNameAndPlace(result, placeQuery);
        } else if (sort !== "recommended") {
            result = [...result].sort(sortByOption);
        }

        return result;
    }, [convertedHotels, search, priceRange, star, meal, distances, distanceCache, showDistance, sort, place, minPrice, maxPrice]);

    // Facet counts must use the same grouping as "properties found"
    const distanceCounts = useMemo(() => {
        const counts = { "0-500": 0, "500-1000": 0, "1000-2000": 0, "2000+": 0 };
        if (!showDistance) return counts;

        const baseHotels = applySecondaryFilters(convertedHotels, { includeDistance: false });
        const groupedBase = groupSimilarHotels(baseHotels);

        groupedBase.forEach((h) => {
            const dist = distanceCache[h?.id];
            if (!dist || dist.loading || dist.error || dist.distanceMeters == null) return;
            const meters = dist.distanceMeters;
            if (meters >= 0 && meters <= 500) counts["0-500"] += 1;
            if (meters >= 500 && meters <= 1000) counts["500-1000"] += 1;
            if (meters >= 1000 && meters <= 2000) counts["1000-2000"] += 1;
            if (meters >= 2000) counts["2000+"] += 1;
        });
        return counts;
    }, [convertedHotels, priceRange, star, meal, distanceCache, showDistance, minPrice, maxPrice]);

    const starCounts = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
        // Filter-then-group per rating so facet count matches "properties found"
        // when that rating is selected (grouping after filter, same as results).
        const baseHotels = applySecondaryFilters(convertedHotels, { includeStar: false });

        const matchesRating = (hotel, rating) => {
            const starValue = Math.round(Number(hotel.metadata?.stars));
            const isNumericStar = !isNaN(starValue) && starValue >= 1 && starValue <= 5;
            if (rating === 0) return !isNumericStar;
            return isNumericStar && starValue === rating;
        };

        [5, 4, 3, 2, 1, 0].forEach((rating) => {
            const matching = baseHotels.filter((h) => matchesRating(h, rating));
            counts[rating] = groupSimilarHotels(matching).length;
        });

        return counts;
    }, [convertedHotels, priceRange, meal, distances, distanceCache, showDistance, minPrice, maxPrice]);

    useEffect(() => {
        setVisibleCount(10);
    }, [search, star, meal, distances, priceRange, sort]);

    const groupedHotels = useMemo(
        () => groupSimilarHotels(filteredHotels),
        [filteredHotels]
    );

    const visibleHotels = useMemo(() => {
        return groupedHotels.slice(0, visibleCount);
    }, [groupedHotels, visibleCount]);

    const hasMore = visibleCount < groupedHotels.length;

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + itemsPerPage, groupedHotels.length));
    };

    return (
        <HotelListContext.Provider
            value={{
                hotels: visibleHotels,
                filteredHotels,
                totalHotels: groupedHotels.length,
                setSearch,
                setPriceRange,
                setStar,
                setSort,
                setMeal,
                distances,
                setDistances,
                distanceCounts,
                starCounts,
                distanceCache,
                holyCity,
                isMakkah,
                isMadinah,
                showDistance,
                distanceLandmarkLabel,
                distanceFilterTitle,
                hasMore,
                loadMore,
                itemsPerPage,
                minPrice,
                maxPrice,
                sort,
                star,
                meal,
                search,
                priceRange,
                hotelNames,
                resetPrice,
                resetPriceRange,
                resetFilters,
            }}
        >
            {children}
        </HotelListContext.Provider>
    );
}

export function useHotelList() {
    return useContext(HotelListContext);
}
