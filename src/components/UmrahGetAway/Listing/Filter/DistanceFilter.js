'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useFilters } from './FilterContext';
import styles from './UmrahFilter.module.css';

export default function DistanceFilter({ city = 'makkah' }) {
  const { 
    makkahDistances, 
    setMakkahDistances,
    madinahDistances,
    setMadinahDistances 
  } = useFilters();

  const selectedDistances = city === 'makkah' ? makkahDistances : madinahDistances;
  const setDistances = city === 'makkah' ? setMakkahDistances : setMadinahDistances;

  const distanceOptions = [
    { value: '0-500', label: '0–500 m' },
    { value: '500-1000', label: '500 m – 1 km' },
    { value: '1000-2000', label: '1–2 km' },
    { value: '2000+', label: 'More than 2 km' },
    { value: 'unknown', label: 'Not specified' }
  ];

  const handleChange = (value) => {
    if (selectedDistances.includes(value)) {
      setDistances(selectedDistances.filter(d => d !== value));
    } else {
      setDistances([...selectedDistances, value]);
    }
  };

  return (
    <div>
      <p className={styles.sectionLabel}>Distance from Haram</p>
      <div className={styles.checkboxList}>
        {distanceOptions.map(option => (
          <Checkbox
            key={option.value}
            className={styles.filterCheckbox}
            label={option.label}
            checked={selectedDistances.includes(option.value)}
            onChange={() => handleChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
