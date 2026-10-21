"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import moment from "moment";
import { GiGearStickPattern } from "react-icons/gi";
import { GoPerson } from "react-icons/go";
import { PiSuitcaseRolling } from "react-icons/pi";
import { MdCalendarMonth } from "react-icons/md";
import { FaCar, FaLocationDot, FaClock } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import { Tooltip } from "@mantine/core";
import { useTransferStore } from "@/components/Store/TransferStore";
import { useRouter } from "next/navigation";
import VehicleDetail from "./VehicleDetail";
import { usePackageMode } from "@/components/Store/PackageModeHelper";
import { useHolidayPackageStore } from "@/components/Store/HolidayPackageStore";
import PriceDisplay from "@/components/Currency/PriceDisplay";
import styles from "./TransferCard.module.css";

const capitalizeFirstLetter = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatTripType = (tripType) => {
  if (!tripType) return "";
  return tripType.replace(/_/g, " ").toUpperCase();
};

const formatTransferRoute = (location) => {
  const pickup = location?.pickup_address?.trim();
  const dropoff = location?.dropoff_address?.trim();
  if (pickup && dropoff) return `${pickup} → ${dropoff}`;
  return pickup || dropoff || "";
};

const formatPickupDateTime = (date, time) => {
  if (!date) return "";
  const dateLabel = moment(date).format("DD MMM YYYY");
  if (!time) return dateLabel;
  const timeLabel = moment(time, ["HH:mm:ss", "HH:mm"]).format("hh:mm A");
  return `${dateLabel} · ${timeLabel}`;
};

