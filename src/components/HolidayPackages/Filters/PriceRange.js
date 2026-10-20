"use client";
import React, { useEffect, useState } from "react";
import { RangeSlider } from "@mantine/core";
import { usePackageList } from "../PackageListingContext";
import { useCurrency } from "@/util/currency";

export default function PriceRange() {
  const { minPrice, maxPrice, resetPrice, setPriceRange } = usePackageList();
  const { currency } = useCurrency();
  const [selectedValues, setSelectedValues] = useState([minPrice, maxPrice]);

  useEffect(() => {
    setSelectedValues([minPrice, maxPrice]);
  }, [minPrice, maxPrice, resetPrice]);

  const handleChange = (values) => {
    setSelectedValues(values);
    setPriceRange(values);
  };

  const formatPrice = (value) =>
    Math.round(value)?.toLocaleString?.(undefined, { maximumFractionDigits: 0 }) ??
    Math.round(value);

  return (
    <div>
      <p className="small fw-bold">Your Budget</p>
      <RangeSlider
        className="hotel-filter-slider mb-2"
        min={minPrice}
        max={maxPrice}
        value={selectedValues}
        onChange={handleChange}
        minRange={0.1}
        step={0.01}
        label={null}
        color="#E7247A"
      />
      <div className="hotel-filter-price-values">
        <div className="hotel-filter-price-badge">
          Min
          <strong>
            {currency} {formatPrice(selectedValues[0])}
          </strong>
        </div>
        <div className="hotel-filter-price-badge">
          Max
          <strong>
            {currency} {formatPrice(selectedValues[1])}
          </strong>
        </div>
      </div>
    </div>
  );
}
