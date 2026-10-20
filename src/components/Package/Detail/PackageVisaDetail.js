'use client'

import React from 'react'
import { GiPassport } from 'react-icons/gi'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageVisaDetail.module.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

function VisaCard({ title, description }) {
  return (
    <article className={styles.card}>
      <div className={styles.iconBadge} aria-hidden="true">
        <GiPassport size={20} />
      </div>
      <div className={styles.content}>
        <p className={`${styles.title} ${outfit.className}`}>{title}</p>
        {description ? <p className={styles.subtitle}>{description}</p> : null}
      </div>
    </article>
  )
}

export default function PackageVisaDetail({ PackageDetail }) {
  const visas = PackageDetail?.visas
  if (!Array.isArray(visas) || visas.length === 0) return null

  return (
    <section className={`${styles.section} ${inter.className}`}>
      <h2 className={`${styles.sectionTitle} ${outfit.className}`}>
        <GiPassport size={22} className={styles.sectionIcon} aria-hidden="true" />
        Visa
      </h2>

      {visas.map((item, index) => (
        <VisaCard
          key={index}
          title={item?.visa_type || 'Visa Included'}
          description={item?.visa_description || item?.description || ''}
        />
      ))}
    </section>
  )
}
