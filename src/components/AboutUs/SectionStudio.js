import Image from 'next/image';
import { Inter, Outfit } from 'next/font/google';
import { HiOutlineUsers, HiOutlineLocationMarker, HiOutlinePaperAirplane } from 'react-icons/hi';
import styles from './SectionStudio.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const STATS = [
  { value: '22', icon: HiOutlineUsers, label: 'Designers' },
  { value: '6', icon: HiOutlineLocationMarker, label: 'Regional desks' },
  { value: '400+', icon: HiOutlinePaperAirplane, label: 'Partners' },
];

/* Swap these paths when you add studio gallery photos */
const GALLERY = {
  tall: './updatedImages/about-section-1.jpg',
  top: './updatedImages/about-section-2.jpg',
  bottom: './updatedImages/about-section-3.jpg',
};

export default function SectionStudio() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Meet the Studio">
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <span className={styles.label}>Meet the studio</span>

            <h2 className={`${styles.heading} ${outfit.className}`}>
              A small team, big little black book.
            </h2>

            <p className={styles.copy}>
              Twenty-two designers, six regional concierges and a network of 400+
              trusted partners — hoteliers, guides, pilots, chefs — from Marrakech
              to Kyoto.
            </p>

            <div className={styles.stats}>
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.value} className={styles.statCard}>
                    <Icon className={styles.statIcon} aria-hidden="true" />
                    <span className={`${styles.statValue} ${outfit.className}`}>
                      {stat.value}
                    </span>
                    <span className={styles.srOnly}>{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.gallery} aria-hidden="true">
            <div className={styles.tall}>
              <Image
                src={GALLERY.tall}
                alt=""
                fill
                className={styles.image}
                sizes="(max-width: 991px) 100vw, 28vw"
              />
            </div>
            <div className={styles.stack}>
              <div className={styles.wide}>
                <Image
                  src={GALLERY.top}
                  alt=""
                  fill
                  className={styles.image}
                  sizes="(max-width: 991px) 100vw, 30vw"
                />
              </div>
              <div className={styles.wide}>
                <Image
                  src={GALLERY.bottom}
                  alt=""
                  fill
                  className={styles.image}
                  sizes="(max-width: 991px) 100vw, 30vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
