'use client'

import React from 'react'
import { Inter, Outfit } from 'next/font/google'
import TransferSearch from '../TransferSearch'
import styles from '../TransferSearch.module.css'

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

export default function TransferModify({ onSearch }) {
  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageInner}>
        <div className={styles.intro}>
          <h1 className={`${styles.title} ${outfit.className}`}>
            Which Exciting Place Is Your Next Adventure Taking You?
          </h1>
          <p className={`${styles.subtitle} ${inter.className}`}>
            Discover Exclusive Genius Rewards Wherever Your Journey Takes You!
          </p>
        </div>
        <TransferSearch variant="hero" onSearch={onSearch} />
      </div>
    </div>
  )
}
