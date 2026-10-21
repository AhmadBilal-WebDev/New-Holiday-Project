import Image from "next/image";
import Link from "next/link";
import styles from "./RecentBlogs.module.css";

export default async function RecentBlogs({ currentSlug }) {
  let posts = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      posts = (data?.Content?.posts || [])
        .filter((p) => p?.slug && p.slug !== currentSlug)
        .slice(0, 3);
    }
  } catch {
    /* ignore */
  }

  if (posts.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Related Articles</h2>
            <p className={styles.subheading}>
              More guides and tips for your journey.
            </p>
          </div>
          <Link href="/blogs" className={styles.browseBtn}>
            Browse All Articles
          </Link>
        </div>

        <div className={styles.grid}>
          {posts.map((item, i) => (
            <article key={item?.id || item?.slug || i} className={styles.card}>
              <Link href={`/blogs/${item.slug}`} className={styles.cardLink}>
                <div className={styles.imgWrap}>
                  {item.thumbnail?.url ? (
                    <Image
                      src={item.thumbnail.url}
                      alt={item.title || "Blog"}
                      fill
                      className={styles.img}
                      sizes="(max-width: 576px) 100vw, (max-width: 900px) 50vw, 33vw"
                    />
                  ) : (
                    <div className={styles.imgFallback} />
                  )}
                  <span className={styles.category}>
                    {item.category?.name || "Guides"}
                  </span>
                </div>
                <div className={styles.body}>
                  <h3 className={styles.title}>{item.title}</h3>
                  {(item?.excerpt || item?.seo?.meta_description) && (
                    <p className={styles.excerpt}>
                      {item?.seo?.meta_description || item?.excerpt}
                    </p>
                  )}
                  <span className={styles.readMore}>Read More</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
