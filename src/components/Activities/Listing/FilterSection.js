'use client'
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { RangeSlider } from "@mantine/core";
import { IoTimeOutline, IoChevronDown } from "react-icons/io5";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import styles from "./Activities.module.css";

const BUCKET_COUNT = 20;

const SORT_OPTIONS = [
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

function buildHistogram(activityList, minPrice, maxPrice, displayCurrency, rates, ConvertPrice) {
  const buckets = Array(BUCKET_COUNT).fill(0);
  if (!activityList.length || maxPrice <= minPrice) return buckets;

  const step = (maxPrice - minPrice) / BUCKET_COUNT;

  activityList.forEach((activity) => {
    const activityCurrency = activity.currency_code || 'GBP';
    let price = Number(activity.sale_price || 0);
    if (price <= 0) return;

    try {
      if (displayCurrency !== activityCurrency) {
        const { newprice } = ConvertPrice(price, activityCurrency, displayCurrency, rates);
        const converted = Number(newprice);
        if (!isNaN(converted) && converted > 0) price = converted;
      }
    } catch {
      /* use original price */
    }

    const index = Math.min(BUCKET_COUNT - 1, Math.floor((price - minPrice) / step));
    if (index >= 0) buckets[index]++;
  });

  const peak = Math.max(...buckets, 1);
  return buckets.map((count) => count / peak);
}

function FilterSection({
  activityList = [],
  priceRange,
  setPriceRange,
  activeFilters,
  setActiveFilters,
  currency = 'GBP',
  minPrice,
  maxPrice,
  rates,
  ConvertPrice,
  sortBy = 'recommended',
  setSortBy,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [draftPriceRange, setDraftPriceRange] = useState(priceRange);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [budgetDropdownPos, setBudgetDropdownPos] = useState({ top: 0, left: 0 });
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, left: 0 });
  const filterBarRef = useRef(null);
  const budgetRef = useRef(null);
  const sortRef = useRef(null);
  const budgetPanelRef = useRef(null);
  const sortPanelRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateView = () => setIsMobileView(mediaQuery.matches);
    updateView();
    mediaQuery.addEventListener('change', updateView);
    return () => mediaQuery.removeEventListener('change', updateView);
  }, []);

  const updateBudgetDropdownPosition = useCallback(() => {
    if (!budgetRef.current) return;
    const rect = budgetRef.current.getBoundingClientRect();
    setBudgetDropdownPos({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
    });
  }, []);

  const updateSortDropdownPosition = useCallback(() => {
    if (!sortRef.current) return;
    const rect = sortRef.current.getBoundingClientRect();
    setSortDropdownPos({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
    });
  }, []);

  useEffect(() => {
    if (openDropdown !== 'budget' || isMobileView) return;

    updateBudgetDropdownPosition();
    window.addEventListener('resize', updateBudgetDropdownPosition);
    window.addEventListener('scroll', updateBudgetDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateBudgetDropdownPosition);
      window.removeEventListener('scroll', updateBudgetDropdownPosition, true);
    };
  }, [openDropdown, isMobileView, updateBudgetDropdownPosition]);

  useEffect(() => {
    if (openDropdown !== 'sort' || isMobileView) return;

    updateSortDropdownPosition();
    window.addEventListener('resize', updateSortDropdownPosition);
    window.addEventListener('scroll', updateSortDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateSortDropdownPosition);
      window.removeEventListener('scroll', updateSortDropdownPosition, true);
    };
  }, [openDropdown, isMobileView, updateSortDropdownPosition]);

  // Lock background scroll without position:fixed (avoids iOS page flicker/jump)
  useEffect(() => {
    if (!openDropdown || !isMobileView) return;

    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    const allowTouchScroll = (target) =>
      Boolean(
        budgetPanelRef.current?.contains(target) ||
        sortPanelRef.current?.contains(target)
      );

    const preventBackgroundScroll = (event) => {
      if (allowTouchScroll(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      document.removeEventListener('touchmove', preventBackgroundScroll);
    };
  }, [openDropdown, isMobileView]);

  const durationFilters = useMemo(() => {
    const counts = {};
    activityList.forEach((activity) => {
      const duration = activity.activity_duration?.trim();
      if (duration) counts[duration] = (counts[duration] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([duration, count]) => ({ duration, count }));
  }, [activityList]);

  const histogram = useMemo(
    () => buildHistogram(activityList, minPrice, maxPrice, currency, rates, ConvertPrice),
    [activityList, minPrice, maxPrice, currency, rates, ConvertPrice]
  );

  const isBudgetActive =
    minPrice !== undefined &&
    maxPrice !== undefined &&
    (priceRange[0] !== minPrice || priceRange[1] !== maxPrice);

  const isSortActive = sortBy !== 'recommended';

  useEffect(() => {
    setDraftPriceRange(priceRange);
  }, [priceRange]);

  useEffect(() => {
    if (!openDropdown) return;

    const handlePointerOutside = (event) => {
      const target = event.target;
      const inBudgetTrigger = budgetRef.current?.contains(target);
      const inSortTrigger = sortRef.current?.contains(target);
      const inBudgetPanel = budgetPanelRef.current?.contains(target);
      const inSortPanel = sortPanelRef.current?.contains(target);

      if (inBudgetTrigger || inSortTrigger || inBudgetPanel || inSortPanel) return;

      if (openDropdown === 'budget') {
        setDraftPriceRange(priceRange);
      }
      setOpenDropdown(null);
    };

    // Delay so the opening tap on iOS doesn't immediately close the sheet
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerOutside);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerOutside);
    };
  }, [openDropdown, priceRange]);

  const scrollFilters = (direction) => {
    if (!filterBarRef.current) return;
    filterBarRef.current.scrollBy({ left: direction * 220, behavior: 'smooth' });
  };

  const toggleDuration = (duration) => {
    const id = `duration_${duration}`;
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const removeDuration = (duration, event) => {
    event.stopPropagation();
    setActiveFilters((prev) => prev.filter((f) => f !== `duration_${duration}`));
  };

  const applyBudget = () => {
    setPriceRange(draftPriceRange);
    setOpenDropdown(null);
  };

  const clearBudget = () => {
    const reset = [minPrice, maxPrice];
    setDraftPriceRange(reset);
    setPriceRange(reset);
  };

  const safeMin = minPrice ?? 0;
  const safeMax = Math.max(safeMin + 1, maxPrice ?? 1000);
  const clampedDraft = [
    Math.min(Math.max(draftPriceRange[0] ?? safeMin, safeMin), safeMax),
    Math.min(Math.max(draftPriceRange[1] ?? safeMax, safeMin), safeMax),
  ];

  const formatPrice = (value) => {
    const rounded = Math.round(value);
    return value >= safeMax ? `${currency} ${rounded.toLocaleString()}+` : `${currency} ${rounded.toLocaleString()}`;
  };

  const toggleBudget = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDropdown((prev) => (prev === 'budget' ? null : 'budget'));
  };

  const toggleSort = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'));
  };

  const clearBudgetFromPill = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearBudget();
    setOpenDropdown(null);
  };

  const clearSortFromPill = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSortBy('recommended');
    setOpenDropdown(null);
  };

  const closeSortDropdown = () => {
    setOpenDropdown(null);
  };

  const closeBudgetDropdown = () => {
    setDraftPriceRange(priceRange);
    setOpenDropdown(null);
  };

  const handleSortSelect = (value) => {
    setSortBy(value);
    setOpenDropdown(null);
  };

  const getPillClass = (isActive, isOpen) => {
    if (isActive) return styles.filterPillSelected;
    if (isOpen) return styles.filterPillActive;
    return '';
  };

  const renderBudgetPanel = () => (
    <div
      ref={budgetPanelRef}
      className={`${styles.filterDropdown} ${isMobileView ? styles.filterDropdownSheet : styles.filterDropdownFixed}`}
      style={
        isMobileView
          ? undefined
          : { top: budgetDropdownPos.top, left: budgetDropdownPos.left }
      }
      onClick={(event) => event.stopPropagation()}
    >
      <p className={styles.filterDropdownTitle}>Total price</p>

      <div className={styles.priceHistogram}>
        {histogram.map((height, index) => (
          <span
            key={index}
            className={styles.priceHistogramBar}
            style={{ height: `${Math.max(height * 100, 4)}%` }}
          />
        ))}
      </div>

      <RangeSlider
        className={styles.budgetSlider}
        value={clampedDraft}
        onChange={setDraftPriceRange}
        min={safeMin}
        max={safeMax}
        step={1}
        minRange={1}
        color="#E7247A"
        label={null}
      />

      <div className={styles.priceInputs}>
        <div className={styles.priceInputBox}>
          <span>Min</span>
          <strong>{formatPrice(clampedDraft[0])}</strong>
        </div>
        <span className={styles.priceInputDash}>–</span>
        <div className={styles.priceInputBox}>
          <span>Max</span>
          <strong>{formatPrice(clampedDraft[1])}</strong>
        </div>
      </div>

      <div className={styles.filterDropdownActions}>
        <button type="button" className={styles.filterClearBtn} onClick={clearBudget}>
          Clear
        </button>
        <button type="button" className={styles.filterApplyBtn} onClick={applyBudget}>
          Apply
        </button>
      </div>
    </div>
  );

  const renderSortPanel = () => (
    <div
      ref={sortPanelRef}
      className={`${styles.filterDropdown} ${isMobileView ? styles.filterDropdownSheet : styles.filterDropdownFixed}`}
      style={
        isMobileView
          ? undefined
          : { top: sortDropdownPos.top, left: sortDropdownPos.left }
      }
      onClick={(event) => event.stopPropagation()}
    >
      <p className={styles.filterDropdownTitle}>Sort by price</p>
      <div className={styles.sortOptions}>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.sortOption} ${sortBy === option.value ? styles.sortOptionActive : ''}`}
            onClick={() => handleSortSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderBudgetDropdown = () => {
    if (openDropdown !== 'budget' || !isMounted) return null;

    return createPortal(
      <>
        {isMobileView && (
          <button
            type="button"
            className={styles.filterDropdownBackdrop}
            onClick={closeBudgetDropdown}
            aria-label="Close budget menu"
          />
        )}
        {renderBudgetPanel()}
      </>,
      document.body
    );
  };

  const renderSortDropdown = () => {
    if (openDropdown !== 'sort' || !isMounted) return null;

    return createPortal(
      <>
        {isMobileView && (
          <button
            type="button"
            className={styles.filterDropdownBackdrop}
            onClick={closeSortDropdown}
            aria-label="Close sort menu"
          />
        )}
        {renderSortPanel()}
      </>,
      document.body
    );
  };

  if (!activityList.length) return null;

  return (
    <section className={styles.filterSection}>
      <div className="container">
        <div className={styles.filterBar}>
          <button
            type="button"
            className={styles.filterScrollBtn}
            onClick={() => scrollFilters(-1)}
            aria-label="Scroll filters left"
          >
            <HiChevronLeft />
          </button>

          <div className={styles.filterBarTrack} ref={filterBarRef}>
            <div className={styles.filterPillWrap} ref={budgetRef}>
              <button
                type="button"
                className={`${styles.filterPill} ${getPillClass(isBudgetActive, openDropdown === 'budget')}`}
                onClick={toggleBudget}
              >
                Budget
                {!isBudgetActive && <IoChevronDown className={styles.filterPillChevron} />}
                {isBudgetActive && (
                  <span
                    className={styles.filterPillRemove}
                    onClick={clearBudgetFromPill}
                    aria-label="Remove budget filter"
                  >
                    ×
                  </span>
                )}
              </button>

              {renderBudgetDropdown()}
            </div>

            <div className={styles.filterPillWrap} ref={sortRef}>
              <button
                type="button"
                className={`${styles.filterPill} ${getPillClass(isSortActive, openDropdown === 'sort')}`}
                onClick={toggleSort}
              >
                Sort
                {!isSortActive && <IoChevronDown className={styles.filterPillChevron} />}
                {isSortActive && (
                  <span
                    className={styles.filterPillRemove}
                    onClick={clearSortFromPill}
                    aria-label="Remove sort filter"
                  >
                    ×
                  </span>
                )}
              </button>

              {renderSortDropdown()}
            </div>

            {durationFilters.map(({ duration }) => {
              const isActive = activeFilters.includes(`duration_${duration}`);
              return (
                <button
                  key={duration}
                  type="button"
                  className={`${styles.filterPill} ${isActive ? styles.filterPillSelected : ''}`}
                  onClick={() => toggleDuration(duration)}
                >
                  <IoTimeOutline className={styles.filterPillIcon} />
                  {duration}
                  {isActive && (
                    <span
                      className={styles.filterPillRemove}
                      onClick={(e) => removeDuration(duration, e)}
                      aria-label={`Remove ${duration} filter`}
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.filterScrollBtn}
            onClick={() => scrollFilters(1)}
            aria-label="Scroll filters right"
          >
            <HiChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}

export default FilterSection;
