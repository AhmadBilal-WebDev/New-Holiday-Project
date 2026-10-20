'use client'
import React, { useState } from 'react'
import { useUmrahPackage, normalizeHotelSelection } from '@/contexts/UmrahPackageContext';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { useCurrency } from '@/util/currency';
import { ConvertPrice } from '../Currency/ConvertPrice';
import {
    getRateSeqNo,
    sortSelectedRoomsBySeq,
    stampAndSortRooms,
} from '@/components/Hotels/utils/roomSequence';

function childrenCount(value) {
    if (Array.isArray(value)) return value.length;
    return Number(value || 0);
}

function isHotelstonProvider(hotel) {
    return String(hotel?.provider || '').toLowerCase() === 'hotelston';
}

function applyHotelRoomSelections(hotel, selection) {
    if (!hotel?.rooms) return { hotel, units: [], totalConverted: 0 };

    const isHotelston = isHotelstonProvider(hotel);
    let selectedRooms = normalizeHotelSelection(selection, hotel).selectedRooms.map((item) => {
        const room = hotel.rooms?.[item.roomIndex];
        const rate = room?.rates?.[item.rateIndex];
        const seqNo = item.seqNo ?? item.searchRoomIndex ?? getRateSeqNo(rate, room);
        return {
            ...item,
            ratekey: item.ratekey || rate?.rate_key || '',
            roomTypeId: item.roomTypeId || rate?.metadata?.room_type_id || room?.id || '',
            ...(isHotelston && seqNo !== null
                ? { seqNo, searchRoomIndex: seqNo }
                : {}),
        };
    });

    if (isHotelston) {
        selectedRooms = sortSelectedRoomsBySeq(selectedRooms);
        hotel.rooms = stampAndSortRooms(hotel.rooms, selectedRooms);

        // Rematch indices after rooms/rates were reordered by sequence
        selectedRooms = sortSelectedRoomsBySeq(selectedRooms.map((item) => {
            const seqNo = item.seqNo ?? item.searchRoomIndex;
            let matchedRoomIndex = item.roomIndex;
            let matchedRateIndex = item.rateIndex;

            hotel.rooms.forEach((room, roomIdx) => {
                (room?.rates || []).forEach((rate, rateIdx) => {
                    const rateSeq = getRateSeqNo(rate, room);
                    const sameSeq = seqNo == null
                        ? true
                        : (rateSeq !== null && Number(rateSeq) === Number(seqNo));
                    const sameKey = !item.ratekey
                        || String(rate?.rate_key || '') === String(item.ratekey);
                    const sameType = !item.roomTypeId
                        || String(rate?.metadata?.room_type_id || room?.id || '') === String(item.roomTypeId);

                    if (sameSeq && sameKey && sameType) {
                        matchedRoomIndex = roomIdx;
                        matchedRateIndex = rateIdx;
                    }
                });
            });

            return {
                ...item,
                roomIndex: matchedRoomIndex,
                rateIndex: matchedRateIndex,
            };
        }));
    }

    const selectedKeys = new Set(selectedRooms.map((item) => `${item.roomIndex}-${item.rateIndex}`));

    hotel.rooms.forEach((room, roomIdx) => {
        const roomHasSelection = selectedRooms.some((item) => item.roomIndex === roomIdx);
        if (roomHasSelection) {
            room.selected_for_package = true;
            room.price_added_to_package = true;
        } else {
            delete room.selected_for_package;
            delete room.price_added_to_package;
        }

        room.rates.forEach((rate, rateIdx) => {
            const isSelectedRate = selectedKeys.has(`${roomIdx}-${rateIdx}`);
            const match = selectedRooms.find((item) => item.roomIndex === roomIdx && item.rateIndex === rateIdx);
            if (isSelectedRate && match) {
                rate.selected_for_package = true;
                rate.price_added_to_package = true;
                rate.quantity = Number(match.qty || 1);
                if (isHotelston) {
                    const seqNo = match.seqNo ?? match.searchRoomIndex ?? getRateSeqNo(rate, room);
                    if (seqNo !== null) {
                        rate.metadata = {
                            ...(rate.metadata || {}),
                            seq_no: seqNo,
                        };
                    }
                }
            } else {
                delete rate.selected_for_package;
                delete rate.price_added_to_package;
                delete rate.quantity;
            }
        });
    });

    const first = selectedRooms[0];
    const firstRoom = first ? hotel.rooms[first.roomIndex] : null;
    const firstRate = firstRoom?.rates?.[first?.rateIndex];
    hotel.selected_room_index = first?.roomIndex ?? null;
    hotel.selected_rate_index = first?.rateIndex ?? null;
    hotel.selected_room_id = firstRoom?.id || '';
    hotel.selected_rate_key = firstRate?.rate_key || '';
    hotel.selected_room_name = firstRoom?.name || '';
    hotel.selected_board_name = firstRate?.board_name || '';

    return { hotel, selectedRooms, firstRoom, firstRate };
}

