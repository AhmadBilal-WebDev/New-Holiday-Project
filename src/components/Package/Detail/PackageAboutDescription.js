'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageAboutDescription.module.css'

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

export default function PackageAboutDescription({ html = '' }) {
  const [expanded, setExpanded] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)
  const textRef = useRef(null)

  useEffect(() => {
    setExpanded(false)
  }, [html])

  useEffect(() => {
    const el = textRef.current
    if (!el || !html) {
      setNeedsToggle(false)
      return
    }

    const measure = () => {
      if (expanded) {
        // Keep toggle visible once we know content was long
        return
      }
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [html, expanded])

  if (!html) return null

  return (
    <section className={styles.block} aria-label="About this package">
      <h2 className={`${styles.title} ${outfit.className}`}>About This Package</h2>

      <div
        ref={textRef}
        className={`${styles.text} ${inter.className}${expanded ? ` ${styles.textExpanded}` : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {needsToggle || expanded ? (
        <button
          type="button"
          className={`${styles.toggleBtn} ${inter.className}`}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </section>
  )
}
