'use client'
import React from 'react'
import styles from './WhatExpect.module.css'

export default function WhatExpect({ expectData = [], provider }) {
  if (!Array.isArray(expectData) || expectData.length === 0) return null;

  return (
    <section id="expectation" className={styles.section}>
      <h3 className={styles.title}>What to Expect</h3>
      <ol className={styles.timeline}>
        {expectData.map((item, index) => {
          const duration =
            item?.duration ||
            item?.time ||
            item?.time_duration ||
            item?.duration_label ||
            item?.estimated_time ||
            '';

          return (
            <li key={index} className={styles.item}>
              <span className={styles.bullet} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.body}>
                <div className={styles.head}>
                  {item?.title && <h4 className={styles.stepTitle}>{item.title}</h4>}
                  {duration ? <span className={styles.duration}>{duration}</span> : null}
                </div>
                {(item?.content || item?.description) && (
                  provider === 'hotelbeds' ? (
                    <div
                      className={styles.description}
                      dangerouslySetInnerHTML={{ __html: item.content || item.description }}
                    />
                  ) : (
                    <p className={styles.description}>{item.content || item.description}</p>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
