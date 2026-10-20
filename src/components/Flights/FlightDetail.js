'use client'
import React, { useState, useEffect } from 'react'
import { Modal } from '@mantine/core';
import { FaAngleDown, FaSuitcase, FaPlane, FaClock, FaCheckCircle, FaTimesCircle, FaChair } from "react-icons/fa";
import { MdCancel, MdSwapHoriz } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import moment from 'moment';
import { AirportList } from '@/util/AirportList';
import Image from 'next/image';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { getPassengerPenaltiesMap, groupSegments } from './Checkout/flightHelpers';
import styles from './FlightDetail.module.css';

const POLICY_ROWS = [
    {
        key: 'refund_before_departure',
        title: 'Cancellation Policy',
        type: 'refund',
        Icon: MdCancel,
    },
    {
        key: 'refund_after_departure',
        title: 'Refund after departure',
        type: 'refund',
        Icon: MdCancel,
    },
    {
        key: 'change_before_departure',
        title: 'Change/Exchange Policy',
        type: 'change',
        Icon: MdSwapHoriz,
    },
    {
        key: 'change_after_departure',
        title: 'Change after departure',
        type: 'change',
        Icon: MdSwapHoriz,
    },
];

const PASSENGER_ORDER = ['adult', 'child', 'infant'];
const PASSENGER_LABELS = {
    adult: 'Adult',
    child: 'Child',
    infant: 'Infant',
};

function getPolicyStatus(penalty, type) {
    if (!penalty || penalty.allowed !== true) {
        return {
            allowed: false,
            badge: type === 'refund' ? 'Non-refundable' : 'Not permitted',
            description:
                type === 'refund'
                    ? 'This ticket is non-refundable. Cancellations are not permitted.'
                    : 'Date changes are not allowed for this ticket.',
        };
    }

    const amount = Number(penalty.penalty_amount);
    const hasFee = Number.isFinite(amount) && amount > 0 && penalty.penalty_currency;

    if (hasFee) {
        return {
            allowed: true,
            badge: 'Allowed with fee',
            description:
                type === 'refund'
                    ? 'Cancellation permitted with airline fee.'
                    : 'Changes allowed with a fee before departure.',
            fee: { amount, currency: penalty.penalty_currency },
        };
    }

    return {
        allowed: true,
        badge: type === 'refund' ? 'Free cancellation' : 'Free changes',
        description:
            type === 'refund'
                ? 'Cancellation allowed at no additional airline fee.'
                : 'Changes allowed at no additional airline fee.',
    };
}

