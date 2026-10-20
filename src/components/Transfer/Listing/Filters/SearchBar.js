'use client'
import React from 'react'
import { useTransferList } from '../TransferListingContext'
import { Autocomplete } from '@mantine/core';
import styles from '../TransferFilters.module.css';

export default function SearchBar() {
    const { vehicleNames, setSearch, search } = useTransferList();

    return (
        <div>
            <p className={styles.label}>Search By Vehicle Name</p>
            <Autocomplete
                value={search || ''}
                onChange={(value) => setSearch(value)}
                placeholder="Vehicle name"
                data={vehicleNames || []}
                searchable
                withScrollArea={false}
                maxDropdownHeight={200}
                classNames={{ input: styles.input }}
                styles={{
                    input: { fontSize: 16 },
                }}
                comboboxProps={{
                    withinPortal: false,
                    zIndex: 10000,
                    position: 'bottom-start',
                    middlewares: { flip: false, shift: false },
                    transitionProps: { duration: 0 }
                }}
            />
        </div>
    )
}
