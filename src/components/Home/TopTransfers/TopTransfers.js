'use client';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Inter, Outfit } from 'next/font/google';
import { FaArrowLeft, FaArrowRight, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css/pagination';
import styles from './TopTransfers.module.css';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import VehicleDetail from '@/components/Transfer/Listing/VehicleDetail';
import { useTransferStore } from '@/components/Store/TransferStore';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const SEARCH_PAYLOAD = {
  dropoffLocation: 'Madinah',
  fromCountry: 'Saudi Arabia',
  fromLat: '21.4240968',
  fromLng: '39.81733639999999',
  passengers: '1',
  adults: '1',
  children: '0',
  infants: '0',
  pickupLocation: 'Makkah',
  pickupTime: '00:00:00',
  toLat: '24.4672132',
  toLng: '39.6024496',
  transferType: 'one-way',
};

const formatTransferType = (type) => {
  if (!type) return '';
  const t = String(type).toLowerCase().replace(/_/g, '-');
  if (t === 'one-way' || t === 'oneway') return 'One Way';
  if (t === 'round-trip' || t === 'roundtrip') return 'Round Trip';
  return type
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

function TransferCardSkeleton() {
  return (
    <article className={`${styles.card} ${styles.skeletonCard}`} aria-hidden="true">
      <div className={`${styles.skeletonBlock} ${styles.skeletonImage}`} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
        <div className={styles.skeletonFooter}>
          <div>
            <div className={`${styles.skeletonBlock} ${styles.skeletonPrice}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonTax}`} />
          </div>
          <div className={`${styles.skeletonBlock} ${styles.skeletonBtn}`} />
        </div>
      </div>
    </article>
  );
}

function TransferCard({ transfer, routeLabel, tripTypeLabel, onViewDetail }) {
  const name = transfer?.vehicle_details?.name || '';
  const image = transfer?.vehicle_image;

  return (
    <article className={styles.card}>
      <div
        className={styles.imageWrap}
        onClick={() => onViewDetail(transfer)}
        onKeyDown={(e) => e.key === 'Enter' && onViewDetail(transfer)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${name}`}
      >
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className={styles.cardImage}
            sizes="(max-width: 767px) 90vw, (max-width: 991px) 50vw, 25vw"
          />
        ) : null}
      </div>

      <div className={styles.cardBody}>
        <h3 className={`${styles.vehicleName} ${outfit.className}`}>{name}</h3>

        {(routeLabel || tripTypeLabel) && (
          <div className={styles.metaRow}>
            {routeLabel ? (
              <span className={styles.metaItem}>
                <FaMapMarkerAlt className={styles.metaIcon} aria-hidden="true" />
                {routeLabel}
              </span>
            ) : null}
            {routeLabel && tripTypeLabel ? (
              <span className={styles.metaDot} aria-hidden="true" />
            ) : null}
            {tripTypeLabel ? (
              <span className={styles.metaItem}>
                <FaClock className={styles.metaIcon} aria-hidden="true" />
                {tripTypeLabel}
              </span>
            ) : null}
          </div>
        )}

        <hr className={styles.divider} />

        <div className={styles.cardFooter}>
          <div className={styles.priceBlock}>
            <span className={`${styles.priceValue} ${outfit.className}`}>
              <PriceDisplay price={transfer.fare} currency={transfer.currency} />
            </span>
            <span className={styles.taxNote}>Vat & Taxes Included</span>
          </div>

          <button
            type="button"
            onClick={() => onViewDetail(transfer)}
            className={styles.grabBtn}
          >
            Grab Deal
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TopTransfers() {
  const router = useRouter();
  const { setSelectedTransfer } = useTransferStore();
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleQuantity, setVehicleQuantity] = useState(1);

  const routeLabel =
    SEARCH_PAYLOAD.pickupLocation && SEARCH_PAYLOAD.dropoffLocation
      ? `${SEARCH_PAYLOAD.pickupLocation} - ${SEARCH_PAYLOAD.dropoffLocation}`
      : '';
  const tripTypeLabel = formatTransferType(SEARCH_PAYLOAD.transferType);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...SEARCH_PAYLOAD,
            pickupDate: moment().add(1, 'days').format('YYYY-MM-DD'),
          }),
        });

        const result = await response.json();
        const apiTransfers = result?.data?.transfers;

        if (response.ok && result?.success && Array.isArray(apiTransfers)) {
          setTransfers(apiTransfers);
        } else {
          setHasError(true);
        }
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransfers();
  }, []);

  if (!isLoading && (hasError || !transfers.length)) return null;

  const handleViewDetail = (transfer) => {
    setSelectedVehicle(transfer);
    setVehicleQuantity(1);
  };

  const handleBooking = (transfer) => {
    if (!transfer) return;

    const searchParams = {
      ...SEARCH_PAYLOAD,
      pickupDate: moment().add(1, 'days').format('YYYY-MM-DD'),
    };

    setSelectedTransfer({
      ...transfer,
      searchParams,
      quantity: vehicleQuantity,
    });
    router.push('/transfers/checkout');
  };

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Top Transfers">
      <div className="container">
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.tag}>
              <HiOutlineSparkles className={styles.tagIcon} aria-hidden="true" />
              Airport Transfers
            </span>
            <h2 className={`${styles.title} ${outfit.className}`}>
              Arrive in style. Every time.
            </h2>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.navBtn} topTransfers-prev`}
              aria-label="Previous transfers"
            >
              <FaArrowLeft />
            </button>
            <button
              type="button"
              className={`${styles.navBtn} topTransfers-next`}
              aria-label="Next transfers"
            >
              <FaArrowRight />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.skeletonGrid} aria-busy="true" aria-label="Loading transfers">
            <TransferCardSkeleton />
            <TransferCardSkeleton />
            <TransferCardSkeleton />
            <TransferCardSkeleton />
          </div>
        ) : (
          <div className={styles.sliderWrap}>
            <Swiper
              modules={[Pagination, Navigation]}
              spaceBetween={20}
              slidesPerView={1}
              slidesPerGroup={1}
              watchOverflow
              pagination={{ clickable: true, dynamicBullets: true }}
              navigation={{
                nextEl: '.topTransfers-next',
                prevEl: '.topTransfers-prev',
              }}
              breakpoints={{
                0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
                576: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 18 },
                768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 18 },
                992: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 20 },
                1200: { slidesPerView: 4, slidesPerGroup: 1, spaceBetween: 20 },
              }}
              className={styles.transferSwiper}
            >
              {transfers.map((transfer) => (
                <SwiperSlide key={transfer.id}>
                  <TransferCard
                    transfer={transfer}
                    routeLabel={routeLabel}
                    tripTypeLabel={tripTypeLabel}
                    onViewDetail={handleViewDetail}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
      <VehicleDetail
        showModal={!!selectedVehicle}
        handleCloseModal={() => setSelectedVehicle(null)}
        selectedTransferDetail={selectedVehicle}
        handleBookNow={() => handleBooking(selectedVehicle)}
        vehicleQuantity={vehicleQuantity}
        setVehicleQuantity={setVehicleQuantity}
      />
    </section>
  );
}
