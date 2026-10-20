import React, { useState } from "react";
import FlightDetail from "./FlightDetail";
import { useFlightList } from "./FlightListingContext";
import moment from "moment";
import airline from "@/util/airlines.json";
import { AirportList } from "@/util/AirportList";
import { useFlightStore } from "../Store/FlightStore";
import { useRouter } from "next/navigation";
import PriceDisplay from '@/components/Currency/PriceDisplay';
import Image from "next/image";
import { FaPlane, FaClock, FaSuitcase } from "react-icons/fa";
import { usePackageMode } from "../Store/PackageModeHelper";
import { useHolidayPackageStore } from "../Store/HolidayPackageStore";
import { notifications } from "@mantine/notifications";
import { groupSegments } from "./Checkout/flightHelpers";
import styles from "./FlightCard.module.css";

function buildRevalidatePayload(flight) {
  const criteria = flight?.search_criteria || {};
  return {
    provider: flight?.provider || "",
    id: flight?.id || "",
    tag: flight?.tag == null ? "" : flight.tag,
    adult: Number(flight?.adults ?? criteria.adult ?? 1) || 1,
    child: Number(flight?.children ?? criteria.child ?? 0) || 0,
    infants: Number(flight?.infants ?? criteria.infant ?? 0) || 0,
    segments: flight?.segments || [],
  };
}

async function revalidateFlight(flight) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRevalidatePayload(flight)),
  });
  const response = await res.json();
  if (!response?.success) {
    throw new Error(response?.error?.message || response?.message || "Flight validation failed. Please try another flight.");
  }

  const revalidated = response?.data?.flight || response?.data || flight;
  const originalCriteria = flight?.search_criteria || {};
  const nextCriteria = revalidated?.search_criteria || {};

  return {
    ...flight,
    ...revalidated,
    trip_type: revalidated?.trip_type || flight?.trip_type,
    search_criteria: {
      ...originalCriteria,
      ...nextCriteria,
      AirTripType:
        nextCriteria.AirTripType ||
        originalCriteria.AirTripType ||
        '',
      legs:
        Array.isArray(nextCriteria.legs) && nextCriteria.legs.length > 0
          ? nextCriteria.legs
          : originalCriteria.legs || [],
      adult: nextCriteria.adult ?? originalCriteria.adult,
      child: nextCriteria.child ?? originalCriteria.child,
      infant: nextCriteria.infant ?? originalCriteria.infant,
    },
  };
}

function getAirportInfo(code) {
  const airport = AirportList.find((a) => a.airportCode === code);
  if (!airport) {
    return { code: code || '', city: code || '', name: code || '' };
  }
  const isAllAirports = /^all airports$/i.test(String(airport.airportName || '').trim());
  return {
    code: airport.airportCode,
    city: airport.cityName || airport.airportCode,
    name: isAllAirports
      ? (airport.cityName || airport.airportCode)
      : (airport.airportName || airport.cityName || airport.airportCode),
  };
}

function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

function getStopDetails(segments) {
  if (!segments || segments.length <= 1) {
    return { label: 'Direct', detail: null };
  }

  const stops = segments.length - 1;
  const layovers = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const mins = moment(segments[i + 1].departure.datetime).diff(
      moment(segments[i].arrival.datetime),
      'minutes'
    );
    const code = segments[i].arrival?.airport_code;
    const city = segments[i].arrival?.city || getAirportInfo(code).city;
    layovers.push(`${formatDuration(Math.max(mins, 0))} in ${city} (${code})`);
  }

  return {
    label: `${stops} ${stops === 1 ? 'Stop' : 'Stops'}`,
    detail: layovers.join(' · '),
  };
}

