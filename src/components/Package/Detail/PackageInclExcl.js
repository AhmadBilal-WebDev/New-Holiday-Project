'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageInclExcl.module.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

function stripHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

function parseItems(html) {
  if (!html) return []

  const liMatches = [...String(html).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  if (liMatches.length) {
    return liMatches.map((match) => stripHtml(match[1])).filter(Boolean)
  }

  const plain = stripHtml(html)
  if (!plain) return []

  const byLines = plain
    .split(/\n+|•|▪|●|\u2022/)
    .map((item) => item.replace(/^[-–—]\s*/, '').trim())
    .filter(Boolean)

  if (byLines.length > 1) return byLines

  // Long single paragraph → keep one block (matches long-content design)
  return [plain]
}

function InclExclPill({ item, variant }) {
  const [expanded, setExpanded] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)
  const textRef = useRef(null)
  const isIncluded = variant === 'included'

  useEffect(() => {
    setExpanded(false)
  }, [item])

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const measure = () => {
      if (expanded) return
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [item, expanded])

  return (
    <li className={`${styles.pill} ${isIncluded ? styles.pillIncluded : styles.pillExcluded}`}>
      <span
        className={`${styles.icon} ${isIncluded ? styles.iconIncluded : styles.iconExcluded}`}
        aria-hidden="true"
      >
        {isIncluded ? <FaCheck size={12} /> : <FaTimes size={12} />}
      </span>

      <div className={styles.content}>
        <p
          ref={textRef}
          className={`${styles.text}${expanded ? ` ${styles.textExpanded}` : ''}`}
        >
          {item}
        </p>
        {needsToggle || expanded ? (
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        ) : null}
      </div>
    </li>
  )
}

function Column({ title, items, variant, emptyLabel }) {
  return (
    <div className={styles.column}>
      <h3 className={`${styles.heading} ${outfit.className}`}>{title}</h3>
      <ul className={`${styles.list} ${inter.className}`}>
        {items.length ? (
          items.map((item, index) => (
            <InclExclPill key={`${variant}-${index}`} item={item} variant={variant} />
          ))
        ) : (
          <li className={`${styles.pill} ${variant === 'included' ? styles.pillIncluded : styles.pillExcluded}`}>
            <span className={styles.text}>{emptyLabel}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

export default function PackageInclExcl({ includedHtml = '', excludedHtml = '' }) {
  const includedItems = useMemo(() => parseItems(includedHtml), [includedHtml])
  const excludedItems = useMemo(() => parseItems(excludedHtml), [excludedHtml])

  if (!includedItems.length && !excludedItems.length) return null

  return (
    <section className={styles.section} aria-label="Included and excluded">
      <div className={styles.grid}>
        <Column
          title="What's Included"
          items={includedItems}
          variant="included"
          emptyLabel="No included items listed"
        />
        <Column
          title="What's Not Included"
          items={excludedItems}
          variant="excluded"
          emptyLabel="No excluded items listed"
        />
      </div>
    </section>
  )
}
