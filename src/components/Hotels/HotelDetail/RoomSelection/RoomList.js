'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import RoomSummery from './RoomSummery'
import { FaCheck, FaAngleDown, FaAngleUp, FaArrowRight, FaUserFriends, FaChild } from 'react-icons/fa';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import moment from 'moment';
import { useHolidayPackageStore } from '@/components/Store/HolidayPackageStore';
import { MdInfoOutline } from 'react-icons/md';
import { Modal, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCurrency } from '@/util/currency';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { getRateOccupancy } from './getRateOccupancy';
import { getRateSeqNo, stampAndSortRooms } from '@/components/Hotels/utils/roomSequence';
import styles from './RoomList.module.css';

const isHotelstonProvider = (detail) =>
    String(detail?.provider || '').toLowerCase() === 'hotelston';

const normalizeImageSrc = (raw) => {
    if (!raw) return '/images/noimage.png';
    if (raw.startsWith('data:') || raw.startsWith('/')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
    if (raw.startsWith('//')) return 'https:' + raw;
    return 'https://' + raw.replace(/^\/+/, '');
};

const getAmenityLabel = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item?.description?.content || item?.name || item?.description || item?.label || '';
};

const getRoomSizeLabel = (room) => {
    const raw =
        room?.size ||
        room?.area ||
        room?.room_size ||
        room?.square_meters ||
        room?.metadata?.size ||
        room?.metadata?.room_size ||
        room?.metadata?.area;
    if (raw == null || raw === '') return '';
    const text = String(raw).trim();
    if (!text) return '';
    if (/m²|m2|sq/i.test(text)) return text;
    if (!Number.isNaN(Number(text))) return `${text} m²`;
    return text;
};

const getRoomCategory = (roomName = '') => {
    const n = String(roomName).toLowerCase();
    if (/suite|executive|deluxe|presidential|junior|penthouse/.test(n)) return 'executive';
    return 'standard';
};

