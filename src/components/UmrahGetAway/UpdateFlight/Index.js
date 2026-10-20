'use client';
import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Select } from '@mantine/core';
import { IoAirplaneOutline } from 'react-icons/io5';
import { IoMdClose } from 'react-icons/io';
import { MdFilterListAlt, MdOutlineChangeCircle } from 'react-icons/md';
import { Drawer } from '@mantine/core';
import { FlightProvider, useFlightList } from '@/components/Flights/FlightListingContext';
import DepartureTimes from '@/components/Flights/Filters/DepartureTimes';
import JourneyDuration from '@/components/Flights/Filters/JourneyDuration';
import AirlineFilter from '@/components/Flights/Filters/AirlineFilter';
import FlightClass from '@/components/Flights/Filters/FlightClass';
import Stops from '@/components/Flights/Filters/Stops';
import FlightCard from './FlightCard';
import FlightCompareModal from './FlightCompareModal';
import RevisionFlightDetailModal from './RevisionFlightDetailModal';
import PackageFilterLoader from '@/components/Loader/PackageFilterLoader';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { notifications } from '@mantine/notifications';
import { FaAngleDown, FaPlane } from 'react-icons/fa';
import { HiOutlineArrowRight } from 'react-icons/hi';
import localStyle from './Index.module.css';

const SORT_OPTIONS = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'price_asc', label: 'Price: Low to High' },
];

function ResultsHeader({ loading, sortBy, setSortBy, mobileFilterButton }) {
    const { totalFlights } = useFlightList();

    return (
        <div className={localStyle.resultsHeader}>
            <p className={localStyle.resultsCount}>
                <FaPlane />
                {loading ? (
                    'Loading flights...'
                ) : (
                    <>
                        <span className={localStyle.resultsCountNum}>{totalFlights}</span>
                        {totalFlights === 1 ? 'Flight Found' : 'Flights Found'}
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
                                dropdown: {
                                    maxWidth: 'calc(100vw - 24px)',
                                },
                                option: {
                                    whiteSpace: 'normal',
                                },
                            }}
                        />
                    </div>
                )}
                {mobileFilterButton}
            </div>
        </div>
    );
}

function ResetFiltersButton({ onDone }) {
    const { resetFilters } = useFlightList();

    return (
        <button
            type="button"
            className={localStyle.resetFiltersBtn}
            onClick={() => {
                resetFilters();
                onDone?.();
            }}
        >
            Reset Filters
        </button>
    );
}

