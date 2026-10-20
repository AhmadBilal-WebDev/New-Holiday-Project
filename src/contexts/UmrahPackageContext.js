'use client'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UmrahPackageContext = createContext(undefined);

const SESSION_STORAGE_KEY = 'umrah_package_selections';

const emptyHotelSelection = () => ({
    roomIndex: null,
    rateIndex: null,
    selectedRooms: [],
});

function toHotelSelection(selectedRooms) {
    const rooms = Array.isArray(selectedRooms) ? selectedRooms : [];
    return {
        roomIndex: rooms[0]?.roomIndex ?? null,
        rateIndex: rooms[0]?.rateIndex ?? null,
        selectedRooms: rooms,
    };
}

export function isPackageSelectedItem(item) {
    return item?.selected_for_package === true && item?.price_added_to_package === true;
}

export function getSelectedRoomUnitIndices(unit) {
    const roomIndex = unit?.roomIndex ?? unit?.room_index;
    const rateIndex = unit?.rateIndex ?? unit?.rate_index;
    const seqRaw = unit?.seqNo ?? unit?.searchRoomIndex ?? unit?.seq_no;
    const seqParsed = seqRaw === null || seqRaw === undefined || seqRaw === ''
        ? null
        : Number(seqRaw);
    return {
        roomIndex: roomIndex == null || roomIndex === '' ? null : Number(roomIndex),
        rateIndex: rateIndex == null || rateIndex === '' ? null : Number(rateIndex),
        qty: Math.max(1, Number((unit?.quantity ?? unit?.qty) || 1)),
        roomId: unit?.room_id ?? unit?.roomId ?? null,
        rateKey: unit?.rateKey ?? unit?.rate_key ?? null,
        seqNo: seqParsed !== null && !Number.isNaN(seqParsed) ? seqParsed : null,
    };
}

export function collectHotelSelectedRooms(hotel, fallbackSelection = {}) {
    const rooms = hotel?.rooms || [];
    const selected = [];
    const seen = new Set();
    const isHotelston = String(hotel?.provider || '').toLowerCase() === 'hotelston';

    const addSelection = (roomIndex, rateIndex, qty = 1, seqNo = null) => {
        if (roomIndex == null || rateIndex == null || roomIndex === '' || rateIndex === '') return;
        const parsedRoomIndex = Number(roomIndex);
        const parsedRateIndex = Number(rateIndex);
        if (!Number.isInteger(parsedRoomIndex) || !Number.isInteger(parsedRateIndex)) return;
        const room = rooms[parsedRoomIndex];
        const rate = room?.rates?.[parsedRateIndex];
        if (!rate) return;
        const key = `${parsedRoomIndex}-${parsedRateIndex}`;
        if (seen.has(key)) return;
        seen.add(key);

        let resolvedSeq = seqNo;
        if (resolvedSeq === null || resolvedSeq === undefined || resolvedSeq === '') {
            const fromRate = rate?.metadata?.seq_no ?? rate?.seq_no ?? room?.metadata?.seq_no;
            if (fromRate !== null && fromRate !== undefined && fromRate !== '') {
                const parsed = Number(fromRate);
                resolvedSeq = Number.isNaN(parsed) ? null : parsed;
            } else {
                resolvedSeq = null;
            }
        }

        selected.push({
            roomIndex: parsedRoomIndex,
            rateIndex: parsedRateIndex,
            qty: Math.max(1, Number(qty) || 1),
            ...(isHotelston && resolvedSeq !== null
                ? { seqNo: resolvedSeq, searchRoomIndex: resolvedSeq }
                : {}),
        });
    };

    const addFromUnits = () => {
        const units = hotel?.selected_room_units || [];
        units.forEach((unit) => {
            const { roomIndex, rateIndex, qty, roomId, rateKey, seqNo } = getSelectedRoomUnitIndices(unit);
            if (Number.isInteger(roomIndex) && Number.isInteger(rateIndex)) {
                addSelection(roomIndex, rateIndex, qty, seqNo);
                return;
            }

            // Fallback only when indices are missing. Match one room by id + flags
            // so duplicate rate_key / room_id rows are not all selected.
            rooms.some((room, rIdx) => {
                if (roomId != null && String(room?.id ?? room?.code) !== String(roomId)) return false;
                const rtIdx = (room?.rates || []).findIndex((rate) =>
                    (!rateKey || String(rate?.rate_key) === String(rateKey)) &&
                    isPackageSelectedItem(rate) &&
                    isPackageSelectedItem(room)
                );
                if (rtIdx < 0) return false;
                addSelection(rIdx, rtIdx, qty, seqNo);
                return true;
            });
        });
        return units.length > 0;
    };

    if (addFromUnits()) {
        return selected;
    }

    const contextRooms = fallbackSelection?.selectedRooms;
    if (Array.isArray(contextRooms) && contextRooms.length > 0) {
        contextRooms.forEach((item) =>
            addSelection(item.roomIndex, item.rateIndex, item.qty, item.seqNo ?? item.searchRoomIndex)
        );
        return selected;
    }

    rooms.forEach((room, roomIndex) => {
        const rates = room?.rates || [];
        const flaggedRates = rates
            .map((rate, rateIndex) => ({ rate, rateIndex }))
            .filter(({ rate }) => isPackageSelectedItem(rate) && isPackageSelectedItem(room));

        if (flaggedRates.length) {
            flaggedRates.forEach(({ rate, rateIndex }) => {
                addSelection(roomIndex, rateIndex, rate?.quantity ?? rate?.qty ?? 1);
            });
        } else if (isPackageSelectedItem(room)) {
            addSelection(roomIndex, 0, 1);
        }
    });

    if (!selected.length && fallbackSelection?.roomIndex != null && fallbackSelection?.rateIndex != null) {
        addSelection(fallbackSelection.roomIndex, fallbackSelection.rateIndex, 1);
    }

    return selected;
}

