'use client'
import React, { useMemo } from 'react'
import { IoCheckmark, IoClose } from 'react-icons/io5'
import styles from './IncludedExcluded.module.css'

function parseListItems(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        return String(item.name || item.title || item.label || item.text || '').trim();
      })
      .filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const liMatches = [...raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  if (liMatches.length) {
    return liMatches
      .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\n|•|·|\u2022/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export default function IncludedExcluded({ included, excluded }) {
  const includedItems = useMemo(() => parseListItems(included), [included]);
  const excludedItems = useMemo(() => parseListItems(excluded), [excluded]);

  if (!includedItems.length && !excludedItems.length) {
    return (
      <div className={styles.section}>
        <p className={styles.empty}>No inclusion details available.</p>
      </div>
    );
  }

  return (
    <div className={styles.section} id="includeexclude">
      {includedItems.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.title}>What&apos;s Included</h3>
          <ul className={styles.list}>
            {includedItems.map((item, index) => (
              <li key={`inc-${index}`} className={styles.itemIncluded}>
                <IoCheckmark className={styles.iconIncluded} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {excludedItems.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.title}>What&apos;s Not Included</h3>
          <ul className={styles.list}>
            {excludedItems.map((item, index) => (
              <li key={`exc-${index}`} className={styles.itemExcluded}>
                <IoClose className={styles.iconExcluded} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
