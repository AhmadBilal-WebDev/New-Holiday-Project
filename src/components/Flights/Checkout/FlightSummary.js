'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
    IoChevronUp,
    IoChevronDown,
    IoInformationCircleOutline,
} from 'react-icons/io5';
import { FaPlane, FaCalendarAlt, FaClock } from 'react-icons/fa';
import moment from 'moment';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import FlightDetail from '@/components/Flights/FlightDetail';
import PolicyModal from './PolicyModal';
import { useCurrency } from '@/util/currency';
import {
    groupSegments,
    getPassengerPricingRows,
    getTravelerPricingGroups,
    hasPerTravelerPricing,
    isNonRefundable,
} from './flightHelpers';
import styles from './FlightSummary.module.css';

function sumSeatPrices(selectedSeats = {}) {
    return Object.values(selectedSeats).reduce((sum, bySegment) => {
        return (
            sum +
            Object.values(bySegment || {}).reduce(
                (inner, seat) => inner + Number(seat?.seatPrice || seat?.price || 0),
                0
            )
        );
    }, 0);
}

function sumBaggagePrices(baggage = {}) {
    if (Array.isArray(baggage?.items) && baggage.items.length) {
        return baggage.items.reduce((sum, bag) => sum + Number(bag?.price || 0), 0);
    }

    const byPassenger = baggage?.byPassenger || {};
    return Object.values(byPassenger).reduce((sum, byLeg) => {
        return (
            sum +
            Object.values(byLeg || {}).reduce((inner, bag) => inner + Number(bag?.price || 0), 0)
        );
    }, 0);
}

function firstAncillaryCurrency(ancillarySelections, fallback) {
    const bags = ancillarySelections?.baggage?.items || [];
    if (bags[0]?.currency) return bags[0].currency;

    const byPassenger = ancillarySelections?.baggage?.byPassenger || {};
    for (const byLeg of Object.values(byPassenger)) {
        const bag = Object.values(byLeg || {})[0];
        if (bag?.currency) return bag.currency;
    }

    for (const bySegment of Object.values(ancillarySelections?.seats || {})) {
        const seat = Object.values(bySegment || {})[0];
        if (seat?.seatCurrency || seat?.currency) return seat.seatCurrency || seat.currency;
    }

    return fallback;
}

