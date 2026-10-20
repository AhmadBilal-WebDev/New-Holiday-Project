'use client';
import { Inter, Outfit } from 'next/font/google';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { FaCheck, FaBolt, FaHeadset } from 'react-icons/fa';
import { FiShield } from 'react-icons/fi';
import styles from './ReasonTravling.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const REASONS = [
  {
    id: 'price',
    title: 'Best Price Guarantee',
    description: "Find a lower fare? We'll match it and refund the difference.",
    featured: true,
    icon: 'check',
  },
  {
    id: 'secure',
    title: 'Secure Booking',
    description: 'Bank-grade encryption on every transaction — always protected.',
    featured: false,
    icon: 'shield',
  },
  {
    id: 'instant',
    title: 'Instant Confirmation',
    description: 'Confirmed in seconds. No waiting, no follow-ups, no stress.',
    featured: false,
    icon: 'bolt',
  },
  {
    id: 'support',
    title: '24/7 Expert Support',
    description: 'Our concierge team is one call away, wherever you are.',
    featured: false,
    icon: 'headset',
  },
  {
    id: 'experiences',
    title: 'Handpicked Experiences',
    description: 'Every stay, tour and villa is vetted by our travel curators.',
    featured: false,
    icon: 'sparkles',
  },
];

function ReasonIcon({ type, featured }) {
  const className = featured ? styles.iconInnerFeatured : styles.iconInner;

  switch (type) {
    case 'check':
      return <FaCheck className={className} aria-hidden="true" />;
    case 'shield':
      return <FiShield className={className} aria-hidden="true" />;
    case 'bolt':
      return <FaBolt className={className} aria-hidden="true" />;
    case 'headset':
      return <FaHeadset className={className} aria-hidden="true" />;
    case 'sparkles':
      return <HiOutlineSparkles className={className} aria-hidden="true" />;
    default:
      return null;
  }
}

export default function ReasonTravling() {
  return (
    <section className={styles.section} aria-labelledby="reason-travling-heading">
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <header className={styles.header}>
          <span className={`${styles.badge} ${inter.className}`}>
            <HiOutlineSparkles className={styles.badgeIcon} aria-hidden="true" />
            Why Voyara
          </span>
          <h2 id="reason-travling-heading" className={`${styles.heading} ${outfit.className}`}>
            Reasons travelers keep coming back to us.
          </h2>
        </header>

        <div className={styles.cardsTrack}>
          <div className={styles.cards}>
            {REASONS.map((reason) => (
              <article
                key={reason.id}
                className={`${styles.card} ${reason.featured ? styles.cardFeatured : ''} ${outfit.className}`}
              >
                <div className={`${styles.iconWrap} ${reason.featured ? styles.iconWrapFeatured : ''}`}>
                  <ReasonIcon type={reason.icon} featured={reason.featured} />
                </div>
                <h3 className={styles.cardTitle}>{reason.title}</h3>
                <p className={styles.cardDesc}>{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
