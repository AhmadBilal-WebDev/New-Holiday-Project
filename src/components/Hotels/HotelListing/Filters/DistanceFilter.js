'use client'
import React from 'react'
import { Checkbox } from '@mantine/core'
import { useHotelList } from '../HotelListingContext'

const DISTANCE_OPTIONS = [
  { value: '0-500', label: '0–500 m' },
  { value: '500-1000', label: '500 m – 1 km' },
  { value: '1000-2000', label: '1–2 km' },
  { value: '2000+', label: 'More than 2 km' },
]

export default function DistanceFilter({ wrapSection = false }) {
  const {
    showDistance,
    distances,
    setDistances,
    distanceCounts,
    distanceFilterTitle,
  } = useHotelList()

  if (!showDistance) return null

  const handleChange = (value) => {
    if (distances.includes(value)) {
      setDistances(distances.filter((d) => d !== value))
    } else {
      setDistances([...distances, value])
    }
  }

  const content = (
    <div>
      <p className="hotel-filter-section__label">{distanceFilterTitle}</p>
      <div className="hotel-filter-checkbox-group hotel-distance-filter">
        {DISTANCE_OPTIONS.map((option) => (
          <div key={option.value} className="hotel-distance-filter__row">
            <Checkbox
              className="hotel-filter-checkbox hotel-distance-filter__checkbox"
              label={option.label}
              checked={distances.includes(option.value)}
              onChange={() => handleChange(option.value)}
            />
            {/* <span className="hotel-distance-filter__count">
              {distanceCounts?.[option.value] ?? 0}
            </span> */}
          </div>
        ))}
      </div>
    </div>
  )

  if (wrapSection) {
    return <div className="hotel-filter-sidebar__section">{content}</div>
  }

  return content
}
