'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Modal, Select } from '@mantine/core';
import { IoAirplaneOutline } from 'react-icons/io5';
import { IoMdClose } from 'react-icons/io';
import { MdFilterListAlt } from 'react-icons/md';
import { FaAngleDown, FaPlane } from 'react-icons/fa';
import { HiOutlineArrowRight } from 'react-icons/hi';
import { FlightProvider } from '@/components/Flights/FlightListingContext';
import DepartureTimes from '@/components/Flights/Filters/DepartureTimes';
import JourneyDuration from '@/components/Flights/Filters/JourneyDuration';
import AirlineFilter from '@/components/Flights/Filters/AirlineFilter';
import FlightClass from '@/components/Flights/Filters/FlightClass';
import Stops from '@/components/Flights/Filters/Stops';
import FlightCard from '@/components/UmrahGetAway/UpdateFlight/FlightCard';
import PackageFilterLoader from '@/components/Loader/PackageFilterLoader';
import RevisionFlightDetailModal from './RevisionFlightDetailModal';
import localStyle from '@/components/UmrahGetAway/UpdateFlight/Index.module.css';

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'price_asc', label: 'Price: Low to High' },
];

function buildSearchParams(pkg, flight) {
  const criteria = flight?.search_criteria || pkg?.flight?.search_criteria;
  if (criteria?.legs?.length) {
    return {
      ...criteria,
      adult: Number(criteria.adult ?? pkg?.original_request?.adult ?? pkg?.adults ?? 1),
      child: Number(criteria.child ?? pkg?.original_request?.child ?? pkg?.children ?? 0),
      infant: Number(criteria.infant ?? pkg?.original_request?.infant ?? 0),
    };
  }

  return null;
}

function getRouteLabels(flight, pkg) {
  const legs = flight?.search_criteria?.legs || pkg?.flight?.search_criteria?.legs || [];
  const outbound = legs[0] || {};
  const inbound = legs[1] || {};

  return {
    departureOrigin: outbound.origin || '—',
    departureDestination: outbound.destination || '—',
    returnOrigin: inbound.origin || outbound.destination || '—',
    returnDestination: inbound.destination || outbound.origin || '—',
  };
}

