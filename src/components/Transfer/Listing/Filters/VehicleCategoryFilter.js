'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useTransferList } from '../TransferListingContext'
import styles from '../TransferFilters.module.css'

export default function VehicleCategoryFilter() {
  const { vehicleCategory, setVehicleCategory, availableCategories } = useTransferList();

  const handleCheckboxChange = (value) => {
    if (vehicleCategory.includes(value)) {
      setVehicleCategory(vehicleCategory.filter((c) => c !== value));
    } else {
      setVehicleCategory([...vehicleCategory, value]);
    }
  };

  return (
    <div>
      <p className={styles.label}>Vehicle Category</p>
      <div className={styles.checkboxGroup}>
        {availableCategories.map((category, index) => (
          <Checkbox
            key={index}
            checked={vehicleCategory.includes(category)}
            onChange={() => handleCheckboxChange(category)}
            className={styles.checkbox}
            label={category?.charAt(0).toUpperCase() + category?.slice(1)}
          />
        ))}
      </div>
    </div>
  )
}
