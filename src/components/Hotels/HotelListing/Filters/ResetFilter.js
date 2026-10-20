'use client';
import React from 'react'
import { MdRefresh } from 'react-icons/md';
import { useHotelList } from "../HotelListingContext";
export default function ResetFilter({ setActiveDrawer }) {
    const { resetFilters } = useHotelList();
    const handleReset = () => {
        setActiveDrawer(null);
        resetFilters();
    };
    return (
        <div className='hotel-filter-reset'>
            <button type="button" onClick={handleReset} className='hotel-filter-reset__btn'>
                <MdRefresh size={18} aria-hidden="true" />
                Reset filters
            </button>
        </div>
    )
}
 