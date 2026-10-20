'use client'
import React from 'react'
import { useFilters } from './FilterContext';
import styles from './UmrahFilter.module.css';

export default function ResetFilter({ variant = 'link' }) {
  const { resetFilters } = useFilters();

  if (variant === 'link') {
    return (
      <button type="button" className={styles.resetLink} onClick={resetFilters}>
        Reset
      </button>
    );
  }

  return (
    <button type="button" className={styles.resetLink} onClick={resetFilters}>
      Reset All Filters
    </button>
  );
}
