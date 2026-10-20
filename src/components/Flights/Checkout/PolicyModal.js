'use client';

import React, { useState, useMemo } from 'react';
import { Drawer } from '@mantine/core';
import { IoMdClose, IoMdMegaphone } from 'react-icons/io';
import { FaSuitcase, FaSuitcaseRolling } from 'react-icons/fa';
import {
    getCancellationAirlineFee,
    getAirlineFeeLabel,
    getPassengerPenaltiesMap,
    getBaggageLabel,
    isCabinBag,
} from './flightHelpers';
import { useCurrency } from '@/util/currency';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import styles from './PolicyModal.module.css';

const TABS = [
    { id: 'baggage', label: 'Baggage Allowance' },
    { id: 'policies', label: 'Cancellation & Change Policies' },
];

const PASSENGER_TYPE_LABELS = {
    adult: 'Adult',
    child: 'Child',
    infant: 'Infant',
};

const PASSENGER_ORDER = ['adult', 'child', 'infant'];

const REQUEST_TIMES = [
    {
        key: 'before',
        label: '1 or more hours before departure',
    },
    {
        key: 'after',
        label: 'After departure or within 1 hour before departure',
    },
];

function getRouteLabel(group) {
    const first = group?.segments?.[0];
    const last = group?.segments?.[group.segments.length - 1];
    if (!first || !last) return '';

    const from =
        first.departure?.city ||
        first.departure?.city_name ||
        first.departure?.airport_code ||
        '';
    const to =
        last.arrival?.city ||
        last.arrival?.city_name ||
        last.arrival?.airport_code ||
        '';

    return `${from} - ${to}`;
}

function getStatusLabel(type, group) {
    const label = String(group?.label || '').toLowerCase();
    const isReturn = label.includes('return');
    const isDepart = label.includes('depart');

    if (type === 'reschedule') {
        if (isReturn) return 'Unused tickets: change return ticket(s)';
        if (isDepart) return 'Unused tickets: change departure ticket(s)';
        return `Unused tickets: change ${group?.label || 'flight'} ticket(s)`;
    }

    if (isReturn) return 'Return flight';
    if (isDepart) return 'Departure flight';
    return group?.label ? `${group.label} flight` : 'Flight';
}

function getBadgeClass(label) {
    const key = String(label || '').toLowerCase();
    if (key.includes('return')) return styles.badgeReturn;
    if (key.includes('depart')) return styles.badgeDepart;
    return styles.badgeOther;
}

function matchExtraBagsToGroup(items = [], group, groupIndex) {
    const label = String(group?.label || '').toLowerCase();
    const isReturn = label.includes('return') || groupIndex === 1;

    return items.filter((bag) => {
        const legId = String(bag?.legId || '').toLowerCase();
        const legLabel = String(bag?.legLabel || '').toLowerCase();

        if (isReturn) {
            return legId === 'return' || legLabel.includes('return');
        }

        return (
            legId === 'outbound' ||
            legId === 'flight' ||
            legLabel.includes('outbound') ||
            legLabel.includes('depart') ||
            (!legId && groupIndex === 0) ||
            (legId && legId !== 'return' && !legLabel.includes('return') && groupIndex === 0)
        );
    });
}