export function normalizeHotelSelection(selection, hotel) {
    if (Array.isArray(selection?.selectedRooms)) {
        return toHotelSelection(selection.selectedRooms);
    }
    if (selection?.roomIndex != null && selection?.rateIndex != null) {
        return toHotelSelection([{
            roomIndex: selection.roomIndex,
            rateIndex: selection.rateIndex,
            qty: 1,
        }]);
    }
    if (hotel) {
        return toHotelSelection(collectHotelSelectedRooms(hotel, selection));
    }
    return emptyHotelSelection();
}

export const UmrahPackageProvider = ({ children, packageId }) => {
    const [packageData, setPackageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selections, setSelections] = useState({
        packageId: null,
        makkahHotel: emptyHotelSelection(),
        madinahHotel: emptyHotelSelection(),
        flight: null,
        customFlight: null, // Store full custom flight object when user selects from CustomizeFlight
        otherServices: { transfer_selected_id: null, visa_selected_id: null }
    });

    // Load selections from session storage
    const loadSelectionsFromStorage = useCallback((currentPackageId) => {
        try {
            const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Only restore if it's the same package
                if (parsed.packageId === currentPackageId) {
                    return parsed;
                } else {
                    // Different package, clear old data
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    return null;
                }
            }
        } catch (error) {
            console.error('Error loading selections from storage:', error);
        }
        return null;
    }, []);

    // Save selections to session storage
    const saveSelectionsToStorage = useCallback((selectionsData) => {
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(selectionsData));
        } catch (error) {
            console.error('Error saving selections to storage:', error);
        }
    }, []);

    // Initialize selections from API data (find selected_for_package items)
    const initializeDefaultSelections = useCallback((data) => {
        const defaultSelections = {
            packageId: packageId,
            makkahHotel: toHotelSelection(collectHotelSelectedRooms(data?.makkah_hotel)),
            madinahHotel: toHotelSelection(collectHotelSelectedRooms(data?.madinah_hotel)),
            flight: null,
            customFlight: null,
            otherServices: { transfer_selected_id: null, visa_selected_id: null }
        };

        // Default flight selection (if exists)
        if (data?.flight?.data?.offer?.id) {
            defaultSelections.flight = data.flight.data.offer.id;
        }
            // Default other services selection
        if (data?.transfer_selected_id !== null) {
            defaultSelections.otherServices.transfer_selected_id = Number(data.transfer_selected_id);
        }

        if (data?.visa_selected_id !== null) {
            defaultSelections.otherServices.visa_selected_id = Number(data.visa_selected_id);
        }

        return defaultSelections;
    }, [packageId]);

    // Fetch package data
    const fetchPackageData = useCallback(async () => {
        if (!packageId) return;

        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const res = await fetch(`${apiUrl}/api/customized/packages/details`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ 'package_id': packageId })
            });
            const response = await res.json();
            if (response.Success) {
                const data = response.Content;
                setPackageData(data);
                // Check if we have stored selections
                const storedSelections = loadSelectionsFromStorage(packageId);
                
                if (storedSelections) {
                    const restored = {
                        ...storedSelections,
                        makkahHotel: toHotelSelection(collectHotelSelectedRooms(data.makkah_hotel)),
                        madinahHotel: toHotelSelection(collectHotelSelectedRooms(data.madinah_hotel)),
                    };
                    setSelections(restored);
                    saveSelectionsToStorage(restored);
                } else {
                    // Initialize with default selections from API
                    const defaultSelections = initializeDefaultSelections(data);
                    setSelections(defaultSelections);
                    saveSelectionsToStorage(defaultSelections);
                }
            } else {
                console.error('API returned unsuccessful response:', response);
                setPackageData(null);
            }
        } catch (error) {
            console.error('Error fetching package data:', error);
            console.error('Error details:', error.message);
            setPackageData(null);
        } finally {
            setIsLoading(false);
        }
    }, [packageId, loadSelectionsFromStorage, initializeDefaultSelections, saveSelectionsToStorage]);

    // Fetch data on mount or when packageId changes
    useEffect(() => {
        fetchPackageData();
    }, [fetchPackageData]);

    // Update Makkah hotel selection (array of { roomIndex, rateIndex, qty } or legacy roomIndex, rateIndex)
    const updateMakkahHotelSelection = useCallback((selectedRoomsOrIndex, rateIndex) => {
        const rooms = Array.isArray(selectedRoomsOrIndex)
            ? selectedRoomsOrIndex
            : (selectedRoomsOrIndex != null && rateIndex != null
                ? [{ roomIndex: selectedRoomsOrIndex, rateIndex, qty: 1 }]
                : []);
        setSelections(prev => {
            const updated = {
                ...prev,
                makkahHotel: toHotelSelection(rooms)
            };
            saveSelectionsToStorage(updated);
            return updated;
        });
    }, [saveSelectionsToStorage]);

    // Update Madinah hotel selection (array of { roomIndex, rateIndex, qty } or legacy roomIndex, rateIndex)
    const updateMadinahHotelSelection = useCallback((selectedRoomsOrIndex, rateIndex) => {
        const rooms = Array.isArray(selectedRoomsOrIndex)
            ? selectedRoomsOrIndex
            : (selectedRoomsOrIndex != null && rateIndex != null
                ? [{ roomIndex: selectedRoomsOrIndex, rateIndex, qty: 1 }]
                : []);
        setSelections(prev => {
            const updated = {
                ...prev,
                madinahHotel: toHotelSelection(rooms)
            };
            saveSelectionsToStorage(updated);
            return updated;
        });
    }, [saveSelectionsToStorage]);

    // Update flight selection
    const updateFlightSelection = useCallback((flightId, flightData = null) => {
        setSelections(prev => {
            const updated = {
                ...prev,
                flight: flightId,
                customFlight: flightData // Store full flight object
            };
            saveSelectionsToStorage(updated);
            return updated;
        });
    }, [saveSelectionsToStorage]);

    // Update other services selection
    const updateOtherServicesSelection = useCallback((services) => {
        setSelections(prev => {
            const updated = {
                ...prev,
                otherServices: services
            };
            saveSelectionsToStorage(updated);
            return updated;
        });
    }, [saveSelectionsToStorage]);

    // Get selected rooms and rates for a hotel
    const getSelectedHotelRate = useCallback((hotelType) => {
        if (!packageData) return null;

        const hotel = hotelType === 'makkah' ? packageData.makkah_hotel : packageData.madinah_hotel;
        const selection = normalizeHotelSelection(
            hotelType === 'makkah' ? selections.makkahHotel : selections.madinahHotel,
            hotel
        );

        if (!hotel || !selection.selectedRooms.length) return null;

        const selected = selection.selectedRooms.map((item) => {
            const room = hotel.rooms?.[item.roomIndex];
            const rate = room?.rates?.[item.rateIndex];
            return { room, rate, qty: item.qty || 1, roomIndex: item.roomIndex, rateIndex: item.rateIndex };
        }).filter((item) => item.room && item.rate);

        if (!selected.length) return null;

        return {
            room: selected[0].room,
            rate: selected[0].rate,
            selectedRooms: selected,
        };
    }, [packageData, selections]);

    // Clear all selections (useful for starting fresh)
    const clearSelections = useCallback(() => {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (packageData) {
            const defaultSelections = initializeDefaultSelections(packageData);
            setSelections(defaultSelections);
        }
    }, [packageData, initializeDefaultSelections]);

    const value = {
        // Data
        packageData,
        isLoading,
        selections,
        // Actions
        updateMakkahHotelSelection,
        updateMadinahHotelSelection,
        updateFlightSelection,
        updateOtherServicesSelection,
        clearSelections,
        refetchPackageData: fetchPackageData,
        
        // Helpers
        getSelectedHotelRate
    };

    return (
        <UmrahPackageContext.Provider value={value}>
            {children}
        </UmrahPackageContext.Provider>
    );
};

export const useUmrahPackage = () => {
    const context = useContext(UmrahPackageContext);
    if (context === undefined) {
        throw new Error('useUmrahPackage must be used within a UmrahPackageProvider');
    }
    return context;
};
