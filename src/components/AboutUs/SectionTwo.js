import { Inter, Outfit } from 'next/font/google';
import { FaHandsHelping, FaShieldAlt, FaAward, FaGlobeAmericas } from 'react-icons/fa';
import styles from './SectionTwo.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const PRINCIPLES = [
  {
    id: 1,
    icon: FaHandsHelping,
    title: 'Bespoke by default',
    text: 'No cookie-cutter tours. Every itinerary is built around you.',
  },
  {
    id: 2,
    icon: FaShieldAlt,
    title: 'Uncompromising trust',
    text: 'Transparent pricing, secure bookings, 24/7 human support.',
  },
  {
    id: 3,
    icon: FaAward,
    title: 'Craft over volume',
    text: 'We take on fewer clients so each journey is impeccable.',
  },
  {
    id: 4,
    icon: FaGlobeAmericas,
    title: 'Rooted locally',
    text: "In-destination teams in 72 countries who live where you'll travel.",
  },
];

export default function SectionTwo() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Voyara Principles">
      <div className={styles.glow} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className={styles.label}>What we stand for</span>
          <h2 className={`${styles.heading} ${outfit.className}`}>
            The Voyara principles
          </h2>
        </header>

        <div className={styles.grid}>
          {PRINCIPLES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className={styles.card}>
                <span className={styles.iconWrap} aria-hidden="true">
                  <Icon />
                </span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
