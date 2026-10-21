'use client'
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaSearch, FaMapMarkerAlt, FaStar, FaCalendarAlt } from "react-icons/fa";
import { useJsApiLoader } from "@react-google-maps/api";
import { IoCheckmarkCircle, IoLocationSharp, IoPeopleOutline, IoTimeOutline } from "react-icons/io5";
import { HiTicket } from "react-icons/hi2";
import { MdEdit, MdLocationOn } from "react-icons/md";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import moment from "moment";
import { DatePicker } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import PriceDisplay from "@/components/Currency/PriceDisplay";
import { useCurrency } from "@/util/currency";
import Filter, {
  getActivityCategories,
  getActivityDisplayPrice,
  getActivityDuration,
} from "./Filter";
import styles from "./Activities.module.css";
import ActivityListingLoader, {
  FilterSidebarSkeleton,
} from "@/components/Loader/ActivityListingLoader";

const GOOGLE_MAPS_LIBRARIES = ['places'];
const PAGE_SIZE = 10;

const slugifyCity = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

const parseCountryFromSecondary = (secondaryText) => {
  if (!secondaryText) return '';
  const parts = secondaryText.split(',');
  return parts[parts.length - 1].trim();
};

const humanizeSlug = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatActivityType = (type) =>
  type
    ? type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Experience';

const getActivityDescription = (item) =>
  item?.content_text ||
  item?.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
  '';

/**
 * Free cancellation if a refundable policy exists and every policy
 * cutoff (selectedDate − time_duration hours) is still in the future.
 */
const hasFreeCancellation = (item, selectedDate) => {
  const cancellationPolicy = item?.cancellation_policy;
  if (!cancellationPolicy) return false;

  const { cancel_policy, cancellation_policies } = cancellationPolicy;
  if (cancel_policy === 'non-refundable') return false;
  if (cancel_policy !== 'refundable') return false;

  if (!cancellation_policies?.length) return true;

  const activityDate = moment(selectedDate);
  if (!activityDate.isValid()) return false;

  const now = moment();
  return cancellation_policies.every((policy) => {
    const hours = Number(policy?.time_duration);
    if (!Number.isFinite(hours)) return false;
    return activityDate.clone().subtract(hours, 'hours').isAfter(now);
  });
};

