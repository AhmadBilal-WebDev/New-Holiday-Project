'use client';

import { useState } from 'react';
import { Inter, Outfit } from 'next/font/google';
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa';
import styles from './SectionPress.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const QUOTES = [
  {
    id: 1,
    quote:
      'Voyara is what happens when quiet luxury meets serious travel craft. The itineraries feel less like bookings, more like well-kept secrets.',
    source: 'Condé Nast Traveller — 2025 Hot List',
  },
  {
    id: 2,
    quote:
      'A travel studio that treats every trip like a private commission — intimate, exacting, and quietly extraordinary from the first briefing to the last transfer.',
    source: 'Travel + Leisure — Editors’ Choice',
  },
  {
    id: 3,
    quote:
      'Voyara’s designers open doors you didn’t know existed. The result feels less like a holiday, more like belonging somewhere beautiful.',
    source: 'Wallpaper* — Design Awards',
  },
];

export default function SectionPress() {
  const [index, setIndex] = useState(0);
  const [email, setEmail] = useState('');

  const current = QUOTES[index];

  const goPrev = () => {
    setIndex((prev) => (prev === 0 ? QUOTES.length - 1 : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev === QUOTES.length - 1 ? 0 : prev + 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.location.href = `/contact-us?email=${encodeURIComponent(email.trim())}`;
  };

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Press & planning">
      <div className="container">
        <div className={styles.quoteCard}>
          <span className={styles.quoteMark} aria-hidden="true">
            ”
          </span>

          <blockquote className={`${styles.quote} ${outfit.className}`} key={current.id}>
            {current.quote}
          </blockquote>

          <p className={styles.source}>
            <FaMapMarkerAlt className={styles.sourceIcon} aria-hidden="true" />
            {current.source}
          </p>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            aria-label="Previous quote"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goNext}
            aria-label="Next quote"
          >
            <FaChevronRight />
          </button>
        </div>

        <div className={styles.cta}>
          <div className={styles.ctaText}>
            <h2 className={`${styles.ctaTitle} ${outfit.className}`}>
              Ready to Start your next journey?
            </h2>
            <p className={styles.ctaSub}>
              Tell us where you dream of waking up. Your designer will be in touch
              within 24 hours.
            </p>
          </div>

          <form className={styles.ctaForm} onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Your Email"
              className={styles.ctaInput}
              aria-label="Email address"
              required
            />
            <button type="submit" className={styles.ctaBtn}>
              Start planning
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
