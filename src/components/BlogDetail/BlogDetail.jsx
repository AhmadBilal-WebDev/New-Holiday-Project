import Link from "next/link";
import RecentBlogs from "./RecentBlogs";
import moment from "moment";
import Image from "next/image";
import { FaArrowLeft, FaRegCalendarAlt, FaClock, FaUser } from "react-icons/fa";
import styles from "./BlogDetailHero.module.css";

function formatDate(value) {
  if (!value) return "";
  const parsed = moment(value, "DD-MM-YYYY HH:mm:ss", true);
  if (parsed.isValid()) return parsed.format("MMMM D, YYYY");
  const fallback = moment(value);
  return fallback.isValid() ? fallback.format("MMMM D, YYYY") : String(value);
}

function getReadTime(blog) {
  if (blog?.reading_time) return `${blog.reading_time} min read`;
  const words = String(blog?.content || "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

const BlogDetail = ({ selectedBlog }) => {
  const dateLabel = formatDate(selectedBlog?.created_at);
  const readLabel = getReadTime(selectedBlog);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.inner}>
            <Link href="/blogs" className={styles.backLink}>
              <FaArrowLeft size={12} aria-hidden />
              Back to Blogs
            </Link>

            {selectedBlog?.category?.name && (
              <span className={styles.badge}>{selectedBlog.category.name}</span>
            )}

            <h1 className={styles.title}>{selectedBlog?.title}</h1>

            {(selectedBlog?.excerpt ||
              selectedBlog?.seo?.meta_description) && (
              <p className={styles.excerpt}>
                {selectedBlog.seo?.meta_description || selectedBlog.excerpt}
              </p>
            )}

            <div className={styles.metaRow}>
              <div className={styles.author}>
                <div className={styles.authorIcon}>
                  <Image
                    src="/updatedImages/Main-Logo.svg"
                    alt="Voyara"
                    fill
                    style={{ objectFit: "contain", padding: "8px" }}
                  />
                </div>
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>
                    <FaUser size={11} aria-hidden />
                    {selectedBlog?.author?.name || "Voyara"}
                  </span>
                  <span className={styles.authorMeta}>
                    {dateLabel && (
                      <>
                        <FaRegCalendarAlt size={11} aria-hidden />
                        {dateLabel}
                      </>
                    )}
                    {dateLabel && readLabel ? (
                      <span className={styles.metaDot}>•</span>
                    ) : null}
                    {readLabel && (
                      <>
                        <FaClock size={11} aria-hidden />
                        {readLabel}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedBlog?.thumbnail?.url && (
        <div className={styles.thumbWrap}>
          <div className="container">
            <div className={styles.thumbFrame}>
              <Image
                src={selectedBlog.thumbnail.url}
                alt={selectedBlog?.title || "Blog"}
                fill
                className={styles.thumbImage}
                sizes="(max-width: 900px) 100vw, 900px"
                priority
              />
            </div>
          </div>
        </div>
      )}

      <section className={styles.contentSection}>
        <div className="container">
          <article className={styles.blogContent}>
            <div
              className={styles.blogContentBody}
              dangerouslySetInnerHTML={{
                __html: selectedBlog?.content || "",
              }}
            />
          </article>
        </div>
      </section>

      <div className={styles.ctaWrap}>
        <div className="container">
          <div className={styles.ctaBox}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Plan Your Umrah in Minutes</h2>
              <p className={styles.ctaSubtitle}>
                Talk to our travel specialists and get the best available
                options tailored for you.
              </p>
              <Link href="/contact-us" className={styles.ctaBtn}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      <RecentBlogs currentSlug={selectedBlog?.slug} />
    </div>
  );
};

export default BlogDetail;
