"use client";
import React, { useEffect, useState } from "react";
import { RangeSlider } from "@mantine/core";
import { useHotelList } from "../HotelListingContext";
import { useCurrency } from "@/util/currency";

export default function PriceRange() {
  const { minPrice, maxPrice, resetPrice, priceRange, setPriceRange } = useHotelList();
  const { currency } = useCurrency();

  const [selectedValues, setSelectedValues] = useState([
    Number.isFinite(Number(priceRange?.[0])) ? Number(priceRange[0]) : minPrice,
    Number.isFinite(Number(priceRange?.[1])) ? Number(priceRange[1]) : maxPrice,
  ]);

  useEffect(() => {
    const low = Number(priceRange?.[0]);
    const high = Number(priceRange?.[1]);

    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      setSelectedValues([minPrice, maxPrice]);
      return;
    }

    setSelectedValues([
      Math.min(Math.max(low, minPrice), maxPrice),
      Math.min(Math.max(high, minPrice), maxPrice),
    ]);
  }, [priceRange, minPrice, maxPrice, resetPrice]);

  const handleChange = (values) => {
    setSelectedValues(values);
    setPriceRange(values);
  };

  return (
    <div>
      <p className="hotel-filter-section__label">Your Budget</p>
      <RangeSlider
        className="hotel-filter-slider mb-2"
        min={minPrice}
        max={maxPrice}
        color="#E7247A"
        value={selectedValues}
        onChange={handleChange}
        minRange={0.1}
        step={0.01}
        label={null}
      />
      <div className="hotel-filter-price-values">
        <div className="hotel-filter-price-badge">
          Min
          <strong>{currency} {selectedValues[0]?.toFixed?.(2) ?? selectedValues[0]}</strong>
        </div>
        <div className="hotel-filter-price-badge">
          Max
          <strong>{currency} {selectedValues[1]?.toFixed?.(2) ?? selectedValues[1]}</strong>
        </div>
      </div>
    </div>
  );
}
