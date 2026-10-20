import moment from 'moment';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';

/** Normalize flight trip type for booking / ancillary APIs */
export function getBookingTripType(flight) {
    const normalize = (value) =>
        String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_')

    const airTripType = normalize(flight?.search_criteria?.AirTripType)
    if (airTripType === 'multi_city' || airTripType === 'multicity') return 'multi_city'
    if (airTripType === 'one_way' || airTripType === 'oneway') return 'one_way'
    if (airTripType === 'return' || airTripType === 'round_trip' || airTripType === 'roundtrip') {
        return 'return'
    }

    const tripType = normalize(flight?.trip_type)
    if (tripType === 'multi_city' || tripType === 'multicity') return 'multi_city'
    if (tripType === 'one_way' || tripType === 'oneway') return 'one_way'
    if (tripType === 'return' || tripType === 'round_trip' || tripType === 'roundtrip') {
        return 'return'
    }

    // Default one_way — do not assume return when type is missing/unknown
    return 'one_way'
}

export const formatConvertedPrice = (price, originalCurrency, selectedCurrency, rates) => {
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice)) {
        return { currency: originalCurrency || selectedCurrency, amount: 0, label: '0' };
    }

    const { newcurrency, newprice } = ConvertPrice(
        numericPrice,
        originalCurrency,
        selectedCurrency,
        rates
    );

    const amount = Number(newprice);
    const label = amount % 1 === 0 ? amount.toLocaleString() : Number(amount).toFixed(2);

    return {
        currency: newcurrency,
        amount,
        label: `${newcurrency} ${label}`,
    };
};

