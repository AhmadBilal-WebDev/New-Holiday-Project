'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader, Modal, Text } from '@mantine/core';
import { FaMoon, FaStar, FaCalendarAlt, FaUtensils, FaUser, FaChild, FaCheck } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { FiCheckCircle } from 'react-icons/fi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { GiCheckMark } from 'react-icons/gi';
import { MdErrorOutline } from 'react-icons/md';
import { CiTrash } from 'react-icons/ci';
import { getRateOccupancy, normalizeChildrenAges } from '@/components/Hotels/HotelDetail/RoomSelection/getRateOccupancy';
import { getRateSeqNo, sortSelectedRoomsBySeq } from '@/components/Hotels/utils/roomSequence';
import Image from 'next/image';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { useCurrency } from '@/util/currency';
import { notifications } from '@mantine/notifications';
import detailStyle from '../Detail/Detail.module.css';
import styles from './UpdateHotel.module.css';

const RATES_DEFAULT_COUNT = 3;
const FACILITIES_DEFAULT_COUNT = 6;

function childrenCount(value) {
    if (Array.isArray(value)) return value.length;
    return Number(value || 0);
}

function isHotelstonProvider(item) {
    return String(item?.provider || '').toLowerCase() === 'hotelston';
}

function collectHotelstonSeqNos(rooms = []) {
    const seqs = new Set();
    (rooms || []).forEach((room) => {
        (room?.rates || []).forEach((rate) => {
            const seq = getRateSeqNo(rate, room);
            if (seq !== null) seqs.add(seq);
        });
    });
    return [...seqs].sort((a, b) => a - b);
}

function findCheapestRateForSeq(rooms, seqNo) {
    let best = null;
    (rooms || []).forEach((room, roomIndex) => {
        (room?.rates || []).forEach((rate, rateIndex) => {
            if (Number(getRateSeqNo(rate, room)) !== Number(seqNo)) return;
            const price = Number(rate?.price);
            if (!Number.isFinite(price)) return;
            if (!best || price < best.price) {
                best = { room, rate, roomIndex, rateIndex, price, seqNo };
            }
        });
    });
    return best;
}

function getRoomOccupancy(rate, packageRooms = []) {
    const occupancy = getRateOccupancy(rate);
    const searchRooms = rate?.metadata?.search_request?.rooms || [];
    if (searchRooms.length) return occupancy;

    const rateAdults = Number(rate?.adults ?? occupancy.adults ?? 0);
    const rateChildrenCount = childrenCount(rate?.children ?? occupancy.children);
    const matchedPackage = (packageRooms || []).find((pr) => {
        const prChildren = childrenCount(pr?.children);
        return Number(pr?.adults ?? 0) === rateAdults && prChildren === rateChildrenCount;
    }) || packageRooms?.[0];

    return {
        adults: Number(matchedPackage?.adults ?? rateAdults),
        children: normalizeChildrenAges(matchedPackage?.children || occupancy.children),
    };
}

function findCheckRate(checkData, rateKey) {
    const checkRooms = checkData?.rooms || [];
    for (const checkRoom of checkRooms) {
        const found = (checkRoom?.rates || []).find(
            (rate) => String(rate?.rate_key || '') === String(rateKey || '')
        );
        if (found) return found;
    }
    return checkRooms[0]?.rates?.[0] || null;
}

function getActiveCancellationMessage(policies) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return { message: 'Non-refundable', type: 'non-refundable' };
    }

    const sortedPolicies = [...policies].sort(
        (a, b) => moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
    );
    const now = moment.utc();
    const allDatesInFuture = sortedPolicies.every((policy) =>
        moment.utc(policy.from).isAfter(now)
    );
    const nearestPolicy = sortedPolicies[0];
    const nearestDate = moment.utc(nearestPolicy.from);

    if (allDatesInFuture) {
        return {
            message: `Free cancellation before ${nearestDate.format('DD MMM YYYY')}`,
            type: 'free',
        };
    }

    // Currently active policy = last policy whose 'from' date has already passed
    const passedPolicies = sortedPolicies.filter(
        (policy) => !moment.utc(policy.from).isAfter(now)
    );
    const currentPolicy = passedPolicies[passedPolicies.length - 1] || nearestPolicy;
    const amount = Number(currentPolicy?.amount || 0);

    if (!amount) {
        return {
            message: `Free cancellation until ${moment.utc(currentPolicy.from).format('DD MMM YYYY')}`,
            type: 'free',
        };
    }

    return {
        message: 'Cancellation fee now:',
        type: 'fee',
        amount,
    };
}