function FlightCardItem({ flight, onSelect, includedBanner, isSelecting, disabled }) {
  const segmentGroups = groupSegments(flight);
  const primaryGroup = segmentGroups[0];
  const firstSegment = primaryGroup?.segments?.[0];
  const headerDate = firstSegment?.departure?.datetime
    ? moment(firstSegment.departure.datetime).format('ddd, D MMM YYYY')
    : '';

  const primaryAirline = airline.find((a) => a.iata === firstSegment?.airline?.code);
  const logoSrc = firstSegment?.airline?.logo_url || primaryAirline?.logo;
  const airlineName = firstSegment?.airline?.name || primaryAirline?.name || firstSegment?.airline?.code || 'Airline';
  const cabinName = firstSegment?.cabin_class?.name || 'Economy';

  return (
    <article className={`${styles.flightCard}${includedBanner ? ` ${styles.flightCardSelected}` : ''}`}>
      {includedBanner && (
        <div className={styles.includedBanner}>
          <strong>✓ Current Selected Flight</strong>
        </div>
      )}

      <div className={styles.dateBar}>
        {headerDate}
      </div>

      <div className={styles.cardMain}>
        <div className={styles.airlineCol}>
          <div className={styles.logoBox}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={airlineName}
                width={121}
                height={68}
                quality={70}
                className={styles.airlineLogo}
              />
            ) : (
              <span className={styles.logoFallback}>{firstSegment?.airline?.code || '—'}</span>
            )}
          </div>
          <div className={styles.cabinPill}>
            {airlineName} ({cabinName})
          </div>
        </div>

        <div className={styles.routeCol}>
          {segmentGroups.map((group, idx) => {
            const first = group.segments[0];
            const last = group.segments[group.segments.length - 1];
            const totalTime = group.segments.reduce((acc, seg, segIdx) => {
              let time = acc + (seg.duration || 0);
              const nextSeg = group.segments[segIdx + 1];
              if (nextSeg) {
                time += moment(nextSeg.departure.datetime).diff(moment(seg.arrival.datetime), 'minutes');
              }
              return time;
            }, 0);
            const dayDiff = moment(last?.arrival?.datetime).startOf('day').diff(
              moment(first?.departure?.datetime).startOf('day'),
              'days'
            );
            const depInfo = getAirportInfo(first.departure.airport_code);
            const arrInfo = getAirportInfo(last.arrival.airport_code);
            const depCity = first.departure?.city || depInfo.city;
            const arrCity = last.arrival?.city || arrInfo.city;
            const stopInfo = getStopDetails(group.segments);

            return (
              <div key={idx} className={styles.routeBlock}>
                {segmentGroups.length > 1 && (
                  <div className={styles.legLabel}>{group.label}</div>
                )}

                <div className={styles.routeTop}>
                  <div className={styles.endpoint}>
                    <span className={styles.timePill}>
                      {moment(first.departure.datetime).format('hh:mm A')}
                    </span>
                    <p className={styles.cityLine}>
                      <strong>{depCity}</strong>
                    </p>
                    <span className={styles.endpointTag}>DEPARTURE</span>
                  </div>

                  <div className={styles.routeMiddle}>
                    <div className={styles.durationRow}>
                      <FaClock className={styles.durationIcon} aria-hidden />
                      <span>Trip Duration: {formatDuration(totalTime)}</span>
                    </div>
                    <div className={styles.flightPath}>
                      <FaPlane className={styles.pathPlaneLeft} aria-hidden />
                      <span className={styles.pathLine} />
                      <FaPlane className={styles.pathPlaneRight} aria-hidden />
                    </div>
                    <div className={styles.stopsBlock}>
                      <span className={styles.stopsLabel}>{stopInfo.label}</span>
                      {stopInfo.detail && (
                        <span className={styles.stopsDetail}>{stopInfo.detail}</span>
                      )}
                    </div>
                  </div>

                  <div className={`${styles.endpoint} ${styles.endpointRight}`}>
                    <span className={styles.timePill}>
                      {moment(last.arrival.datetime).format('hh:mm A')}
                      {dayDiff > 0 && <sup className={styles.dayOffset}>+{dayDiff}</sup>}
                    </span>
                    <p className={styles.cityLine}>
                       <strong>{arrCity}</strong>
                    </p>
                    <span className={styles.endpointTag}>LANDING</span>
                  </div>
                </div>

                <div className={styles.airportPills}>
                  <div className={styles.airportPill}>
                    <FaSuitcase className={styles.airportIcon} aria-hidden />
                    <span>
                      {depInfo.code} {depCity} {depInfo.name}
                    </span>
                  </div>
                  <div className={styles.airportPill}>
                    <FaSuitcase className={styles.airportIcon} aria-hidden />
                    <span>
                      {arrInfo.code} {arrCity} {arrInfo.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.priceCol}>
          <p className={styles.priceMain}>
            <PriceDisplay price={flight?.pricing?.total_amount} currency={flight?.pricing?.currency} />
          </p>
          <span className={styles.priceNote}>VAT &amp; Taxes Included</span>

          <div className={styles.actions}>
            <div className={styles.viewDetailsWrap}>
              <FlightDetail
                flightdata={flight}
                triggerLabel="View Details"
                onSelect={onSelect}
                isSelecting={isSelecting}
                selectDisabled={disabled}
              />
            </div>
            <button
              type="button"
              onClick={onSelect}
              disabled={disabled || isSelecting}
              className={styles.selectBtn}
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
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FlightCard() {
  const { flights } = useFlightList();
  const { setSelectedFlight } = useFlightStore();
  const { selectedData } = useHolidayPackageStore();
  const router = useRouter();
  const [selectingKey, setSelectingKey] = useState(null);

  const { isPackageMode, isEditMode, handleFlightSelection } = usePackageMode();

  const handleFlightSelect = async (index) => {
    if (selectingKey != null) return;
    const selectedFlightData = flights[index];
    setSelectingKey(index);
    try {
      const validatedFlight = await revalidateFlight(selectedFlightData);

      if (isPackageMode || isEditMode) {
        await handleFlightSelection(validatedFlight, true);
        setSelectingKey(null);
        return;
      }
      setSelectedFlight(validatedFlight);
      router.push("/flights/checkout");
    } catch (err) {
      console.error("Flight select error:", err);
      notifications.show({
        title: "Unable to select flight",
        message: err?.message || "Flight validation failed. Please try again.",
        color: "red",
        autoClose: 4000,
      });
      setSelectingKey(null);
    }
  };

  const handleSameFlightSelect = async (flight) => {
    if (selectingKey != null) return;
    if (!(isPackageMode || isEditMode)) return;
    setSelectingKey("included");
    try {
      const validatedFlight = await revalidateFlight(flight);
      await handleFlightSelection(validatedFlight, true);
      setSelectingKey(null);
    } catch (err) {
      console.error("Flight select error:", err);
      notifications.show({
        title: "Unable to select flight",
        message: err?.message || "Flight validation failed. Please try again.",
        color: "red",
        autoClose: 4000,
      });
      setSelectingKey(null);
    }
  };

  return (
    <div className={styles.list}>
      {flights.length === 0 && (
        <div className={styles.emptyState} role="status">
          <div className={styles.emptyIconWrap}>
            <FaPlane className={styles.emptyIcon} aria-hidden />
          </div>
          <Image
            src="/images/search-not-found.svg"
            alt=""
            width={140}
            height={160}
            className={styles.emptyImage}
          />
          <h4 className={styles.emptyStateTitle}>No Flights Found</h4>
          <p className={styles.emptyStateText}>
            We couldn&apos;t find any flights that match your search details. Try adjusting your dates, destination, or filters to see more options.
          </p>
        </div>
      )}

      {(isPackageMode || isEditMode) && selectedData?.flight && (
        <FlightCardItem
          flight={selectedData.flight}
          onSelect={() => handleSameFlightSelect(selectedData.flight)}
          includedBanner
          isSelecting={selectingKey === "included"}
          disabled={selectingKey != null}
        />
      )}

      {flights.map((item, index) => (
        <FlightCardItem
          key={index}
          flight={item}
          onSelect={() => handleFlightSelect(index)}
          isSelecting={selectingKey === index}
          disabled={selectingKey != null}
        />
      ))}
    </div>
  );
}
