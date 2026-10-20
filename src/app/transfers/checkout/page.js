'use client'
import Image from 'next/image'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaShieldAlt, FaCar, FaClock, FaUser } from 'react-icons/fa'
import { Inter, Outfit } from 'next/font/google'
import { useTransferStore } from '@/components/Store/TransferStore'
import PriceDisplay from '@/components/Currency/PriceDisplay'
import CheckoutTransfer from '@/components/Transfer/Checkout/CheckoutTransfer.js'
import moment from 'moment'
import VehicleDetail from '@/components/Transfer/Listing/VehicleDetail'
import { formatTransferServiceValue } from '@/util/formatTransferServiceValue'
import heroStyles from '@/app/hotels/checkout/CheckoutHero.module.css'
import styles from './TransferSummary.module.css'

export const dynamic = 'force-dynamic'

const outfit = Outfit({
    subsets: ['latin'],
    weight: ['700'],
    display: 'swap',
})

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500'],
    display: 'swap',
})

const formatTripType = (type) => {
    if (!type) return ''
    const map = {
        'one-way': 'One-Way',
        return: 'Return',
        'all-round': 'All-Round',
    }
    const key = String(type).toLowerCase().replace(/_/g, '-')
    return map[key] || String(type).replace(/_/g, ' ')
}

const shortPlace = (value) => {
    if (!value) return ''
    return String(value).split(',')[0]?.trim() || value
}

