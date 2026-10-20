import { Inter, Outfit } from 'next/font/google';
import styles from './SectionOne.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const STEPS = [
  {
    step: '01',
    title: 'Discover',
    text: 'A 30-minute call with your designer to shape the shape of the trip.',
  },
  {
    step: '02',
    title: 'Book',
    text: 'A visual itinerary within 48 hours — refined until every day is right.',
  },
  {
    step: '03',
    title: 'Depart',
    text: 'Private transfers, upgraded rooms, VIP arrivals booked and confirmed.',
  },
  {
    step: '04',
    title: 'Return',
    text: "24/7 concierge on the ground. We're on WhatsApp the whole way.",
  },
];

export default function SectionOne() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="How we work">
      <div className="container">
        <header className={styles.header}>
          <span className={styles.label}>How we work</span>
          <h2 className={`${styles.heading} ${outfit.className}`}>
            Your journey, in four moves
          </h2>
        </header>

        <div className={styles.grid}>
          {STEPS.map((item) => (
            <article key={item.step} className={styles.card}>
              <span className={styles.badge}>Step {item.step}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