export default function TransferCard({ transfers, searchParams }) {
  const { setSelectedTransfer } = useTransferStore();
  const { selectedData } = useHolidayPackageStore();
  const [vehicleQuantity, setVehicleQuantity] = useState(1);
  const router = useRouter();
  const { isPackageMode, isEditMode, handleTransferSelection } =
    usePackageMode();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  if (
    (!transfers || transfers.length === 0) &&
    !(isPackageMode || isEditMode) &&
    !selectedData?.transfer
  ) {
    return (
      <div className={styles.emptyState} role="status">
        <div className={styles.emptyIconWrap} aria-hidden="true">
          <FaCar />
        </div>
        <h3 className={styles.emptyTitle}>No Transfers Found</h3>
        <p className={styles.emptyText}>
          We couldn&apos;t find any transfers matching your search criteria.
          Try adjusting your filters or search again with different locations
          or dates.
        </p>
        <div className={styles.emptyActions}>
          <Link href="/" className={styles.emptyBtnPrimary}>
            <FaHome size={14} aria-hidden />
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  const handleBooking = async (transfer) => {
    if (isSelecting) return;
    transfer.searchParams = searchParams;
    transfer.quantity = vehicleQuantity;
    setSelectedTransfer(transfer);

    if (isPackageMode || isEditMode) {
      setIsSelecting(true);
      try {
        await handleTransferSelection(transfer, true);
      } finally {
        setIsSelecting(false);
      }
      return;
    }
    router.push("/transfers/checkout");
  };

  const handleViewDetail = (transfer) => {
    setSelectedVehicle(transfer);
    setVehicleQuantity(1);
  };

  const renderTransferCard = (
    item,
    key,
    { isIncluded = false, priceContent } = {},
  ) => {
    const firstLocation = item?.locations?.[0];
    const routeText = formatTransferRoute(firstLocation);
    const category = item?.vehicle_details?.category;
    const tripTypeLabel =
      formatTripType(item?.trip_type) ||
      formatTripType(item?.transfer_type_code) ||
      formatTripType(searchParams?.transferType);
    const passengerCapacity = item?.vehicle_details?.passenger_capacity;
    const luggageCapacity = item?.vehicle_details?.luggage_capacity;
    const transmission = item?.vehicle_details?.transmission_type;
    const pickupDate =
      searchParams?.pickupDate ||
      item?.search_criteria?.pickup_date ||
      item?.pickup_date;
    const pickupTime =
      searchParams?.pickupTime ||
      item?.search_criteria?.pickup_time ||
      item?.pickup_time;
    const pickupDateTimeLabel = formatPickupDateTime(pickupDate, pickupTime);
    const bookLabel =
      isPackageMode || isEditMode
        ? isSelecting
          ? "Selecting..."
          : "Select"
        : "Book Now";

    return (
      <article
        className={`${styles.transferCard} ${isIncluded ? styles.includedCard : ""}`}
        key={key}
      >
        <div
          className={styles.cardMedia}
          onClick={() => handleViewDetail(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleViewDetail(item);
            }
          }}
        >
          {isIncluded && (
            <span className={styles.includedBadge}>Transfer Included</span>
          )}

          {category && (
            <span className={styles.categoryBadge}>
              {capitalizeFirstLetter(category)}
            </span>
          )}

          {item?.vehicle_image ? (
            <Image
              src={item.vehicle_image}
              alt={item?.vehicle_details?.name || "Transfer vehicle"}
              fill
              sizes="(max-width: 767px) 100vw, 280px"
              quality={100}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.cardImagePlaceholder}>
              <FaCar />
            </div>
          )}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.cardContent}>
            <div className={styles.titleRow}>
              <h3 className={styles.vehicleName}>
                {capitalizeFirstLetter(item?.vehicle_details?.name) || "Transfer"}
              </h3>

              {pickupDateTimeLabel && (
                <div className={styles.datetimeChip}>
                  <MdCalendarMonth className={styles.datetimeIcon} aria-hidden="true" />
                  <span>{pickupDateTimeLabel}</span>
                </div>
              )}
            </div>

            {routeText && (
              <Tooltip
                label={routeText}
                position="top"
                withArrow
                fz="xs"
                multiline
                maw={360}
              >
                <div className={styles.routeRow}>
                  <FaLocationDot className={styles.routeIcon} />
                  <span className={styles.routeText}>{routeText}</span>
                </div>
              </Tooltip>
            )}

            {item?.vehicle_details?.vehicle_description && (
              <Tooltip
                label={item.vehicle_details.vehicle_description}
                position="top"
                withArrow
                fz="xs"
                multiline
                maw={360}
              >
                <p
                  className={styles.cardDescription}
                  onClick={() => handleViewDetail(item)}
                >
                  {item.vehicle_details.vehicle_description}
                </p>
              </Tooltip>
            )}

            <div className={styles.specsGrid}>
              {passengerCapacity != null && passengerCapacity !== "" && (
                <div className={styles.specItem}>
                  <GoPerson className={styles.specIcon} aria-hidden="true" />
                  <span>1 - {passengerCapacity} Pax</span>
                </div>
              )}

              {luggageCapacity != null && luggageCapacity !== "" && (
                <div className={styles.specItem}>
                  <PiSuitcaseRolling className={styles.specIcon} aria-hidden="true" />
                  <span>{luggageCapacity} Bags</span>
                </div>
              )}

              {transmission && (
                <div className={styles.specItem}>
                  <GiGearStickPattern className={styles.specIcon} aria-hidden="true" />
                  <span>{transmission}</span>
                </div>
              )}

              {tripTypeLabel && (
                <div className={styles.specItem}>
                  <FaClock className={styles.specIcon} aria-hidden="true" />
                  <span>{tripTypeLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>Total</span>
              <p className={styles.priceValue}>{priceContent}</p>
              <span className={styles.priceNote}>VAT &amp; Taxes included</span>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => handleBooking(item)}
                className={styles.bookBtn}
                disabled={isSelecting}
              >
                {bookLabel}
              </button>
              <button
                type="button"
                onClick={() => handleViewDetail(item)}
                className={styles.detailBtn}
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
      <div className={styles.transferList}>
        {(isPackageMode || isEditMode) &&
          selectedData?.transfer &&
          renderTransferCard(selectedData.transfer, "included-transfer", {
            isIncluded: true,
            priceContent: (
              <PriceDisplay
                price={selectedData.transfer.price}
                currency={selectedData.transfer.currency}
              />
            ),
          })}

        {transfers.map((item, index) =>
          renderTransferCard(item, index, {
            priceContent: (
              <>
                {item?.convertedCurrency} {item?.convertedPrice}
              </>
            ),
          }),
        )}
      </div>

      <VehicleDetail
        showModal={!!selectedVehicle}
        handleCloseModal={() => setSelectedVehicle(null)}
        selectedTransferDetail={selectedVehicle}
        handleBookNow={() => handleBooking(selectedVehicle)}
        isPackageMode={isPackageMode}
        isEditMode={isEditMode}
        setVehicleQuantity={setVehicleQuantity}
        vehicleQuantity={vehicleQuantity}
        isSelecting={isSelecting}
      />
    </>
  );
}
