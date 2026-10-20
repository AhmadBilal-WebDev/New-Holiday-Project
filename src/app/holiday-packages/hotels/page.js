"use client";
import { useEffect, useState } from "react";
import { MdFilterListAlt, MdEdit, MdLocationOn, MdPeople, MdCalendarMonth } from "react-icons/md";
import moment from "moment";
import SearchBar from "@/components/HolidayPackages/Filters/SearchBar";
import PriceRange from "@/components/HolidayPackages/Filters/PriceRange";
import SortOption from "@/components/HolidayPackages/Filters/SortOption";
import StarFilter from "@/components/HolidayPackages/Filters/StarFilter";
import MealType from "@/components/HolidayPackages/Filters/MealType";
import ResetFilter from "@/components/HolidayPackages/Filters/ResetFilter";
import { PackageListProvider, usePackageList } from "@/components/HolidayPackages/PackageListingContext";
import PackageListingPaginations from "@/components/HolidayPackages/PackageListingPaginations";
import { LiaAngleDownSolid } from "react-icons/lia";
import { Drawer } from "@mantine/core";
import { useHolidayPackageStore } from "@/components/Store/HolidayPackageStore";
import GeneralPackages from "@/components/Home/Search/GeneralPackages";
import HolidayPackageCard from "@/components/HolidayPackages/HolidayPackageCard";
import { streamHolidayPackageSearch } from "@/util/streamHolidayPackageSearch";

function MobileFilterPills({ setActiveDrawer }) {
  const { search, sort, star, meal, priceRange, minPrice, maxPrice } = usePackageList();
  const isNameApplied = Boolean(search?.trim());
  const isSortApplied = Boolean(sort && sort !== "recommended");
  const isPriceApplied =
    Number(priceRange?.[0]) !== Number(minPrice) ||
    Number(priceRange?.[1]) !== Number(maxPrice);
  const isRatingApplied = star?.length > 0;
  const isMealApplied = meal?.length > 0;

  return (
    <div className="filter-scroll d-flex gap-2 d-md-none mb-2">
      <button
        type="button"
        onClick={() => setActiveDrawer("name")}
        className={`filter-pill${isNameApplied ? " filter-pill--applied" : ""}`}
      >
        Name{" "}
        <span className="arrow">
          <LiaAngleDownSolid />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveDrawer("sort")}
        className={`filter-pill${isSortApplied ? " filter-pill--applied" : ""}`}
      >
        Sort By{" "}
        <span className="arrow">
          <LiaAngleDownSolid />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveDrawer("price")}
        className={`filter-pill${isPriceApplied ? " filter-pill--applied" : ""}`}
      >
        Price{" "}
        <span className="arrow">
          <LiaAngleDownSolid />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveDrawer("rating")}
        className={`filter-pill${isRatingApplied ? " filter-pill--applied" : ""}`}
      >
        Rating{" "}
        <span className="arrow">
          <LiaAngleDownSolid />
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveDrawer("meal")}
        className={`filter-pill${isMealApplied ? " filter-pill--applied" : ""}`}
      >
        Meal Type{" "}
        <span className="arrow">
          <LiaAngleDownSolid />
        </span>
      </button>
    </div>
  );
}

