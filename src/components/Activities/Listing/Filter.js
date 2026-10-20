'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { MdFilterListAlt } from "react-icons/md";
import { Checkbox, RangeSlider, Drawer } from "@mantine/core";
import { useSearchParams, useRouter } from "next/navigation";
import { DatePicker } from '@mantine/dates';
import moment from 'moment';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { useCurrency } from '@/util/currency';
import { LiaAngleDownSolid } from "react-icons/lia";

const getArrayParam = (params, key) => {
    const withBrackets = params.getAll(`${key}[]`);
    if (withBrackets.length) return withBrackets.filter(Boolean);
    return params.getAll(key).filter(Boolean);
};

const clearArrayParam = (params, key) => {
    params.delete(`${key}[]`);
    params.delete(key);
};

const humanize = (value) =>
    String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export function getActivityDisplayPrice(activity, currency, rates) {
    const activityCurrency = activity?.currency_code || 'GBP';
    const activityPrice = Number(activity?.sale_price || 0);
    if (activityPrice <= 0) return 0;

    try {
        if (currency !== activityCurrency && rates?.[activityCurrency] && rates?.[currency]) {
            const { newprice } = ConvertPrice(activityPrice, activityCurrency, currency, rates);
            const converted = Number(newprice);
            if (!Number.isNaN(converted) && converted > 0) return converted;
        }
    } catch {
        /* keep original */
    }

    return activityPrice;
}

export function getActivityCategories(activity) {
    const list = [];

    if (Array.isArray(activity?.categories)) {
        activity.categories.forEach((item) => {
            if (!item) return;
            if (typeof item === 'string') {
                list.push({ slug: item, name: humanize(item) });
                return;
            }
            const slug = item.slug || item.id || item.name;
            const name = item.name || item.title || humanize(slug);
            if (slug) list.push({ slug: String(slug), name: String(name) });
        });
    }

    if (activity?.category_slug) {
        list.push({
            slug: String(activity.category_slug),
            name: humanize(activity.category_name || activity.category_slug),
        });
    }

    if (activity?.category) {
        if (typeof activity.category === 'string') {
            list.push({ slug: activity.category, name: humanize(activity.category) });
        } else if (activity.category?.slug || activity.category?.name) {
            list.push({
                slug: String(activity.category.slug || activity.category.name),
                name: String(activity.category.name || activity.category.slug),
            });
        }
    }

    if (!list.length && activity?.type) {
        list.push({ slug: String(activity.type), name: humanize(activity.type) });
    }

    // unique by slug
    return [...new Map(list.map((item) => [item.slug, item])).values()];
}

export function getActivityDuration(activity) {
    const duration = (activity?.activity_duration || '').trim();
    return duration || null;
}

function buildFacets(activityList, currency, rates) {
    const prices = [];
    const categoryMap = new Map();
    const durationMap = new Map();

    activityList.forEach((activity) => {
        const price = getActivityDisplayPrice(activity, currency, rates);
        if (price > 0) prices.push(price);

        getActivityCategories(activity).forEach((category) => {
            const prev = categoryMap.get(category.slug);
            if (prev) {
                prev.count += 1;
            } else {
                categoryMap.set(category.slug, {
                    id: category.slug,
                    slug: category.slug,
                    name: category.name,
                    count: 1,
                });
            }
        });

        const duration = getActivityDuration(activity);
        if (duration) durationMap.set(duration, (durationMap.get(duration) || 0) + 1);
    });

    const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 0;

    return {
        minPrice,
        maxPrice,
        categories: [...categoryMap.values()].sort(
            (a, b) => b.count - a.count || a.name.localeCompare(b.name)
        ),
        durations: [...durationMap.entries()]
            .map(([duration, count]) => ({ duration, count }))
            .sort((a, b) => b.count - a.count || a.duration.localeCompare(b.duration)),
    };
}

