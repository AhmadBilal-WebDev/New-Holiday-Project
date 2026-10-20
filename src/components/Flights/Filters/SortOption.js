'use client'
import React, { useMemo } from 'react'
import { useFlightList } from '../FlightListingContext'
import PriceDisplay from '@/components/Currency/PriceDisplay'
import styles from './SortOption.module.css'

export default function SortOption() {
    const { allFlights, sort, setSort, setCurrentPage } = useFlightList();

    const prices = useMemo(() => {
        if (!allFlights || allFlights.length === 0) {
            return { cheapest: 0, fastest: 0, recommended: 0, direct: 0 };
        }

        const flightPrices = allFlights.map(f => parseFloat(f.pricing?.total_amount || 0));
        const cheapest = Math.min(...flightPrices);
        const recommended = flightPrices[0] || 0;

        const flightWithDuration = allFlights.map(flight => ({
            price: parseFloat(flight.pricing?.total_amount || 0),
            duration: flight.segments?.reduce((sum, seg) => sum + (seg.duration || 0), 0) || 0,
            stops: Math.max((flight.segments?.length || 1) - 1, 0),
        }));

        const fastest = [...flightWithDuration].sort((a, b) => a.duration - b.duration)[0]?.price || 0;

        const directFlights = flightWithDuration.filter(f => f.stops === 0);
        const direct = directFlights.length
            ? Math.min(...directFlights.map(f => f.price))
            : Math.min(...flightWithDuration.map(f => f.price));

        return { cheapest, fastest, recommended, direct };
    }, [allFlights]);

    const handleSortChange = (sortType) => {
        setSort(sortType);
        setCurrentPage(1);
    };

    const currency = allFlights[0]?.pricing?.currency || 'GBP';

    const options = [
        { key: 'recommended', label: 'Recommended', price: prices.recommended },
        { key: 'price-asc', label: 'Cheapest', price: prices.cheapest },
        { key: 'duration-asc', label: 'Fastest', price: prices.fastest },
        { key: 'direct', label: 'Direct Departure', price: prices.direct },
    ];

    return (
        <div className={styles.bar} role="group" aria-label="Sort flights">
            {options.map((option) => {
                const isActive = sort === option.key;
                return (
                    <button
                        key={option.key}
                        type="button"
                        className={`${styles.option}${isActive ? ` ${styles.active}` : ''}`}
                        onClick={() => handleSortChange(option.key)}
                        aria-pressed={isActive}
                    >
                        <span className={styles.label}>{option.label}</span>
                        <span className={styles.price}>
                            <PriceDisplay price={option.price} currency={currency} />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
