'use client'
import { useEffect, useState } from "react";
import { Inter, Outfit } from 'next/font/google';
import PackageSlider from "./PackageSlider";
import styles from './PackageCategories.module.css';
import { HiOutlineSparkles } from "react-icons/hi2";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

const inter = Inter({
    subsets: ['latin'],
    weight: ['600'],
});

const outfit = Outfit({
    subsets: ['latin'],
    weight: ['700'],
});

function PackageCardSkeleton() {
    return (
        <article className={styles.skeletonCard} aria-hidden="true">
            <div className={`${styles.skeletonBlock} ${styles.skeletonImage}`} />
            <div className={styles.skeletonBody}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonLine}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonLineShort}`} />
                <div className={styles.skeletonTags}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTag}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTag}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTag}`} />
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTag}`} />
                </div>
                <div className={styles.skeletonFooter}>
                    <div>
                        <div className={`${styles.skeletonBlock} ${styles.skeletonPrice}`} />
                        <div className={`${styles.skeletonBlock} ${styles.skeletonNote}`} />
                    </div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonBtn}`} />
                </div>
            </div>
        </article>
    );
}

function PackageSkeletonGrid() {
    return (
        <div className={styles.skeletonGrid} role="status" aria-label="Loading packages">
            <PackageCardSkeleton />
            <PackageCardSkeleton />
            <PackageCardSkeleton />
        </div>
    );
}

export default function PackageCategories({ categories, initialSlug, initialPackages }) {
    const [activeSlug, setActiveSlug] = useState(initialSlug);
    const [packagesList, setPackagesList] = useState(initialPackages);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setPackagesList(initialPackages);
    }, [initialPackages]);
    const handleCategoryClick = async (slug) => {
        setActiveSlug(slug);
        setLoading(true);

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/packages/search?category_slug=${slug !== 'all' ? slug : ''}`,
            {
                cache: 'no-store',
                headers: {
                     'Content-Type': 'application/json',
                    }
            }
        );

        const data = await res.json();
        setPackagesList(data?.Content?.packages || []);
        setLoading(false);
    };

    return (
        <div className={`gray-simple home-package-section ${styles.section}`}>
            <div className="container">
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <span className={`${styles.tag} ${inter.className}`}>
                            <HiOutlineSparkles className={styles.tagIcon} aria-hidden="true" />
                            Featured Packages
                        </span>
                        <h2 className={`${styles.title} ${outfit.className}`}>
                            Holiday packages, crafted with care.
                        </h2>
                        <p className={styles.subtitle}>
                            Six of our most-loved journeys, ready to book — flights, stays and experiences included.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            type="button"
                            className={`${styles.scrollBtn} custom-prevh`}
                            aria-label="Previous packages"
                        >
                            <FaArrowLeft />
                        </button>
                        <button
                            type="button"
                            className={`${styles.scrollBtn} custom-nexth`}
                            aria-label="Next packages"
                        >
                            <FaArrowRight />
                        </button>
                    </div>
                </header>

                {loading ? (
                    <PackageSkeletonGrid />
                ) : (
                    <PackageSlider packages={packagesList} hideControls />
                )}
            </div>
        </div>
    );
}
