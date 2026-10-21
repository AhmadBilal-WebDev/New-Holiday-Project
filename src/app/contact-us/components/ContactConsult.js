import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaClock, FaHeadset, FaMapMarkerAlt, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import styles from './ContactConsult.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const STATS = [
  { value: '4h', label: 'Average reply time', icon: FaClock },
  { value: '24/7', label: 'In-trip concierge', icon: FaHeadset },
  { value: '72', label: 'Destinations covered', icon: FaMapMarkerAlt },
];

export default function ContactConsult() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Consultation">
      <div className="container">
        <div className={styles.statsGrid}>
          {STATS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className={styles.statCard}>
                <Icon className={styles.statIcon} aria-hidden="true" />
                <h3 className={`${styles.statValue} ${outfit.className}`}>{item.value}</h3>
                <p className={styles.statLabel}>{item.label}</p>
              </article>
            );
          })}
        </div>

        <div className={styles.cta}>
          <div className={styles.ctaText}>
            <span className={styles.ctaEyebrow}>Free 30-min consultation</span>
            <h2 className={`${styles.ctaTitle} ${outfit.className}`}>
              Prefer to talk it through?
            </h2>
            <p className={styles.ctaCopy}>
              Book a private call with a senior travel designer — no pressure, no
              commitment. Just a great conversation about where you want to go next.
            </p>
          </div>

          <div className={styles.ctaActions}>
            <a href="tel:00000000000" className={styles.primaryBtn}>
              <FaCalendarAlt aria-hidden="true" />
              Book a call
            </a>
            <Link href="/faqs" className={styles.secondaryBtn}>
              View FAQs
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
