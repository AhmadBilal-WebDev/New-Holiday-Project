'use client'
import React from 'react'
import SearchBar from './SearchBar';
import Rating from './Rating';
import PriceRange from './PriceRange';
import { FaAngleDown } from 'react-icons/fa';
import ViewFilter from './ViewFilter';
import DistanceFilter from './DistanceFilter';
import { SegmentedControl } from '@mantine/core';
import { useFilters } from './FilterContext';
import styles from './UmrahFilter.module.css';

export default function Main({ isDesktop }) {
  const { sortBy, setSortBy } = useFilters();

  return (
    <div className={styles.panel}>
      <hr className={styles.divider} />

      <div className={`collapse ${isDesktop ? 'show' : ''}`} id='collapseFilters'>
        <PriceRange />

        <hr className={styles.divider} />

        <a
          className={styles.cityToggle}
          data-bs-toggle="collapse"
          href="#collapseMakkahFilters"
          aria-expanded="true"
          aria-controls="collapseMakkahFilters"
        >
          <span className={styles.sectionLabel} style={{ margin: 0 }}>Makkah Hotels</span>
          <FaAngleDown className={styles.chevron} />
        </a>
        <div className={`collapse show ${styles.cityPanel}`} id='collapseMakkahFilters'>
          <SearchBar city="makkah" />
          <Rating city="makkah" />
          <DistanceFilter city="makkah" />
          <ViewFilter city="makkah" />
        </div>

        <hr className={styles.divider} />

        <a
          className={styles.cityToggle}
          data-bs-toggle="collapse"
          href="#collapseMadinahFilters"
          aria-expanded="true"
          aria-controls="collapseMadinahFilters"
        >
          <span className={styles.sectionLabel} style={{ margin: 0 }}>Madinah Hotels</span>
          <FaAngleDown className={styles.chevron} />
        </a>
        <div className={`collapse show ${styles.cityPanel}`} id='collapseMadinahFilters'>
          <SearchBar city="madinah" />
          <Rating city="madinah" />
          <DistanceFilter city="madinah" />
          <ViewFilter city="madinah" />
        </div>
      </div>
    </div>
  )
}
