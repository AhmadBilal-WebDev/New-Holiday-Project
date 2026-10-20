'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Popover } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { FaMapMarkerAlt, FaTimes, FaSearch, FaGlobeAmericas, FaCheck } from 'react-icons/fa';
import styles from './HotelLocationSelector.module.css';
import MobileTransferLocationSelector from './MobileTransferLocationSelector';

export default function TransferLocationSelector({
    value,
    onChange,
    onPlaceSelected,
    detailLoader,
    isMobile,
    label = "Location",
    placeholder = "Enter location",
    inputName = "transferLocation"
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mobileModalOpen, setMobileModalOpen] = useState(false);
    // Only set when user actually picks a place — not when typed text matches a result
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const inputRef = useRef(null);
    const searchTimeout = useRef(null);

    // Popular destinations for transfers
    const popularDestinations = [
        { name: 'Jeddah Airport', country: 'Saudi Arabia', icon: '✈️', placeId: 'ChIJm0kSHuldwxURNFByRg7r-Dg' },
        { name: 'Makkah', country: 'Saudi Arabia', icon: '🕋', placeId: 'ChIJqVPl4WdmwxURkq3mVvmZ8Ak' },
        { name: 'Madinah', country: 'Saudi Arabia', icon: '🕌', placeId: 'ChIJ4VIcbGeDxhURFEz7tq5z4Vc' },
        { name: 'Dubai Airport', country: 'United Arab Emirates', icon: '✈️', placeId: 'ChIJvRKfbfVDXz4R-9nf8tN1RRA' },
        { name: 'Riyadh Airport', country: 'Saudi Arabia', icon: '✈️', placeId: 'ChIJp5PeVdaEXz4R9Y4gvUdI5zE' },
        { name: 'Istanbul Airport', country: 'Turkey', icon: '✈️', placeId: 'ChIJ_UnBV0CzyhQRWh5tDp-0PrQ' },
    ];

    // Load recent searches from localStorage
    useEffect(() => {
        const savedRecent = localStorage.getItem(`recentTransferSearches_${inputName}`);
        if (savedRecent) {
            setRecentSearches(JSON.parse(savedRecent));
        }
    }, [inputName]);

    // Clear selection highlight if input is cleared externally
    useEffect(() => {
        if (!value) {
            setSelectedPlaceId(null);
        }
    }, [value]);

    // Recent list: highlight current destination (e.g. modify search) without treating typed text as a pick
    const isRecentLocationSelected = useCallback((location) => {
        if (selectedPlaceId && location.placeId === selectedPlaceId) return true;
        if (!searchQuery && value && location.name === value) return true;
        return false;
    }, [selectedPlaceId, searchQuery, value]);

    // Search results: only highlight after an explicit click (never by typed spelling)
    const isPredictionSelected = useCallback((prediction) => {
        return !!(selectedPlaceId && prediction.place_id === selectedPlaceId);
    }, [selectedPlaceId]);

    // Search Google Places API via REST
    const searchPlaces = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setPredictions([]);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(
                `/api/places/autocomplete?input=${encodeURIComponent(query)}`
            );
            const data = await response.json();

            setIsLoading(false);

            if (data.status === 'OK' && data.predictions) {
                setPredictions(data.predictions.slice(0, 8)); // Limit to 8 results
            } else {
                setPredictions([]);
            }
        } catch (error) {
            console.error('Error fetching places:', error);
            setIsLoading(false);
            setPredictions([]);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (searchQuery) {
            searchTimeout.current = setTimeout(() => {
                searchPlaces(searchQuery);
            }, 300);
        } else {
            setPredictions([]);
        }

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, searchPlaces]);

    // Search for location and get fresh Place ID
    const searchAndGetPlaceId = useCallback(async (locationName) => {
        try {
            const response = await fetch(
                `/api/places/autocomplete?input=${encodeURIComponent(locationName)}`
            );
            const data = await response.json();

            if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
                // Get the first (best) match
                const firstMatch = data.predictions[0];
                return firstMatch.place_id;
            } else {
                console.error('No results found for:', locationName);
                notifications.show({
                    title: 'Location Not Found',
                    message: 'Could not find this location. Please search again.',
                    color: 'orange',
                });
                return null;
            }
        } catch (error) {
            console.error('Error searching for place:', error);
            return null;
        }
    }, []);

    // Get place details via REST API
    const getPlaceDetails = useCallback(async (placeId, displayName = null) => {
        if (!placeId) {
            console.warn('No placeId provided to getPlaceDetails');
            return;
        }
        detailLoader?.(true);
        try {
            const response = await fetch(
                `/api/places/details?place_id=${placeId}`
            );
            const data = await response.json();

            detailLoader?.(false);
            if (data.status === 'OK' && data.result) {
                // Add display name to the result
                const placeWithDisplayName = {
                    ...data.result,
                    displayName: displayName || data.result.name
                };
                onPlaceSelected(placeWithDisplayName);
            } else {
                console.error('Place details API error:', data.status, data.error_message);
                notifications.show({
                    title: 'Location Error',
                    message: 'Could not load location details. Please try searching again.',
                    color: 'red',
                });
            }
        } catch (error) {
            detailLoader?.(false);
            console.error('Error fetching place details:', error);
        }
    }, [onPlaceSelected, detailLoader]);

    // Add to recent searches
    const addToRecentSearches = (location) => {
        if (!location.name) return;

        // Check if already exists
        const alreadyExists = recentSearches.some(item =>
            item.name === location.name && item.country === location.country
        );

        // Skip if already exists
        if (alreadyExists) return;

        // Add to beginning
        const newList = [location, ...recentSearches].slice(0, 5);

        setRecentSearches(newList);
        localStorage.setItem(`recentTransferSearches_${inputName}`, JSON.stringify(newList));
    };

    const handlePredictionSelect = (prediction) => {
        const mainText = prediction.structured_formatting?.main_text || '';
        const secondaryText = prediction.structured_formatting?.secondary_text || '';

        if (inputRef.current) {
            inputRef.current.value = mainText;
            onChange({ target: { value: mainText } });
        }

        // Save to recent searches
        const locationData = {
            name: mainText,
            country: secondaryText,
            icon: '📍',
            placeId: prediction.place_id
        };
        addToRecentSearches(locationData);

        // Get place details with display name
        getPlaceDetails(prediction.place_id, mainText);

        setSelectedPlaceId(prediction.place_id);
        setDropdownOpen(false);
        setSearchQuery('');
        setPredictions([]);
    };

    const handleLocationSelect = (location) => {
        // Update input field immediately for instant feedback
        if (inputRef.current) {
            inputRef.current.value = location.name;
            onChange({ target: { value: location.name } });
        }

        setSelectedPlaceId(location.placeId || null);
        // Close dropdown immediately
        setDropdownOpen(false);
        setSearchQuery('');
        setPredictions([]);

        addToRecentSearches(location);

        // Run API calls in background to get fresh Place ID and coordinates
        searchAndGetPlaceId(location.name).then(freshPlaceId => {
            if (freshPlaceId) {
                setSelectedPlaceId(freshPlaceId);
                // Now get full place details with the fresh ID
                getPlaceDetails(freshPlaceId, location.name);
            }
        });
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (inputRef.current) {
            inputRef.current.value = '';
            onChange({ target: { value: '' } });
        }
        setSelectedPlaceId(null);
        setSearchQuery('');
        setPredictions([]);
        setMobileModalOpen(false);
    };

    const handleDropdownOpen = () => {
        setDropdownOpen(true);
    };

    const handleInputChange = (e) => {
        const nextValue = e.target.value;
        setSearchQuery(nextValue);
        // Typing means the previous pick is no longer the active selection
        setSelectedPlaceId(null);
        onChange(e);
        if (!dropdownOpen) {
            setDropdownOpen(true);
        }
    };

    // Handle mobile selection
    const handleMobileSelect = (selection) => {
        if (selection.type === 'prediction') {
            // Handle prediction selection
            if (inputRef.current) {
                inputRef.current.value = selection.mainText;
                onChange({ target: { value: selection.mainText } });
            }

            // Close modal immediately
            setMobileModalOpen(false);

            // Save to recent searches
            const locationData = {
                name: selection.mainText,
                country: selection.secondaryText,
                icon: '📍',
                placeId: selection.prediction.place_id
            };
            addToRecentSearches(locationData);
            setSelectedPlaceId(selection.prediction.place_id);

            // Get place details with display name in background
            getPlaceDetails(selection.prediction.place_id, selection.mainText);
        } else if (selection.type === 'recent' || selection.type === 'popular') {
            // Handle recent/popular selection
            const location = selection.location;

            if (inputRef.current) {
                inputRef.current.value = location.name;
                onChange({ target: { value: location.name } });
            }

            setSelectedPlaceId(location.placeId || null);
            // Close modal immediately
            setMobileModalOpen(false);

            addToRecentSearches(location);

            // Run API calls in background to get fresh Place ID and coordinates
            searchAndGetPlaceId(location.name).then(freshPlaceId => {
                if (freshPlaceId) {
                    setSelectedPlaceId(freshPlaceId);
                    // Now get full place details with the fresh ID
                    getPlaceDetails(freshPlaceId, location.name);
                }
            });
        }
    };

    // Desktop view
    if (!isMobile) {
        return (
            <Popover
                opened={dropdownOpen}
                onChange={setDropdownOpen}
                position="bottom-start"
                width="target"
                shadow="md"
                offset={8}
                clickOutsideEvents={["mouseup", "touchend"]}
                middlewares={{ flip: false, shift: false }}
            >
                <Popover.Target>
                    <div className="form-floating d-flex align-items-center w-100 position-relative">
                        <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                            <FaMapMarkerAlt size={20} />
                        </div>
                        <input
                            type="text"
                            id={inputName}
                            name={inputName}
                            className="form-control"
                            style={{ paddingLeft: '58px', paddingRight: value ? '40px' : '12px', cursor: 'text' }}
                            placeholder="City, airport or address"
                            value={value}
                            onChange={handleInputChange}
                            onFocus={(e) => {
                                e.target.select();
                                handleDropdownOpen();
                            }}
                            onClick={handleDropdownOpen}
                            ref={inputRef}
                            autoComplete="off"
                        />
                        {value && (
                            <button
                                className={styles.clearButton}
                                onClick={handleClear}
                                type="button"
                                aria-label="Clear selection"
                            >
                                <FaTimes />
                            </button>
                        )}
                        <label htmlFor={inputName} style={{ paddingLeft: '58px' }}>{placeholder}</label>
                    </div>
                </Popover.Target>
                <Popover.Dropdown className={styles.customDropdown}>
                    <div className={styles.dropdownContent}>
                        {/* Search Results from Google API */}
                        {searchQuery && predictions.length > 0 && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <FaSearch className={styles.sectionIcon} />
                                    Search Results
                                </div>
                                {predictions
                                    .sort((a, b) => {
                                        const isSelectedA = isPredictionSelected(a);
                                        const isSelectedB = isPredictionSelected(b);
                                        if (isSelectedA && !isSelectedB) return -1;
                                        if (!isSelectedA && isSelectedB) return 1;
                                        return 0;
                                    })
                                    .map((prediction) => {
                                    const mainText = prediction.structured_formatting?.main_text || prediction.description;
                                    const isSelected = isPredictionSelected(prediction);
                                    return (
                                        <div
                                            key={prediction.place_id}
                                            className={`${styles.locationOption} ${isSelected ? styles.selectedLocation : ''}`}
                                            onClick={() => handlePredictionSelect(prediction)}
                                        >
                                            <div className={styles.locationIconWrapper}>
                                                <FaMapMarkerAlt className={styles.locationIcon} />
                                            </div>
                                            <div className={styles.locationDetails}>
                                                <div className={styles.locationName}>
                                                    {mainText}
                                                </div>
                                                <div className={styles.locationCountry}>
                                                    {prediction.structured_formatting?.secondary_text || ''}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className={styles.checkIcon}>
                                                    <FaCheck />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Loading State */}
                        {searchQuery && isLoading && (
                            <div className={styles.section}>
                                <div className='placeholder-glow p-2'>
                                    <span className="placeholder col-12 mb-1 rounded" style={{ height: '36px' }}></span>
                                    <span className="placeholder col-12 mb-1 rounded" style={{ height: '36px' }}></span>
                                    <span className="placeholder col-12 mb-1 rounded" style={{ height: '36px' }}></span>
                                    <span className="placeholder col-12 mb-1 rounded" style={{ height: '36px' }}></span>
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {searchQuery && !isLoading && predictions.length === 0 && (
                            <div className={styles.section}>
                                <div className={styles.emptyState}>
                                    No locations found
                                </div>
                            </div>
                        )}

                        {/* Recent Searches - Only show when no search query */}
                        {!searchQuery && recentSearches.length > 0 && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <FaSearch className={styles.sectionIcon} />
                                    Recent Searches
                                </div>
                                {recentSearches
                                    .sort((a, b) => {
                                        const isSelectedA = isRecentLocationSelected(a);
                                        const isSelectedB = isRecentLocationSelected(b);
                                        if (isSelectedA && !isSelectedB) return -1;
                                        if (!isSelectedA && isSelectedB) return 1;
                                        return 0;
                                    })
                                    .map((location, index) => {
                                    const isSelected = isRecentLocationSelected(location);
                                    return (
                                        <div
                                            key={`recent-${index}`}
                                            className={`${styles.locationOption} ${isSelected ? styles.selectedLocation : ''}`}
                                            onClick={() => handleLocationSelect(location)}
                                        >
                                            <div className={styles.locationIconWrapper}>
                                                <FaMapMarkerAlt className={styles.locationIcon} />
                                            </div>
                                            <div className={styles.locationDetails}>
                                                <div className={styles.locationName}>{location.name}</div>
                                                <div className={styles.locationCountry}>{location.country}</div>
                                            </div>
                                            {isSelected && (
                                                <div className={styles.checkIcon}>
                                                    <FaCheck />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!searchQuery && recentSearches.length === 0 && (
                            <div className={styles.section}>
                                <div className={styles.emptyState}>
                                    <FaMapMarkerAlt size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                    <div>Start typing to search for locations</div>
                                </div>
                            </div>
                        )}
                        {/* Popular Destinations - Only show when no search query */}
                        {/* {!searchQuery && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <FaGlobeAmericas className={styles.sectionIcon} />
                                    Popular Destinations
                                </div>
                                {popularDestinations.map((location, index) => (
                                    <div
                                        key={`popular-${index}`}
                                        className={styles.locationOption}
                                        onClick={() => handleLocationSelect(location)}
                                    >
                                        <div className={styles.locationIconWrapper}>
                                            <FaMapMarkerAlt className={styles.locationIcon} />
                                        </div>
                                        <div className={styles.locationDetails}>
                                            <div className={styles.locationName}>{location.name}</div>
                                            <div className={styles.locationCountry}>{location.country}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )} */}
                    </div>
                </Popover.Dropdown>
            </Popover>
        );
    }

    // Mobile view
    return (
        <>
            <div
                className="form-floating d-flex align-items-center w-100 position-relative"
                onClick={() => setMobileModalOpen(true)}
            >
                <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 1 }}>
                    <FaMapMarkerAlt size={20} />
                </div>
                <input
                    type="text"
                    id={inputName}
                    name={inputName}
                    className="form-control"
                    style={{ paddingLeft: '58px', paddingRight: value ? '40px' : '12px', cursor: 'pointer' }}
                    placeholder="City, airport or address"
                    value={value}
                    onChange={handleInputChange}
                    ref={inputRef}
                    autoComplete="off"
                    readOnly
                />
                {value && (
                    <button
                        className={styles.clearButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear(e);
                        }}
                        type="button"
                        aria-label="Clear selection"
                    >
                        <FaTimes />
                    </button>
                )}
                <label htmlFor={inputName} style={{ paddingLeft: '58px' }}>{placeholder}</label>
            </div>

            <MobileTransferLocationSelector
                isOpen={mobileModalOpen}
                onClose={() => setMobileModalOpen(false)}
                onSelect={handleMobileSelect}
                selectedValue={value}
                selectedPlaceId={selectedPlaceId}
                recentSearches={recentSearches}
                label={placeholder}
            />
        </>
    );
}
