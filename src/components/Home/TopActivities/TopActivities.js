'use client';

import { useEffect, useState } from 'react';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { GoPerson } from 'react-icons/go';
import { HiOutlineSparkles } from 'react-icons/hi2';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import styles from './TopActivities.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

const getActivityImage = (activity) =>
  activity.featured_image || activity.banner_image || PLACEHOLDER_IMAGE;

const getActivityName = (activity) =>
  activity.title || activity.city || '';

const getActivityLocation = (activity) => {
  const parts = [activity.city, activity.country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (activity.address) return activity.address;
  return '';
};

const getActivityHref = (activity, activityDate) => {
  if (activity.provider === 'hotelbeds') return null;
  return `/activities/${activity.slug}?from=${activityDate}&to=${activityDate}&language=en`;
};

function ActivityCardSkeleton({ variant = 'default' }) {
  return (
    <div
      className={`${styles.destCard} ${styles.skeletonCard} ${styles[`variant_${variant}`] || ''}`}
      aria-hidden="true"
    >
      <div className={`${styles.skeletonBlock} ${styles.skeletonFill}`} />
      <div className={styles.skeletonOverlay}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonName}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
      </div>
      <div className={`${styles.skeletonBlock} ${styles.skeletonArrow}`} />
    </div>
  );
}

function DestinationCard({ activity, variant, isEditorsPick, activityDate }) {
  const name = getActivityName(activity);
  const location = getActivityLocation(activity);
  const maxPeople = Number(activity.max_people) > 0 ? activity.max_people : null;
  const hasPrice = activity.sale_price != null && activity.sale_price !== '';
  const href = getActivityHref(activity, activityDate);
  const image = getActivityImage(activity);

  const content = (
    <>
      <Image
        src={image}
        alt={name || activity.title || 'Activity'}
        fill
        className={styles.cardImage}
        sizes="(max-width: 767px) 85vw, (max-width: 991px) 50vw, 40vw"
      />
      <div className={styles.cardGradient} aria-hidden="true" />

      {isEditorsPick && (
        <span className={styles.editorsBadge}>Editor&apos;s Pick</span>
      )}

      <div className={styles.cardContent}>
        <div className={styles.cardText}>
          {name ? (
            <h3 className={`${styles.cardName} ${outfit.className}`}>{name}</h3>
          ) : null}

          {(location || maxPeople) && (
            <div className={styles.infoRow}>
              {location ? (
                <span className={styles.infoItem}>
                  <FaMapMarkerAlt className={styles.infoIcon} aria-hidden="true" />
                  {location}
                </span>
              ) : null}
              {location && maxPeople ? (
                <span className={styles.infoDot} aria-hidden="true" />
              ) : null}
              {maxPeople ? (
                <span className={styles.infoItem}>
                  <GoPerson className={styles.infoIcon} aria-hidden="true" />
                  Max {maxPeople}
                </span>
              ) : null}
            </div>
          )}

          {hasPrice ? (
            <div className={styles.priceRow}>
              <span className={`${styles.priceValue} ${outfit.className}`}>
                <PriceDisplay
                  price={activity.sale_price}
                  currency={activity.currency_code}
                />
              </span>
              <span className={styles.priceUnit}>/person</span>
            </div>
          ) : null}
        </div>
        <span className={styles.arrowBtn}>Grab Deals</span>
      </div>
    </>
  );

  const className = `${styles.destCard} ${styles[`variant_${variant}`] || ''}`;

  if (!href) {
    return (
      <article className={`${className} ${styles.cardDisabled}`} aria-label={name}>
        {content}
      </article>
    );
  }

  return (
    <Link href={href} className={className} aria-label={name || activity.title}>
      {content}
    </Link>
  );
}

export default function TopActivities() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/activities/search?date=${moment().add(1, 'days').format('YYYY-MM-DD')}`,
          {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!res.ok) return;

        const response = await res.json();

        if (response.Success && Array.isArray(response?.Content?.activities)) {
          setActivities(response.Content.activities);
        }
      } catch (error) {
        console.error('Activities fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (!isLoading && !activities.length) return null;

  const activityDate = moment().add(1, 'days').format('YYYY-MM-DD');
  const topFour = activities.slice(0, 4);
  // Bento: tall left · wide top-right · two small bottom
  const variants = ['tall', 'wide', 'sm', 'sm'];

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Popular Destinations">
      <div className="container">
        <header className={styles.header}>
          <span className={styles.tag}>
            <HiOutlineSparkles className={styles.tagIcon} aria-hidden="true" />
            Activities & Experiences
          </span>
          <h2 className={`${styles.title} ${outfit.className}`}>
            Moments you'll remember
            forever.
          </h2>
        </header>

        {isLoading ? (
          <>
            <div className={styles.bentoGrid} aria-busy="true" aria-label="Loading destinations">
              <ActivityCardSkeleton variant="tall" />
              <ActivityCardSkeleton variant="wide" />
              <ActivityCardSkeleton variant="sm" />
              <ActivityCardSkeleton variant="sm" />
            </div>
            <div className={styles.mobileTrack} aria-busy="true" aria-label="Loading destinations">
              <div className={styles.mobileRow}>
                {[0, 1, 2, 3].map((i) => (
                  <ActivityCardSkeleton key={i} variant="mobile" />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.bentoGrid}>
              {topFour.map((activity, index) => (
                <DestinationCard
                  key={activity.id || activity.slug || index}
                  activity={activity}
                  variant={variants[index] || 'sm'}
                  isEditorsPick={index === 0}
                  activityDate={activityDate}
                />
              ))}
            </div>

            <div className={styles.mobileTrack}>
              <div className={styles.mobileRow}>
                {topFour.map((activity, index) => (
                  <DestinationCard
                    key={`m-${activity.id || activity.slug || index}`}
                    activity={activity}
                    variant="mobile"
                    isEditorsPick={index === 0}
                    activityDate={activityDate}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
