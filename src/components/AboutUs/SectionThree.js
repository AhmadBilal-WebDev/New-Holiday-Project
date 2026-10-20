import { Inter, Outfit } from 'next/font/google';
import styles from './SectionThree.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const CARDS = [
  {
    num: '01',
    title: 'Handpicked, never aggregated',
    text: "Every hotel, villa and experience is personally vetted by our team. If we haven't stayed there, it isn't on Voyara.",
  },
  {
    num: '02',
    title: 'One designer, end to end',
    text: 'You work with a single travel designer from first call to final transfer. No handoffs, no call-centre queues.',
  },
  {
    num: '03',
    title: 'Local knowledge, global reach',
    text: "72 in-destination partners on the ground — the private table, the after-hours museum, the pilot who lands where others can't.",
  },
];

export default function SectionThree() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="The Philosophy">
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <span className={styles.label}>The Philosophy</span>
            <h2 className={`${styles.heading} ${outfit.className}`}>
              Slower. Rarer.
              <br />
              More yours.
            </h2>
            <p className={styles.intro}>
              We started Voyara in 2018 with one belief: modern luxury isn&apos;t a
              checklist. It&apos;s the freedom to travel deeper — with the right people
              opening the right doors at the right moment.
            </p>
          </div>

          <div className={styles.cards}>
            {CARDS.map((card) => (
              <article key={card.num} className={styles.card}>
                <span className={styles.cardNum} aria-hidden="true">
                  {card.num}
                </span>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardText}>{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
