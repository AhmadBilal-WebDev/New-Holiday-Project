import React from 'react'
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaPlaneDeparture,
  FaStar,
  FaUser,
} from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import moment from 'moment';
import { Outfit } from 'next/font/google';
import PriceDisplay from '../Currency/PriceDisplay';
import styles from './PackageCard.module.css';

const outfit = Outfit({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

function getNights(startDate, endDate) {
  const nights = moment(endDate).diff(moment(startDate), 'days');
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

function getLocationLabel(item) {
  if (item?.city) return item.city;
  if (item?.destination) return item.destination;
  if (item?.location) return item.location;
  const categoryName = item?.category?.name || '';
  return categoryName.replace(/\s*packages?\s*/i, '').trim() || categoryName;
}

function getDepartureLabel(item) {
  return item?.flights?.[0]?.stops?.[0]?.departure_from || '';
}

export default function PackageCard({ packageList }) {
  return (
    <div className={`${styles.list} ${outfit.className}`}>
      {packageList.map((item, index) => {
        const validPrices = item?.price_Details?.filter((p) => p.type !== 'without_beds');
        const minPrice = validPrices?.reduce(
          (min, p) => (Number(p.sale_per_person) < min ? Number(p.sale_per_person) : min),
          validPrices?.[0]?.sale_per_person
        );
        const nights = getNights(item.start_date, item.end_date);
        const nightsLabel = `${nights} Night${nights !== 1 ? 's' : ''}`;
        const categoryLabel = item?.category?.name || 'Packages';
        const locationLabel = getLocationLabel(item);
        const departureLabel = getDepartureLabel(item);
        const rating = Number(item?.star_rating) || 0;
        const href = `/${item.category.slug}/${item.slug}`;
        const dateRange = `${moment(item.start_date).format('DD-MM-YYYY')} – ${moment(item.end_date).format('DD-MM-YYYY')}`;

        return (
          <article className={styles.card} key={item?.id || item?.slug || index}>
            <div className={styles.media}>
              <Link href={href} className={styles.mediaLink} aria-label={item.title}>
                <Image
                  src={item?.featured_image}
                  width={420}
                  height={320}
                  className={styles.image}
                  alt={item.title}
                />
              </Link>
              <span className={styles.badgeNights}>{nightsLabel}</span>
              <span className={styles.badgeCategory}>{categoryLabel}</span>
            </div>

            <div className={styles.body}>
              <div className={styles.topRow}>
                <div className={styles.titleBlock}>
                  <Link href={href} className={styles.title}>
                    {item.title}
                  </Link>
                  {locationLabel ? (
                    <div className={styles.location}>
                      <FaMapMarkerAlt size={13} className={styles.locationIcon} aria-hidden="true" />
                      <span>{locationLabel}</span>
                    </div>
                  ) : null}
                </div>

                <div className={styles.priceBlock}>
                  <span className={styles.priceFrom}>From</span>
                  <span className={styles.priceValue}>
                    <PriceDisplay price={Number(minPrice)} currency={item?.currency_code} />
                  </span>
                  <span className={styles.pricePer}>per person</span>
                  <span className={styles.priceTax}>VAT and Taxes Included</span>
                </div>
              </div>

              <div className={styles.metaRow}>
                {rating > 0 ? (
                  <span className={styles.ratingBadge}>
                    <FaStar size={11} aria-hidden="true" />
                    {rating}
                  </span>
                ) : null}
                <span className={styles.metaItem}>
                  <FaClock size={13} className={styles.metaIcon} aria-hidden="true" />
                  {nightsLabel}
                </span>
                <span className={styles.metaItem}>
                  <FaCalendarAlt size={13} className={styles.metaIcon} aria-hidden="true" />
                  {dateRange}
                </span>
              </div>

              {item?.description_text ? (
                <p className={styles.description}>{item.description_text}</p>
              ) : null}

              <div className={styles.infoList}>
                {departureLabel ? (
                  <div className={styles.infoItem}>
                    <FaPlaneDeparture size={14} className={styles.infoIcon} aria-hidden="true" />
                    <span className={styles.infoText}>Departure: {departureLabel}</span>
                  </div>
                ) : null}
                {item?.pax ? (
                  <div className={styles.infoItem}>
                    <FaUser size={13} className={styles.infoIcon} aria-hidden="true" />
                    <span className={styles.infoText}>{item.pax} Passengers</span>
                  </div>
                ) : null}
              </div>

              <Link href={href} className={styles.bookBtn}>
                Book Now
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