export const groupSegments = (flight) => {
    if (!flight?.segments?.length) return [];

    const withSegmentIndices = (segments, startIndex = 0) => ({
        segments,
        // API penalties.segment_index_list is 1-based
        segmentIndices: segments.map((_, i) => startIndex + i + 1),
    });

    const airportCode = (point) =>
        String(point?.airport_code || point?.iata_code || point?.code || '')
            .trim()
            .toUpperCase();

    const legDestination = (leg) =>
        String(leg?.destination || leg?.to || leg?.arrival || leg?.ArrivalCode || '')
            .trim()
            .toUpperCase();

    const legOrigin = (leg) =>
        String(leg?.origin || leg?.from || leg?.departure || leg?.DepartureCode || '')
            .trim()
            .toUpperCase();

    const groupByCriteriaLegs = (legs, labels = []) => {
        const groupedLegs = [];
        let segmentIndex = 0;

        legs.forEach((leg, legIndex) => {
            const legStartIndex = segmentIndex;
            const legSegments = [];
            const destination = legDestination(leg);

            while (segmentIndex < flight.segments.length) {
                const segment = flight.segments[segmentIndex];
                legSegments.push(segment);
                segmentIndex++;
                if (destination && airportCode(segment.arrival) === destination) break;
            }

            if (legSegments.length) {
                const origin = legOrigin(leg) || airportCode(legSegments[0]?.departure);
                const dest =
                    destination || airportCode(legSegments[legSegments.length - 1]?.arrival);
                groupedLegs.push({
                    ...withSegmentIndices(legSegments, legStartIndex),
                    label: labels[legIndex] || `Flight ${legIndex + 1}`,
                    origin,
                    destination: dest,
                });
            }
        });

        // If leftover segments remain, attach to last leg (avoids orphaned stop segments)
        if (groupedLegs.length && segmentIndex < flight.segments.length) {
            const last = groupedLegs[groupedLegs.length - 1];
            const extras = flight.segments.slice(segmentIndex);
            const start = last.segmentIndices?.[0] ? last.segmentIndices[0] - 1 : 0;
            const merged = [...last.segments, ...extras];
            groupedLegs[groupedLegs.length - 1] = {
                ...withSegmentIndices(merged, start),
                label: last.label,
                origin: last.origin,
                destination: airportCode(merged[merged.length - 1]?.arrival) || last.destination,
            };
        }

        return groupedLegs;
    };

    const tripType = getBookingTripType(flight);
    const legs =
        flight?.search_criteria?.legs ||
        flight?.legs ||
        flight?.flight_details?.search_criteria?.legs ||
        [];

    if (tripType === 'return') {
        if (legs.length === 0) {
            const midpoint = Math.ceil(flight.segments.length / 2);
            return [
                { ...withSegmentIndices(flight.segments.slice(0, midpoint), 0), label: 'Departure' },
                { ...withSegmentIndices(flight.segments.slice(midpoint), midpoint), label: 'Return' },
            ];
        }

        const groupedLegs = groupByCriteriaLegs(legs, ['Departure', 'Return']);
        return groupedLegs.length
            ? groupedLegs
            : [{ ...withSegmentIndices(flight.segments, 0), label: 'Departure' }];
    }

    if (tripType === 'multi_city') {
        if (legs.length > 0) {
            const groupedLegs = groupByCriteriaLegs(legs);
            if (groupedLegs.length > 0) return groupedLegs;
        }

        // Fallback without legs: keep connection stops together.
        // International hub stopovers often exceed 12h (e.g. ADD overnight);
        // use 24h — IATA-style connection window — before treating as a new leg.
        const LONG_LAYOVER_MINUTES = 24 * 60;
        const groupedLegs = [];
        let current = [];
        let startIndex = 0;

        flight.segments.forEach((segment, idx) => {
            if (!current.length) {
                startIndex = idx;
                current = [segment];
                return;
            }

            const prev = current[current.length - 1];
            const layover = moment(segment.departure?.datetime).diff(
                moment(prev.arrival?.datetime),
                'minutes'
            );
            const sameConnection =
                airportCode(prev.arrival) &&
                airportCode(prev.arrival) === airportCode(segment.departure) &&
                layover >= 0 &&
                layover < LONG_LAYOVER_MINUTES;

            if (sameConnection) {
                current.push(segment);
                return;
            }

            groupedLegs.push({
                ...withSegmentIndices(current, startIndex),
                label: `Flight ${groupedLegs.length + 1}`,
                origin: airportCode(current[0]?.departure),
                destination: airportCode(current[current.length - 1]?.arrival),
            });
            startIndex = idx;
            current = [segment];
        });

        if (current.length) {
            groupedLegs.push({
                ...withSegmentIndices(current, startIndex),
                label: `Flight ${groupedLegs.length + 1}`,
                origin: airportCode(current[0]?.departure),
                destination: airportCode(current[current.length - 1]?.arrival),
            });
        }

        return groupedLegs.length
            ? groupedLegs
            : [{ ...withSegmentIndices(flight.segments, 0), label: 'Flight 1' }];
    }

    return [{ ...withSegmentIndices(flight.segments, 0), label: 'Departure' }];
};

export const getPassengerCount = (flight) => {
    const counts = getTravelerCounts(flight);
    return counts.adult + counts.child + counts.infant;
};

export const getPassengerLabel = (flight) => {
    const counts = getTravelerCounts(flight);
    const { adult: adults, child: children, infant: infants } = counts;

    if (!adults && !children && !infants) return '';

    const parts = [];
    if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`);
    if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`);
    if (infants > 0) parts.push(`${infants} ${infants === 1 ? 'infant' : 'infants'}`);

    return parts.join(', ');
};

export const getCompactPassengerLabel = (flight) => {
    const count = getPassengerCount(flight);
    if (!count) return '';
    return `${count} ${count === 1 ? 'passenger' : 'passengers'}`;
};

const PASSENGER_PENALTY_TYPES = ['adult', 'child', 'infant'];

const hasLegacyFlatPenalties = (penalties) =>
    !!(
        penalties?.refund_before_departure ||
        penalties?.change_before_departure ||
        penalties?.refund_after_departure ||
        penalties?.change_after_departure
    );

