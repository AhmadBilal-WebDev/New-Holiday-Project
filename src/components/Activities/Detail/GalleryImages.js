'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@mantine/core';
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import styles from './GalleryImages.module.css';

export default function GalleryImages({ imageList = [] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [basicExampleOpen, setBasicExampleOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const images = useMemo(
    () => (Array.isArray(imageList) ? imageList.filter(Boolean) : []),
    [imageList]
  );

  const sideImages = images.slice(1, 5);
  const extraCount = Math.max(0, images.length - 5);

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 768);
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  if (!images.length) return null;

  const handleModalToggle = () => setModalOpen((prev) => !prev);

  const openLightboxAt = (index) => {
    setCurrentIndex(index);
    setBasicExampleOpen(true);
  };

  return (
    <div>
      <div className={styles.gallery}>
        <div className={styles.hero} onClick={() => openLightboxAt(0)}>
          <Image
            src={images[0]}
            alt="Activity gallery main"
            width={900}
            height={520}
            className={styles.heroImage}
            priority
          />
          <button
            type="button"
            className={styles.seeAllBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleModalToggle();
            }}
          >
            See All Photos
          </button>
        </div>

        {sideImages.length > 0 && (
          <div className={styles.sideGrid}>
            {sideImages.map((src, index) => {
              const realIndex = index + 1;
              const isLastThumb = index === sideImages.length - 1;
              const showMore = isLastThumb && extraCount > 0;

              return (
                <div
                  key={`${src}-${realIndex}`}
                  className={styles.thumb}
                  onClick={() => (showMore ? handleModalToggle() : openLightboxAt(realIndex))}
                >
                  <Image
                    src={src}
                    alt={`Activity gallery ${realIndex + 1}`}
                    width={400}
                    height={280}
                    className={styles.thumbImage}
                  />
                  {showMore && (
                    <span className={styles.moreOverlay}>+{extraCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        opened={modalOpen}
        onClose={handleModalToggle}
        size={isMobile ? '100%' : '75%'}
        title="Activity Images"
      >
        <div className={styles.modalGrid}>
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={styles.modalItem}
              onClick={() => openLightboxAt(index)}
            >
              <Image
                src={image}
                alt={`Activity image ${index + 1}`}
                width={400}
                height={300}
                className={styles.modalImage}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Lightbox
        open={basicExampleOpen}
        close={() => setBasicExampleOpen(false)}
        slides={images.map((img) => ({ src: img }))}
        index={currentIndex}
      />
    </div>
  );
}