export default function ChangeFlightModal({
  opened,
  onClose,
  pkg,
  flight,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [flightList, setFlightList] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
  const [confirmFlight, setConfirmFlight] = useState(null);

  const sortedFlightList = useMemo(() => {
    const list = [...flightList];
    if (sortBy === 'price_asc') {
      return list.sort(
        (a, b) => parseFloat(a.pricing?.total_amount || 0) - parseFloat(b.pricing?.total_amount || 0)
      );
    }
    if (sortBy === 'price_desc') {
      return list.sort(
        (a, b) => parseFloat(b.pricing?.total_amount || 0) - parseFloat(a.pricing?.total_amount || 0)
      );
    }
    return list;
  }, [flightList, sortBy]);

  const route = useMemo(() => getRouteLabels(flight, pkg), [flight, pkg]);

  useEffect(() => {
    if (!opened || !pkg) return undefined;

    let cancelled = false;

    async function getFlights() {
      const params = buildSearchParams(pkg, flight);
      if (!params) {
        setIsLoading(false);
        setFlightList([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const response = await res.json();
        if (cancelled) return;
        setIsLoading(false);
        if (response.success) {
          setFlightList(response?.data?.flights || []);
        } else {
          setFlightList([]);
        }
      } catch (error) {
        if (!cancelled) {
          setIsLoading(false);
          setFlightList([]);
          console.log(error);
        }
      }
    }

    getFlights();
    setSortBy('recommended');

    return () => {
      cancelled = true;
    };
  }, [opened, pkg, flight]);

  useEffect(() => {
    if (!opened) {
      setRevisionDetailOpen(false);
      setConfirmFlight(null);
    }
  }, [opened]);

  const handleSelectFlight = (selectedFlight) => {
    setConfirmFlight(selectedFlight);
    setRevisionDetailOpen(true);
  };

  const renderFilters = () => (
    isLoading ? (
      <PackageFilterLoader />
    ) : (
      <>
        <hr />
        <Stops />
        <hr />
        <DepartureTimes />
        <hr />
        <JourneyDuration />
        <hr />
        <AirlineFilter />
        <hr />
        <FlightClass />
      </>
    )
  );

  const mobileFilterButton = (
    <button
      type="button"
      className={`d-md-none ${localStyle.mobileFilterBtn}`}
      onClick={() => setFilterDrawerOpen(true)}
      aria-label="Open filters"
    >
      <MdFilterListAlt size={20} />
    </button>
  );

  const renderResultsHeader = (loading = false) => (
    <div className={localStyle.resultsHeader}>
      <p className={localStyle.resultsCount}>
        <FaPlane />
        {loading ? (
          'Loading flights...'
        ) : (
          <>
            <span className={localStyle.resultsCountNum}>{flightList.length}</span>
            Flights Found
          </>
        )}
      </p>
      <div className={localStyle.headerActions}>
        {!loading && (
          <div className={localStyle.sortSelect}>
            <Select
              className={localStyle.sortSelect}
              value={sortBy}
              onChange={setSortBy}
              data={SORT_OPTIONS}
              allowDeselect={false}
              size="sm"
              rightSection={<FaAngleDown />}
              comboboxProps={{ withinPortal: false, position: 'bottom-end' }}
              styles={{
                dropdown: { maxWidth: 'calc(100vw - 24px)' },
                option: { whiteSpace: 'normal' },
              }}
            />
          </div>
        )}
        {mobileFilterButton}
      </div>
    </div>
  );

  const renderFilterSidebar = () => (
    <div className={`${localStyle.filterCol} d-none d-md-block`}>
      <div className={localStyle.filterwrapper}>
        <div className={localStyle.filterHeader}>
          Filters
          <MdFilterListAlt />
        </div>
        <div className={localStyle.filterBody}>
          {isLoading ? <PackageFilterLoader /> : renderFilters()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <RevisionFlightDetailModal
        opened={revisionDetailOpen}
        onClose={() => setRevisionDetailOpen(false)}
        selectedFlight={confirmFlight}
        pkg={pkg}
      />

      <Modal
        opened={opened}
        onClose={onClose}
        fullScreen
        withCloseButton={false}
        padding={0}
        radius={0}
        transitionProps={{ transition: 'fade', duration: 200 }}
        classNames={{
          content: localStyle.modalContent,
          body: localStyle.modalBody,
        }}
      >
        <div className={localStyle.modalShell}>
          <div className={localStyle.header}>
            <div className={localStyle.headerLeft}>
              <div className={localStyle.headerIcon}>
                <FaPlane size={18} />
              </div>
              <div className={localStyle.headerText}>
                <h2 className={localStyle.headerTitle}>Choose Another Flight</h2>
                <p className={localStyle.headerSub}>
                  Your previous flight could not be confirmed. Select a new option to continue.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className={localStyle.closeBtn} aria-label="Close">
              <IoMdClose size={20} />
            </button>
          </div>

          <div className={localStyle.routeBar}>
            <div className={localStyle.routeBarInner}>
              <div className={localStyle.routeBlock}>
                <p className={localStyle.routeLabel}>Departure</p>
                <p className={localStyle.routeValue}>
                  {route.departureOrigin}
                  <IoAirplaneOutline size={15} />
                  {route.departureDestination}
                </p>
              </div>

              <HiOutlineArrowRight size={20} className={localStyle.routeDivider} />

              <div className={localStyle.routeBlock}>
                <p className={localStyle.routeLabel}>Return</p>
                <p className={localStyle.routeValue}>
                  {route.returnOrigin}
                  <IoAirplaneOutline size={15} />
                  {route.returnDestination}
                </p>
              </div>
            </div>
          </div>

          <FlightProvider flights={sortedFlightList}>
            <div className={localStyle.pageContainer}>
              {isLoading ? (
                <div className={localStyle.layoutRow}>
                  {renderFilterSidebar()}
                  <div className={localStyle.resultsCol}>
                    {renderResultsHeader(true)}
                    <div className={localStyle.skeletonGrid}>
                      <div className={localStyle.skeletonCard} />
                      <div className={localStyle.skeletonCard} />
                      <div className={localStyle.skeletonCard} />
                      <div className={localStyle.skeletonCard} />
                    </div>
                    <div className={localStyle.skeletonFlight} />
                    <div className={localStyle.skeletonFlight} />
                    <div className={localStyle.skeletonFlight} />
                    <div className={localStyle.skeletonFlight} />
                  </div>
                </div>
              ) : (
                <div className={localStyle.layoutRow}>
                  {renderFilterSidebar()}
                  <div className={localStyle.resultsCol}>
                    {renderResultsHeader(false)}
                    <FlightCard originalFlight={flight} onSelectFlight={handleSelectFlight} />
                  </div>
                </div>
              )}

              <Drawer
                opened={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                title="Filters"
                position="bottom"
                size="85%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                transitionProps={{ duration: 200 }}
                withinPortal
                lockScroll
                classNames={{ content: localStyle.mobileFilterDrawer }}
              >
                {renderFilters()}
                <div className="border-top pt-3 mt-3">
                  <button
                    type="button"
                    className={localStyle.drawerDoneBtn}
                    onClick={() => setFilterDrawerOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </Drawer>
            </div>
          </FlightProvider>
        </div>
      </Modal>
    </>
  );
}
