'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useFlightList } from '../FlightListingContext';
import styles from './FlightFilters.module.css';

export default function FlightClass() {
    const { selectedCabinClass, setSelectedCabinClass, cabinClassesWithCounts, setCurrentPage } = useFlightList();

    const handleClassChange = (className) => {
        setSelectedCabinClass(prev => {
            if (prev.includes(className)) {
                return prev.filter(c => c !== className);
            } else {
                return [...prev, className];
            }
        });
        setCurrentPage(1);
    };

    return (
        <div className={styles.section}>
            <p className={styles.sectionLabel}>Cabin</p>
            <div className={styles.checkboxGroup}>
                {cabinClassesWithCounts.map((cabinClass) => (
                    <Checkbox
                        key={cabinClass.name}
                        classNames={{
                            root: styles.checkbox,
                            input: styles.checkboxInput,
                            label: styles.checkboxLabel,
                        }}
                        color="#E7247A"
                        label={`${cabinClass.name} (${cabinClass.count})`}
                        checked={selectedCabinClass.includes(cabinClass.name)}
                        onChange={() => handleClassChange(cabinClass.name)}
                    />
                ))}
            </div>
        </div>
    )
}
