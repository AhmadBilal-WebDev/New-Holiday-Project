'use client';

import { Inter, Outfit } from 'next/font/google';
import { FaStar, FaCheck, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import styles from './TopTravelsStories.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const STORIES = [
  {
    id: 1,
    stars: 5,
    quote:
      'Voyara made planning effortless. From airport pickup to our overwater villa — every detail felt intentional. We\'ll never book travel any other way.',
    initials: 'AO',
    name: 'Amara Okafor',
    tripInfo: 'Honeymoon in Maldives',
  },
  {
    id: 2,
    stars: 5,
    quote:
      'The concierge team went above and beyond when our flight was delayed. They rearranged everything within an hour. Truly world-class service.',
    initials: 'JW',
    name: 'James Whitfield',
    tripInfo: 'Family safari, Kenya',
  },
  {
    id: 3,
    stars: 5,
    quote:
      'As a solo traveler, feeling looked-after matters. Voyara\'s 24/7 support and curated stays made Kyoto feel like home. Already planning the next trip.',
    initials: 'SM',
    name: 'Sofia Marino',
    tripInfo: 'Solo escape to Kyoto',
  },
  {
    id: 4,
    stars: 5,
    quote:
      'Seamless booking, honest pricing, and stays that matched the photos exactly. Voyara took the stress out of our family Umrah — highly recommend.',
    initials: 'RK',
    name: 'Ravi Kapoor',
    tripInfo: 'Family trip to Makkah',
  },
  {
    id: 5,
    stars: 5,
    quote:
      'From transfers to activities, everything connected perfectly. The best price guarantee actually mattered — we felt confident booking end to end.',
    initials: 'EL',
    name: 'Elena Lopez',
    tripInfo: 'City break in Dubai',
  },
];

function StoryCard({ story }) {
  return (
    <article className={styles.card}>
      <div className={styles.stars} aria-label={`${story.stars} out of 5 stars`}>
        {Array.from({ length: story.stars }).map((_, i) => (
          <FaStar key={i} className={styles.star} aria-hidden="true" />
        ))}
      </div>

      <p className={styles.quote}>{story.quote}</p>

      <hr className={styles.divider} />

      <div className={styles.author}>
        <span className={styles.avatar} aria-hidden="true">
          {story.initials}
        </span>
        <div className={styles.authorInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{story.name}</span>
            <span className={styles.verified} title="Verified traveler" aria-label="Verified">
              <FaCheck aria-hidden="true" />
            </span>
          </div>
          <span className={styles.tripInfo}>{story.tripInfo}</span>
        </div>
      </div>
    </article>
  );
}

export default function TopTravelsStories() {
  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Traveler Stories">
      <div className="container">
        <header className={styles.header}>
          <span className={styles.badge}>
            <span className={styles.badgeQuote} aria-hidden="true">
              ”
            </span>
            Traveler Stories
          </span>
          <h2 className={`${styles.title} ${outfit.className}`}>
            Loved by travelers around the world.
          </h2>
        </header>

        <div className={styles.sliderWrap}>
          <Swiper
            modules={[Navigation]}
            spaceBetween={24}
            slidesPerView={1}
            slidesPerGroup={1}
            watchOverflow
            navigation={{
              nextEl: '.topStories-next',
              prevEl: '.topStories-prev',
            }}
            breakpoints={{
              0: { slidesPerView: 1, spaceBetween: 16 },
              768: { slidesPerView: 2, spaceBetween: 20 },
              992: { slidesPerView: 3, spaceBetween: 24 },
            }}
            className={styles.storiesSwiper}
          >
            {STORIES.map((story) => (
              <SwiperSlide key={story.id} className={styles.slide}>
                <StoryCard story={story} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className={styles.controls}>
            <button
              type="button"
              className={`${styles.navBtn} topStories-prev`}
              aria-label="Previous stories"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              className={`${styles.navBtn} topStories-next`}
              aria-label="Next stories"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
