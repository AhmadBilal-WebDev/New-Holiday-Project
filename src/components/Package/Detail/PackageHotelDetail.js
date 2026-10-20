'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import moment from 'moment'
import { Inter, Outfit } from 'next/font/google'
import { FaStar, FaStarHalfAlt, FaClock, FaCalendarAlt } from 'react-icons/fa'
import { FaLocationDot, FaBuilding } from 'react-icons/fa6'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import styles from './PackageHotelDetail.module.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const AMENITY_PREVIEW = 4

function getAmenityLabel(item) {
  if (!item) return ''
  if (typeof item === 'string') return item.trim()
  return (item.name || item.title || item.label || '').trim()
}

function collectAmenities(hotel, rooms = []) {
  const raw =
    hotel?.facilities ||
    hotel?.amenities ||
    hotel?.features ||
    hotel?.facility ||
    []

  const fromHotel = (Array.isArray(raw) ? raw : [])
    .map(getAmenityLabel)
    .filter(Boolean)

  const fromRooms = []
  rooms.forEach((room) => {
    const meal = room?.items?.data?.meal
    const view = room?.items?.data?.view
    if (meal) fromRooms.push(String(meal).trim())
    if (view) fromRooms.push(String(view).trim())
  })

  return [...new Set([...fromHotel, ...fromRooms])]
}

function formatStayDate(value) {
  return moment(value).format('DD MMM YYYY')
}

function HotelCard({ item, index, onOpenGallery }) {
  const hotel = item?.hotel || {}
  const rating = Number(hotel?.rating) || 0
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const nights = moment(hotel?.booked_to).diff(moment(hotel?.booked_from), 'days')
  const hasImage = !!hotel?.featured_image
  const amenities = collectAmenities(hotel, item?.rooms || [])
  const previewAmenities = amenities.slice(0, AMENITY_PREVIEW)
  const moreCount = Math.max(0, amenities.length - AMENITY_PREVIEW)
  const hasGallery = Array.isArray(hotel?.gallery_images) && hotel.gallery_images.length > 0
  const rooms = item?.rooms || []

  return (
    <article className={styles.card}>
      <div
        className={`${styles.media} ${!hasImage ? styles.mediaPlaceholder : ''}`}
        onClick={hasGallery || hasImage ? () => onOpenGallery(index) : undefined}
        role={hasGallery || hasImage ? 'button' : undefined}
        tabIndex={hasGallery || hasImage ? 0 : undefined}
        onKeyDown={
          hasGallery || hasImage
            ? (e) => e.key === 'Enter' && onOpenGallery(index)
            : undefined
        }
        style={hasGallery || hasImage ? { cursor: 'pointer' } : undefined}
      >
        {hasImage ? (
          <Image
            fill
            sizes="(max-width: 767px) 100vw, 320px"
            className={styles.hotelImage}
            src={hotel.featured_image}
            alt={hotel.name || 'Hotel image'}
          />
        ) : (
          <div className={styles.placeholderInner}>
            <FaBuilding size={36} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div className={styles.titleLeft}>
            <h3 className={`${styles.hotelName} ${outfit.className}`}>
              {hotel.name || 'Hotel'}
            </h3>
            {rating > 0 && (
              <div className={styles.stars} aria-label={`${rating} star rating`}>
                {Array.from({ length: fullStars }).map((_, i) => (
                  <FaStar key={`full-${i}`} size={14} />
                ))}
                {hasHalfStar && <FaStarHalfAlt size={14} />}
              </div>
            )}
          </div>

          {nights > 0 && (
            <div className={styles.nights}>
              <FaClock size={13} aria-hidden="true" />
              <span>
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>
          )}
        </div>

        {hotel.address && (
          <p className={styles.address}>
            <FaLocationDot size={14} className={styles.addressIcon} aria-hidden="true" />
            <span>{hotel.address}</span>
          </p>
        )}

        <div className={styles.datesRow}>
          <div className={styles.datePill}>
            <FaCalendarAlt size={16} className={styles.dateIcon} aria-hidden="true" />
            <div>
              <span className={styles.dateLabel}>Check-in</span>
              <span className={`${styles.dateValue} ${outfit.className}`}>
                {formatStayDate(hotel.booked_from)}
              </span>
            </div>
          </div>
          <div className={styles.datePill}>
            <FaCalendarAlt size={16} className={styles.dateIcon} aria-hidden="true" />
            <div>
              <span className={styles.dateLabel}>Check-out</span>
              <span className={`${styles.dateValue} ${outfit.className}`}>
                {formatStayDate(hotel.booked_to)}
              </span>
            </div>
          </div>
        </div>

        {previewAmenities.length > 0 && (
          <div className={styles.amenities}>
            {previewAmenities.map((label, i) => (
              <span key={`${label}-${i}`} className={styles.amenityTag}>
                {label}
              </span>
            ))}
            {moreCount > 0 && (
              <span className={styles.amenityMore}>+{moreCount} more</span>
            )}
          </div>
        )}

        {rooms.length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.roomsBlock}>
              <span className={styles.roomsLabel}>Room Type</span>
              <div className={styles.roomsList}>
                {rooms.map((room, rIndex) => {
                  const meal = room?.items?.data?.meal
                  const view = room?.items?.data?.view
                  const meta = [view, meal].filter(Boolean).join(' · ')

                  return (
                    <div key={rIndex} className={styles.roomItem}>
                      <div className={`${styles.roomName} ${outfit.className}`}>
                        {room?.type || 'Room'}
                      </div>
                      {meta && <p className={styles.roomMeta}>{meta}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default function PackageHotelDetail({ PackageDetail }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentHotelIndex, setCurrentHotelIndex] = useState(null)

  const hotels = PackageDetail?.hotels
  if (!Array.isArray(hotels) || hotels.length === 0) return null

  const openLightbox = (index) => {
    setCurrentHotelIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
    setCurrentHotelIndex(null)
  }

  const activeHotel = currentHotelIndex !== null ? hotels[currentHotelIndex]?.hotel : null
  const gallerySlides = (() => {
    if (!activeHotel) return []
    const gallery = Array.isArray(activeHotel.gallery_images)
      ? activeHotel.gallery_images.filter(Boolean)
      : []
    if (gallery.length > 0) {
      return gallery.map((src) => ({
        src,
        alt: activeHotel.name || 'Hotel image',
      }))
    }
    if (activeHotel.featured_image) {
      return [
        {
          src: activeHotel.featured_image,
          alt: activeHotel.name || 'Hotel image',
        },
      ]
    }
    return []
  })()

  return (
    <section className={`${styles.section} ${inter.className}`}>
      <h2 className={`${styles.sectionTitle} ${outfit.className}`}>
        <FaBuilding size={20} className={styles.sectionIcon} aria-hidden="true" />
        Accommodation
      </h2>

      {hotels.map((item, index) => (
        <HotelCard
          key={index}
          item={item}
          index={index}
          onOpenGallery={openLightbox}
        />
      ))}

      {lightboxOpen && gallerySlides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={closeLightbox}
          slides={gallerySlides}
          carousel={{ finite: gallerySlides.length <= 1 }}
          render={{
            buttonPrev: gallerySlides.length <= 1 ? () => null : undefined,
            buttonNext: gallerySlides.length <= 1 ? () => null : undefined,
          }}
        />
      )}
    </section>
  )
}
