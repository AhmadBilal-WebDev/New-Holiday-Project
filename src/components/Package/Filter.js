'use client'
import React, { useEffect, useState } from 'react'
import { MdFilterListAlt, MdRefresh } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { Checkbox, RangeSlider, Select, Drawer } from "@mantine/core";
import { useSearchParams, useRouter } from "next/navigation";
import { DatePicker } from '@mantine/dates';
import moment from 'moment';
import PackageFilterLoader from '../Loader/PackageFilterLoader';
import { ConvertPrice } from '../Currency/ConvertPrice';
import { useCurrency } from '@/util/currency';
import { LiaAngleDownSolid } from "react-icons/lia";
import styles from './Filter.module.css';

const STAR_OPTIONS = ['5', '4', '3', '2', '1'];

function StarLabel({ count }) {
    return (
        <span className={styles.starRow} aria-label={`${count} star${count > 1 ? 's' : ''}`}>
            {Array.from({ length: Number(count) }).map((_, index) => (
                <FaStar key={index} size={14} className={styles.starIcon} />
            ))}
        </span>
    );
}

function ResetButton({ onClick }) {
    return (
        <div className="hotel-filter-reset">
            <button type="button" onClick={onClick} className="hotel-filter-reset__btn">
                <MdRefresh size={18} aria-hidden="true" />
                Reset filters
            </button>
        </div>
    );
}