function SuggestionThumbnail({ label, photoUrl }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.suggestionThumbnailWrap}>
      <div className={styles.suggestionThumbnailFallback}>
        {label ? label.charAt(0) : <FaMapMarkerAlt size={16} />}
      </div>
      {photoUrl && !failed && (
        <img
          src={photoUrl}
          alt={label}
          className={`${styles.suggestionThumbnail} ${styles.suggestionThumbnailLoaded} ${loaded ? styles.suggestionThumbnailVisible : ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function Main() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 767.98px)', false);
  const { isLoaded: isGoogleLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const { currency, rates } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [activityList, setActivityList] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef(null);

  const [sortBy, setSortBy] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const calendarRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);
  const latestQueryRef = useRef('');
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const fetchedPhotosRef = useRef(new Set());
  const [googlePredictions, setGooglePredictions] = useState([]);
  const [photoCache, setPhotoCache] = useState({});
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Dynamic destinations from API
  const [destinations, setDestinations] = useState([]);

  // Fetch destinations from API
  useEffect(() => {
    GetDestinations();
  }, []);

  const GetDestinations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/destinations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      if (data.Success === true) {
        const NewList = data.Content.destinations
          .filter(item => item.city !== null)
          .map(item => ({
            id: item.id,
            value: item.city_slug,
            label: item.city,
            country: item.country,
            source: 'api',
          }));

        const uniqueList = [
          ...new Map(NewList.map((item) => [item.value, item])).values(),
        ];
        setDestinations(uniqueList);
      }
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
    }
  }

  useEffect(() => {
    const citySlug = searchParams.get('city');
    const countryParam = searchParams.get('country');
    const dateParam = searchParams.get('date');

    if (dateParam) {
      const parsedDate = moment(dateParam, 'YYYY-MM-DD').toDate();
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
        setCalendarViewDate(parsedDate);
      }
    }

    if (citySlug) {
      const matchedDest = destinations.find((dest) => dest.value === citySlug);
      const locationFromParams = matchedDest || {
        value: citySlug,
        label: humanizeSlug(citySlug),
        country: countryParam || '',
        source: 'url',
      };

      setSelectedLocation(locationFromParams);
      setSearchQuery(locationFromParams.label);
    } else {
      setSelectedLocation(null);
      setSearchQuery('');
    }
  }, [searchParams, destinations]);

  // Close calendar and search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isGoogleLoaded || !window.google?.maps?.places) return;
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    placesServiceRef.current = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
  }, [isGoogleLoaded]);

  const fetchPlacePhoto = useCallback((placeId, query) => {
    if (!placesServiceRef.current || fetchedPhotosRef.current.has(placeId)) return;
    fetchedPhotosRef.current.add(placeId);

    placesServiceRef.current.getDetails(
      { placeId, fields: ['photos'] },
      (place, status) => {
        if (latestQueryRef.current !== query) return;
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) return;

        const photoUrl = place?.photos?.[0]?.getUrl({ maxWidth: 96 });
        if (photoUrl) {
          setPhotoCache((prev) => ({ ...prev, [placeId]: photoUrl }));
        }
      }
    );
  }, []);

  const searchGooglePlaces = useCallback((query) => {
    if (!query || query.length < 2) {
      setGooglePredictions([]);
      return;
    }

    if (!isGoogleLoaded || !autocompleteServiceRef.current) return;

    latestQueryRef.current = query;
    setIsGoogleLoading(true);

    autocompleteServiceRef.current.getPlacePredictions(
      { input: query, types: ['(regions)'] },
      (predictions, status) => {
        if (latestQueryRef.current !== query) return;

        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
          const limited = predictions.slice(0, 5);
          setGooglePredictions(limited);
          limited.slice(0, 4).forEach((prediction) => {
            fetchPlacePhoto(prediction.place_id, query);
          });
        } else {
          setGooglePredictions([]);
        }

        if (latestQueryRef.current === query) {
          setIsGoogleLoading(false);
        }
      }
    );
  }, [isGoogleLoaded, fetchPlacePhoto]);

  // Filter destinations based on search query (only filter when user is actively typing, not when a location is already selected)
  const isActivelyTyping = searchQuery.trim() && searchQuery !== selectedLocation?.label;
  const filteredDestinations = isActivelyTyping
    ? destinations.filter(destination =>
      destination.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (destination.country && destination.country.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    : destinations;

  const hasGoogleResults = isActivelyTyping && googlePredictions.length > 0;
  const hasLocalResults = filteredDestinations.length > 0;
  const showNoResults = isActivelyTyping && !isGoogleLoading && !hasGoogleResults && !hasLocalResults;

  const handleSearchSelect = (destination) => {
    // Only update draft selection — search runs on Search button click
    setSearchQuery(destination.label);
    setSelectedLocation(destination);
    setShowSearchDropdown(false);
    setGooglePredictions([]);
  };

  const handleGoogleSelect = (prediction) => {
    const mainText = prediction.structured_formatting?.main_text || prediction.description;
    const secondaryText = prediction.structured_formatting?.secondary_text || '';
    const country = parseCountryFromSecondary(secondaryText) || secondaryText;

    const matched = destinations.find(
      (d) => d.label.toLowerCase() === mainText.toLowerCase()
    );

    handleSearchSelect({
      id: prediction.place_id,
      value: matched?.value || slugifyCity(mainText),
      label: mainText,
      country,
      source: 'google',
      placeId: prediction.place_id,
      photoUrl: photoCache[prediction.place_id],
    });
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (selectedLocation && value !== selectedLocation.label) {
      setSelectedLocation(null);
    }
    setShowSearchDropdown(true);
  };

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (isActivelyTyping) {
      searchTimeout.current = setTimeout(() => {
        searchGooglePlaces(searchQuery);
      }, 150);
    } else {
      setGooglePredictions([]);
      setIsGoogleLoading(false);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, isActivelyTyping, searchGooglePlaces]);

  const renderDestinationItem = (destination, isSelected = false) => {
    if (selectedLocation && !isSelected && selectedLocation.value === destination.value) return null;

    return (
      <li
        key={`${destination.source || 'api'}-${destination.value}`}
        className={`${styles.suggestionItem} ${isSelected ? styles.selectedItem : ''}`}
        onClick={() => handleSearchSelect(destination)}
      >
        <SuggestionThumbnail label={destination.label} photoUrl={destination.photoUrl} />
        <div className={styles.suggestionContent}>
          <span className={styles.suggestionTitle}>{destination.label}</span>
          <span className={styles.suggestionCategory}>{destination.country}</span>
        </div>
        {isSelected && <span className={styles.selectedBadge}>Selected</span>}
      </li>
    );
  };

  const handleDateChange = (date) => {
    // Only update draft date — search runs on Search button click
    setSelectedDate(date);
    setCalendarViewDate(date);
    setShowCalendar(false);
  };

  const handleHeroSearch = () => {
    if (!selectedLocation) {
      setShowSearchDropdown(true);
      setShowMobileSearch(true);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('city', selectedLocation.value);
    if (selectedLocation.country) {
      params.set('country', selectedLocation.country);
    } else {
      params.delete('country');
    }
    params.set('date', moment(selectedDate).format('YYYY-MM-DD'));
    router.push(`?${params.toString()}`);
    setShowMobileSearch(false);
    setShowSearchDropdown(false);
    setShowCalendar(false);
  };

  const mobileSummaryTitle =
    selectedLocation?.label ||
    (searchParams.get('city') ? humanizeSlug(searchParams.get('city')) : 'Search Activities');

  const mobileSummaryDate = moment(selectedDate).isValid()
    ? moment(selectedDate).format('DD MMM YYYY')
    : '';



  // Core search only — filters applied client-side from listing data
  const searchKey = React.useMemo(() => {
    const city = searchParams.get('city') || '';
    const country = searchParams.get('country') || '';
    const date = searchParams.get('date') || '';
    return `${city}|${country}|${date}`;
  }, [searchParams]);

  useEffect(() => {
    async function getActivities() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const city = searchParams.get('city');
        const country = searchParams.get('country');
        const date = searchParams.get('date');
        if (city) params.set('city', city);
        if (country) params.set('country', country);
        if (date) params.set('date', date);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/activities/search?${params.toString()}`,
          {
            cache: 'no-store',
            headers: {
              "Content-Type": "application/json",
            }
          }
        );
        const response = await res.json();
        setIsLoading(false);
        if (response.Success) {
          setActivityList(response?.Content?.activities || []);
        } else {
          setActivityList([]);
        }
      } catch (error) {
        setIsLoading(false);
        setActivityList([]);
        console.log(error);
      }
    }
    getActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const getDisplayPrice = React.useCallback(
    (activity) => getActivityDisplayPrice(activity, currency, rates),
    [currency, rates]
  );

  // Apply URL filters client-side against the loaded listing
  const filteredActivities = React.useMemo(() => {
    if (!activityList || activityList.length === 0) return [];

    const categories = [
      ...searchParams.getAll('category_slug[]'),
      ...searchParams.getAll('category_slug'),
    ].filter(Boolean);
    const durations = [
      ...searchParams.getAll('duration[]'),
      ...searchParams.getAll('duration'),
    ].filter(Boolean);
    const minPriceParam = searchParams.get('min_price');
    const maxPriceParam = searchParams.get('max_price');
    const hasPriceFilter = minPriceParam != null && maxPriceParam != null;
    const minPrice = hasPriceFilter ? Number(minPriceParam) : null;
    const maxPrice = hasPriceFilter ? Number(maxPriceParam) : null;

    const filtered = activityList.filter((activity) => {
      if (categories.length > 0) {
        const slugs = getActivityCategories(activity).map((item) => item.slug);
        if (!categories.some((slug) => slugs.includes(slug))) return false;
      }

      if (durations.length > 0) {
        const duration = getActivityDuration(activity);
        if (!duration || !durations.includes(duration)) return false;
      }

      if (hasPriceFilter) {
        const price = getDisplayPrice(activity);
        if (price > 0 && (price < minPrice || price > maxPrice)) return false;
      }

      return true;
    });

    const customFirst = (a, b) => {
      const aCustom = a?.provider === 'custom' ? 0 : 1;
      const bCustom = b?.provider === 'custom' ? 0 : 1;
      return aCustom - bCustom;
    };

    if (sortBy === 'price_low') {
      return [...filtered].sort((a, b) => customFirst(a, b) || getDisplayPrice(a) - getDisplayPrice(b));
    }

    if (sortBy === 'price_high') {
      return [...filtered].sort((a, b) => customFirst(a, b) || getDisplayPrice(b) - getDisplayPrice(a));
    }

    return [...filtered].sort(customFirst);
  }, [activityList, sortBy, getDisplayPrice, searchParams]);

  // Reset pagination when filters / results change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activityList, sortBy, currency, searchParams]);

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const hasMoreActivities = visibleCount < filteredActivities.length;
  const totalActivities = filteredActivities.length;

  // Infinite scroll — load next page when sentinel is in (or near) viewport.
  // Manual in-view check needed: after reconnect, IntersectionObserver often
  // does not re-fire while the sentinel stays visible, which left the spinner stuck.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreActivities) return;

    const loadMore = () => {
      setVisibleCount((prev) => {
        if (prev >= totalActivities) return prev;
        return Math.min(prev + PAGE_SIZE, totalActivities);
      });
    };

    const isNearViewport = () => {
      const rect = sentinel.getBoundingClientRect();
      return rect.top < window.innerHeight + 200 && rect.bottom > -200;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '200px 0px', threshold: 0 }
    );

    observer.observe(sentinel);

    // Catch the stuck case: sentinel already visible after a re-subscribe
    if (isNearViewport()) {
      loadMore();
    }

    return () => observer.disconnect();
  }, [hasMoreActivities, totalActivities, visibleCount]);

  const loadingLocationLabel =
    selectedLocation?.label ||
    (searchParams.get('city') ? humanizeSlug(searchParams.get('city')) : '');

  const renderSearchBar = (inputId = 'activity-where-to') => (
    <div className={styles.searchContainer}>
      <div className={styles.searchField} ref={searchRef}>
        <span className={styles.fieldIcon} aria-hidden="true">
          <FaMapMarkerAlt />
        </span>
        <div className={styles.fieldBody}>
          <label className={styles.fieldLabel} htmlFor={inputId}>
            Where To?
          </label>
          <input
            id={inputId}
            type="text"
            placeholder="Search destinations, cities..."
            className={styles.searchInput}
            value={searchQuery}
            autoComplete="off"
            onChange={handleSearchInputChange}
            onFocus={() => setShowSearchDropdown(true)}
          />
        </div>
        {selectedLocation && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setSelectedLocation(null);
              setSearchQuery('');
              setGooglePredictions([]);
            }}
            title="Clear selection"
            aria-label="Clear selection"
          >
            ✕
          </button>
        )}
        {showSearchDropdown && (
          <div className={`${styles.searchDropdown} activity-search-dropdown`}>
            <div className={styles.searchDropdownHeader}>
              <span>
                {selectedLocation && !isActivelyTyping
                  ? 'Selected Location'
                  : isActivelyTyping
                    ? (isGoogleLoading ? 'Searching...' : 'Search Results')
                    : 'Popular Destinations'}
              </span>
            </div>
            <ul className={styles.suggestionsList}>
              {selectedLocation && !isActivelyTyping && (
                <>
                  {renderDestinationItem(selectedLocation, true)}
                  {hasLocalResults && (
                    <div className={styles.divider}>
                      <span>Other Destinations</span>
                    </div>
                  )}
                </>
              )}

              {isActivelyTyping && hasLocalResults && (
                <>
                  <li className={styles.searchSectionLabel}>Our Destinations</li>
                  {filteredDestinations.map((destination) =>
                    renderDestinationItem(destination)
                  )}
                </>
              )}

              {hasGoogleResults && (
                <>
                  <li className={styles.searchSectionLabel}>
                    {isGoogleLoading ? '...' : ''}
                  </li>
                  {googlePredictions.map((prediction) => {
                    const mainText = prediction.structured_formatting?.main_text || prediction.description;
                    const secondaryText = prediction.structured_formatting?.secondary_text || '';

                    return (
                      <li
                        key={prediction.place_id}
                        className={styles.suggestionItem}
                        onClick={() => handleGoogleSelect(prediction)}
                      >
                        <SuggestionThumbnail
                          label={mainText}
                          photoUrl={photoCache[prediction.place_id]}
                        />
                        <div className={styles.suggestionContent}>
                          <span className={styles.suggestionTitle}>{mainText}</span>
                          <span className={styles.suggestionCategory}>{secondaryText}</span>
                        </div>
                      </li>
                    );
                  })}
                </>
              )}

              {isActivelyTyping && !hasLocalResults && isGoogleLoading && !hasGoogleResults && (
                <li className={styles.loadingSuggestions}>Searching locations...</li>
              )}

              {showNoResults && (
                <div className={styles.noResults}>
                  <p>No destinations found for &quot;{searchQuery}&quot;</p>
                  <small>Try a different city or country name</small>
                </div>
              )}

              {!isActivelyTyping && filteredDestinations.map((destination) =>
                renderDestinationItem(destination)
              )}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.fieldDivider} aria-hidden="true" />

      <div className={styles.datePickerWrapper} ref={calendarRef}>
        <button
          type="button"
          className={styles.datePickerButton}
          onClick={() => {
            if (!showCalendar) {
              setCalendarViewDate(selectedDate);
            }
            setShowCalendar(!showCalendar);
          }}
        >
          <span className={styles.fieldIcon} aria-hidden="true">
            <FaCalendarAlt />
          </span>
          <span className={styles.fieldBody}>
            <span className={styles.fieldLabel}>Dates</span>
            <span className={styles.dateValue}>
              {moment(selectedDate).format('DD-MM-YYYY')}
            </span>
          </span>
        </button>
        {showCalendar && (
          <div className={styles.calendarPopup}>
            <div className={styles.calendarHeader}>
              <h5 className={styles.calendarSelectedDate}>
                WHEN ARE YOU GOING?
              </h5>
            </div>
            <DatePicker
              value={selectedDate}
              date={calendarViewDate}
              onDateChange={setCalendarViewDate}
              onChange={(date) => {
                handleDateChange(date);
              }}
              minDate={new Date()}
              styles={{
                calendarHeader: {
                  maxWidth: '100%',
                },
                day: {
                  borderRadius: '50%',
                  height: '40px',
                  fontSize: '14px',
                },
              }}
            />
          </div>
        )}
      </div>

      <div className={styles.searchAction}>
        <button
          type="button"
          className={styles.searchBtn}
          onClick={handleHeroSearch}
        >
          <FaSearch size={14} aria-hidden="true" />
          Search
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div>
          <div className="msb-bar">
            <div
              className="msb-bar__inner"
              onClick={() => setShowMobileSearch((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowMobileSearch((prev) => !prev);
                }
              }}
            >
              <div className="msb-icon" aria-hidden="true">
                <MdLocationOn size={20} />
              </div>
              <div className="msb-info">
                <div className="msb-title">{mobileSummaryTitle}</div>
                <div className="msb-subtitle">
                  {selectedLocation?.country || searchParams.get('country') || 'Activities'}
                  {mobileSummaryDate && (
                    <span className="msb-subtitle-date">· {mobileSummaryDate}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileSearch((prev) => !prev);
                }}
                className="msb-modify-btn"
              >
                <MdEdit size={14} />
                {showMobileSearch ? 'Close' : 'Modify'}
              </button>
            </div>
          </div>

          <div
            className={`msb-collapse${showMobileSearch ? ' msb-collapse--open' : ''}`}
            style={{ maxHeight: showMobileSearch ? '1200px' : '0' }}
          >
            <div className={`msb-collapse-inner ${styles.mobileSearchPanel}`}>
              {renderSearchBar('activity-where-to')}
            </div>
          </div>
        </div>
      ) : (
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div className={styles.heroIntro}>
              <h1 className={styles.heroTitle}>Where Is Your Next Dream Place?</h1>
              <p className={styles.heroSubtitle}>
                Find Exclusive Genius Rewards In Every Corner Of The World!
              </p>
            </div>
            {renderSearchBar('activity-where-to')}
          </div>
        </section>
      )}

      {/* Filters + Results */}
      <section className={styles.resultsSection}>
        <div className="container">
          <div className="row g-3 g-lg-4">
            <div className="col-lg-3 col-md-4 col-12">
              {isLoading ? (
                <FilterSidebarSkeleton />
              ) : (
                <Filter
                  activityList={activityList}
                  isListingLoading={isLoading}
                />
              )}
            </div>

            <div className="col-lg-9 col-md-8 col-12">
              {isLoading ? (
                <ActivityListingLoader locationLabel={loadingLocationLabel} />
              ) : (
                <>
              <div className={styles.resultsHeader}>
                <p className={`${styles.resultsCount} mb-0`}>
                  <strong>{filteredActivities.length}</strong> experiences found
                </p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort experiences"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                  <div className={styles.verifiedBadge}>
                    <span>✓</span> All verified & insured
                  </div>
                </div>
              </div>

              {filteredActivities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '16px' }}>
                    No experiences match your filters
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.activitiesGrid}>
                    {visibleActivities.map((item, index) => {
                      const locationText = [item.city, item.country].filter(Boolean).join(', ');
                      const activityType = formatActivityType(item.type);
                      const description = getActivityDescription(item);
                      const showFreeCancellation = hasFreeCancellation(item, selectedDate);

                      const maxPeople = item.max_people || item.max_pax || item.capacity;
                      const hasChildPrice = Number(item?.child_sale_price) > 0;

                      return (
                        <div
                          className={styles.activityCard}
                          key={item.id || item.slug || index}
                          style={{ animationDelay: `${(index % PAGE_SIZE) * 40}ms` }}
                        >
                          <div className={styles.cardImageWrap}>
                            <Image
                              src={item?.featured_image || item?.banner_image || '/images/placeholder.jpg'}
                              width={400}
                              height={300}
                              alt={item.title}
                              className={styles.cardImage}
                            />
                            {activityType && (
                              <span className={styles.typeBadge}>
                                <HiTicket aria-hidden="true" />
                                {activityType}
                              </span>
                            )}
                            {item?.provider === 'custom' && (
                              <span className={styles.alBadge}>AL</span>
                            )}
                          </div>

                          <div className={styles.cardBody}>
                            <h3 className={styles.cardActivityTitle} title={item.title}>
                              {item.title}
                            </h3>

                            {description && (
                              <p className={styles.cardDescription} title={description}>
                                {description}
                              </p>
                            )}

                            {locationText && (
                              <div className={styles.locationRow} title={locationText}>
                                <IoLocationSharp className={styles.locationIcon} />
                                <span className={styles.locationText}>{locationText}</span>
                              </div>
                            )}

                            <div className={styles.metaRow}>
                              {item.activity_duration && (
                                <span className={styles.metaItem}>
                                  <IoTimeOutline />
                                  {item.activity_duration}
                                </span>
                              )}
                              {maxPeople && (
                                <span className={styles.metaItem}>
                                  <IoPeopleOutline />
                                  Up to {maxPeople} people
                                </span>
                              )}
                              {item.rating_stars && (
                                <span className={styles.metaItem}>
                                  <FaStar />
                                  {item.rating_stars}
                                </span>
                              )}
                              {showFreeCancellation && (
                                <span className={`${styles.metaItem} ${styles.freeCancelMeta}`}>
                                  <IoCheckmarkCircle />
                                  Free Cancellation
                                </span>
                              )}
                            </div>

                            <div className={styles.cardFooter}>
                              <div className={`${styles.priceBlock} ${hasChildPrice ? styles.priceBlockSplit : ''}`}>
                                <div className={styles.priceItem}>
                                  <span className={styles.cardPriceLabel}>From</span>
                                  <p className={styles.cardPriceValue}>
                                    <PriceDisplay price={item?.sale_price} currency={item?.currency_code} />
                                    <span className={styles.priceUnit}>/person</span>
                                  </p>
                                  <span className={styles.cardPriceNote}>VAT and Taxes Included</span>
                                </div>
                                
                                {hasChildPrice && (
                                  <div className={styles}>
                                    <span className={styles.cardPriceLabel}>From</span>
                                    <p className={styles.cardPriceValue}>
                                      <PriceDisplay price={item.child_sale_price} currency={item?.currency_code} />
                                      <span className={styles.priceUnit}>/child</span>
                                    </p>
                                    <span className={styles.cardPriceNote}>VAT and Taxes Included</span>
                                  </div>
                                )}
                              </div>
                              <Link
                                href={`/activities/${item.slug}?from=${moment(selectedDate).format('YYYY-MM-DD')}&to=${moment(selectedDate).format('YYYY-MM-DD')}&language=en`}
                                className={styles.selectBtn}
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hasMoreActivities && (
                    <div ref={loadMoreRef} className={styles.loadMoreSentinel}>
                      <div className={styles.loadMoreSpinner} />
                      <span>Loading more experiences...</span>
                    </div>
                  )}
                </>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Main;
