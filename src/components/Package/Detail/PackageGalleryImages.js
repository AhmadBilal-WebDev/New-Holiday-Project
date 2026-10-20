'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '@mantine/core'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { FaImages } from 'react-icons/fa'
import styles from './PackageGalleryImages.module.css'

const normalizeImageSrc = (raw) => {
  if (!raw) return '/images/hotelloadimg.jpg'
  if (typeof raw === 'object' && raw?.url) return normalizeImageSrc(raw.url)
  if (raw.startsWith('data:') || raw.startsWith('/')) return raw
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://')
  if (raw.startsWith('//')) return `https:${raw}`
  return `https://${String(raw).replace(/^\/+/, '')}`
}

export default function PackageGalleryImages({ imageList = [] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const photos = useMemo(
    () => (Array.isArray(imageList) ? imageList.filter(Boolean).map(normalizeImageSrc) : []),
    [imageList]
  )

  const totalPhotos = photos.length

  useEffect(() => {
    const updateLayout = () => setIsMobile(window.innerWidth < 768)
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  const openLightboxAt = (index) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const toggleModal = () => setModalOpen((prev) => !prev)

  const handleImgError = (e) => {
    e.currentTarget.src = '/images/hotelloadimg.jpg'
  }

  if (!totalPhotos) {
    return (
      <div className={styles.empty} role="img" aria-label="No package images">
        No images available
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div
        className={styles.hero}
        onClick={() => openLightboxAt(0)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openLightboxAt(0)
          }
        }}
        aria-label="Open package photo"
      >
        <Image
          src={photos[0]}
          alt="Package gallery"
          fill
          priority
          sizes="100vw"
          className={styles.heroImg}
          unoptimized
        />
        <div className={styles.heroScrim} aria-hidden="true" />

        <button
          type="button"
          className={styles.viewAllBtn}
          onClick={(e) => {
            e.stopPropagation()
            toggleModal()
          }}
        >
          <FaImages size={14} aria-hidden="true" />
          View all photos
          <span className={styles.countBadge}>{totalPhotos}</span>
        </button>
      </div>

      <Modal
        opened={modalOpen}
        onClose={toggleModal}
        centered
        lockScroll
        trapFocus
        radius="lg"
        size={isMobile ? '100%' : '75%'}
        title="Package photos"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        classNames={{
          content: styles.modalContent,
          header: styles.modalHeader,
          title: styles.modalTitleText,
          body: styles.modalBodyWrap,
          close: styles.modalClose,
        }}
      >
        <div className={styles.modalGrid}>
          {photos.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={styles.modalItem}
              onClick={() => openLightboxAt(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openLightboxAt(index)
                }
              }}
              aria-label={`Open photo ${index + 1}`}
            >
              <Image
                src={image}
                alt={`Package image ${index + 1}`}
                height={200}
                width={300}
                unoptimized
                className={styles.modalItemImg}
                onError={handleImgError}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={photos.map((src) => ({ src }))}
        index={currentIndex}
      />
    </div>
  )
}