function formatDuration(minutes) {
    const mins = Math.max(0, Number(minutes) || 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function getStopsLabel(segments) {
    const stops = (segments?.length || 1) - 1;
    if (stops <= 0) return 'Non-stop';
    return `${stops} ${stops === 1 ? 'Stop' : 'Stops'}`;
}

function getGroupDurationMinutes(segments) {
    if (!segments?.length) return 0;
    const first = segments[0];
    const last = segments[segments.length - 1];
    return Math.max(
        0,
        moment(last.arrival.datetime).diff(moment(first.departure.datetime), 'minutes')
    );
}

function getFlightNumber(segment) {
    if (!segment) return '';
    const code = segment.airline?.code || '';
    const number = segment.flight_number || '';
    if (!code && !number) return '';
    return `${code} ${number}`.trim();
}

export default function FlightSummary({ flightDetails, ancillarySelections = null }) {
    const { currency: selectedCurrency, rates } = useCurrency();
    const [policyOpen, setPolicyOpen] = useState(false);
    const [taxExpanded, setTaxExpanded] = useState(false);
    const [expandedTravelers, setExpandedTravelers] = useState({
        adult: true,
        child: false,
        infant: false,
    });
    const [flightDetailOpen, setFlightDetailOpen] = useState(false);

    const segmentGroups = groupSegments(flightDetails);
    // Helper name is misleading: true when refund_before_departure.allowed === true
    const isRefundable = isNonRefundable(flightDetails);
    const showTravelerBreakdown = hasPerTravelerPricing(flightDetails);
    const travelerGroups = showTravelerBreakdown ? getTravelerPricingGroups(flightDetails) : [];
    const pricingRows = showTravelerBreakdown
        ? []
        : getPassengerPricingRows(flightDetails, selectedCurrency, rates);
    const pricing = flightDetails?.pricing;
    const taxAmount = (
        Number(pricing?.tax_amount || 0) + Number(pricing?.markup_details?.total_markup_amount || 0)
    ).toFixed(2);
    const baseTotal = Number(pricing?.total_amount || 0);
    const currency = pricing?.currency;

    const baggageTotal = useMemo(
        () => sumBaggagePrices(ancillarySelections?.baggage || {}),
        [ancillarySelections?.baggage]
    );
    const seatsTotal = useMemo(
        () => sumSeatPrices(ancillarySelections?.seats || {}),
        [ancillarySelections?.seats]
    );
    const addOnCurrency = firstAncillaryCurrency(ancillarySelections, currency);
    const totalAmount = baseTotal + baggageTotal + seatsTotal;

    const toggleTraveler = (key) => {
        setExpandedTravelers((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <aside className={styles.summary}>
            <div className={styles.card}>
                <h2 className={styles.title}>Flight Summary</h2>

                {/* <div className={styles.heroWrap}>
                    <Image
                        src="/images/flightbg.jpg"
                        alt=""
                        width={640}
                        height={280}
                        className={styles.heroImage}
                        priority={false}
                    />
                </div> */}

                <div className={styles.cardBody}>
                    {segmentGroups.map((group, index) => {
                        const firstSegment = group.segments[0];
                        const lastSegment = group.segments[group.segments.length - 1];
                        const airlineName = firstSegment?.airline?.name || 'Airline';
                        const flightNo = getFlightNumber(firstSegment);
                        const depCode = firstSegment?.departure?.airport_code || '';
                        const arrCode = lastSegment?.arrival?.airport_code || '';
                        const depCity = firstSegment?.departure?.city || depCode;
                        const arrCity = lastSegment?.arrival?.city || arrCode;
                        const duration = formatDuration(getGroupDurationMinutes(group.segments));
                        const stopsLabel = getStopsLabel(group.segments);

                        return (
                            <div
                                key={`${group.label || 'leg'}-${index}`}
                                className={styles.legBlock}
                            >
                                {segmentGroups.length > 1 && group.label && (
                                    <p className={styles.legLabel}>{group.label}</p>
                                )}

                                <div className={styles.airlineBlock}>
                                    <p className={styles.airlineName}>{airlineName}</p>
                                    {flightNo && (
                                        <p className={styles.flightNo}>Flight no: {flightNo}</p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className={styles.infoRow}
                                    onClick={() => setFlightDetailOpen(true)}
                                    aria-label={`View ${group.label || 'flight'} details`}
                                >
                                    <span className={styles.iconCircle} aria-hidden>
                                        <FaPlane />
                                    </span>
                                    <span className={styles.infoText}>
                                        <span className={styles.infoPrimary}>
                                            {depCode} → {arrCode}
                                        </span>
                                        <span className={styles.infoSecondary}>
                                            {depCity} to {arrCity}
                                        </span>
                                    </span>
                                </button>

                                <div className={styles.infoRowStatic}>
                                    <span className={styles.iconCircle} aria-hidden>
                                        <FaCalendarAlt />
                                    </span>
                                    <span className={styles.infoText}>
                                        <span className={styles.infoPrimary}>
                                            {moment(firstSegment.departure.datetime).format('MMMM D, YYYY')}
                                        </span>
                                    </span>
                                </div>

                                <div className={styles.infoRowStatic}>
                                    <span className={styles.iconCircle} aria-hidden>
                                        <FaClock />
                                    </span>
                                    <span className={styles.infoText}>
                                        <span className={styles.infoPrimary}>{duration}</span>
                                        <span className={styles.infoSecondary}>{stopsLabel}</span>
                                    </span>
                                </div>

                                {index < segmentGroups.length - 1 && (
                                    <div className={styles.legDivider} />
                                )}
                            </div>
                        );
                    })}

                    <div className={styles.sectionDivider} />

                    <div className={styles.priceSection}>
                        <h3 className={styles.priceSectionTitle}>PRICE DETAILS</h3>

                        {showTravelerBreakdown && travelerGroups.length > 0 ? (
                            travelerGroups.map((group) => {
                                const isOpen = expandedTravelers[group.key] !== false;

                                return (
                                    <div key={group.key} className={styles.travelerGroup}>
                                        <button
                                            type="button"
                                            className={styles.travelerToggle}
                                            onClick={() => toggleTraveler(group.key)}
                                            aria-expanded={isOpen}
                                        >
                                            <span className={styles.priceRowLabel}>{group.label}</span>
                                            <span className={styles.travelerToggleRight}>
                                                <span className={styles.priceRowAmount}>
                                                    <PriceDisplay
                                                        currency={group.currency}
                                                        price={group.total}
                                                    />
                                                </span>
                                                {isOpen ? (
                                                    <IoChevronUp className={styles.chevron} aria-hidden />
                                                ) : (
                                                    <IoChevronDown className={styles.chevron} aria-hidden />
                                                )}
                                            </span>
                                        </button>

                                        {isOpen && (
                                            <div className={styles.travelerDetails}>
                                                {group.fare > 0 && (
                                                    <div className={styles.travelerDetailRow}>
                                                        <span>Flight fare</span>
                                                        <span>
                                                            <PriceDisplay
                                                                currency={group.currency}
                                                                price={group.fare}
                                                            />
                                                        </span>
                                                    </div>
                                                )}
                                                {group.tax > 0 && (
                                                    <div className={styles.travelerDetailRow}>
                                                        <span>Airline taxes and fees</span>
                                                        <span>
                                                            <PriceDisplay
                                                                currency={group.currency}
                                                                price={group.tax}
                                                            />
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <>
                                {pricingRows.map((row) => (
                                    <div key={row.key} className={styles.priceRow}>
                                        <span className={styles.priceRowLabel}>{row.label}</span>
                                        <span className={styles.priceRowAmount}>
                                            <PriceDisplay currency={row.currency} price={row.amount} />
                                        </span>
                                    </div>
                                ))}

                                <div className={styles.priceRow}>
                                    <button
                                        type="button"
                                        className={styles.taxToggle}
                                        onClick={() => setTaxExpanded((prev) => !prev)}
                                        aria-expanded={taxExpanded}
                                    >
                                        <span>Taxes &amp; Fees</span>
                                        {taxExpanded ? (
                                            <IoChevronUp className={styles.chevron} aria-hidden />
                                        ) : (
                                            <IoChevronDown className={styles.chevron} aria-hidden />
                                        )}
                                    </button>
                                    <span className={styles.priceRowAmount}>
                                        <PriceDisplay currency={currency} price={taxAmount} />
                                    </span>
                                </div>

                                {taxExpanded && (
                                    <p className={styles.taxNote}>
                                        Taxes and surcharges included in the total fare as charged by the
                                        airline and authorities.
                                    </p>
                                )}
                            </>
                        )}

                        {(baggageTotal > 0 || seatsTotal > 0) && (
                            <>
                                {baggageTotal > 0 && (
                                    <div className={styles.priceRow}>
                                        <span className={styles.priceRowLabel}>Extra baggage</span>
                                        <span className={styles.priceRowAmount}>
                                            <PriceDisplay
                                                currency={addOnCurrency || currency}
                                                price={baggageTotal}
                                            />
                                        </span>
                                    </div>
                                )}

                                {seatsTotal > 0 && (
                                    <div className={styles.priceRow}>
                                        <span className={styles.priceRowLabel}>Seats</span>
                                        <span className={styles.priceRowAmount}>
                                            <PriceDisplay
                                                currency={addOnCurrency || currency}
                                                price={seatsTotal}
                                            />
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className={styles.priceRow}>
                            <span className={styles.priceRowLabel}>Booking Fee</span>
                            <span className={styles.bookingFeeValue}>Free</span>
                        </div>

                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>Total</span>
                            <div className={styles.totalRight}>
                                <span className={styles.totalValue}>
                                    <PriceDisplay currency={currency || addOnCurrency} price={totalAmount} />
                                </span>
                                <span className={styles.totalNote}>VAT and Taxes Included</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.policyBox}>
                        <div className={styles.policyHeader}>
                            <IoInformationCircleOutline className={styles.policyIcon} aria-hidden />
                            <span className={styles.policyTitle}>Cancellation Policy</span>
                        </div>
                        <p className={styles.policyText}>
                            {isRefundable ? (
                                <>
                                    This booking is <strong>refundable</strong>. Cancellation terms and
                                    any airline fees may apply before departure.
                                </>
                            ) : (
                                <>
                                    This booking is <strong>non-refundable</strong>. Once confirmed,
                                    cancellations are not permitted under the airline&apos;s fare rules.
                                </>
                            )}
                        </p>
                        <button
                            type="button"
                            className={styles.policyLink}
                            onClick={() => setPolicyOpen(true)}
                        >
                            View baggage &amp; cancellation details
                        </button>
                    </div>
                </div>
            </div>

            <FlightDetail
                flightdata={flightDetails}
                hideTrigger
                showFlights={flightDetailOpen}
                onClose={() => setFlightDetailOpen(false)}
            />

            <PolicyModal
                opened={policyOpen}
                onClose={() => setPolicyOpen(false)}
                flightDetails={flightDetails}
                segmentGroups={segmentGroups}
                ancillarySelections={ancillarySelections}
            />
        </aside>
    );
}
