'use client'
import React, { useState } from 'react'
import { Checkbox } from '@mantine/core';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

const INITIAL_VISIBLE = 12;

export default function AirlineFilter() {
    const { selectedAirlines, setSelectedAirlines, airlinesWithCounts, setCurrentPage } = useFlightList();
    const [showAll, setShowAll] = useState(false);

    const handleAirlineChange = (airlineCode) => {
        setSelectedAirlines(prev => {
            if (prev.includes(airlineCode)) {
                return prev.filter(a => a !== airlineCode);
            } else {
                return [...prev, airlineCode];
            }
        });
        setCurrentPage(1);
    };

    const visibleAirlines = showAll
        ? airlinesWithCounts
        : airlinesWithCounts.slice(0, INITIAL_VISIBLE);
    const hasMore = airlinesWithCounts.length > INITIAL_VISIBLE;

    return (
        <div className={styles.section}>
            <p className={styles.sectionLabel}>Airlines</p>
            <div className={styles.checkboxGroup}>
                {visibleAirlines.map((airline) => (
                    <Checkbox
                        key={airline.code}
                        classNames={{
                            root: styles.checkbox,
                            input: styles.checkboxInput,
                            label: styles.checkboxLabel,
                        }}
                        color="#E7247A"
                        label={`${airline.name} (${airline.count})`}
                        checked={selectedAirlines.includes(airline.code)}
                        onChange={() => handleAirlineChange(airline.code)}
                    />
                ))}
            </div>
            {hasMore && (
                <button
                    type="button"
                    className={styles.moreBtn}
                    onClick={() => setShowAll((prev) => !prev)}
                >
                    {showAll ? 'View Less' : `View More (${airlinesWithCounts.length - INITIAL_VISIBLE})`}
                </button>
            )}
        </div>
    )
}
