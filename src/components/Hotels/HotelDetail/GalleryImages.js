'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@mantine/core';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaImages } from 'react-icons/fa';
import styles from './GalleryImages.module.css';

const normalizeImageSrc = (raw) => {
  if (!raw) return '/images/hotelloadimg.jpg';
  if (raw.startsWith('data:') || raw.startsWith('/')) return raw;
  // CSP img-src allows https only — upgrade http:// and protocol-relative URLs
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
  if (raw.startsWith('//')) return 'https:' + raw;
  return 'https://' + raw.replace(/^\/+/, '');
};

export default function GalleryImages({ imageList = [] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [basicExampleOpen, setBasicExampleOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const photos = useMemo(
    () => (Array.isArray(imageList) ? imageList.filter(Boolean) : []),
    [imageList]
  );
  const totalPhotos = photos.length;
  const thumbPhotos = photos.slice(1, 5);
  const moreCount = Math.max(0, totalPhotos - 5);

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 768);
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const handlemodalopenclose = () => setModalOpen((prev) => !prev);

  const openLightboxAt = (index) => {
    setCurrentIndex(index);
    setBasicExampleOpen(true);
  };

  const handleImgError = (e) => {
    e.currentTarget.src = '/images/hotelloadimg.jpg';
  };

  const goBackToSearch = () => {
    try {
      const raw = localStorage.getItem('HotelSearchData');
      const data = raw ? JSON.parse(raw) : null;
      if (data?.check_in && data?.check_out && (data?.city || data?.location)) {
        const q = new URLSearchParams();
        q.set('checkIn', data.check_in);
        q.set('checkOut', data.check_out);
        q.set('currency', data.currency || 'GBP');
        q.set('place', data.location || data.city || '');
        q.set('city', data.city || '');
        q.set('nationality', data.clientNationality || '');
        if (data.lat != null) q.set('lat', String(data.lat));
        if (data.long != null) q.set('lng', String(data.long));
        if (data.countryCode) q.set('code', data.countryCode);
        if (data.location) q.set('location', data.location);
        if (data.country) q.set('country', data.country);
        router.push(`/hotels?${q.toString()}`);
        return;
      }
    } catch {
      // fall through
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/hotels');
  };

  return (
    <div className={styles.gallery}>
      <button type="button" className={styles.backLink} onClick={goBackToSearch}>
        <FaArrowLeft aria-hidden="true" />
        Back to search results
      </button>

      <div className={styles.grid}>
        <div className={styles.main} onClick={() => openLightboxAt(0)}>
          <Image
            src={normalizeImageSrc(photos[0]?.url)}
            alt="Hotel Image"
            fill
            sizes="(max-width: 767px) 100vw, 60vw"
            unoptimized
            className={styles.mainImg}
            onError={handleImgError}
          />
          <button
            type="button"
            className={styles.seeAllBtn}
            onClick={(e) => {
              e.stopPropagation();
              handlemodalopenclose();
            }}
          >
            <FaImages aria-hidden="true" />
            See All ({totalPhotos} Photo{totalPhotos === 1 ? '' : 's'})
          </button>
        </div>

        {thumbPhotos.length > 0 && (
          <div className={styles.thumbs}>
            {thumbPhotos.map((item, i) => {
              const realIndex = i + 1;
              const isLast = i === thumbPhotos.length - 1;
              const showMore = isLast && moreCount > 0;

              return (
                <div
                  key={realIndex}
                  className={styles.thumb}
                  onClick={() => (showMore ? handlemodalopenclose() : openLightboxAt(realIndex))}
                >
                  <Image
                    src={normalizeImageSrc(item?.url)}
                    alt={`Hotel image ${realIndex + 1}`}
                    fill
                    sizes="(max-width: 767px) 50vw, 25vw"
                    unoptimized
                    className={styles.thumbImg}
                    onError={handleImgError}
                  />
                  {showMore && (
                    <span className={styles.moreOverlay}>+{moreCount} Photos</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        lockScroll
        trapFocus
        centered
        className="p-0"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        opened={modalOpen}
        onClose={handlemodalopenclose}
        size={isMobile ? '100%' : '75%'}
        title="Hotel Images"
      >
        <div className={`${styles.modalGrid} p-3`}>
          {photos.map((image, index) => (
            <div
              key={index}
              className={styles.modalItem}
              onClick={() => openLightboxAt(index)}
            >
              <Image
                height={200}
                width={300}
                unoptimized
                className={styles.modalItemImg}
                src={normalizeImageSrc(image?.url)}
                alt={`Hotel image ${index + 1}`}
                onError={handleImgError}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Lightbox
        open={basicExampleOpen}
        close={() => setBasicExampleOpen(false)}
        slides={photos.map((img) => ({ src: normalizeImageSrc(img?.url) }))}
        index={currentIndex}
      />
    </div>
  );
}
