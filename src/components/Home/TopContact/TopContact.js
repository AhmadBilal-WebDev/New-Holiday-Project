'use client';

import { useState } from 'react';
import { Inter, Outfit } from 'next/font/google';
import {
  FaComments,
  FaHeadset,
  FaEnvelope,
  FaShieldAlt,
  FaUser,
  FaPhoneAlt,
  FaPaperPlane,
} from 'react-icons/fa';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { notifications } from '@mantine/notifications';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from './TopContact.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const initialState = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const SUPPORT_ITEMS = [
  {
    id: 1,
    icon: FaHeadset,
    title: 'Expert Support',
    text: "We're here to help you",
  },
  {
    id: 2,
    icon: FaEnvelope,
    title: 'Expert Support',
    text: "We're here to help you",
  },
  {
    id: 3,
    icon: FaShieldAlt,
    title: 'Expert Support',
    text: "We're here to help you",
  },
];

export default function TopContact() {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
  };

  const validate = () => {
    const newErrors = {
      name: !formData.name.trim(),
      email:
        !formData.email ||
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email),
      subject: !formData.subject.trim(),
      message: !formData.message.trim(),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to submit');
      const response = await res.json();

      notifications.show({
        title: 'Success',
        message: response?.Description,
        color: 'green',
      });

      setFormData(initialState);
      setCaptchaToken(null);
      setErrors({});
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Contact Us">
      <div className="container">
        <div className={styles.panel}>
          <div className={styles.left}>
            <span className={styles.badge}>
              <FaComments className={styles.badgeIcon} aria-hidden="true" />
              We&apos;re here to help you
            </span>

            <h2 className={`${styles.title} ${outfit.className}`}>
              Get in touch with us.
            </h2>

            <p className={styles.subtitle}>
              Have a question, need a quote or planning your next holiday? Our
              travel experts are just a message away.
            </p>

            <div className={styles.supportRow}>
              {SUPPORT_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className={styles.supportItem}>
                    <span className={styles.supportIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <div className={styles.supportText}>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.right}>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.row}>
                <div className={styles.field}>
                  <div className={`${styles.inputWrap} ${errors.name ? styles.inputError : ''}`}>
                    <FaUser className={styles.inputIcon} aria-hidden="true" />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      autoComplete="name"
                      aria-label="Full Name"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={`${styles.inputWrap} ${errors.email ? styles.inputError : ''}`}>
                    <FaEnvelope className={styles.inputIcon} aria-hidden="true" />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      aria-label="Email Address"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <div className={`${styles.inputWrap} ${errors.subject ? styles.inputError : ''}`}>
                  <FaPhoneAlt className={styles.inputIcon} aria-hidden="true" />
                  <input
                    type="tel"
                    name="subject"
                    placeholder="Phone Number"
                    value={formData.subject}
                    onChange={handleChange}
                    autoComplete="tel"
                    aria-label="Phone Number"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div
                  className={`${styles.inputWrap} ${styles.textareaWrap} ${
                    errors.message ? styles.inputError : ''
                  }`}
                >
                  <HiChatBubbleLeftRight className={styles.textareaIcon} aria-hidden="true" />
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={handleChange}
                    aria-label="How can we help you?"
                  />
                </div>
              </div>

              {/* <div className={styles.captchaWrap}>
                <ReCAPTCHA
                  sitekey="6LdH_IQsAAAAAP8J5zF09QteWVZjAjnWSJjrW64J"
                  onChange={handleCaptcha}
                />
              </div> */}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                <FaPaperPlane aria-hidden="true" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
