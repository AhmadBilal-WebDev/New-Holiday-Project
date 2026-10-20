'use client';

import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
} from '@mantine/core';
import { Inter, Outfit } from 'next/font/google';
import Link from 'next/link';
import {
  FaQuestionCircle,
  FaSearch,
  FaRegCreditCard,
  FaPlane,
  FaHotel,
  FaHeadset,
  FaBoxOpen,
  FaPhoneAlt,
  FaEnvelope,
  FaShieldAlt,
  FaComments,
} from 'react-icons/fa';
import { HiOutlineSparkles } from 'react-icons/hi';
import styles from './FaqsList.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const CATEGORIES = [
  { id: 'all', label: 'All', icon: HiOutlineSparkles },
  { id: 'booking', label: 'Booking', icon: FaBoxOpen },
  { id: 'payments', label: 'Payments', icon: FaRegCreditCard },
  { id: 'flights', label: 'Flights', icon: FaPlane },
  { id: 'hotels', label: 'Hotels', icon: FaHotel },
  { id: 'support', label: 'Support', icon: FaHeadset },
];

const FAQ_DATA = [
  {
    id: 'q1',
    category: 'booking',
    question: 'How do I book a package with Voyara?',
    answer:
      'Browse our featured packages or contact a designer for a custom itinerary. Once confirmed, you’ll receive a full booking dossier with vouchers, transfers and a WhatsApp line to your concierge.',
  },
  {
    id: 'q2',
    category: 'booking',
    question: 'Can I fully customise an itinerary?',
    answer:
      'Yes. Share your dates, pace and must-see experiences and our travel designers will shape a trip around you — stays, flights, transfers and activities included.',
  },
  {
    id: 'q3',
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept major credit and debit cards, and selected bank transfers. You’ll see available options at checkout, and deposits can secure popular packages while you finalise details.',
  },
  {
    id: 'q4',
    category: 'payments',
    question: 'Can I pay in instalments?',
    answer:
      'Many packages allow a deposit with the balance due before travel. Your booking confirmation will show the payment schedule clearly.',
  },
  {
    id: 'q5',
    category: 'flights',
    question: 'Are flights included in packages?',
    answer:
      'Some packages include flights; others are land-only. Filter by inclusions or ask your designer — we can add one-way, return or multi-city flights to any trip.',
  },
  {
    id: 'q6',
    category: 'flights',
    question: 'Can I change my flight dates after booking?',
    answer:
      'Changes depend on airline rules and fare type. Contact support as early as possible and we’ll check options, fees and rebooking availability for you.',
  },
  {
    id: 'q7',
    category: 'hotels',
    question: 'How are hotels selected?',
    answer:
      'We choose stays for location, comfort and guest reviews — from boutique hideaways to luxury resorts. Prefer a specific property? Tell us and we’ll check availability.',
  },
  {
    id: 'q8',
    category: 'hotels',
    question: 'Can I upgrade my room after booking?',
    answer:
      'Often yes, subject to availability. Message your concierge with preferred room type and dates and we’ll confirm options and any price difference.',
  },
  {
    id: 'q9',
    category: 'support',
    question: 'How do I reach Voyara support while travelling?',
    answer:
      'You’ll get a dedicated WhatsApp concierge line with your booking dossier, plus email and phone support. We’re available around the clock for urgent travel help.',
  },
  {
    id: 'q10',
    category: 'support',
    question: 'What is your cancellation policy?',
    answer:
      'Policies vary by package, flights and hotels. Your confirmation email lists deadlines and fees. Contact support before cancelling so we can advise the best option.',
  },
];

