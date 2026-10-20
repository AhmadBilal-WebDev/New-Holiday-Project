'use client'
import React, { useState } from 'react'
import { IoChevronDown } from 'react-icons/io5'
import styles from './Faqs.module.css'

export default function Faqs({ faqsList = [] }) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!Array.isArray(faqsList) || faqsList.length === 0) return null;

  const toggleItem = (index) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  return (
    <section id="faqs" className={styles.section}>
      <h3 className={styles.title}>
        The Most Frequented Questions Asked By Travellers
      </h3>

      <div className={styles.card}>
        {faqsList.map((item, index) => {
          const isOpen = openIndex === index;
          const question = item?.title || item?.question || '';
          const answer = item?.description || item?.answer || item?.content || '';

          if (!question) return null;

          return (
            <div key={index} className={styles.item}>
              <button
                type="button"
                className={styles.trigger}
                onClick={() => toggleItem(index)}
                aria-expanded={isOpen}
              >
                <span className={styles.question}>{question}</span>
                <IoChevronDown
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && answer && (
                <div className={styles.panel}>
                  {typeof answer === 'string' && /<\/?[a-z][\s\S]*>/i.test(answer) ? (
                    <div
                      className={styles.answer}
                      dangerouslySetInnerHTML={{ __html: answer }}
                    />
                  ) : (
                    <p className={styles.answer}>{answer}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