export default function Filter() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { currency, rates } = useCurrency();
    const [searchDate, setSearchDate] = useState(null);
    const [flightFilter, setFlightFilter] = useState([]);
    const [durationFilter, setDurationFilter] = useState([]);
    const [nameFilter, setNameFilter] = useState([]);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [selectedPackageName, setSelectedPackageName] = useState(null);
    const [priceRange, setPriceRange] = useState([0, 0]);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(0);
    const [apiMinPrice, setApiMinPrice] = useState(null);
    const [apiMaxPrice, setApiMaxPrice] = useState(null);
    const [apiCurrency, setApiCurrency] = useState('');
    const [displayCurrency, setDisplayCurrency] = useState('');
    const [selectedDurations, setSelectedDurations] = useState(null);
    const [selectedDepartures, setSelectedDepartures] = useState(null);
    const [selectedRating, setSelectedRating] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getFilters();
    }, []);

    useEffect(() => {
        const urlDate = searchParams.get('date');
        if (urlDate) {
            const parsed = moment(urlDate, moment.ISO_8601, true).isValid()
                ? moment(urlDate).toDate()
                : moment(urlDate).toDate();
            setSearchDate(parsed);
        } else {
            setSearchDate(null);
        }

        const durationsFromURL = searchParams.get('duration');
        const departuresFromURL = searchParams.get('flight_departure');
        const packageNameFromURL = searchParams.get('package_name');
        const ratingFromURL = searchParams.getAll('star_rating[]');
        setSelectedDurations(durationsFromURL || null);
        setSelectedDepartures(departuresFromURL || null);
        setSelectedPackageName(packageNameFromURL || null);
        setSelectedRating(ratingFromURL);
    }, [searchParams]);

    const convertToDisplay = (value) => {
        if (value == null || isNaN(value)) return 0;
        if (!apiCurrency || !currency || !rates?.[apiCurrency] || !rates?.[currency] || apiCurrency === currency) {
            return Number(value);
        }
        const { newprice } = ConvertPrice(value, apiCurrency, currency, rates);
        return Math.round(Number(newprice));
    };

    const convertToBase = (value) => {
        if (value == null || isNaN(value)) return 0;
        if (!apiCurrency || !currency || !rates?.[apiCurrency] || !rates?.[currency] || apiCurrency === currency) {
            return Number(value);
        }
        const { newprice } = ConvertPrice(value, currency, apiCurrency, rates);
        return Math.round(Number(newprice));
    };

    useEffect(() => {
        if (apiMinPrice == null || apiMaxPrice == null || !apiCurrency) return;

        const { newcurrency, newprice: minConverted } = ConvertPrice(apiMinPrice, apiCurrency, currency, rates);
        const { newprice: maxConverted } = ConvertPrice(apiMaxPrice, apiCurrency, currency, rates);
        const minConvertedNum = Math.round(Number(minConverted));
        const maxConvertedNum = Math.round(Number(maxConverted));

        setDisplayCurrency(newcurrency || apiCurrency);
        setMinPrice(minConvertedNum - 2);
        setMaxPrice(maxConvertedNum);

        const minPriceFromURL = searchParams.get('min_price');
        const maxPriceFromURL = searchParams.get('max_price');
        if (minPriceFromURL && maxPriceFromURL) {
            setPriceRange([
                convertToDisplay(Number(minPriceFromURL)),
                convertToDisplay(Number(maxPriceFromURL)),
            ]);
        } else {
            setPriceRange([minConvertedNum, maxConvertedNum]);
        }
    }, [apiMinPrice, apiMaxPrice, apiCurrency, currency, rates, searchParams]);

    async function getFilters() {
        setIsLoading(true);
        const urlDate = searchParams.get('date');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/packages/filters?date=${urlDate}`, {
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const response = await res.json();
            setIsLoading(false);
            if (response.Success) {
                const ListDuration = (response.Content.durations || []).map((item) => ({
                    value: String(item.days),
                    label: item.label,
                }));
                const ListDeparture = (response.Content.flight_departures || []).map((item) => ({
                    value: item.departure,
                    label: item.departure,
                }));
                const ListNames = (response.Content.package_names || []).map((item) => {
                    if (typeof item === 'string') {
                        return { value: item, label: item };
                    }
                    const label = item.name || item.label || item.title || '';
                    const value = item.slug || item.name || item.value || label;
                    return { value: String(value), label: String(label) };
                }).filter((item) => item.value && item.label);

                setFlightFilter(ListDeparture);
                setDurationFilter(ListDuration);
                setNameFilter(ListNames);
                const sourceCurrency = response.Content?.currency_code || '';
                const sourceMin = Number(response.Content?.price_range?.min_price) || 0;
                const sourceMax = Number(response.Content?.price_range?.max_price) || 0;
                setApiCurrency(sourceCurrency);
                setApiMinPrice(sourceMin);
                setApiMaxPrice(sourceMax);
                setDisplayCurrency(sourceCurrency);
            }
        } catch (error) {
            setIsLoading(false);
            console.log(error);
        }
    }

    const handleDateChange = (date) => {
        const params = new URLSearchParams(searchParams);
        if (!date) {
            params.delete('date');
            setSearchDate(null);
        } else {
            const formatted = moment(date).format('YYYY-MM-DD');
            params.set('date', formatted);
            setSearchDate(date);
        }
        router.push(`?${decodeURIComponent(params.toString())}`);
    };

    const handleDurationChange = (value) => {
        const params = new URLSearchParams(searchParams);
        if (value === null) {
            params.delete('duration');
        } else {
            params.set('duration', value);
        }
        router.push(`?${decodeURIComponent(params.toString())}`);
        setSelectedDurations(value);
    };

    const handleDepartureChange = (departure) => {
        const params = new URLSearchParams(searchParams);
        if (departure === null) {
            params.delete('flight_departure');
        } else {
            params.set('flight_departure', departure);
        }
        router.push(`?${decodeURIComponent(params.toString())}`);
        setSelectedDepartures(departure);
    };

    const handlePackageNameChange = (value) => {
        const params = new URLSearchParams(searchParams);
        if (value === null) {
            params.delete('package_name');
        } else {
            params.set('package_name', value);
        }
        router.push(`?${decodeURIComponent(params.toString())}`);
        setSelectedPackageName(value);
    };

    const handleRatingChange = (event) => {
        const updated = selectedRating.includes(event.target.value)
            ? selectedRating.filter((d) => d !== event.target.value)
            : [...selectedRating, event.target.value];
        updateURL({ star_rating: updated });
        setSelectedRating(updated);
    };

    const handlePriceRangeChange = (value) => {
        setPriceRange(value);
    };

    const handlePriceRangeChangeEnd = (value) => {
        const params = new URLSearchParams(searchParams);
        params.set('min_price', convertToBase(value[0]));
        params.set('max_price', convertToBase(value[1]));
        router.push(`?${decodeURIComponent(params.toString())}`);
    };

    const updateURL = (newParams) => {
        const params = new URLSearchParams(searchParams);

        Object.entries(newParams).forEach(([key, value]) => {
            params.delete(`${key}[]`);

            if (Array.isArray(value)) {
                value.forEach((v) => {
                    if (v) params.append(`${key}[]`, v);
                });
            } else if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });

        router.push(`?${decodeURIComponent(params.toString())}`);
    };

    const handleResetFilters = () => {
        const params = new URLSearchParams(searchParams);
        const dateParam = params.get('date');
        params.delete('duration');
        params.delete('flight_departure');
        params.delete('package_name');
        params.delete('star_rating[]');
        params.delete('min_price');
        params.delete('max_price');

        setSelectedDurations(null);
        setSelectedDepartures(null);
        setSelectedPackageName(null);
        setSelectedRating([]);
        setPriceRange([minPrice, maxPrice]);

        const newParams = dateParam ? `date=${dateParam}` : '';
        router.push(`?${newParams}`);
        setActiveDrawer(null);
    };

    const isDateApplied = Boolean(searchParams.get('date'));
    const isPriceApplied = Boolean(searchParams.get('min_price') || searchParams.get('max_price'));
    const isRatingApplied = searchParams.getAll('star_rating[]').length > 0;
    const isDurationApplied = Boolean(searchParams.get('duration'));
    const isDepartureApplied = Boolean(searchParams.get('flight_departure'));
    const isNameApplied = Boolean(searchParams.get('package_name'));

    const selectStyles = {
        input: {
            borderRadius: 999,
            minHeight: 48,
        },
    };

    const renderDatePicker = () => (
        <div className={styles.dateWrap}>
            <DatePicker
                minDate={new Date()}
                value={searchDate}
                onChange={handleDateChange}
                size="md"
                styles={{
                    month: { width: '100%' },
                    monthCell: { padding: '4px 2px' },
                    day: {
                        width: 38,
                        height: 38,
                        fontSize: 14,
                        borderRadius: 10,
                    },
                    weekday: {
                        fontSize: 12,
                        fontWeight: 600,
                    },
                }}
            />
        </div>
    );

    const renderPrice = () => (
        <div>
            <RangeSlider
                className={styles.slider}
                pushOnOverlap={false}
                value={priceRange}
                onChange={handlePriceRangeChange}
                onChangeEnd={handlePriceRangeChangeEnd}
                min={minPrice}
                max={maxPrice}
                color="#E7247A"
                step={1}
                label={null}
            />
            <div className={styles.priceValues}>
                <p className={styles.priceMin}>Min: {displayCurrency} {priceRange[0]}</p>
                <p className={styles.priceMax}>Max: {displayCurrency} {priceRange[1]}</p>
            </div>
        </div>
    );

    const renderStars = () => (
        <div className={styles.starsGroup}>
            {STAR_OPTIONS.map((value) => (
                <Checkbox
                    key={value}
                    onChange={handleRatingChange}
                    checked={selectedRating.includes(value)}
                    value={value}
                    label={<StarLabel count={value} />}
                />
            ))}
        </div>
    );

    const renderPackageName = () => (
        <Select
            className={styles.select}
            searchable
            clearable
            data={nameFilter}
            value={selectedPackageName}
            onChange={handlePackageNameChange}
            placeholder="Select Package"
            styles={selectStyles}
        />
    );

    const renderDuration = (extraProps = {}) => (
        <Select
            className={styles.select}
            searchable
            clearable
            data={durationFilter}
            value={selectedDurations}
            onChange={handleDurationChange}
            placeholder="Select Duration"
            styles={selectStyles}
            {...extraProps}
        />
    );

    const renderDeparture = (extraProps = {}) => (
        <Select
            className={styles.select}
            searchable
            clearable
            data={flightFilter}
            value={selectedDepartures}
            onChange={handleDepartureChange}
            placeholder="Select Departure From"
            styles={selectStyles}
            {...extraProps}
        />
    );

    const drawerFooter = (
        <div className={styles.drawerActions}>
            <ResetButton onClick={handleResetFilters} />
            <button
                type="button"
                className={styles.doneBtn}
                onClick={() => setActiveDrawer(null)}
            >
                Done
            </button>
        </div>
    );

    return (
        <div>
            {/* Mobile filter pills */}
            <div className={`${styles.mobilePills} d-md-none`}>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('date')}
                    className={`${styles.pill}${isDateApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Date <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('price')}
                    className={`${styles.pill}${isPriceApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Price <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('name')}
                    className={`${styles.pill}${isNameApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Package <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('rating')}
                    className={`${styles.pill}${isRatingApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Stars <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('duration')}
                    className={`${styles.pill}${isDurationApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Duration <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveDrawer('departure')}
                    className={`${styles.pill}${isDepartureApplied ? ` ${styles.pillApplied}` : ''}`}
                >
                    Departure <span className={styles.pillArrow}><LiaAngleDownSolid /></span>
                </button>
            </div>

            {/* Desktop sidebar */}
            <div className={`${styles.sidebar} d-none d-md-block`}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Filters</h2>
                    <MdFilterListAlt size={22} className={styles.headerIcon} aria-hidden="true" />
                </div>

                {isLoading ? (
                    <div className={styles.section}>
                        <PackageFilterLoader />
                    </div>
                ) : (
                    <>
                        <div className={styles.section}>
                            <p className={styles.label}>Date</p>
                            {renderDatePicker()}
                        </div>

                        <div className={styles.section}>
                            <p className={styles.label}>Price</p>
                            {renderPrice()}
                        </div>

                        <div className={styles.section}>
                            <p className={styles.label}>Package Name</p>
                            {renderPackageName()}
                        </div>

                        <div className={styles.section}>
                            <p className={styles.label}>Stars</p>
                            {renderStars()}
                        </div>

                        <div className={styles.section}>
                            <p className={styles.label}>Duration</p>
                            {renderDuration()}
                        </div>

                        <div className={styles.section}>
                            <p className={styles.label}>Departure From</p>
                            {renderDeparture()}
                        </div>

                        <div className={styles.footer}>
                            <ResetButton onClick={handleResetFilters} />
                        </div>
                    </>
                )}
            </div>

            {/* Mobile drawers */}
            <Drawer
                opened={activeDrawer === 'date'}
                onClose={() => setActiveDrawer(null)}
                title="Date"
                position="bottom"
                size="72%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
            >
                <div className={styles.drawerBody}>
                    <div className={styles.drawerSection}>{renderDatePicker()}</div>
                    {drawerFooter}
                </div>
            </Drawer>

            <Drawer
                opened={activeDrawer === 'price'}
                onClose={() => setActiveDrawer(null)}
                title="Price"
                position="bottom"
                size="50%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
            >
                <div className={styles.drawerBody}>
                    <div className={styles.drawerSection}>{renderPrice()}</div>
                    {drawerFooter}
                </div>
            </Drawer>

            <Drawer
                opened={activeDrawer === 'name'}
                onClose={() => setActiveDrawer(null)}
                title="Package Name"
                position="bottom"
                size="50%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
                styles={{
                    body: { overflow: 'visible' },
                    content: { overflow: 'visible' },
                }}
            >
                <div className={styles.drawerBody}>
                    <div className={styles.drawerSection}>{renderPackageName()}</div>
                    {drawerFooter}
                </div>
            </Drawer>

            <Drawer
                opened={activeDrawer === 'rating'}
                onClose={() => setActiveDrawer(null)}
                title="Stars"
                position="bottom"
                size="50%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
            >
                <div className={styles.drawerBody}>
                    <div className={styles.drawerSection}>{renderStars()}</div>
                    {drawerFooter}
                </div>
            </Drawer>

            <Drawer
                opened={activeDrawer === 'duration'}
                onClose={() => setActiveDrawer(null)}
                title="Duration"
                position="bottom"
                size="55%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
                withinPortal
                lockScroll
                trapFocus={false}
                styles={{
                    body: { overflow: 'visible' },
                    content: { overflow: 'visible' },
                }}
            >
                <div className={styles.drawerBody} style={{ position: 'relative', zIndex: 1, touchAction: 'manipulation' }}>
                    <div className={styles.drawerSection}>
                        {renderDuration({
                            withScrollArea: false,
                            maxDropdownHeight: 160,
                            styles: {
                                input: { fontSize: 16, borderRadius: 999, minHeight: 48 },
                            },
                            comboboxProps: {
                                withinPortal: false,
                                zIndex: 10000,
                                position: 'bottom-start',
                                middlewares: { flip: false, shift: false },
                                transitionProps: { duration: 0 },
                            },
                        })}
                    </div>
                    {drawerFooter}
                </div>
            </Drawer>

            <Drawer
                opened={activeDrawer === 'departure'}
                onClose={() => setActiveDrawer(null)}
                title="Departure From"
                position="bottom"
                size="55%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
                radius="lg"
                withinPortal
                lockScroll
                trapFocus={false}
                styles={{
                    body: { overflow: 'visible' },
                    content: { overflow: 'visible' },
                }}
            >
                <div className={styles.drawerBody} style={{ position: 'relative', zIndex: 1, touchAction: 'manipulation' }}>
                    <div className={styles.drawerSection}>
                        {renderDeparture({
                            withScrollArea: false,
                            maxDropdownHeight: 160,
                            styles: {
                                input: { fontSize: 16, borderRadius: 999, minHeight: 48 },
                            },
                            comboboxProps: {
                                withinPortal: false,
                                zIndex: 10000,
                                position: 'bottom-start',
                                middlewares: { flip: false, shift: false },
                                transitionProps: { duration: 0 },
                            },
                        })}
                    </div>
                    {drawerFooter}
                </div>
            </Drawer>
        </div>
    );
}