export default function Page() {
    const router = useRouter()
    const { selectedtransfer, setSelectedTransfer } = useTransferStore()
    const [showModal, setShowModal] = useState(false)
    const [selectedExtras, setSelectedExtras] = useState([])

    if (!selectedtransfer || !selectedtransfer.searchParams) {
        return (
            <div className="container pt-5">
                <div className={`${heroStyles.wrap} ${inter.className}`}>
                    <button
                        type="button"
                        className={heroStyles.backLink}
                        onClick={() => router.push('/transfers')}
                    >
                        <FaArrowLeft aria-hidden="true" />
                        Back to transfer results
                    </button>
                    <div className={heroStyles.banner}>
                        <div className={heroStyles.copy}>
                            <p className={heroStyles.eyebrow}>Booking type · Transfer booking</p>
                            <h1 className={`${heroStyles.title} ${outfit.className}`}>
                                No transfer selected
                            </h1>
                        </div>
                    </div>
                </div>
                <p className="text-muted mt-3">Please select a transfer from the search page.</p>
            </div>
        )
    }

    const isCustom =
        selectedtransfer?.provider === 'custom' ||
        String(selectedtransfer?.transfer_type_code || '').toUpperCase() === 'CUSTOM'

    const serviceInfo = Array.isArray(selectedtransfer?.service_information)
        ? selectedtransfer.service_information
        : []

    const quantity = Number(selectedtransfer.quantity || 1)
    const baseTotal = quantity * Number(selectedtransfer?.fare || 0)
    const extrasTotal = selectedExtras.reduce(
        (sum, extra) => sum + Number(extra?.amount || 0),
        0
    )
    const grandTotal = baseTotal + extrasTotal

    const pickup = selectedtransfer?.searchParams?.pickupLocation
    const dropoff = selectedtransfer?.searchParams?.dropoffLocation
    const routeLabel =
        pickup && dropoff
            ? `${shortPlace(pickup)} → ${shortPlace(dropoff)}`
            : shortPlace(pickup) || shortPlace(dropoff) || '—'

    const pickupDate = selectedtransfer?.searchParams?.pickupDate
        ? moment(selectedtransfer.searchParams.pickupDate).format('DD MMM YYYY')
        : ''
    const pickupTime = selectedtransfer?.searchParams?.pickupTime
        ? moment(selectedtransfer.searchParams.pickupTime, ['HH:mm:ss', 'HH:mm']).format('hh:mm A')
        : ''
    const pickupLabel = [pickupDate, pickupTime].filter(Boolean).join(' · ') || '—'

    const paxCapacity = selectedtransfer?.vehicle_details?.passenger_capacity
    const tripBadge = formatTripType(selectedtransfer?.searchParams?.transferType)

    const handleQuantityChange = (e) => {
        const next = Math.min(5, Math.max(1, Number(e.target.value) || 1))
        setSelectedTransfer({
            ...selectedtransfer,
            quantity: next,
        })
    }

    return (
        <div>
            <div className="container transfer-checkout-container pt-5">
                <div className={`${heroStyles.wrap} ${inter.className}`}>
                    <button
                        type="button"
                        className={heroStyles.backLink}
                        onClick={() => router.back()}
                    >
                        <FaArrowLeft aria-hidden="true" />
                        Back to transfer results
                    </button>

                    <div className={heroStyles.banner}>
                        <div className={heroStyles.copy}>
                            <p className={heroStyles.eyebrow}>Booking type · Transfer booking</p>
                            <h1 className={`${heroStyles.title} ${outfit.className}`}>
                                Complete your transfer booking
                            </h1>
                        </div>
                        <div className={heroStyles.secureBadge}>
                            <FaShieldAlt className={heroStyles.secureIcon} aria-hidden="true" />
                            Secured 256-bit SSL
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-9 col-sm-12 col-12 mb-3 order-md-1 order-2">
                        <CheckoutTransfer
                            transferDetail={selectedtransfer}
                            selectedExtras={selectedExtras}
                            onSelectedExtrasChange={setSelectedExtras}
                        />
                    </div>

                    <div className="col-md-3 col-sm-12 col-12 mb-3 order-md-2 order-1">
                        <aside className={`${styles.card} ${inter.className}`}>
                            <div className={styles.header}>
                                <h2 className={`${styles.title} ${outfit.className}`}>
                                    Transfer Summary
                                </h2>
                            </div>

                            <div className={styles.media}>
                                {tripBadge && (
                                    <span className={styles.badge}>{tripBadge}</span>
                                )}
                                {selectedtransfer?.vehicle_image ? (
                                    <Image
                                        src={selectedtransfer.vehicle_image}
                                        height={160}
                                        width={240}
                                        className={styles.image}
                                        alt={selectedtransfer?.vehicle_details?.name || 'Transfer'}
                                    />
                                ) : null}
                            </div>

                            <h3 className={styles.vehicleName}>
                                {selectedtransfer?.vehicle_details?.name}
                            </h3>
                            {selectedtransfer?.vehicle_details?.vehicle_description && (
                                <p className={styles.description}>
                                    {selectedtransfer.vehicle_details.vehicle_description}
                                </p>
                            )}

                            <div className={styles.metaList}>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaIcon} aria-hidden="true">
                                        <FaCar />
                                    </span>
                                    <div className={styles.metaBody}>
                                        <span className={styles.metaLabel}>Route</span>
                                        <span className={styles.metaValue}>{routeLabel}</span>
                                    </div>
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaIcon} aria-hidden="true">
                                        <FaClock />
                                    </span>
                                    <div className={styles.metaBody}>
                                        <span className={styles.metaLabel}>Pickup</span>
                                        <span className={styles.metaValue}>{pickupLabel}</span>
                                    </div>
                                </div>

                                {paxCapacity != null && paxCapacity !== '' && (
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaIcon} aria-hidden="true">
                                            <FaUser />
                                        </span>
                                        <div className={styles.metaBody}>
                                            <span className={styles.metaLabel}>Pax Capacity</span>
                                            <span className={styles.metaValue}>
                                                1-{paxCapacity} passengers
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.metaRow}>
                                    <span className={styles.metaIcon} aria-hidden="true">
                                        <FaCar />
                                    </span>
                                    <div className={styles.metaBody}>
                                        <span className={styles.metaLabel}>Quantity</span>
                                        {isCustom ? (
                                            <input
                                                type="number"
                                                min={1}
                                                max={5}
                                                value={quantity}
                                                onChange={handleQuantityChange}
                                                className={styles.quantityInput}
                                                aria-label="Vehicle quantity"
                                            />
                                        ) : (
                                            <span className={styles.quantityReadonly}>
                                                {quantity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {serviceInfo.length > 0 && (
                                <div className={styles.serviceList}>
                                    {serviceInfo.map((service, index) => (
                                        <div
                                            key={service?.id || index}
                                            className={styles.serviceRow}
                                        >
                                            <span>{service?.name}</span>
                                            <strong>{formatTransferServiceValue(service)}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                className={styles.viewDetails}
                                onClick={() => setShowModal(true)}
                            >
                                View Details
                            </button>
                            <VehicleDetail
                                selectedTransferDetail={selectedtransfer}
                                showModal={showModal}
                                handleCloseModal={() => setShowModal(false)}
                                type="checkout"
                            />

                            <div className={styles.priceBlock}>
                                <p className={styles.priceHeading}>Price Breakdown</p>
                                <div className={styles.priceRow}>
                                    <span>Transfer Fare</span>
                                    <span className={styles.priceAmount}>
                                        <PriceDisplay
                                            price={baseTotal}
                                            currency={selectedtransfer?.currency}
                                        />
                                    </span>
                                </div>
                                {selectedExtras.length > 0 && (
                                    <div className={styles.priceRow}>
                                        <span>Extra services</span>
                                        <span className={styles.priceAmount}>
                                            <PriceDisplay
                                                price={extrasTotal}
                                                currency={selectedtransfer?.currency}
                                            />
                                        </span>
                                    </div>
                                )}
                                <hr className={styles.priceDivider} />
                                <div className={styles.totalRow}>
                                    <span className={styles.totalLabel}>Total</span>
                                    <div className={styles.totalRight}>
                                        <p className={styles.totalValue}>
                                            <PriceDisplay
                                                price={grandTotal}
                                                currency={selectedtransfer?.currency}
                                            />
                                        </p>
                                        <span className={styles.totalNote}>
                                            VAT and Taxes Included
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedtransfer?.cancel_policy && (
                                <div className={styles.policyBlock}>
                                    <p className={styles.policyTitle}>Cancellation Policy</p>
                                    {selectedtransfer.cancel_policy === 'refundable' ? (
                                        <>
                                            <div className={styles.policyBox}>
                                                This transfer is <strong>fully refundable</strong>.
                                                Cancellation charges may apply based on timing.
                                            </div>
                                            {selectedtransfer.cancellation_policies?.length > 0 &&
                                                selectedtransfer.cancellation_policies.map(
                                                    (policy, idx) => (
                                                        <div key={idx} className={styles.policyWarn}>
                                                            From{' '}
                                                            <strong>
                                                                {moment(policy.from).format(
                                                                    'DD MMM YYYY'
                                                                )}
                                                            </strong>
                                                            : fee of{' '}
                                                            <strong>
                                                                <PriceDisplay
                                                                    price={
                                                                        quantity *
                                                                        Number(policy.amount)
                                                                    }
                                                                    currency={
                                                                        selectedtransfer?.currency
                                                                    }
                                                                />
                                                            </strong>{' '}
                                                            will be charged.
                                                        </div>
                                                    )
                                                )}
                                        </>
                                    ) : (
                                        <div className={styles.policyBox}>
                                            This transfer is <strong>non-refundable</strong>. No
                                            refund will be issued in case of cancellation.
                                        </div>
                                    )}
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    )
}
