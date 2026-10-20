'use client';

import React from 'react';
import { MdDirectionsCar } from 'react-icons/md';
import { FaMapLocationDot } from 'react-icons/fa6';
import styles from './TransferRouteMap.module.css';
import { useTransferList } from './TransferListingContext';

export default function TransferRouteMap({ searchParams }) {
    const { totalTransfers } = useTransferList();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const isAllRound = searchParams?.transferType === 'all-round';

    const fromLat = searchParams?.pickupLatitude ?? searchParams?.fromLat;
    const fromLng = searchParams?.pickupLongitude ?? searchParams?.fromLng;
    const toLat = searchParams?.dropoffLatitude ?? searchParams?.toLat;
    const toLng = searchParams?.dropoffLongitude ?? searchParams?.toLng;

    const mapSrc = isAllRound
        ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${fromLat},${fromLng}&zoom=14`
        : `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}`;

    const hasCoords = isAllRound
        ? fromLat && fromLng
        : fromLat && fromLng && toLat && toLng;

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <p className={styles.resultsCount}>
                    <MdDirectionsCar />
                    {totalTransfers} transfer{totalTransfers !== 1 ? 's' : ''} found
                </p>
                <span className={styles.resultsSubtext}>
                    {isAllRound ? 'Pickup area' : 'Route preview'}
                </span>
            </div>

            <div className={styles.mapCard}>
                {hasCoords ? (
                    <iframe
                        src={mapSrc}
                        title="Transfer route map"
                        className={styles.mapFrame}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                ) : (
                    <div className={styles.emptyState}>
                        <FaMapLocationDot />
                        <span>Map preview unavailable</span>
                    </div>
                )}
            </div>
        </div>
    );
}
