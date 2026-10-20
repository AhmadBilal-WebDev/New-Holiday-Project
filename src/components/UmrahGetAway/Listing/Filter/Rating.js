'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useFilters } from './FilterContext';
import styles from './UmrahFilter.module.css';

export default function Rating({ city = 'makkah' }) {
  const { 
    makkahRatings, 
    setMakkahRatings,
    madinahRatings,
    setMadinahRatings 
  } = useFilters();

  const selectedRatings = city === 'makkah' ? makkahRatings : madinahRatings;
  const setRatings = city === 'makkah' ? setMakkahRatings : setMadinahRatings;

  const ratingOptions = [
    { value: 5, label: '5 Stars' },
    { value: 4, label: '4 Stars' },
    { value: 3, label: '3 Stars' },
    { value: 2, label: '2 Stars' },
    { value: 1, label: '1 Star' },
    { value: 0, label: 'Unrated' }
  ];

  const handleChange = (value) => {
    if (selectedRatings.includes(value)) {
      setRatings(selectedRatings.filter(r => r !== value));
    } else {
      setRatings([...selectedRatings, value]);
    }
  };

  return (
    <div>
      <p className={styles.sectionLabel}>Property Rating</p>
      <div className={styles.checkboxGrid}>
        {ratingOptions.map(option => (
          <Checkbox
            key={option.value}
            className={styles.filterCheckbox}
            label={option.label}
            checked={selectedRatings.includes(option.value)}
            onChange={() => handleChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