const pickPenaltyEntryForSegments = (entries, segmentIndices, allowUnscopedFallback = true) => {
    if (!Array.isArray(entries) || !entries.length) return null;

    const indices = Array.isArray(segmentIndices) ? segmentIndices : [];
    if (indices.length) {
        const matched = entries.find(
            (item) =>
                item &&
                typeof item === 'object' &&
                Array.isArray(item.segment_index_list) &&
                item.segment_index_list.some((idx) => indices.includes(idx))
        );
        if (matched) return matched;
    }

    // Caller didn't ask for a specific leg — use first entry
    if (!indices.length) {
        return entries[0] && typeof entries[0] === 'object' ? entries[0] : null;
    }

    // Asked for a leg but no match — optionally fall back when rules are not segment-scoped
    const hasSegmentScoped = entries.some(
        (item) => Array.isArray(item?.segment_index_list) && item.segment_index_list.length
    );
    if (hasSegmentScoped || !allowUnscopedFallback) return null;

    return entries[0] && typeof entries[0] === 'object' ? entries[0] : null;
};

/** Resolve penalties from new API shape (adult/child/infant arrays) or legacy flat object */
export const getPassengerPenaltiesMap = (penalties, segmentIndices, options = {}) => {
    if (!penalties || typeof penalties !== 'object') return {};

    const { allowUnscopedFallback = true } = options;
    const map = {};

    PASSENGER_PENALTY_TYPES.forEach((type) => {
        const entry = penalties[type];
        if (Array.isArray(entry)) {
            const picked = pickPenaltyEntryForSegments(entry, segmentIndices, allowUnscopedFallback);
            if (picked) map[type] = picked;
        } else if (entry && typeof entry === 'object' && allowUnscopedFallback) {
            map[type] = entry;
        }
    });

    // Legacy flat shape
    if (!Object.keys(map).length && allowUnscopedFallback && hasLegacyFlatPenalties(penalties)) {
        map.adult = penalties;
    }

    return map;
};

export const getPrimaryPassengerPenalties = (flight) => {
    const map = getPassengerPenaltiesMap(flight?.penalties);
    return map.adult || map.child || map.infant || null;
};

export const isNonRefundable = (flight) => {
    // Used inverted in UI: true means refundable (allowed === true)
    const penalties = getPrimaryPassengerPenalties(flight);
    if (penalties?.refund_before_departure?.allowed === true) return true;
    if (flight?.penalties?.refund_before_departure?.allowed === true) return true;
    return false;
};

const PASSENGER_TYPE_LABELS = {
    adult: { singular: 'Adult', plural: 'Adults' },
    child: { singular: 'Child', plural: 'Children' },
    infant: { singular: 'Infant', plural: 'Infants' },
};

export const getTravelerCounts = (flight) => {
    const searchCriteria = flight?.search_criteria || {};
    const counts = {
        adult: Number(
            flight?.adults ?? searchCriteria.adult ?? searchCriteria.adults ?? 0
        ),
        child: Number(
            flight?.children ?? searchCriteria.child ?? searchCriteria.children ?? 0
        ),
        infant: Number(
            flight?.infants ?? searchCriteria.infant ?? searchCriteria.infants ?? 0
        ),
    };

    if (counts.adult || counts.child || counts.infant) {
        return counts;
    }

    // When adt/chd/inf fare fields exist, skip passenger_pricing —
    // it often labels every passenger as adult.
    const pricing = flight?.pricing;
    const hasTypeFares =
        pricing &&
        [pricing.adtFare, pricing.chdFare, pricing.infFare, pricing.adtTax, pricing.chdTax, pricing.infTax].some(
            (value) => value != null && Number(value) > 0
        );

    if (hasTypeFares) {
        return counts;
    }

    (flight?.passenger_pricing || []).forEach((pp) => {
        const type = pp.passenger_type || 'adult';
        if (!(type in counts)) return;
        counts[type] += Number(pp.quantity) || 1;
    });

    return counts;
};

