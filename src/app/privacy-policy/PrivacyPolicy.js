'use client';

import React, { useEffect, useState } from 'react';
import { Inter } from 'next/font/google';
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaInfoCircle,
  FaExclamationTriangle,
} from 'react-icons/fa';
import styles from './PrivacyPolicy.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const SECTIONS = [
  { id: 's1', label: '1. Information We Collect' },
  { id: 's2', label: '2. How We Use Your Information' },
  { id: 's3', label: '3. Legal Bases' },
  { id: 's4', label: '4. How We Share Information' },
  { id: 's5', label: '5. Data Retention' },
  { id: 's6', label: '6. Cookies and Tracking' },
  { id: 's7', label: '7. Security' },
  { id: 's8', label: '8. Your Rights' },
  { id: 's9', label: '9. International Transfers' },
  { id: 's10', label: '10. Third-Party Links' },
  { id: 's11', label: '11. Children\'s Privacy' },
  { id: 's12', label: '12. Changes to This Policy' },
  { id: 's13', label: '13. Contact' },
];

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`${styles.page} ${inter.className}`}>
      <div className={styles.shell}>
        <aside className={styles.tocCard} aria-label="Table of contents">
          <h2 className={styles.tocTitle}>Table of Contents</h2>
          <nav className={styles.tocNav}>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`${styles.tocLink} ${activeId === section.id ? styles.tocActive : ''}`}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.contentCard}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: 10 August 2024</p>

          <p className={styles.intro}>
            Your privacy matters to us. At Al Hijaz Tours, we value your trust and take the
            protection of your personal information very seriously. This document explains the
            data we collect, how we use it, and the steps we take to safeguard your information
            when you use our website and travel services. For privacy questions, contact{' '}
            <a href="mailto:info@alhijaztours.com">info@alhijaztours.com</a>.
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaCard}>
              <span className={styles.metaIcon} aria-hidden="true">
                <FaCalendarAlt />
              </span>
              <div>
                <span className={styles.metaLabel}>Effective date:</span>
                <span className={styles.metaValueStrong}>August 10, 2024</span>
              </div>
            </div>
            <div className={styles.metaCard}>
              <span className={styles.metaIcon} aria-hidden="true">
                <FaInfoCircle />
              </span>
              <div>
                <span className={styles.metaLabel}>Version:</span>
                <span className={styles.metaValueStrong}>1.0 (Current Version)</span>
              </div>
            </div>
          </div>

          <section id="s1" className={styles.section}>
            <h2 className={styles.heading}>1. Information We Collect</h2>
            <p className={styles.body}>
              We cannot help you plan or book the perfect travel tours and services without your
              information. We mainly collect information when you provide it directly, such as
              during registration, completing forms, sending emails, or requesting travel services.
            </p>

            <h3 className={styles.subheading}>A) Information You Provide</h3>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Reservation Details: Name, email, phone number, passport, and visa information.
              </li>
              <li className={styles.listItem}>
                Preferences: Nationality, interests, and special requests for meals, accommodation,
                etc.
              </li>
              <li className={styles.listItem}>
                Unique Identifiers: Username, account number.
              </li>
              <li className={styles.listItem}>
                Billing Information: Credit card details and billing address.
              </li>
            </ul>

            <h3 className={styles.subheading}>B) Information Collected Automatically</h3>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Device data such as IP address, browser type, and language settings.
              </li>
              <li className={styles.listItem}>
                Website analytics and cookies used to enhance our services and user experience.
              </li>
            </ul>

            <h3 className={styles.subheading}>C) Information From Other Sources</h3>
            <p className={styles.body}>
              Where needed to fulfil a booking, we may receive related information from airlines,
              hotels, transfer partners, or other suppliers involved in your trip.
            </p>

            <div className={styles.noteYellow}>
              <FaExclamationTriangle className={styles.noteIcon} aria-hidden="true" />
              <p>
                Providing accurate personal details is important for visas, flights and hotel
                reservations. Incorrect information may delay or prevent booking confirmation.
              </p>
            </div>
            <div className={styles.noteGreen}>
              We only collect personal data that is relevant to delivering the tours or services
              you request, or for purposes you have consented to, except where otherwise required
              by law.
            </div>
          </section>

          <section id="s2" className={styles.section}>
            <h2 className={styles.heading}>2. How We Use Your Information</h2>
            <p className={styles.body}>We use personal information to:</p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Tailor-Made Trips: To design trips that match your preferences and needs.
              </li>
              <li className={styles.listItem}>
                Website Improvement: To enhance website offerings based on your feedback.
              </li>
              <li className={styles.listItem}>
                Customer Service: To respond effectively to service requests.
              </li>
              <li className={styles.listItem}>
                Transaction Processing: To process payments and confirm bookings.
              </li>
              <li className={styles.listItem}>
                Operate and maintain our website, accounts and booking systems.
              </li>
              <li className={styles.listItem}>
                Prevent fraud, misuse and unauthorised access.
              </li>
              <li className={styles.listItem}>
                Legal Requirements: Share data with authorities where required by law.
              </li>
            </ul>
          </section>

          <section id="s3" className={styles.section}>
            <h2 className={styles.heading}>3. Legal Bases</h2>
            <p className={styles.body}>Where applicable, we process information based on:</p>
            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Performance of a contract</p>
                <p className={styles.infoCardText}>
                  To deliver your booked tours, packages and requested travel services.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Legitimate interests</p>
                <p className={styles.infoCardText}>
                  Security, fraud prevention, product improvement and customer support.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Consent</p>
                <p className={styles.infoCardText}>
                  Where you opt in to marketing, reviews sharing, or optional communications.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Legal obligation</p>
                <p className={styles.infoCardText}>
                  To meet regulatory, tax, immigration or other legal requirements.
                </p>
              </div>
            </div>
          </section>

          <section id="s4" className={styles.section}>
            <h2 className={styles.heading}>4. How We Share Information</h2>
            <div className={styles.callout}>We do not sell your personal information.</div>
            <p className={styles.body}>
              Your personal data will never be shared with third parties without consent, unless
              legally required. We may share information only as needed with:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                For payments: banks, card processors and billing partners.
              </li>
              <li className={styles.listItem}>
                Hosting/cloud infrastructure and IT service providers that support our systems.
              </li>
              <li className={styles.listItem}>
                Airlines, hotels, transfer companies and other travel suppliers fulfilling your
                booking.
              </li>
              <li className={styles.listItem}>
                Professional advisers and authorities where disclosure is required by law.
              </li>
            </ul>
          </section>

          <section id="s5" className={styles.section}>
            <h2 className={styles.heading}>5. Data Retention</h2>
            <p className={styles.body}>
              We keep personal information only as long as needed to provide our services, meet
              legal and accounting requirements, resolve disputes, and enforce our agreements.
              When data is no longer required, we delete or anonymise it where practicable.
            </p>
          </section>

          <section id="s6" className={styles.section}>
            <h2 className={styles.heading}>6. Cookies and Tracking Technologies</h2>
            <p className={styles.body}>
              We use website analytics and cookies to enhance our services and provide the best
              possible experience. Categories may include:
            </p>
            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Essential cookies</p>
                <p className={styles.infoCardText}>
                  Required for core site features such as security, session and booking flows.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Analytics cookies</p>
                <p className={styles.infoCardText}>
                  Help us understand how visitors use the site so we can improve performance.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Preference cookies</p>
                <p className={styles.infoCardText}>
                  Remember language, device and display settings for a consistent experience.
                </p>
              </div>
            </div>
          </section>

          <section id="s7" className={styles.section}>
            <h2 className={styles.heading}>7. Security</h2>
            <p className={styles.body}>
              We have strict procedures in place to prevent unauthorized access, misuse, or loss of
              your data. Only authorized personnel and required service providers have access to
              personal information during the course of their work.
            </p>
            <div className={styles.noteYellow}>
              <FaExclamationTriangle className={styles.noteIcon} aria-hidden="true" />
              <p>
                No method of transmission over the internet is 100% secure. Please protect your
                account credentials and contact us immediately if you suspect unauthorised access.
              </p>
            </div>
          </section>

          <section id="s8" className={styles.section}>
            <h2 className={styles.heading}>8. Your Rights</h2>
            <p className={styles.body}>
              Depending on applicable law, you may have rights to access, correct, update, delete,
              or restrict use of your personal information, and to object to certain processing or
              withdraw consent where processing is based on consent. To exercise these rights,
              email{' '}
              <a href="mailto:info@alhijaztours.com">info@alhijaztours.com</a>.
            </p>
          </section>

          <section id="s9" className={styles.section}>
            <h2 className={styles.heading}>9. International Transfers</h2>
            <p className={styles.body}>
              Because travel services often involve overseas suppliers, your information may be
              processed in countries outside your home country. Where we transfer data
              internationally, we take steps designed to protect it in line with this policy and
              applicable law.
            </p>
          </section>

          <section id="s10" className={styles.section}>
            <h2 className={styles.heading}>10. Third-Party Links</h2>
            <p className={styles.body}>
              Our website may contain links to other sites such as Facebook, YouTube, etc. When
              visiting these sites, your data is governed by their privacy policies. Al Hijaz Tours
              is not responsible for data protection on these sites.
            </p>
            <p className={styles.body}>
              With your permission, we may share travel stories, images, and reviews on our website
              or social platforms. Once you submit this information, you agree it may be publicly
              viewed. If you share information about other people in your group, it is your
              responsibility to ensure they are aware and have accepted our privacy policy.
            </p>
          </section>

          <section id="s11" className={styles.section}>
            <h2 className={styles.heading}>11. Children&apos;s Privacy</h2>
            <p className={styles.body}>
              Our services are not directed at children under 16 without parental or guardian
              involvement. Where a booking includes minors, the adult making the booking is
              responsible for providing accurate details and ensuring appropriate consent.
            </p>
          </section>

          <section id="s12" className={styles.section}>
            <h2 className={styles.heading}>12. Changes to This Policy</h2>
            <p className={styles.body}>
              We may update this Privacy Policy from time to time. The “Last updated” date at the
              top of this page will change when we do. Continued use of our website or services
              after an update means you acknowledge the revised policy.
            </p>
          </section>

          <section id="s13" className={styles.section}>
            <h2 className={styles.heading}>13. Contact</h2>
            <p className={styles.body}>
              Your privacy is crucial to us. If you have any questions or concerns about our
              privacy practices, please contact us using the details below.
            </p>
            <div className={styles.contactBox}>
              <p className={styles.contactBoxLabel}>Contact information</p>
              <div className={styles.contactLines}>
                <p className={styles.contactLine}>
                  <FaMapMarkerAlt aria-hidden="true" />
                  <span>Al Hijaz Tours · United Kingdom</span>
                </p>
                <p className={styles.contactLine}>
                  <FaEnvelope aria-hidden="true" />
                  <a href="mailto:info@alhijaztours.com">info@alhijaztours.com</a>
                </p>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