export default function PolicyModal({
    opened,
    onClose,
    flightDetails,
    segmentGroups = [],
    ancillarySelections = null,
}) {
    const { currency, rates } = useCurrency();
    const [activeTab, setActiveTab] = useState('baggage');

    const selectedBaggageItems = useMemo(() => {
        const items = ancillarySelections?.baggage?.items;
        if (Array.isArray(items) && items.length) return items;

        const byPassenger = ancillarySelections?.baggage?.byPassenger || {};
        const flat = [];
        Object.entries(byPassenger).forEach(([passengerId, byLeg]) => {
            Object.entries(byLeg || {}).forEach(([legId, bag]) => {
                if (!bag) return;
                flat.push({
                    ...bag,
                    passengerId,
                    legId,
                });
            });
        });
        return flat;
    }, [ancillarySelections]);

    const normalizeBaggageEntry = (entry) => {
        if (!entry) return null;
        const baggage = Array.isArray(entry) ? entry[0] : entry;
        if (!baggage || typeof baggage !== 'object') return null;
        if (!baggage.cabin && !baggage.checked) return null;
        return baggage;
    };

    const getBaggageByPassenger = (segment) => {
        const baggageInfo = segment?.baggage_info;
        if (!baggageInfo) return [];

        return PASSENGER_ORDER.map((type) => {
            const baggage = normalizeBaggageEntry(baggageInfo[type]);
            if (!baggage) return null;
            return {
                key: type,
                label: PASSENGER_TYPE_LABELS[type] || type,
                cabin: baggage.cabin || '',
                checked: baggage.checked || '',
            };
        }).filter(Boolean);
    };

    const passengerColumns = useMemo(() => {
        const types = new Set();

        segmentGroups.forEach((group, groupIndex) => {
            const map = getPassengerPenaltiesMap(
                flightDetails?.penalties,
                group?.segmentIndices,
                { allowUnscopedFallback: groupIndex === 0 }
            );
            PASSENGER_ORDER.forEach((type) => {
                if (map[type]) types.add(type);
            });
        });

        const cols = PASSENGER_ORDER.filter((type) => types.has(type));
        return cols.length ? cols : ['adult'];
    }, [flightDetails?.penalties, segmentGroups]);

    const renderBaggageCard = (group, groupIndex = 0) => {
        const segmentWithBaggage =
            group.segments.find((segment) => segment?.baggage_info) || group.segments[0];
        const passengers = getBaggageByPassenger(segmentWithBaggage);
        const cabinRows = passengers.filter((p) => p.cabin);
        const checkedRows = passengers.filter((p) => p.checked);
        const hasAny = cabinRows.length > 0 || checkedRows.length > 0;
        const extraBags = matchExtraBagsToGroup(selectedBaggageItems, group, groupIndex);

        return (
            <div className={styles.baggageCard}>
                <div className={styles.baggageCardHeader}>
                    <span className={`${styles.legBadge} ${getBadgeClass(group.label)}`}>
                        {group.label}
                    </span>
                    <span className={styles.routeText}>{getRouteLabel(group)}</span>
                </div>

                {!hasAny ? (
                    <p className={styles.emptyBaggage}>
                        Baggage details are not available for this flight. Please contact the airline for allowance information.
                    </p>
                ) : (
                    <div className={styles.baggageRows}>
                        {cabinRows.length > 0 && (
                            <div className={styles.baggageRow}>
                                <div className={`${styles.baggageIcon} ${styles.baggageIconCabin}`}>
                                    <FaSuitcaseRolling />
                                </div>
                                <div className={styles.baggageBody}>
                                    <h5 className={styles.baggageTypeTitle}>Carry-on baggage</h5>
                                    <ul className={styles.baggageList}>
                                        {cabinRows.map((row) => (
                                            <li key={`cabin-${row.key}`}>
                                                <strong>{row.label}:</strong> {row.cabin}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {checkedRows.length > 0 && (
                            <div className={styles.baggageRow}>
                                <div className={`${styles.baggageIcon} ${styles.baggageIconChecked}`}>
                                    <FaSuitcase />
                                </div>
                                <div className={styles.baggageBody}>
                                    <h5 className={styles.baggageTypeTitle}>Checked baggage</h5>
                                    <ul className={styles.baggageList}>
                                        {checkedRows.map((row) => (
                                            <li key={`checked-${row.key}`}>
                                                <strong>{row.label}:</strong> {row.checked}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {extraBags.length > 0 && (
                    <div className={styles.extraBagBox}>
                        <div className={styles.extraBagHeader}>
                            <span className={styles.extraBagBadge}>Added</span>
                            <h5 className={styles.extraBagTitle}>Additional baggage added</h5>
                        </div>
                        <ul className={styles.extraBagList}>
                            {extraBags.map((bag, index) => {
                                const cabin = isCabinBag(bag);
                                return (
                                    <li
                                        key={`${bag.passengerId || 'p'}-${bag.legId || index}-${bag.ancillary_key || index}`}
                                        className={styles.extraBagItem}
                                    >
                                        <div className={styles.extraBagMain}>
                                            <span
                                                className={`${styles.extraBagTag}${cabin ? ` ${styles.extraBagTagCabin}` : ` ${styles.extraBagTagChecked}`}`}
                                            >
                                                {cabin ? 'Cabin' : 'Checked'}
                                            </span>
                                            <div className={styles.extraBagText}>
                                                <span className={styles.extraBagName}>
                                                    {getBaggageLabel(bag)}
                                                </span>
                                                <span className={styles.extraBagMeta}>
                                                    {[bag.passengerName, bag.legLabel]
                                                        .filter(Boolean)
                                                        .join(' · ') || 'Extra bag'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={styles.extraBagPrice}>
                                            <PriceDisplay
                                                currency={bag.currency}
                                                price={bag.price}
                                            />
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <p className={styles.baggageFootnote}>
                    *Baggage dimensions include wheels and handles where applicable.
                </p>
            </div>
        );
    };

    const formatFeeDisplay = (rawLabel, type) => {
        const text = String(rawLabel || '').trim();
        const lower = text.toLowerCase();

        if (!text || text === '—') {
            return <span className={styles.feeMuted}>—</span>;
        }

        if (
            lower.includes('non-refundable') ||
            lower.includes('not permitted') ||
            lower.includes('not allowed')
        ) {
            if (type === 'cancellation') {
                return <span className={styles.feeBlocked}>Non-refundable</span>;
            }
            return <span className={styles.feeBlocked}>Not permitted</span>;
        }

        if (lower === 'no fee' || lower === 'free' || lower === 'included') {
            return <span className={styles.feeFree}>Free</span>;
        }

        return <span className={styles.feeAmount}>{text}</span>;
    };

    const getGroupFees = (type, group, groupIndex) => {
        const beforeKey =
            type === 'reschedule' ? 'change_before_departure' : 'refund_before_departure';
        const afterKey =
            type === 'reschedule' ? 'change_after_departure' : 'refund_after_departure';

        const getFeeLabel = (penalty) =>
            type === 'reschedule'
                ? getAirlineFeeLabel(penalty, currency, rates)
                : getCancellationAirlineFee(penalty, currency, rates);

        const penaltiesByPassenger = getPassengerPenaltiesMap(
            flightDetails?.penalties,
            group?.segmentIndices,
            { allowUnscopedFallback: groupIndex === 0 }
        );

        return {
            before: Object.fromEntries(
                passengerColumns.map((passengerType) => [
                    passengerType,
                    getFeeLabel(penaltiesByPassenger[passengerType]?.[beforeKey]),
                ])
            ),
            after: Object.fromEntries(
                passengerColumns.map((passengerType) => [
                    passengerType,
                    getFeeLabel(penaltiesByPassenger[passengerType]?.[afterKey]),
                ])
            ),
        };
    };

    const renderPolicyTable = (type) => {
        const sectionTitle =
            type === 'reschedule'
                ? 'Change fee (within the same cabin class)'
                : 'Cancellation fee (Price per passenger)';

        return (
            <div className={styles.policySection}>
                <h4 className={styles.sectionTitle}>{sectionTitle}</h4>
                <div className={styles.tableWrap}>
                    <table className={styles.policyTable}>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Request time</th>
                                {passengerColumns.map((typeKey) => (
                                    <th key={typeKey}>
                                        {PASSENGER_TYPE_LABELS[typeKey] || typeKey} tickets
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {segmentGroups.map((group, groupIndex) => {
                                const fees = getGroupFees(type, group, groupIndex);
                                const statusLabel = getStatusLabel(type, group);
                                const route = getRouteLabel(group);

                                return REQUEST_TIMES.map((request, requestIndex) => {
                                    const feeMap = request.key === 'before' ? fees.before : fees.after;

                                    return (
                                        <tr key={`${type}-${groupIndex}-${request.key}`}>
                                            {requestIndex === 0 && (
                                                <td
                                                    className={styles.statusCell}
                                                    rowSpan={REQUEST_TIMES.length}
                                                >
                                                    <div className={styles.statusMain}>{statusLabel}</div>
                                                    {route && (
                                                        <div className={styles.statusRoute}>{route}</div>
                                                    )}
                                                </td>
                                            )}
                                            <td className={styles.requestCell}>{request.label}</td>
                                            {passengerColumns.map((passengerType) => (
                                                <td key={passengerType} className={styles.feeCell}>
                                                    {formatFeeDisplay(feeMap[passengerType], type)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const activeTitle =
        activeTab === 'policies'
            ? 'Flight Cancellation & Change Policies'
            : TABS.find((tab) => tab.id === activeTab)?.label || 'Baggage & Cancellation Policy';

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size="xl"
            withCloseButton={false}
            padding={0}
            overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
            classNames={{
                content: styles.drawerContent,
                body: styles.drawerBody,
                inner: styles.drawerInner,
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{activeTitle}</h2>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
                        <IoMdClose size={22} />
                    </button>
                </div>

                <div className={styles.tabs} role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={styles.content}>
                    {activeTab === 'baggage' && (
                        <>
                            {segmentGroups.map((group, groupIndex) => (
                                <div key={`baggage-${groupIndex}`} className={styles.flightBlock}>
                                    {renderBaggageCard(group, groupIndex)}
                                </div>
                            ))}

                            {selectedBaggageItems.length > 0 && (
                                <div className={styles.extraBagSummaryNote}>
                                    Extra baggage shown above is what you added during checkout and will be charged with your booking.
                                </div>
                            )}

                            <div className={styles.specialBox}>
                                <div className={styles.specialIcon}>
                                    <IoMdMegaphone />
                                </div>
                                <div>
                                    <h4 className={styles.specialTitle}>Special baggage allowance regulations</h4>
                                    <p className={styles.specialText}>
                                        Different airlines have different regulations for special baggage such as
                                        musical instruments or sports equipment. Please contact the airline or our
                                        support team before travel if you need to carry special baggage.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'policies' && (
                        <>
                            <div className={styles.infoBanner}>
                                Change and cancellation fees are charged according to the airline&apos;s fare rules.
                                Service fees may also apply.
                            </div>

                            {renderPolicyTable('cancellation')}
                            {renderPolicyTable('reschedule')}
                        </>
                    )}
                </div>
            </div>
        </Drawer>
    );
}
