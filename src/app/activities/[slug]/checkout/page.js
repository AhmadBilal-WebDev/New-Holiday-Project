'use client'
import React, { useEffect, useState } from 'react'
import { useActivityStore } from '@/components/Store/ActivityStore';
import { LuCalendarCheck2, LuShield } from "react-icons/lu";
import { IoTimerOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import moment from 'moment'
import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { HiUserGroup } from "react-icons/hi";
import { MdOutlineTranslate } from "react-icons/md";
import { FiChevronLeft } from "react-icons/fi";
import Link from 'next/link';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import Summery from '@/components/Activities/Checkout/Summery';
import DetailForm from '@/components/Activities/Checkout/DetailForm';
import CheckoutSkeleton from '@/components/Activities/Checkout/CheckoutSkeleton';
import './checkout.css';

export const dynamic = 'force-dynamic';

const PAX_LABELS = {
    ADULT: 'Adult',
    CHILD: 'Child',
    SENIOR: 'Senior',
    INFANT: 'Infant',
}

function formatSessionLabel(codeOrName) {
    if (!codeOrName) return ''
    const parsed = moment(codeOrName, ['HH:mm', 'H:mm', 'hh:mm A'], true)
    return parsed.isValid() ? parsed.format('h:mm A') : codeOrName
}

function extractContentItems(html) {
    if (!html) return []
    const listMatches = [...String(html).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    if (listMatches.length > 0) {
        return listMatches
            .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
    }
    const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return text ? [text] : []
}

function getGuestCount(activityDetail) {
    const modalityPax = activityDetail?.modality?.selected_pax
    if (Array.isArray(modalityPax) && modalityPax.length > 0) {
        return modalityPax.reduce((sum, p) => sum + Number(p.quantity || 0), 0)
    }
    return Number(activityDetail?.adults || 0) + Number(activityDetail?.children || 0)
}

function parseCancellationPolicy(raw) {
    if (!raw) return null
    if (typeof raw === 'object') return raw
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    // Avoid showing raw JSON blobs as user-facing copy
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed)
        } catch {
            return null
        }
    }
    return null
}

function formatCancellationSummary(policy, currency) {
    const parsed = parseCancellationPolicy(policy) || (typeof policy === 'object' ? policy : null)
    if (!parsed) return 'You can cancel this booking according to the applicable cancellation policy.'

    if (parsed.cancel_policy === 'non-refundable') {
        return 'This booking cannot be cancelled or refunded under any circumstances.'
    }

    const policies = Array.isArray(parsed.cancellation_policies) ? parsed.cancellation_policies : []
    const first = policies[0]
    if (first) {
        const amount = Number(first.amount ?? first.original_amount ?? 0)
        const fromRaw = first.from || first.dateFrom
        const fromDate = fromRaw ? moment(fromRaw) : null
        const dateLabel = fromDate?.isValid() ? fromDate.format('D MMM YYYY') : null

        if (dateLabel && amount > 0) {
            const feeLabel = currency ? `${currency} ${amount}` : String(amount)
            return `This booking is refundable. Free cancellation before ${dateLabel}. After that, a fee of ${feeLabel} applies.`
        }
        if (dateLabel) {
            return `This booking is refundable. Free cancellation until ${dateLabel}.`
        }
        if (amount > 0) {
            const feeLabel = currency ? `${currency} ${amount}` : String(amount)
            return `This booking is refundable. A cancellation fee of ${feeLabel} may apply.`
        }
    }

    if (parsed.cancel_policy === 'refundable' || policies.length > 0) {
        return 'This booking is refundable. Cancellation fees may apply depending on when you cancel.'
    }

    return 'Please review the full cancellation details before booking.'
}

function getReadablePolicyText(activityDetail) {
    const text = activityDetail?.cancellation_policy_text
    // Ignore text that is actually a JSON dump of the policy object
    if (typeof text === 'string') {
        const trimmed = text.trim()
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return trimmed
        }
    }
    return formatCancellationSummary(
        activityDetail?.cancellation_policy,
        activityDetail?.currency
    )
}

