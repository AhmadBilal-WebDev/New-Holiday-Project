'use client';

import React, { useEffect, useState } from 'react';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaExclamationTriangle,
  FaHeadset,
} from 'react-icons/fa';
import styles from '../privacy-policy/PrivacyPolicy.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const SECTIONS = [
  { id: 's1', label: '1. Booking and Confirmation' },
  { id: 's2', label: '2. Payment Policy' },
  { id: 's3', label: '3. Cancellation and Refunds' },
  { id: 's4', label: '4. Changes to Packages' },
  { id: 's5', label: '5. Responsibilities and Liability' },
  { id: 's6', label: '6. Travel Documents and Visa' },
  { id: 's7', label: '7. Code of Conduct' },
  { id: 's8', label: '8. Ziyarat and Religious Guidance' },
  { id: 's9', label: '9. Privacy and Data Protection' },
  { id: 's10', label: '10. Governing Law' },
  { id: 's11', label: '11. Your Journey, Our Commitment' },
  { id: 's12', label: '12. Contact' },
];

export default function TermsAndConditions() {
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
        <aside className={styles.tocCard} aria-label="Quick links">
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
          <p className={styles.updatedPink}>Last updated on 17 August 2024</p>
          <h1 className={styles.title}>Terms &amp; Conditions</h1>

          <p className={styles.intro}>
            At Al Hijaz Tours, we are committed to providing pilgrims with a safe, comfortable, and
            spiritually enriching journey. Our Hajj and Umrah packages are designed to simplify
            every step of your pilgrimage. These Terms and Conditions outline your rights,
            responsibilities, and our services to ensure a smooth and transparent experience.
          </p>

          <div className={styles.metaRow}>
            <a href="mailto:info@alhijaztours.com" className={styles.metaCardPink}>
              <span className={styles.metaIcon} aria-hidden="true">
                <FaEnvelope />
              </span>
              <div>
                <span className={styles.metaLabelPink}>Customer Service</span>
                <span className={styles.metaValuePink}>info@alhijaztours.com</span>
              </div>
            </a>
            <a href="tel:00000000000" className={styles.metaCard}>
              <span className={styles.metaIcon} aria-hidden="true">
                <FaHeadset />
              </span>
              <div>
                <span className={styles.metaLabel}>Web / Phone</span>
                <span className={styles.metaValueStrong}>0121 777 2522</span>
              </div>
            </a>
          </div>

          <section id="s1" className={styles.section}>
            <h2 className={styles.heading}>1. Booking and Confirmation</h2>
            <p className={styles.body}>
              When you book with Al Hijaz Tours, your booking is confirmed once payment is received
              and acknowledgment is sent via email. We ask that all details you provide, including
              personal information, passport details, and travel preferences, are accurate and
              complete. Package availability is subject to change until confirmation is finalized.
            </p>
            <div className={styles.noteYellow}>
              <FaExclamationTriangle className={styles.noteIcon} aria-hidden="true" />
              <p>
                Please double-check names and passport details before payment. Errors may delay
                visas, flights or hotel check-in and can incur change fees.
              </p>
            </div>
          </section>

          <section id="s2" className={styles.section}>
            <h2 className={styles.heading}>2. Payment Policy</h2>
            <p className={styles.body}>
              To secure your pilgrimage package, a deposit is required at the time of booking. Full
              payment must be completed before the travel date, as per the invoice and package
              requirements.
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Payments can be made via bank transfer, online portals, or other approved methods.
              </li>
              <li className={styles.listItem}>
                Timely payments are crucial to ensure your travel arrangements and visa processing.
              </li>
              <li className={styles.listItem}>
                Late payment may result in cancellation of reserved flights, hotels or visa slots.
              </li>
            </ul>
          </section>

          <section id="s3" className={styles.section}>
            <h2 className={styles.heading}>3. Cancellation and Refunds</h2>
            <p className={styles.body}>
              We understand that travel plans can change. Cancellations must be communicated in
              writing. Refunds depend on the package type, timing, and airline or visa regulations.
            </p>
            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Early cancellation</p>
                <p className={styles.infoCardText}>
                  For Hajj and Umrah packages, earlier cancellations generally allow for higher
                  refund percentages.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Late cancellation</p>
                <p className={styles.infoCardText}>
                  Late cancellations may incur higher deductions due to supplier and processing
                  charges.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Payment gateway fees</p>
                <p className={styles.infoCardText}>
                  If you cancel your booking, any charges applied by third-party payment gateways
                  will be the responsibility of the customer.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Service fees</p>
                <p className={styles.infoCardText}>
                  Some service fees or processing charges may apply and may be non-refundable.
                </p>
              </div>
            </div>
          </section>

          <section id="s4" className={styles.section}>
            <h2 className={styles.heading}>4. Changes to Packages</h2>
            <div className={styles.callout}>
              We will communicate any major changes promptly and work with you to minimize
              inconvenience.
            </div>
            <p className={styles.body}>
              Al Hijaz Tours reserves the right to make changes to itineraries, hotels, flights, or
              ground services if operational circumstances require it. Minor adjustments may occur
              due to local regulations or service providers.
            </p>
          </section>

          <section id="s5" className={styles.section}>
            <h2 className={styles.heading}>5. Responsibilities and Liability</h2>
            <p className={styles.body}>
              Pilgrims are responsible for ensuring passports, visas, vaccinations, and personal
              belongings are complete and accurate. Al Hijaz Tours is not liable for delays,
              cancellations, or other circumstances outside our control, including airline changes,
              government regulations, or unforeseen events.
            </p>
            <div className={styles.noteYellow}>
              <FaExclamationTriangle className={styles.noteIcon} aria-hidden="true" />
              <p>
                We strongly recommend travel insurance to cover unexpected incidents such as
                medical emergencies, trip interruption or lost luggage.
              </p>
            </div>
          </section>

          <section id="s6" className={styles.section}>
            <h2 className={styles.heading}>6. Travel Documents and Visa</h2>
            <p className={styles.body}>
              Every pilgrim must carry a valid passport and visa. Our team assists with visa
              processing, but approval is subject to Saudi government regulations. Any errors or
              delays in documentation that affect travel are the responsibility of the pilgrim.
            </p>
            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Valid passport</p>
                <p className={styles.infoCardText}>
                  Must meet validity requirements for the destination and travel dates.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Visa assistance</p>
                <p className={styles.infoCardText}>
                  We support the process; final approval rests with the relevant authorities.
                </p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoCardTitle}>Accurate documents</p>
                <p className={styles.infoCardText}>
                  Incorrect or incomplete paperwork may delay or cancel travel arrangements.
                </p>
              </div>
            </div>
          </section>

          <section id="s7" className={styles.section}>
            <h2 className={styles.heading}>7. Code of Conduct</h2>
            <p className={styles.body}>
              To ensure a peaceful and respectful environment for all pilgrims, we request that
              everyone follows local laws, respects cultural norms, and observes proper behavior
              during travel and within holy sites. Disruptive behavior may lead to removal from
              services without refund.
            </p>
          </section>

          <section id="s8" className={styles.section}>
            <h2 className={styles.heading}>8. Ziyarat and Religious Guidance</h2>
            <p className={styles.body}>
              Some of our packages include guided Ziyarat to important Islamic sites in Makkah and
              Madinah. Pilgrims are encouraged to follow guidance from our experienced staff for a
              fulfilling and organized spiritual experience.
            </p>
            <div className={styles.noteGreen}>
              Guided Ziyarat timings and sites may vary by package, season and local regulations.
            </div>
          </section>

          <section id="s9" className={styles.section}>
            <h2 className={styles.heading}>9. Privacy and Data Protection</h2>
            <p className={styles.body}>
              We respect your privacy. Personal information collected during booking is securely
              stored and used only to arrange your pilgrimage. Data will not be shared with third
              parties without your consent, except where required by law. For full details, see our{' '}
              <Link href="/privacy-policy">Privacy Policy</Link>.
            </p>
          </section>

          <section id="s10" className={styles.section}>
            <h2 className={styles.heading}>10. Governing Law</h2>
            <p className={styles.body}>
              These Terms and Conditions are governed by the laws of the United Kingdom. Any
              disputes arising from your booking or travel arrangements will be resolved under UK
              jurisdiction.
            </p>
          </section>

          <section id="s11" className={styles.section}>
            <h2 className={styles.heading}>11. Your Journey, Our Commitment</h2>
            <p className={styles.body}>
              At Al Hijaz Tours, we are working to make your Hajj or Umrah experience meaningful
              and unforgettable. By following these Terms and Conditions, both pilgrims and our
              team can ensure a safe, organized, and spiritually rewarding journey.
            </p>
          </section>

          <section id="s12" className={styles.section}>
            <h2 className={styles.heading}>12. Contact</h2>
            <p className={styles.body}>
              If you have questions about these Terms and Conditions or your booking, please
              contact us using the details below.
            </p>
            <div className={styles.contactBox}>
              <p className={styles.contactBoxLabel}>Contact information</p>
              <div className={styles.contactLines}>
                <p className={styles.contactLine}>
                  <FaMapMarkerAlt aria-hidden="true" />
                  <span>Al Hijaz Tours · United Kingdom</span>
                </p>
                <p className={styles.contactLine}>
                  <FaPhoneAlt aria-hidden="true" />
                  <a href="tel:00000000000">0121 777 2522</a>
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
