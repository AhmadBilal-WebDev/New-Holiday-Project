import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaQuestionCircle } from 'react-icons/fa';
import styles from './AboutHero.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const STATS = [
  { value: '12K+', label: 'Journeys crafted' },
  { value: '72', label: 'Countries covered' },
  { value: '4.96', label: 'Traveller rating' },
  { value: '24/7', label: 'Concierge desk' },
];

export default function AboutHero() {
  return (
    <section className={`${styles.hero} ${inter.className}`} aria-label="About Voyara">
      {/* Swap /images/about-hero.jpg with your hero photo */}
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />

      <div className={`container ${styles.content}`}>
        <Link href="/faqs" className={styles.badge}>
          <FaQuestionCircle className={styles.badgeIcon} aria-hidden="true" />
          Help Centre
        </Link>

        <h1 className={`${styles.title} ${outfit.className}`}>
          We design
          <br />
          journeys, not <span>itineraries.</span>
        </h1>

        <p className={styles.subtitle}>
          Everything you need to know about booking, paying and travelling with Voyara.
        </p>
      </div>

      <div className={`container ${styles.statsWrap}`}>
        <div className={styles.statsBar}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={`${styles.statValue} ${outfit.className}`}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