function buildSelectedRoomUnits(hotel, selectedRooms, packageCurrency, rates) {
    const isHotelston = isHotelstonProvider(hotel);
    const orderedRooms = isHotelston
        ? sortSelectedRoomsBySeq(selectedRooms)
        : (selectedRooms || []);

    return orderedRooms.reduce((units, item) => {
        const room = hotel?.rooms?.[item.roomIndex];
        const rate = room?.rates?.[item.rateIndex];
        if (!rate) return units;
        const qty = Math.max(1, Number(item.qty || 1));
        const unitPrice = Number(rate?.price || 0);
        const conversion = ConvertPrice(unitPrice * qty, rate?.currency, packageCurrency, rates);
        const seqNo = item.seqNo ?? item.searchRoomIndex ?? getRateSeqNo(rate, room);
        units.push({
            rateKey: String(rate?.rate_key || ''),
            roomIndex: item.roomIndex,
            rateIndex: item.rateIndex,
            quantity: qty,
            adults: Number(rate?.adults || 0),
            children: childrenCount(rate?.children),
            price: parseFloat(conversion.newprice || 0),
            currency: conversion.newcurrency || packageCurrency || rate?.currency,
            boardName: rate?.board_name || '',
            roomType: room?.name || '',
            ...(isHotelston && seqNo !== null
                ? { seqNo, searchRoomIndex: seqNo }
                : {}),
        });
        return units;
    }, []);
}