export default function UpdateFlightModal({ opened, onClose, pkg, flight, onFlightUpdated, isRevisionMode = false }) {
    const [isLoading, setIsLoading] = useState(true);
    const [flightList, setFlightList] = useState([]);
    const [returnAirport, setReturnAirport] = useState('MED');
    const [sortBy, setSortBy] = useState('recommended');
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
    const [confirmFlight, setConfirmFlight] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const sortedFlightList = useMemo(() => {
        const list = [...flightList];
        if (sortBy === 'price_asc') {
            return list.sort((a, b) => parseFloat(a.pricing?.total_amount || 0) - parseFloat(b.pricing?.total_amount || 0));
        }
        if (sortBy === 'price_desc') {
            return list.sort((a, b) => parseFloat(b.pricing?.total_amount || 0) - parseFloat(a.pricing?.total_amount || 0));
        }
        return list;
    }, [flightList, sortBy]);

    useEffect(() => {
        if (!opened || !pkg) return;

        let airport;
        if (flight?.search_criteria?.legs?.length >= 2) {
            airport = flight.search_criteria.legs[1].origin;
        } else if (flight?.segments?.length) {
            const midpoint = Math.ceil(flight.segments.length / 2);
            airport = flight.segments[midpoint]?.departure?.airport_code;
        } else {
            airport = pkg?.details_request_info?.journey_type === 'makkahFirst' ? 'MED' : 'JED';
        }
        setReturnAirport(airport);
    }, [opened, pkg, flight]);


    useEffect(() => {
        async function getFlights() {
            if (!opened || !pkg?.details_request_info || !returnAirport) return;
            setIsLoading(true);
            setFlightList([]);

            const departureCity = pkg.details_request_info.departure_city;
            const isMakkahFirst = pkg.details_request_info.journey_type === 'makkahFirst';
            const outboundDestination = isMakkahFirst ? 'JED' : 'MED';
            const returnDate = isMakkahFirst
                ? pkg.details_request_info.madinah_check_out
                : pkg.details_request_info.makkah_check_out;

            let params;
            if (pkg?.flight?.search_criteria?.legs?.length) {
                // Reuse existing criteria but always apply the selected return airport
                const legs = pkg.flight.search_criteria.legs.map((leg, index) =>
                    index === 1 ? { ...leg, origin: returnAirport } : { ...leg }
                );
                params = {
                    ...pkg.flight.search_criteria,
                    legs,
                };
            } else {
                params = {
                    legs: [
                        {
                            origin: departureCity,
                            destination: outboundDestination,
                            departure_date: pkg.details_request_info.departure_date,
                        },
                        {
                            origin: returnAirport,
                            destination: departureCity,
                            departure_date: returnDate,
                        },
                    ],
                    adult: pkg?.original_request?.adult || 1,
                    child: pkg?.original_request?.child || 0,
                    infant: 0,
                    CabinType: 'no',
                    MaxStopsQuantity: 'All',
                    PricingSourceType: 'All',
                    IsRefundable: false,
                    RequestOptions: 'fifty',
                    NearByAirports: false,
                    AirTripType: 'Return',
                    Target: 'Test',
                    ConversationId: '395923377895446',
                };
            }

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                });
                const response = await res.json();
                setIsLoading(false);
                if (response.success) {
                    setFlightList(response?.data?.flights || []);
                }
            } catch (error) {
                setIsLoading(false);
                console.log(error);
            }
        }

        getFlights();
        setSortBy('recommended');
    }, [opened, pkg, returnAirport]); // Re-fetch when returnAirport changes
    // Handler to toggle return airport
    const handleReturnAirportChange = (airport) => {
        if (airport !== returnAirport) {
            setReturnAirport(airport);
        }
    };

    const handleSelectFlight = (selectedFlight) => {
        setConfirmFlight(selectedFlight);
        if (isRevisionMode) {
            setRevisionDetailOpen(true);
            return;
        }
        setConfirmOpen(true);
    };

    useEffect(() => {
        if (!opened) {
            setConfirmOpen(false);
            setRevisionDetailOpen(false);
            setConfirmFlight(null);
        }
    }, [opened]);

    const fetchRates = async (baseCurrency) => {
        try {
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.NEXT_PUBLIC_CURRENCY_KEY}/latest/${baseCurrency}`);
            if (!response.ok) throw new Error('Failed to fetch exchange rates');
            const data = await response.json();
            return data.conversion_rates || { [baseCurrency]: 1 };
        } catch (error) {
            console.error('Failed to fetch exchange rates', error);
            return null;
        }
    };

    const handleUpdateFlight = async () => {
        if (!confirmFlight || !pkg?.package_id) return;

        setIsUpdating(true);
        try {
            const totalPax =
                Number(pkg?.original_request?.adult || 0) +
                Number(pkg?.original_request?.child || 0) +
                Number(pkg?.original_request?.infant || 0);

            const oldFlightPrice = Number(pkg?.pricing?.flight_price ?? flight?.pricing?.total_amount ?? 0);
            const pkgCurrency = pkg?.pricing?.currency || pkg?.currency;
            const flightPricing = confirmFlight?.pricing || {};
            const originalCurrency = flightPricing.currency;
            const originalTotalAmount = flightPricing.total_amount;
            let newFlightPrice = Number(originalTotalAmount ?? 0);
            let conversionRate = 1;
            let ratesMap = null;

            if (originalCurrency && pkgCurrency && originalCurrency !== pkgCurrency) {
                ratesMap = await fetchRates(pkgCurrency);
                if (ratesMap) {
                    const converted = ConvertPrice(originalTotalAmount, originalCurrency, pkgCurrency, ratesMap);
                    newFlightPrice = Number(converted.newprice || 0);
                    conversionRate = ratesMap[originalCurrency] != null ? ratesMap[originalCurrency] : 1;
                }
            }

            let updatedFlight;
            try {
                updatedFlight = JSON.parse(JSON.stringify(confirmFlight));
            } catch {
                updatedFlight = { ...confirmFlight };
            }

            updatedFlight.pricing = {
                ...flightPricing,
                original_currency: originalCurrency,
                original_price: parseFloat(originalTotalAmount) || 0,
                original_total_amount: flightPricing.original_total_amount ?? String(originalTotalAmount),
                currency: pkgCurrency,
                total_amount: String(newFlightPrice),
                conversion_rate: conversionRate,
            };
            pkg.flight = updatedFlight;

            if (!pkg.pricing) pkg.pricing = {};

            pkg.pricing.flight_price = newFlightPrice;
            const currentTotal = Number(pkg.pricing.total_price ?? pkg.total_price ?? 0);
            const updatedTotal = currentTotal - oldFlightPrice + newFlightPrice;

            pkg.pricing.total_price = updatedTotal;
            pkg.total_price = updatedTotal;

            if (totalPax > 0) {
                pkg.pricing.price_per_person = updatedTotal / totalPax;
                pkg.price_per_person = pkg.pricing.price_per_person;
            }

            onFlightUpdated?.(pkg);
            setConfirmOpen(false);
            setConfirmFlight(null);
            onClose();

            notifications.show({
                title: 'Flight Updated',
                message: 'Your package flight has been updated successfully.',
                color: 'green',
            });
        } catch (error) {
            console.error('Flight update error:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update flight. Please try again.',
                color: 'red',
            });
        } finally {
            setIsUpdating(false);
        }
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
                <ResetFiltersButton onDone={() => setFilterDrawerOpen(false)} />
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

    const altReturnAirport = pkg?.details_request_info?.journey_type === 'makkahFirst' ? 'MED' : 'JED';
    const primaryReturnAirport = pkg?.details_request_info?.journey_type === 'makkahFirst' ? 'JED' : 'MED';
    const departureCity = pkg?.details_request_info?.departure_city;
    const arrivalAirport = pkg?.details_request_info?.journey_type === 'makkahFirst' ? 'JED' : 'MED';

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
            <FlightCompareModal
                opened={confirmOpen && !isRevisionMode}
                onClose={() => setConfirmOpen(false)}
                originalFlight={flight}
                newFlight={confirmFlight}
                pkg={pkg}
                onUpdateFlight={handleUpdateFlight}
                isUpdating={isUpdating}
            />

            <RevisionFlightDetailModal
                opened={revisionDetailOpen && isRevisionMode}
                onClose={() => setRevisionDetailOpen(false)}
                selectedFlight={confirmFlight}
                originalFlight={flight}
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
                                <h2 className={localStyle.headerTitle}>Customize Your Flights</h2>
                                <p className={localStyle.headerSub}>Compare options and update your package flight</p>
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
                                    {departureCity}
                                    <IoAirplaneOutline size={15} />
                                    {arrivalAirport}
                                </p>
                            </div>

                            <HiOutlineArrowRight size={20} className={localStyle.routeDivider} />

                            <div className={localStyle.routeBlock}>
                                <p className={localStyle.routeLabel}>Return</p>
                                <div className={localStyle.returnOptions}>
                                    <span
                                        className={`cursor-pointer ${localStyle.returnOption} ${returnAirport === altReturnAirport ? localStyle.returnOptionActive : ''}`}
                                        onClick={() => handleReturnAirportChange(altReturnAirport)}
                                    >
                                        {altReturnAirport}
                                        <IoAirplaneOutline size={15} />
                                        {departureCity}
                                    </span>
                                    <MdOutlineChangeCircle size={16} className={localStyle.swapIcon} />
                                    <span
                                        className={`cursor-pointer ${localStyle.returnOption} ${returnAirport === primaryReturnAirport ? localStyle.returnOptionActive : ''}`}
                                        onClick={() => handleReturnAirportChange(primaryReturnAirport)}
                                    >
                                        {primaryReturnAirport}
                                        <IoAirplaneOutline size={15} />
                                        {departureCity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <FlightProvider flights={sortedFlightList}>
                        <div className={localStyle.pageContainer}>
                            {isLoading ? (
                                <div className={localStyle.layoutRow}>
                                    {renderFilterSidebar()}
                                    <div className={localStyle.resultsCol}>
                                        <ResultsHeader
                                            loading
                                            sortBy={sortBy}
                                            setSortBy={setSortBy}
                                            mobileFilterButton={mobileFilterButton}
                                        />
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
                                        <ResultsHeader
                                            loading={false}
                                            sortBy={sortBy}
                                            setSortBy={setSortBy}
                                            mobileFilterButton={mobileFilterButton}
                                        />
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
                                withinPortal={true}
                                lockScroll={true}
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
