'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { FaLocationDot } from 'react-icons/fa6'
import { FaStar, FaCheck, FaCalendarAlt, FaEye, FaMoon, FaUtensils, FaUser, FaChild } from 'react-icons/fa'
import GalleryImages from '@/components/Hotels/HotelDetail/GalleryImages'
import Image from 'next/image'
import { useUmrahPackage, collectHotelSelectedRooms, isPackageSelectedItem, getSelectedRoomUnitIndices } from '@/contexts/UmrahPackageContext'
import PriceDisplay from '../../Currency/PriceDisplay'
import { GiCheckMark } from 'react-icons/gi'
import { CiTrash } from 'react-icons/ci'
import moment from 'moment'
import style from './Detail.module.css'
import { ConvertPrice } from '../../Currency/ConvertPrice'
import { getRateSeqNo } from '@/components/Hotels/utils/roomSequence'
import { notifications } from '@mantine/notifications'

const isHotelstonProvider = (hotel) =>
    String(hotel?.provider || '').toLowerCase() === 'hotelston';

export default function HotelsDetail({ detail, type, onNext }) {
    const { selections, updateMakkahHotelSelection, updateMadinahHotelSelection, packageData } = useUmrahPackage();
    const [basePrice, setBasePrice] = useState(0);
    const isHotelston = isHotelstonProvider(detail);
    // Get current selection from context based on hotel type
    const currentSelection = type === 'makkah' ? selections.makkahHotel : selections.madinahHotel;
    const [selectedRooms, setSelectedRooms] = useState(() =>
        collectHotelSelectedRooms(detail, currentSelection)
    );
    const selectedRoom = selectedRooms[0]?.roomIndex ?? currentSelection.roomIndex;
    const selectedRate = selectedRooms[0]?.rateIndex ?? currentSelection.rateIndex;
    const [descExpanded, setDescExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const [expandedAmenities, setExpandedAmenities] = useState({});
    const [facilitiesExpanded, setFacilitiesExpanded] = useState(false);
    const [expandedRoomRates, setExpandedRoomRates] = useState({});
    const descriptionContentRef = React.useRef(null);
    const FACILITIES_DEFAULT_COUNT = 6;
    const RATES_DEFAULT_COUNT = 3;

    const totalNights = useMemo(() => {
        const fromDetail = Number(detail?.nights);
        if (Number.isFinite(fromDetail) && fromDetail > 0) return fromDetail;
        if (detail?.check_in && detail?.check_out) {
            const nights = moment(detail.check_out).diff(moment(detail.check_in), 'days');
            return nights > 0 ? nights : 1;
        }
        return 1;
    }, [detail?.nights, detail?.check_in, detail?.check_out]);

    const getRoomDisplayPrice = (rate) => Number(
        rate?.original_price != null && rate.original_price !== ''
            ? rate.original_price
            : rate?.price || 0
    );

    const getRoomDisplayCurrency = (rate) =>
        rate?.original_currency || rate?.currency;

    const description = detail?.description || '';
    const isHtmlDescription = useMemo(() => {
        if (!description || typeof description !== 'string') return false;
        return /<\/?[a-z][\s\S]*>/i.test(description);
    }, [description]);
    const plainDescription = useMemo(() => {
        if (!description) return '';
        if (isHtmlDescription) {
            return description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        return description;
    }, [description, isHtmlDescription]);
    const normalizedHtmlDescription = useMemo(() => {
        if (!isHtmlDescription) return '';
        return description
            .replace(/<\s*h[1-6](\s[^>]*)?>/gi, '<h5$1>')
            .replace(/<\s*\/\s*h[1-6]\s*>/gi, '</h5>');
    }, [description, isHtmlDescription]);

    useEffect(() => {
        setDescExpanded(false);
        setExpandedAmenities({});
        setFacilitiesExpanded(false);
        setExpandedRoomRates({});
        setSelectedRooms(collectHotelSelectedRooms(detail, currentSelection));
        // Only re-sync when hotel or step changes — not on every selection update (breaks Remove).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.id, type]);
    useEffect(() => {
        if (descExpanded) return;
        if (!plainDescription) {
            setShowReadMore(false);
            return;
        }

        const frame = requestAnimationFrame(() => {
            const contentElement = descriptionContentRef.current;
            if (!contentElement) {
                setShowReadMore(false);
                return;
            }
            setShowReadMore(contentElement.scrollHeight > contentElement.clientHeight + 1);
        });

        return () => cancelAnimationFrame(frame);
    }, [plainDescription, normalizedHtmlDescription, descExpanded]);

    const toggleRoomAmenities = (roomIndex) => {
        setExpandedAmenities(prev => ({ ...prev, [roomIndex]: !prev[roomIndex] }));
    };

    const toggleRoomRates = (roomIndex) => {
        setExpandedRoomRates(prev => ({ ...prev, [roomIndex]: !prev[roomIndex] }));
    };

    const findSelected = (roomIndex, rateIndex) =>
        selectedRooms.find((item) => item.roomIndex === roomIndex && item.rateIndex === rateIndex);

    const isSeqSlotTaken = (seqNo, roomIndex, rateIndex) => {
        if (!isHotelston || seqNo === null || seqNo === undefined) return false;
        return selectedRooms.some((selected) => {
            if (selected.roomIndex === roomIndex && selected.rateIndex === rateIndex) return false;
            return Number(selected?.seqNo ?? selected?.searchRoomIndex) === Number(seqNo);
        });
    };

    const showSeqLimitMessage = () => {
        notifications.show({
            autoClose: 4000,
            title: 'Room Already Chosen',
            message: 'You’ve already reserved a room for these guests. Remove it first if you want to pick a different one.',
            color: 'red',
        });
    };

    const getVisibleRateIndices = (roomIndex, rates) => {
        const hasMoreRates = rates.length > RATES_DEFAULT_COUNT;
        if (!hasMoreRates || expandedRoomRates[roomIndex]) {
            return rates.map((_, index) => index);
        }

        const indices = Array.from({ length: RATES_DEFAULT_COUNT }, (_, index) => index);
        selectedRooms.forEach((selected) => {
            if (selected.roomIndex === roomIndex && selected.rateIndex >= RATES_DEFAULT_COUNT && !indices.includes(selected.rateIndex)) {
                indices.push(selected.rateIndex);
            }
        });
        return indices;
    };

    // Initialize base price from the selected room
    useEffect(() => {
        if (detail?.rooms && selectedRoom !== null && selectedRate !== null) {
            const room = detail.rooms[selectedRoom];
            const rate = room?.rates?.[selectedRate];
            if (rate) {
                setBasePrice(rate.price);
            }
        } else if (detail?.rooms) {
            // Fallback: find the room with selected_for_package
            for (let roomIndex = 0; roomIndex < detail.rooms.length; roomIndex++) {
                const room = detail.rooms[roomIndex];
                for (let rateIndex = 0; rateIndex < room.rates.length; rateIndex++) {
                    const rate = room.rates[rateIndex];
                    if (isPackageSelectedItem(rate) && isPackageSelectedItem(room)) {
                        setBasePrice(rate.price);
                        return;
                    }
                }
            }
        }
    }, [detail, selectedRoom, selectedRate]);

    const persistSelection = (nextRooms) => {
        setSelectedRooms(nextRooms);
        if (type === 'makkah') {
            updateMakkahHotelSelection(nextRooms);
        } else {
            updateMadinahHotelSelection(nextRooms);
        }
    };

    const handleRateChange = (roomIndex, rateIndex, rate, room = null) => {
        if (findSelected(roomIndex, rateIndex)) return;

        const targetRoom = room || detail?.rooms?.[roomIndex];
        const seqNo = isHotelston ? getRateSeqNo(rate, targetRoom) : null;
        if (isHotelston && seqNo !== null && isSeqSlotTaken(seqNo, roomIndex, rateIndex)) {
            showSeqLimitMessage();
            return;
        }

        const nextRooms = [
            ...selectedRooms,
            {
                roomIndex,
                rateIndex,
                qty: 1,
                ...(seqNo !== null ? { seqNo, searchRoomIndex: seqNo } : {}),
            },
        ];
        persistSelection(nextRooms);
        setBasePrice(rate.price);
    };

    const handleRemoveSelected = (roomIndex, rateIndex) => {
        persistSelection(
            selectedRooms.filter((item) => !(item.roomIndex === roomIndex && item.rateIndex === rateIndex))
        );
    };

    const handleQuantityChange = (roomIndex, rateIndex, quantity, allotment) => {
        const qty = Math.min(Math.max(1, Number(quantity) || 1), allotment);
        persistSelection(
            selectedRooms.map((item) =>
                item.roomIndex === roomIndex && item.rateIndex === rateIndex
                    ? { ...item, qty }
                    : item
            )
        );
    };

    const getRateUnitPrice = (rate) => Number(rate?.price || 0);

    const packageBaselineByRoom = useMemo(() => {
        const totals = {};
        const units = detail?.selected_room_units;
        if (Array.isArray(units) && units.length) {
            units.forEach((unit) => {
                const { roomIndex, rateIndex, qty } = getSelectedRoomUnitIndices(unit);
                const rate = detail?.rooms?.[roomIndex]?.rates?.[rateIndex];
                if (!rate) return;
                totals[roomIndex] = (totals[roomIndex] || 0) + getRateUnitPrice(rate) * qty;
            });
            return totals;
        }

        (detail?.rooms || []).forEach((room, roomIndex) => {
            (room.rates || []).forEach((rate) => {
                if (isPackageSelectedItem(rate) && isPackageSelectedItem(room)) {
                    const qty = Math.max(1, Number((rate.quantity ?? rate.qty) || 1));
                    totals[roomIndex] = (totals[roomIndex] || 0) + getRateUnitPrice(rate) * qty;
                }
            });
        });
        return totals;
    }, [detail]);

    const packageBaselinePrice = useMemo(
        () => Object.values(packageBaselineByRoom).reduce((sum, value) => sum + Number(value || 0), 0),
        [packageBaselineByRoom]
    );

    const selectedRatePrice = useMemo(() => {
        if (selectedRooms.length) {
            const first = selectedRooms[0];
            const rate = detail?.rooms?.[first.roomIndex]?.rates?.[first.rateIndex];
            if (rate) return getRateUnitPrice(rate);
        }
        return packageBaselinePrice;
    }, [detail?.rooms, selectedRooms, packageBaselinePrice]);

    const formatPriceDifference = (price, referencePrice) => {
        const difference = price - referencePrice;
        if (difference > 0) {
            return { value: difference, display: `+${difference.toFixed(2)}` };
        } else if (difference < 0) {
            return { value: difference, display: `${difference.toFixed(2)}` };
        } else {
            return { value: 0, display: '0' };
        }
    };

    const getMealPlanPriceDifference = (price) =>
        formatPriceDifference(price, selectedRatePrice);

    return (
        <div>
            <GalleryImages imageList={detail?.all_images || []} type='umrah-getaway' />
            <div className={style.hotelInfoCard}>
                <div className={style.hotelInfoHeader}>
                    <span className={style.cityBadge}>{type === 'makkah' ? 'Makkah Hotel' : 'Madinah Hotel'}</span>
                    <h2 className={style.hotelName}>{detail?.name}</h2>
                    {detail?.location?.address && (
                        <p className={style.hotelAddress}>
                            <FaLocationDot size={14} />
                            <span>{detail.location.address}</span>
                        </p>
                    )}
                </div>

                <div className={style.hotelStatsBar}>
                    {detail?.nights && (
                        <div className={style.hotelStatChip}>
                            <FaMoon size={14} color="#E7247A" />
                            <div>
                                <span className={style.hotelStatLabel}>Stay</span>
                                <span className={style.hotelStatValue}>{detail.nights} {detail.nights === 1 ? 'Night' : 'Nights'}</span>
                            </div>
                        </div>
                    )}
                    {detail?.check_in && (
                        <div className={style.hotelStatChip}>
                            <FaCalendarAlt size={14} color="#E7247A" />
                            <div>
                                <span className={style.hotelStatLabel}>Check-in</span>
                                <span className={style.hotelStatValue}>{moment(detail.check_in).format('DD MMM YYYY')}</span>
                            </div>
                        </div>
                    )}
                    {detail?.check_out && (
                        <div className={style.hotelStatChip}>
                            <FaCalendarAlt size={14} color="#E7247A" />
                            <div>
                                <span className={style.hotelStatLabel}>Check-out</span>
                                <span className={style.hotelStatValue}>{moment(detail.check_out).format('DD MMM YYYY')}</span>
                            </div>
                        </div>
                    )}
                    {detail?.star_rating && !isNaN(parseFloat(detail.star_rating)) && (
                        <div className={style.hotelStatChip}>
                            <FaStar size={14} color="#E7247A" />
                            <div>
                                <span className={style.hotelStatLabel}>Rating</span>
                                <span className={style.hotelStatValue}>{parseFloat(detail.star_rating)}-Star</span>
                            </div>
                        </div>
                    )}
                    {detail?.haram_view && (
                        <div className={`${style.hotelStatChip} ${style.hotelStatChipGreen}`}>
                            <FaEye size={14} color="#15803d" />
                            <span className={style.hotelStatValueGreen}>Haram View</span>
                        </div>
                    )}
                    {detail?.kaaba_view && (
                        <div className={`${style.hotelStatChip} ${style.hotelStatChipGreen}`}>
                            <FaEye size={14} color="#15803d" />
                            <span className={style.hotelStatValueGreen}>Kaaba View</span>
                        </div>
                    )}
                </div>

                {plainDescription && (
                    <div className={style.descriptionSection}>
                        <h3 className={style.descriptionTitle}>About this hotel</h3>
                        {isHtmlDescription ? (
                            <div
                                ref={descriptionContentRef}
                                className={`${style.descriptionHtml} ${descExpanded ? '' : style.descriptionCollapsed}`}
                                dangerouslySetInnerHTML={{ __html: normalizedHtmlDescription }}
                            />
                        ) : descExpanded ? (
                            <p ref={descriptionContentRef} className={style.descriptionText}>{description}</p>
                        ) : (
                            <p ref={descriptionContentRef} className={`${style.descriptionText} ${style.descriptionCollapsed}`}>
                                {plainDescription}
                            </p>
                        )}
                        {showReadMore && (
                            <button
                                type="button"
                                className={style.readMoreBtn}
                                onClick={() => setDescExpanded(prev => !prev)}
                            >
                                {descExpanded ? 'Read less' : 'Read more'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className={style.roomsSection}>
                <h5 className={style.roomsSectionTitle}>Rooms Available</h5>
                {(detail?.rooms || []).map((room, roomIndex) => (
                    <div key={roomIndex} className={style.roomCard}>
                        <div className='row g-0'>
                            {/* ── Image + Amenities ── */}
                            <div className={`col-md-3 ${style.roomImageCol}`}>
                                <p className={style.roomName}>{room.name}</p>
                                <Image
                                    className={style.roomImg}
                                    src={room?.images && room.images !== null && room.images.length > 0 ? room.images[0]?.url : '/images/noimage.png'}
                                    height={130} width={300}
                                    alt={`Room${roomIndex + 1} image`}
                                />
                                {room?.amenities?.length > 0 && (
                                    <div className={style.amenitiesWrap}>
                                        <button
                                            type="button"
                                            className={style.seeAmenitiesBtn}
                                            onClick={() => toggleRoomAmenities(roomIndex)}
                                        >
                                            {expandedAmenities[roomIndex] ? 'Hide amenities' : `See amenities (${room.amenities.length})`}
                                        </button>
                                        {expandedAmenities[roomIndex] && (
                                            <div className={style.amenitiesList}>
                                                {room.amenities.slice(0, 10).map((facility, idx) => (
                                                    <span key={idx} className={style.amenityTag}>
                                                        <FaCheck size={9} /> {facility?.description?.content}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Meal Plan + Cancellation ── */}
                            <div className={`col-md-6 ${style.mealPlanCol}`}>
                                <div className={style.mealPlanHeader}>
                                    <FaUtensils size={13} />
                                    <span>Meal Plan</span>
                                </div>
                                <div className={style.mealPlanList}>
                                    {(() => {
                                        const rates = room?.rates || [];
                                        const hasMoreRates = rates.length > RATES_DEFAULT_COUNT;
                                        const isRatesExpanded = expandedRoomRates[roomIndex];
                                        const visibleRateIndices = getVisibleRateIndices(roomIndex, rates);

                                        return (
                                            <>
                                                {visibleRateIndices.map((rateIndex) => {
                                                    const rate = rates[rateIndex];
                                                    const selected = findSelected(roomIndex, rateIndex);
                                                    const isSelected = Boolean(selected);
                                                    const priceDiff = getMealPlanPriceDifference(rate.price);
                                                    const allotment = Math.max(1, Number(rate?.allotment) || 1);
                                                    const qty = Math.min(Number(selected?.qty || 1), allotment);
                                                    const priceClass =
                                                        priceDiff.value > 0
                                                            ? ''
                                                            : priceDiff.value < 0
                                                                ? ''
                                                                : style.mealPriceIncluded;

                                                    return (
                                                        <div
                                                            key={rateIndex}
                                                            className={`${style.mealOption} ${isSelected ? style.mealOptionSelected : ''}`}
                                                            onClick={() => {
                                                                if (!isSelected) handleRateChange(roomIndex, rateIndex, rate, room);
                                                            }}
                                                            role={!isSelected ? 'button' : undefined}
                                                            aria-pressed={isSelected}
                                                        >
                                                            <div className={style.mealOptionMain}>
                                                                <span className={style.mealOptionRadio} aria-hidden="true">
                                                                    {isSelected && <span className={style.mealOptionRadioDot} />}
                                                                </span>
                                                                <div className={style.mealOptionInfo}>
                                                                    <span className={style.mealOptionName}>{rate?.board_name}</span>
                                                                    <div className={style.mealOptionGuests}>
                                                                        <span className={style.guestChip}>
                                                                            <FaUser size={9} />
                                                                            {rate?.adults} Adult{rate?.adults !== 1 ? 's' : ''}
                                                                        </span>
                                                                        <span className={style.guestChip}>
                                                                            <FaChild size={9} />
                                                                            {rate?.children} Child{rate?.children !== 1 ? 'ren' : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={style.mealOptionActions}>
                                                                <span className={`${style.mealOptionPrice} ${priceClass}`}>
                                                                    {(() => {
                                                                        const displayPrice = getRoomDisplayPrice(rate);
                                                                        const displayCurrency = getRoomDisplayCurrency(rate);
                                                                        const perNightPrice = displayPrice / totalNights;
                                                                        return (
                                                                            <>
                                                                                {isSelected && <>Included<br /></>}
                                                                                Room Price : <PriceDisplay currency={displayCurrency} price={displayPrice} />
                                                                                <br />
                                                                                <span className={style.mealOptionPerNight}>
                                                                                    Per Night : <PriceDisplay currency={displayCurrency} price={perNightPrice} />
                                                                                </span>
                                                                                <br />
                                                                                <span className={style.mealOptionVatNote}>Vat and Taxes included</span>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </span>
                                                                {isSelected && (
                                                                    <div className={style.mealOptionControls}>
                                                                        <select
                                                                            className={`form-select form-select-sm ${style.qtySelect}`}
                                                                            value={qty}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                handleQuantityChange(roomIndex, rateIndex, e.target.value, allotment);
                                                                            }}
                                                                        >
                                                                            {Array.from({ length: allotment }, (_, i) => i + 1).map((value) => (
                                                                                <option key={value} value={value}>{value}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRemoveSelected(roomIndex, rateIndex);
                                                                            }}
                                                                        >
                                                                            <CiTrash size={16} />
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {hasMoreRates && (
                                                    <button
                                                        type="button"
                                                        className={style.readMoreBtn}
                                                        onClick={() => toggleRoomRates(roomIndex)}
                                                    >
                                                        {isRatesExpanded
                                                            ? 'View less'
                                                            : `View more (${rates.length - RATES_DEFAULT_COUNT} more)`}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* <div className={style.cancellationBox}>
                                    <p className={style.cancellationTitle}>Cancellation Policy</p>
                                    {(() => {
                                        const selectedRateForRoom = roomIndex === selectedRoom
                                            ? room.rates[selectedRate] ?? room.rates[0]
                                            : room.rates[0];
                                        const policies = selectedRateForRoom?.cancellation_policies;
                                        const rateCurrency = selectedRateForRoom?.currency;

                                        if (!Array.isArray(policies) || policies.length === 0) {
                                            return <p className='small text-danger mb-0 fw-semibold'>✗ Non-refundable</p>;
                                        }

                                        const sorted = [...policies].sort((a, b) =>
                                            moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
                                        );
                                        const now = moment.utc();

                                        return sorted.map((policy, pi) => {
                                            const fromDate = moment.utc(policy.from);
                                            const isFuture = fromDate.isAfter(now);
                                            const amount = Number(policy.amount);

                                            if (amount === 0) {
                                                return (
                                                    <p key={pi} className='small text-success mb-1'>
                                                        ✓ Free cancellation before {fromDate.format('DD MMMM YYYY')}
                                                    </p>
                                                );
                                            }

                                            const converted = ConvertPrice(policy.amount, rateCurrency, currency, rates);
                                            return (
                                                <p key={pi} className={`small mb-1 ${isFuture ? 'text-warning' : 'text-danger'} fw-semibold`}>
                                                    From {fromDate.format('DD MMMM YYYY')}: {converted.newcurrency} {Number(converted.newprice).toFixed(2)} will be charged
                                                </p>
                                            );
                                        });
                                    })()}
                                </div> */}
                            </div>

                            {/* ── Price + Action ── */}
                            <div className={`col-md-3 ${style.priceCol}`}>
                                {(() => {
                                    const roomSelections = selectedRooms.filter((item) => item.roomIndex === roomIndex);
                                    const hasSelection = roomSelections.length > 0;
                                    const displayRateIndex = hasSelection ? roomSelections[0].rateIndex : 0;
                                    const displayRate = room.rates[displayRateIndex];
                                    const roomSelectedTotal = roomSelections.reduce((sum, item) => {
                                        const rate = room.rates?.[item.rateIndex];
                                        return sum + getRateUnitPrice(rate) * Number(item.qty || 1);
                                    }, 0);
                                    const roomOriginalTotal = Number(packageBaselineByRoom[roomIndex] || 0);
                                    const priceDiff = hasSelection
                                        ? formatPriceDifference(
                                            roomSelectedTotal,
                                            selectedRooms.length === 1 ? packageBaselinePrice : roomOriginalTotal
                                        )
                                        : formatPriceDifference(displayRate.price, selectedRatePrice);

                                    return (
                                        <>
                                            {priceDiff.value > 0 ? (
                                                <span className={style.roompricediff}>Total Extra Cost </span>
                                            ) : (
                                                <span className={style.roompricediffup}>Total savings</span>
                                            )}
                                            <span className={style.roomPriceMain} style={{ color: priceDiff.value > 0 ? '#dc3545' : '#E7247A' }}>
                                                <PriceDisplay currency={packageData?.currency} price={priceDiff.display} />
                                            </span>
                                            <span className='small' style={{ fontSize: '12px' }}>Vat and Taxes included</span>
                                            {/* {priceDiff.value !== 0 && (
                                                <p className={`${style.priceDiffNote} mb-1`} style={{ color: priceDiff.value > 0 ? '#dc3545' : '#E7247A' }}>
                                                    (<PriceDisplay currency={packageData?.currency} price={priceDiff.display} />)
                                                </p>
                                            )} */}
                                            {priceDiff.value === 0 && hasSelection && (
                                                <span className={style.includedBadge}>Included in package</span>
                                            )}
                                            <button
                                                className={`btn ${style.selectRoomBtn} ${hasSelection ? 'btn-success' : 'btn-outline-success'}`}
                                                onClick={() => {
                                                    if (!hasSelection) {
                                                        handleRateChange(roomIndex, 0, room.rates[0], room);
                                                    } else if (onNext) {
                                                        onNext();
                                                    }
                                                }}
                                            >
                                                {hasSelection ? 'Confirm & Continue' : 'Select Room'}
                                            </button>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {detail?.facilities?.length > 0 && (() => {
                const hasMoreFacilities = detail.facilities.length > FACILITIES_DEFAULT_COUNT;
                const visibleFacilities = facilitiesExpanded
                    ? detail.facilities
                    : detail.facilities.slice(0, FACILITIES_DEFAULT_COUNT);

                return (
                    <div className={style.facilitiesSection}>
                        <div className={style.facilitiesGrid}>
                            <div className={style.sectionLabel}>
                                <span>Hotel Facilities</span>
                                <div className={style.sectionLine} />
                            </div>
                            <div className="row row-cols-2 row-cols-sm-4">
                                {visibleFacilities.map((amenity, index) => (
                                    <div key={index} className="col-12 col-sm-6 col-md-4 col-lg-3 mt-2">
                                        <div className={style.facilityTile}>
                                            <div className={style.facilityIcon}>
                                                <GiCheckMark size={11} color="#16a34a" />
                                            </div>
                                            {amenity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hasMoreFacilities && (
                                <button
                                    type="button"
                                    className={style.readMoreBtn}
                                    onClick={() => setFacilitiesExpanded(prev => !prev)}
                                >
                                    {facilitiesExpanded
                                        ? 'View less'
                                        : `View more (${detail.facilities.length - FACILITIES_DEFAULT_COUNT} more)`}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    )
}