export default function RoomList({ hotelDetail, isPackageMode, isEditMode, isReviseMode = false }) {
    // console.log(hotelDetail, 'hotelDetail');
    const { selectedData } = useHolidayPackageStore();
    const isHotelston = isHotelstonProvider(hotelDetail);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [roomData, setRoomData] = useState(hotelDetail?.rooms || []);
    const [filteredRoomData, setFilteredRoomData] = useState(hotelDetail?.rooms || []);
    const [activeFilters, setActiveFilters] = useState([]);
    const [modalPolicy, setModalPolicy] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [amenitiesModalRoom, setAmenitiesModalRoom] = useState(null);
    const [roomCategory, setRoomCategory] = useState('all');
    const { currency, rates } = useCurrency();
    const [expandedRates, setExpandedRates] = useState({});
    const ROOMS_PER_PAGE = 10;
    const [visibleRoomCount, setVisibleRoomCount] = useState(ROOMS_PER_PAGE);

    const prepareRooms = React.useCallback((rooms, selected = []) => {
        if (!isHotelstonProvider(hotelDetail)) return rooms || [];
        return stampAndSortRooms(rooms || [], selected);
    }, [hotelDetail]);

    const totalNights = React.useMemo(() => {
        if (hotelDetail?.checkIn && hotelDetail?.checkOut) {
            const nights = moment(hotelDetail.checkOut).diff(moment(hotelDetail.checkIn), 'days');
            return nights > 0 ? nights : 1;
        }
        return 1;
    }, [hotelDetail?.checkIn, hotelDetail?.checkOut]);

    const toggleRates = (roomIndex) => {
        setExpandedRates(prev => ({ ...prev, [roomIndex]: !prev[roomIndex] }));
    };

    const categoryFilteredRooms = React.useMemo(() => {
        if (roomCategory === 'all') return filteredRoomData;
        return filteredRoomData.filter((room) => getRoomCategory(room?.name) === roomCategory);
    }, [filteredRoomData, roomCategory]);

    React.useEffect(() => {
        setVisibleRoomCount(ROOMS_PER_PAGE);
    }, [roomCategory]);

    // Package mode: init selection only when hotel detail loads.
    // Do NOT depend on selectedData — proceed updates the store and would reset qty back to 1.
    useEffect(() => {
        const rawRooms = hotelDetail?.rooms || [];
        const rooms = prepareRooms(rawRooms, []);

        if (isPackageMode) {
            const storeSelection = selectedData?.hotel?.selectedRoom;
            const ratesToExpand = {};
            let lastSelectedRoomIndex = -1;

            const findStoreQty = (rate) => {
                if (!Array.isArray(storeSelection)) return 1;
                const seqNo = getRateSeqNo(rate);
                const match = storeSelection.find((s) => {
                    if (s.ratekey !== rate.rate_key) return false;
                    if (isHotelston && seqNo !== null && (s.seqNo ?? s.searchRoomIndex) != null) {
                        return Number(s.seqNo ?? s.searchRoomIndex) === seqNo;
                    }
                    if (s.roomTypeId != null && s.roomTypeId !== '') {
                        return String(rate?.metadata?.room_type_id || '') === String(s.roomTypeId);
                    }
                    return true;
                });
                return Number(match?.qty) || 1;
            };

            const preSelected = [];
            rooms.forEach((room, roomIndex) => {
                room?.rates?.forEach((rate, rateIndex) => {
                    if (!rate?.is_selected) return;
                    const occupancy = getRateOccupancy(rate);
                    const seqNo = getRateSeqNo(rate, room);
                    preSelected.push({
                        roomId: room.id,
                        ratekey: rate.rate_key,
                        qty: findStoreQty(rate),
                        roomTypeId: rate?.metadata?.room_type_id || '',
                        boardTypeId: rate?.metadata?.board_type_id || '',
                        adults: occupancy.adults,
                        children: occupancy.children,
                        ...(isHotelston ? { seqNo, searchRoomIndex: seqNo } : {}),
                    });
                    lastSelectedRoomIndex = roomIndex;
                    // Expand rate list when selected rate is beyond the first 2
                    if (rateIndex >= 2) {
                        ratesToExpand[roomIndex] = true;
                    }
                });
            });

            if (preSelected.length > 0) {
                setSelectedRooms(preSelected);
                if (Object.keys(ratesToExpand).length > 0) {
                    setExpandedRates((prev) => ({ ...prev, ...ratesToExpand }));
                }
                // Keep pre-selected rooms within the visible list
                const visibleNeeded = lastSelectedRoomIndex + 1;
                setVisibleRoomCount(
                    visibleNeeded > ROOMS_PER_PAGE
                        ? Math.ceil(visibleNeeded / ROOMS_PER_PAGE) * ROOMS_PER_PAGE
                        : ROOMS_PER_PAGE
                );
            } else {
                // Fallback: cheapest rate (existing behaviour when no is_selected flags)
                let minRate = null;
                let minRoom = null;

                rooms.forEach((room) => {
                    room?.rates?.forEach((rate) => {
                        if (minRate === null || Number(rate.price) < Number(minRate.price)) {
                            minRate = rate;
                            minRoom = room;
                        }
                    });
                });

                const minOccupancy = minRate ? getRateOccupancy(minRate) : null;
                const minSeqNo = minRate ? getRateSeqNo(minRate, minRoom) : null;
                setSelectedRooms(minRate ? [{
                    roomId: minRoom.id,
                    ratekey: minRate.rate_key,
                    qty: findStoreQty(minRate),
                    roomTypeId: minRate?.metadata?.room_type_id || '',
                    boardTypeId: minRate?.metadata?.board_type_id || '',
                    adults: minOccupancy.adults,
                    children: minOccupancy.children,
                    ...(isHotelston ? { seqNo: minSeqNo, searchRoomIndex: minSeqNo } : {}),
                }] : []);
                setVisibleRoomCount(ROOMS_PER_PAGE);
            }
        } else {
            setVisibleRoomCount(ROOMS_PER_PAGE);
        }
        setRoomData(rooms);
        setFilteredRoomData(rooms);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- package qty must not reset when store updates on proceed
    }, [hotelDetail, isPackageMode, prepareRooms, isHotelston]);

    // Edit / revise only: sync selection from store (hotels package proceed must not hit this)
    useEffect(() => {
        if (isPackageMode && !isEditMode) return;
        if (isEditMode && !isReviseMode) {
            setSelectedRooms(selectedData?.hotel?.selectedRoom || []);
        } else if (isEditMode && isReviseMode && !isPackageMode) {
            // Change room: keep current selection as starting point
            setSelectedRooms(selectedData?.hotel?.selectedRoom || []);
        }
    }, [isEditMode, isReviseMode, isPackageMode, selectedData]);

    // rate_key can repeat across rates; room_type_id makes each rate unique.
    // Hotelston: also match seq_no (one searched room slot per sequence).
    const isSameRate = (selected, rate, room) => {
        if (selected?.ratekey !== rate?.rate_key) return false;
        if (isHotelston) {
            const rateSeq = getRateSeqNo(rate, room);
            const selectedSeq = selected?.seqNo ?? selected?.searchRoomIndex;
            if (rateSeq !== null || (selectedSeq !== null && selectedSeq !== undefined && selectedSeq !== '')) {
                return Number(selectedSeq) === Number(rateSeq);
            }
        }
        const selectedTypeId = selected?.roomTypeId != null && selected.roomTypeId !== ''
            ? String(selected.roomTypeId)
            : null;
        const rateTypeId = rate?.metadata?.room_type_id != null
            ? String(rate.metadata.room_type_id)
            : null;
        if (selectedTypeId && rateTypeId) {
            return selectedTypeId === rateTypeId;
        }
        return true;
    };

    const isSeqSlotTaken = (seqNo, rate = null, room = null) => {
        if (!isHotelston || seqNo === null || seqNo === undefined) return false;
        return selectedRooms.some((selected) => {
            if (rate && isSameRate(selected, rate, room)) return false;
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

    // Holiday package only: flip is_selected on the matching rate in room list data
    const updateRoomDataIsSelected = (targetRate, value, targetRoom) => {
        setRoomData((prev) =>
            prev.map((room) => ({
                ...room,
                rates: (room.rates || []).map((r) => {
                    const sameKey = r.rate_key === targetRate?.rate_key;
                    const sameType =
                        String(r?.metadata?.room_type_id || '') ===
                        String(targetRate?.metadata?.room_type_id || '');
                    const sameSeq = !isHotelston || getRateSeqNo(r, room) === getRateSeqNo(targetRate, targetRoom);
                    return sameKey && sameType && sameSeq ? { ...r, is_selected: value } : r;
                }),
            }))
        );
    };

    const handleSelectToggle = (roomid, selectedId, rate, room) => {
        const isSelected = selectedRooms.find((r) => isSameRate(r, rate, room));
        const occupancy = getRateOccupancy(rate);
        const seqNo = isHotelston ? getRateSeqNo(rate, room) : null;

        if (isSelected) {
            setSelectedRooms(selectedRooms.filter((r) => !isSameRate(r, rate, room)));
            if (isPackageMode || isEditMode) {
                updateRoomDataIsSelected(rate, false, room);
            }
            return;
        }

        if (isHotelston && seqNo !== null && isSeqSlotTaken(seqNo, rate, room)) {
            showSeqLimitMessage();
            return;
        }

        setSelectedRooms([...selectedRooms, {
            roomId: roomid,
            ratekey: selectedId,
            qty: 1,
            roomTypeId: rate?.metadata?.room_type_id || '',
            boardTypeId: rate?.metadata?.board_type_id || '',
            adults: occupancy.adults,
            children: occupancy.children,
            ...(isHotelston ? { seqNo, searchRoomIndex: seqNo } : {}),
        }]);
        if (isPackageMode || isEditMode) {
            updateRoomDataIsSelected(rate, true, room);
        }
    };

    const handleQuantityChange = (rate, quantity, room) => {
        const qty = Math.max(1, Number(quantity) || 1);
        const updatedRooms = selectedRooms.map((selected) => {
            if (isSameRate(selected, rate, room)) {
                return { ...selected, qty };
            }
            return selected;
        });
        setSelectedRooms(updatedRooms);
    };

    const isRoomSelected = (rate, room) => {
        return selectedRooms.some((r) => isSameRate(r, rate, room));
    };

    // Extract available filters from room data
    const availableFilters = React.useMemo(() => {
        const filters = {
            boardTypes: new Set(),
            hasFreeBreakfast: false,
            hasFreeCancellation: false,
        };

        roomData.forEach(room => {
            room?.rates?.forEach(rate => {
                if (rate?.board_name) {
                    filters.boardTypes.add(rate.board_name);
                }

                if (rate?.cancellation_policies && Array.isArray(rate.cancellation_policies) && rate.cancellation_policies.length > 0) {
                    const sortedPolicies = [...rate.cancellation_policies].sort((a, b) =>
                        moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
                    );
                    const now = moment.utc();
                    const allDatesInFuture = sortedPolicies.every(policy =>
                        moment.utc(policy.from).isAfter(now)
                    );
                    if (allDatesInFuture) {
                        filters.hasFreeCancellation = true;
                    }
                }

                if (rate?.board_name && (
                    rate.board_name.toLowerCase().includes('breakfast') ||
                    rate.board_name.toLowerCase().includes('bed and breakfast') ||
                    rate.board_name.toLowerCase().includes('bb')
                )) {
                    filters.hasFreeBreakfast = true;
                }
            });
        });

        return {
            ...filters,
            boardTypes: Array.from(filters.boardTypes)
        };
    }, [roomData]);

    const toggleFilter = (filterType, filterValue) => {
        const filterKey = `${filterType}:${filterValue}`;
        
        setActiveFilters(prev => {
            if (prev.includes(filterKey)) {
                return prev.filter(f => f !== filterKey);
            } else {
                return [...prev, filterKey];
            }
        });
    };

    // Only reset pagination when filters change — not when roomData updates on select
    React.useEffect(() => {
        setVisibleRoomCount(ROOMS_PER_PAGE);
    }, [activeFilters]);

    React.useEffect(() => {
        if (activeFilters.length === 0) {
            setFilteredRoomData(roomData);
            return;
        }

        const filtered = roomData.map(room => {
            const filteredRates = room.rates.filter(rate => {
                for (const filter of activeFilters) {
                    const [filterType, filterValue] = filter.split(':');

                    if (filterType === 'breakfast') {
                        const hasBreakfast = rate?.board_name && (
                            rate.board_name.toLowerCase().includes('breakfast') ||
                            rate.board_name.toLowerCase().includes('bed and breakfast') ||
                            rate.board_name.toLowerCase().includes('bb')
                        );
                        if (!hasBreakfast) return false;
                    }

                    if (filterType === 'cancellation') {
                        if (!rate?.cancellation_policies || rate.cancellation_policies.length === 0) return false;
                        const sortedPolicies = [...rate.cancellation_policies].sort((a, b) =>
                            moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
                        );
                        const now = moment.utc();
                        const allDatesInFuture = sortedPolicies.every(policy =>
                            moment.utc(policy.from).isAfter(now)
                        );
                        if (!allDatesInFuture) return false;
                    }

                    if (filterType === 'board') {
                        if (rate?.board_name !== filterValue) return false;
                    }
                }

                return true;
            });

            return {
                ...room,
                rates: filteredRates
            };
        }).filter(room => room.rates.length > 0);

        setFilteredRoomData(filtered);
    }, [activeFilters, roomData]);

    const isFilterActive = (filterType, filterValue) => {
        return activeFilters.includes(`${filterType}:${filterValue}`);
    };

    function getCancellationSummary(policyArr, Defaultcurrency) {
        if (!Array.isArray(policyArr) || policyArr.length === 0) {
            return { message: 'Non-refundable', type: 'non-refundable' };
        }

        const sortedPolicies = [...policyArr].sort((a, b) =>
            moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
        );

        const now = moment.utc();

        const allDatesInFuture = sortedPolicies.every(policy =>
            moment.utc(policy.from).isAfter(now)
        );

        const nearestPolicy = sortedPolicies[0];
        const nearestDate = moment.utc(nearestPolicy.from);

        if (allDatesInFuture) {
            return {
                message: `Free cancellation before ${nearestDate.format('DD MMMM YYYY')}`,
                type: 'free',
                policy: nearestPolicy
            };
        }

        // Currently active policy = last policy whose 'from' date has already passed
        const passedPolicies = sortedPolicies.filter(policy =>
            !moment.utc(policy.from).isAfter(now)
        );
        const currentPolicy = passedPolicies[passedPolicies.length - 1];

        const ConvertedAmount = ConvertPrice(currentPolicy?.amount, Defaultcurrency, currency, rates);
        return {
            message: `Cancellation fee: ${ConvertedAmount.newcurrency} ${ConvertedAmount.newprice}`,
            type: 'fee',
            policy: currentPolicy
        };
    };

    function handleViewPolicy(policyArr, currency) {
        setModalPolicy({ policies: policyArr, currency });
        setShowModal(true);
    };

    function CancellationModal() {
        if (!showModal || !modalPolicy) return null;

        const sortedPolicies = [...modalPolicy.policies].sort((a, b) =>
            moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
        );

        return (
            <div
                className={`modal fade show ${styles.modalOverlay}`}
                onClick={() => setShowModal(false)}
            >
                <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className={`modal-content ${styles.modalContent}`}>
                        <div className="modal-header border-0 pb-0">
                            <h5 className="modal-title fw-bold">Cancellation Policy</h5>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setShowModal(false)}
                            ></button>
                        </div>
                        <div className="modal-body pt-2">
                            <div className="mt-2">
                                <div className="mb-3 pb-3 border-bottom">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong className="text-muted small">Before</strong>
                                            <div className={`fw-bold ${styles.modalDate}`}>
                                                {moment.utc(sortedPolicies[0].from).format('MMM DD, YYYY')}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className="badge bg-success px-3 py-2">Full Refund</span>
                                        </div>
                                    </div>
                                    <p className="small mt-2 mb-0 text-muted">
                                        Cancel your reservation before {moment.utc(sortedPolicies[0].from).format('MMM DD [at] hh:mm A')}, and you&apos;ll get a full refund. Times are based on the property&apos;s local time.
                                    </p>
                                </div>

                                {sortedPolicies.map((policy, idx) => {
                                    const dateObj = moment.utc(policy.from);
                                    return (
                                        <div key={idx} className="mb-3 pb-3 border-bottom">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <strong className="text-muted small">From</strong>
                                                    <div className={`fw-bold ${styles.modalDate}`}>
                                                        {dateObj.format('MMM DD, YYYY')}
                                                    </div>
                                                </div>
                                                <div className="text-end">
                                                    <span className={`fw-bold ${styles.modalFeeAmount}`}>
                                                        <PriceDisplay price={policy.amount} currency={modalPolicy.currency} />
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="small mt-2 mb-0 text-muted">
                                                From {dateObj.format('MMM DD [at] hh:mm A')}, a cancellation fee of <strong><PriceDisplay price={policy.amount} currency={modalPolicy.currency} /></strong> will be charged.
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const hotelFacilities = Array.isArray(hotelDetail?.facilities) ? hotelDetail.facilities : [];
    const amenitiesList = (() => {
        const fromRoom = Array.isArray(amenitiesModalRoom?.amenities)
            ? amenitiesModalRoom.amenities.map(getAmenityLabel).filter(Boolean)
            : [];
        if (fromRoom.length > 0) return fromRoom;
        const fromRoomFacilities = Array.isArray(amenitiesModalRoom?.facilities)
            ? amenitiesModalRoom.facilities.map(getAmenityLabel).filter(Boolean)
            : [];
        if (fromRoomFacilities.length > 0) return fromRoomFacilities;
        return hotelFacilities.map(getAmenityLabel).filter(Boolean);
    })();

    return (
        <>
            <CancellationModal />
            <Modal
                opened={!!amenitiesModalRoom}
                onClose={() => setAmenitiesModalRoom(null)}
                title={amenitiesModalRoom?.name ? `${amenitiesModalRoom.name} — Amenities` : 'Room amenities'}
                centered
                lockScroll
                trapFocus
                size="lg"
                overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
                classNames={{ body: 'pb-4' }}
            >
                {amenitiesList.length > 0 ? (
                    <div className={styles.amenitiesModalGrid}>
                        {amenitiesList.map((label, idx) => (
                            <div key={idx} className={styles.amenityModalItem}>
                                <FaCheck className={styles.amenityModalIcon} aria-hidden="true" />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mb-0 text-muted">No amenities listed for this room.</p>
                )}
            </Modal>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>Available rooms</h4>

                    <div className={styles.toolbar} aria-label="Room filters">
                        {(availableFilters.hasFreeCancellation || availableFilters.boardTypes.length > 0) && (
                            <div className={styles.toolbarGroup}>
                                {availableFilters.boardTypes.map((boardType, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleFilter('board', boardType)}
                                        className={`${styles.toolbarChip} ${isFilterActive('board', boardType) ? styles.toolbarChipActive : ''}`}
                                    >
                                        {boardType}
                                    </button>
                                ))}
                                {availableFilters.hasFreeCancellation && (
                                    <button
                                        type="button"
                                        onClick={() => toggleFilter('cancellation', 'free')}
                                        className={`${styles.toolbarChip} ${isFilterActive('cancellation', 'free') ? styles.toolbarChipActive : ''}`}
                                    >
                                        Free Cancellation
                                    </button>
                                )}
                            </div>
                        )}

                        {/* <div className={styles.toolbarGroup} role="tablist" aria-label="Room categories">
                            {[
                                { id: 'all', label: 'All Rooms' },
                                { id: 'standard', label: 'Standard Rooms' },
                                { id: 'executive', label: 'Executive / Suite' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={roomCategory === tab.id}
                                    className={`${styles.toolbarChip} ${roomCategory === tab.id ? styles.toolbarChipActive : ''}`}
                                    onClick={() => setRoomCategory(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div> */}
                    </div>
                </div>

                {activeFilters.length > 0 && (
                    <div className={styles.clearFilters}>
                        <span>
                            {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} applied
                        </span>
                        <button type="button" className={styles.clearFiltersBtn} onClick={() => setActiveFilters([])}>
                            Clear all ✕
                        </button>
                    </div>
                )}

                <div className={styles.layout}>
                    <div className={styles.roomsCol}>
                        {categoryFilteredRooms.length === 0 ? (
                            <div className={styles.emptyState}>
                                No rooms match your selected filters. Try adjusting your filters.
                            </div>
                        ) : (
                            <>
                                {categoryFilteredRooms.slice(0, visibleRoomCount).map((room, index) => {
                                    const sizeLabel = getRoomSizeLabel(room);
                                    const roomImage = normalizeImageSrc(
                                        room?.images?.[0]?.url || room?.images?.[0] || ''
                                    );
                                    const previewAdults = room?.rates?.[0]?.adults;
                                    const visibleRates = expandedRates[index] ? room?.rates : room?.rates?.slice(0, 2);

                                    return (
                                        <article key={room?.id ?? index} className={`${styles.roomCard} shadow-sm rounded-5`} style={{ border:'1px solid #00000020' }}>
                                            <div className={styles.roomMedia}>
                                                <Image
                                                    className={styles.roomImage}
                                                    src={roomImage}
                                                    height={280}
                                                    width={220}
                                                    quality={90}
                                                    alt={room?.name || 'Room image'}
                                                />
                                            </div>

                                            <div className={styles.roomBody}>
                                                <div className={styles.roomTitleRow}>
                                                    <h5 className={styles.roomName}>{room?.name}</h5>
                                                    {sizeLabel && <span className={styles.sizeBadge}>{sizeLabel}</span>}
                                                </div>

                                                {previewAdults != null && previewAdults !== '' && (
                                                    <p className={styles.roomOccupancy}>
                                                        <FaUserFriends className={styles.roomOccupancyIcon} aria-hidden="true" />
                                                        {previewAdults} Adult{Number(previewAdults) === 1 ? '' : 's'}
                                                    </p>
                                                )}

                                                <div className={styles.ratesRow}>
                                                    {(visibleRates || []).map((rate, idx) => {
                                                        const rateSeqNo = getRateSeqNo(rate, room);
                                                        const selected = isRoomSelected(rate, room);
                                                        const seqTaken = isHotelston && rateSeqNo !== null && isSeqSlotTaken(rateSeqNo, rate, room);
                                                        const summary = getCancellationSummary(rate?.cancellation_policies, rate?.currency);
                                                        const cancelLabel =
                                                            summary.type === 'free'
                                                                ? 'FREE CANCELLATION'
                                                                : summary.type === 'non-refundable'
                                                                    ? 'NON-REFUNDABLE'
                                                                    : 'CANCELLATION FEE';
                                                        const boardLabel = (rate?.board_name || 'Room Only').toUpperCase();

                                                        return (
                                                            <div
                                                                key={`${rate?.rate_key}-${rateSeqNo ?? idx}`}
                                                                className={`${styles.rateCard} ${selected ? styles.rateCardSelected : ''}`}
                                                            >
                                                                <div className={styles.rateMeta}>
                                                                    <span>{boardLabel} · {cancelLabel}</span>
                                                                    {rate?.cancellation_policies?.length > 0 && (
                                                                        <MdInfoOutline
                                                                            size={14}
                                                                            className={styles.policyInfo}
                                                                            onClick={() => handleViewPolicy(rate?.cancellation_policies, rate?.currency)}
                                                                            aria-label="View cancellation policy"
                                                                        />
                                                                    )}
                                                                </div>

                                                                <div className={styles.ratePrices}>
                                                                    <div className={styles.ratePriceBlock}>
                                                                        <p className={styles.rateNightly}>
                                                                            <PriceDisplay price={rate?.price / totalNights} currency={rate?.currency} />
                                                                            /night
                                                                        </p>
                                                                        <span className={styles.rateVat}>VAT and Taxes included</span>
                                                                    </div>
                                                                    <div className={`${styles.ratePriceBlock} ${styles.ratePriceBlockEnd}`}>
                                                                        <p className={styles.rateTotal}>
                                                                            Total <PriceDisplay price={rate?.price} currency={rate?.currency} />
                                                                        </p>
                                                                        <span className={styles.rateVat}>VAT and Taxes included</span>
                                                                    </div>
                                                                </div>

                                                                <div className={styles.rateGuests}>
                                                                    <span className={styles.rateGuestItem}>
                                                                        <FaUserFriends className={styles.rateGuestIcon} aria-hidden="true" />
                                                                        {rate?.adults ?? 0} Adult{(rate?.adults ?? 0) === 1 ? '' : 's'}
                                                                    </span>
                                                                    <span className={styles.rateGuestItem}>
                                                                        <FaChild className={styles.rateGuestIcon} aria-hidden="true" />
                                                                        {rate?.children ?? 0} Child
                                                                    </span>
                                                                </div>

                                                                {summary.type === 'free' && (
                                                                    <div className={`${styles.rateCancel} ${styles.rateCancelFree}`}>
                                                                        {summary.message}
                                                                    </div>
                                                                )}
                                                                {summary.type === 'fee' && (
                                                                    <div className={`${styles.rateCancel} ${styles.rateCancelFee}`}>
                                                                        {summary.message}
                                                                    </div>
                                                                )}

                                                                {rate?.on_request && (
                                                                    <span className={styles.onRequest}>
                                                                        On Request
                                                                        <Tooltip label="This room is not instantly confirmed and requires availability confirmation from the hotel.">
                                                                            <MdInfoOutline size={14} className="cursor-pointer" />
                                                                        </Tooltip>
                                                                    </span>
                                                                )}

                                                                {selected && Number(rate?.allotment) > 1 && (
                                                                    <div className={styles.qtyRow}>
                                                                        <select
                                                                            value={selectedRooms.find((r) => isSameRate(r, rate, room))?.qty || 1}
                                                                            onChange={(e) => handleQuantityChange(rate, e.target.value, room)}
                                                                            className={styles.qtySelect}
                                                                            aria-label="Room quantity"
                                                                        >
                                                                            {Array(Number(rate?.allotment)).fill(0).map((_, i) => (
                                                                                <option key={i} value={i + 1}>{i + 1}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {selected ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectToggle(room?.id, rate?.rate_key, rate, room)}
                                                                        className={`${styles.reserveBtn} ${styles.selectedBtn}`}
                                                                    >
                                                                        Selected
                                                                    </button>
                                                                ) : seqTaken ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            disabled
                                                                            className={styles.reserveBtn}
                                                                            title="A room is already reserved for these guests"
                                                                        >
                                                                            Reserve
                                                                        </button>
                                                                        <span className={styles.seqHint}>Already reserved for these guests</span>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectToggle(room?.id, rate?.rate_key, rate, room)}
                                                                        className={styles.reserveBtn}
                                                                    >
                                                                        Reserve
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                </div>

                                                {room?.rates?.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRates(index)}
                                                        className={styles.viewMoreRates}
                                                    >
                                                        {expandedRates[index]
                                                            ? <><FaAngleUp className="me-1" />Show Less</>
                                                            : <><FaAngleDown className="me-1" />View More ({room.rates.length - 2} more)</>
                                                        }
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className={styles.amenitiesLink}
                                                    onClick={() => setAmenitiesModalRoom(room)}
                                                >
                                                    View amenities
                                                    <FaArrowRight className={styles.amenitiesLinkIcon} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}

                                {visibleRoomCount < categoryFilteredRooms.length && (
                                    <div className={styles.loadMoreWrap}>
                                        <button
                                            type="button"
                                            onClick={() => setVisibleRoomCount((prev) => prev + ROOMS_PER_PAGE)}
                                            className={styles.loadMoreBtn}
                                        >
                                            <FaAngleDown className="me-1" />
                                            View More ({Math.min(ROOMS_PER_PAGE, categoryFilteredRooms.length - visibleRoomCount)} more)
                                        </button>
                                        <div className={styles.loadMoreMeta}>
                                            Showing {Math.min(visibleRoomCount, categoryFilteredRooms.length)} of {categoryFilteredRooms.length} rooms
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <RoomSummery selectedRooms={selectedRooms} roomList={roomData} detail={hotelDetail} />
                    </div>
                </div>
            </div>
        </>
    )
}
