"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaPlane } from "react-icons/fa";
import { AirportList } from "@/util/AirportList";
import styles from "./FlightListingSkeletonLoader.module.css";

function cityFromCode(code) {
    if (!code) return "";
    const airport = AirportList.find((a) => a.airportCode === code);
    return airport?.cityName || code;
}

function FlightCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden="true">
            <div className={styles.dateBar}>
                <span className={styles.shimmer} />
            </div>
            <div className={styles.cardMain}>
                <div className={styles.airlineCol}>
                    <span className={`${styles.shimmer} ${styles.logoSkel}`} />
                    <span className={`${styles.shimmer} ${styles.cabinSkel}`} />
                </div>

                <div className={styles.routeCol}>
                    <div className={styles.routeTop}>
                        <div className={styles.endpoint}>
                            <span className={`${styles.shimmer} ${styles.timeSkel}`} />
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w70}`} />
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w40}`} />
                        </div>
                        <div className={styles.routeMiddle}>
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w80}`} />
                            <span className={`${styles.shimmer} ${styles.pathSkel}`} />
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w50}`} />
                        </div>
                        <div className={`${styles.endpoint} ${styles.endpointRight}`}>
                            <span className={`${styles.shimmer} ${styles.timeSkel}`} />
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w70}`} />
                            <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w40}`} />
                        </div>
                    </div>
                    <div className={styles.airportRow}>
                        <span className={`${styles.shimmer} ${styles.airportSkel}`} />
                        <span className={`${styles.shimmer} ${styles.airportSkel}`} />
                    </div>
                </div>

                <div className={styles.priceCol}>
                    <span className={`${styles.shimmer} ${styles.priceSkel}`} />
                    <span className={`${styles.shimmer} ${styles.lineSkel} ${styles.w60}`} />
                    <span className={`${styles.shimmer} ${styles.btnSkel}`} />
                    <span className={`${styles.shimmer} ${styles.btnSkel}`} />
                </div>
            </div>
        </div>
    );
}

function FilterSidebarSkeleton() {
    return (
        <aside className={`${styles.filterSidebar} d-none d-md-block`} aria-hidden="true">
            <div className={styles.filterHeader}>
                <span className={`${styles.shimmer} ${styles.filterTitle}`} />
            </div>
            <div className={styles.filterBody}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={styles.filterSection}>
                        <span className={`${styles.shimmer} ${styles.filterLabel}`} />
                        <span className={`${styles.shimmer} ${styles.filterBlock}`} />
                    </div>
                ))}
                <span className={`${styles.shimmer} ${styles.filterReset}`} />
            </div>
        </aside>
    );
}

function SortBarSkeleton() {
    return (
        <div className={styles.sortBar} aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`${styles.shimmer} ${styles.sortItem}`} />
            ))}
        </div>
    );
}

function FlightSearchStatus({ fromCity, toCity, tripLabel }) {
    const [progress, setProgress] = useState(8);
    const [msgIndex, setMsgIndex] = useState(0);

    const messages = useMemo(
        () => [
            "Checking live fares across major carriers…",
            "Comparing nonstop and connecting options…",
            "Sorting the strongest deals for your dates…",
            "Almost ready to show results…",
        ],
        []
    );

    useEffect(() => {
        const progressTimer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 92) return 92;
                const bump = prev < 40 ? 4 : prev < 70 ? 3 : 2;
                return Math.min(92, prev + bump);
            });
        }, 420);

        const msgTimer = setInterval(() => {
            setMsgIndex((i) => (i + 1) % messages.length);
        }, 2200);

        return () => {
            clearInterval(progressTimer);
            clearInterval(msgTimer);
        };
    }, [messages.length]);

    const routeLabel = fromCity && toCity
        ? `${fromCity} → ${toCity}`
        : toCity || fromCity || "your route";

    return (
        <div className={styles.statusCard} role="status" aria-live="polite">
            <div className={styles.statusStage}>
                <div className={styles.radar} aria-hidden="true">
                    <span className={`${styles.orbit} ${styles.orbitA}`} />
                    <span className={`${styles.orbit} ${styles.orbitB}`} />
                    <span className={`${styles.orbit} ${styles.orbitC}`} />
                    <span className={styles.scan} />
                    <span className={`${styles.blip} ${styles.blip1}`} />
                    <span className={`${styles.blip} ${styles.blip2}`} />
                    <span className={`${styles.blip} ${styles.blip3}`} />
                    <span className={`${styles.blip} ${styles.blip4}`} />
                    <div className={styles.pin}>
                        <FaPlane />
                    </div>
                    <span className={styles.flightTrail} />
                </div>

                <div className={styles.story}>
                    <span className={styles.eyebrow}>
                        {tripLabel || "Live flight search"}
                    </span>
                    <h3 className={styles.headline}>
                        Scanning flights for <em>{routeLabel}</em>
                    </h3>
                    <p className={styles.live}>{messages[msgIndex]}</p>

                    {/* <div className={styles.progressTrack} aria-hidden="true">
                        <span
                            className={styles.progressBar}
                            style={{ width: `${progress}%` }}
                        />
                    </div> */}
                </div>

                {/* <div
                    className={styles.score}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Search progress"
                >
                    <strong>{progress}%</strong>
                    <span>complete</span>
                </div> */}
            </div>
        </div>
    );
}

export default function FlightListingFullLoader() {
    const searchParams = useSearchParams();

    const { fromCity, toCity, tripLabel } = useMemo(() => {
        const tripType = searchParams.get("AirTripType") || "OneWay";
        let from = searchParams.get("DepartureCode") || "";
        let to = searchParams.get("ArrivalCode") || "";

        if (tripType === "MultiCity") {
            from = searchParams.get("flight1_from") || from;
            to = searchParams.get("flight1_to") || to;
        }

        const label =
            tripType === "Return"
                ? "Round trip search"
                : tripType === "MultiCity"
                    ? "Multi-city search"
                    : "One-way search";

        return {
            fromCity: cityFromCode(from),
            toCity: cityFromCode(to),
            tripLabel: label,
        };
    }, [searchParams]);

    return (
        <div className={styles.wrapper} aria-busy="true" aria-label="Searching flights">
            <div className="container flight-listing-results">
                <FlightSearchStatus
                    fromCity={fromCity}
                    toCity={toCity}
                    tripLabel={tripLabel}
                />

                <div className="row">
                    <div className="col-12">
                        <SortBarSkeleton />
                    </div>
                    <div className="col-md-3 col-12">
                        <FilterSidebarSkeleton />
                    </div>
                    <div className="col-md-9 col-12">
                        <div className={styles.countSkel}>
                            <span className={`${styles.shimmer} ${styles.countIcon}`} />
                            <span className={`${styles.shimmer} ${styles.countText}`} />
                        </div>
                        <div className={styles.cardList}>
                            <FlightCardSkeleton />
                            <FlightCardSkeleton />
                            <FlightCardSkeleton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
