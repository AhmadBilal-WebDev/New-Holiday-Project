import React from "react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { FaPhone, FaUser, FaRegCalendarAlt, FaClock, FaStar } from "react-icons/fa";
import BlogListing from "./BlogListing";
import styles from "./Blogs.module.css";

export default async function page({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = resolvedParams?.page || 1;

  let blogs = [];
  let paggination = {};
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/blogs?page=${page}`;
    const res = await fetch(url, {
      cache: "no-store",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await res.json();
    if (response?.Success) {
      blogs = response?.Content?.posts || [];
      paggination = response?.Content?.pagination || {};
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }

  if (!blogs || blogs === null) blogs = [];
  const featuredBlog = blogs[0] || null;
  const restBlogs = blogs.slice(1);
  const currentPage = paggination.current_page || 1;
  const totalPages = paggination.last_page || 1;
  const total = paggination.total || 0;
  const from = paggination.from || 0;
  const to = paggination.to || 0;

  const featuredDate = featuredBlog?.created_at
    ? moment(featuredBlog.created_at, "DD-MM-YYYY HH:mm:ss").isValid()
      ? moment(featuredBlog.created_at, "DD-MM-YYYY HH:mm:ss").format("D MMM YYYY")
      : moment(featuredBlog.created_at).format("D MMM YYYY")
    : "";

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <Image
          src="/updatedImages/blog_herosection.jpg"
          alt="Travel guides hero"
          fill
          priority
          className={styles.heroImage}
          sizes="100vw"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <FaClock size={12} aria-hidden />
            TRAVEL GUIDES &amp; TIPS
          </span>
          <h1 className={styles.heroTitle}>
            Umrah Travel Guides, Tips &amp; Spiritual{" "}
            <span className={styles.heroAccent}>Advice</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Stay informed with expert-written articles covering Umrah packages,
            visa guidance, travel planning, and step-by-step pilgrimage support
            for travellers.
          </p>
        </div>
      </section>

      {featuredBlog && (
        <div className={styles.featuredWrap}>
          <div className="container">
            <article className={styles.featuredCard}>
              <div className={styles.featuredImageWrap}>
                {featuredBlog?.thumbnail?.url ? (
                  <Image
                    src={featuredBlog.thumbnail.url}
                    alt={featuredBlog?.title || featuredBlog?.slug || "Featured"}
                    fill
                    className={styles.featuredImage}
                    sizes="(max-width: 768px) 100vw, 48vw"
                    priority
                  />
                ) : (
                  <div className={styles.imageFallback} />
                )}
                <span className={styles.featuredBadge}>
                  <FaStar size={11} aria-hidden /> Featured Article
                </span>
              </div>
              <div className={styles.featuredBody}>
                <p className={styles.featuredMeta}>
                  <span>
                    <FaUser size={12} aria-hidden />
                    {featuredBlog?.author?.name || "Voyara"}
                  </span>
                  <span>
                    <FaRegCalendarAlt size={12} aria-hidden />
                    {featuredDate}
                  </span>
                </p>
                <h2 className={styles.featuredTitle}>{featuredBlog.title}</h2>
                {(featuredBlog?.excerpt ||
                  featuredBlog?.seo?.meta_description) && (
                  <p className={styles.featuredExcerpt}>
                    {featuredBlog?.seo?.meta_description ||
                      featuredBlog?.excerpt}
                  </p>
                )}
                <div className={styles.featuredActions}>
                  <Link
                    href={`/blogs/${featuredBlog.slug}`}
                    className={styles.btnPrimary}
                  >
                    Read More
                  </Link>
                  <Link href="/contact-us" className={styles.btnOutline}>
                    <FaPhone size={13} /> Contact Us
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      <BlogListing
        blogs={restBlogs}
        totalPages={totalPages}
        currentPage={currentPage}
        total={total}
        from={from}
        to={to}
      />
    </div>
  );
}

export const metadata = {
  title:
    "The Ultimate Guide for Hajj and Umrah: A Complete Picture Guide to Every Step",
  description:
    "Explore expert Umrah & Hajj guides, travel tips, and spiritual insights for pilgrims. Your trusted resource for Islamic journeys to Makkah & Madinah.",
  keywords:
    "Umrah Blogs, Islamic Blogs, Islamic travel blogs, Travel tips, Hajj and Umrah travel guide, Umrah travel guide, Umrah travel tips, Hajj travel tips, Umrah guide, Muslim travel guide, Spiritual journeys for Muslims, Guide for Hajj and Umrah",
  alternates: {
    canonical: "https://alhijaztours.net/blogs",
  },
};
