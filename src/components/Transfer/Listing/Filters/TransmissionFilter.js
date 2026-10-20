'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useTransferList } from '../TransferListingContext'
import styles from '../TransferFilters.module.css'

export default function TransmissionFilter() {
  const { transmissionType, setTransmissionType, availableTransmissions } = useTransferList();

  const handleCheckboxChange = (value) => {
    if (transmissionType.includes(value)) {
      setTransmissionType(transmissionType.filter((t) => t !== value));
    } else {
      setTransmissionType([...transmissionType, value]);
    }
  };

  if (!availableTransmissions?.length) return null;

  return (
    <div>
      <p className={styles.label}>Transmission Type</p>
      <div className={styles.checkboxGroup}>
        {availableTransmissions.map((transmission, index) => (
          <Checkbox
            key={index}
            checked={transmissionType.includes(transmission)}
            onChange={() => handleCheckboxChange(transmission)}
            className={styles.checkbox}
            label={transmission}
          />
        ))}
      </div>
    </div>
  )
}
