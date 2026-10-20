import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaQuestionCircle } from 'react-icons/fa';
import aboutStyles from '@/components/AboutUs/AboutHero.module.css';
import styles from './ContactHero.module.css';

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

export default function ContactHero() {
  return (
    <section
      className={`${aboutStyles.hero} ${inter.className} ${styles.hero}`}
      aria-label="Contact Voyara"
    >
      <div className={`${aboutStyles.bg} ${styles.bg}`} aria-hidden="true" />
      <div className={aboutStyles.overlay} aria-hidden="true" />

      <div className={`container ${aboutStyles.content} ${styles.content}`}>
        <Link href="/faqs" className={aboutStyles.badge}>
          <FaQuestionCircle className={aboutStyles.badgeIcon} aria-hidden="true" />
          Help Centre
        </Link>

        <h1 className={`${aboutStyles.title} ${outfit.className}`}>
          Travellers are is one the
          <br />
          message <span>away.</span>
        </h1>

        <p className={aboutStyles.subtitle}>
          Everything you need to know about booking, paying and travelling
          with Voyara.
        </p>
      </div>

      {/* <div className={`container ${aboutStyles.statsWrap}`}>
        <div className={aboutStyles.statsBar}>
          {STATS.map((stat) => (
            <div key={stat.label} className={aboutStyles.statItem}>
              <span className={`${aboutStyles.statValue} ${outfit.className}`}>
                {stat.value}
              </span>
              <span className={aboutStyles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div> */}
    </section>
  );
}