/** True when pricing has per-type adult/child/infant fare or tax fields */
export const hasPerTravelerPricing = (flight) => {
    const pricing = flight?.pricing;
    if (!pricing) return false;

    const values = [
        pricing.adtFare,
        pricing.adtTax,
        pricing.chdFare,
        pricing.chdTax,
        pricing.infFare,
        pricing.infTax,
    ];

    return values.some((value) => value != null && Number(value) > 0);
};

/**
 * Expandable traveler groups when adt/chd/inf pricing exists.
 * Returns [] when per-type pricing is not available.
 * Markup is folded into Flight fare so it is not shown separately.
 */
export const getTravelerPricingGroups = (flight) => {
    if (!hasPerTravelerPricing(flight)) return [];

    const pricing = flight.pricing;
    const currency = pricing?.currency;
    const counts = getTravelerCounts(flight);
    const groups = [];

    const resolveCount = (count, unitFare, unitTax) => {
        const hasPrice = Number(unitFare || 0) > 0 || Number(unitTax || 0) > 0;
        if (count > 0) return count;
        // Pricing exists for this type but count missing → treat as 1
        return hasPrice ? 1 : 0;
    };

    const addGroup = (type, count, unitFare, unitTax) => {
        const resolvedCount = resolveCount(count, unitFare, unitTax);
        if (!resolvedCount) return;

        // Unit amounts are per traveler; multiply by count
        const fare = Number(unitFare || 0) * resolvedCount;
        const tax = Number(unitTax || 0) * resolvedCount;
        const ticketFee = Number(pricing.tktFee || 0);
        if (fare <= 0 && tax <= 0) return;

        const labels = PASSENGER_TYPE_LABELS[type];
        const name = resolvedCount === 1 ? labels.singular : labels.plural;

        groups.push({
            key: type,
            label: `${name} (${resolvedCount})`,
            fare: fare + ticketFee,
            tax,
            total: fare + tax + ticketFee,
            currency,
        });
    };

    addGroup('adult', counts.adult, pricing.adtFare, pricing.adtTax);
    addGroup('child', counts.child, pricing.chdFare, pricing.chdTax);
    addGroup('infant', counts.infant, pricing.infFare, pricing.infTax);

    // Silently distribute markup into each traveler's flight fare
    const totalMarkup = Number(pricing?.markup_details?.total_markup_amount || 0);
    if (totalMarkup > 0 && groups.length) {
        const subtotal = groups.reduce((sum, group) => sum + group.total, 0);
        let allocated = 0;

        groups.forEach((group, index) => {
            const isLast = index === groups.length - 1;
            const share = isLast
                ? Number((totalMarkup - allocated).toFixed(2))
                : subtotal > 0
                  ? Number(((group.total / subtotal) * totalMarkup).toFixed(2))
                  : 0;

            if (!isLast) allocated += share;

            group.fare = Number((group.fare + share).toFixed(2));
            group.total = Number((group.fare + group.tax).toFixed(2));
        });
    }

    return groups;
};