export default function FaqsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredFaqs = useMemo(() => {
    let filtered = FAQ_DATA;

    if (activeTab !== 'all') {
      filtered = filtered.filter((faq) => faq.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [activeTab, searchQuery]);

  return (
    <div className={`${styles.page} ${inter.className}`}>
      <header className={styles.hero}>
        <span className={styles.badge}>
          <FaQuestionCircle className={styles.badgeIcon} aria-hidden="true" />
          Help Centre
        </span>
        <h1 className={`${styles.title} ${outfit.className}`}>Answers, clearly.</h1>
        <p className={styles.lead}>
          Everything you need to know about booking, paying and travelling with Voyara.
        </p>
      </header>

      <div className={styles.body}>
        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search questions"
          />
        </div>

        <div className={styles.filters} role="tablist" aria-label="FAQ categories">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`${styles.filterBtn} ${activeTab === id ? styles.filterActive : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {filteredFaqs.length === 0 ? (
          <p className={styles.empty}>
            No questions match your search. Try another keyword or category.
          </p>
        ) : (
          <Accordion
            defaultValue="q1"
            variant="separated"
            chevronPosition="right"
            transitionDuration={200}
            className={styles.list}
            classNames={{
              item: styles.item,
              control: styles.control,
              label: styles.controlLabel,
              chevron: styles.chevron,
              panel: styles.panel,
              content: styles.panelContent,
            }}
          >
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionControl>
                  <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.question}>{faq.question}</span>
                </AccordionControl>
                <AccordionPanel>{faq.answer}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <section className={styles.help} aria-label="Still need help">
        <div className={styles.helpInner}>
          <div className={styles.trustBar}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden="true">
                <FaShieldAlt />
              </span>
              <div>
                <p className={styles.trustTitle}>Secure booking</p>
                <p className={styles.trustText}>PCI-DSS payments, ATOL-protected packages.</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden="true">
                <FaHeadset />
              </span>
              <div>
                <p className={styles.trustTitle}>24/7 in-trip support</p>
                <p className={styles.trustText}>Direct WhatsApp line to a real concierge.</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon} aria-hidden="true">
                <HiOutlineSparkles />
              </span>
              <div>
                <p className={styles.trustTitle}>Handpicked only</p>
                <p className={styles.trustText}>Every hotel and experience personally vetted.</p>
              </div>
            </div>
          </div>

          <div className={styles.helpHeader}>
            <p className={styles.helpEyebrow}>Still need help?</p>
            <h2 className={`${styles.helpTitle} ${outfit.className}`}>Talk to a real human.</h2>
            <p className={styles.helpLead}>
              Our concierge desk is available every day of the year.
            </p>
          </div>

          <div className={styles.helpCards}>
            <a href="#chat" className={styles.helpCard}>
              <span className={styles.helpCardIcon} aria-hidden="true">
                <FaComments />
              </span>
              <span className={styles.helpCardLabel}>Live chat</span>
              <span className={styles.helpCardValue}>Chat with concierge</span>
              <span className={styles.helpCardLink}>Open chat →</span>
            </a>
            <a href="tel:+442079460000" className={styles.helpCard}>
              <span className={styles.helpCardIcon} aria-hidden="true">
                <FaPhoneAlt />
              </span>
              <span className={styles.helpCardLabel}>Call the desk</span>
              <span className={styles.helpCardValue}>+44 20 7946 0000</span>
              <span className={styles.helpCardLink}>Call now →</span>
            </a>
            <a href="mailto:concierge@voyara.travel" className={styles.helpCard}>
              <span className={styles.helpCardIcon} aria-hidden="true">
                <FaEnvelope />
              </span>
              <span className={styles.helpCardLabel}>Email us</span>
              <span className={styles.helpCardValue}>concierge@voyara.travel</span>
              <span className={styles.helpCardLink}>Send email →</span>
            </a>
          </div>

          <div className={styles.consultBanner}>
            <div className={styles.consultCopy}>
              <h3 className={`${styles.consultTitle} ${outfit.className}`}>
                Rather have us book it for you?
              </h3>
              <p className={styles.consultText}>
                Book a free 30-minute call with a senior travel designer.
              </p>
            </div>
            <Link href="/contact-us" className={styles.consultBtn}>
              Book a consultation →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
