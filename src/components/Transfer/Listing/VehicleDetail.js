'use client'
import React from 'react'
import { Modal } from "@mantine/core";
import { useMediaQuery } from '@mantine/hooks';
import Image from "next/image";
import { FaCar, FaKey } from 'react-icons/fa';
import { GoPerson } from 'react-icons/go';
import { PiSuitcaseRolling } from 'react-icons/pi';
import { MdClose, MdOutlineSwapHoriz, MdPayments } from 'react-icons/md';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import moment from 'moment';
import styles from './VehicleDetail.module.css';

const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatTripType = (tripType) => {
    if (!tripType) return "";
    const map = {
        'one-way': 'One-way',
        return: 'Return',
        'all-round': 'All-round',
    };
    const key = String(tripType).toLowerCase().replace(/_/g, '-');
    return map[key] || tripType.replace(/_/g, ' ');
};

export default function VehicleDetail({
    showModal,
    handleCloseModal,
    selectedTransferDetail,
    handleBookNow,
    type,
    isPackageMode,
    isEditMode,
    vehicleQuantity,
    setVehicleQuantity,
    isSelecting = false,
}) {
    const isMobile = useMediaQuery('(max-width: 767.98px)');

    const isCustom =
        selectedTransferDetail?.provider === 'custom' ||
        String(selectedTransferDetail?.transfer_type_code || '').toUpperCase() === 'CUSTOM';

    const serviceInfo = Array.isArray(selectedTransferDetail?.service_information)
        ? selectedTransferDetail.service_information
        : [];

    const vehicle = selectedTransferDetail?.vehicle_details || {};
    const vehicleName = capitalizeFirstLetter(vehicle?.name) || 'Transfer';
    const category = capitalizeFirstLetter(vehicle?.category);
    const tripLabel = formatTripType(
        selectedTransferDetail?.trip_type || selectedTransferDetail?.transfer_type_code
    );
    const subtitle =
        (category ? `${vehicleName} – ${category}` : vehicleName) +
        (tripLabel ? ` (${tripLabel})` : '');

    const passengerCapacity = vehicle?.passenger_capacity;
    const luggageCapacity = vehicle?.luggage_capacity;
    const transmission = vehicle?.transmission_type;
    const locations = selectedTransferDetail?.locations || [];
    const bookLabel = isSelecting
        ? 'Please wait...'
        : isPackageMode || isEditMode
            ? 'Select Transfer'
            : 'Book Now';

    const priceContent = selectedTransferDetail?.convertedPrice != null ? (
        <>
            {selectedTransferDetail?.convertedCurrency}{' '}
            {selectedTransferDetail?.convertedPrice}
        </>
    ) : (
        <PriceDisplay
            price={selectedTransferDetail?.price}
            currency={selectedTransferDetail?.currency}
        />
    );

    return (
        <Modal
            opened={showModal}
            size={isMobile ? '100%' : 'lg'}
            onClose={handleCloseModal}
            withCloseButton={false}
            centered={!isMobile}
            overlayProps={{
                backgroundOpacity: 0.55,
                blur: 3,
            }}
            classNames={{
                content: `${styles.modalContent}${isMobile ? ` ${styles.modalContentMobile}` : ''}`,
                body: styles.modalBody,
                inner: isMobile ? styles.modalInnerMobile : undefined,
            }}
            styles={{
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                },
                header: {
                    display: 'none',
                },
            }}
        >
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h2 className={styles.headerTitle}>Car Details</h2>
                    <p className={styles.headerSubtitle}>{subtitle}</p>
                </div>
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={handleCloseModal}
                    aria-label="Close"
                >
                    <MdClose size={20} />
                </button>
            </div>

            <div className={styles.body}>
                <div className={styles.imageWrap}>
                    {selectedTransferDetail?.vehicle_image ? (
                        <Image
                            src={selectedTransferDetail.vehicle_image}
                            height={220}
                            width={360}
                            sizes="(max-width: 767px) 100vw, 360px"
                            className={styles.image}
                            alt={vehicleName}
                        />
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            <FaCar />
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Vehicle information</h3>
                    {vehicle?.vehicle_description ? (
                        <p className={styles.description}>{vehicle.vehicle_description}</p>
                    ) : vehicle?.vehicle_type ? (
                        <p className={styles.description}>{vehicle.vehicle_type}</p>
                    ) : (
                        <p className={styles.description}>Vehicle details for this transfer.</p>
                    )}

                    {serviceInfo.length > 0 && (
                        <div className={styles.serviceGrid}>
                            {serviceInfo.map((service, index) => (
                                <div className={styles.serviceCard} key={service?.id || index}>
                                    <span className={styles.serviceName}>{service?.name}</span>
                                    <span className={styles.serviceValue}>
                                        {service?.value != null && service?.value !== ''
                                            ? service.value
                                            : '—'}
                                        {service?.description ? (
                                            <span className={styles.description}>
                                                {' '}
                                                {service.description}
                                            </span>
                                        ) : null}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <div className={styles.specsGrid}>
                        {passengerCapacity != null && passengerCapacity !== '' && (
                            <div className={styles.specItem}>
                                <span className={styles.specIcon} aria-hidden="true">
                                    <GoPerson />
                                </span>
                                <div className={styles.specMeta}>
                                    <span className={styles.specLabel}>Passenger</span>
                                    <span className={styles.specValue}>
                                        1 - {passengerCapacity} Passengers
                                    </span>
                                </div>
                            </div>
                        )}

                        {luggageCapacity != null && luggageCapacity !== '' && (
                            <div className={styles.specItem}>
                                <span className={styles.specIcon} aria-hidden="true">
                                    <PiSuitcaseRolling />
                                </span>
                                <div className={styles.specMeta}>
                                    <span className={styles.specLabel}>Luggage Capacity</span>
                                    <span className={styles.specValue}>
                                        {luggageCapacity} Bags
                                    </span>
                                </div>
                            </div>
                        )}

                        {transmission && (
                            <div className={styles.specItem}>
                                <span className={styles.specIcon} aria-hidden="true">
                                    <FaKey />
                                </span>
                                <div className={styles.specMeta}>
                                    <span className={styles.specLabel}>Transmission</span>
                                    <span className={styles.specValue}>{transmission}</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.specItem}>
                            <span className={styles.specIcon} aria-hidden="true">
                                <MdPayments />
                            </span>
                            <div className={styles.specMeta}>
                                <span className={styles.specLabel}>Total Price</span>
                                <span className={styles.specValue}>{priceContent}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Destination Information</h3>
                    {locations.length > 0 ? (
                        locations.map((location, idx) => (
                            <div
                                key={location.id || idx}
                                className={styles.routeRow}
                                style={idx > 0 ? { marginTop: '0.75rem' } : undefined}
                            >
                                <div className={styles.routeCard}>
                                    <span className={styles.routeLabel}>From</span>
                                    <span className={styles.routeTitle}>
                                        {location.pickup_title || 'Pickup'}
                                    </span>
                                    {location.pickup_address && (
                                        <span className={styles.routeAddress}>
                                            {location.pickup_address}
                                        </span>
                                    )}
                                </div>

                                <span className={styles.routeSwap} aria-hidden="true">
                                    <MdOutlineSwapHoriz />
                                </span>

                                <div className={styles.routeCard}>
                                    <span className={styles.routeLabel}>To</span>
                                    <span className={styles.routeTitle}>
                                        {location.dropoff_title || 'Dropoff'}
                                    </span>
                                    {location.dropoff_address && (
                                        <span className={styles.routeAddress}>
                                            {location.dropoff_address}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyRoute}>
                            No specific route information available
                        </div>
                    )}
                </div>

                {selectedTransferDetail?.cancel_policy && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Cancellation Policy</h3>
                        {selectedTransferDetail.cancel_policy === 'refundable' ? (
                            <>
                                <div className={`${styles.policyBox} ${styles.policyOk}`}>
                                    This transfer is <strong>fully refundable</strong>.
                                    {selectedTransferDetail.cancellation_policies?.length > 0 && (
                                        <>
                                            {' '}
                                            Free cancellation before{' '}
                                            <strong>
                                                {moment(
                                                    selectedTransferDetail.cancellation_policies[0].from
                                                ).format('DD MMM YYYY')}
                                            </strong>
                                            .
                                        </>
                                    )}{' '}
                                    Cancellation charges may apply based on the time of cancellation.
                                </div>
                                {selectedTransferDetail.cancellation_policies?.length > 0 &&
                                    selectedTransferDetail.cancellation_policies.map((policy, idx) => (
                                        <div key={idx} className={styles.policyWarn}>
                                            If cancelled from{' '}
                                            <strong>
                                                {moment(policy.from).format('DD MMM YYYY')}
                                            </strong>
                                            , a cancellation fee of{' '}
                                            <strong>
                                                <PriceDisplay
                                                    price={policy.amount}
                                                    currency={selectedTransferDetail.currency}
                                                />
                                            </strong>{' '}
                                            will be charged.
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <div className={styles.policyBox}>
                                This transfer is <strong>non-refundable</strong>. No refund will be
                                issued in case of cancellation.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {type !== 'checkout' && (
                <div className={styles.footer}>
                    {isCustom && !isPackageMode && !isEditMode && (
                        <div className={styles.quantityBlock}>
                            <label htmlFor="vehicleQuantity" className={styles.quantityLabel}>
                                Quantity:
                            </label>
                            <select
                                id="vehicleQuantity"
                                className={styles.quantitySelect}
                                value={vehicleQuantity}
                                onChange={(e) => setVehicleQuantity(Number(e.target.value))}
                            >
                                <option value="" disabled>
                                    number of vehicles
                                </option>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                            </select>
                        </div>
                    )}
                    <button
                        type="button"
                        className={styles.bookBtn}
                        onClick={() => handleBookNow(vehicleQuantity)}
                        disabled={isSelecting}
                    >
                        {bookLabel}
                    </button>
                </div>
            )}
        </Modal>
    )
}
