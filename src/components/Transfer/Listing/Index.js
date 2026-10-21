"use client";

import React, { useState } from "react";
import { MdFilterListAlt, MdRefresh } from "react-icons/md";
import TransferCard from "./TransferCard";
import { useTransferList } from "./TransferListingContext";
import SearchBar from "./Filters/SearchBar";
import VehicleCategoryFilter from "./Filters/VehicleCategoryFilter";
import TransmissionFilter from "./Filters/TransmissionFilter";
import PassengerCapacityFilter from "./Filters/PassengerCapacityFilter";
import LuggageCapacityFilter from "./Filters/LuggageCapacityFilter";
import SortOption from "./Filters/SortOption";
import ResetFilter from "./Filters/ResetFilter";
import TransferPaginations from "./TransferListingPaginations";
import { LiaAngleDownSolid } from "react-icons/lia";
import { Drawer } from "@mantine/core";
import styles from "./TransferFilters.module.css";

const MOBILE_FILTERS = [
  { id: "name", label: "Name" },
  { id: "sort", label: "Sort By" },
  { id: "category", label: "Category" },
  { id: "transmission", label: "Transmission" },
  { id: "capacity", label: "Capacity" },
  { id: "luggage", label: "Luggage" },
];

const DRAWER_TITLES = {
  name: "Search by Name",
  sort: "Sort Results",
  category: "Vehicle Category",
  transmission: "Transmission Type",
  capacity: "Passenger Capacity",
  luggage: "Luggage Capacity",
};

function FilterDrawer({ opened, onClose, title, onReset, children }) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="bottom"
      size="auto"
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      transitionProps={{ duration: 200 }}
      withinPortal={true}
      lockScroll={true}
      trapFocus={false}
      styles={{
        title: { fontWeight: 700, fontSize: "1rem", color: "#E7247A" },
        header: { borderBottom: "1px solid #eceae5", paddingBottom: "0.75rem" },
        body: { paddingTop: "1rem" },
        content: { borderRadius: "22px 22px 0 0" },
      }}
    >
      <div className={`${styles.drawerBody} ${styles.drawerPanel}`}>{children}</div>
      <div className={styles.resetDrawer}>
        <button type="button" onClick={onReset} className={styles.resetBtn}>
          <MdRefresh className={styles.resetIcon} size={18} aria-hidden="true" />
          Reset filters
        </button>
      </div>
      <div className={styles.drawerFooter}>
        <button type="button" className={styles.drawerDone} onClick={onClose}>
          Done
        </button>
      </div>
    </Drawer>
  );
}

export default function Index({ searchParams }) {
  const {
    transfers,
    resetFilters,
    search,
    sort,
    vehicleCategory,
    transmissionType,
    passengerCapacity,
    luggageCapacity,
    availableTransmissions,
  } = useTransferList();

  const [activeDrawer, setActiveDrawer] = useState(null);

  const handleResetFilters = () => {
    resetFilters();
    setActiveDrawer(null);
  };

  const mobileFilters = MOBILE_FILTERS.filter(
    (f) => f.id !== "transmission" || availableTransmissions?.length > 0
  );

  const isFilterActive = {
    name: Boolean(search),
    sort: sort !== "price-asc",
    category: vehicleCategory.length > 0,
    transmission: transmissionType.length > 0,
    capacity: passengerCapacity.length > 0,
    luggage: luggageCapacity.length > 0,
  };

  return (
    <div>
      <div className="row g-3">
        <div className="col-lg-3 col-md-4 col-sm-12 col-12">
          {/* Mobile: Filter Pills */}
          <div
            className={`filter-scroll d-flex gap-2 d-md-none mb-3 ${styles.mobilePills}`}
          >
            {mobileFilters.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveDrawer(id)}
                className={`${styles.filterPill} ${
                  isFilterActive[id] ? styles.filterPillActive : ""
                }`}
              >
                {label}
                <span className={styles.arrow}>
                  <LiaAngleDownSolid />
                </span>
              </button>
            ))}
          </div>

          {/* Desktop / tablet: Sidebar Filters */}
          <aside className={`${styles.sidebar} d-none d-md-block`}>
            <div className={styles.header}>
              <p className={styles.title}>Filters</p>
              <MdFilterListAlt className={styles.headerIcon} size={22} aria-hidden="true" />
            </div>

            <div className={styles.section}>
              <SearchBar />
            </div>

            <div className={styles.section}>
              <SortOption />
            </div>

            <div className={styles.section}>
              <VehicleCategoryFilter />
            </div>

            {availableTransmissions?.length > 0 && (
              <div className={styles.section}>
                <TransmissionFilter />
              </div>
            )}

            <div className={styles.section}>
              <PassengerCapacityFilter />
            </div>

            <div className={styles.section}>
              <LuggageCapacityFilter />
            </div>

            <div className={styles.footer}>
              <ResetFilter />
            </div>
          </aside>

          {/* Mobile: Filter Drawers */}
          {mobileFilters.map(({ id }) => (
            <FilterDrawer
              key={id}
              opened={activeDrawer === id}
              onClose={() => setActiveDrawer(null)}
              title={DRAWER_TITLES[id]}
              onReset={handleResetFilters}
            >
              {id === "name" && <SearchBar />}
              {id === "sort" && <SortOption />}
              {id === "category" && <VehicleCategoryFilter />}
              {id === "transmission" && <TransmissionFilter />}
              {id === "capacity" && <PassengerCapacityFilter />}
              {id === "luggage" && <LuggageCapacityFilter />}
            </FilterDrawer>
          ))}
        </div>

        <div className="col-lg-9 col-md-8 col-sm-12 col-12">
          <TransferCard transfers={transfers} searchParams={searchParams} />
          <TransferPaginations />
        </div>
      </div>
    </div>
  );
}
