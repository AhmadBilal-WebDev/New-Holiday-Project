'use client';

import { useEffect, useState } from 'react';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import { Inter, Outfit } from 'next/font/google';
import { FaArrowLeft, FaArrowRight, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css/pagination';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import styles from './TopHotels.module.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const encodeProvider = (str) =>
  [...str].map((c) => (c.charCodeAt(0) + 3).toString(36)).join('');

const providerShortName = (encodedProvider) => {
  if (!encodedProvider) return '';
  return encodeProvider(encodedProvider).toLowerCase();
};

const makeSlug = (name) =>
  name?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || '';

const renderStars = (rating) => {
  const count = Math.min(5, Math.max(0, Math.floor(Number(rating) || 4)));
  return Array.from({ length: count }, (_, i) => (
    <FaStar key={i} className={styles.star} aria-hidden="true" />
  ));
};

const getAmenityLine = (hotel) => {
  const parts = [];
  const roomName =
    hotel?.rooms?.[0]?.name ||
    hotel?.rooms?.[0]?.room_name ||
    hotel?.metadata?.room_type;
  if (roomName) parts.push(String(roomName).split(/[,|-]/)[0].trim());

  const facilities = (hotel?.facilities || []).map((f) =>
    typeof f === 'string' ? f : f?.name || f?.title || ''
  );

  const pick = (keywords) =>
    facilities.find((f) => keywords.some((k) => f.toLowerCase().includes(k)));

  const breakfast = pick(['breakfast', 'bb', 'bed and']);
  if (breakfast) parts.push(breakfast);

  const view = pick(['haram', 'kaaba', 'view', 'sea', 'city']);
  if (view) parts.push(view);

  if (parts.length === 0) return '';
  return parts.slice(0, 3).join(' · ');
};

const getFeatureTags = (hotel) => {
  return (hotel?.facilities || [])
    .map((f) => (typeof f === 'string' ? f : f?.name || f?.title || ''))
    .filter(Boolean)
    .slice(0, 3);
};

function HotelCardSkeleton() {
  return (
    <article className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeletonBlock} ${styles.skeletonImage}`} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonLine}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonLineWide}`} />
        <div className={styles.skeletonTags}>
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

export default function TopHotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchData, setSearchData] = useState({});

  useEffect(() => {
    const getTopHotelsWithDetails = async () => {
      try {
        const request = {
          provider: 'custom',
          checkIn: moment().add(1, 'days').format('YYYY-MM-DD'),
          checkOut: moment().add(2, 'days').format('YYYY-MM-DD'),
          rooms: [{ adults: 2, children: [] }],
        };

        setSearchData({
          check_in: request.checkIn,
          check_out: request.checkOut,
          provider: request.provider,
          rooms: request.rooms,
        });

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/hotel/search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          }
        );

        if (!res.ok) return setLoading(false);

        const data = await res.json();
        const hotelsList = data.data?.hotels || [];

        if (!hotelsList.length) return setLoading(false);

        const { checkIn, checkOut } = request;

        const detailedHotels = await Promise.all(
          hotelsList.map(async (hotel) => {
            try {
              const detailRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    provider: hotel.provider,
                    hotelId: hotel.id,
                    checkIn,
                    checkOut,
                  }),
                }
              );

              if (!detailRes.ok) {
                return { ...hotel, mainImage: hotel.image };
              }

              const detailData = await detailRes.json();
              return {
                ...hotel,
                mainImage:
                  detailData.data?.main_images?.[0]?.url || hotel.image,
                address: detailData.data?.address || '',
                facilities: detailData.data?.facilities || [],
              };
            } catch {
              return { ...hotel, mainImage: hotel.image };
            }
          })
        );

        setHotels(detailedHotels);
      } catch (error) {
        console.error('Hotel fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    getTopHotelsWithDetails();
  }, []);

  const handleClick = (hotel) => {
    if (hotel?.rooms) {
      localStorage.setItem('HotelSearchData', JSON.stringify(searchData));
      localStorage.setItem('roomSelection', JSON.stringify(hotel.rooms));
    }
  };

  if (!loading && !hotels.length) return null;

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Top Hotels">
      <div className="container">
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.tag}>
              <HiOutlineSparkles className={styles.tagIcon} aria-hidden="true" />
              Luxury Hotels
            </span>
            <h2 className={`${styles.title} ${outfit.className}`}>
              Stays that feel like private residences.
            </h2>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.navBtn} topHotels-prev`}
              aria-label="Previous hotels"
            >
              <FaArrowLeft />
            </button>
            <button
              type="button"
              className={`${styles.navBtn} topHotels-next`}
              aria-label="Next hotels"
            >
              <FaArrowRight />
            </button>
          </div>
        </header>

        {loading ? (
          <div className={styles.skeletonGrid} role="status" aria-label="Loading hotels">
            <HotelCardSkeleton />
            <HotelCardSkeleton />
            <HotelCardSkeleton />
          </div>
        ) : (
          <div className={styles.sliderWrap}>
            <Swiper
              modules={[Pagination, Navigation]}
              spaceBetween={24}
              slidesPerView={1}
              slidesPerGroup={1}
              watchOverflow
              pagination={{ clickable: true, dynamicBullets: true }}
              navigation={{
                nextEl: '.topHotels-next',
                prevEl: '.topHotels-prev',
              }}
              breakpoints={{
                0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
                576: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 18 },
                768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 20 },
                992: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
              }}
              className={styles.hotelSwiper}
            >
              {hotels.slice(0, 8).map((hotel, index) => {
                const amenityLine = getAmenityLine(hotel);
                const tags = getFeatureTags(hotel);
                const href = `/hotels/${makeSlug(hotel.name)}?id=${hotel.id}&code=${providerShortName(hotel.provider)}`;

                return (
                  <SwiperSlide key={hotel.id ?? index}>
                    <Link
                      target="_blank"
                      onClick={() => handleClick(hotel)}
                      href={href}
                      className={styles.cardLink}
                    >
                      <article className={styles.card}>
                        <div className={styles.imageWrap}>
                          <Image
                            fill
                            src={hotel.mainImage}
                            alt={hotel.name}
                            className={styles.cardImage}
                            sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
                          />
                          <div className={styles.ratingBadge}>
                            {renderStars(hotel.rating ?? hotel?.metadata?.stars)}
                          </div>
                        </div>

                        <div className={styles.cardBody}>
                          <h3 className={`${styles.hotelName} ${outfit.className}`}>
                            {hotel.name}
                          </h3>

                          {hotel?.location?.city && (
                            <div className={styles.location}>
                              <FaMapMarkerAlt
                                className={styles.locationIcon}
                                aria-hidden="true"
                              />
                              <span>{hotel.location.city}</span>
                            </div>
                          )}

                          {amenityLine ? (
                            <p className={styles.amenityLine}>{amenityLine}</p>
                          ) : null}

                          {tags.length > 0 && (
                            <div className={styles.featureTags}>
                              {tags.map((tag, ti) => (
                                <span key={`${tag}-${ti}`} className={styles.featureTag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <hr className={styles.divider} />

                          <div className={styles.footer}>
                            <div className={styles.priceBlock}>
                              <span className={styles.priceFrom}>from</span>
                              <div className={styles.priceRow}>
                                <span className={`${styles.priceValue} ${outfit.className}`}>
                                  <PriceDisplay
                                    currency={hotel?.metadata?.currency}
                                    price={hotel?.metadata?.min_price}
                                  />
                                </span>
                                <span className={styles.pricePer}>/night</span>
                              </div>
                              <span className={styles.taxNote}>Vat & Taxes Included</span>
                            </div>
                            <span className={styles.reserveBtn}>Reserve</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </div>
    </section>
  );
}
