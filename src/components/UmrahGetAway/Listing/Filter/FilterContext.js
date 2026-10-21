'use client';
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';

// Distance range string → [minMeters, maxMeters]
function parseDistanceRange(rangeStr) {
  switch (rangeStr) {
    case '0-500':     return [0, 500];
    case '500-1000':  return [500, 1000];
    case '1000-2000': return [1000, 2000];
    case '2000+':     return [2000, Infinity];
    default:          return null;
  }
}

// Parse API distance string e.g. "400 m" or "1.2 km" → metres
function parseDistanceStringToMeters(distanceStr) {
  if (!distanceStr) return null;
  const match = distanceStr.match(/([\d.]+)\s*(m|km)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2].toLowerCase() === 'km' ? Math.round(value * 1000) : Math.round(value);
}

function normalizeCity(city) {
  if (!city) return city;
  const c = String(city).toLowerCase();
  if (c === 'makkah') return 'Makkah';
  if (c === 'madinah' || c === 'madina') return 'Madinah';
  return city.charAt(0).toUpperCase() + city.slice(1);
}

function cacheEntryFromResult(r) {
  if (r && !r.error) {
    return {
      loading: false,
      distance: r.distance,
      walking: r.walking,
      difficulty: r.difficulty,
      distanceMeters: parseDistanceStringToMeters(r.distance),
    };
  }
  return { loading: false, error: true };
}

const BULK_ROUTE_BATCH_SIZE = 10;

const FilterContext = createContext();