function renderPolicyGrid(passengerPenalties) {
    const rows = POLICY_ROWS.filter((row) => passengerPenalties[row.key] != null);
    if (!rows.length) return null;

    return (
        <div className={styles.penaltiesGrid}>
            {rows.map(({ key, title, type, Icon }) => {
                const status = getPolicyStatus(passengerPenalties[key], type);
                return (
                    <div
                        key={key}
                        className={`${styles.penaltyCard} ${status.allowed ? styles.penaltyCardAllowed : styles.penaltyCardBlocked}`}
                    >
                        <div className={styles.penaltyCardHeader}>
                            <div className={`${styles.penaltyIconWrap} ${status.allowed ? styles.penaltyIconAllowed : styles.penaltyIconBlocked}`}>
                                <Icon />
                            </div>
                            <div className={styles.penaltyCardHeading}>
                                <span className={styles.penaltyLabel}>{title}:</span>
                                <span
                                    className={`${styles.penaltyBadge} ${status.allowed ? styles.badgeAllowed : styles.badgeBlocked}`}
                                >
                                    {status.allowed ? <FaCheckCircle /> : <FaTimesCircle />}
                                    {status.badge}
                                </span>
                            </div>
                        </div>
                        <p className={styles.penaltyText}>
                            {status.description}
                            {status.fee && (
                                <>
                                    {' '}
                                    Fee:{' '}
                                    <strong>
                                        <PriceDisplay price={status.fee.amount} currency={status.fee.currency} />
                                    </strong>
                                    .
                                </>
                            )}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function formatDuration(minutes) {
    const mins = Math.max(0, Number(minutes) || 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function getAirportInfo(code) {
    const airport = AirportList.find((a) => a.airportCode === code);
    if (!airport) {
        return {
            code: code || '',
            name: code || '',
            location: code || '',
            city: code || '',
        };
    }
    const isAllAirports = /^all airports$/i.test(String(airport.airportName || '').trim());
    const airportName = isAllAirports
        ? (airport.cityName || airport.airportCode)
        : (airport.airportName || airport.cityName || airport.airportCode);
    const city = airport.cityName || '';
    const country = airport.countryName || '';
    const locationParts = [airportName, city, country].filter(Boolean);
    const uniqueLocation = locationParts.filter((part, idx) => locationParts.indexOf(part) === idx);

    return {
        code: airport.airportCode,
        name: airportName,
        location: uniqueLocation.join(', '),
        city: city || airport.airportCode,
    };
}

export default function FlightDetail({
    flightdata,
    outlineBtn,
    showFlights,
    onClose,
    hideTrigger = false,
    triggerLabel = 'Flight Details',
    onSelect,
    isSelecting = false,
    selectDisabled = false,
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSize, setModalSize] = useState('100%');
    const [expandedPolicyPassengers, setExpandedPolicyPassengers] = useState({
        adult: true,
        child: false,
        infant: false,
    });

    useEffect(() => {
        const updateSize = () => {
            setModalSize(window.innerWidth > 768 ? '560px' : '100%');
        };

        updateSize();
        window.addEventListener('resize', updateSize);

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        if (showFlights !== undefined) {
            setModalOpen(showFlights);
        }
    }, [showFlights]);

    const handlemodalopenclose = () => {
        const next = !modalOpen;
        setModalOpen(next);
        if (!next && onClose) onClose();
    };

    const handleSelectFlight = () => {
        if (!onSelect || isSelecting || selectDisabled) return;
        setModalOpen(false);
        if (onClose) onClose();
        onSelect();
    };

    const togglePolicyPassenger = (type) => {
        setExpandedPolicyPassengers((prev) => ({
            ...prev,
            [type]: !prev[type],
        }));
    };

    const getFlightLabel = (label) => {
        if (label === 'Departure' || label === 'Return') return `${label} Flight`;
        return label;
    };

    const getStopsLabel = (segments) => {
        const stops = segments.length - 1;
        if (stops <= 0) return 'Direct';
        return `${stops} ${stops === 1 ? 'Stop' : 'Stops'}`;
    };

    const getGroupDurationMinutes = (segments) => {
        if (!segments?.length) return 0;
        const first = segments[0];
        const last = segments[segments.length - 1];
        return Math.max(
            0,
            moment(last.arrival.datetime).diff(moment(first.departure.datetime), 'minutes')
        );
    };

    const normalizeBaggageEntry = (entry) => {
        if (!entry) return null;
        const baggage = Array.isArray(entry) ? entry[0] : entry;
        if (!baggage || typeof baggage !== 'object') return null;

        const checked = baggage.checked || '';
        const cabin = baggage.cabin || '';
        if (!checked && !cabin) return null;

        return {
            checked,
            cabin,
            summary: [checked, cabin].filter(Boolean).join(' + '),
        };
    };

    const getBaggageByPassenger = (segments) => {
        const segmentWithBaggage = segments.find((segment) => segment?.baggage_info);
        const baggageInfo = segmentWithBaggage?.baggage_info;
        if (!baggageInfo) return [];

        return PASSENGER_ORDER.map((type) => {
            const baggage = normalizeBaggageEntry(baggageInfo[type]);
            if (!baggage) return null;
            return {
                key: type,
                label: PASSENGER_LABELS[type] || type,
                ...baggage,
            };
        }).filter(Boolean);
    };

    const getPrimaryCabin = (segments) => {
        const cabin = segments?.find((s) => s?.cabin_class?.name)?.cabin_class?.name;
        return cabin || 'Economy';
    };

    const getPrimaryAirline = (segments) => {
        const segment = segments?.find((s) => s?.airline?.name || s?.airline?.logo_url) || segments?.[0];
        return {
            name: segment?.airline?.name || 'Airline',
            logo: segment?.airline?.logo_url || '',
            code: segment?.airline?.code || '',
        };
    };

    const renderPenalties = (group, groupIndex) => {
        const penaltiesByPassenger = getPassengerPenaltiesMap(
            flightdata?.penalties,
            group?.segmentIndices,
            { allowUnscopedFallback: groupIndex === 0 }
        );
        const passengerTypes = PASSENGER_ORDER.filter((type) => penaltiesByPassenger[type]);
        if (!passengerTypes.length) return null;

        return (
            <div className={styles.penaltiesSection}>
                <h6 className={styles.penaltiesTitle}>Cancellation & Change Policies</h6>
                <p className={styles.penaltiesHint}>
                    Airline fees shown per passenger
                    {group?.label ? ` · ${getFlightLabel(group.label)}` : ''}.
                </p>

                <div className={styles.policyPassengerList}>
                    {passengerTypes.map((type) => {
                        const isOpen = !!expandedPolicyPassengers[type];
                        const label = PASSENGER_LABELS[type] || type;

                        return (
                            <div key={`${group?.label || groupIndex}-${type}`} className={styles.policyPassengerGroup}>
                                <button
                                    type="button"
                                    className={styles.policyPassengerToggle}
                                    onClick={() => togglePolicyPassenger(type)}
                                    aria-expanded={isOpen}
                                >
                                    <span>{label}</span>
                                    <FaAngleDown
                                        className={`${styles.policyPassengerChevron} ${isOpen ? styles.policyPassengerChevronOpen : ''}`}
                                        aria-hidden
                                    />
                                </button>

                                {isOpen && (
                                    <div className={styles.policyPassengerBody}>
                                        {renderPolicyGrid(penaltiesByPassenger[type])}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const totalPrice = flightdata?.pricing?.total_amount;
    const priceCurrency = flightdata?.pricing?.currency;
    const hasPrice = totalPrice != null && totalPrice !== '';

    return (
        <div>
            {!hideTrigger && outlineBtn !== 'umrahgetaway' && (
                <div>
                    {outlineBtn ? (
                        <button onClick={() => setModalOpen(true)} className="btn btn-outline-secondary btn-sm me-2"><FaPlane /> {outlineBtn}</button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className={styles.detailsTrigger}
                        >
                            <FaPlane className={styles.detailsTriggerIcon} />
                            <span>{triggerLabel}</span>
                            <FaAngleDown className={styles.detailsTriggerChevron} />
                        </button>
                    )}
                </div>
            )}
            <Modal
                overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
                opened={modalOpen}
                onClose={handlemodalopenclose}
                size={modalSize}
                withCloseButton={false}
                padding={0}
                radius="lg"
                classNames={{
                    inner: styles.modalInner,
                    content: styles.modalContent,
                    body: styles.modalBody,
                }}
            >
                <div className={styles.modalWrapper}>
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerIcon}><FaPlane /></div>
                            <h2 className={styles.headerTitle}>Flight Details</h2>
                        </div>
                        <button type="button" onClick={handlemodalopenclose} className={styles.closeBtn} aria-label="Close">
                            <IoMdClose size={20} />
                        </button>
                    </div>

                    <div className={styles.body}>
                        {(() => {
                            const flightGroups = groupSegments(flightdata);
                            return flightGroups.map((group, index) => {
                            const baggageByPassenger = getBaggageByPassenger(group.segments);
                            const airline = getPrimaryAirline(group.segments);
                            const cabin = getPrimaryCabin(group.segments);
                            const stopsLabel = getStopsLabel(group.segments);
                            const groupDuration = formatDuration(getGroupDurationMinutes(group.segments));
                            const primaryBaggage = baggageByPassenger[0]?.summary || '';

                            return (
                                <div key={index} className={styles.flightGroup}>
                                    {flightGroups.length > 1 && (
                                        <div className={styles.groupLabel}>{getFlightLabel(group.label)}</div>
                                    )}

                                    <div className={styles.airlineRow}>
                                        <div className={styles.airlineLeft}>
                                            <div className={styles.airlineLogoWrap}>
                                                {airline.logo ? (
                                                    <Image
                                                        src={airline.logo}
                                                        height={40}
                                                        width={40}
                                                        quality={100}
                                                        className={styles.airlineLogo}
                                                        alt={airline.code || airline.name}
                                                    />
                                                ) : (
                                                    <FaPlane size={16} />
                                                )}
                                            </div>
                                            <h3 className={styles.airlineName}>{airline.name}</h3>
                                        </div>
                                        <div className={styles.airlineMeta}>
                                            <FaClock className={styles.airlineMetaIcon} aria-hidden />
                                            <span>{stopsLabel} • {groupDuration}</span>
                                        </div>
                                    </div>

                                    <div className={styles.itineraryBox}>
                                        {group.segments.map((segment, idx) => {
                                            const dep = getAirportInfo(segment.departure.airport_code);
                                            const arr = getAirportInfo(segment.arrival.airport_code);
                                            const nextSegment = group.segments[idx + 1];
                                            let layoverMinutes = 0;
                                            if (nextSegment) {
                                                layoverMinutes = moment(nextSegment.departure.datetime).diff(
                                                    moment(segment.arrival.datetime),
                                                    'minutes'
                                                );
                                            }
                                            const segDayDiff = moment(segment.arrival.datetime)
                                                .startOf('day')
                                                .diff(moment(segment.departure.datetime).startOf('day'), 'days');
                                            const isShortConnection = layoverMinutes > 0 && layoverMinutes < 90;
                                            const flightNo = `${segment.airline?.code || ''}${segment.flight_number || ''}`;
                                            const segCabin = segment.cabin_class?.name || cabin;
                                            const segDuration = formatDuration(segment.duration);

                                            return (
                                                <React.Fragment key={idx}>
                                                    <div className={styles.timeline}>
                                                        <div className={styles.timelineItem}>
                                                            <div className={styles.timelineRail}>
                                                                <span className={styles.timelineDot} />
                                                                <span className={styles.timelineLine} aria-hidden />
                                                            </div>
                                                            <div className={styles.timelineContent}>
                                                                <span className={styles.pointLabel}>DEPARTURE</span>
                                                                <p className={styles.pointCodeTime}>
                                                                    {dep.code}{' '}
                                                                    {moment(segment.departure.datetime).format('hh:mm A')}
                                                                </p>
                                                                <p className={styles.pointLocation}>{dep.location}</p>
                                                                <p className={styles.pointDate}>
                                                                    Departure Date:{' '}
                                                                    <strong>
                                                                        {moment(segment.departure.datetime).format('D MMM, YYYY')}
                                                                    </strong>
                                                                </p>
                                                                <p className={styles.pointMeta}>
                                                                    {[
                                                                        flightNo ? `Flight ${flightNo}` : null,
                                                                        segDuration ? `Duration ${segDuration}` : null,
                                                                        segCabin || null,
                                                                    ].filter(Boolean).join(' • ')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className={styles.timelineItem}>
                                                            <div className={styles.timelineRail}>
                                                                <span className={styles.timelineDot} />
                                                            </div>
                                                            <div className={styles.timelineContent}>
                                                                <span className={styles.pointLabel}>ARRIVAL</span>
                                                                <p className={styles.pointCodeTime}>
                                                                    {arr.code}{' '}
                                                                    {moment(segment.arrival.datetime).format('hh:mm A')}
                                                                    {segDayDiff > 0 && (
                                                                        <sup className={styles.dayDiff}>+{segDayDiff}</sup>
                                                                    )}
                                                                </p>
                                                                <p className={styles.pointLocation}>{arr.location}</p>
                                                                <p className={styles.pointDate}>
                                                                    Arrival Date:{' '}
                                                                    <strong>
                                                                        {moment(segment.arrival.datetime).format('D MMM, YYYY')}
                                                                    </strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {nextSegment && (
                                                        <div className={styles.layoverBox}>
                                                            <div className={styles.layoverIconWrap}>
                                                                <FaClock />
                                                            </div>
                                                            <div className={styles.layoverContent}>
                                                                <p className={styles.layoverTitle}>
                                                                    {isShortConnection ? 'Short connection' : 'Connection'} in {arr.city}{' '}
                                                                    <strong>{formatDuration(layoverMinutes)}</strong>
                                                                </p>
                                                                <p className={styles.layoverHint}>
                                                                    Proceed directly to your next gate after arrival.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>

                                    <div className={styles.pillsRow}>
                                        <span className={styles.infoPill}>
                                            <FaChair className={styles.pillIcon} aria-hidden />
                                            {cabin}
                                        </span>
                                        {primaryBaggage && (
                                            <span className={styles.infoPill}>
                                                <FaSuitcase className={styles.pillIcon} aria-hidden />
                                                {primaryBaggage}
                                            </span>
                                        )}
                                    </div>

                                    {baggageByPassenger.length > 1 && (
                                        <div className={styles.baggageSection}>
                                            <div className={styles.baggageHeader}>
                                                <FaSuitcase className={styles.baggageHeaderIcon} />
                                                <span>Baggage by passenger</span>
                                            </div>
                                            <div className={styles.baggageList}>
                                                {baggageByPassenger.map((baggage) => (
                                                    <div key={baggage.key} className={styles.baggageItem}>
                                                        <span className={styles.baggageLabel}>{baggage.label}</span>
                                                        <span className={styles.baggageValue}>{baggage.summary}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {renderPenalties(group, index)}
                                </div>
                            );
                            });
                        })()}
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.footerPrice}>
                            {hasPrice ? (
                                <>
                                    <span className={styles.footerPriceLabel}>TOTAL PRICE</span>
                                    <p className={styles.footerPriceValue}>
                                        <PriceDisplay price={totalPrice} currency={priceCurrency} />
                                    </p>
                                    <span className={styles.footerPriceNote}>VAT &amp; Taxes Included</span>
                                </>
                            ) : (
                                <span className={styles.footerPriceNote}>Flight itinerary details</span>
                            )}
                        </div>
                        {onSelect ? (
                            <button
                                type="button"
                                onClick={handleSelectFlight}
                                disabled={selectDisabled || isSelecting}
                                className={styles.selectFlightBtn}
                            >
                                {isSelecting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                        Select Flight
                                    </>
                                ) : (
                                    'Select Flight'
                                )}
                            </button>
                        ) : (
                            <button type="button" onClick={handlemodalopenclose} className={styles.selectFlightBtn}>
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    )
}
