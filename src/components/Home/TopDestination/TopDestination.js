'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import moment from 'moment';
import { Inter, Outfit } from 'next/font/google';
import { HiOutlineSparkles, HiArrowUpRight } from 'react-icons/hi2';
import styles from './TopDestination.module.css';

import imageMakkah from '../../../../public/images/home/makkah.jpg';
import imageMadinah from '../../../../public/images/home/madinah.jpg';
import imageDubai from '../../../../public/images/home/Dubai.png';
import imageLondon from '../../../../public/images/home/london.jpg';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const DESTINATIONS = [
  {
    key: 'makkah',
    title: 'Makkah',
    image: imageMakkah,
    variant: 'tall',
    editorsPick: true,
  },
  {
    key: 'madinah',
    title: 'Madinah',
    image: imageMadinah,
    variant: 'wide',
    editorsPick: false,
  },
  {
    key: 'dubai',
    title: 'Dubai',
    image: imageDubai,
    variant: 'sm',
    editorsPick: false,
  },
  {
    key: 'london',
    title: 'London',
    image: imageLondon,
    variant: 'sm',
    editorsPick: false,
  },
];

const LOCATION_MAP = {
  makkah: {
    lat: 21.4240968,
    lng: 39.81733639999999,
    code: 'SA',
    location: 'Makkah Saudi Arabia',
    country: 'Saudi Arabia',
    city: 'Makkah',
    icon: '🕋',
  },
  madinah: {
    lat: 24.4672132,
    lng: 39.6024496,
    code: 'SA',
    location: 'Madinah Saudi Arabia',
    country: 'Saudi Arabia',
    city: 'Madinah',
    icon: '🕌',
  },
  london: {
    lat: 51.5072178,
    lng: -0.1275862,
    code: 'GB',
    location: 'London',
    country: 'United Kingdom',
    city: 'London',
    icon: '🎡',
  },
  dubai: {
    lat: 25.2048493,
    lng: 55.2707828,
    code: 'AE',
    location: 'Dubai - United Arab Emirates',
    country: 'United Arab Emirates',
    city: 'Dubai',
    icon: '🏙️',
  },
};

function DestinationCard({ item, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.destCard} ${styles[`variant_${item.variant}`] || ''}`}
      onClick={() => onSelect(item.key)}
      aria-label={`Explore hotels in ${item.title}`}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        className={styles.cardImage}
        sizes="(max-width: 767px) 85vw, (max-width: 991px) 50vw, 40vw"
        quality={90}
      />
      <div className={styles.cardGradient} aria-hidden="true" />

      {item.editorsPick && (
        <span className={styles.editorsBadge}>Editor&apos;s Pick</span>
      )}

      <div className={styles.cardContent}>
        <div className={styles.cardText}>
          <h3 className={`${styles.cardName} ${outfit.className}`}>{item.title}</h3>
          <p className={styles.cardMeta}>Explore hotels</p>
        </div>
        <span className={styles.arrowBtn} aria-hidden="true">
          <HiArrowUpRight />
        </span>
      </div>
    </button>
  );
}

export default function TopDestination() {
  const router = useRouter();

  const saveToRecentSearches = (locationData) => {
    const currentRecent = JSON.parse(
      localStorage.getItem('recentHotelSearches') || '[]'
    );

    const filtered = currentRecent.filter((item) => {
      const isSameName =
        item.name?.trim().toLowerCase() !== locationData.name?.trim().toLowerCase();
      return isSameName;
    });

    const newList = [locationData, ...filtered].slice(0, 5);
    localStorage.setItem('recentHotelSearches', JSON.stringify(newList));
  };

  const handleDestinationClick = (cname) => {
    const loc = LOCATION_MAP[cname];
    if (!loc) return;

    saveToRecentSearches({
      name: loc.city,
      country: loc.country,
      icon: loc.icon,
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city,
      code: loc.code,
    });

    const queryParams = new URLSearchParams();
    queryParams.set('checkIn', moment().add(1, 'days').format('YYYY-MM-DD'));
    queryParams.set('checkOut', moment().add(2, 'days').format('YYYY-MM-DD'));
    queryParams.set('currency', 'GBP');
    queryParams.set('place', loc.location);
    queryParams.set('city', loc.city);
    queryParams.set('lat', String(loc.lat));
    queryParams.set('lng', String(loc.lng));
    queryParams.set('code', loc.code);
    queryParams.set('location', loc.location);
    queryParams.set('country', loc.country);
    queryParams.set('r', String(Date.now()));

    localStorage.setItem(
      'searchRoomSelection',
      JSON.stringify([{ adults: 2, children: [] }])
    );

    router.push(`/hotels?${queryParams.toString()}`);
  };

  return (
    <section className={`${styles.section} ${inter.className}`} aria-label="Popular Destinations">
      <div className="container">
        <header className={styles.header}>
          <span className={styles.tag}>
            <HiOutlineSparkles className={styles.tagIcon} aria-hidden="true" />
            Popular Destinations
          </span>
          <h2 className={`${styles.title} ${outfit.className}`}>
            Cities the world is falling for.
          </h2>
        </header>

        {/* Desktop / tablet bento */}
        <div className={styles.bentoGrid}>
          {DESTINATIONS.map((item) => (
            <DestinationCard
              key={item.key}
              item={item}
              onSelect={handleDestinationClick}
            />
          ))}
        </div>

        {/* Mobile horizontal scroll */}
        <div className={styles.mobileTrack}>
          <div className={styles.mobileRow}>
            {DESTINATIONS.map((item) => (
              <DestinationCard
                key={`m-${item.key}`}
                item={{ ...item, variant: 'mobile' }}
                onSelect={handleDestinationClick}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
