'use client'
import React from 'react'
import { useTransferList } from '../TransferListingContext'
import styles from '../TransferFilters.module.css'

export default function SortOption() {
    const { sort, setSort } = useTransferList();

    return (
        <div>
            <p className={styles.label}>Order By</p>
            <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={styles.select}
                aria-label="Order by"
            >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Vehicle Name: A-Z</option>
            </select>
        </div>
    )
}