export const getPassengerPricingRows = (flight, selectedCurrency, rates = {}) => {
    const pricing = flight?.pricing;
    const originalCurrency = pricing?.currency;
    const cabinClass = flight?.segments?.[0]?.cabin_class?.name || '';

    const buildRow = (type, count, unitPrice, totalPrice) => {
        const convertedUnit = formatConvertedPrice(unitPrice, originalCurrency, selectedCurrency, rates);
        const labels = PASSENGER_TYPE_LABELS[type] || {
            singular: type.charAt(0).toUpperCase() + type.slice(1),
            plural: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
        };
        const name = count === 1 ? labels.singular : labels.plural;

        return {
            key: type,
            label: `${count} ${name}${cabinClass ? `, ${cabinClass}` : ''}`,
            quantityLabel: `${count} × ${convertedUnit.label}`,
            amount: totalPrice,
            currency: originalCurrency,
        };
    };

    if (flight?.passenger_pricing?.length) {
        const grouped = {};

        flight.passenger_pricing.forEach((pp) => {
            const type = pp.passenger_type || 'adult';
            const quantity = Number(pp.quantity) || 1;
            if (!grouped[type]) {
                grouped[type] = { count: 0, unitPrice: 0, totalPrice: 0 };
            }
            grouped[type].count += quantity;
            grouped[type].unitPrice = Number(pp.base_amount || pp.amount || pp.price || 0);
            grouped[type].totalPrice += Number(pp.base_amount || pp.amount || pp.price || 0);
        });

        return Object.entries(grouped).map(([type, data]) =>
            buildRow(type, data.count, data.unitPrice, data.totalPrice)
        );
    }

    const counts = getTravelerCounts(flight);
    const rows = [];
    const baseAmount =
        Number(pricing?.base_amount || 0) + Number(pricing?.markup_details?.total_markup_amount || 0);
    const passengerCount =
        counts.adult + counts.child + counts.infant || getPassengerCount(flight) || 1;

    const addRow = (count, type) => {
        if (!count) return;
        const unitPrice = baseAmount / passengerCount;
        rows.push(buildRow(type, count, unitPrice, unitPrice * count));
    };

    addRow(counts.adult, 'adult');
    addRow(counts.child, 'child');
    addRow(counts.infant, 'infant');

    if (!rows.length) {
        rows.push(buildRow('adult', 1, baseAmount, baseAmount));
    }

    return rows;
};

export const formatAmount = (amount) => {
    const value = Number(amount);
    if (Number.isNaN(value)) return '0';
    return value % 1 === 0 ? value.toLocaleString() : value.toFixed(2);
};

export const formatRouteDate = (datetime) => moment(datetime).format('ddd, D MMM');

export const getAirlineFeeLabel = (penalty, selectedCurrency, rates = {}) => {
    if (!penalty) return '—';
    if (!penalty.allowed) return 'Not permitted';

    if (penalty.penalty_amount && Number(penalty.penalty_amount) > 0) {
        return formatConvertedPrice(
            penalty.penalty_amount,
            penalty.penalty_currency,
            selectedCurrency,
            rates
        ).label;
    }

    return 'No fee';
};

export const getCancellationAirlineFee = (penalty, selectedCurrency, rates = {}) => {
    if (!penalty) return '—';
    if (!penalty.allowed) return 'Non-refundable';

    if (penalty.penalty_amount && Number(penalty.penalty_amount) > 0) {
        return formatConvertedPrice(
            penalty.penalty_amount,
            penalty.penalty_currency,
            selectedCurrency,
            rates
        ).label;
    }

    return 'No fee';
};

export const isCabinBag = (option) => {
    if (Number(option?.pay_baggage_type) === 2) return true;
    const text = `${option?.description || ''} ${option?.baggage_type || ''} ${option?.type || ''}`;
    return /cabin|carry[\s-]?on/i.test(text);
};

export const formatBaggageWeight = (weight) => {
    const raw = String(weight ?? '').trim();
    if (!raw) return '';
    if (/^0(\s*kg)?$/i.test(raw)) return '';
    return /kg/i.test(raw) ? raw : `${raw}KG`;
};

export const getBaggageLabel = (option) => {
    if (!option) return 'Baggage';
    const weight = formatBaggageWeight(option?.baggage_weight);
    const description = String(option?.description || '').trim();
    const cleanDescription =
        description && !/[\u4e00-\u9fff]/.test(description) ? description : '';

    if (isCabinBag(option)) {
        return weight || cleanDescription || 'Cabin bag';
    }

    return weight || cleanDescription || 'Checked bag';
};
