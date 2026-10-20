'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaArrowLeft, FaArrowRight, FaClock } from 'react-icons/fa';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import styles from './TopJornal.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
});

const PLACEHOLDER_IMAGE = '/images/noimage.png';
const MAX_BLOGS = 6;

function formatReadTime(readingTime) {
  if (readingTime == null || readingTime === '') return null;
  const value = String(readingTime).trim();
  if (/min/i.test(value)) return value;
  return `${value} min read`;
}

function JournalCard({ blog }) {
  const imageSrc = blog?.thumbnail?.url || PLACEHOLDER_IMAGE;
  const category = blog?.category?.name || 'Travel Tips';
  const readTime = formatReadTime(blog?.reading_time) || '5 min read';
  const href = blog?.slug ? `/blogs/${blog.slug}` : '/blogs';

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.imageLink}>
        <div className={styles.imageWrap}>
          <Image
            src={imageSrc}
            alt={blog?.title || 'Blog'}
            fill
            sizes="(max-width: 767px) 85vw, (max-width: 991px) 45vw, 33vw"
            className={styles.image}
          />
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.category}>{category}</span>
          <span className={styles.readTime}>
            <FaClock className={styles.clockIcon} aria-hidden="true" />
            {readTime}
          </span>
        </div>

        <h3 className={styles.cardTitle}>
          <Link href={href}>{blog?.title}</Link>
        </h3>

        <Link href={href} className={styles.readMore}>
          Read more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function JournalCardSkeleton() {
  return (
    <article className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeletonBlock} ${styles.skeletonImage}`} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonMeta}>
          <div className={`${styles.skeletonBlock} ${styles.skeletonTag}`} />
          <div className={`${styles.skeletonBlock} ${styles.skeletonTime}`} />
        </div>
        <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonTitleShort}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonLink}`} />
      </div>
    </article>
  );
}

export default function TopJornal() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`, {
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error('Failed to fetch blogs');

        const data = await res.json();
        const posts = data?.Content?.posts || [];

        if (!cancelled) {
          setBlogs(Array.isArray(posts) ? posts.slice(0, MAX_BLOGS) : []);
        }
      } catch (error) {
        console.error('Journal blogs fetch error:', error);
        if (!cancelled) setBlogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBlogs();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && blogs.length === 0) return null;

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Travel Journal">
      <div className="container">
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.badge}>
              <HiOutlineSparkles className={styles.badgeIcon} aria-hidden="true" />
              Journal
            </span>
            <h2 className={`${styles.title} ${outfit.className}`}>
              Travel inspiration &amp; stories.
            </h2>
          </div>

          <div className={styles.headerActions}>
            {/* <Link href="/blogs" className={styles.journalLink}>
              Read the journal <span aria-hidden="true">↗</span>
            </Link> */}
            <button
              type="button"
              className={`${styles.navBtn} topJournal-prev`}
              aria-label="Previous articles"
            >
              <FaArrowLeft />
            </button>
            <button
              type="button"
              className={`${styles.navBtn} topJournal-next`}
              aria-label="Next articles"
            >
              <FaArrowRight />
            </button>
          </div>
        </header>

        {loading ? (
          <div className={styles.skeletonGrid} role="status" aria-label="Loading blogs">
            <JournalCardSkeleton />
            <JournalCardSkeleton />
            <JournalCardSkeleton />
          </div>
        ) : (
          <div className={styles.sliderWrap}>
            <Swiper
              modules={[Navigation]}
              spaceBetween={24}
              slidesPerView={1}
              slidesPerGroup={1}
              watchOverflow
              navigation={{
                nextEl: '.topJournal-next',
                prevEl: '.topJournal-prev',
              }}
              breakpoints={{
                0: { slidesPerView: 1.15, spaceBetween: 16 },
                576: { slidesPerView: 1.4, spaceBetween: 18 },
                768: { slidesPerView: 2, spaceBetween: 20 },
                992: { slidesPerView: 3, spaceBetween: 24 },
              }}
              className={styles.journalSwiper}
            >
              {blogs.map((blog) => (
                <SwiperSlide key={blog.id || blog.slug} className={styles.slide}>
                  <JournalCard blog={blog} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </section>
  );
}
