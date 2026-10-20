'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaMapMarkerAlt, FaTimes, FaCheck, FaSearch } from 'react-icons/fa';
import styles from './MobileHotelLocationSelector.module.css';

export default function MobileHotelLocationSelector({
    isOpen,
    onClose,
    onSelect,
    selectedPlaceId = null,
    selectedValue = '',
    recentSearches = []
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const modalRef = useRef(null);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const scrollYRef = useRef(0);
    const selectingRef = useRef(false);
    const optionsRef = useRef([]);

    // Keep modal full-screen — keyboard overlays on top (do NOT shrink height)
    const keepModalOnScreen = useCallback(() => {
        const el = modalRef.current;
        if (!el) return;
        // Stop iOS from scrolling the page/modal when focusing the input
        window.scrollTo(0, 0);
        el.scrollTop = 0;
        // Never resize — clear any leftover inline sizes
        el.style.top = '';
        el.style.height = '';
        el.style.bottom = '';
        el.style.left = '';
        el.style.width = '';
    }, []);

    // Lock background + paint white so keyboard gaps never reveal the home page
    useEffect(() => {
        if (!isOpen) return;

        scrollYRef.current = window.scrollY;
        const { body, documentElement: html } = document;

        const prev = {
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
            bodyHeight: body.style.height,
            bodyTouchAction: body.style.touchAction,
            bodyBg: body.style.backgroundColor,
            htmlOverflow: html.style.overflow,
            htmlOverscroll: html.style.overscrollBehavior,
            htmlBg: html.style.backgroundColor,
            htmlHeight: html.style.height,
        };

        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollYRef.current}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.touchAction = 'none';
        body.style.backgroundColor = '#ffffff';
        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        html.style.backgroundColor = '#ffffff';
        html.style.height = '100%';

        const preventBackgroundScroll = (e) => {
            const list = listRef.current;
            if (list && (e.target === list || list.contains(e.target))) return;
            e.preventDefault();
        };

        document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
        document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

        const focusTimer = setTimeout(() => {
            keepModalOnScreen();
            inputRef.current?.focus({ preventScroll: true });
            keepModalOnScreen();
        }, 50);

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('touchmove', preventBackgroundScroll);
            document.removeEventListener('wheel', preventBackgroundScroll);
            body.style.overflow = prev.bodyOverflow;
            body.style.position = prev.bodyPosition;
            body.style.top = prev.bodyTop;
            body.style.left = prev.bodyLeft;
            body.style.right = prev.bodyRight;
            body.style.width = prev.bodyWidth;
            body.style.height = prev.bodyHeight;
            body.style.touchAction = prev.bodyTouchAction;
            body.style.backgroundColor = prev.bodyBg;
            html.style.overflow = prev.htmlOverflow;
            html.style.overscrollBehavior = prev.htmlOverscroll;
            html.style.backgroundColor = prev.htmlBg;
            html.style.height = prev.htmlHeight;
            window.scrollTo(0, scrollYRef.current);
        };
    }, [isOpen, keepModalOnScreen]);

    // Only counteract iOS focus-scroll — never shrink modal with visualViewport
    useEffect(() => {
        if (!isOpen) return;

        keepModalOnScreen();

        const onViewportScroll = () => {
            if (selectingRef.current) return;
            // iOS moves visualViewport on keyboard; snap page back, keep modal full size
            window.scrollTo(0, 0);
            keepModalOnScreen();
        };

        const vv = window.visualViewport;
        vv?.addEventListener('scroll', onViewportScroll);
        // Do NOT listen to resize to change height — keyboard should overlay, not shrink

        return () => {
            vv?.removeEventListener('scroll', onViewportScroll);
        };
    }, [isOpen, keepModalOnScreen]);

    const handleInputFocus = () => {
        requestAnimationFrame(() => {
            keepModalOnScreen();
            setTimeout(keepModalOnScreen, 100);
            setTimeout(keepModalOnScreen, 300);
        });
    };

    const searchPlaces = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setPredictions([]);
            setIsLoading(false);
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
                setPredictions(data.predictions.slice(0, 8));
            } else {
                setPredictions([]);
            }
        } catch (error) {
            console.error('Error fetching places:', error);
            setIsLoading(false);
            setPredictions([]);
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery) {
                searchPlaces(searchQuery);
            } else {
                setPredictions([]);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, searchPlaces]);

    const handleSelect = useCallback((location) => {
        if (selectingRef.current || !location) return;
        selectingRef.current = true;
        inputRef.current?.blur();
        onSelect(location);
        setSearchQuery('');
        setPredictions([]);
    }, [onSelect]);

    const handleClose = useCallback(() => {
        setSearchQuery('');
        setPredictions([]);
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) selectingRef.current = false;
    }, [isOpen]);

    const predictionOptions = searchQuery
        ? [...predictions]
            .sort((a, b) => {
                const isSelectedA = selectedPlaceId && a.place_id === selectedPlaceId;
                const isSelectedB = selectedPlaceId && b.place_id === selectedPlaceId;
                if (isSelectedA && !isSelectedB) return -1;
                if (!isSelectedA && isSelectedB) return 1;
                return 0;
            })
            .map((prediction) => {
                const mainText = prediction.structured_formatting?.main_text || prediction.description;
                const secondaryText = prediction.structured_formatting?.secondary_text || '';
                return {
                    key: prediction.place_id,
                    mainText,
                    secondaryText,
                    isSelected: !!(selectedPlaceId && prediction.place_id === selectedPlaceId),
                    selection: {
                        type: 'prediction',
                        prediction,
                        mainText,
                        secondaryText,
                    },
                };
            })
        : [];

    const recentOptions = !searchQuery
        ? [...recentSearches]
            .sort((a, b) => {
                const isSelectedA = (selectedPlaceId && a.placeId === selectedPlaceId)
                    || (!!selectedValue && a.name === selectedValue);
                const isSelectedB = (selectedPlaceId && b.placeId === selectedPlaceId)
                    || (!!selectedValue && b.name === selectedValue);
                if (isSelectedA && !isSelectedB) return -1;
                if (!isSelectedA && isSelectedB) return 1;
                return 0;
            })
            .map((location, index) => ({
                key: `recent-${index}-${location.name}`,
                mainText: location.name,
                secondaryText: location.country,
                isSelected: !!(
                    (selectedPlaceId && location.placeId === selectedPlaceId)
                    || (selectedValue && location.name === selectedValue)
                ),
                selection: {
                    type: 'recent',
                    location,
                },
            }))
        : [];

    const visibleOptions = searchQuery ? predictionOptions : recentOptions;
    optionsRef.current = visibleOptions;

    // Native non-passive touchend for reliable iOS selection
    useEffect(() => {
        if (!isOpen) return;
        const list = listRef.current;
        if (!list) return;

        let startY = 0;
        let moved = false;
        let optionIndex = -1;

        const onTouchStart = (e) => {
            const btn = e.target.closest('[data-location-index]');
            if (!btn) {
                optionIndex = -1;
                return;
            }
            optionIndex = Number(btn.getAttribute('data-location-index'));
            startY = e.touches[0]?.clientY ?? 0;
            moved = false;
        };

        const onTouchMove = (e) => {
            if (optionIndex < 0) return;
            const y = e.touches[0]?.clientY ?? 0;
            if (Math.abs(y - startY) > 12) {
                moved = true;
                optionIndex = -1;
            }
        };

        const onTouchEnd = (e) => {
            if (moved || optionIndex < 0) {
                optionIndex = -1;
                return;
            }
            const option = optionsRef.current[optionIndex];
            optionIndex = -1;
            if (!option) return;
            e.preventDefault();
            handleSelect(option.selection);
        };

        list.addEventListener('touchstart', onTouchStart, { passive: true });
        list.addEventListener('touchmove', onTouchMove, { passive: true });
        list.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            list.removeEventListener('touchstart', onTouchStart);
            list.removeEventListener('touchmove', onTouchMove);
            list.removeEventListener('touchend', onTouchEnd);
        };
    }, [isOpen, handleSelect, visibleOptions.length]);

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const modalContent = (
        <>
            {/* Extra white mask — covers iOS keyboard gaps so home page never shows through */}
            <div className={styles.pageMask} aria-hidden="true" />
            <div className={styles.mobileLocationSelector} ref={modalRef}>
            <div className={styles.stickyTop}>
                <div className={styles.header}>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        <FaTimes />
                    </button>
                    <h2 className={styles.title}>Select Location</h2>
                </div>

                <div className={styles.searchContainer}>
                    <div className={styles.searchWrapper}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="search"
                            inputMode="search"
                            className={styles.searchInput}
                            placeholder="Search by hotel, city or country..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={handleInputFocus}
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                className={styles.clearSearchButton}
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                            >
                                <FaTimes />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className={styles.locationListContainer} ref={listRef}>
                {searchQuery && predictionOptions.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <FaSearch className={styles.sectionIcon} />
                            Search Results
                        </div>
                        {predictionOptions.map((option, index) => (
                            <div
                                role="button"
                                tabIndex={0}
                                key={option.key}
                                data-location-index={index}
                                className={`${styles.locationOption} ${option.isSelected ? styles.selectedLocation : ''}`}
                                onMouseDown={(e) => {
                                    if (e.nativeEvent?.sourceCapabilities?.firesTouchEvents) return;
                                    if (e.button !== 0) return;
                                    e.preventDefault();
                                    handleSelect(option.selection);
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelect(option.selection);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelect(option.selection);
                                    }
                                }}
                            >
                                <div className={styles.locationIconWrapper}>
                                    <FaMapMarkerAlt className={styles.locationIcon} />
                                </div>
                                <div className={styles.locationDetails}>
                                    <div className={styles.locationName}>{option.mainText}</div>
                                    <div className={styles.locationCountry}>{option.secondaryText}</div>
                                </div>
                                {option.isSelected ? (
                                    <div className={styles.checkIcon}>
                                        <FaCheck />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {searchQuery && isLoading && (
                    <div className={styles.section}>
                        <div className="placeholder-glow p-3">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="placeholder col-12 mb-2 rounded"
                                    style={{ height: '60px' }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {searchQuery && !isLoading && predictions.length === 0 && (
                    <div className={styles.emptyState}>
                        <FaMapMarkerAlt className={styles.emptyIcon} />
                        <p className={styles.emptyText}>No locations found</p>
                    </div>
                )}

                {!searchQuery && recentOptions.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <FaSearch className={styles.sectionIcon} />
                            Recent Searches
                        </div>
                        {recentOptions.map((option, index) => (
                            <div
                                role="button"
                                tabIndex={0}
                                key={option.key}
                                data-location-index={index}
                                className={`${styles.locationOption} ${option.isSelected ? styles.selectedLocation : ''}`}
                                onMouseDown={(e) => {
                                    if (e.nativeEvent?.sourceCapabilities?.firesTouchEvents) return;
                                    if (e.button !== 0) return;
                                    e.preventDefault();
                                    handleSelect(option.selection);
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelect(option.selection);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelect(option.selection);
                                    }
                                }}
                            >
                                <div className={styles.locationIconWrapper}>
                                    <FaMapMarkerAlt className={styles.locationIcon} />
                                </div>
                                <div className={styles.locationDetails}>
                                    <div className={styles.locationName}>{option.mainText}</div>
                                    <div className={styles.locationCountry}>{option.secondaryText}</div>
                                </div>
                                {option.isSelected ? (
                                    <div className={styles.checkIcon}>
                                        <FaCheck />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {!searchQuery && recentSearches.length === 0 && (
                    <div className={styles.emptyState}>
                        <FaMapMarkerAlt className={styles.emptyIcon} />
                        <p className={styles.emptyText}>Start typing to search for locations</p>
                    </div>
                )}
            </div>
        </div>
        </>
    );

    return createPortal(modalContent, document.body);
}