export default function RevisionHotelDetailModal({
    opened,
    onClose,
    selectedHotel,
    stayHotel,
    cityName,
    pkg,
    failedService = '',
    onConfirm,
}) {
    const router = useRouter();
    const { rates } = useCurrency();
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState(null);
    const [applyError, setApplyError] = useState(null);
    const [apiDetails, setApiDetails] = useState(null);
    const [hotelFullDetails, setHotelFullDetails] = useState({});
    const [reviseSummary, setReviseSummary] = useState(null);
    const [proceedPayload, setProceedPayload] = useState(null);
    const [retryingPayment, setRetryingPayment] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [descExpanded, setDescExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const [expandedAmenities, setExpandedAmenities] = useState({});
    const [facilitiesExpanded, setFacilitiesExpanded] = useState(false);
    const [expandedRoomRates, setExpandedRoomRates] = useState({});
    const descriptionContentRef = React.useRef(null);
    const summaryRef = React.useRef(null);

    const nights = stayHotel?.nights
        || Math.max(1, moment(stayHotel?.check_out).diff(moment(stayHotel?.check_in), 'days') || 1);

    const fetchHotelDetails = useCallback(async () => {
        console.log('fetchHotelDetails', selectedHotel);
        if (!selectedHotel?.id) return;

        setLoading(true);
        setError(null);
        setApiDetails(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/full/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedHotel.provider,
                    hotelId: selectedHotel.id,
                    checkIn: stayHotel?.check_in,
                    checkOut: stayHotel?.check_out,
                    roomList: selectedHotel.rooms,
                }),
            });
            const res = await response.json();
            const data = res?.data || {};
            setHotelFullDetails(data);
            setApiDetails({
                all_images: data?.all_images || [],
                address: data?.address || selectedHotel?.location?.address || '',
                facilities: data?.facilities || [],
                description: data?.description || '',
                star_rating: data?.star_rating ?? selectedHotel?.metadata?.stars,
                rooms: data?.rooms || [],
            });
        } catch (err) {
            console.error('Revision hotel detail error:', err);
            setError('Failed to load hotel details. You can still select a room.');
            setApiDetails({
                all_images: [],
                address: selectedHotel?.location?.address || '',
                facilities: [],
                description: '',
                star_rating: selectedHotel?.metadata?.stars,
                hotel_name: selectedHotel?.name,
                rooms: [],
            });
        } finally {
            setLoading(false);
        }
    }, [selectedHotel, stayHotel?.check_in, stayHotel?.check_out, pkg?.original_request?.rooms]);

    useEffect(() => {
        if (!opened || !selectedHotel) return;

        setSelectedRooms([]);
        setDescExpanded(false);
        setExpandedAmenities({});
        setFacilitiesExpanded(false);
        setExpandedRoomRates({});
        setApplyError(null);
        setApplying(false);
        setReviseSummary(null);
        setProceedPayload(null);
        fetchHotelDetails();
    }, [opened, selectedHotel?.id, fetchHotelDetails]);

    const detail = useMemo(() => {
        if (!selectedHotel) return null;
        return {
            ...selectedHotel,
            name: apiDetails?.hotel_name || selectedHotel?.name,
            nights,
            check_in: stayHotel?.check_in,
            check_out: stayHotel?.check_out,
            star_rating: apiDetails?.star_rating ?? selectedHotel?.metadata?.stars,
            location: {
                ...(selectedHotel?.location || {}),
                address: apiDetails?.address || selectedHotel?.location?.address || '',
            },
            all_images: apiDetails?.all_images || [],
            facilities: apiDetails?.facilities || [],
            description: apiDetails?.description || '',
            rooms: apiDetails?.rooms || [],
        };
    }, [selectedHotel, stayHotel, apiDetails, nights]);

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
    }, [plainDescription, normalizedHtmlDescription, descExpanded, loading]);

    const roomsSource = useMemo(() => {
        if (apiDetails?.rooms?.length) return apiDetails.rooms;
        if (hotelFullDetails?.rooms?.length) return hotelFullDetails.rooms;
        return selectedHotel?.rooms || [];
    }, [apiDetails?.rooms, hotelFullDetails?.rooms, selectedHotel?.rooms]);

    const isHotelston = isHotelstonProvider(selectedHotel);
    const packageCurrency = pkg?.currency || pkg?.pricing?.currency;
    const requiredRoomCount = Math.max(
        1,
        Number(pkg?.original_request?.rooms?.length || 1),
        isHotelston ? collectHotelstonSeqNos(roomsSource).length : 0
    );
    const selectedQtyTotal = selectedRooms.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    // Hotelston: pre-select one cheapest rate per sequence after details load
    useEffect(() => {
        if (!opened || !isHotelston || loading) return;
        if (!roomsSource?.length) return;

        const seqNos = collectHotelstonSeqNos(roomsSource);
        if (seqNos.length <= 1) return;

        const searchRooms = pkg?.original_request?.rooms || [];
        const preselected = [];
        seqNos.forEach((seqNo, index) => {
            const match = findCheapestRateForSeq(roomsSource, seqNo);
            if (!match) return;
            const occupancy = getRoomOccupancy(match.rate, searchRooms);
            preselected.push({
                roomId: match.room?.id,
                ratekey: match.rate?.rate_key,
                qty: Math.max(1, Number(searchRooms[index]?.quantity || searchRooms[index]?.qty || 1)),
                roomIndex: match.roomIndex,
                rateIndex: match.rateIndex,
                roomTypeId: match.rate?.metadata?.room_type_id || match.room?.id || '',
                boardTypeId: match.rate?.metadata?.board_type_id || '',
                adults: searchRooms[index]?.adults ?? occupancy.adults,
                children: searchRooms[index]?.children ?? occupancy.children,
                seqNo,
                searchRoomIndex: seqNo,
            });
        });

        if (preselected.length) {
            setSelectedRooms(sortSelectedRoomsBySeq(preselected));
        }
    }, [opened, isHotelston, loading, selectedHotel?.id, roomsSource, pkg?.original_request?.rooms]);

    const getVisibleRateIndices = (roomIndex, ratesList) => {
        const hasMoreRates = ratesList.length > RATES_DEFAULT_COUNT;
        if (!hasMoreRates || expandedRoomRates[roomIndex]) {
            return ratesList.map((_, index) => index);
        }

        const indices = Array.from({ length: RATES_DEFAULT_COUNT }, (_, index) => index);
        selectedRooms.forEach((selected) => {
            if (selected.roomIndex === roomIndex && selected.rateIndex >= RATES_DEFAULT_COUNT && !indices.includes(selected.rateIndex)) {
                indices.push(selected.rateIndex);
            }
        });
        return indices;
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

    const handleRateChange = (room, rate, roomIndex, rateIndex) => {
        if (findSelected(roomIndex, rateIndex)) return;
        const seqNo = isHotelston ? getRateSeqNo(rate, room) : null;
        if (isSeqSlotTaken(seqNo, roomIndex, rateIndex)) {
            notifications.show({
                autoClose: 4000,
                title: 'Room Already Chosen',
                message: 'You’ve already reserved a room for these guests. Remove it first if you want to pick a different one.',
                color: 'red',
            });
            return;
        }
        const occupancy = getRoomOccupancy(rate, pkg?.original_request?.rooms);
        setSelectedRooms((prev) => [
            ...prev,
            {
                roomId: room?.id,
                ratekey: rate?.rate_key,
                qty: 1,
                roomIndex,
                rateIndex,
                roomTypeId: rate?.metadata?.room_type_id || room?.id || '',
                boardTypeId: rate?.metadata?.board_type_id || '',
                adults: occupancy.adults,
                children: occupancy.children,
                ...(seqNo !== null ? { seqNo, searchRoomIndex: seqNo } : {}),
            },
        ]);
    };

    const handleRemoveSelected = (roomIndex, rateIndex) => {
        setSelectedRooms((prev) =>
            prev.filter((item) => !(item.roomIndex === roomIndex && item.rateIndex === rateIndex))
        );
    };

    const handleQuantityChange = (roomIndex, rateIndex, quantity, allotment) => {
        const qty = Math.min(Math.max(1, Number(quantity) || 1), allotment);
        setSelectedRooms((prev) =>
            prev.map((item) =>
                item.roomIndex === roomIndex && item.rateIndex === rateIndex
                    ? { ...item, qty }
                    : item
            )
        );
    };

    const buildCheckRatesRequest = (selections) => {
        let countrycode = 'GB';
        const clientNationality = localStorage.getItem('clientNationality');
        if (clientNationality) countrycode = clientNationality;

        const orderedSelections = isHotelston
            ? sortSelectedRoomsBySeq(selections)
            : selections;

        return {
            provider: selectedHotel?.provider,
            hotelId: String(selectedHotel?.id || ''),
            clientNationality: countrycode,
            checkIn: stayHotel?.check_in,
            checkOut: stayHotel?.check_out,
            rooms: orderedSelections.map((selected) => ({
                rateKey: String(selected.ratekey || ''),
                quantity: Number(selected.qty || 1),
                adults: Number(selected.adults || 0),
                children: Array.isArray(selected.children) ? selected.children : [],
                roomTypeId: String(selected.roomTypeId || ''),
                boardTypeId: String(selected.boardTypeId || ''),
            })),
        };
    };

    const buildSelectedRoomUnits = (roomsList, selections, checkData) => {
        return (selections || []).reduce((units, selected) => {
            const room = roomsList?.[selected.roomIndex];
            const rate = room?.rates?.[selected.rateIndex];
            if (!room || !rate) return units;

            const qty = Math.max(1, Number(selected.qty || 1));
            const checkRate = findCheckRate(checkData, rate?.rate_key);
            const unitPrice = Number(checkRate?.price ?? rate?.price ?? 0);
            const roomCurrency = checkData?.currency || rate?.currency;
            const { newprice, newcurrency } = ConvertPrice(
                unitPrice * qty,
                roomCurrency,
                packageCurrency,
                rates
            );
            const seqNo = selected.seqNo ?? selected.searchRoomIndex ?? getRateSeqNo(rate, room);

            units.push({
                rateKey: String(rate?.rate_key || selected.ratekey || ''),
                roomIndex: Number(selected.roomIndex),
                rateIndex: Number(selected.rateIndex),
                quantity: qty,
                adults: Number(selected.adults ?? rate?.adults ?? 0),
                children: childrenCount(selected.children ?? rate?.children),
                price: Number(newprice),
                currency: newcurrency || packageCurrency || roomCurrency,
                boardName: rate?.board_name,
                roomType: room?.name || '',
                optionId: rate?.metadata?.optionId,
                roomTypeId: String(selected.roomTypeId || rate?.metadata?.room_type_id || room?.id || ''),
                boardTypeId: String(selected.boardTypeId || rate?.metadata?.board_type_id || ''),
                ...(seqNo !== null && seqNo !== undefined
                    ? { seqNo, searchRoomIndex: seqNo }
                    : {}),
            });
            return units;
        }, []);
    };

    const callDummyReviseApi = async ({ selections, checkRatesData }) => {
        const checkData = checkRatesData?.data || {};
        const firstSelection = selections?.[0];
        const firstRoom = roomsSource?.[firstSelection?.roomIndex];
        const firstRate = firstRoom?.rates?.[firstSelection?.rateIndex];
        const firstCheckRate = findCheckRate(checkData, firstRate?.rate_key);
        const packageCur = pkg?.pricing?.currency || pkg?.currency;
        const sourceCurrency = checkData?.currency || firstRate?.currency;
        const selectedRoomUnits = buildSelectedRoomUnits(roomsSource, selections, checkData);
        const unitsTotal = selectedRoomUnits.reduce((sum, unit) => sum + Number(unit.price || 0), 0);
        const sourcePrice = Number(checkData?.total_net);
        const totalFromCheckRates = Number.isFinite(sourcePrice) && sourcePrice > 0
            ? sourcePrice
            : unitsTotal;
        const { newprice, newcurrency } = ConvertPrice(
            totalFromCheckRates,
            Number.isFinite(sourcePrice) && sourcePrice > 0 ? sourceCurrency : (selectedRoomUnits[0]?.currency || sourceCurrency),
            packageCur,
            rates
        );
        const confirmedPrice = Number(newprice || unitsTotal);
        const confirmedCurrency = newcurrency || packageCur || sourceCurrency;
        const conversionRate =
            sourceCurrency
                && confirmedCurrency
                && sourceCurrency !== confirmedCurrency
                && rates?.[sourceCurrency]
                && rates?.[confirmedCurrency]
                ? Number(rates[confirmedCurrency]) / Number(rates[sourceCurrency])
                : 1;

        const annotatedRooms = (roomsSource || []).map((hotelRoom, rIdx) => ({
            ...hotelRoom,
            selected_for_package: selections.some((item) => item.roomIndex === rIdx),
            price_added_to_package: selections.some((item) => item.roomIndex === rIdx),
            rates: (hotelRoom?.rates || []).map((hotelRate, tIdx) => {
                const match = selections.find(
                    (item) => item.roomIndex === rIdx && item.rateIndex === tIdx
                );
                if (!match) {
                    return {
                        ...hotelRate,
                        selected_for_package: false,
                        price_added_to_package: false,
                    };
                }

                const checkRate = findCheckRate(checkData, hotelRate?.rate_key) || firstCheckRate;
                const { newprice: rateConvertedPrice } = ConvertPrice(
                    Number(hotelRate?.price || 0),
                    hotelRate?.currency || sourceCurrency,
                    packageCur || sourceCurrency,
                    rates
                );

                return {
                    ...hotelRate,
                    price: Number(rateConvertedPrice),
                    currency: confirmedCurrency,
                    quantity: Number(match.qty || 1),
                    board_type: checkRate?.board_type ?? hotelRate?.board_type,
                    board_name: checkRate?.board_name ?? hotelRate?.board_name,
                    adults: match.adults ?? checkRate?.adults ?? hotelRate?.adults,
                    children: match.children ?? checkRate?.children ?? hotelRate?.children,
                    cancellation_policies:
                        checkRate?.cancellation_policies ?? hotelRate?.cancellation_policies,
                    payment_type: checkRate?.payment_type ?? hotelRate?.payment_type,
                    allotment: checkRate?.allotment ?? hotelRate?.allotment,
                    on_request: checkRate?.on_request ?? hotelRate?.on_request,
                    taxes: checkRate?.taxes ?? hotelRate?.taxes,
                    original_price: Number(checkRate?.price ?? hotelRate?.price ?? 0),
                    original_currency: sourceCurrency,
                    conversion_rate: conversionRate,
                    markup: checkRate?.markup ?? hotelRate?.markup ?? hotelRate?.metadata?.markup,
                    selected_for_package: true,
                    price_added_to_package: true,
                };
            }),
        }));

        const hotelWithCheckRates = {
            ...hotelFullDetails,
            id: String(checkData?.hotel_code || hotelFullDetails?.id || selectedHotel?.id || ''),
            name: checkData?.hotel_name || hotelFullDetails?.name || selectedHotel?.name || '',
            provider: checkRatesData?.provider || hotelFullDetails?.provider || selectedHotel?.provider || '',
            provider_code: String(
                checkData?.hotel_code
                || hotelFullDetails?.provider_code
                || hotelFullDetails?.id
                || selectedHotel?.id
                || ''
            ),
            star_rating:
                checkData?.stars
                ?? checkData?.category_code
                ?? hotelFullDetails?.star_rating
                ?? selectedHotel?.star_rating
                ?? selectedHotel?.metadata?.stars,
            images: hotelFullDetails?.images || selectedHotel?.images || [],
            main_images: hotelFullDetails?.main_images || selectedHotel?.main_images || [],
            all_images: hotelFullDetails?.all_images || apiDetails?.all_images || selectedHotel?.all_images || [],
            first_image:
                hotelFullDetails?.first_image
                || hotelFullDetails?.images?.[0]
                || selectedHotel?.first_image
                || selectedHotel?.images?.[0]
                || null,
            location: {
                ...(selectedHotel?.location || {}),
                ...(hotelFullDetails?.location || {}),
                address:
                    checkData?.address
                    || hotelFullDetails?.location?.address
                    || hotelFullDetails?.address
                    || apiDetails?.address
                    || selectedHotel?.location?.address
                    || null,
                latitude: checkData?.latitude ?? hotelFullDetails?.location?.latitude ?? null,
                longitude: checkData?.longitude ?? hotelFullDetails?.location?.longitude ?? null,
                destination_code:
                    checkData?.destination_code ?? hotelFullDetails?.location?.destination_code ?? null,
                destination_name:
                    checkData?.destination_name
                    || hotelFullDetails?.location?.destination_name
                    || hotelFullDetails?.city
                    || cityName
                    || null,
                zone_code: checkData?.zone_code ?? hotelFullDetails?.location?.zone_code ?? null,
                zone_name: checkData?.zone_name ?? hotelFullDetails?.location?.zone_name ?? null,
            },
            facilities: hotelFullDetails?.facilities || apiDetails?.facilities || selectedHotel?.facilities || [],
            nights,
            price: confirmedPrice,
            currency: confirmedCurrency,
            city:
                checkData?.destination_name
                || hotelFullDetails?.city
                || cityName
                || selectedHotel?.city
                || '',
            rooms: annotatedRooms,
            selected_room_id: String(firstRoom?.id || firstRoom?.code || firstRate?.rate_key || ''),
            selected_room_index: Number(firstSelection?.roomIndex ?? 0),
            selected_rate_index: Number(firstSelection?.rateIndex ?? 0),
            selected_rate_key: String(firstRate?.rate_key || firstCheckRate?.rate_key || ''),
            selected_room_units: selectedRoomUnits,
            check_in: checkData?.check_in || stayHotel?.check_in || null,
            check_out: checkData?.check_out || stayHotel?.check_out || null,
            description:
                hotelFullDetails?.description
                || apiDetails?.description
                || selectedHotel?.description
                || '',
            check_rates_request: { data: checkData },
        };
        const dummyPayload = {
            package_id: pkg?.package_id || '',
            failed_service: failedService
                || (String(cityName || '').toLowerCase().includes('madinah')
                    ? 'madinah_hotel'
                    : 'makkah_hotel'),
            hotel: hotelWithCheckRates,
            room_index: Number(firstSelection?.roomIndex ?? 0),
            rate_index: Number(firstSelection?.rateIndex ?? 0),
            selected_room_units: selectedRoomUnits,
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/revise/apply`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(dummyPayload),
            });
            const data = await response.json().catch(() => null);
            const reviseStatus = String(data?.Content?.status || '').trim().toLowerCase();
            if (reviseStatus === 'expired') {
                const message = data?.Content?.message
                    || data?.Description
                    || data?.Title
                    || 'Session expired. Redirecting to home page...';
                setApplyError(message);
                notifications.show({
                    title: 'Session expired',
                    message,
                    color: 'red',
                    autoClose: 2000,
                });
                setTimeout(() => {
                    router.push('/');
                }, 2000);
                return { success: false, expired: true, data };
            }

            return { success: true, data: data || dummyPayload };
        } catch (err) {
            return { success: true, data: dummyPayload };
        }
    };

    const handleConfirm = async () => {
        if (!selectedHotel || applying) return;

        if (!selectedRooms.length) {
            setApplyError('Please select at least one room to continue.');
            return;
        }

        if (selectedQtyTotal < requiredRoomCount) {
            setApplyError(`Please select ${requiredRoomCount} room${requiredRoomCount > 1 ? 's' : ''} for your booking.`);
            return;
        }

        setApplying(true);
        setApplyError(null);

        try {
            const checkRatesRequest = buildCheckRatesRequest(selectedRooms);
            const checkRatesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/check-rates`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(checkRatesRequest),
            });
            const checkRatesData = await checkRatesResponse.json();

            const isCheckRatesSuccess = Boolean(
                checkRatesData?.success === true
                || checkRatesData?.Success === true
            );

            if (!isCheckRatesSuccess) {
                const message = checkRatesData?.message
                    || checkRatesData?.Description
                    || checkRatesData?.Title
                    || 'Selected room is no longer available. Please choose another option.';
                setApplyError(message);
                notifications.show({
                    title: 'Rate check failed',
                    message,
                    color: 'red',
                    autoClose: 3500,
                });
                return;
            }

            const dummyResult = await callDummyReviseApi({
                selections: selectedRooms,
                checkRatesData,
            });

            if (!dummyResult?.success) {
                if (dummyResult?.expired) return;
                setApplyError('Failed to apply hotel revision. Please try again.');
                return;
            }

            const nextPayload = {
                roomIndex: selectedRooms[0]?.roomIndex,
                rateIndex: selectedRooms[0]?.rateIndex,
                selectedRooms,
                checkRatesData,
                reviseApplyData: dummyResult.data,
            };

            setProceedPayload(nextPayload);
            setReviseSummary(dummyResult?.data?.Content || null);

            setTimeout(() => {
                summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        } catch (err) {
            console.error('Apply selected room error:', err);
            const message = err?.message || 'Unable to apply selected room. Please try again.';
            setApplyError(message);
            notifications.show({
                title: 'Error',
                message,
                color: 'red',
                autoClose: 3500,
            });
        } finally {
            setApplying(false);
        }
    };

    const cityLabel = cityName === 'Madinah' ? 'Madinah Hotel' : 'Makkah Hotel';

    const summaryPricing = reviseSummary?.pricing || {};
    const summaryCurrency = summaryPricing?.currency;
    const payingNowAmount = (() => {
        const servicePriceKeys = [
            ['flight', 'flight_price'],
            ['makkah_hotel', 'makkah_hotel_price'],
            ['madinah_hotel', 'madinah_hotel_price'],
            ['transfer', 'transfer_price'],
            ['visa', 'visa_price'],
        ];
        const activeFailedService = reviseSummary?.failed_service || failedService;
        const failedServiceIndex = servicePriceKeys.findIndex(
            ([service]) => service === activeFailedService,
        );

        if (failedServiceIndex === -1) return 0;

        return servicePriceKeys
            .slice(failedServiceIndex)
            .reduce((total, [, priceKey]) => total + Number(summaryPricing?.[priceKey] || 0), 0);
    })();
    const totalPackageAmount = Number(summaryPricing?.total_price || 0);

    const handleProceedForThis = async () => {
        if (!proceedPayload || retryingPayment) return;

        const domain = window.location.origin;
        const packageId = pkg?.package_id || reviseSummary?.package_id;

        if (!packageId) {
            notifications.show({
                title: 'Error',
                message: 'Package ID missing. Please refresh and try again.',
                color: 'red',
                autoClose: 3500,
            });
            return;
        }

        setRetryingPayment(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/revise/retry-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    package_id: packageId,
                    success_url: `${domain}/umrah-getaway/${packageId}`,
                    cancel_url: `${domain}/umrah-getaway/checkout?packageId=${packageId}`,
                    booking_source: 'website',
                }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !(data?.Success || data?.success)) {
                const message = data?.Description
                    || data?.message
                    || data?.Title
                    || 'Unable to continue payment. Please try again.';
                notifications.show({
                    title: 'Payment retry failed',
                    message,
                    color: 'red',
                    autoClose: 3500,
                });
                return;
            }

            const checkoutUrl = data?.Content?.checkout_url || data?.checkout_url;
            if (!checkoutUrl) {
                notifications.show({
                    title: 'Payment retry failed',
                    message: 'Checkout URL not found in response.',
                    color: 'red',
                    autoClose: 3500,
                });
                return;
            }

            onConfirm?.(proceedPayload);
            router.push(checkoutUrl);
        } catch (error) {
            notifications.show({
                title: 'Network error',
                message: error?.message || 'Unable to retry payment right now.',
                color: 'red',
                autoClose: 3500,
            });
        } finally {
            setRetryingPayment(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <div className={styles.confirmHeader}>
                    <div className={styles.confirmIcon}><HiOutlineBuildingOffice2 size={18} /></div>
                    <Text fw={700} size="lg">Select Room &amp; Meal Plan</Text>
                </div>
            }
            size="90%"
            radius="lg"
            centered
            lockScroll
            closeOnClickOutside={false}
            closeOnEscape={false}
            transitionProps={{ transition: 'pop', duration: 200 }}
            zIndex={350}
            classNames={{
                content: styles.revisionModalContent,
                body: styles.revisionModalBody,
            }}
        >
            {loading && (
                <div className={styles.stateBox}>
                    <Loader size="md" color="teal" />
                    <p className={styles.stateText}>Loading hotel details…</p>
                </div>
            )}

            {!loading && error && (
                <div className={styles.errorBox} style={{ marginBottom: 12 }}>
                    <MdErrorOutline size={18} />
                    <span>{error}</span>
                </div>
            )}

            {!loading && detail && (
                <div className={styles.revisionDetailWrap}>

                    <div className={detailStyle.hotelInfoCard}>
                        <div className={detailStyle.hotelInfoHeader}>
                            <span className={detailStyle.cityBadge}>{cityLabel}</span>
                            <h2 className={detailStyle.hotelName}>{detail?.name}</h2>
                            {detail?.location?.address && (
                                <p className={detailStyle.hotelAddress}>
                                    <FaLocationDot size={14} />
                                    <span>{detail.location.address}</span>
                                </p>
                            )}
                        </div>

                        <div className={detailStyle.hotelStatsBar}>
                            <div className={detailStyle.hotelStatChip}>
                                <FaMoon size={14} color="#E7247A" />
                                <div>
                                    <span className={detailStyle.hotelStatLabel}>Stay</span>
                                    <span className={detailStyle.hotelStatValue}>
                                        {nights} {nights === 1 ? 'Night' : 'Nights'}
                                    </span>
                                </div>
                            </div>
                            {detail?.check_in && (
                                <div className={detailStyle.hotelStatChip}>
                                    <FaCalendarAlt size={14} color="#E7247A" />
                                    <div>
                                        <span className={detailStyle.hotelStatLabel}>Check-in</span>
                                        <span className={detailStyle.hotelStatValue}>
                                            {moment(detail.check_in).format('DD MMM YYYY')}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {detail?.check_out && (
                                <div className={detailStyle.hotelStatChip}>
                                    <FaCalendarAlt size={14} color="#E7247A" />
                                    <div>
                                        <span className={detailStyle.hotelStatLabel}>Check-out</span>
                                        <span className={detailStyle.hotelStatValue}>
                                            {moment(detail.check_out).format('DD MMM YYYY')}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {detail?.star_rating && !isNaN(parseFloat(detail.star_rating)) && (
                                <div className={detailStyle.hotelStatChip}>
                                    <FaStar size={14} color="#E7247A" />
                                    <div>
                                        <span className={detailStyle.hotelStatLabel}>Rating</span>
                                        <span className={detailStyle.hotelStatValue}>
                                            {parseFloat(detail.star_rating)}-Star
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {plainDescription && (
                            <div className={detailStyle.descriptionSection}>
                                <h3 className={detailStyle.descriptionTitle}>About this hotel</h3>
                                {isHtmlDescription ? (
                                    <div
                                        ref={descriptionContentRef}
                                        className={`${detailStyle.descriptionHtml} ${descExpanded ? '' : detailStyle.descriptionCollapsed}`}
                                        dangerouslySetInnerHTML={{ __html: normalizedHtmlDescription }}
                                    />
                                ) : descExpanded ? (
                                    <p ref={descriptionContentRef} className={detailStyle.descriptionText}>
                                        {description}
                                    </p>
                                ) : (
                                    <p
                                        ref={descriptionContentRef}
                                        className={`${detailStyle.descriptionText} ${detailStyle.descriptionCollapsed}`}
                                    >
                                        {plainDescription}
                                    </p>
                                )}
                                {showReadMore && (
                                    <button
                                        type="button"
                                        className={detailStyle.readMoreBtn}
                                        onClick={() => setDescExpanded((prev) => !prev)}
                                    >
                                        {descExpanded ? 'Read less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={detailStyle.roomsSection}>
                        <h5 className={detailStyle.roomsSectionTitle}>
                            Rooms Available
                            {requiredRoomCount > 1 ? ` — Select ${requiredRoomCount} (${selectedQtyTotal} selected)` : ''}
                        </h5>
                        {(roomsSource || []).map((room, roomIndex) => (
                            <div key={room?.id || roomIndex} className={detailStyle.roomCard}>
                                <div className="row g-0">
                                    <div className={`col-md-3 ${detailStyle.roomImageCol}`}>
                                        <p className={detailStyle.roomName}>{room.name || `Room ${roomIndex + 1}`}</p>
                                        <Image
                                            className={detailStyle.roomImg}
                                            src={
                                                room?.images?.length > 0
                                                    ? (room.images[0]?.url || room.images[0])
                                                    : '/images/noimage.png'
                                            }
                                            height={130}
                                            width={300}
                                            alt={`Room ${roomIndex + 1}`}
                                            unoptimized
                                        />
                                        {room?.amenities?.length > 0 && (
                                            <div className={detailStyle.amenitiesWrap}>
                                                <button
                                                    type="button"
                                                    className={detailStyle.seeAmenitiesBtn}
                                                    onClick={() =>
                                                        setExpandedAmenities((prev) => ({
                                                            ...prev,
                                                            [roomIndex]: !prev[roomIndex],
                                                        }))
                                                    }
                                                >
                                                    {expandedAmenities[roomIndex]
                                                        ? 'Hide amenities'
                                                        : `See amenities (${room.amenities.length})`}
                                                </button>
                                                {expandedAmenities[roomIndex] && (
                                                    <div className={detailStyle.amenitiesList}>
                                                        {room.amenities.slice(0, 10).map((facility, idx) => (
                                                            <span key={idx} className={detailStyle.amenityTag}>
                                                                <FaCheck size={9} />{' '}
                                                                {typeof facility === 'string'
                                                                    ? facility
                                                                    : facility?.description?.content || facility?.name || ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`col-md-6 ${detailStyle.mealPlanCol}`}>
                                        <div className={detailStyle.mealPlanHeader}>
                                            <FaUtensils size={13} />
                                            <span>Meal Plan</span>
                                        </div>
                                        <div className={detailStyle.mealPlanList}>
                                            {(() => {
                                                const ratesList = room?.rates || [];
                                                const hasMoreRates = ratesList.length > RATES_DEFAULT_COUNT;
                                                const isRatesExpanded = expandedRoomRates[roomIndex];
                                                const visibleRateIndices = getVisibleRateIndices(roomIndex, ratesList);

                                                return (
                                                    <>
                                                        {visibleRateIndices.map((rateIndex) => {
                                                            const rate = ratesList[rateIndex];
                                                            const selected = findSelected(roomIndex, rateIndex);
                                                            const isSelected = Boolean(selected);
                                                            const allotment = Math.max(1, Number(rate?.allotment) || 1);
                                                            const qty = Math.min(Number(selected?.qty || 1), allotment);
                                                            const rateCurrency =
                                                                rate?.original_currency
                                                                || rate?.currency
                                                                || selectedHotel?.metadata?.currency;
                                                            const cancellation = getActiveCancellationMessage(
                                                                rate?.cancellation_policies
                                                            );

                                                            return (
                                                                <div
                                                                    key={rateIndex}
                                                                    className={`${detailStyle.mealOption} ${isSelected ? detailStyle.mealOptionSelected : ''}`}
                                                                    onClick={() => {
                                                                        if (!isSelected) handleRateChange(room, rate, roomIndex, rateIndex);
                                                                    }}
                                                                    role={!isSelected ? 'button' : undefined}
                                                                    aria-pressed={isSelected}
                                                                >
                                                                    <div className={detailStyle.mealOptionMain}>
                                                                        <span className={detailStyle.mealOptionRadio} aria-hidden="true">
                                                                            {isSelected && (
                                                                                <span className={detailStyle.mealOptionRadioDot} />
                                                                            )}
                                                                        </span>
                                                                        <div className={detailStyle.mealOptionInfo}>
                                                                            <span className={detailStyle.mealOptionName}>
                                                                                {rate?.board_name || 'Room Only'}
                                                                            </span>
                                                                            <div className={detailStyle.mealOptionGuests}>
                                                                                <span className={detailStyle.guestChip}>
                                                                                    <FaUser size={9} />
                                                                                    {rate?.adults || 0} Adult
                                                                                    {(rate?.adults || 0) !== 1 ? 's' : ''}
                                                                                </span>
                                                                                <span className={detailStyle.guestChip}>
                                                                                    <FaChild size={9} />
                                                                                    {Array.isArray(rate?.children)
                                                                                        ? rate.children.length
                                                                                        : (rate?.children || 0)} Child
                                                                                    {(Array.isArray(rate?.children)
                                                                                        ? rate.children.length
                                                                                        : (rate?.children || 0)) !== 1 ? 'ren' : ''}
                                                                                </span>
                                                                            </div>
                                                                            <span
                                                                                className={`${styles.revisionCancelBadge} ${cancellation.type === 'free'
                                                                                    ? styles.revisionCancelFree
                                                                                    : cancellation.type === 'fee'
                                                                                        ? styles.revisionCancelFee
                                                                                        : styles.revisionCancelNonRefundable
                                                                                    }`}
                                                                            >
                                                                                {cancellation.type === 'fee' ? (
                                                                                    <>
                                                                                        {cancellation.message}{' '}
                                                                                        <PriceDisplay
                                                                                            price={cancellation.amount}
                                                                                            currency={rateCurrency}
                                                                                        />
                                                                                    </>
                                                                                ) : (
                                                                                    cancellation.message
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={detailStyle.mealOptionActions}>
                                                                        <span className={detailStyle.mealOptionPrice}>
                                                                            {(() => {
                                                                                const displayPrice = Number(
                                                                                    rate?.original_price != null && rate.original_price !== ''
                                                                                        ? rate.original_price
                                                                                        : rate?.price || 0
                                                                                );
                                                                                const perNightPrice = displayPrice / (nights > 0 ? nights : 1);
                                                                                return (
                                                                                    <>
                                                                                        {isSelected ? 'Included' : 'Room Price'} :{' '}
                                                                                        <PriceDisplay
                                                                                            currency={rateCurrency}
                                                                                            price={displayPrice}
                                                                                        />
                                                                                        <br />
                                                                                        <span className={detailStyle.mealOptionPerNight}>
                                                                                            Per Night :{' '}
                                                                                            <PriceDisplay
                                                                                                currency={rateCurrency}
                                                                                                price={perNightPrice}
                                                                                            />
                                                                                        </span>
                                                                                        <br />
                                                                                        <span className={detailStyle.mealOptionVatNote}>
                                                                                            Vat and Taxes included
                                                                                        </span>
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <div className={detailStyle.mealOptionControls}>
                                                                                <select
                                                                                    className={`form-select form-select-sm ${detailStyle.qtySelect}`}
                                                                                    value={qty}
                                                                                    disabled={applying}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    onChange={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleQuantityChange(
                                                                                            roomIndex,
                                                                                            rateIndex,
                                                                                            e.target.value,
                                                                                            allotment
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    {Array.from({ length: allotment }, (_, i) => i + 1).map((value) => (
                                                                                        <option key={value} value={value}>{value}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <button
                                                                                    type="button"
                                                                                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                                                                    disabled={applying}
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
                                                                className={detailStyle.readMoreBtn}
                                                                onClick={() =>
                                                                    setExpandedRoomRates((prev) => ({
                                                                        ...prev,
                                                                        [roomIndex]: !prev[roomIndex],
                                                                    }))
                                                                }
                                                            >
                                                                {isRatesExpanded
                                                                    ? 'View less'
                                                                    : `View more (${ratesList.length - RATES_DEFAULT_COUNT} more)`}
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className={`col-md-3 ${detailStyle.priceCol}`}>
                                        {(() => {
                                            const roomSelections = selectedRooms.filter((item) => item.roomIndex === roomIndex);
                                            const hasSelection = roomSelections.length > 0;
                                            const roomTotal = roomSelections.reduce((sum, item) => {
                                                const rate = room.rates?.[item.rateIndex];
                                                return sum + Number(rate?.price || 0) * Number(item.qty || 1);
                                            }, 0);
                                            const displayRate = hasSelection
                                                ? room.rates?.[roomSelections[0].rateIndex]
                                                : room.rates?.[0];

                                            return (
                                                <>
                                                    <span className={detailStyle.roompricediffup}>Room Total</span>
                                                    <span className={detailStyle.roomPriceMain} style={{ color: '#E7247A' }}>
                                                        <PriceDisplay
                                                            currency={
                                                                displayRate?.original_currency
                                                                || displayRate?.currency
                                                                || selectedHotel?.metadata?.currency
                                                            }
                                                            price={hasSelection ? roomTotal : Number(displayRate?.price || 0)}
                                                        />
                                                    </span>
                                                    <span className="small" style={{ fontSize: '12px' }}>
                                                        VAT and Taxes included
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={`btn ${detailStyle.selectRoomBtn} ${hasSelection ? 'btn-success' : 'btn-outline-success'}`}
                                                        disabled={applying}
                                                        onClick={() => {
                                                            if (!hasSelection) {
                                                                const firstRate = room.rates?.[0];
                                                                if (firstRate) handleRateChange(room, firstRate, roomIndex, 0);
                                                            } else {
                                                                handleConfirm();
                                                            }
                                                        }}
                                                    >
                                                        {hasSelection
                                                            ? (applying ? 'Checking…' : 'Confirm & Continue')
                                                            : 'Select Room'}
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
                            <div className={detailStyle.facilitiesSection}>
                                <div className={detailStyle.facilitiesGrid}>
                                    <div className={detailStyle.sectionLabel}>
                                        <span>Hotel Facilities</span>
                                        <div className={detailStyle.sectionLine} />
                                    </div>
                                    <div className="row row-cols-2 row-cols-sm-4">
                                        {visibleFacilities.map((amenity, index) => (
                                            <div key={index} className="col-12 col-sm-6 col-md-4 col-lg-3 mt-2">
                                                <div className={detailStyle.facilityTile}>
                                                    <div className={detailStyle.facilityIcon}>
                                                        <GiCheckMark size={11} color="#16a34a" />
                                                    </div>
                                                    {typeof amenity === 'string' ? amenity : amenity?.name || ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {hasMoreFacilities && (
                                        <button
                                            type="button"
                                            className={detailStyle.readMoreBtn}
                                            onClick={() => setFacilitiesExpanded((prev) => !prev)}
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

                    {reviseSummary && (
                        <div ref={summaryRef} className={styles.reviseSummaryCard}>
                            <div className={styles.reviseSummaryHeader}>
                                <div>
                                    <h4 className={styles.reviseSummaryTitle}>Updated Payment Summary</h4>
                                    <p className={styles.reviseSummaryText}>
                                        Review your new total and proceed to payment.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.reviseSummaryGrid}>
                                <div className={styles.reviseSummaryItem}>
                                    <span>Total Package Amount</span>
                                    <strong>
                                        <PriceDisplay
                                            price={totalPackageAmount}
                                            currency={summaryCurrency}
                                        />
                                    </strong>
                                </div>

                                <div className={styles.reviseSummaryItem}>
                                    <span>Paying Now</span>
                                    <strong>
                                        <PriceDisplay
                                            price={payingNowAmount}
                                            currency={summaryCurrency}
                                        />
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.reviseSummaryActions}>
                                <button
                                    type="button"
                                    className={styles.applyBtn}
                                    disabled={!proceedPayload || retryingPayment}
                                    onClick={handleProceedForThis}
                                >
                                    <FiCheckCircle size={15} /> {retryingPayment ? 'Processing...' : 'Proceed For This'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.revisionFooterActions}>
                        {applyError && (
                            <div className={styles.errorBox} style={{ width: '100%', marginBottom: 4 }}>
                                <MdErrorOutline size={16} />
                                <span>{applyError}</span>
                            </div>
                        )}
                        {!reviseSummary ? (
                            <button
                                type="button"
                                className={styles.applyBtn}
                                onClick={handleConfirm}
                                disabled={applying || !selectedRooms.length}
                            >
                                <FiCheckCircle size={15} />
                                {applying
                                    ? 'Checking…'
                                    : `Confirm ${selectedQtyTotal || 0} Room${selectedQtyTotal === 1 ? '' : 's'} & Continue`}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={applying || retryingPayment}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
