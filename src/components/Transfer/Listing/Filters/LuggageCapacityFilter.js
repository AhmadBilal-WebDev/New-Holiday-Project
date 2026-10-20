'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useTransferList } from '../TransferListingContext'
import styles from '../TransferFilters.module.css'

export default function LuggageCapacityFilter() {
  const { luggageCapacity, setLuggageCapacity } = useTransferList();

  const capacityRanges = [
    { value: '1-2', label: '1-2 Bags' },
    { value: '3-4', label: '3-4 Bags' },
    { value: '5-6', label: '5-6 Bags' },
    { value: '6+', label: '6+ Bags' }
  ];

  const handleCheckboxChange = (value) => {
    if (luggageCapacity.includes(value)) {
      setLuggageCapacity(luggageCapacity.filter((c) => c !== value));
    } else {
      setLuggageCapacity([...luggageCapacity, value]);
    }
  };

  return (
    <div>
      <p className={styles.label}>Luggage Capacity</p>
      <div className={styles.checkboxGroup}>
        {capacityRanges.map((range, index) => (
          <Checkbox
            key={index}
            checked={luggageCapacity.includes(range.value)}
            onChange={() => handleCheckboxChange(range.value)}
            className={styles.checkbox}
            label={range.label}
          />
        ))}
      </div>
    </div>
  )
}
