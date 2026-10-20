'use client'
import React from 'react'
import { MdRefresh } from 'react-icons/md'
import { useTransferList } from '../TransferListingContext'
import styles from '../TransferFilters.module.css'

export default function ResetFilter({ setActiveDrawer }) {
    const { resetFilters } = useTransferList();

    const handleReset = () => {
        resetFilters();
        setActiveDrawer?.(null);
    };

    return (
        <div className={styles.resetWrap}>
            <button type="button" onClick={handleReset} className={styles.resetBtn}>
                <MdRefresh className={styles.resetIcon} size={18} aria-hidden="true" />
                Reset All Filters
            </button>
        </div>
    );
}
