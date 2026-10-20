'use client'
import React from 'react'
import { RangeSlider } from '@mantine/core';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

export default function LayoverTime() {
    const { layoverRange, setLayoverRange, minLayover, maxLayover, setCurrentPage } = useFlightList();

    const handleDurationChange = (value) => {
        setLayoverRange(value);
        setCurrentPage(1);
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className={styles.section}>
            <p className={styles.sectionLabel}>Layover Time</p>
            <span className={styles.rangeValue}>
                {formatDuration(layoverRange[0])} - {formatDuration(layoverRange[1])}
            </span>
            <RangeSlider
                classNames={{
                    root: styles.slider,
                    track: styles.sliderTrack,
                    bar: styles.sliderBar,
                    thumb: styles.sliderThumb,
                }}
                value={layoverRange}
                onChange={handleDurationChange}
                min={minLayover}
                max={maxLayover}
                step={1}
                color="#E7247A"
                minRange={1}
                label={formatDuration}
            />
        </div>
    )
}
