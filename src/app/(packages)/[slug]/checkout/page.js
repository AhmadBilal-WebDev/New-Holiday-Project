'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link';
import Image from 'next/image';
import GuestForm from '@/components/Package/Checkout/GuestForm'
import { usePackageStore } from '@/components/Store/PackageStore'
import moment from 'moment'
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { IoCheckmarkCircle, IoCloseCircle, IoInformation, IoTimeOutline, IoShieldCheckmark } from 'react-icons/io5';
import { FaArrowLeft, FaCalendarAlt, FaUsers, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import './checkout.css';

export const dynamic = 'force-dynamic';

export default function Page() {
    const { selectedPackage } = usePackageStore();
    const [packageDetail, setPackageDetail] = useState({});
    const [servicesTotal, setServicesTotal] = useState(0);
    const [selectedServices, setsetSelectedServices] = useState([]);
    const [roomList, setRoomList] = useState([]);
    const [expandedRooms, setExpandedRooms] = useState([]);
    useEffect(() => {
        setPackageDetail(selectedPackage);
        setRoomList(selectedPackage?.selected_rooms || []);
    }, [selectedPackage]);
    useEffect(() => {
        if (!roomList.length) return;
        const expanded = [];
        roomList.forEach((room) => {
            const numRooms = Number(room.rooms) || 1;
            let remAdults = Number(room.adults) || 0;
            let remChildren = Number(room.children) || 0;
            let remInfants = Number(room.infants) || 0;
            let remAdultsWB = Number(room.adults_without_bed) || 0;
            let remChildrenWB = Number(room.children_without_bed) || 0;
            let remInfantsWB = Number(room.infants_without_bed) || 0;
            for (let i = 0; i < numRooms; i++) {
                const remaining = numRooms - i;
                const adultsInRoom = i === numRooms - 1 ? remAdults : Math.ceil(remAdults / remaining);
                const childrenInRoom = i === numRooms - 1 ? remChildren : Math.ceil(remChildren / remaining);
                const infantsInRoom = i === numRooms - 1 ? remInfants : Math.ceil(remInfants / remaining);
                remAdults -= adultsInRoom;
                remChildren -= childrenInRoom;
                remInfants -= infantsInRoom;
                const adultsWB = Math.min(remAdultsWB, 1);
                remAdultsWB -= adultsWB;
                const maxChildWB = adultsWB > 0 ? 1 : 2;
                const childrenWB = Math.min(remChildrenWB, maxChildWB);
                remChildrenWB -= childrenWB;
                const infantsWB = Math.min(remInfantsWB, 1);
                remInfantsWB -= infantsWB;
                expanded.push({ ...room, roomIndex: i + 1, adultsInRoom, childrenInRoom, infantsInRoom, adultsWB, childrenWB, infantsWB });
            }
        });
        setExpandedRooms(expanded);
    }, [roomList]);
    const handleServiceToggle = (service) => {
        const isSelected = selectedServices.find((r) => r.id === service.id);
        if (isSelected) {
            // Remove if already selected
            const updatedServices = selectedServices.filter((r) => r.id !== service.id);
            const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
            setServicesTotal(Total);
            setsetSelectedServices(updatedServices);
        } else {
            // Add if not selected
            const updatedServices = [...selectedServices, { "id": service.id, "name": service.name, "price_per_person": service.price, "quantity": 1, "total": service.price }];
            const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
            setServicesTotal(Total);
            setsetSelectedServices(updatedServices);
        }

    };
    const withoutBedTotal = expandedRooms.filter(r => r.adultsInRoom > 0 || r.childrenInRoom > 0 || r.infantsInRoom > 0).reduce((acc, room) => (
        acc + room.adultsWB * Number(room.adult_without_bed_price || 0)
        + room.childrenWB * Number(room.child_without_bed_price || 0)
        + room.infantsWB * Number(room.infant_without_bed_price || 0)
    ), 0);
    const maxPax = Number(packageDetail?.max_pax) || 0;

    const handleQuantityChange = (id, type) => {
        const updatedServices = selectedServices.map((service) => {
            if (service.id === id) {
                if (type === 'plus') {
                    if (maxPax > 0 && service.quantity >= maxPax) return service;
                    const newQty = service.quantity + 1;
                    return { ...service, quantity: newQty, total: newQty * Number(service.price_per_person) };
                } else if (type === 'minus' && service.quantity > 1) {
                    const newQty = service.quantity - 1;
                    return { ...service, quantity: newQty, total: newQty * Number(service.price_per_person) };
                }
            }
            return service;
        });
        const Total = updatedServices.reduce((acc, curr) => acc + Number(curr.total), 0)
        setServicesTotal(Total);
        setsetSelectedServices(updatedServices);
    };

    const totalGuests = roomList.reduce((acc, room) => (
        acc + Number(room.adults || 0) + Number(room.children || 0) + Number(room.infants || 0)
    ), 0);

    const guestLabel = () => {
        const adults = roomList.reduce((acc, room) => acc + Number(room.adults || 0), 0);
        const children = roomList.reduce((acc, room) => acc + Number(room.children || 0), 0);
        const infants = roomList.reduce((acc, room) => acc + Number(room.infants || 0), 0);
        const parts = [];
        if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
        if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
        if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
        return parts.join(', ') || `${totalGuests} Guests`;
    };

    const renderCancellationPolicy = () => {
        const cancellationPolicy = packageDetail?.cancellation_policy;
        if (!cancellationPolicy) return null;

        const { cancel_policy, cancellation_policies } = cancellationPolicy;

        if (cancel_policy === 'non-refundable') {
            return (
                <div className="policy-alert danger">
                    <IoCloseCircle size={22} className="mt-1 flex-shrink-0" />
                    <div>
                        <h6>Non-Refundable</h6>
                        <p>This booking cannot be cancelled or refunded under any circumstances.</p>
                    </div>
                </div>
            );
        }

        if (cancel_policy === 'refundable' && cancellation_policies && cancellation_policies.length > 0) {
            const sortedPolicies = [...cancellation_policies].sort((a, b) => b.time_duration - a.time_duration);

            return (
                <div>
                    <div className="policy-alert success">
                        <IoCheckmarkCircle size={22} className="mt-1 flex-shrink-0" />
                        <div>
                            <h6>Refundable Booking</h6>
                            <p>You can cancel this booking according to the policy below.</p>
                        </div>
                    </div>

                                    <div className="summary-section-label mt-3">Cancellation Timeline</div>

                    {sortedPolicies.map((policy, index) => {
                        const timeText = policy.time_duration >= 24
                            ? `${policy.time_duration / 24} day${policy.time_duration / 24 > 1 ? 's' : ''}`
                            : `${policy.time_duration} hour${policy.time_duration > 1 ? 's' : ''}`;

                        const isPercentage = policy.type === 'percentage';
                        const badgeLabel = isPercentage ? `${policy.value}% Charge` : 'Cancellation Fee';
                        const description = isPercentage
                            ? `${policy.value}% cancellation charge applies.`
                            : 'A fixed cancellation fee will be charged.';

                        return (
                            <div key={index} className={`policy-timeline-item ${index === 0 ? 'primary' : 'secondary'}`}>
                                <div className="d-flex align-items-start gap-2">
                                    <IoTimeOutline
                                        size={18}
                                        className="mt-1 flex-shrink-0"
                                        style={{ color: index === 0 ? '#e7247a' : '#6b7280' }}
                                    />
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                                            <h6 className="mb-0 small fw-bold" style={{ color: index === 0 ? '#e7247a' : '#374151' }}>
                                                {timeText} before departure
                                            </h6>
                                            <span
                                                className="badge"
                                                style={{
                                                    backgroundColor: isPercentage ? '#fff0f6' : '#fee2e2',
                                                    color: isPercentage ? '#e7247a' : '#dc2626',
                                                    fontSize: '0.72rem',
                                                }}
                                            >
                                                {badgeLabel}
                                            </span>
                                        </div>
                                        <p className="mb-1 small text-muted">{description}</p>
                                        {!isPercentage && (
                                            <div className="mt-1">
                                                <strong className="text-danger small">
                                                    Cancellation Fee: <PriceDisplay price={policy.value} currency={packageDetail?.currency_code} />
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="policy-alert policy-alert-info">
                        <IoInformation size={18} className="mt-1 flex-shrink-0" />
                        <p className="small mb-0">
                            <strong>Important:</strong> Cancellation must be made before the stated time.
                            After this period, the booking is non-refundable.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="policy-alert success">
                <IoCheckmarkCircle size={22} className="mt-1 flex-shrink-0" />
                <div>
                    <h6>Free Cancellation</h6>
                    <p>This booking can be cancelled free of charge.</p>
                </div>
            </div>
        );
    };
    return (
        <div className='activity-checkout-container'>
            <div className='container'>
                <div className='checkout-page-header'>
                    {packageDetail?.category?.slug && packageDetail?.slug ? (
                        <Link
                            href={`/${packageDetail.category.slug}/${packageDetail.slug}`}
                            className='checkout-back-link'
                        >
                            <FaArrowLeft size={12} aria-hidden="true" />
                            Back to package details
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className='checkout-back-link'
                            onClick={() => typeof window !== 'undefined' && window.history.back()}
                        >
                            <FaArrowLeft size={12} aria-hidden="true" />
                            Back to package details
                        </button>
                    )}

                    <div className='checkout-hero-banner'>
                        <div className='checkout-hero-text'>
                            <span className='checkout-hero-eyebrow'>
                                Booking Type · Package Booking
                            </span>
                            <h1 className='checkout-hero-title'>
                                Complete your package booking
                            </h1>
                        </div>
                        <div className='checkout-ssl-badge'>
                            <IoShieldCheckmark size={16} aria-hidden="true" />
                            <span>Secured 256-bit SSL</span>
                        </div>
                    </div>
                </div>

                <div className='row g-4'>
                    <div className='col-lg-8 col-12 order-2 order-lg-1'>
                        {(() => {
                            const nights = packageDetail?.start_date && packageDetail?.end_date
                                ? Math.max(0, moment(packageDetail.end_date).diff(moment(packageDetail.start_date), 'days'))
                                : 0;
                            const days = nights > 0 ? nights + 1 : 0;
                            const destination =
                                packageDetail?.city ||
                                packageDetail?.destination ||
                                packageDetail?.location ||
                                (packageDetail?.category?.name || '').replace(/\s*packages?\s*/i, '').trim() ||
                                '—';
                            const coverImage =
                                packageDetail?.featured_image ||
                                packageDetail?.gallery_images?.[0] ||
                                packageDetail?.banner_image ||
                                null;
                            const travelersCount = totalGuests > 0 ? totalGuests : 1;
                            const travelersText =
                                totalGuests > 0
                                    ? `${travelersCount} ${travelersCount === 1 ? 'Person' : 'People'}`
                                    : '1 Person';
                            const travelDates =
                                packageDetail?.start_date && packageDetail?.end_date
                                    ? `${moment(packageDetail.start_date).format('YYYY-MM-DD')} – ${moment(packageDetail.end_date).format('YYYY-MM-DD')}`
                                    : '—';

                            return (
                                <article className="booking-summary-card">
                                    <div className="booking-summary-media">
                                        {coverImage ? (
                                            <Image
                                                fill
                                                sizes="(max-width: 767px) 100vw, 280px"
                                                src={coverImage}
                                                alt={packageDetail?.title || 'Package'}
                                                className="booking-summary-img"
                                            />
                                        ) : (
                                            <div className="booking-summary-placeholder" aria-hidden="true" />
                                        )}
                                    </div>

                                    <div className="booking-summary-body">
                                        <span className="booking-summary-eyebrow">Booking Summary</span>
                                        <h2 className="booking-summary-title">{packageDetail?.title || 'Package'}</h2>
                                        <p className="booking-summary-location">{destination}</p>

                                        <div className="booking-summary-grid">
                                            <div className="booking-summary-item">
                                                <FaCalendarAlt size={15} className="booking-summary-icon" aria-hidden="true" />
                                                <div>
                                                    <div className="booking-summary-label">Travel Dates</div>
                                                    <div className="booking-summary-value">{travelDates}</div>
                                                </div>
                                            </div>
                                            <div className="booking-summary-item">
                                                <FaUsers size={15} className="booking-summary-icon" aria-hidden="true" />
                                                <div>
                                                    <div className="booking-summary-label">Travelers</div>
                                                    <div className="booking-summary-value">{travelersText}</div>
                                                </div>
                                            </div>
                                            <div className="booking-summary-item">
                                                <FaClock size={15} className="booking-summary-icon" aria-hidden="true" />
                                                <div>
                                                    <div className="booking-summary-label">Duration</div>
                                                    <div className="booking-summary-value">
                                                        {days > 0
                                                            ? `${days} Day${days !== 1 ? 's' : ''} / ${nights} Night${nights !== 1 ? 's' : ''}`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="booking-summary-item">
                                                <FaMapMarkerAlt size={15} className="booking-summary-icon" aria-hidden="true" />
                                                <div>
                                                    <div className="booking-summary-label">Destination</div>
                                                    <div className="booking-summary-value">{destination}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })()}

                        <GuestForm packageDetail={packageDetail} servicesTotal={servicesTotal} selectedServices={selectedServices} expandedRooms={expandedRooms} withoutBedTotal={withoutBedTotal} />
                    </div>

                    <div className='col-lg-4 col-12 order-1 order-lg-2'>
                        <div className='checkout-sidebar'>
                            {(packageDetail?.additional_services && packageDetail?.additional_services.length > 0) && (
                                <div className='trust-card mb-3'>
                                    <div className='trust-card-header'>
                                        <h5>Additional Services</h5>
                                    </div>
                                    <div className='trust-card-body'>
                                        <p className='small text-muted mb-3'>Enhance your journey with optional add-ons.</p>
                                        {packageDetail?.additional_services.map((service, index) => {
                                            const switchId = `package-service-${service.id || index}`;
                                            return (
                                                <div key={index} className='guest-card mt-0 mb-3'>
                                                    <div className='d-flex justify-content-between align-items-center gap-3'>
                                                        <div className="form-check form-switch mb-0">
                                                            <input onChange={() => handleServiceToggle(service)} checked={selectedServices.some(s => s.id === service.id)} className="form-check-input" type="checkbox" role="switch" id={switchId} />
                                                            <label className="form-check-label fw-semibold" htmlFor={switchId}>{service?.name}</label>
                                                        </div>
                                                        <div className='text-end'>
                                                            <div className='line-value'><PriceDisplay price={service.price} currency={packageDetail?.currency_code} /></div>
                                                            <div className='small text-muted'>per unit</div>
                                                        </div>
                                                    </div>
                                                    {selectedServices.some(s => s.id === service.id) && (
                                                        <div className="quantity-box d-flex align-items-center justify-content-between mt-3">
                                                            <button onClick={() => handleQuantityChange(service.id, 'minus')} className="btn-qty minus">−</button>
                                                            <span className="qty-value">{selectedServices.find(s => s.id === service.id)?.quantity}</span>
                                                            <button
                                                                onClick={() => handleQuantityChange(service.id, 'plus')}
                                                                className="btn-qty plus"
                                                                disabled={maxPax > 0 && (selectedServices.find(s => s.id === service.id)?.quantity || 0) >= maxPax}
                                                                title={maxPax > 0 ? `Maximum ${maxPax} allowed` : undefined}
                                                            >+</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className='summary-card'>
                                <div className='summary-card-header'>
                                    <h5>Price Summary</h5>
                                    <p>Review rooms, guests, and final pricing</p>
                                </div>
                                <div className='summary-card-body'>
                                    <div className="summary-section-label">Room Breakdown</div>
                                    {expandedRooms.filter(room => room.adultsInRoom > 0 || room.childrenInRoom > 0 || room.infantsInRoom > 0).map((room, index) => {
                                        const roomLabel = String(room.type || 'Room')
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, (c) => c.toUpperCase());
                                        return (
                                            <div key={index} className='summary-room-block'>
                                                <div className='summary-room-title'>
                                                    <span className='summary-room-badge'>Room {room.roomIndex}</span>
                                                    <span className='summary-room-type'>{roomLabel}</span>
                                                </div>
                                                {room.adultsInRoom > 0 && (
                                                    <div className='summary-line'>
                                                        <span className='line-label'>Adult × {room.adultsInRoom}</span>
                                                        <span className='line-value'><PriceDisplay price={Number(room.sale_per_person) * room.adultsInRoom} currency={packageDetail?.currency_code} /></span>
                                                    </div>
                                                )}
                                                {room.childrenInRoom > 0 && (
                                                    <div className='summary-line'>
                                                        <span className='line-label'>Child × {room.childrenInRoom}</span>
                                                        <span className='line-value'><PriceDisplay price={Number(room.child_sale_per_person) * room.childrenInRoom} currency={packageDetail?.currency_code} /></span>
                                                    </div>
                                                )}
                                                {room.infantsInRoom > 0 && (
                                                    <div className='summary-line'>
                                                        <span className='line-label'>Infant × {room.infantsInRoom}</span>
                                                        <span className='line-value'><PriceDisplay price={Number(room.infant_sale_per_person) * room.infantsInRoom} currency={packageDetail?.currency_code} /></span>
                                                    </div>
                                                )}
                                                {(room.adultsWB > 0 || room.childrenWB > 0 || room.infantsWB > 0) && (
                                                    <div className='summary-wb-block'>
                                                        <div className='summary-section-label'>Without Bed</div>
                                                        {room.adultsWB > 0 && (
                                                            <div className='summary-line'>
                                                                <span className='line-label'>Adult × {room.adultsWB}</span>
                                                                <span className='line-value'><PriceDisplay price={Number(room.adult_without_bed_price) * room.adultsWB} currency={packageDetail?.currency_code} /></span>
                                                            </div>
                                                        )}
                                                        {room.childrenWB > 0 && (
                                                            <div className='summary-line'>
                                                                <span className='line-label'>Child × {room.childrenWB}</span>
                                                                <span className='line-value'><PriceDisplay price={Number(room.child_without_bed_price) * room.childrenWB} currency={packageDetail?.currency_code} /></span>
                                                            </div>
                                                        )}
                                                        {room.infantsWB > 0 && (
                                                            <div className='summary-line'>
                                                                <span className='line-label'>Infant × {room.infantsWB}</span>
                                                                <span className='line-value'><PriceDisplay price={Number(room.infant_without_bed_price) * room.infantsWB} currency={packageDetail?.currency_code} /></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {selectedServices.length > 0 && (
                                        <div className='summary-services-block'>
                                            <div className="summary-section-label">Selected Services</div>
                                            {selectedServices.map((service, index) => (
                                                <div key={index} className='summary-line'>
                                                    <span className='line-label'>{service?.name} × {service?.quantity}</span>
                                                    <span className='line-value'><PriceDisplay price={Number(service?.total)} currency={packageDetail?.currency_code} /></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className='summary-footer'>
                                        {withoutBedTotal > 0 && (
                                            <div className='summary-line'>
                                                <span className='line-label'>Without Bed Total</span>
                                                <span className='line-value'><PriceDisplay price={withoutBedTotal} currency={packageDetail?.currency_code} /></span>
                                            </div>
                                        )}
                                        <div className='summary-line'>
                                            <span className='line-label'>Subtotal</span>
                                            <span className='line-value'><PriceDisplay price={Number(packageDetail?.total_amount || 0) + servicesTotal} currency={packageDetail?.currency_code} /></span>
                                        </div>
                                        <div className='summary-total-row'>
                                            <span className='total-label'>Grand Total</span>
                                            <div className='total-amount-wrap'>
                                                <span className='total-value'>
                                                    <PriceDisplay
                                                        price={Number(packageDetail?.total_amount || 0) + servicesTotal}
                                                        currency={packageDetail?.currency_code}
                                                    />
                                                </span>
                                                <span className='summary-tax-note'>Inclusive of VAT and taxes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {packageDetail?.cancellation_policy && (
                                <div className='cancellation-card'>
                                    <div className='cancellation-card-header'>
                                        <h5>Cancellation Policy</h5>
                                        <p>Know your refund options before you pay</p>
                                    </div>
                                    <div className='cancellation-card-body'>
                                        {renderCancellationPolicy()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