export default function PackageHotelListing() {
  const { isActive, packageConfig } = useHolidayPackageStore();
  const [progress, setProgress] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hotelsList, setHotelsList] = useState([]);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);

  const isFlexibleMode = Boolean(packageConfig?.searchData?.flexibleMode);

  const searchDestination =
    packageConfig?.searchData?.flight?.toLocation?.city
    || packageConfig?.searchData?.hotel?.location
    || "Search Packages";

  const searchGuestSummary = (() => {
    const rooms = packageConfig?.searchData?.rooms || [];
    const adults = rooms.reduce((s, r) => s + (r.adults || 0), 0);
    const children = rooms.reduce((s, r) => s + (r.childrenAges?.length || 0), 0);
    const parts = [];
    if (adults) parts.push(`${adults} Adult${adults !== 1 ? "s" : ""}`);
    if (children) parts.push(`${children} Child${children !== 1 ? "ren" : ""}`);
    return parts.length ? parts.join(", ") : null;
  })();

  const searchDateSummary = (() => {
    const hotelDates = packageConfig?.searchData?.hotel?.dates;
    const checkIn = hotelDates?.checkIn || hotelDates?.check_in || packageConfig?.searchData?.dates?.checkIn;
    const checkOut = hotelDates?.checkOut || hotelDates?.check_out || packageConfig?.searchData?.dates?.checkOut;
    return checkIn && checkOut
      ? `${moment(checkIn).format("DD MMM")} – ${moment(checkOut).format("DD MMM YYYY")}`
      : null;
  })();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
  useEffect(() => {
    // Wait for zustand persist hydration — otherwise refresh fetches with
    // empty default config, flashes "No packages found", then refetches.
    if (!isActive) return;
    if (!packageConfig?.searchData?.rooms) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    fethHotels(controller.signal);
    return () => controller.abort();
  }, [packageConfig, isActive]);

  const fethHotels = async (signal) => {
    setIsLoading(true);
    setHotelsList([]);
    const { searchData, selectedServices } = packageConfig;
    const roomsList = (searchData?.rooms || []).map(room => ({
      adults: room.adults,
      children: room.childrenAges || []
    }));

    const services = [];
    if (selectedServices.hotel) services.push("hotel");
    if (selectedServices.flight) services.push("flight");
    if (selectedServices.transfer) services.push("transfer");

    const mainDates = {
      check_in: searchData?.dates?.checkIn,
      check_out: searchData?.dates?.checkOut,
    };

    const flightToLoc = searchData?.flight?.toLocation || {};
    // Compact (non-flexible) packages always stay at the flight destination.
    // Prefer arrival city so stale hotel fields from a previous search cannot win.
    const preferFlightDest =
      Boolean(selectedServices.flight && flightToLoc.city) &&
      (!searchData?.flexibleMode ||
        !searchData?.hotel?.city ||
        searchData.hotel.city === flightToLoc.city);

    const hotelCity = preferFlightDest
      ? flightToLoc.city
      : (searchData?.hotel?.city
        || flightToLoc.city
        || searchData?.hotel?.location
        || "");
    const hotelCountryCode = preferFlightDest
      ? (flightToLoc.countryCode || "")
      : (searchData?.hotel?.countryCode
        || flightToLoc.countryCode
        || "");
    const hotelCountry = preferFlightDest
      ? (flightToLoc.country || "")
      : (searchData?.hotel?.country
        || flightToLoc.country
        || "");
    const hotelLocation = preferFlightDest
      ? (flightToLoc.city || flightToLoc.airportName || "")
      : (searchData?.hotel?.location
        || flightToLoc.city
        || flightToLoc.airportName
        || "");
    const hotelLat = preferFlightDest
      ? (flightToLoc.lat ?? null)
      : (searchData?.hotel?.lat
        ?? flightToLoc.lat
        ?? null);
    const hotelLng = preferFlightDest
      ? (flightToLoc.lng ?? null)
      : (searchData?.hotel?.lng
        ?? flightToLoc.lng
        ?? null);

    const flightCheckIn =
      searchData?.flight?.dates?.depart
      || searchData?.flight?.dates?.check_in
      || mainDates.check_in;
    const flightCheckOut =
      searchData?.flight?.dates?.return
      || searchData?.flight?.dates?.check_out
      || mainDates.check_out;

    const transferPickup = searchData?.transfer?.pickup || {};
    const transferDropoff = searchData?.transfer?.dropoff || {};
    const transferCheckIn =
      searchData?.transfer?.dates?.check_in
      || searchData?.transfer?.dates?.pickup
      || mainDates.check_in;
    const transferCheckOut =
      searchData?.transfer?.dates?.check_out
      || searchData?.transfer?.dates?.dropoff
      || mainDates.check_out;

    // Fallback pickup/dropoff from hotel or arrival airport when transfer locs missing
    const fallbackLoc = {
      city: hotelCity,
      country: hotelCountry,
      countryCode: hotelCountryCode,
      location: hotelLocation,
      latitude: hotelLat != null ? String(hotelLat) : undefined,
      longitude: hotelLng != null ? String(hotelLng) : undefined,
    };

    const request = {
      services,
      currency: "GBP",
      rooms: roomsList,
      "stream": true,
    };

    if (selectedServices.hotel) {
      request.hotel = {
        destination: {
          city: hotelCity,
          countryCode: hotelCountryCode,
          location: hotelLocation,
          airport_code: searchData?.flight?.to || searchData?.hotel?.airport_code || undefined,
          latitude: hotelLat != null ? String(hotelLat) : undefined,
          longitude: hotelLng != null ? String(hotelLng) : undefined,
        },
        dates: {
          check_in: searchData?.hotel?.dates?.checkIn || searchData?.hotel?.dates?.check_in || mainDates.check_in,
          check_out: searchData?.hotel?.dates?.checkOut || searchData?.hotel?.dates?.check_out || mainDates.check_out,
        },
      };
    }

    if (selectedServices.flight) {
      const fromLoc = searchData?.flight?.fromLocation || {};
      const toLoc = searchData?.flight?.toLocation || {};
      request.flight = {
        leaving_from: {
          city: fromLoc.city || "",
          countryCode: fromLoc.countryCode || "",
          airport_code: searchData?.flight?.from || "",
          ...(fromLoc.lat != null ? { latitude: String(fromLoc.lat) } : {}),
          ...(fromLoc.lng != null ? { longitude: String(fromLoc.lng) } : {}),
        },
        going_to: {
          city: toLoc.city || hotelCity || "",
          countryCode: toLoc.countryCode || hotelCountryCode || "",
          airport_code: searchData?.flight?.to || "",
          ...(toLoc.lat != null || hotelLat != null
            ? { latitude: String(toLoc.lat ?? hotelLat) }
            : {}),
          ...(toLoc.lng != null || hotelLng != null
            ? { longitude: String(toLoc.lng ?? hotelLng) }
            : {}),
        },
        dates: {
          check_in: flightCheckIn,
          check_out: flightCheckOut,
        },
        economy_class: searchData?.flight?.cabinClassName || "economy",
      };
    }

    if (selectedServices.transfer) {
      const mapTransferLoc = (loc) => {
        const hasLoc = loc?.city || loc?.location || loc?.lat != null;
        const src = hasLoc ? loc : fallbackLoc;
        const city = src.city || "";
        const country = src.country || src.countryName || "";
        const location = [city || src.location, country].filter(Boolean).join(" ");
        // const location = city || src.location || "";
        return {
          city,
          countryCode: src.countryCode || src.code || "",
          location: location || src.location || "",
          ...(src.latitude != null || src.lat != null
            ? { latitude: String(src.latitude ?? src.lat) }
            : {}),
          ...(src.longitude != null || src.lng != null
            ? { longitude: String(src.longitude ?? src.lng) }
            : {}),
        };
      };

      request.transfer = {
        dates: {
          check_in: transferCheckIn,
          check_out: transferCheckOut,
        },
        pickup: mapTransferLoc(transferPickup),
        dropoff: mapTransferLoc(transferDropoff),
      };
    }
    try {
      await streamHolidayPackageSearch({
        request,
        signal,
        onPackages: (packages) => {
          setHotelsList(packages);
        },
      });
      setIsLoading(false);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setIsLoading(false);
      setHotelsList([]);
      console.error("Error fetching hotels:", err);
    }
  };
  useEffect(() => {
    if (isLoading) {
      setProgress((prev) => (hotelsList.length ? Math.max(prev, 35) : 0));
      const interval = setInterval(() => {
        setProgress((prev) => {
          const cap = hotelsList.length ? 95 : 90;
          return prev < cap ? prev + (hotelsList.length ? 5 : 10) : prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
    setProgress(100);
  }, [isLoading, hotelsList.length]);

  if (!isActive) {
    return null;
  };

  return (
    <PackageListProvider packages={hotelsList}>
      <div>
        {/* Mobile: compact summary + collapsible search */}
        <div className='d-block d-md-none'>
          <div className='msb-bar'>
            <div
              className='d-flex align-items-center gap-3 cursor-pointer'
              onClick={() => setShowMobileSearch(prev => !prev)}
            >
              <div className='msb-icon'>
                <MdLocationOn size={20} color="#E7247A" />
              </div>
              <div className='flex-grow-1' style={{ minWidth: 0 }}>
                <div className='msb-title'>
                  {searchDestination}
                </div>
                <div className='msb-subtitle'>
                  <MdPeople size={12} className='msb-subtitle-icon' />
                  {searchGuestSummary || 'Tap to search'}
                  {searchDateSummary && (
                    <span className='msb-subtitle-date'>· {searchDateSummary}</span>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setShowMobileSearch(prev => !prev); }}
                className='msb-modify-btn'
              >
                <MdEdit size={13} />
                Modify
              </button>
            </div>
          </div>
          <div
            className='msb-collapse'
            style={{ maxHeight: showMobileSearch ? '900px' : '0' }}
          >
            <div className='msb-collapse-inner'>
              <GeneralPackages packageConfig={packageConfig} isActive={isActive} onSearch={() => setShowMobileSearch(false)} />
            </div>
          </div>
        </div>

        {/* Desktop: flexible = compact summary; normal = always-open search */}
        <div className="hp-search-modify d-none d-md-block">
          <div className="container">
            <div className="hp-search-modify__card">
              {isFlexibleMode ? (
                <>
                  <div
                    className="hp-search-modify__header"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowDesktopSearch((prev) => !prev)}
                  >
                    <div className="hp-search-modify__summary">
                      <span className="hp-search-modify__heading">
                        <MdLocationOn size={18} />
                        {searchDestination}
                      </span>
                      {searchDateSummary && (
                        <span className="hp-search-modify__summary-item">
                          <MdCalendarMonth size={15} />
                          {searchDateSummary}
                        </span>
                      )}
                      {searchGuestSummary && (
                        <span className="hp-search-modify__summary-item">
                          <MdPeople size={15} />
                          {searchGuestSummary}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="msb-modify-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDesktopSearch((prev) => !prev);
                      }}
                    >
                      <MdEdit size={13} />
                      {showDesktopSearch ? "Close" : "Modify"}
                    </button>
                  </div>
                  {showDesktopSearch && (
                    <div className="hp-search-modify__body">
                      <GeneralPackages
                        packageConfig={packageConfig}
                        isActive={isActive}
                        onSearch={() => setShowDesktopSearch(false)}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="hp-search-modify__body">
                  <GeneralPackages packageConfig={packageConfig} isActive={isActive} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mt-2 mb-5">
          <div className="row">
            <div className="col-md-3 col-sm-12 col-12">
              {/* Mobile: Filter Pills */}
              <MobileFilterPills setActiveDrawer={setActiveDrawer} />

              {/* Desktop: Sidebar Filters */}
              <div className="filter_box rounded d-none d-md-block">
                <div className="d-flex justify-content-between fw-bold align-items-center p-2">
                  Filters
                  <MdFilterListAlt />
                </div>
                <hr />
                <SearchBar />
                <hr />
                <SortOption />
                <hr />
                <PriceRange />
                <hr />
                <StarFilter />
                <hr />
                <MealType />
                <ResetFilter setActiveDrawer={setActiveDrawer} />
              </div>

              {/* Mobile: Individual Filter Drawers */}
              <Drawer
                opened={activeDrawer === "name"}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="100%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                transitionProps={{ duration: 200 }}
                withinPortal={true}
                lockScroll={true}
                trapFocus={false}
              >
                <div style={{ position: "relative", zIndex: 1 }}>
                  <SearchBar />
                </div>
                <ResetFilter setActiveDrawer={setActiveDrawer} />
                <div className="border-top pt-3 mt-3">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setActiveDrawer(null)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>

              <Drawer
                opened={activeDrawer === "sort"}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="100%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              >
                <div>
                  <SortOption />
                </div>
                <ResetFilter setActiveDrawer={setActiveDrawer} />
                <div className="border-top pt-3 mt-3">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setActiveDrawer(null)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>

              <Drawer
                opened={activeDrawer === "price"}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="100%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              >
                <div>
                  <PriceRange />
                </div>
                <ResetFilter setActiveDrawer={setActiveDrawer} />
                <div className="border-top pt-3 mt-3">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setActiveDrawer(null)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>

              <Drawer
                opened={activeDrawer === "rating"}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="100%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              >
                <div>
                  <StarFilter />
                </div>
                <ResetFilter setActiveDrawer={setActiveDrawer} />
                <div className="border-top pt-3 mt-3">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setActiveDrawer(null)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>

              <Drawer
                opened={activeDrawer === "meal"}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="100%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              >
                <div>
                  <MealType />
                </div>
                <ResetFilter setActiveDrawer={setActiveDrawer} />
                <div className="border-top pt-3 mt-3">
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setActiveDrawer(null)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>
            </div>

            <div className="col-md-9 col-sm-12 col-12">
              {isLoading && !hotelsList.length && (
                <div className="hotel-search-loader mb-3" role="status" aria-live="polite">
                  <div className="hotel-search-loader__header">
                    <div
                      className="hotel-search-loader__spinner"
                      aria-hidden="true"
                    />
                    <div className="hotel-search-loader__text">
                      <p className="hotel-search-loader__title">Searching packages</p>
                      <p className="hotel-search-loader__subtitle">
                        Looking for the best matches…
                      </p>
                    </div>
                    <span className="hotel-search-loader__percent">
                      {progress}%
                    </span>
                  </div>
                  <div className="hotel-search-loader__track">
                    <div
                      className="hotel-search-loader__bar"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {(hotelsList.length > 0 || !isLoading) && (
                <>
                  <HolidayPackageCard
                    isLoading={isLoading}
                    progress={progress}
                    packageConfig={packageConfig}
                  />
                  {hotelsList.length > 0 && <PackageListingPaginations />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PackageListProvider>
  );
}
