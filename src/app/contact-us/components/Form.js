'use client';

import { useState } from 'react';
import { Inter, Outfit } from 'next/font/google';
import { FaComments, FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import { notifications } from '@mantine/notifications';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from '../ContactUs.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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

export default function Form() {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setErrors({
      ...errors,
      [e.target.name]: '',
    });
  };

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;
    if (!captchaToken) {
      setErrorMsg('Please verify captcha');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

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
    } catch (error) {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.contactform} ${inter.className}`}>
      <div className={styles.formHeader}>
        <span className={styles.formHeaderIcon} aria-hidden="true">
          <FaComments />
        </span>
        <div className={styles.formHeaderText}>
          <h2 className={`${styles.formTitle} ${outfit.className}`}>
            Start a conversation
          </h2>
          <p className={styles.formSubtitle}>
            A dedicated designer will reach out shortly.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="contact-name">
              Full Name
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="contact-email">
              Email Address
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="jane@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel} htmlFor="contact-subject">
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              name="subject"
              className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
              placeholder="Enter your subject"
              value={formData.subject}
              onChange={handleChange}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel} htmlFor="contact-message">
              Your Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
              placeholder="Tell us about dates, travellers, pace and anything that matters to you."
              value={formData.message}
              onChange={handleChange}
            />
          </div>

          <div className={styles.captchaWrap}>
            <ReCAPTCHA
              sitekey="6LdH_IQsAAAAAP8J5zF09QteWVZjAjnWSJjrW64J"
              onChange={handleCaptcha}
            />
          </div>

          {errorMsg ? <p className={styles.formError}>{errorMsg}</p> : null}
        </div>

        <div className={styles.formFooter}>
          <p className={styles.privacyNote}>
            <FaCheckCircle className={styles.privacyIcon} aria-hidden="true" />
            Your details stay private. No spam, ever.
          </p>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Sending...' : 'Send message'}
            <FaPaperPlane aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
