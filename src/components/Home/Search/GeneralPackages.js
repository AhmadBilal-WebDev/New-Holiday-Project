'use client'
import React, { useEffect, useState } from 'react';
import { Popover, Switch } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { AirportList } from "@/util/AirportList";
import { FaCalendarAlt, FaCar, FaHotel, FaMapMarkerAlt, FaMinus, FaPlus, FaUsers } from 'react-icons/fa';
import { RiPlaneFill } from "react-icons/ri";
import moment from 'moment';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useHolidayPackageStore } from '@/components/Store/HolidayPackageStore';
import HotelLocationSelector from './HotelLocationSelector';
import GeneralAirportSelector from './GeneralAirportSelector';
import TransferLocationSelector from './TransferLocationSelector';
import { IoMdPerson } from 'react-icons/io';
import styles from './GeneralPackages.module.css';

const defaultDates = () => [
    moment().add(1, 'days').toDate(),
    moment().add(2, 'days').toDate(),
];

const emptyTransferLoc = () => ({
    location: '',
    lat: null,
    lng: null,
    city: '',
    country: '',
    code: '',
});

export default function GeneralPackages({ packageConfig, isActive, onSearch }) {
    const router = useRouter();
    const { initializePackage, getNextRoute, clearPackageData } = useHolidayPackageStore();

    const [popoverOpened, setPopoverOpened] = useState(false);
    const [breakPoint, setBreakPoint] = useState(false);
    const [selectedServices, setSelectedServices] = useState({
        stay: true,
        flight: true,
        car: false
    });
    const [flexibleMode, setFlexibleMode] = useState(false);
    const [flightTripType, setFlightTripType] = useState('Return');
    const [placeApiLoader, setPlaceApiLoader] = useState(false);
    // True only when user picked a hotel place via HotelLocationSelector (not auto from flight dest)
    const [hotelLocationExplicit, setHotelLocationExplicit] = useState(false);
    // Airport dropdown states
    const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
    const [toDropdownOpen, setToDropdownOpen] = useState(false);
    const [fromSearchQuery, setFromSearchQuery] = useState('');
    const [toSearchQuery, setToSearchQuery] = useState('');

    // Recent airports state
    const [recentFromAirports, setRecentFromAirports] = useState([]);
    const [recentToAirports, setRecentToAirports] = useState([]);

    const [FormData, setFormData] = useState({
        from: '',
        to: '',
        // Departure airport location details
        fromLocation: {
            lat: null,
            lng: null,
            city: '',
            country: '',
            countryCode: '',
            airportName: ''
        },
        // Arrival airport location details
        toLocation: {
            lat: null,
            lng: null,
            city: '',
            country: '',
            countryCode: '',
            airportName: ''
        },
        // Hotel location details
        location: '',
        lat: null,
        lng: null,
        city: '',
        code: '',
        country: '',
        cabinClass: 'Y',
        cabinClassName: 'economy',
        adults: 1,
        children: 0,
        infants: 0,
        dates: defaultDates(),
        stayDates: defaultDates(),
        transferDates: defaultDates(),
        transferPickup: emptyTransferLoc(),
        transferDropoff: emptyTransferLoc(),
        sameAsPickup: true,
    })
    const [rooms, setRooms] = useState([
        { adults: 2, children: 0, childrenAges: [], errors: {} }
    ]);

    const addRoom = () => {
        if (rooms.length >= 5) {
            notifications.show({
                autoClose: 2000,
                title: "Limit reached",
                message: "Maximum 5 rooms allowed",
                color: "red",
            });
            return;
        }
        setRooms([...rooms, { adults: 2, children: 0, childrenAges: [], errors: {} }]);
    };
    useEffect(() => {
        // Load recent airports from localStorage
        const savedRecentFrom = localStorage.getItem('recentFromAirports');
        const savedRecentTo = localStorage.getItem('recentToAirports');
        if (savedRecentFrom) {
            setRecentFromAirports(JSON.parse(savedRecentFrom));
        }
        if (savedRecentTo) {
            setRecentToAirports(JSON.parse(savedRecentTo));
        }
        if (isActive && packageConfig) {
            setSelectedServices({ stay: packageConfig.selectedServices.hotel, flight: packageConfig.selectedServices.flight, car: packageConfig.selectedServices.transfer });
            const roomslist = packageConfig.searchData.rooms.slice(0, 5).map(room => {
                let childrenAges = Array.isArray(room.childrenAges) ? [...room.childrenAges] : [];
                const childrenCount = Math.min(
                    4,
                    childrenAges.length > 0 ? childrenAges.length : Number(room.children) || 0
                );
                childrenAges = childrenAges.slice(0, childrenCount);
                while (childrenAges.length < childrenCount) childrenAges.push(null);
                return {
                    ...room,
                    adults: Math.min(6, Math.max(1, Number(room.adults) || 1)),
                    children: childrenCount,
                    childrenAges,
                    errors: {},
                };
            });
            setRooms(roomslist.length ? roomslist : [{ adults: 2, children: 0, childrenAges: [], errors: {} }]);
            const mainDates = packageConfig.searchData.dates
                ? [new Date(packageConfig.searchData.dates.checkIn), new Date(packageConfig.searchData.dates.checkOut)]
                : defaultDates();
            // Flexible mode: each service keeps its own dates — restore from service payloads, not shared mainDates
            const flightStoreDates = packageConfig.searchData.flight?.dates;
            const flightDates = flightStoreDates?.depart || flightStoreDates?.check_in
                ? [
                    new Date(flightStoreDates.depart || flightStoreDates.check_in),
                    new Date(
                        flightStoreDates.return
                        || flightStoreDates.check_out
                        || flightStoreDates.depart
                        || flightStoreDates.check_in
                    ),
                ]
                : mainDates;
            const stayDates = packageConfig.searchData.hotel?.dates
                ? [new Date(packageConfig.searchData.hotel.dates.checkIn || packageConfig.searchData.hotel.dates.check_in), new Date(packageConfig.searchData.hotel.dates.checkOut || packageConfig.searchData.hotel.dates.check_out)]
                : mainDates;
            const transferDates = packageConfig.searchData.transfer?.dates
                ? [
                    new Date(packageConfig.searchData.transfer.dates.pickup || packageConfig.searchData.transfer.dates.check_in),
                    new Date(packageConfig.searchData.transfer.dates.dropoff || packageConfig.searchData.transfer.dates.check_out || packageConfig.searchData.transfer.dates.pickup || packageConfig.searchData.transfer.dates.check_in)
                ]
                : mainDates;
            if (packageConfig.searchData.flight?.tripType) {
                setFlightTripType(packageConfig.searchData.flight.tripType);
            }
            if (packageConfig.searchData.flexibleMode) {
                setFlexibleMode(true);
            }
            setFormData(prev => ({
                ...prev,
                from: packageConfig.searchData.flight?.from || '',
                to: packageConfig.searchData.flight?.to || '',
                fromLocation: packageConfig.searchData.flight?.fromLocation || prev.fromLocation,
                toLocation: packageConfig.searchData.flight?.toLocation || prev.toLocation,
                dates: flightDates,
                stayDates,
                transferDates,
                location: packageConfig.searchData.hotel?.location || '',
                lat: packageConfig.searchData.hotel?.lat || null,
                lng: packageConfig.searchData.hotel?.lng || null,
                city: packageConfig.searchData.hotel?.city || '',
                code: packageConfig.searchData.hotel?.countryCode || '',
                country: packageConfig.searchData.hotel?.country || '',
                cabinClass: packageConfig.searchData.flight?.cabinClass || 'Y',
                cabinClassName: packageConfig.searchData.flight?.cabinClassName || 'economy',
                adults: packageConfig.searchData.totalGuests?.adults || 1,
                children: packageConfig.searchData.totalGuests?.children || 0,
                infants: packageConfig.searchData.totalGuests?.infants || 0,
                transferPickup: packageConfig.searchData.transfer?.pickup || prev.transferPickup,
                transferDropoff: packageConfig.searchData.transfer?.dropoff || prev.transferDropoff,
                sameAsPickup: packageConfig.searchData.transfer?.sameAsPickup ?? true,
            }));
            // Hotel was explicit only in flexible mode when stay city differs from flight arrival
            const restoredHotelCity = packageConfig.searchData.hotel?.city || '';
            const restoredFlightCity = packageConfig.searchData.flight?.toLocation?.city || '';
            setHotelLocationExplicit(
                Boolean(
                    packageConfig.searchData.flexibleMode &&
                    restoredHotelCity &&
                    restoredFlightCity &&
                    restoredHotelCity !== restoredFlightCity
                )
            );
        }
        const handleResize = () => {
            setBreakPoint(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [])

    // Filter airports based on search query and organize by country
    const filterAirports = (airports, query, selectedCode = null) => {
        let filtered = airports;

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = airports.filter(airport =>
                airport.airportName.toLowerCase().includes(lowerQuery) ||
                airport.airportCode.toLowerCase().includes(lowerQuery) ||
                airport.cityName.toLowerCase().includes(lowerQuery) ||
                airport.countryName.toLowerCase().includes(lowerQuery)
            );
        }

        // Move selected airport to top if it exists in filtered results
        if (selectedCode) {
            const selectedIndex = filtered.findIndex(a => a.airportCode === selectedCode);
            if (selectedIndex > -1) {
                const selectedAirport = filtered.splice(selectedIndex, 1)[0];
                filtered.unshift(selectedAirport);
            }
        }

        // Group by country
        const groupedByCountry = filtered.reduce((acc, airport) => {
            const country = airport.countryName;
            if (!acc[country]) {
                acc[country] = [];
            }
            acc[country].push(airport);
            return acc;
        }, {});

        // Convert to array of countries with their airports, limit total to 150 airports
        const countriesArray = Object.entries(groupedByCountry)
            .map(([country, airports]) => ({
                country,
                airports: airports.slice(0, 20) // Max 20 airports per country
            }))
            .slice(0, 10); // Max 10 countries

        return countriesArray;
    };

    // Get selected airport details
    const getAirportLabel = (code) => {
        const airport = AirportList.find(a => a.airportCode === code);
        return airport ? `${airport.cityName} (${airport.airportCode})` : '';
    };

    // Add airport to recent list
    const addToRecentAirports = (airportCode, type) => {
        if (!airportCode) return;

        const isFromType = type === 'from';
        const recentList = isFromType ? recentFromAirports : recentToAirports;
        const setRecentList = isFromType ? setRecentFromAirports : setRecentToAirports;
        const storageKey = isFromType ? 'recentFromAirports' : 'recentToAirports';

        // Remove if already exists
        const filteredList = recentList.filter(code => code !== airportCode);
        // Add to beginning
        const newList = [airportCode, ...filteredList].slice(0, 2);

        setRecentList(newList);
        localStorage.setItem(storageKey, JSON.stringify(newList));
    };

    // Sync hotel destination from arrival airport unless user picked a custom hotel place.
    const hotelFieldsFromArrival = (location) => {
        if (!location) return {};
        const city = location.city || '';
        return {
            // Prefer city for hotel search — airport labels like "All Airports" break places lookup
            location: city || location.airportName || '',
            lat: location.lat ?? null,
            lng: location.lng ?? null,
            city,
            code: location.countryCode || '',
            country: location.country || '',
        };
    };

    const applyArrivalLocation = (prev, location, syncHotel) => {
        const next = {
            ...prev,
            toLocation: location,
        };
        if (syncHotel) {
            Object.assign(next, hotelFieldsFromArrival(location));
        }
        return next;
    };

    // Fetch location details using backend API
    const fetchAirportLocationDetails = async (airportCode, type, syncHotel = false) => {
        try {
            // Get airport details from AirportList
            const airport = AirportList.find(a => a.airportCode === airportCode);
            if (!airport) return;
            setPlaceApiLoader(true);
            // Call backend API to get location details
            const response = await fetch(
                `/api/places/airport-location?airportName=${encodeURIComponent(airport.airportName)}&cityName=${encodeURIComponent(airport.cityName)}&countryName=${encodeURIComponent(airport.countryName)}`
            );

            const data = await response.json();
            setPlaceApiLoader(false);
            const locationData = (data.success && data.location)
                ? data.location
                : {
                    lat: null,
                    lng: null,
                    city: airport.cityName,
                    country: airport.countryName,
                    countryCode: airport.countryCode,
                    airportName: airport.airportName
                };

            setFormData(prev => {
                if (type === 'from') {
                    return { ...prev, fromLocation: locationData };
                }
                return applyArrivalLocation(prev, locationData, syncHotel);
            });

        } catch (error) {
            console.error('Error fetching airport location details:', error);
            setPlaceApiLoader(false);

            // Fallback to airport data from AirportList
            const airport = AirportList.find(a => a.airportCode === airportCode);
            if (airport) {
                const locationData = {
                    lat: null,
                    lng: null,
                    city: airport.cityName,
                    country: airport.countryName,
                    countryCode: airport.countryCode,
                    airportName: airport.airportName
                };

                setFormData(prev => {
                    if (type === 'from') {
                        return { ...prev, fromLocation: locationData };
                    }
                    return applyArrivalLocation(prev, locationData, syncHotel);
                });
            }
        }
    };

    // Handle airport selection with location details
    const handleAirportSelect = (airportCode, type) => {
        const syncHotel = type === 'to' && !hotelLocationExplicit;

        setFormData(prev => {
            const next = { ...prev, [type]: airportCode };
            if (syncHotel) {
                // Clear stale hotel dest immediately; filled again when location fetch returns
                next.location = '';
                next.lat = null;
                next.lng = null;
                next.city = '';
                next.code = '';
                next.country = '';
            }
            return next;
        });

        addToRecentAirports(airportCode, type);

        // Fetch location details for the selected airport
        if (airportCode) {
            fetchAirportLocationDetails(airportCode, type, syncHotel);
        }
    };

    const totalAdults = rooms.reduce((sum, room) => sum + room.adults, 0);
    const totalChildren = rooms.reduce((sum, room) => sum + room.children, 0);
    const removeRoom = (index) => {
        if (rooms.length === 1) return;
        const updatedRooms = rooms.filter((_, i) => i !== index);
        setRooms(updatedRooms);
    };
    const handleRoomChange = (index, type, delta) => {
        const updatedRooms = [...rooms];

        if (type === "adults") {
            const prevAdults = updatedRooms[index].adults;
            if (delta > 0 && prevAdults >= 6) {
                notifications.show({
                    autoClose: 2000,
                    title: "Limit reached",
                    message: "Maximum 6 adults allowed per room",
                    color: "red",
                });
                return;
            }
            updatedRooms[index].adults = Math.min(6, Math.max(1, prevAdults + delta));
        }
        else if (type === "children") {
            const prevCount = updatedRooms[index].children;
            if (delta > 0 && prevCount >= 4) {
                notifications.show({
                    autoClose: 2000,
                    title: "Limit reached",
                    message: "Maximum 4 children allowed per room",
                    color: "red",
                });
                return;
            }
            const newCount = Math.min(4, Math.max(0, prevCount + delta));
            if (newCount === prevCount) return;

            updatedRooms[index].children = newCount;

            // copy old ages
            let ages = [...(updatedRooms[index].childrenAges || [])];

            if (newCount > prevCount) {
                // child add hua → sirf new entry null
                ages.push(null);
            } else if (newCount < prevCount) {
                // child remove hua → last age remove
                ages.pop();
            }

            updatedRooms[index].childrenAges = ages;

            // agar children 0 ho jaen to errors remove
            if (newCount === 0) {
                updatedRooms[index].errors = {};
            }
        }

        setRooms(updatedRooms);
    };
    const handleAgeChange = (roomIndex, ageIndex, value) => {
        const updatedRooms = [...rooms];
        updatedRooms[roomIndex].childrenAges[ageIndex] = value;
        const hasEmptyAge = updatedRooms[roomIndex].childrenAges.some((age) => !age);
        if (!hasEmptyAge) {
            updatedRooms[roomIndex].errors = {};
        }
        setRooms(updatedRooms);
    };
    const handleServiceChange = (service, checked) => {
        setSelectedServices(prev => ({
            ...prev,
            [service]: checked
        }));
    };
    const handleCountChange = (type, increment = true) => {
        setFormData((prev) => {
            let newValue;
            if (type === 'adults') {
                newValue = increment ? prev.adults + 1 : Math.max(1, prev.adults - 1);
            } else {
                newValue = increment ? prev[type] + 1 : Math.max(0, prev[type] - 1);
            }
            return { ...prev, [type]: newValue };
        });
    };

    const handleFlexibleToggle = (checked) => {
        setFlexibleMode(checked);
        if (checked) {
            setFormData(prev => ({
                ...prev,
                stayDates: prev.stayDates?.[0] ? prev.stayDates : prev.dates,
                transferDates: prev.transferDates?.[0] ? prev.transferDates : prev.dates,
            }));
        }
    };

    const handleFlightDatesChange = (dates) => {
        setFormData(prev => {
            const next = { ...prev, dates };
            // Flexible mode: services keep independent dates — never auto-sync
            if (flexibleMode) return next;
            // Compact mode: keep other service dates in sync when they still match the previous flight range
            const prevIn = prev.dates?.[0] ? moment(prev.dates[0]).format('YYYY-MM-DD') : null;
            const prevOut = prev.dates?.[1] ? moment(prev.dates[1]).format('YYYY-MM-DD') : null;
            const stayIn = prev.stayDates?.[0] ? moment(prev.stayDates[0]).format('YYYY-MM-DD') : null;
            const stayOut = prev.stayDates?.[1] ? moment(prev.stayDates[1]).format('YYYY-MM-DD') : null;
            const trIn = prev.transferDates?.[0] ? moment(prev.transferDates[0]).format('YYYY-MM-DD') : null;
            const trOut = prev.transferDates?.[1] ? moment(prev.transferDates[1]).format('YYYY-MM-DD') : null;
            if (stayIn === prevIn && stayOut === prevOut) next.stayDates = dates;
            if (trIn === prevIn && trOut === prevOut) next.transferDates = dates;
            return next;
        });
    };

    const handleTransferPlaceSelected = (place, field) => {
        if (!place?.geometry?.location) return;
        const rawLat = place.geometry.location.lat;
        const rawLng = place.geometry.location.lng;
        const lat = typeof rawLat === 'function' ? rawLat() : rawLat;
        const lng = typeof rawLng === 'function' ? rawLng() : rawLng;
        let city = "";
        let country = "";
        let code = "";
        (place.address_components || []).forEach((component) => {
            if (component.types.includes("locality") || component.types.includes("postal_town")) {
                city = component.long_name;
            } else if (!city && component.types.includes("administrative_area_level_2")) {
                city = component.long_name;
            } else if (!city && component.types.includes("administrative_area_level_1")) {
                city = component.long_name;
            }
            if (component.types.includes("country")) {
                country = component.long_name;
                code = component.short_name;
            }
        });
        if (!city) {
            city = place.displayName || place.name || '';
        }
        const loc = {
            location: place.displayName || place.formatted_address || place.name || '',
            lat: lat ?? null,
            lng: lng ?? null,
            city,
            country,
            code,
        };
        setFormData(prev => ({
            ...prev,
            [field]: loc,
            ...(field === 'transferPickup' && prev.sameAsPickup ? { transferDropoff: loc } : {}),
        }));
    };

    const selectedServiceCount = Object.values(selectedServices).filter(Boolean).length;
    const hasMinimumServices = selectedServiceCount >= 2;
    const showCompactLocationOnly = selectedServices.stay && selectedServices.car && !selectedServices.flight;

    const ClosePopover = () => {
        // ✅ Check children ages for each room
        const updatedRooms = rooms.map((room) => {
            const roomErrors = {};
            if (room.children > 0) {
                const hasEmptyAge = room.childrenAges.some((age) => !age);
                if (hasEmptyAge) {
                    roomErrors.childrenAges = "Please select age for all children";
                }
            }
            return { ...room, errors: roomErrors };
        });

        setRooms(updatedRooms);
        const hasRoomErrors = updatedRooms.some(
            (room) => Object.keys(room.errors).length > 0
        );
        if (hasRoomErrors) {
            return;
        }
        setPopoverOpened(false);
    };
    const handleLocationChange = (e) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, location: value }));
        // Typing a custom location (or clearing it) updates explicit flag
        setHotelLocationExplicit(Boolean(value?.trim()));
    };

    const handlePlaceSelected = (place) => {
        if (!place.geometry) return;
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        let city = "";
        let country = "";
        let code = "";
        place.address_components.forEach((component) => {
            if (component.types.includes("locality")) {
                city = component.long_name;
            } else if (component.types.includes("postal_town")) {
                city = component.long_name;
            }
            if (component.types.includes("country")) {
                country = component.long_name;
                code = component.short_name;
            }
        });

        setHotelLocationExplicit(true);
        setFormData((prev) => ({
            ...prev,
            location: place.displayName || place.formatted_address,
            lat,
            lng,
            city,
            code,
            country,
        }));
    };

    const getPrimaryDates = () => {
        if (flexibleMode && selectedServices.stay && FormData.stayDates?.[0] && FormData.stayDates?.[1]) {
            return FormData.stayDates;
        }
        if (flightTripType === 'OneWay') {
            const dep = FormData.dates?.[0];
            return [dep, FormData.dates?.[1] || dep];
        }
        return FormData.dates;
    };

    const showError = (title, message) => {
        notifications.show({ title, message, autoClose: 3000, color: 'red' });
    };

    // Validation function
    const validateForm = () => {
        if (!hasMinimumServices) {
            notifications.show({
                title: 'Service Selection Required',
                message: 'Please select at least two services to proceed.',
                autoClose: 3000,
                color: 'orange'
            });
            return false;
        }

        const requireAirports = selectedServices.flight || (!flexibleMode && !showCompactLocationOnly);
        const requireHotelLocation =
            (showCompactLocationOnly && !selectedServices.flight) ||
            (flexibleMode && selectedServices.stay && !selectedServices.flight);

        if (requireHotelLocation && !FormData.location) {
            showError('Location Required', 'Please select a destination location.');
            return false;
        }

        if (requireAirports) {
            if (!FormData.from) {
                showError('Departure Airport Required', 'Please select your departure airport.');
                return false;
            }
            if (!FormData.to) {
                showError('Destination Airport Required', 'Please select your destination airport.');
                return false;
            }
            if (FormData.from === FormData.to) {
                showError('Invalid Selection', 'Departure and destination airports cannot be the same.');
                return false;
            }
        }

        if (selectedServices.flight) {
            if (flightTripType === 'OneWay' && !FormData.dates?.[0]) {
                showError('Departure Date Required', 'Please select a departure date.');
                return false;
            }
            if (flightTripType === 'Return' && (!FormData.dates?.[0] || !FormData.dates?.[1])) {
                showError('Dates Required', 'Please select departure and return dates.');
                return false;
            }
        } else if (!FormData.dates?.[0] || !FormData.dates?.[1]) {
            if (!(flexibleMode && selectedServices.stay)) {
                showError('Dates Required', 'Please select check-in and check-out dates.');
                return false;
            }
        }

        if (flexibleMode && selectedServices.stay && (!FormData.stayDates?.[0] || !FormData.stayDates?.[1])) {
            showError('Stay Dates Required', 'Please select check-in and check-out dates.');
            return false;
        }

        if (flexibleMode && selectedServices.car && (!FormData.transferDates?.[0] || !FormData.transferDates?.[1])) {
            showError('Transfer Dates Required', 'Please select transfer dates.');
            return false;
        }

        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];
            if (room.children > 0) {
                const hasEmptyAge = room.childrenAges.some((age) => !age);
                if (hasEmptyAge) {
                    showError('Children Ages Required', `Please select age for all children in Room ${i + 1}.`);
                    return false;
                }
            }
        }

        if (totalAdults < 1) {
            showError('Adult Required', 'At least one adult is required.');
            return false;
        }

        return true;
    };

    // Submit function to create API request
    const handleSearch = async () => {
        // Validate form first
        if (!validateForm()) {
            return;
        }
        // Prepare service configuration for package store
        const packageServices = {
            hotel: selectedServices.stay,
            flight: selectedServices.flight,
            transfer: selectedServices.car,
        };

        const primaryDates = getPrimaryDates();
        const checkIn = moment(primaryDates[0]).format('YYYY-MM-DD');
        const checkOut = moment(primaryDates[1] || primaryDates[0]).format('YYYY-MM-DD');
        const flightDepart = FormData.dates?.[0]
            ? moment(FormData.dates[0]).format('YYYY-MM-DD')
            : checkIn;
        const flightReturn = flightTripType === 'OneWay'
            ? null
            : (FormData.dates?.[1] ? moment(FormData.dates[1]).format('YYYY-MM-DD') : checkOut);

        // Flexible: hotel always uses stayDates; compact: shared primary dates
        const hotelCheckIn = (flexibleMode && FormData.stayDates?.[0])
            ? moment(FormData.stayDates[0]).format('YYYY-MM-DD')
            : checkIn;
        const hotelCheckOut = (flexibleMode && FormData.stayDates?.[0])
            ? moment(FormData.stayDates[1] || FormData.stayDates[0]).format('YYYY-MM-DD')
            : checkOut;

        // Prefer flight arrival for hotels unless user explicitly picked a hotel place
        const destAirport = FormData.to
            ? AirportList.find((a) => a.airportCode === FormData.to)
            : null;
        const arrival = FormData.toLocation?.city
            ? FormData.toLocation
            : (destAirport
                ? {
                    city: destAirport.cityName,
                    country: destAirport.countryName,
                    countryCode: destAirport.countryCode,
                    airportName: destAirport.airportName,
                    lat: FormData.toLocation?.lat ?? null,
                    lng: FormData.toLocation?.lng ?? null,
                }
                : (FormData.toLocation || {}));
        const arrivalHotel = hotelFieldsFromArrival(arrival);
        const useExplicitHotel = hotelLocationExplicit && Boolean(FormData.city || FormData.location);

        // Prefer city over abbreviated airport names — transfer API cannot resolve
        // bare labels like "King Abdulaziz Intl." (simple Places search uses full names).
        const transferPickupCity = useExplicitHotel
            ? (FormData.city || '')
            : (arrival.city || FormData.city || '');
        const transferPickup = FormData.transferPickup?.location
            ? FormData.transferPickup
            : {
                location: transferPickupCity || (useExplicitHotel ? FormData.location : arrivalHotel.location) || '',
                lat: useExplicitHotel
                    ? (FormData.lat ?? null)
                    : (arrival.lat ?? FormData.lat ?? null),
                lng: useExplicitHotel
                    ? (FormData.lng ?? null)
                    : (arrival.lng ?? FormData.lng ?? null),
                city: transferPickupCity,
                country: useExplicitHotel
                    ? (FormData.country || '')
                    : (arrival.country || FormData.country || ''),
                code: useExplicitHotel
                    ? (FormData.code || '')
                    : (arrival.countryCode || FormData.code || ''),
            };
        const transferDropoff = FormData.sameAsPickup
            ? transferPickup
            : (FormData.transferDropoff?.location ? FormData.transferDropoff : transferPickup);

        // Flexible: transfer always uses transferDates; compact: shared primary dates
        const transferCheckIn = (flexibleMode && FormData.transferDates?.[0])
            ? moment(FormData.transferDates[0]).format('YYYY-MM-DD')
            : checkIn;
        const transferCheckOut = (flexibleMode && FormData.transferDates?.[1])
            ? moment(FormData.transferDates[1]).format('YYYY-MM-DD')
            : (flexibleMode && FormData.transferDates?.[0]
                ? moment(FormData.transferDates[0]).format('YYYY-MM-DD')
                : checkOut);

        // Prepare search data
        const searchData = {
            services: packageServices,
            flexibleMode,
            ...(selectedServices.flight && {
                flight: {
                    from: FormData.from,
                    to: FormData.to,
                    cabinClass: FormData.cabinClass,
                    cabinClassName: FormData.cabinClassName,
                    tripType: flightTripType,
                    fromLocation: FormData.fromLocation,
                    toLocation: FormData.toLocation,
                    dates: {
                        depart: flightDepart,
                        return: flightReturn,
                        check_in: flightDepart,
                        check_out: flightReturn || flightDepart,
                    }
                }
            }),
            ...(selectedServices.stay && {
                hotel: {
                    location: useExplicitHotel
                        ? (FormData.location || FormData.city || '')
                        : (arrivalHotel.location || FormData.location || FormData.city || ''),
                    lat: useExplicitHotel
                        ? (FormData.lat ?? null)
                        : (arrival.lat ?? FormData.lat ?? null),
                    lng: useExplicitHotel
                        ? (FormData.lng ?? null)
                        : (arrival.lng ?? FormData.lng ?? null),
                    city: useExplicitHotel
                        ? (FormData.city || '')
                        : (arrival.city || FormData.city || ''),
                    country: useExplicitHotel
                        ? (FormData.country || '')
                        : (arrival.country || FormData.country || ''),
                    countryCode: useExplicitHotel
                        ? (FormData.code || '')
                        : (arrival.countryCode || FormData.code || ''),
                    airport_code: FormData.to || undefined,
                    dates: {
                        checkIn: hotelCheckIn,
                        checkOut: hotelCheckOut,
                    }
                }
            }),
            ...(selectedServices.car && {
                transfer: {
                    pickup: transferPickup,
                    dropoff: transferDropoff,
                    sameAsPickup: FormData.sameAsPickup,
                    dates: {
                        pickup: transferCheckIn,
                        dropoff: transferCheckOut,
                        check_in: transferCheckIn,
                        check_out: transferCheckOut,
                    }
                }
            }),
            dates: {
                checkIn,
                checkOut
            },
            // Stay uses room occupancy; flight/transfer-only must mirror FormData
            // travelers (rooms default to 2 adults and would break booking validation).
            rooms: selectedServices.stay
                ? rooms.map(room => ({
                    adults: room.adults,
                    children: room.children,
                    childrenAges: room.childrenAges
                }))
                : [{
                    adults: FormData.adults,
                    children: FormData.children,
                    childrenAges: [],
                    infants: FormData.infants,
                    infantAges: [],
                }],
            totalGuests: {
                adults: selectedServices.stay ? totalAdults : FormData.adults,
                children: selectedServices.stay ? totalChildren : FormData.children,
                // Infants matter for flight bookings; keep them whenever flight is selected
                infants: selectedServices.flight ? FormData.infants : 0,
            }
        };

        // Initialize the holiday package store
        clearPackageData();
        initializePackage(packageServices, searchData);
        const nextRoute = getNextRoute();
        if (onSearch) onSearch();
        router.push(nextRoute);
    };

    const renderCabinSelect = (className = '', fullHeight = false) => {
        if (fullHeight) {
            return (
                <div className={`${styles.cabinField} ${className}`}>
                    <div className="form-floating w-100">
                        <select
                            id="cabin-class-select"
                            className={`form-select ${styles.cabinSelectFull}`}
                            value={FormData.cabinClass}
                            onChange={(e) => {
                                const selectedOption = e.target.options[e.target.selectedIndex];
                                setFormData((prev) => ({
                                    ...prev,
                                    cabinClass: e.target.value,
                                    cabinClassName: selectedOption.getAttribute("data-name"),
                                }));
                            }}
                            aria-label="Cabin Class"
                        >
                            <option value="Y" data-name="economy">Economy</option>
                            <option value="S" data-name="premium_economy">Premium Economy</option>
                            <option value="C" data-name="business">Business Class</option>
                            <option value="F" data-name="first">First Class</option>
                        </select>
                        <label htmlFor="cabin-class-select">Cabin class</label>
                    </div>
                </div>
            );
        }

        return (
            <div className={`traveller ${className}`}>
                <select
                    className="form-select w-sm-100 form-select-sm"
                    value={FormData.cabinClass}
                    onChange={(e) => {
                        const selectedOption = e.target.options[e.target.selectedIndex];
                        setFormData((prev) => ({
                            ...prev,
                            cabinClass: e.target.value,
                            cabinClassName: selectedOption.getAttribute("data-name"),
                        }));
                    }}
                    aria-label="Cabin Class"
                >
                    <option value="Y" data-name="economy">Economy</option>
                    <option value="S" data-name="premium_economy">Premium Economy</option>
                    <option value="C" data-name="business">Business Class</option>
                    <option value="F" data-name="first">First Class</option>
                </select>
            </div>
        );
    };

    const renderAirportPair = () => (
        <div className="row gy-2 gx-lg-2 gx-3 position-relative">
            <div className="col-lg-6">
                <div className="d-flex align-items-center position-relative">
                    <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                        <FaMapMarkerAlt size={20} />
                    </div>
                    <GeneralAirportSelector
                        value={FormData.from}
                        onChange={(code) => handleAirportSelect(code, 'from')}
                        excludeCode={FormData.to}
                        label="Leaving From"
                        type="from"
                        isMobile={breakPoint}
                        dropdownOpen={fromDropdownOpen}
                        setDropdownOpen={setFromDropdownOpen}
                        searchQuery={fromSearchQuery}
                        setSearchQuery={setFromSearchQuery}
                        recentAirports={recentFromAirports}
                        addToRecentAirports={addToRecentAirports}
                        filterAirports={filterAirports}
                        getAirportLabel={getAirportLabel}
                    />
                </div>
            </div>
            <div className='general-planeIcon'>
                <RiPlaneFill size={18} />
            </div>
            <div className="col-lg-6">
                <div className="d-flex align-items-center position-relative">
                    <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                        <FaMapMarkerAlt size={20} />
                    </div>
                    <GeneralAirportSelector
                        value={FormData.to}
                        onChange={(code) => handleAirportSelect(code, 'to')}
                        excludeCode={FormData.from}
                        label="Going To"
                        type="to"
                        isMobile={breakPoint}
                        dropdownOpen={toDropdownOpen}
                        setDropdownOpen={setToDropdownOpen}
                        searchQuery={toSearchQuery}
                        setSearchQuery={setToSearchQuery}
                        recentAirports={recentToAirports}
                        addToRecentAirports={addToRecentAirports}
                        filterAirports={filterAirports}
                        getAirportLabel={getAirportLabel}
                    />
                </div>
            </div>
        </div>
    );

    const renderDateField = (value, onChange, label = 'Dates', type = 'range', id = 'pkg-dates') => (
        <div className="d-flex align-items-center position-relative">
            <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                <FaCalendarAlt size={20} />
            </div>
            <div className="form-floating w-100">
                <DatePickerInput
                    variant="unstyled"
                    id={id}
                    minDate={new Date()}
                    valueFormat="DD-MM-YYYY"
                    value={type === 'range' ? value : (value?.[0] || value)}
                    onChange={(dates) => {
                        if (type === 'default') {
                            onChange([dates, null]);
                        } else {
                            onChange(dates);
                        }
                    }}
                    numberOfColumns={breakPoint || type === 'default' ? 1 : 2}
                    className="form-control hotel-date-range"
                    style={{ paddingLeft: '40px' }}
                    type={type}
                />
                <label htmlFor={id} style={{ paddingLeft: '40px' }}>{label}</label>
            </div>
        </div>
    );

    const renderGuestsPopover = () => {
        if (selectedServices.stay) {
            return (
                <Popover
                    width={300}
                    opened={popoverOpened}
                    onChange={setPopoverOpened}
                    position="bottom"
                    withArrow
                    shadow="md"
                    styles={{
                        dropdown: {
                            maxHeight: 380,
                            overflowY: "auto",
                        },
                    }}
                    clickOutsideEvents={["mouseup", "touchend"]}
                >
                    <Popover.Target>
                        <div className="d-flex align-items-center position-relative">
                            <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                <FaUsers size={20} />
                            </div>
                            <div className="form-floating w-100">
                                <button
                                    id="floatingInput3"
                                    onClick={() => setPopoverOpened((o) => !o)}
                                    className="form-control btn btn-light text-start person-selection w-100"
                                    style={{ paddingLeft: '40px' }}
                                >
                                    {totalAdults + totalChildren} traveler{totalAdults + totalChildren !== 1 ? 's' : ''}, {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                                </button>
                                <label htmlFor="floatingInput3" style={{ paddingLeft: '40px' }}>Guests</label>
                            </div>
                        </div>
                    </Popover.Target>
                    <Popover.Dropdown>
                        <div className="p-2">
                            {rooms.map((room, index) => (
                                <div key={index} className="mt-2">
                                    <div className="d-flex justify-content-between  align-items-center">
                                        <p className="small m-0">Room {index + 1}</p>
                                        {index + 1 !== 1 && (
                                            <button onClick={() => removeRoom(index)} className="btn btn-danger x-small btn-sm">
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <hr className="m-1" />
                                    <div className="e484bb5b7a mt-2">
                                        <div className="c5aae0350e">
                                            <label className="small " >
                                                Adults
                                            </label>
                                        </div>
                                        <div className="e301a14002">
                                            <div className="e301a14002">
                                                <button onClick={() => handleRoomChange(index, "adults", -1)} className="adult-modal-btn" >
                                                    <FaMinus />
                                                </button>
                                                <span className="mx-2" aria-hidden="true">
                                                    {room.adults}
                                                </span>
                                                <button onClick={() => handleRoomChange(index, "adults", 1)} className="adult-modal-btn" >
                                                    <FaPlus />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="e484bb5b7a mt-2">
                                        <div className="c5aae0350e">
                                            <label className="small " >
                                                Children
                                            </label>
                                        </div>
                                        <div className="e301a14002">
                                            <div className="e301a14002">
                                                <button onClick={() => handleRoomChange(index, "children", -1)} className="adult-modal-btn" >
                                                    <FaMinus />
                                                </button>
                                                <span className="mx-2" aria-hidden="true">
                                                    {room.children}
                                                </span>
                                                <button onClick={() => handleRoomChange(index, "children", 1)} className="adult-modal-btn" >
                                                    <FaPlus />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex mt-2 flex-wrap justify-content-between">
                                        {room.childrenAges.map((age, ageIndex) => (
                                            <div key={ageIndex} className="kids-age-select">
                                                <select onChange={(e) => handleAgeChange(index, ageIndex, e.target.value)}
                                                    value={age} className="form-control border  form-control-sm">
                                                    <option value="">Age Needed</option>
                                                    {[...Array(16).keys()].map((n) => (
                                                        <option key={n + 1} value={n + 1}>
                                                            {n + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    {room.errors.childrenAges && (
                                        <p className="text-danger small mt-1">
                                            {room.errors.childrenAges}
                                        </p>
                                    )}
                                </div>
                            ))}
                            <hr />
                            <p onClick={addRoom} className="small cursor-pointer text-end mb-1 text-primary">+ Add Room</p>
                            <button onClick={ClosePopover} type="button" className="btn  w-100" style={{ backgroundColor: '#E7247A', color: '#fff', borderColor: '#E7247A' }}>Done</button>
                        </div>
                    </Popover.Dropdown>
                </Popover>
            );
        }

        return (
            <Popover
                width={300}
                opened={popoverOpened}
                onChange={setPopoverOpened}
                position="bottom"
                withArrow
                shadow="md"
                clickOutsideEvents={["mouseup", "touchend"]}
            >
                <Popover.Target>
                    <div>
                        <div className="d-flex align-items-center position-relative">
                            <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                <IoMdPerson size={20} />
                            </div>
                            <div className="form-floating w-100">
                                <button id="floatingInput" style={{ paddingLeft: '40px' }} className="btn-sm flight-traveler-btn-size form-control text-start" onClick={() => setPopoverOpened((o) => !o)}>
                                    {FormData.adults + FormData.children + FormData.infants} traveler{FormData.adults + FormData.children + FormData.infants !== 1 ? 's' : ''}
                                </button>
                                <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">Travelers</label>
                            </div>
                        </div>
                    </div>
                </Popover.Target>
                <Popover.Dropdown>
                    <div className="p-2">
                        <div>
                            <div className="e484bb5b7a mt-2">
                                <div className="c5aae0350e">
                                    <label className="small " >
                                        Adults
                                    </label>
                                </div>
                                <div className="e301a14002">
                                    <div className="e301a14002">
                                        <button onClick={() => handleCountChange('adults', false)} className="adult-modal-btn" >
                                            <FaMinus />
                                        </button>
                                        <span className="mx-2" aria-hidden="true">
                                            {FormData.adults}
                                        </span>
                                        <button onClick={() => handleCountChange('adults', true)} className="adult-modal-btn" >
                                            <FaPlus />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="e484bb5b7a mt-2">
                                <div className="c5aae0350e">
                                    <label className="small " >
                                        Children
                                    </label>
                                </div>
                                <div className="e301a14002">
                                    <div className="e301a14002">
                                        <button onClick={() => handleCountChange('children', false)} className="adult-modal-btn" >
                                            <FaMinus />
                                        </button>
                                        <span className="mx-2" aria-hidden="true">
                                            {FormData.children}
                                        </span>
                                        <button onClick={() => handleCountChange('children', true)} className="adult-modal-btn" >
                                            <FaPlus />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="e484bb5b7a mt-2">
                                <div className="c5aae0350e">
                                    <label className="small " >
                                        Infant
                                    </label>
                                </div>
                                <div className="e301a14002">
                                    <div className="e301a14002">
                                        <button onClick={() => handleCountChange('infants', false)} className="adult-modal-btn" >
                                            <FaMinus />
                                        </button>
                                        <span className="mx-2" aria-hidden="true">
                                            {FormData.infants}
                                        </span>
                                        <button onClick={() => handleCountChange('infants', true)} className="adult-modal-btn" >
                                            <FaPlus />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setPopoverOpened(false)} type="button" className="btn mt-3 w-100 btn-outline-success">Done</button>
                    </div>
                </Popover.Dropdown>
            </Popover>
        );
    };

    const renderAdvancedLayout = () => (
        <div className={styles.advancedWrap}>
            {selectedServices.flight && (
                <div className={`${styles.serviceBand} ${styles.bandFlight}`}>
                    <div className={styles.bandHeader}>
                        <h6 className={styles.bandTitle}>
                            <span className={styles.bandTitleIcon}><RiPlaneFill size={14} /></span>
                            Flight
                        </h6>
                        {/* <div className={styles.tripTypeSeg}>
                            <button
                                type="button"
                                className={`${styles.tripTypeBtn} ${flightTripType === 'Return' ? styles.tripTypeBtnActive : ''}`}
                                onClick={() => setFlightTripType('Return')}
                            >
                                Roundtrip
                            </button>
                            <button
                                type="button"
                                className={`${styles.tripTypeBtn} ${flightTripType === 'OneWay' ? styles.tripTypeBtnActive : ''}`}
                                onClick={() => setFlightTripType('OneWay')}
                            >
                                One-way
                            </button>
                        </div> */}
                    </div>
                    <div className={`${styles.bandFields} row gy-2 gx-lg-2`}>
                        <div className="col-xl-5 col-lg-12">
                            {renderAirportPair()}
                        </div>
                        <div className="col-xl-4 col-lg-6 col-md-6">
                            {flightTripType === 'OneWay'
                                ? renderDateField(FormData.dates, handleFlightDatesChange, 'Departure', 'default', 'flight-dep-date')
                                : renderDateField(FormData.dates, handleFlightDatesChange, 'Dates', 'range', 'flight-dates')}
                        </div>
                        <div className="col-xl-3 col-lg-6 col-md-6">
                            {renderCabinSelect('w-100', true)}
                        </div>
                    </div>
                </div>
            )}

            {selectedServices.stay && (
                <div className={`${styles.serviceBand} ${styles.bandStay}`}>
                    <div className={styles.bandHeader}>
                        <h6 className={styles.bandTitle}>
                            <span className={styles.bandTitleIcon}><FaHotel size={12} /></span>
                            Stay
                        </h6>
                    </div>
                    <div className={`${styles.bandFields} row gy-2 gx-lg-2`}>
                        <div className="col-lg-7">
                            <HotelLocationSelector
                                value={FormData.location}
                                onChange={handleLocationChange}
                                onPlaceSelected={handlePlaceSelected}
                                onLoadingChange={setPlaceApiLoader}
                                isMobile={breakPoint}
                            />
                        </div>
                        <div className="col-lg-5">
                            {renderDateField(FormData.stayDates, (dates) => setFormData(prev => ({ ...prev, stayDates: dates })), 'Stay dates', 'range', 'stay-dates')}
                        </div>
                    </div>
                    {selectedServices.flight && (
                        <p className={styles.hintText}>Optional — leave blank to use flight destination for hotels.</p>
                    )}
                </div>
            )}

            {selectedServices.car && (
                <div className={`${styles.serviceBand} ${styles.bandTransfer}`}>
                    <div className={styles.bandHeader}>
                        <h6 className={styles.bandTitle}>
                            <span className={styles.bandTitleIcon}><FaCar size={12} /></span>
                            Transfer
                        </h6>
                        <label className={styles.samePickupCheck}>
                            <input
                                type="checkbox"
                                checked={FormData.sameAsPickup}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    sameAsPickup: e.target.checked,
                                    ...(e.target.checked ? { transferDropoff: prev.transferPickup } : {}),
                                }))}
                            />
                            Same drop-off
                        </label>
                    </div>
                    <div className={`${styles.bandFields} row gy-2 gx-lg-2`}>
                        <div className="col-lg-4">
                            <TransferLocationSelector
                                value={FormData.transferPickup?.location || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    transferPickup: { ...prev.transferPickup, location: e.target.value }
                                }))}
                                onPlaceSelected={(place) => handleTransferPlaceSelected(place, 'transferPickup')}
                                detailLoader={setPlaceApiLoader}
                                isMobile={breakPoint}
                                placeholder="Pick-up location"
                                inputName="packageTransferPickup"
                            />
                        </div>
                        <div className="col-lg-4">
                            {FormData.sameAsPickup ? (
                                <div className={styles.samePickupHint}>Same as pick-up</div>
                            ) : (
                                <TransferLocationSelector
                                    value={FormData.transferDropoff?.location || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        transferDropoff: { ...prev.transferDropoff, location: e.target.value }
                                    }))}
                                    onPlaceSelected={(place) => handleTransferPlaceSelected(place, 'transferDropoff')}
                                    detailLoader={setPlaceApiLoader}
                                    isMobile={breakPoint}
                                    placeholder="Drop-off location"
                                    inputName="packageTransferDropoff"
                                />
                            )}
                        </div>
                        <div className="col-lg-4">
                            {renderDateField(FormData.transferDates, (dates) => setFormData(prev => ({ ...prev, transferDates: dates })), 'Transfer dates', 'range', 'transfer-dates')}
                        </div>
                    </div>
                    {(selectedServices.flight || selectedServices.stay) && !FormData.transferPickup?.location && (
                        <p className={styles.hintText}>Optional — pick-up can be derived from your hotel or airport if left empty.</p>
                    )}
                </div>
            )}

            <div className={styles.footerRow}>
                <div className={styles.footerTravelers}>
                    {renderGuestsPopover()}
                </div>
                <div className={styles.footerSearch}>
                    <button
                        className="btn btn-success search-btn-styling-home bg-color w-100 h-100"
                        type="button"
                        disabled={placeApiLoader}
                        onClick={handleSearch}
                    >
                        {placeApiLoader ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                Search
                            </>
                        ) : (
                            'Search'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderCompactLayout = () => (
        <div className="row gx-lg-2 gy-2 mt-2">
            <div className={` ${showCompactLocationOnly ? 'col-xl-4' : 'col-xl-5'} col-lg-12 col-md-12 col-12`}>
                {showCompactLocationOnly ? (
                    <HotelLocationSelector
                        value={FormData.location}
                        onChange={handleLocationChange}
                        onPlaceSelected={handlePlaceSelected}
                        onLoadingChange={setPlaceApiLoader}
                        isMobile={breakPoint}
                    />
                ) : (
                    renderAirportPair()
                )}
            </div>
            <div className={` ${showCompactLocationOnly ? 'col-xl-8' : 'col-xl-7'} col-lg-12 col-md-12 col-12`}>
                <div className="row  gy-3 gx-lg-2 gx-3">
                    <div className="col-lg-4">
                        {renderDateField(FormData.dates, (dates) => setFormData(prev => ({ ...prev, dates, stayDates: dates, transferDates: dates })), 'Dates', 'range', 'floatingInput2')}
                    </div>
                    <div className="col-lg-4">
                        {renderGuestsPopover()}
                    </div>
                    <div className="col-lg-4">
                        <button
                            className="btn btn-success search-btn-styling-home bg-color w-100 h-100"
                            type="button"
                            disabled={placeApiLoader}
                            onClick={handleSearch}
                        >
                            {placeApiLoader ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                    Search
                                </>
                            ) : (
                                'Search'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-2">
            <div className={styles.toolbar}>
                <div className={styles.servicesRow}>
                    <Switch
                        checked={selectedServices.stay}
                        onChange={(event) => handleServiceChange('stay', event.currentTarget.checked)}
                        color='#E7247A'
                        label="Stay"
                    />
                    <Switch
                        className='ms-3'
                        checked={selectedServices.flight}
                        onChange={(event) => handleServiceChange('flight', event.currentTarget.checked)}
                        color='#E7247A'
                        label="Flight"
                    />
                    <Switch
                        className='ms-3'
                        checked={selectedServices.car}
                        onChange={(event) => handleServiceChange('car', event.currentTarget.checked)}
                        color='#E7247A'
                        label="Transfer"
                    />
                </div>
                <div className={styles.toolbarRight}>
                    {!flexibleMode && selectedServices.flight && renderCabinSelect(styles.cabinSelect)}
                    <div className={`${styles.flexibleToggle} ${flexibleMode ? styles.flexibleToggleActive : ''}`}>
                        <p className={styles.flexibleLabel}>Flexible dates & destinations</p>
                        <Switch
                            checked={flexibleMode}
                            onChange={(event) => handleFlexibleToggle(event.currentTarget.checked)}
                            color='#E7247A'
                            size="md"
                        />
                    </div>
                </div>
            </div>
            {!hasMinimumServices ? (
                <div className="alert alert-warning mt-2 mb-0 py-2 mt-4" role="alert">
                    <small>
                        <b>Service Selection Required:</b> To proceed with your booking, please select at least two services: <b>Stay</b>, <b>Flight</b>, or <b>Transfer</b>. Combine any two or all three to create your travel package, then toggle the services you need.
                    </small>
                </div>
            ) : (
                flexibleMode ? renderAdvancedLayout() : renderCompactLayout()
            )}
        </div>
    )
}