export function FilterProvider({ children, packages }) {
  // Price filters
  const [priceType, setPriceTypeState] = useState('pp'); // 'total' or 'pp' (per person)
  const priceTypeRef = useRef(priceType);
  priceTypeRef.current = priceType;
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [currency, setCurrency] = useState('');

  // Makkah Hotel filters
  const [makkahHotelSearch, setMakkahHotelSearch] = useState('');
  const [makkahRatings, setMakkahRatings] = useState([]);
  const [makkahHaramView, setMakkahHaramView] = useState(false);
  const [makkahKaabaView, setMakkahKaabaView] = useState(false);
  const [makkahHotelNames, setMakkahHotelNames] = useState([]);
  const [makkahDistances, setMakkahDistances] = useState([]);

  // Madinah Hotel filters
  const [madinahHotelSearch, setMadinahHotelSearch] = useState('');
  const [madinahRatings, setMadinahRatings] = useState([]);
  const [madinahHaramView, setMadinahHaramView] = useState(false);
  const [madinahHotelNames, setMadinahHotelNames] = useState([]);
  const [madinahDistances, setMadinahDistances] = useState([]);

  // Sorting
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'nearest_makkah' | 'nearest_madinah' | 'price_asc' | 'price_desc'

  // Distance cache keyed by hotel id.
  // Each entry: { loading: true } | { loading: false, distance, walking, difficulty, distanceMeters } | { loading: false, error: true }
  const [googleDistanceCache, setGoogleDistanceCache] = useState({});
  const distanceCacheRef = useRef({});

  /**
   * Fetch distances in batches of 10 via POST /api/bulk-route
   * body: { hotels: [{ hotel, city, lat, lon }, ...] }
   * response: { total, results: [...] } — mapped back by request index
   */
  const fetchBulkDistances = useCallback(async (hotelItems = []) => {
    const toFetch = hotelItems.filter(
      (item) => item?.id && !distanceCacheRef.current[item.id]
    );
    if (!toFetch.length) return;

    // Mark loading + reserve ids so parallel callers don't duplicate
    const loadingMap = {};
    toFetch.forEach((item) => {
      loadingMap[item.id] = { loading: true };
      distanceCacheRef.current[item.id] = { loading: true };
    });
    setGoogleDistanceCache((prev) => ({ ...prev, ...loadingMap }));

    for (let i = 0; i < toFetch.length; i += BULK_ROUTE_BATCH_SIZE) {
      const batch = toFetch.slice(i, i + BULK_ROUTE_BATCH_SIZE);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bulk-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotels: batch.map(({ hotel, city, lat, lon }) => ({
              hotel,
              city: normalizeCity(city),
              lat,
              lon,
            })),
          }),
        });
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];

        const updates = {};
        batch.forEach((item, idx) => {
          updates[item.id] = cacheEntryFromResult(results[idx]);
          distanceCacheRef.current[item.id] = updates[item.id];
        });
        setGoogleDistanceCache((prev) => ({ ...prev, ...updates }));
      } catch {
        const updates = {};
        batch.forEach((item) => {
          updates[item.id] = { loading: false, error: true };
          distanceCacheRef.current[item.id] = updates[item.id];
        });
        setGoogleDistanceCache((prev) => ({ ...prev, ...updates }));
      }
    }
  }, []);

  /** Single-hotel helper for ListingCard / UpdateHotel — uses same bulk API */
  const fetchSingleDistance = useCallback(
    async (item) => {
      await fetchBulkDistances([item]);
    },
    [fetchBulkDistances]
  );

  // Collect unique hotels from packages and fetch in batches of 10
  useEffect(() => {
    if (!packages?.length) return;
    const hotels = [];
    const seen = new Set();
    packages.forEach((pkg) => {
      const mh = pkg?.makkah_hotel;
      if (mh?.id && mh?.name && !seen.has(mh.id)) {
        seen.add(mh.id);
        hotels.push({
          id: mh.id,
          hotel: [mh.name, mh?.location?.address].filter(Boolean).join(', '),
          city: 'makkah',
          lat: mh?.location?.latitude,
          lon: mh?.location?.longitude,
        });
      }
      const mdh = pkg?.madinah_hotel;
      if (mdh?.id && mdh?.name && !seen.has(mdh.id)) {
        seen.add(mdh.id);
        hotels.push({
          id: mdh.id,
          hotel: [mdh.name, mdh?.location?.address].filter(Boolean).join(', '),
          city: 'madinah',
          lat: mdh?.location?.latitude,
          lon: mdh?.location?.longitude,
        });
      }
    });
    fetchBulkDistances(hotels);
  }, [packages, fetchBulkDistances]);

  const applyPriceBounds = useCallback((type, pkgList) => {
    if (!pkgList?.length) return;
    const prices = pkgList.map(pkg =>
      type === 'total' ? pkg.total_price : pkg.price_per_person
    );
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    setCurrency(pkgList[0].currency || '');
    setMinPrice(min);
    setMaxPrice(max);
    setPriceRange([min, max]);
  }, []);

  // Batch price-type + bounds in one render (avoids mismatched filter → card unmount → API refetch)
  const handlePriceTypeChange = useCallback((type) => {
    setPriceTypeState(type);
    applyPriceBounds(type, packages);
  }, [packages, applyPriceBounds]);

  // Initialize price range and hotel names when packages load
  useEffect(() => {
    if (packages && packages.length > 0) {
      applyPriceBounds(priceTypeRef.current, packages);

      const makkahNames = [...new Set(packages.map(pkg => pkg.makkah_hotel?.name).filter(Boolean))];
      const madinahNames = [...new Set(packages.map(pkg => pkg.madinah_hotel?.name).filter(Boolean))];

      setMakkahHotelNames(makkahNames);
      setMadinahHotelNames(madinahNames);
    }
  }, [packages, applyPriceBounds]);

  // Reset filters function
  const resetFilters = () => {
    setPriceRange([minPrice, maxPrice]);
    setMakkahHotelSearch('');
    setMakkahRatings([]);
    setMakkahHaramView(false);
    setMakkahKaabaView(false);
    setMakkahDistances([]);
    setMadinahHotelSearch('');
    setMadinahRatings([]);
    setMadinahHaramView(false);
    setMadinahDistances([]);
    setSortBy('default');
  };

  // Filtering logic
  const filteredPackages = useMemo(() => {
    if (!packages || packages.length === 0) return [];

    let result = [...packages];

    // Price filter
    result = result.filter(pkg => {
      const price = priceType === 'total' ? pkg.total_price : pkg.price_per_person;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Makkah Hotel Name Search
    if (makkahHotelSearch.trim() !== '') {
      result = result.filter(pkg =>
        pkg.makkah_hotel?.name?.toLowerCase().includes(makkahHotelSearch.toLowerCase())
      );
    }

    // Makkah Star Rating
    if (makkahRatings.length > 0) {
      result = result.filter(pkg => {
        const starValue = Number(pkg.makkah_hotel?.star_rating || 0);
        const isNumericStar = !isNaN(starValue) && starValue > 0;

        // allow unrated hotels if 0 selected
        if (makkahRatings.includes(0) && !isNumericStar) {
          return true;
        }

        // ⭐ show hotels with rating >= selected rating
        return makkahRatings.some(rating => isNumericStar && starValue === rating);
      });
    }


    // Makkah Haram View
    if (makkahHaramView) {
      result = result.filter(pkg => pkg.makkah_hotel?.haram_view === true);
    }

    // Makkah Kaaba View
    if (makkahKaabaView) {
      result = result.filter(pkg => pkg.makkah_hotel?.kaaba_view === true);
    }

    // Madinah Hotel Name Search
    if (madinahHotelSearch.trim() !== '') {
      result = result.filter(pkg =>
        pkg.madinah_hotel?.name?.toLowerCase().includes(madinahHotelSearch.toLowerCase())
      );
    }

    // Madinah Star Rating
    if (madinahRatings.length > 0) {
      result = result.filter(pkg => {
        const starValue = Number(pkg.madinah_hotel?.star_rating || 0);
        const isNumericStar = !isNaN(starValue) && starValue > 0;

        // allow unrated hotels if 0 selected
        if (madinahRatings.includes(0) && !isNumericStar) {
          return true;
        }

        // ⭐ show hotels with rating >= selected rating
        return madinahRatings.some(rating => isNumericStar && starValue === rating);
      });
    }

    // Madinah Haram View
    if (madinahHaramView) {
      result = result.filter(pkg => pkg.madinah_hotel?.haram_view === true);
    }

    // --- Makkah distance filter (Google only; pass-through while still loading) ---
    if (makkahDistances.length > 0) {
      result = result.filter(pkg => {
        const dist = googleDistanceCache[pkg.makkah_hotel?.id];
        if (!dist || dist.loading) return true; // still fetching — keep visible
        if (dist.error) return makkahDistances.includes('unknown');
        return makkahDistances.some(rangeStr => {
          const range = parseDistanceRange(rangeStr);
          return range && dist.distanceMeters >= range[0] && dist.distanceMeters <= range[1];
        });
      });
    }

    // --- Madinah distance filter (Google only; pass-through while still loading) ---
    if (madinahDistances.length > 0) {
      result = result.filter(pkg => {
        const dist = googleDistanceCache[pkg.madinah_hotel?.id];
        if (!dist || dist.loading) return true; // still fetching — keep visible
        if (dist.error) return madinahDistances.includes('unknown');
        return madinahDistances.some(rangeStr => {
          const range = parseDistanceRange(rangeStr);
          return range && dist.distanceMeters >= range[0] && dist.distanceMeters <= range[1];
        });
      });
    }

    // --- Sorting ---
    if (sortBy === 'nearest_makkah') {
      result = [...result].sort((a, b) => {
        const da = googleDistanceCache[a.makkah_hotel?.id];
        const db = googleDistanceCache[b.makkah_hotel?.id];
        const ma = (da && !da.loading && !da.error) ? da.distanceMeters : Infinity;
        const mb = (db && !db.loading && !db.error) ? db.distanceMeters : Infinity;
        return ma - mb;
      });
    } else if (sortBy === 'nearest_madinah') {
      result = [...result].sort((a, b) => {
        const da = googleDistanceCache[a.madinah_hotel?.id];
        const db = googleDistanceCache[b.madinah_hotel?.id];
        const ma = (da && !da.loading && !da.error) ? da.distanceMeters : Infinity;
        const mb = (db && !db.loading && !db.error) ? db.distanceMeters : Infinity;
        return ma - mb;
      });
    } else if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => {
        const pa = priceType === 'total' ? a.total_price : a.price_per_person;
        const pb = priceType === 'total' ? b.total_price : b.price_per_person;
        return pa - pb;
      });
    } else if (sortBy === 'price_desc') {
      result = [...result].sort((a, b) => {
        const pa = priceType === 'total' ? a.total_price : a.price_per_person;
        const pb = priceType === 'total' ? b.total_price : b.price_per_person;
        return pb - pa;
      });
    }

    return result;
  }, [
    packages,
    priceType,
    priceRange,
    makkahHotelSearch,
    makkahRatings,
    makkahHaramView,
    makkahKaabaView,
    makkahDistances,
    madinahHotelSearch,
    madinahRatings,
    madinahHaramView,
    madinahDistances,
    sortBy,
    googleDistanceCache,
  ]);

  const value = {
    // Price
    priceType,
    setPriceType: handlePriceTypeChange,
    minPrice,
    maxPrice,
    priceRange,
    setPriceRange,
    currency,

    // Makkah filters
    makkahHotelSearch,
    setMakkahHotelSearch,
    makkahRatings,
    setMakkahRatings,
    makkahHaramView,
    setMakkahHaramView,
    makkahKaabaView,
    setMakkahKaabaView,
    makkahHotelNames,
    makkahDistances,
    setMakkahDistances,

    // Madinah filters
    madinahHotelSearch,
    setMadinahHotelSearch,
    madinahRatings,
    setMadinahRatings,
    madinahHaramView,
    setMadinahHaramView,
    madinahHotelNames,
    madinahDistances,
    setMadinahDistances,

    // Sorting
    sortBy,
    setSortBy,

    // Google Distance Matrix cache (shared with ListingCard for display)
    googleDistanceCache,
    fetchSingleDistance,

    // Filtered data
    filteredPackages,

    // Actions
    resetFilters
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
