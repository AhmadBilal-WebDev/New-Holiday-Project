'use client'

import React from 'react'
import { Accordion } from '@mantine/core'
import { FaChevronDown } from 'react-icons/fa'
import { Inter, Outfit } from 'next/font/google'
import styles from './PackageDetailFaqs.module.css'

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

export default function PackageDetailFaqs({ faqsList }) {
  const faqs = Array.isArray(faqsList) ? faqsList : []
  if (faqs.length === 0) return null

  return (
    <section className={`${styles.section} ${inter.className}`}>
      <h2 className={`${styles.title} ${outfit.className}`}>
        Frequently Asked Questions
      </h2>

      <div className={styles.card}>
        <Accordion
          variant="default"
          radius={0}
          defaultValue="question1"
          chevron={<FaChevronDown size={14} />}
          classNames={{
            root: styles.accordionRoot,
            item: styles.item,
            control: styles.control,
            label: `${styles.label} ${outfit.className}`,
            chevron: styles.chevron,
            panel: styles.panel,
            content: styles.content,
          }}
        >
          {faqs.map((faq, index) => (
            <Accordion.Item key={index} value={`question${index + 1}`}>
              <Accordion.Control>{faq.title}</Accordion.Control>
              <Accordion.Panel>{faq.description}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
