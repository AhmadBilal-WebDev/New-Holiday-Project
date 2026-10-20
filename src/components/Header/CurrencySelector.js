'use client'
import React from 'react';
import { FaAngleDown } from 'react-icons/fa';
import { useCurrency } from '@/util/currency';
import styles from './CurrencySelector.module.css';

const CurrencySelector = ({ width }) => {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className={styles.currencySelector}>
      <select
        className={`form-control ${width || ''} ${styles.currencySelect}`}
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label="Select currency"
      >
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="SAR">SAR</option>
      </select>
      <FaAngleDown className={styles.currencyIcon} aria-hidden="true" />
    </div>
  );
};

export default CurrencySelector;
