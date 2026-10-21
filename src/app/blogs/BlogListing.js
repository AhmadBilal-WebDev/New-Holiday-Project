"use client";

import Image from "next/image";
import Link from "next/link";
import moment from "moment";
import { FaPhone, FaUser, FaRegCalendarAlt } from "react-icons/fa";
import BlogPagination from "./BlogPagination";
import styles from "./Blogs.module.css";

function getCategoryLabel(item) {
  const raw =
    item?.category?.name ||
    item?.category?.title ||
    (typeof item?.category === "string" ? item.category : "") ||
    item?.tags?.[0]?.name ||
    "";
  return String(raw).trim();
}

function formatDate(value) {
  if (!value) return "";
  const parsed = moment(value, "DD-MM-YYYY HH:mm:ss", true);
  if (parsed.isValid()) return parsed.format("D MMM YYYY");
  const fallback = moment(value);
  return fallback.isValid() ? fallback.format("D MMM YYYY") : String(value);
}

export default function BlogListing({
  blogs = [],
  totalPages = 1,
  currentPage = 1,
  total = 0,
  from = 0,
  to = 0,
}) {
  return (
    <section className={styles.listingSection}>
      <div className="container">
        <div className={styles.listingHead}>
          <div className={styles.listingHeadText}>
            <h2 className={styles.listingTitle}>Explore Sacred Travel Articles</h2>
            <p className={styles.listingSubtitle}>
              Practical guides and tips for a smoother, more meaningful journey.
            </p>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No Blogs Found</h3>
            <p>
              We couldn&apos;t find any blog posts at the moment. Please check
              back later.
            </p>
            <Link href="/" className={styles.btnPrimary}>
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.blogGrid}>
              {blogs.map((item, index) => {
                const category = getCategoryLabel(item) || "Guides";
                return (
                  <article
                    key={item?.id || item?.slug || index}
                    className={styles.blogCard}
                  >
                    <div className={styles.blogCardImageWrap}>
                      {item?.thumbnail?.url ? (
                        <Image
                          src={item.thumbnail.url}
                          alt={item?.title || item?.slug || "Blog"}
                          fill
                          className={styles.blogCardImage}
                          sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw"
                        />
                      ) : (
                        <div className={styles.imageFallback} />
                      )}
                      <span className={styles.cardBadge}>{category}</span>
                    </div>
                    <div className={styles.blogCardBody}>
                      <p className={styles.blogCardMeta}>
                        <span>
                          <FaUser size={11} aria-hidden />
                          {item?.author?.name || "Voyara"}
                        </span>
                        <span>
                          <FaRegCalendarAlt size={11} aria-hidden />
                          {formatDate(item?.created_at)}
                        </span>
                      </p>
                      <h3 className={styles.blogCardTitle}>{item.title}</h3>
                      {(item?.excerpt || item?.seo?.meta_description) && (
                        <p className={styles.blogCardExcerpt}>
                          {item?.seo?.meta_description || item?.excerpt}
                        </p>
                      )}
                      <div className={styles.blogCardActions}>
                        <Link
                          href={`/blogs/${item.slug}`}
                          className={styles.btnPrimary}
                        >
                          Read More
                        </Link>
                        <Link href="/contact-us" className={styles.btnOutline}>
                          <FaPhone size={12} /> Contact Us
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <BlogPagination
              totalPages={totalPages}
              currentPage={currentPage}
              total={total}
              from={from}
              to={to}
            />
          </>
        )}
      </div>
    </section>
  );
}
