'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FaPlane, FaTimes, FaCheck, FaSearch } from 'react-icons/fa';
import { AirportList } from "@/util/AirportList";
import styles from './MobileAirportSelector.module.css';

export default function MobileAirportSelector({ 
    isOpen, 
    onClose, 
    onSelect, 
    selectedValue, 
    excludeCode,
    excludeCodes = [],
    label,
    type, // 'from' or 'to'
    recentAirports = []
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const blockedCodes = useMemo(() => {
        const codes = [excludeCode, ...(excludeCodes || [])]
            .filter(Boolean)
            .map((code) => String(code).toUpperCase());
        return new Set(codes);
    }, [excludeCode, excludeCodes]);

    const availableAirports = useMemo(
        () => AirportList.filter((airport) => !blockedCodes.has(String(airport?.airportCode || '').toUpperCase())),
        [blockedCodes]
    );

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
        } else {
            document.body.style.overflow = '';
            document.body.style.height = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
        };
    }, [isOpen]);

    // Filter airports based on search query and organize by country
    const filterAirports = (airports, query, selectedCode = null) => {
        let filtered = airports;

        if (query) {
            const lowerQuery = query.toLowerCase().trim();
            const directMatches = airports.filter((airport) =>
                airport.airportName.toLowerCase().includes(lowerQuery) ||
                airport.airportCode.toLowerCase().includes(lowerQuery) ||
                airport.cityName.toLowerCase().includes(lowerQuery) ||
                airport.countryName.toLowerCase().includes(lowerQuery) ||
                String(airport.cityCode || '').toLowerCase() === lowerQuery
            );

            // When code/city matches (e.g. DXB), also show other airports in same city
            const matchedCityCodes = new Set(
                directMatches
                    .map((a) => String(a.cityCode || '').toUpperCase())
                    .filter(Boolean)
            );
            airports.forEach((airport) => {
                if (String(airport.cityCode || '').toLowerCase() === lowerQuery) {
                    matchedCityCodes.add(String(airport.cityCode).toUpperCase());
                }
            });

            const matchKeys = new Set(
                directMatches.map((a) => a.airportCode)
            );
            filtered = airports.filter((airport) => {
                if (matchKeys.has(airport.airportCode)) return true;
                const cityCode = String(airport.cityCode || '').toUpperCase();
                return cityCode && matchedCityCodes.has(cityCode);
            });

            // Prefer exact code, then city "All Airports", then rest
            filtered.sort((a, b) => {
                const aExact = a.airportCode.toLowerCase() === lowerQuery ? 0 : 1;
                const bExact = b.airportCode.toLowerCase() === lowerQuery ? 0 : 1;
                if (aExact !== bExact) return aExact - bExact;

                const aAll = /^all airports$/i.test(a.airportName) ? 0 : 1;
                const bAll = /^all airports$/i.test(b.airportName) ? 0 : 1;
                if (aAll !== bAll) return aAll - bAll;

                return String(a.airportName || '').localeCompare(String(b.airportName || ''));
            });
        }

        // Move selected airport to top if it exists in filtered results
        if (selectedCode) {
            const selectedIndex = filtered.findIndex(a => a.airportCode === selectedCode);
            if (selectedIndex > -1) {
                const selectedAirport = filtered.splice(selectedIndex, 1)[0];
                filtered.unshift(selectedAirport);
            }
        }

        // Group by country
        const groupedByCountry = filtered.reduce((acc, airport) => {
            const country = airport.countryName;
            if (!acc[country]) {
                acc[country] = [];
            }
            acc[country].push(airport);
            return acc;
        }, {});

        // Convert to array of countries with their airports
        const countriesArray = Object.entries(groupedByCountry)
            .map(([country, airports]) => ({
                country,
                airports: airports.slice(0, 20) // Max 20 airports per country
            }))
            .slice(0, 15); // Max 15 countries

        return countriesArray;
    };

    // "All Airports" (city codes like DXB) → show city name instead
    const getAirportDisplayName = (airport) => {
        if (!airport) return '';
        if (/^all airports$/i.test(String(airport.airportName || '').trim())) {
            return airport.cityName || airport.airportCode;
        }
        return airport.airportName || airport.cityName || '';
    };

    const getAirportDisplayLocation = (airport) => {
        if (!airport) return '';
        if (/^all airports$/i.test(String(airport.airportName || '').trim())) {
            return airport.countryName || '';
        }
        return `${airport.cityName || ''}${airport.cityName && airport.countryName ? ', ' : ''}${airport.countryName || ''}`;
    };

    // Get airports to display
    const getAirportsToDisplay = () => {
        if (searchQuery) {
            // Show filtered results when user is typing
            return filterAirports(availableAirports, searchQuery, selectedValue);
        } else {
            // Show recent airports when no search query
            if (recentAirports.length > 0) {
                const recentAirportsList = recentAirports
                    .map(code => availableAirports.find(a => a.airportCode === code))
                    .filter(Boolean);

                if (recentAirportsList.length > 0) {
                    // Group recent airports by country
                    const groupedByCountry = recentAirportsList.reduce((acc, airport) => {
                        const country = airport.countryName;
                        if (!acc[country]) {
                            acc[country] = [];
                        }
                        acc[country].push(airport);
                        return acc;
                    }, {});

                    return Object.entries(groupedByCountry).map(([country, airports]) => ({
                        country,
                        airports
                    }));
                }
            }
            return [];
        }
    };

    const groupedAirports = getAirportsToDisplay();
    const totalAirports = groupedAirports.reduce((sum, group) => sum + group.airports.length, 0);

    const handleSelect = (airportCode) => {
        onSelect(airportCode);
        setSearchQuery('');
    };

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    if (!isOpen) return null;

    // Ensure we're in the browser before using createPortal
    if (typeof window === 'undefined') return null;

    const modalContent = (
        <div className={styles.mobileAirportSelector}>
            {/* Header */}
            <div className={styles.header}>
                <button 
                    className={styles.closeButton} 
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <FaTimes />
                </button>
                <h2 className={styles.title}>{label}</h2>
            </div>

            {/* Search Box */}
            <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                    <FaSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by airport, city or country..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button
                            className={styles.clearSearchButton}
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Airport List */}
            <div className={styles.airportListContainer}>
                {totalAirports > 0 ? (
                    groupedAirports.map((group, groupIndex) => (
                        <div key={`${group.country}-${groupIndex}`} className={styles.countryGroup}>
                            <div className={styles.countryHeader}>
                                {!searchQuery ? 'Recent Searches' : group.country}
                                {selectedValue && group.airports.find(a => a.airportCode === selectedValue) && (
                                    <span className={styles.selectedBadge}>Current</span>
                                )}
                            </div>
                            {group.airports.map((airport) => (
                                <div
                                    key={airport.airportCode}
                                    className={`${styles.airportOption} ${selectedValue === airport.airportCode ? styles.selected : ''}`}
                                    onClick={() => handleSelect(airport.airportCode)}
                                >
                                    <div className={styles.airportIconWrapper}>
                                        <FaPlane className={styles.airportIcon} />
                                    </div>
                                    <div className={styles.airportDetails}>
                                        <div className={styles.airportMainInfo}>
                                            <span className={styles.airportName}>{getAirportDisplayName(airport)}</span>
                                            <span className={styles.airportCode}>({airport.airportCode})</span>
                                        </div>
                                        <div className={styles.airportLocation}>
                                            {getAirportDisplayLocation(airport)}
                                        </div>
                                    </div>
                                    {selectedValue === airport.airportCode && (
                                        <div className={styles.checkmarkWrapper}>
                                            <FaCheck className={styles.checkmark} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <FaPlane className={styles.emptyIcon} />
                        <p className={styles.emptyText}>
                            {searchQuery 
                                ? 'No airports found' 
                                : type === 'from' 
                                    ? 'Start typing to search departure airports...' 
                                    : 'Start typing to search destination airports...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // Render using portal to ensure it's at the root level
    return createPortal(modalContent, document.body);
}
