'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaApple, FaGooglePlay, FaArrowUp } from 'react-icons/fa';
import styles from './footer.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const COMPANY_LINKS = [
  { label: 'About us', href: '/about-us' },
  { label: 'Careers', href: '/contact-us' },
  { label: 'Press', href: '/blogs' },
  { label: 'Sustainability', href: '/about-us' },
];

const SERVICE_LINKS = [
  { label: 'Packages', href: '/umrah-packages' },
  { label: 'Hotels', href: '/hotels' },
  { label: 'Flights', href: '/flights' },
  { label: 'Transfers', href: '/transfers' },
  { label: 'Activities', href: '/activities' },
];

const SUPPORT_LINKS = [
  { label: 'Help center', href: '/faqs' },
  { label: 'Contact', href: '/contact-us' },
  { label: 'Cancellations', href: '/faqs' },
  { label: 'Insurance', href: '/contact-us' },
];

const LEGAL_LINKS = [
  { label: 'Terms', href: '/terms-and-conditions' },
  { label: 'Privacy', href: '/privacy-policy' },
  { label: 'Cookies', href: '/privacy-policy' },
  { label: 'Accessibility', href: '/contact-us' },
];

const PAYMENTS = ['VISA', 'Mastercard', 'AmEx', 'PayPal', 'Apple Pay'];

function FooterColumn({ title, links }) {
  return (
    <div className={styles.column}>
      <h3 className={styles.columnTitle}>{title}</h3>
      <ul className={styles.linkList}>
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`${styles.footer} ${inter.className}`}>
      <div className={styles.glowLeft} aria-hidden="true" />
      <div className={styles.glowRight} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brand}>
              <Image
                src="/updatedImages/Main-Logo.svg"
                alt="Voyara"
                width={36}
                height={36}
                className={styles.logo}
                unoptimized
              />
              <span className={`${styles.brandName} ${outfit.className}`}>Voyara</span>
            </Link>

            <p className={styles.tagline}>
              Curated luxury travel for the world&apos;s most discerning explorers.
              Established 2018.
            </p>

            <div className={styles.appButtons}>
              <a href="#" className={styles.appBtn} aria-label="Download on the App Store">
                <FaApple aria-hidden="true" />
                App Store
              </a>
              <a href="#" className={styles.appBtn} aria-label="Get it on Google Play">
                <FaGooglePlay aria-hidden="true" />
                Google Play
              </a>
            </div>
          </div>

          <div className={styles.linksGrid}>
            <FooterColumn title="Company" links={COMPANY_LINKS} />
            <FooterColumn title="Services" links={SERVICE_LINKS} />
            <FooterColumn title="Support" links={SUPPORT_LINKS} />
            <FooterColumn title="Legal" links={LEGAL_LINKS} />
          </div>

          {/* <button
            type="button"
            className={styles.scrollTop}
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <FaArrowUp aria-hidden="true" />
          </button> */}
        </div>

        <hr className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Voyara. All rights reserved.
          </p>

          <div className={styles.payments}>
            <span className={styles.paymentsLabel}>Payments:</span>
            <div className={styles.paymentList}>
              {PAYMENTS.map((method) => (
                <span key={method} className={styles.paymentItem}>
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
