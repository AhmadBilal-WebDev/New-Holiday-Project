'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useFilters } from './FilterContext';
import styles from './UmrahFilter.module.css';

export default function ViewFilter({ city = 'makkah' }) {
  const { 
    makkahHaramView, 
    setMakkahHaramView,
    makkahKaabaView,
    setMakkahKaabaView,
    madinahHaramView,
    setMadinahHaramView 
  } = useFilters();

  if (city === 'makkah') {
    return (
      <div>
        <p className={styles.sectionLabel}>Special Views</p>
        <div className={styles.checkboxList}>
          <Checkbox
            className={styles.filterCheckbox}
            label="Haram View"
            checked={makkahHaramView}
            onChange={(e) => setMakkahHaramView(e.currentTarget.checked)}
          />
          <Checkbox
            className={styles.filterCheckbox}
            label="Kaaba View"
            checked={makkahKaabaView}
            onChange={(e) => setMakkahKaabaView(e.currentTarget.checked)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className={styles.sectionLabel}>Special Views</p>
      <div className={styles.checkboxList}>
        <Checkbox
          className={styles.filterCheckbox}
          label="Haram View"
          checked={madinahHaramView}
          onChange={(e) => setMadinahHaramView(e.currentTarget.checked)}
        />
      </div>
    </div>
  );
}
