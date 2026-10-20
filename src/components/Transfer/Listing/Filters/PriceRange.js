"use client";
import React, { useEffect, useState } from "react";
import { RangeSlider } from "@mantine/core";
import { useTransferList } from "../TransferListingContext";

export default function PriceRange() {
  const { minPrice, maxPrice, resetPrice, setPriceRange } = useTransferList();
  const [selectedValues, setSelectedValues] = useState([minPrice, maxPrice]);

  useEffect(() => {
    setSelectedValues([minPrice, maxPrice]);
  }, [minPrice, maxPrice, resetPrice]);

  const handleChange = (values) => {
    setSelectedValues(values);
    setPriceRange(values);
  };

  return (
    <div>
      <p className="small fw-bold">Your Budget</p>
      <RangeSlider
        className="mb-3"
        min={minPrice}
        max={maxPrice}
        value={selectedValues}
        onChange={handleChange}
        minRange={0.1}
        step={0.01}
        label={null}
      />
      <p className="small">Min: {selectedValues[0].toFixed(2)}</p>
      <p className="small">Max: {selectedValues[1].toFixed(2)}</p>
    </div>
  );
}
