'use client'
import React from 'react'
import { RangeSlider } from '@mantine/core';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

export default function JourneyDuration() {
    const { durationRange, setDurationRange, minDuration, maxDuration, setCurrentPage } = useFlightList();

    const handleDurationChange = (value) => {
        setDurationRange(value);
        setCurrentPage(1);
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className={styles.section}>
            <p className={styles.sectionLabel}>Journey Duration</p>
            <span className={styles.rangeValue}>
                {formatDuration(durationRange[0])} - {formatDuration(durationRange[1])}
            </span>
            <RangeSlider
                classNames={{
                    root: styles.slider,
                    track: styles.sliderTrack,
                    bar: styles.sliderBar,
                    thumb: styles.sliderThumb,
                }}
                value={durationRange}
                onChange={handleDurationChange}
                color="#E7247A"
                min={minDuration}
                max={maxDuration}
                step={1}
                minRange={1}
                label={formatDuration}
            />
        </div>
    )
}
