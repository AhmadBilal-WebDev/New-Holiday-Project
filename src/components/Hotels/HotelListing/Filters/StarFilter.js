'use client'
import React from 'react'
import { Checkbox } from '@mantine/core';
import { useHotelList } from '../HotelListingContext'

const STAR_OPTIONS = [
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 2, label: '2 Stars' },
  { value: 1, label: '1 Star' },
  { value: 0, label: 'Other' },
]

export default function StarFilter() {
  const { star, setStar, starCounts } = useHotelList();

  const handleCheckboxChange = (value) => {
    if (star.includes(value)) {
      setStar(star.filter((s) => s !== value));
    } else {
      setStar([...star, value]);
    }
  };

  return (
    <div>
      <p className='hotel-filter-section__label'>Property rating</p>
      <div className="hotel-filter-checkbox-group hotel-distance-filter">
        {STAR_OPTIONS.map((option) => (
          <div key={option.value} className="hotel-distance-filter__row">
            <Checkbox
              checked={star.includes(option.value)}
              onChange={() => handleCheckboxChange(option.value)}
              className='hotel-filter-checkbox hotel-distance-filter__checkbox'
              label={option.label}
            />
            <span className="hotel-distance-filter__count">
              {starCounts?.[option.value] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
