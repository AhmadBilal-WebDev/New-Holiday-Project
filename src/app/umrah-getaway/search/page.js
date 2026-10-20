'use client'
import React, { useEffect, useState } from 'react'
import UmrahGetAway from '@/components/Home/Search/UmrahGetAway'
import { MdTune } from 'react-icons/md'
import ResetFilter from '@/components/UmrahGetAway/Listing/Filter/ResetFilter';
import filterStyles from '@/components/UmrahGetAway/Listing/Filter/UmrahFilter.module.css';
import ListingCard from '@/components/UmrahGetAway/Listing/ListingCard';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PackageFilterLoader from '@/components/Loader/PackageFilterLoader';
import UmrahGetAwayCardLoader from '@/components/Loader/UmrahGetAwayCardLoader';
import Main from '@/components/UmrahGetAway/Listing/Filter/Main';
import { FilterProvider, useFilters } from '@/components/UmrahGetAway/Listing/Filter/FilterContext';
import UmrahPagination from '@/components/UmrahGetAway/Listing/UmrahPagination';
import ResultsHeader from '@/components/UmrahGetAway/Listing/ResultsHeader';
import { Drawer } from "@mantine/core";
import { LiaAngleDownSolid } from "react-icons/lia";
import PriceRange from '@/components/UmrahGetAway/Listing/Filter/PriceRange';
import SearchBar from '@/components/UmrahGetAway/Listing/Filter/SearchBar';
import Rating from '@/components/UmrahGetAway/Listing/Filter/Rating';
import ViewFilter from '@/components/UmrahGetAway/Listing/Filter/ViewFilter';
import { MdEdit, MdLocationOn, MdNightsStay, MdPeople } from 'react-icons/md';
import moment from 'moment';
export default function page() {
  const searchParams = useSearchParams();
  const [packageList, setPackageList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [searchData, setSearchData] = useState({});
  const [passengerCount, setPassengerCount] = useState({ totalAdults: 0, totalChildren: 0 });

  useEffect(() => {
    async function getPackages() {
      var searchList = {};
      if (localStorage.getItem('umrah_getaway_search')) {
        searchList = JSON.parse(localStorage.getItem('umrah_getaway_search'));
        setSearchData(searchList);
      }

      const roomsArray = searchList?.rooms.map(room => ({
        adults: room.adults,
        children: room.childrenAges.map(age => ({ age: Number(age) }))
      }));

      const totals = roomsArray?.reduce(
        (acc, room) => {
          acc.totalAdults += room.adults;
          acc.totalChildren += room.children.length;
          return acc;
        },
        { totalAdults: 0, totalChildren: 0 }
      );
      setPassengerCount(totals);
      const request = {
        "journeyType": searchList?.journey_type,
        "makkahNights": searchList?.makkah_nights,
        "madinahNights": searchList?.madinah_nights,
        "departureCity": searchList?.departure_city,
        "departureDate": searchList?.departure_date,
        "dateType": searchList.dateType,
        "currency": "GBP",
        "rooms": roomsArray,
        "legs": [
          {
            "origin": searchList?.departure_city,
            "destination": searchList?.journey_type === "madinahFirst" ? "MED" : "JED",
            "departure_date": searchList?.departure_date
          },
          {
            "origin": searchList?.journey_type === "madinahFirst" ? "JED" : "MED",
            "destination": searchList?.departure_city,
            "departure_date": ''
          }
        ],
        "adult": totals?.totalAdults,
        "child": totals?.totalChildren,
        "infant": 0,
        "isBackend": true,
        "CabinType": "no",
        "MaxStopsQuantity": "All",
        "PricingSourceType": "All",
        "IsRefundable": false,
        "RequestOptions": "fifty",
        "NearByAirports": false,
        "Target": "Test",
        "AirTripType": "Return",
        "ConversationId": "395923377895446"
      }
      if (searchList?.dateType === 'flexible') {
        request.flexibleDays = searchList?.flexibleDays;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/search`, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            // 'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json',
          },
          body: JSON.stringify(request)
        });
        const response = await res.json();
        setIsLoading(false);
        if (response.success) {
          setPackageList(response?.data?.packages || []);
        } else {
          setPackageList([]);
        }
      } catch (error) {
        setIsLoading(false);
        console.log(error)
      }
    }
    getPackages();
  }, [searchParams.toString()])


  return (
    <FilterProvider packages={packageList}>
      <PageContent isLoading={isLoading} searchData={searchData} passengerCount={passengerCount} />
    </FilterProvider>
  )
}

function PageContent({ isLoading, searchData, passengerCount }) {
  const {
    filteredPackages,
    priceType,
    resetFilters,
    priceRange,
    minPrice,
    maxPrice,
    makkahHotelSearch,
    makkahRatings,
    makkahHaramView,
    makkahKaabaView,
    makkahDistances,
    madinahHotelSearch,
    madinahRatings,
    madinahHaramView,
    madinahDistances,
  } = useFilters();
  const [visibleCount, setVisibleCount] = React.useState(10);
  const itemsPerPage = 10;
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isPriceFilterActive =
    priceRange[0] !== minPrice || priceRange[1] !== maxPrice;
  const isMakkahFilterActive =
    !!makkahHotelSearch?.trim() ||
    makkahRatings.length > 0 ||
    makkahHaramView ||
    makkahKaabaView ||
    makkahDistances.length > 0;
  const isMadinahFilterActive =
    !!madinahHotelSearch?.trim() ||
    madinahRatings.length > 0 ||
    madinahHaramView ||
    madinahDistances.length > 0;

  const currentPackages = filteredPackages.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPackages.length;

  const loadMore = React.useCallback(() => {
    setVisibleCount(prev => Math.min(prev + itemsPerPage, filteredPackages.length));
  }, [filteredPackages.length]);

  React.useEffect(() => {
    setVisibleCount(10);
  }, [filteredPackages.length]);

  useEffect(() => {
    // Check screen size on mount and resize
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const handleResetFilters = () => {
    resetFilters();
    setActiveDrawer(null);
  }
  return (
    <div className='umrahgetaway-hotels'>
      {/* Desktop: always visible */}
      <div className='ugg-search-header d-none d-md-block'>
        <div className='container'>
          <UmrahGetAway variant="listing" />
        </div>
      </div>

      {/* Mobile: compact summary + collapsible search */}
      <div className='d-block d-md-none'>
        <div className='msb-bar'>
          <div
            className='d-flex align-items-center gap-3 cursor-pointer'
            onClick={() => setShowMobileSearch(prev => !prev)}
          >
            {/* Icon */}
            <div className='msb-icon'>
              <MdLocationOn size={20} color="#c9a227" />
            </div>

            {/* Info */}
            <div className='flex-grow-1' style={{ minWidth: 0 }}>
              <div className='msb-title'>
                {searchData?.departure_city || 'Search'}
                {(searchData?.makkah_nights || searchData?.madinah_nights) && (
                  <span className='msb-title-secondary'>
                    {' '}· {searchData?.makkah_nights ?? 0}N Makkah · {searchData?.madinah_nights ?? 0}N Madinah
                  </span>
                )}
              </div>
              <div className='msb-subtitle'>
                <MdPeople size={12} className='msb-subtitle-icon' />
                {passengerCount?.totalAdults > 0
                  ? `${passengerCount.totalAdults} Adult${passengerCount.totalAdults !== 1 ? 's' : ''}${passengerCount.totalChildren > 0 ? `, ${passengerCount.totalChildren} Child${passengerCount.totalChildren !== 1 ? 'ren' : ''}` : ''}`
                  : 'Tap to search'}
                {searchData?.departure_date && (
                  <span className='msb-subtitle-date'>· {moment(searchData.departure_date).format('DD-MM-YYYY')}</span>
                )}
              </div>
            </div>

            {/* Modify button */}
            <button
              onClick={e => { e.stopPropagation(); setShowMobileSearch(prev => !prev); }}
              className='msb-modify-btn'
            >
              <MdEdit size={13} />
              Modify
            </button>
          </div>
        </div>

        {/* Smooth collapsible search panel */}
        <div
          className='msb-collapse'
          style={{ maxHeight: showMobileSearch ? '900px' : '0' }}
        >
          <div className='msb-collapse-inner'>
            <UmrahGetAway variant="listing" onSearch={() => setShowMobileSearch(false)} />
          </div>
        </div>
      </div>
      <div className='container my-0 my-md-4'>
        <div className='row mt-1 mt-md-4'>
          <div className='col-md-12 col-lg-3 col-sm-12 col-12'>
            {/* Mobile: Filter Pills */}
            <div className="filter-scroll d-flex gap-2 d-md-none mb-0 mt-2" >
              <button
                onClick={() => setActiveDrawer('price')}
                className={`${filterStyles.mobilePill} ${isPriceFilterActive ? filterStyles.mobilePillActive : ''}`}
              >
                Price <span className={filterStyles.mobilePillArrow}><LiaAngleDownSolid /></span>
              </button>

              <button
                onClick={() => setActiveDrawer('makkah')}
                className={`${filterStyles.mobilePill} ${isMakkahFilterActive ? filterStyles.mobilePillActive : ''}`}
              >
                Makkah Hotels <span className={filterStyles.mobilePillArrow}><LiaAngleDownSolid /></span>
              </button>

              <button
                onClick={() => setActiveDrawer('madinah')}
                className={`${filterStyles.mobilePill} ${isMadinahFilterActive ? filterStyles.mobilePillActive : ''}`}
              >
                Madinah Hotels <span className={filterStyles.mobilePillArrow}><LiaAngleDownSolid /></span>
              </button>
            </div>

            {/* Desktop: Sidebar Filters */}
            <div className={`${filterStyles.filterBox} d-none d-md-block`}>
              <div className={filterStyles.header}>
                <h3 className={filterStyles.title}>
                  <span className={filterStyles.titleIcon}><MdTune size={18} /></span>
                  Filters
                </h3>
                {!isLoading && <ResetFilter variant="link" />}
              </div>
              {isLoading ? <PackageFilterLoader /> : <Main isDesktop={isDesktop} />}
            </div>

            {/* Mobile: Sort By (always visible) */}
            <div className='d-block d-md-none mb-2'>
              {isLoading ? null : <Main isDesktop={false} />}
            </div>

            {/* Mobile: Individual Filter Drawers */}
            <Drawer
              opened={activeDrawer === 'price'}
              onClose={() => setActiveDrawer(null)}
              title="Price Range"
              position="bottom"
              size="40%"
              overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              transitionProps={{ duration: 200 }}
              withinPortal={true}
              lockScroll={true}
              trapFocus={false}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <PriceRange />
              </div>
              <div>
                <p onClick={handleResetFilters} className='small text-primary text-end mt-2 cursor-pointer'>Reset filter?</p>
              </div>
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
              opened={activeDrawer === 'makkah'}
              onClose={() => setActiveDrawer(null)}
              title="Makkah Hotels"
              position="bottom"
              size="100%"
              overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              transitionProps={{ duration: 200 }}
              withinPortal={true}
              lockScroll={true}
              trapFocus={false}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <SearchBar city="makkah" />
                <hr />
                <Rating city="makkah" />
                <hr />
                <ViewFilter city="makkah" />
              </div>
              <div>
                <p onClick={handleResetFilters} className='small text-primary text-end mt-2 cursor-pointer'>Reset filter?</p>
              </div>
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
              opened={activeDrawer === 'madinah'}
              onClose={() => setActiveDrawer(null)}
              title="Madinah Hotels"
              position="bottom"
              size="100%"
              overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
              transitionProps={{ duration: 200 }}
              withinPortal={true}
              lockScroll={true}
              trapFocus={false}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <SearchBar city="madinah" />
                <hr />
                <Rating city="madinah" />
                <hr />
                <ViewFilter city="madinah" />
              </div>
              <div>
                <p onClick={handleResetFilters} className='small text-primary text-end mt-2 cursor-pointer'>Reset filter?</p>
              </div>
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
          <div className='col-md-12 col-lg-9 col-sm-12 col-12'>
            {isLoading ? <UmrahGetAwayCardLoader /> : (
              <div>
                <ResultsHeader count={filteredPackages.length} searchData={searchData} />
                {filteredPackages.length === 0 ? (
                  <div className='text-center my-5'>
                    <Image src="/images/search-not-found.svg" alt="No Packages Found" className='w-100' width={150} height={200} />
                    <h4 className='mt-3'>No Packages Found</h4>
                    <p className='text-muted'>We couldn't find any packages that match your filters. Try adjusting your filters to see more options.</p>
                  </div>
                ) : (
                  <>
                    <ListingCard packageList={currentPackages} priceType={priceType} searchData={searchData} passengerCount={passengerCount} />
                    <UmrahPagination hasMore={hasMore} onLoadMore={loadMore} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
