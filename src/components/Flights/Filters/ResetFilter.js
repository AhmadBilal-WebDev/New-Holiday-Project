'use client'
import React from 'react'
import { MdRefresh } from 'react-icons/md';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

export default function ResetFilter({ setActiveDrawer, variant = 'sidebar' }) {
    const { resetFilters } = useFlightList();
    const handleReset = () => {
        setActiveDrawer?.(null);
        resetFilters();
    };

    return (
        <div className={variant === 'drawer' ? styles.resetDrawer : styles.resetWrap}>
            <button type="button" onClick={handleReset} className={styles.resetBtn}>
                <MdRefresh size={18} aria-hidden="true" />
                Reset filters
            </button>
        </div>
    );
}