export default function Filter({ activityList = [], isListingLoading = false }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeDrawer, setActiveDrawer] = useState(null);
    const { currency, rates } = useCurrency();
    const [searchDate, setSearchDate] = useState(null);
    const [priceRange, setPriceRange] = useState([0, 0]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedDurations, setSelectedDurations] = useState([]);

    const facets = useMemo(
        () => buildFacets(activityList, currency, rates),
        [activityList, currency, rates]
    );

    const { minPrice, maxPrice, categories: categoryFilter, durations: durationFilter } = facets;
    const priceReady = activityList.length > 0 && maxPrice >= minPrice;

    useEffect(() => {
        const urlDate = searchParams.get('date');
        if (urlDate) {
            const parsed = new Date(urlDate);
            if (!Number.isNaN(parsed.getTime())) setSearchDate(parsed);
        } else {
            setSearchDate(null);
        }

        setSelectedCategories(getArrayParam(searchParams, 'category_slug'));
        setSelectedDurations(getArrayParam(searchParams, 'duration'));
    }, [searchParams]);

    useEffect(() => {
        if (!priceReady) {
            setPriceRange([0, 0]);
            return;
        }

        const minFromURL = searchParams.get('min_price');
        const maxFromURL = searchParams.get('max_price');
        if (minFromURL != null && maxFromURL != null) {
            setPriceRange([
                Math.min(Math.max(Number(minFromURL), minPrice), maxPrice),
                Math.min(Math.max(Number(maxFromURL), minPrice), maxPrice),
            ]);
        } else {
            setPriceRange([minPrice, maxPrice]);
        }
    }, [searchParams, priceReady, minPrice, maxPrice]);

    const pushParams = (params) => {
        const query = params.toString();
        router.push(query ? `?${query}` : '?', { scroll: false });
    };

    const handleDateChange = (date) => {
        const params = new URLSearchParams(searchParams.toString());
        if (date) {
            params.set('date', moment(date).format('YYYY-MM-DD'));
            setSearchDate(date);
        }
        pushParams(params);
    };

    const handleCategoryChange = (slug) => {
        const updated = selectedCategories.includes(slug)
            ? selectedCategories.filter((d) => d !== slug)
            : [...selectedCategories, slug];
        setSelectedCategories(updated);
        updateURL({ category_slug: updated });
    };

    const handleDurationChange = (duration) => {
        const updated = selectedDurations.includes(duration)
            ? selectedDurations.filter((d) => d !== duration)
            : [...selectedDurations, duration];
        setSelectedDurations(updated);
        updateURL({ duration: updated });
    };

    const handlePriceRangeChange = (value) => {
        setPriceRange(value);
    };

    const handlePriceRangeChangeEnd = (value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (
            priceReady &&
            Math.round(value[0]) === Math.round(minPrice) &&
            Math.round(value[1]) === Math.round(maxPrice)
        ) {
            params.delete('min_price');
            params.delete('max_price');
        } else {
            params.set('min_price', String(Math.round(value[0])));
            params.set('max_price', String(Math.round(value[1])));
        }
        pushParams(params);
    };

    const updateURL = (newParams) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, value]) => {
            clearArrayParam(params, key);
            params.delete(key);

            if (Array.isArray(value)) {
                value.forEach((v) => {
                    if (v) params.append(`${key}[]`, v);
                });
            } else if (value) {
                params.set(key, value);
            }
        });

        pushParams(params);
    };

    const handleResetFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        const dateParam = params.get('date');
        const cityParam = params.get('city');
        const countryParam = params.get('country');

        const next = new URLSearchParams();
        if (dateParam) next.set('date', dateParam);
        if (cityParam) next.set('city', cityParam);
        if (countryParam) next.set('country', countryParam);

        setSelectedCategories([]);
        setSelectedDurations([]);
        if (priceReady) setPriceRange([minPrice, maxPrice]);
        setActiveDrawer(null);

        pushParams(next);
    };

    const isPriceActive =
        searchParams.get('min_price') != null &&
        searchParams.get('max_price') != null;

    const isCategoryActive = getArrayParam(searchParams, 'category_slug').length > 0;
    const isDurationActive = getArrayParam(searchParams, 'duration').length > 0;

    const mobileFilters = [
        { id: 'date', label: 'Date', active: false },
        { id: 'price', label: 'Price', active: isPriceActive },
        { id: 'category', label: 'Category', active: isCategoryActive },
        { id: 'duration', label: 'Duration', active: isDurationActive },
    ].filter((item) => {
        if (item.id === 'category') return categoryFilter.length > 0 || isCategoryActive;
        if (item.id === 'duration') return durationFilter.length > 0 || isDurationActive;
        return true;
    });

    const sliderMax = Math.max(minPrice + 1, maxPrice || minPrice + 1);
    const safePriceRange = [
        Math.min(Math.max(priceRange[0] ?? minPrice, minPrice), sliderMax),
        Math.min(Math.max(priceRange[1] ?? maxPrice, minPrice), sliderMax),
    ];

    const renderDateSection = () => (
        <div>
            <p className="hotel-filter-section__label">Date</p>
            <div className="package-date-filter activity-filter-date">
                <DatePicker
                    minDate={new Date()}
                    value={searchDate}
                    onChange={handleDateChange}
                />
            </div>
        </div>
    );

    const renderPriceSection = () => (
        <div>
            <p className="hotel-filter-section__label">Price Range</p>
            <RangeSlider
                className="hotel-filter-slider mb-3"
                pushOnOverlap={false}
                value={safePriceRange}
                onChange={handlePriceRangeChange}
                onChangeEnd={handlePriceRangeChangeEnd}
                min={minPrice}
                max={sliderMax}
                step={1}
                minRange={1}
                color="#E7247A"
                label={null}
                disabled={!priceReady}
            />
            <div className="hotel-filter-price-values">
                <div className="hotel-filter-price-badge">
                    Min
                    <strong>{currency} {Math.round(safePriceRange[0] || 0)}</strong>
                </div>
                <div className="hotel-filter-price-badge">
                    Max
                    <strong>{currency} {Math.round(safePriceRange[1] || 0)}</strong>
                </div>
            </div>
        </div>
    );

    const renderCategorySection = () => (
        categoryFilter.length > 0 ? (
            <div>
                <p className="hotel-filter-section__label">Category</p>
                <div className="hotel-filter-checkbox-group">
                    {categoryFilter.map((category) => (
                        <Checkbox
                            key={category.slug}
                            onChange={() => handleCategoryChange(category.slug)}
                            checked={selectedCategories.includes(category.slug)}
                            className="hotel-filter-checkbox"
                            color="#E7247A"
                            label={`${category.name} (${category.count})`}
                        />
                    ))}
                </div>
            </div>
        ) : null
    );

    const renderDurationSection = () => (
        durationFilter.length > 0 ? (
            <div>
                <p className="hotel-filter-section__label">Duration</p>
                <div className="hotel-filter-checkbox-group">
                    {durationFilter.map((item) => (
                        <Checkbox
                            key={item.duration}
                            onChange={() => handleDurationChange(item.duration)}
                            checked={selectedDurations.includes(item.duration)}
                            className="hotel-filter-checkbox"
                            color="#E7247A"
                            label={`${item.duration} (${item.count})`}
                        />
                    ))}
                </div>
            </div>
        ) : null
    );

    const renderDrawerFooter = () => (
        <div className="border-top pt-3 mt-3">
            <button
                type="button"
                className="btn w-100 mb-2"
                style={{ background: '#E7247A', borderColor: '#E7247A', color: '#fff' }}
                onClick={() => setActiveDrawer(null)}
            >
                Done
            </button>
            <button
                type="button"
                className="hotel-filter-reset__btn"
                onClick={handleResetFilters}
            >
                Reset All Filters
            </button>
        </div>
    );

    return (
        <div>
            {/* Mobile: Filter Pills */}
            <div className="filter-scroll d-flex gap-2 d-md-none mb-3">
                {mobileFilters.map(({ id, label, active }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveDrawer(id)}
                        className={`filter-pill${active ? ' filter-pill--applied' : ''}`}
                    >
                        {label}{' '}
                        <span className="arrow">
                            <LiaAngleDownSolid />
                        </span>
                    </button>
                ))}
            </div>

            {/* Desktop / tablet (md+): Sidebar */}
            <div className="filter_box hotel-filter-sidebar rounded-5 d-none d-md-block">
                <div className="hotel-filter-sidebar__header">
                    <p className="hotel-filter-sidebar__title">Filters</p>
                    <MdFilterListAlt className="hotel-filter-sidebar__icon" size={20} />
                </div>

                {isListingLoading && activityList.length === 0 ? (
                    <div className="hotel-filter-sidebar__section">
                        <p className="mb-0 small text-muted">Loading filters...</p>
                    </div>
                ) : (
                    <>
                        <div className="hotel-filter-sidebar__section">
                            {renderDateSection()}
                        </div>
                        <div className="hotel-filter-sidebar__section">
                            {renderPriceSection()}
                        </div>
                        {categoryFilter.length > 0 && (
                            <div className="hotel-filter-sidebar__section">
                                {renderCategorySection()}
                            </div>
                        )}
                        {durationFilter.length > 0 && (
                            <div className="hotel-filter-sidebar__section">
                                {renderDurationSection()}
                            </div>
                        )}
                        <div className="hotel-filter-sidebar__footer">
                            <div className="hotel-filter-reset">
                                <button
                                    type="button"
                                    className="hotel-filter-reset__btn"
                                    onClick={handleResetFilters}
                                >
                                    Reset All Filters
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Drawer
                opened={activeDrawer === 'date'}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="65%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
            >
                {renderDateSection()}
                {renderDrawerFooter()}
            </Drawer>

            <Drawer
                opened={activeDrawer === 'price'}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="42%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
            >
                {renderPriceSection()}
                {renderDrawerFooter()}
            </Drawer>

            <Drawer
                opened={activeDrawer === 'category'}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="45%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
            >
                {renderCategorySection()}
                {renderDrawerFooter()}
            </Drawer>

            <Drawer
                opened={activeDrawer === 'duration'}
                onClose={() => setActiveDrawer(null)}
                title="Filter"
                position="bottom"
                size="45%"
                overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
            >
                {renderDurationSection()}
                {renderDrawerFooter()}
            </Drawer>
        </div>
    );
}