export default function CheckoutButton() {
    const { packageData, selections } = useUmrahPackage();
    // const [rates, setRates] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    
    const fetchCurrencyRates = async () => {
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.NEXT_PUBLIC_CURRENCY_KEY}/latest/${packageData?.currency}`);
        const data = await response.json();
        return data.conversion_rates  || {[packageData?.currency] : 1};
    }
    // Handle proceed to checkout with API call
    const handleProceedToCheckout = async () => {
        setIsLoading(true);
       const rates = await fetchCurrencyRates();
        try {
            // Deep clone packageData to avoid mutating the original
            const updatedPackageData = JSON.parse(JSON.stringify(packageData));

            // Update Makkah Hotel flags based on selection
            let makkahHotelPrice = 0;
            let makkahUnits = [];
            if (updatedPackageData.makkah_hotel?.rooms) {
                const applied = applyHotelRoomSelections(
                    updatedPackageData.makkah_hotel,
                    selections.makkahHotel
                );
                makkahUnits = buildSelectedRoomUnits(
                    updatedPackageData.makkah_hotel,
                    applied.selectedRooms,
                    packageData?.currency,
                    rates
                );
                updatedPackageData.makkah_hotel.selected_room_units = makkahUnits;
                makkahHotelPrice = makkahUnits.reduce((sum, unit) => sum + Number(unit.price || 0), 0);
                updatedPackageData.makkah_hotel.price = makkahHotelPrice;
            }

            // Update Madinah Hotel flags based on selection
            let madinahHotelPrice = 0;
            let madinahUnits = [];
            if (updatedPackageData.madinah_hotel?.rooms) {
                const applied = applyHotelRoomSelections(
                    updatedPackageData.madinah_hotel,
                    selections.madinahHotel
                );
                madinahUnits = buildSelectedRoomUnits(
                    updatedPackageData.madinah_hotel,
                    applied.selectedRooms,
                    packageData?.currency,
                    rates
                );
                updatedPackageData.madinah_hotel.selected_room_units = madinahUnits;
                madinahHotelPrice = madinahUnits.reduce((sum, unit) => sum + Number(unit.price || 0), 0);
                updatedPackageData.madinah_hotel.price = madinahHotelPrice;
            }

            // Calculate total count
            const totalCount = updatedPackageData.original_request.adult + updatedPackageData.original_request.child;
            // Calculate Flight Price based on selection
            let flightPrice = 0;

            if (selections.customFlight) {
                // User selected a custom flight — convert pricing to package currency
                const flightPricing = selections.customFlight.pricing || {};
                const originalCurrency = flightPricing.currency;
                const originalTotalAmount = flightPricing.total_amount;
                const conversionFlight = ConvertPrice(originalTotalAmount, originalCurrency, packageData?.currency, rates);
                flightPrice = parseFloat(conversionFlight.newprice || 0);
                const conversionRate = (originalCurrency && rates?.[originalCurrency] != null)
                    ? rates[originalCurrency]
                    : 1;

                updatedPackageData.flight = {
                    ...selections.customFlight,
                    pricing: {
                        ...flightPricing,
                        original_currency: originalCurrency,
                        original_price: parseFloat(originalTotalAmount) || 0,
                        original_total_amount: flightPricing.original_total_amount ?? String(originalTotalAmount),
                        currency: packageData?.currency,
                        total_amount: String(flightPrice),
                        conversion_rate: conversionRate,
                    },
                };
            } else if (updatedPackageData.flight) {
                // Use default flight price
                const conversionFlight = ConvertPrice(updatedPackageData.pricing?.flight_price, updatedPackageData.pricing?.currency, packageData?.currency, rates);
                flightPrice = parseFloat(conversionFlight.newprice || 0);
            }

            // Calculate Transfer Price based on selection
            let transferPrice = 0;
            let selectedTransfer = null;
            if (selections.otherServices?.transfer_selected_id !== null && selections.otherServices?.transfer_selected_id !== undefined) {
                selectedTransfer = updatedPackageData.transfers?.find(t => t.id === Number(selections.otherServices.transfer_selected_id));
                const conversionTransfer = ConvertPrice(selectedTransfer?.fare, selectedTransfer.currency, packageData?.currency, rates);
                transferPrice = parseFloat(conversionTransfer.newprice || 0);
            }

            // Calculate Visa Price based on selection
            let visaPrice = 0;
            let selectedVisa = null;
            if (selections.otherServices?.visa_selected_id !== null && selections.otherServices?.visa_selected_id !== undefined) {
                selectedVisa = updatedPackageData.visas?.find(v => v.id === Number(selections.otherServices.visa_selected_id));
                const conversionTransfer = ConvertPrice(selectedVisa?.visa_price, selectedVisa.currency, packageData?.currency, rates);
                visaPrice = Number(conversionTransfer?.newprice || 0) * Number(totalCount);
            }

            // Calculate New Total Price
            const newTotalPrice = makkahHotelPrice + madinahHotelPrice + flightPrice + transferPrice + visaPrice;
            const pricePerPerson = newTotalPrice / totalCount;

            // Update package data with new pricing
            updatedPackageData.total_price = newTotalPrice;

            const requestData = {
                ...updatedPackageData,
                transfer_selected_id: selections.otherServices?.transfer_selected_id,
                visa_selected_id: selections.otherServices?.visa_selected_id,
                transfer: selectedTransfer,
                visa: selectedVisa,
                price_per_person: Number(pricePerPerson).toFixed(2),
                pricing: {
                    ...updatedPackageData.pricing,
                    makkah_hotel_price: makkahHotelPrice,
                    madinah_hotel_price: madinahHotelPrice,
                    flight_price: flightPrice,
                    transfer_price: transferPrice,
                    visa_price: visaPrice,
                    total_price: Number(newTotalPrice).toFixed(2),
                    price_per_person: Number(pricePerPerson).toFixed(2)
                }
            };
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/tempCart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.Success) {
                sessionStorage.removeItem('umrah_package_selections');
                router.push('/umrah-getaway/checkout?packageId=' + result.Content.package_id);
            } else {
                console.error('Failed to add to cart:', result);
                notifications.show({
                    title: 'Error',
                    message: result.Message || 'Failed to add to cart. Please try again.',
                    color: 'red'
                });
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('An error occurred while processing your request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className='text-end mt-4'>
            <button
                className='btn btn-success px-5'
                onClick={handleProceedToCheckout}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                    </>
                ) : (
                    'Proceed to Checkout'
                )}
            </button>
        </div>
    )
}
