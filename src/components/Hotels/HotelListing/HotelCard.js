'use client'
import PriceDisplay from '@/components/Currency/PriceDisplay';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react'
import { FaArrowRightLong } from 'react-icons/fa6';
import { IoLocationSharp } from 'react-icons/io5';
import { useHotelList } from './HotelListingContext';
import { useSearchParams } from "next/navigation";
import moment from 'moment';
import { FaCalendarAlt, FaCheck, FaHome, FaStar } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

const hasFreeCancellation = (hotel) => {
  if (!hotel?.rooms?.length) return false;

  const now = moment.utc();

  for (const room of hotel.rooms) {
    for (const rate of room?.rates || []) {
      const policies = rate?.cancellation_policies;
      if (!Array.isArray(policies) || policies.length === 0) continue;

      const allDatesInFuture = policies.every(
        (policy) => policy?.from && moment.utc(policy.from).isAfter(now)
      );
      if (allDatesInFuture) return true;
    }
  }

  return false;
};

const normalizeImageSrc = (raw) => {
  if (!raw) return '/images/hotelloadimg.jpg';
  if (raw.startsWith('data:') || raw.startsWith('/')) return raw;
  // CSP img-src allows https only — upgrade http:// and protocol-relative URLs
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  if (raw.startsWith('//')) return 'https:' + raw;
  return 'https://' + raw.replace(/^\/+/, '');
};

const encodeProvider = (str) => {
  return [...str].map(c => (c.charCodeAt(0) + 3).toString(36)).join('');
};

const makingSlug = (name) => {
  return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
};

const ProviderShortNames = (encodedProvider) => {
  if (!encodedProvider) return '';
  return encodeProvider(encodedProvider).toLowerCase();
};

function useHotelBasicDetail(item, check_in, check_out) {
  return useQuery({
    queryKey: ['hotelDetail', item.id, item.provider, check_in, check_out],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: item.provider,
            hotelId: item.id,
            checkIn: check_in,
            checkOut: check_out,
          }),
        }
      );
      const res = await response.json();
      return {
        images:
          Array.isArray(res.data.main_images) && res.data.main_images.length > 0
            ? res.data.main_images[0].url || ''
            : '',
        address: res.data.address || '',
        facilities: res.data.facilities || [],
      };
    },
    enabled: !!item.id && !!check_in && !!check_out,
    cacheTime: 20 * 60 * 1000,
    staleTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

function setHotelRoomsData(hotel) {
  if (hotel?.rooms) {
    localStorage.setItem('roomSelection', JSON.stringify(hotel.rooms));
  }
}

