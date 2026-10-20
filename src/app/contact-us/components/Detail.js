import Image from 'next/image';
import { Inter, Outfit } from 'next/font/google';
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaHeadset,
} from 'react-icons/fa';
import styles from '../ContactUs.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

export default function Detail() {
  return (
    <aside className={`${styles.sidebar} ${inter.className}`} aria-label="Contact details">
      <div className={styles.heroCard}>
        <Image
          src="/updatedImages/contact-female.jpg"
          alt="Concierge desk"
          fill
          className={styles.heroCardImg}
          sizes="(max-width: 991px) 100vw, 35vw"
        />
        <div className={styles.heroCardOverlay}>
          <span className={styles.heroCardEyebrow}>Concierge desk</span>
          <h3 className={`${styles.heroCardTitle} ${outfit.className}`}>
            Open 24 / 7 for existing travellers
          </h3>
        </div>
      </div>

      <div className={styles.infoCard}>
        <span className={styles.infoIcon} aria-hidden="true">
          <FaPhoneAlt />
        </span>
        <div className={styles.infoBody}>
          <span className={styles.infoLabel}>Call the desk</span>
          <a href="tel:01217772522" className={styles.infoValue}>
            0121 777 2522
          </a>
          <span className={styles.infoMeta}>Mon–Sun · 08:00–22:00 GMT</span>
        </div>
      </div>

      <div className={styles.infoCard}>
        <span className={styles.infoIcon} aria-hidden="true">
          <FaEnvelope />
        </span>
        <div className={styles.infoBody}>
          <span className={styles.infoLabel}>Email us</span>
          <a href="mailto:info@alhijaztours.net" className={styles.infoValue}>
            info@alhijaztours.net
          </a>
          <span className={styles.infoMeta}>Reply within 4 working hours</span>
        </div>
      </div>

      <div className={styles.infoCard}>
        <span className={styles.infoIcon} aria-hidden="true">
          <FaMapMarkerAlt />
        </span>
        <div className={styles.infoBody}>
          <span className={styles.infoLabel}>Visit the studio</span>
          <span className={styles.infoValue}>
            693a Stratford Road, Birmingham B11 4DX
          </span>
          <span className={styles.infoMeta}>By appointment only</span>
        </div>
      </div>

      <div className={styles.whatsappCard}>
        <div className={styles.whatsappTop}>
          <span className={styles.whatsappIcon} aria-hidden="true">
            <FaHeadset />
          </span>
          <div>
            <div className={styles.whatsappEyebrow}>Urgent, in-trip?</div>
            <h4 className={styles.whatsappTitle}>WhatsApp the concierge</h4>
          </div>
        </div>
        <a
          href="https://wa.me/441217772522"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whatsappBtn}
        >
          Open WhatsApp
        </a>
      </div>
    </aside>
  );
}