export default function page() {
    const { selectedActivity } = useActivityStore();
    const [activityDetail, setActivityDetail] = useState({});
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const finish = () => setHydrated(true);
        const unsub = useActivityStore.persist?.onFinishHydration?.(finish);
        if (useActivityStore.persist?.hasHydrated?.()) {
            finish();
        } else {
            // Fallback if persist API is unavailable
            const t = setTimeout(finish, 0);
            return () => {
                clearTimeout(t);
                unsub?.();
            };
        }
        return () => unsub?.();
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        setActivityDetail(selectedActivity || {});
    }, [selectedActivity, hydrated]);

    const hasActivityData = Boolean(activityDetail?.id || activityDetail?.title || activityDetail?.slug);

    if (!hydrated || !hasActivityData) {
        return <CheckoutSkeleton />;
    }

    const renderStars = (rating) => {
        return Array.from({ length: 5 }).map((_, index) => {
            const ratingNum = Number(rating);
            const fullStars = Math.floor(ratingNum);
            const hasHalfStar = ratingNum - fullStars >= 0.5;

            if (index < fullStars) {
                return <FaStar key={index} className="star-icon" />;
            } else if (index === fullStars && hasHalfStar) {
                return <FaStarHalfAlt key={index} className="star-icon" />;
            } else {
                return <FaRegStar key={index} className="star-icon" />;
            }
        });
    };

    const guestLabel = () => {
        const modalityPax = activityDetail?.modality?.selected_pax
        if (Array.isArray(modalityPax) && modalityPax.length > 0) {
            return modalityPax
                .filter((p) => Number(p.quantity) > 0)
                .map((p) => {
                    const label = PAX_LABELS[p.paxType] || p.paxType
                    const plural =
                        p.quantity > 1
                            ? (p.paxType === 'CHILD' ? 'ren' : 's')
                            : ''
                    return `${p.quantity} ${label}${plural}`
                })
                .join(', ') || '0 Guests'
        }
        const adults = activityDetail?.adults || 0;
        const children = activityDetail?.children || 0;
        const parts = [];
        if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
        if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
        return parts.join(', ') || '0 Guests';
    };

    const modality = activityDetail?.modality
    const currency = activityDetail?.currency
    const guestCount = getGuestCount(activityDetail)
    const includedItems = extractContentItems(activityDetail?.included_items)
    const excludedItems = extractContentItems(activityDetail?.excluded_items)
    const cancelPolicy = parseCancellationPolicy(activityDetail?.cancellation_policy)
        || (typeof activityDetail?.cancellation_policy === 'object' ? activityDetail.cancellation_policy : null)
        || parseCancellationPolicy(activityDetail?.cancellation_policy_text)
    const isNonRefundable = cancelPolicy?.cancel_policy === 'non-refundable'
    const cancellationSummary = getReadablePolicyText(activityDetail)
    const imageSrc = activityDetail?.featured_image || activityDetail?.banner_image
    const dateLabel = activityDetail?.travel_date
        ? moment(activityDetail.travel_date).format('YYYY-MM-DD')
        : 'Not selected'
    const timeLabel = modality?.session
        ? formatSessionLabel(modality.session)
        : null
    const dateTimeLabel = timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel
    const locationLabel = [activityDetail?.city, activityDetail?.country].filter(Boolean).join(', ') || '—'
    const metaLocation = activityDetail?.city || locationLabel
    const unitPrice = Number(activityDetail?.price_per_adult || 0)
    const priceQty = guestCount > 0 ? guestCount : 1

    return (
        <div className='activity-checkout-container'>
            <div className='container'>

                <div className='checkout-page-header mt-3'>
                    <Link
                        href={`/activities/${activityDetail?.slug || ''}`}
                        className='checkout-back-link'
                    >
                        <FiChevronLeft size={16} />
                        Back to activity details
                    </Link>
                    <div className='checkout-hero-banner'>
                        <div className='checkout-hero-copy'>
                            <span className='checkout-hero-eyebrow'>Booking type · Activity booking</span>
                            <h1>Complete your activity booking</h1>
                        </div>
                        <div className='checkout-ssl-badge'>
                            <LuShield size={14} />
                            Secured 256-bit SSL
                        </div>
                    </div>
                </div>

                <div className='row g-4'>
                    <div className='col-lg-8 col-12 order-2 order-lg-1'>
                        <div className='booking-details-card'>
                            <div className='booking-details-header'>
                                <h2>Your Booking Details</h2>
                                <p>Review your complete activity booking</p>
                            </div>

                            <div className='booking-summary-panel'>
                                <div className='booking-summary-top'>
                                    <div className='booking-summary-media'>
                                        {imageSrc ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={imageSrc} alt={activityDetail?.title || 'Activity'} />
                                        ) : (
                                            <div className='booking-summary-media-fallback' />
                                        )}
                                    </div>

                                    <div className='booking-summary-content'>
                                        <div className='booking-summary-topline'>
                                            <span className='booking-summary-eyebrow'>Booking summary</span>
                                            {activityDetail?.rating_stars ? (
                                                <span className='booking-summary-stars'>
                                                    {renderStars(activityDetail.rating_stars)}
                                                </span>
                                            ) : null}
                                        </div>

                                        <h3 className='booking-summary-title'>{activityDetail?.title}</h3>
                                        {modality?.name && (
                                            <div className='booking-modality-chip'>{modality.name}</div>
                                        )}
                                        <p className='booking-summary-location'>{locationLabel}</p>

                                        <div className='booking-meta-grid'>
                                            <div className='booking-meta-item'>
                                                <LuCalendarCheck2 className='booking-meta-icon' />
                                                <span>{dateTimeLabel}</span>
                                            </div>
                                            <div className='booking-meta-item'>
                                                <HiUserGroup className='booking-meta-icon' />
                                                <span>{guestLabel()}</span>
                                            </div>
                                            <div className='booking-meta-item'>
                                                <IoTimerOutline className='booking-meta-icon' />
                                                <span>{activityDetail?.duration || 'N/A'}</span>
                                            </div>
                                            <div className='booking-meta-item'>
                                                <FaLocationDot className='booking-meta-icon' />
                                                <span>{activityDetail?.meeting_and_pickup || metaLocation}</span>
                                            </div>
                                            {modality?.language && (
                                                <div className='booking-meta-item'>
                                                    <MdOutlineTranslate className='booking-meta-icon' />
                                                    <span>
                                                        {modality.language?.description || modality.language?.code || '—'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className='booking-price-bar'>
                                    <div>
                                        <div className='booking-price-label'>Price Details</div>
                                        <div className='booking-price-sub'>
                                            <PriceDisplay price={unitPrice || activityDetail?.grand_total} currency={currency} />
                                            {unitPrice > 0 ? ` x ${priceQty}` : ''}
                                        </div>
                                    </div>
                                    <div className='booking-price-total-wrap'>
                                        <div className='booking-price-total-label'>Total</div>
                                        <div className='booking-price-total'>
                                            <PriceDisplay price={activityDetail?.grand_total} currency={currency} />
                                        </div>
                                        <div className='booking-price-tax'>Vat and Taxes included</div>
                                    </div>
                                </div>
                            </div>

                            {(includedItems.length > 0 || excludedItems.length > 0) && (
                                <div className='booking-includes-section'>
                                    <div className='row g-3'>
                                        {includedItems.length > 0 && (
                                            <div className='col-md-6'>
                                                <h4 className='booking-section-title'>What&apos;s Included</h4>
                                                <div className='booking-include-list'>
                                                    {includedItems.map((item, index) => (
                                                        <div key={`inc-${index}`} className='booking-include-item'>
                                                            <IoCheckmarkCircle size={18} className='booking-include-icon' />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {excludedItems.length > 0 && (
                                            <div className='col-md-6'>
                                                <h4 className='booking-section-title'>What&apos;s Not Included</h4>
                                                <div className='booking-exclude-list'>
                                                    {excludedItems.map((item, index) => (
                                                        <div key={`exc-${index}`} className='booking-exclude-item'>
                                                            <IoCloseCircle size={18} className='booking-exclude-icon' />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* {cancelPolicy && (
                                <div className='booking-policy-section'>
                                    <h4 className='booking-section-title'>Cancellation Policy</h4>
                                    <div className={`booking-policy-box ${isNonRefundable ? 'is-nonrefundable' : 'is-refundable'}`}>
                                        {isNonRefundable ? (
                                            <>
                                                <IoCloseCircle size={22} className='booking-policy-icon' />
                                                <div>
                                                    <div className='booking-policy-title'>Non-Refundable</div>
                                                    <p>This booking cannot be cancelled or refunded under any circumstances.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <IoCheckmarkCircle size={22} className='booking-policy-icon' />
                                                <div>
                                                    <div className='booking-policy-title'>
                                                        {cancelPolicy?.cancel_policy === 'refundable' ? 'Refundable Booking' : 'Cancellation Terms'}
                                                    </div>
                                                    <p>{cancellationSummary}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )} */}
                        </div>

                        <DetailForm activityDetail={activityDetail} />
                    </div>

                    <div className='col-lg-4 col-12 order-1 order-lg-2'>
                        <div className='checkout-sidebar'>
                            <Summery activityDetail={activityDetail} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