function HotelCardItem({ item, check_in, check_out, daysDiff }) {
  const [imgFallback, setImgFallback] = useState(false);
  const { data: detail } = useHotelBasicDetail(item, check_in, check_out);
  const { showDistance, distanceCache, distanceLandmarkLabel } = useHotelList();
  const dist = showDistance ? distanceCache?.[item?.id] : null;

  const starCount = item?.metadata?.stars && !isNaN(item.metadata.stars)
    ? Math.round(Number(item.metadata.stars))
    : 0;
  const showFreeCancellation = hasFreeCancellation(item);

  return (
    <div className="col-12 mb-3 px-0">
      <article className="htc-card">
        <div className="htc-card__layout shadow rounded-5" style={{ border:'1px solid #00000020' }}>
          <div className="htc-card__media">
            <Image
              src={
                imgFallback
                  ? '/images/hotelloadimg.jpg'
                  : normalizeImageSrc(detail?.images || '/images/hotelloadimg.jpg')
              }
              width={420}
              height={280}
              className="htc-card__img"
              alt={item.name}
              quality={100}
              placeholder="blur"
              blurDataURL="/images/hotelloadimg.jpg"
              onError={() => setImgFallback(true)}
              unoptimized={true}
            />
            <div className="htc-card__media-badges">
              <div className="htc-card__media-badges-start">
                {item?.provider === 'custom' && (
                  <span className="htc-card__badge htc-card__badge--brand">AL</span>
                )}
                <span className="htc-card__badge htc-card__badge--rooms">
                  {item?.rooms.length} {item?.rooms.length > 1 ? 'Rooms Left' : 'Room Left'}
                </span>
              </div>
              {showFreeCancellation && (
                <span className="htc-card__badge htc-card__badge--free-cancel">
                  <FaCheck aria-hidden="true" /> Free Cancellation
                </span>
              )}
            </div>
          </div>

          <div className="htc-card__content">
            <div className="htc-card__title-row">
              <h3 className="htc-card__title">{item.name}</h3>
              <div className="htc-card__rating">
                {starCount > 0 ? (
                  Array(starCount).fill(0).map((_, i) => (
                    <FaStar key={i} className="htc-card__star" />
                  ))
                ) : item?.metadata?.stars ? (
                  <span className="htc-card__rating-label">{item.metadata.stars === '0' ? 'No Rating' : item.metadata.stars}</span>
                ) : (
                  <span className="htc-card__rating-label htc-card__rating-label--muted">No Rating</span>
                )}
              </div>
              {showDistance && (
                dist?.loading ? (
                  <span className="htc-card__distance htc-card__distance--loading" aria-hidden="true" />
                ) : dist && !dist.error && dist.distance ? (
                  <span className="htc-card__distance">{dist.distance} {distanceLandmarkLabel}</span>
                ) : null
              )}
            </div>

            {detail ? (
              <p className="htc-card__location">
                <IoLocationSharp aria-hidden="true" />
                <span>{detail.address || 'Address not available'}</span>
              </p>
            ) : (
              <p className="htc-card__location placeholder-glow">
                <IoLocationSharp aria-hidden="true" />
                <span className="placeholder rounded col-6"></span>
              </p>
            )}

            <time className="htc-card__dates">
              <FaCalendarAlt aria-hidden="true" />
              {moment(check_in).format('DD MMM YYYY')}
              <FaArrowRightLong aria-hidden="true" />
              {moment(check_out).format('DD MMM YYYY')}
            </time>

            {detail ? (
              <ul className="htc-card__amenities">
                {detail.facilities.slice(0, 6).map((amenity, i) => (
                  <li key={i}>{amenity}</li>
                ))}
              </ul>
            ) : (
              <ul className="htc-card__amenities placeholder-glow">
                <li className="placeholder rounded col-3"></li>
                <li className="placeholder rounded col-4"></li>
                <li className="placeholder rounded col-2"></li>
              </ul>
            )}
          </div>

          <aside className="htc-card__aside">
            <p className="htc-card__price-label">Starting from</p>
            <div className="htc-card__price-main">
              <PriceDisplay price={(item.metadata.min_price / daysDiff)} currency={item?.metadata.currency} />
              <span className="htc-card__price-unit">/night</span>
            </div>
            <p className="htc-card__price-total">
              Total {item?.currency} {item?.price}
            </p>
            <p className="htc-card__price-note">VAT and Taxes Included</p>
            <Link
              target="_blank"
              onClick={() => setHotelRoomsData(item)}
              href={`/hotels/${makingSlug(item.name)}?id=${item.id}&code=${ProviderShortNames(item.provider)}`}
              className="htc-card__cta"
            >
              See Availability <FaArrowRightLong aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </article>
    </div>
  );
}

export default function HotelCard({ isLoading }) {
  const searchParams = useSearchParams();
  const { hotels } = useHotelList();
  const check_in = searchParams.get("checkIn");
  const check_out = searchParams.get("checkOut");
  const daysDiff = moment(check_out).diff(moment(check_in), 'days');

  return (
    <div className="container hotel-card">
      {hotels.length === 0 && isLoading === false && (
        <div className="alert alert-warning text-center" role="alert">
          <strong>No hotels</strong> found for the selected criteria. Please try adjusting your search.<br />
          <Link href='/'>
            <button className='btn btn-success mt-2'><FaHome size={15} /> Go to Home</button>
          </Link>
        </div>
      )}
      <div className="row" id='top_hotel'>
        {hotels.map((item, index) => (
          <HotelCardItem
            key={`${item.provider}-${item.id}` || index}
            item={item}
            check_in={check_in}
            check_out={check_out}
            daysDiff={daysDiff}
          />
        ))}
      </div>
    </div>
  );
}
