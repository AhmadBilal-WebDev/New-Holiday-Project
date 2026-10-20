'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

export default function Stops() {
    const { selectedStops, setSelectedStops, stopsWithCounts, setCurrentPage } = useFlightList();

    const handleStopChange = (stopValue) => {
        setSelectedStops(prev => {
            if (prev.includes(stopValue)) {
                return prev.filter(s => s !== stopValue);
            } else {
                return [...prev, stopValue];
            }
        });
        setCurrentPage(1);
    };

    return (
        <div className={styles.section}>
            <p className={styles.sectionLabel}>Stops</p>
            <div className={styles.checkboxGroup}>
                <Checkbox
                    classNames={{
                        root: styles.checkbox,
                        input: styles.checkboxInput,
                        label: styles.checkboxLabel,
                    }}
                    color="#E7247A"
                    label={`Direct (${stopsWithCounts[0] || 0})`}
                    checked={selectedStops.includes(0)}
                    onChange={() => handleStopChange(0)}
                />
                <Checkbox
                    classNames={{
                        root: styles.checkbox,
                        input: styles.checkboxInput,
                        label: styles.checkboxLabel,
                    }}
                    color="#E7247A"
                    label={`1 stop (${stopsWithCounts[1] || 0})`}
                    checked={selectedStops.includes(1)}
                    onChange={() => handleStopChange(1)}
                />
                <Checkbox
                    classNames={{
                        root: styles.checkbox,
                        input: styles.checkboxInput,
                        label: styles.checkboxLabel,
                    }}
                    color="#E7247A"
                    label={`2+ stops (${stopsWithCounts[2] || 0})`}
                    checked={selectedStops.includes(2)}
                    onChange={() => handleStopChange(2)}
                />
            </div>
        </div>
    )
}
