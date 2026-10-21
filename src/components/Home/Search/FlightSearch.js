'use client'
import React, { useEffect, useRef, useState } from "react";
import { Select, Popover } from "@mantine/core";
import { DateInput, DatePickerInput } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { FaCalendarAlt, FaMapMarkerAlt, FaMinus, FaPlus, FaTimes, FaPlane, FaCheck, FaBuilding, FaSearch } from "react-icons/fa";
import { AirportList } from "@/util/AirportList";
import { notifications } from "@mantine/notifications";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import moment from "moment";
import { IoIosSwap, IoMdPerson } from "react-icons/io";
import styles from './FlightSearch.module.css';
import listingStyles from './FlightSearchListing.module.css';
import MobileAirportSelector from './MobileAirportSelector';
import { useHolidayPackageStore } from '@/components/Store/HolidayPackageStore';

const airportToLocation = (code) => {
    const airport = AirportList.find((a) => a.airportCode === code);
    if (!airport) {
        return { lat: null, lng: null, city: '', country: '', countryCode: '', airportName: '' };
    }
    return {
        lat: null,
        lng: null,
        city: airport.cityName || '',
        country: airport.countryName || '',
        countryCode: airport.countryCode || '',
        airportName: airport.airportName || '',
    };
};

export default function FlightSearch({ onSearch, variant = 'home' }) {
    const isListing = variant === 'listing';
    const multiCityActionsRef = useRef(null);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const { isActive, packageConfig, updateServiceSearchData } = useHolidayPackageStore();
    const [popoverOpened, setPopoverOpened] = useState(false);
    const [breakPoint, setBreakPoint] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Mobile airport selector states
    const [mobileFromSelectorOpen, setMobileFromSelectorOpen] = useState(false);
    const [mobileToSelectorOpen, setMobileToSelectorOpen] = useState(false);

    // Airport dropdown states
    const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
    const [toDropdownOpen, setToDropdownOpen] = useState(false);
    const [fromSearchQuery, setFromSearchQuery] = useState('');
    const [toSearchQuery, setToSearchQuery] = useState('');

    // Multi-city dropdown states
    const [multiCityDropdowns, setMultiCityDropdowns] = useState({});
    const [multiCitySearchQueries, setMultiCitySearchQueries] = useState({});

    // Recent airports state
    const [recentFromAirports, setRecentFromAirports] = useState([]);
    const [recentToAirports, setRecentToAirports] = useState([]);

    const [formData, setFormData] = useState({
        flightType: "OneWay",
        from: "",
        to: "",
        departureDate: null,
        returnDate: null,
        dateRange: [null, null],
        adults: 1,
        children: 0,
        infants: 0,
        cabinClass: "Y",
        cabinClassTitle: "Economy",
    });

    const [multiCityFlights, setMultiCityFlights] = useState([
        { from: "", to: "", departureDate: null },
        { from: "", to: "", departureDate: null }
    ]);

    useEffect(() => {
        setBreakPoint(window.innerWidth <= 700);
        setIsMobile(window.innerWidth <= 768);

        // Load recent airports from localStorage
        const savedRecentFrom = localStorage.getItem('recentFromAirports');
        const savedRecentTo = localStorage.getItem('recentToAirports');
        if (savedRecentFrom) {
            setRecentFromAirports(JSON.parse(savedRecentFrom));
        }
        if (savedRecentTo) {
            setRecentToAirports(JSON.parse(savedRecentTo));
        }

        const handleResize = () => {
            setBreakPoint(window.innerWidth <= 700);
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);

        if (pathname === '/flights') {
            const DepartureCode = searchParams.get('DepartureCode');
            const ArrivalCode = searchParams.get('ArrivalCode');
            const DepartureDate = searchParams.get('DepartureDate');
            const adult = Number(searchParams.get('adult'));
            const child = Number(searchParams.get('child'));
            const infant = Number(searchParams.get('infant'));
            const CabinType = searchParams.get('CabinType');
            const AirTripType = searchParams.get('AirTripType');
            const depDate = DepartureDate ? new Date(DepartureDate) : null;
            const retDate = AirTripType === 'Return' && searchParams.get('ReturnDate') ? new Date(searchParams.get('ReturnDate')) : null;

            setFormData({
                flightType: AirTripType || "OneWay",
                from: DepartureCode || "",
                to: ArrivalCode || "",
                departureDate: AirTripType === 'OneWay' ? depDate : null,
                returnDate: null,
                dateRange: AirTripType === 'Return' ? [depDate, retDate] : [null, null],
                adults: adult || 1,
                children: child || 0,
                infants: infant || 0,
                cabinClass: CabinType || "All",
                cabinClassTitle: CabinType === 'Y' ? 'Economy' :
                    CabinType === 'C' ? 'Business' :
                        CabinType === 'F' ? 'First' :
                            CabinType === 'S' ? 'Premium Economy' : 'All',
            });

            // Handle multi-city data from URL
            if (AirTripType === 'MultiCity') {
                const legs = [];
                let index = 1;
                while (searchParams.get(`flight${index}_from`)) {
                    legs.push({
                        from: searchParams.get(`flight${index}_from`),
                        to: searchParams.get(`flight${index}_to`),
                        departureDate: searchParams.get(`flight${index}_date`) ? new Date(searchParams.get(`flight${index}_date`)) : null
                    });
                    index++;
                }
                if (legs.length > 0) {
                    setMultiCityFlights(legs);
                }
            }
        }

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    const cabinClassOptions = [
        { title: "Economy", value: "Y" },
        { title: "Business", value: "C" },
        { title: "First", value: "F" },
        { title: "Premium Economy", value: "S" }
    ];

    // Filter airports based on search query and organize by country
    const filterAirports = (airports, query, selectedCode = null) => {
        let filtered = airports;

        if (query) {
            const lowerQuery = query.toLowerCase().trim();
            const directMatches = airports.filter((airport) =>
                airport.airportName.toLowerCase().includes(lowerQuery) ||
                airport.airportCode.toLowerCase().includes(lowerQuery) ||
                airport.cityName.toLowerCase().includes(lowerQuery) ||
                airport.countryName.toLowerCase().includes(lowerQuery) ||
                String(airport.cityCode || '').toLowerCase() === lowerQuery
            );

            // When code/city matches (e.g. DXB), also show other airports in same city
            const matchedCityCodes = new Set(
                directMatches
                    .map((a) => String(a.cityCode || '').toUpperCase())
                    .filter(Boolean)
            );
            airports.forEach((airport) => {
                if (String(airport.cityCode || '').toLowerCase() === lowerQuery) {
                    matchedCityCodes.add(String(airport.cityCode).toUpperCase());
                }
            });

            const matchKeys = new Set(
                directMatches.map((a) => a.airportCode)
            );
            filtered = airports.filter((airport) => {
                if (matchKeys.has(airport.airportCode)) return true;
                const cityCode = String(airport.cityCode || '').toUpperCase();
                return cityCode && matchedCityCodes.has(cityCode);
            });

            // Prefer exact code, then city "All Airports", then rest
            filtered.sort((a, b) => {
                const aExact = a.airportCode.toLowerCase() === lowerQuery ? 0 : 1;
                const bExact = b.airportCode.toLowerCase() === lowerQuery ? 0 : 1;
                if (aExact !== bExact) return aExact - bExact;

                const aAll = /^all airports$/i.test(a.airportName) ? 0 : 1;
                const bAll = /^all airports$/i.test(b.airportName) ? 0 : 1;
                if (aAll !== bAll) return aAll - bAll;

                return String(a.airportName || '').localeCompare(String(b.airportName || ''));
            });
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

    // "All Airports" (city codes like DXB) → show city name instead
    const getAirportDisplayName = (airport) => {
        if (!airport) return '';
        if (/^all airports$/i.test(String(airport.airportName || '').trim())) {
            return airport.cityName || airport.airportCode;
        }
        return airport.airportName || airport.cityName || '';
    };

    const getAirportDisplayLocation = (airport) => {
        if (!airport) return '';
        if (/^all airports$/i.test(String(airport.airportName || '').trim())) {
            return airport.countryName || '';
        }
        return airport.cityName || '';
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

    // Custom Airport Dropdown Component
    const AirportDropdown = ({ value, onChange, excludeCode, placeholder, dropdownOpen, setDropdownOpen, searchQuery, setSearchQuery, label, type, card }) => {
        // Only show recent airports if no search query, otherwise show filtered results
        const getAirportsToDisplay = () => {
            if (searchQuery) {
                // Show filtered results when user is typing
                return filterAirports(
                    excludeCode ? AirportList.filter(a => a.airportCode !== excludeCode) : AirportList,
                    searchQuery,
                    value
                );
            } else {
                // Show recent airports when no search query
                const recentCodes = type === 'from' ? recentFromAirports : recentToAirports;
                if (recentCodes.length > 0) {
                    const recentAirports = recentCodes
                        .map(code => AirportList.find(a => a.airportCode === code))
                        .filter(Boolean)
                        .filter(airport => !excludeCode || airport.airportCode !== excludeCode);

                    if (recentAirports.length > 0) {
                        // Group recent airports by country
                        const groupedByCountry = recentAirports.reduce((acc, airport) => {
                            const country = airport.countryName;
                            if (!acc[country]) {
                                acc[country] = [];
                            }
                            acc[country].push(airport);
                            return acc;
                        }, {});

                        return Object.entries(groupedByCountry).map(([country, airports]) => ({
                            country,
                            airports
                        }));
                    }
                }
                return [];
            }
        };

        const groupedAirports = getAirportsToDisplay();

        // // Lock body scroll on mobile when dropdown is open
        // useEffect(() => {
        //     if (isMobile && dropdownOpen) {
        //         document.body.style.overflow = 'hidden';
        //     } else {
        //         document.body.style.overflow = '';
        //     }

        //     return () => {
        //         document.body.style.overflow = '';
        //     };
        // }, [dropdownOpen]);

        const handleSelect = (airportCode) => {
            onChange(airportCode);
            addToRecentAirports(airportCode, type);
            setDropdownOpen(false);
            setSearchQuery('');
        };

        const handleClear = (e) => {
            e.stopPropagation();
            onChange('');
            setSearchQuery('');
        };

        const handleDropdownOpen = () => {
            setSearchQuery(''); // Clear search when opening dropdown
            setDropdownOpen(true);
        };

        const searchchange = (e) => {
            setSearchQuery(e.target.value);
        }
        const totalAirports = groupedAirports.reduce((sum, group) => sum + group.airports.length, 0);

        const fieldLabelText = label
            || (type === 'from'
                ? (isListing ? 'WHERE FROM' : 'LEAVING FROM?')
                : (isListing ? 'WHERE TO' : 'GOING TO?'));
        const emptyText = placeholder || (isListing ? 'Select airport' : 'City or airport');

        // `card` = standalone white field (multi-city legs). Default = pill-bar field (hotel-style).
        const useCardField = card === true;
        const cardTrigger = (
            <div
                className={`${listingStyles.listingField} ${useCardField ? listingStyles.homeField : ''} ${type === 'from' ? listingStyles.fromField : ''}`}
                onClick={isMobile ? () => setDropdownOpen(true) : handleDropdownOpen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isMobile) setDropdownOpen(true);
                        else handleDropdownOpen();
                    }
                }}
            >
                <div className={listingStyles.fieldIcon}><FaMapMarkerAlt /></div>
                <div className={listingStyles.fieldBody}>
                    <span className={listingStyles.fieldLabel}>{fieldLabelText}</span>
                    <div className={listingStyles.fieldValue} style={{ position: 'relative', paddingRight: value ? '22px' : 0 }}>
                        <span className={!value ? listingStyles.fieldValuePlaceholder : ''}>
                            {value ? getAirportLabel(value) : emptyText}
                        </span>
                        {value && (
                            <button
                                className={listingStyles.clearButton}
                                onClick={handleClear}
                                type="button"
                                aria-label="Clear selection"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );

        const airportDropdownPanel = (
            <>
                <div className={styles.searchWrapper}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search airports..."
                        value={searchQuery}
                        onChange={searchchange}
                        autoFocus
                    />
                </div>
                <div className={styles.airportList}>
                    {totalAirports > 0 ? (
                        groupedAirports.map((group, groupIndex) => (
                            <React.Fragment key={group.country}>
                                <div className={styles.countryHeader}>
                                    {!searchQuery ? (groupIndex === 0 ? 'Recent Searches' : '') : group.country}
                                    {value && group.airports.find(a => a.airportCode === value) && (
                                        <span className={styles.selectedBadge}>Current</span>
                                    )}
                                </div>
                                {group.airports.map((airport) => (
                                    <div
                                        key={airport.airportCode}
                                        className={`${styles.airportOption} ${value === airport.airportCode ? styles.selected : ''}`}
                                        onClick={() => handleSelect(airport.airportCode)}
                                    >
                                        <div className={styles.airportIconWrapper}>
                                            <FaPlane className={styles.airportIcon} />
                                        </div>
                                        <div className={styles.airportDetails}>
                                            <div className={styles.airportMainInfo}>
                                                <span className={styles.airportName}>{getAirportDisplayName(airport)}</span>
                                                <span className={styles.airportCode}>({airport.airportCode})</span>
                                            </div>
                                            <div className={styles.airportLocation}>
                                                {getAirportDisplayLocation(airport)}
                                            </div>
                                        </div>
                                        {value === airport.airportCode && (
                                            <div className={styles.checkmarkWrapper}>
                                                <FaCheck className={styles.checkmark} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            {searchQuery ? 'No airports found' : (type === 'from' ? 'Start typing to search leaving airports...' : 'Start typing to search destination airports...')}
                        </div>
                    )}
                </div>
            </>
        );

        if (isMobile) {
            return (
                <>
                    {cardTrigger}
                    <MobileAirportSelector
                        isOpen={dropdownOpen}
                        onClose={() => setDropdownOpen(false)}
                        onSelect={handleSelect}
                        selectedValue={value}
                        excludeCode={excludeCode}
                        label={label}
                        type={type}
                        recentAirports={type === 'from' ? recentFromAirports : recentToAirports}
                    />
                </>
            );
        }

        return (
            <Popover
                opened={dropdownOpen}
                onChange={setDropdownOpen}
                position="bottom-start"
                width="target"
                shadow="md"
                offset={8}
                clickOutsideEvents={["mouseup", "touchend"]}
                middlewares={{ flip: false, shift: false }}
            >
                <Popover.Target>
                    {cardTrigger}
                </Popover.Target>
                <Popover.Dropdown className={styles.customDropdown}>
                    {airportDropdownPanel}
                </Popover.Dropdown>
            </Popover>
        );
    };

    const handleChange = (field, value) => {
        if (field === "cabinClass") {
            const selectedOption = cabinClassOptions.find(option => option.title === value);
            if (selectedOption) {
                setFormData((prev) => ({
                    ...prev,
                    cabinClass: selectedOption.value,
                    cabinClassTitle: value,
                }));
            }
        } else if (field === "flightType") {
            // Reset dates when flight type changes
            setFormData((prev) => ({
                ...prev,
                flightType: value,
                departureDate: value === "OneWay" ? null : prev.departureDate,
                dateRange: value === "Return" ? [null, null] : prev.dateRange,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value,
            }));
        }

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

    // Multi-city handlers
    const getMultiCityLegKey = (flight) => {
        if (!flight?.from || !flight?.to || !flight?.departureDate) return null;
        return `${flight.from}|${flight.to}|${moment(flight.departureDate).format('YYYY-MM-DD')}`;
    };

    const findDuplicateMultiCityLegIndex = (flights, currentIndex) => {
        const currentKey = getMultiCityLegKey(flights[currentIndex]);
        if (!currentKey) return -1;

        return flights.findIndex(
            (flight, index) => index !== currentIndex && getMultiCityLegKey(flight) === currentKey
        );
    };

    const showDuplicateMultiCityLegError = (currentIndex, duplicateIndex) => {
        notifications.show({
            title: 'Error',
            message: `Flight ${currentIndex + 1} cannot have the same route and date as Flight ${duplicateIndex + 1}.`,
            autoClose: 2000,
            color: 'red'
        });
    };

    const handleMultiCityChange = (index, field, value) => {
        const updatedFlights = [...multiCityFlights];
        updatedFlights[index] = { ...updatedFlights[index], [field]: value };

        // When To is set, auto-fill the next leg's From (user can still change it)
        if (field === 'to' && index < updatedFlights.length - 1 && value) {
            updatedFlights[index + 1] = {
                ...updatedFlights[index + 1],
                from: value,
            };
        }

        const duplicateIndex = findDuplicateMultiCityLegIndex(updatedFlights, index);
        if (duplicateIndex !== -1) {
            showDuplicateMultiCityLegError(index, duplicateIndex);
            return;
        }

        // Also block if auto-filled next leg became a duplicate
        if (field === 'to' && index < updatedFlights.length - 1) {
            const nextDup = findDuplicateMultiCityLegIndex(updatedFlights, index + 1);
            if (nextDup !== -1) {
                showDuplicateMultiCityLegError(index + 1, nextDup);
                return;
            }
        }

        setMultiCityFlights(updatedFlights);
    };

    const addMultiCityFlight = () => {
        if (multiCityFlights.length < 5) {
            const lastTo = multiCityFlights[multiCityFlights.length - 1]?.to || '';
            setMultiCityFlights([
                ...multiCityFlights,
                { from: lastTo, to: '', departureDate: null },
            ]);
            // Keep Add/Search visible after a new leg expands the mobile panel
            requestAnimationFrame(() => {
                multiCityActionsRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        } else {
            notifications.show({
                title: 'Limit Reached',
                message: 'Maximum 5 flights allowed.',
                autoClose: 2000,
                color: 'orange'
            });
        }
    };

    const removeMultiCityFlight = (index) => {
        if (multiCityFlights.length > 2) {
            const updatedFlights = multiCityFlights.filter((_, i) => i !== index);
            setMultiCityFlights(updatedFlights);
        }
    };

    // Swap function for regular flights
    const handleSwap = () => {
        setFormData((prev) => ({
            ...prev,
            from: prev.to,
            to: prev.from,
        }));
    };

    // Swap function for multi-city flights
    const handleMultiCitySwap = (index) => {
        const updatedFlights = [...multiCityFlights];
        const temp = updatedFlights[index].from;
        updatedFlights[index] = {
            ...updatedFlights[index],
            from: updatedFlights[index].to,
            to: temp,
        };

        // Keep next leg From in sync with this leg's new To
        if (index < updatedFlights.length - 1 && updatedFlights[index].to) {
            updatedFlights[index + 1] = {
                ...updatedFlights[index + 1],
                from: updatedFlights[index].to,
            };
        }

        const duplicateIndex = findDuplicateMultiCityLegIndex(updatedFlights, index);
        if (duplicateIndex !== -1) {
            showDuplicateMultiCityLegError(index, duplicateIndex);
            return;
        }

        setMultiCityFlights(updatedFlights);
    };

    // Validation logic
    const validateForm = () => {
        if (formData.flightType === "MultiCity") {
            // Validate multi-city flights
            for (let i = 0; i < multiCityFlights.length; i++) {
                const flight = multiCityFlights[i];
                if (!flight.from) {
                    notifications.show({
                        title: 'Error',
                        message: `Please select departure airport for Flight ${i + 1}.`,
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
                if (!flight.to) {
                    notifications.show({
                        title: 'Error',
                        message: `Please select destination airport for Flight ${i + 1}.`,
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
                if (flight.from === flight.to) {
                    notifications.show({
                        title: 'Error',
                        message: `Departure and destination airports cannot be the same for Flight ${i + 1}.`,
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
                if (!flight.departureDate) {
                    notifications.show({
                        title: 'Error',
                        message: `Please select departure date for Flight ${i + 1}.`,
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
            }

            const seenLegs = new Map();
            for (let i = 0; i < multiCityFlights.length; i++) {
                const legKey = getMultiCityLegKey(multiCityFlights[i]);
                if (!legKey) continue;

                if (seenLegs.has(legKey)) {
                    showDuplicateMultiCityLegError(i, seenLegs.get(legKey));
                    return false;
                }

                seenLegs.set(legKey, i);
            }
        } else {
            // Original validation for one-way and return
            if (!formData.from) {
                notifications.show({
                    title: 'Error',
                    message: 'Please select departure airport.',
                    autoClose: 2000,
                    color: 'red'
                });
                return false;
            }
            if (!formData.to) {
                notifications.show({
                    title: 'Error',
                    message: 'Please select destination airport.',
                    autoClose: 2000,
                    color: 'red'
                });
                return false;
            }
            if (formData.from === formData.to) {
                notifications.show({
                    title: 'Error',
                    message: 'Departure and destination airports cannot be the same.',
                    autoClose: 2000,
                    color: 'red'
                });
                return false;
            }
            if (formData.flightType === "OneWay") {
                if (!formData.departureDate) {
                    notifications.show({
                        title: 'Error',
                        message: 'Please select departure date.',
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
            } else if (formData.flightType === "Return") {
                if (!formData.dateRange[0] || !formData.dateRange[1]) {
                    notifications.show({
                        title: 'Error',
                        message: 'Please select both departure and return dates.',
                        autoClose: 2000,
                        color: 'red'
                    });
                    return false;
                }
            }
        }

        if (formData.adults < 1) {
            notifications.show({
                title: 'Error',
                message: 'At least one adult required.',
                autoClose: 2000,
                color: 'red'
            });
            return false;
        }
        return true;
    };
    // Handle search button click
    const handleSearch = () => {
        if (validateForm()) {
            const isPackageContext =
                searchParams.get('packageMode') === 'true' ||
                searchParams.get('edit') === 'true';

            if (formData.flightType === "MultiCity") {
                // Build multi-city search params
                const params = new URLSearchParams({
                    adult: formData.adults,
                    child: formData.children,
                    infant: formData.infants,
                    CabinType: formData.cabinClass,
                    AirTripType: formData.flightType,
                });

                // Add each flight segment
                multiCityFlights.forEach((flight, index) => {
                    params.append(`flight${index + 1}_from`, flight.from);
                    params.append(`flight${index + 1}_to`, flight.to);
                    params.append(`flight${index + 1}_date`, moment(flight.departureDate).format("YYYY-MM-DD"));
                });

                // Keep package flow flags; multi-city is not written into package search shape
                if (isPackageContext) {
                    if (searchParams.get('packageMode') === 'true' || isActive) {
                        params.set('packageMode', 'true');
                    }
                    if (searchParams.get('edit') === 'true') {
                        params.set('edit', 'true');
                    }
                }

                if (onSearch) onSearch();
                params.set('r', String(Date.now()));
                router.push(`/flights?${params.toString()}`);
            } else {
                const depDate = formData.flightType === "OneWay"
                    ? moment(formData.departureDate).format("YYYY-MM-DD")
                    : moment(formData.dateRange[0]).format("YYYY-MM-DD");

                const retDate = formData.flightType === "Return" && formData.dateRange[1]
                    ? moment(formData.dateRange[1]).format("YYYY-MM-DD")
                    : '';

                const params = new URLSearchParams({
                    DepartureCode: formData.from,
                    ArrivalCode: formData.to,
                    DepartureDate: depDate,
                    ReturnDate: retDate,
                    adult: formData.adults,
                    child: formData.children,
                    infant: formData.infants,
                    CabinType: formData.cabinClass,
                    AirTripType: formData.flightType,
                });

                if (isPackageContext) {
                    if (searchParams.get('packageMode') === 'true' || isActive) {
                        params.set('packageMode', 'true');
                    }
                    if (searchParams.get('edit') === 'true') {
                        params.set('edit', 'true');
                    }

                    const prevFlight = packageConfig?.searchData?.flight || {};
                    const fromLocation =
                        prevFlight.from === formData.from && prevFlight.fromLocation
                            ? prevFlight.fromLocation
                            : airportToLocation(formData.from);
                    const toLocation =
                        prevFlight.to === formData.to && prevFlight.toLocation
                            ? prevFlight.toLocation
                            : airportToLocation(formData.to);

                    updateServiceSearchData(
                        'flight',
                        {
                            from: formData.from,
                            to: formData.to,
                            cabinClass: formData.cabinClass,
                            cabinClassName: (formData.cabinClassTitle || 'economy').toLowerCase(),
                            tripType: formData.flightType,
                            fromLocation,
                            toLocation,
                            dates: {
                                depart: depDate,
                                return: retDate || null,
                                check_in: depDate,
                                check_out: retDate || depDate,
                            },
                        },
                        {
                            totalGuests: {
                                adults: formData.adults,
                                children: formData.children,
                                infants: formData.infants,
                            },
                            dates: {
                                checkIn: depDate,
                                checkOut: retDate || depDate,
                            },
                        }
                    );
                }

                if (onSearch) onSearch();
                params.set('r', String(Date.now()));
                router.push(`/flights?${params.toString()}`);
            }
        }
    };

    const travelersPopoverContent = (
        <div className="p-2">
            <div>
                <div className="e484bb5b7a mt-2">
                    <div className="c5aae0350e">
                        <label className="small">Adults</label>
                    </div>
                    <div className="e301a14002">
                        <div className="e301a14002">
                            <button onClick={() => handleCountChange('adults', false)} className="adult-modal-btn"><FaMinus /></button>
                            <span className="mx-2" aria-hidden="true">{formData.adults}</span>
                            <button onClick={() => handleCountChange('adults', true)} className="adult-modal-btn"><FaPlus /></button>
                        </div>
                    </div>
                </div>
                <div className="e484bb5b7a mt-2">
                    <div className="c5aae0350e">
                        <label className="small">Children</label>
                    </div>
                    <div className="e301a14002">
                        <div className="e301a14002">
                            <button onClick={() => handleCountChange('children', false)} className="adult-modal-btn"><FaMinus /></button>
                            <span className="mx-2" aria-hidden="true">{formData.children}</span>
                            <button onClick={() => handleCountChange('children', true)} className="adult-modal-btn"><FaPlus /></button>
                        </div>
                    </div>
                </div>
                <div className="e484bb5b7a mt-2">
                    <div className="c5aae0350e">
                        <label className="small">Infant</label>
                    </div>
                    <div className="e301a14002">
                        <div className="e301a14002">
                            <button onClick={() => handleCountChange('infants', false)} className="adult-modal-btn"><FaMinus /></button>
                            <span className="mx-2" aria-hidden="true">{formData.infants}</span>
                            <button onClick={() => handleCountChange('infants', true)} className="adult-modal-btn"><FaPlus /></button>
                        </div>
                    </div>
                </div>
                <hr />
                <p className="fw-bold small">Cabin Class</p>
                <select onChange={(e) => handleChange("cabinClass", e.target.value)} value={formData.cabinClassTitle} className="height-25 form-select">
                    {cabinClassOptions.map(option => (
                        <option key={option.value} value={option.title}>{option.title}</option>
                    ))}
                </select>
            </div>
            <button onClick={() => setPopoverOpened(false)} type="button" className="btn mt-3 w-100" style={{ backgroundColor: '#e7247a', color: '#fff' }}>Done</button>
        </div>
    );

    const travelersLabel = `${formData.adults + formData.children + formData.infants} traveler${formData.adults + formData.children + formData.infants !== 1 ? 's' : ''}, ${formData.cabinClassTitle}`;

    const renderHomeTravelersCard = () => (
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
                <div
                    className={`${listingStyles.listingField} ${listingStyles.homeField}`}
                    onClick={() => setPopoverOpened((o) => !o)}
                >
                    <div className={listingStyles.fieldIcon}><IoMdPerson /></div>
                    <div className={listingStyles.fieldBody}>
                        <span className={listingStyles.fieldLabel}>TRAVELERS, CABIN CLASS</span>
                        <button type="button" className={listingStyles.travelersBtn}>
                            {travelersLabel}
                        </button>
                    </div>
                </div>
            </Popover.Target>
            <Popover.Dropdown>{travelersPopoverContent}</Popover.Dropdown>
        </Popover>
    );

    const renderListingTravelers = (opts = {}) => (
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
                <div
                    className={`${listingStyles.listingField}${opts.card ? ` ${listingStyles.homeField}` : ''}`}
                    onClick={() => setPopoverOpened((o) => !o)}
                >
                    <div className={listingStyles.fieldIcon}><IoMdPerson /></div>
                    <div className={listingStyles.fieldBody}>
                        <span className={listingStyles.fieldLabel}>{opts.card ? 'TRAVELERS, CABIN CLASS' : 'PASSENGERS'}</span>
                        <button type="button" className={listingStyles.travelersBtn}>{travelersLabel}</button>
                    </div>
                </div>
            </Popover.Target>
            <Popover.Dropdown>{travelersPopoverContent}</Popover.Dropdown>
        </Popover>
    );

    const renderListingDateField = () => (
        <div className={listingStyles.listingField}>
            <div className={listingStyles.fieldIcon}><FaCalendarAlt /></div>
            <div className={listingStyles.fieldBody}>
                <span className={listingStyles.fieldLabel}>
                    {formData.flightType === "OneWay" ? "DEPARTURE" : "DEPARTURE — RETURN"}
                </span>
                <div className={listingStyles.fieldValue}>
                    {formData.flightType === "OneWay" ? (
                        <DateInput
                            variant="unstyled"
                            placeholder="Select date"
                            valueFormat="DD MMM YYYY"
                            value={formData.departureDate}
                            onFocus={(e) => e.target.select()}
                            onChange={(date) => handleChange("departureDate", date)}
                            minDate={new Date()}
                        />
                    ) : (
                        <DatePickerInput
                            variant="unstyled"
                            placeholder="Select dates"
                            valueFormat="DD MMM YYYY"
                            value={formData.dateRange}
                            onChange={(dates) => handleChange("dateRange", dates)}
                            minDate={new Date()}
                            numberOfColumns={breakPoint ? 1 : 2}
                            type="range"
                        />
                    )}
                </div>
            </div>
        </div>
    );

    const renderListingToggle = () => (
        <div className={listingStyles.toggleGroup} role="tablist" aria-label="Flight type">
            <button
                type="button"
                role="tab"
                aria-selected={formData.flightType === 'OneWay'}
                onClick={() => handleChange("flightType", "OneWay")}
                className={`${listingStyles.toggleItem} ${formData.flightType === 'OneWay' ? listingStyles.toggleActive : ''}`}
            >
                One way
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={formData.flightType === 'Return'}
                onClick={() => handleChange("flightType", "Return")}
                className={`${listingStyles.toggleItem} ${formData.flightType === 'Return' ? listingStyles.toggleActive : ''}`}
            >
                Round trip
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={formData.flightType === 'MultiCity'}
                onClick={() => handleChange("flightType", "MultiCity")}
                className={`${listingStyles.toggleItem} ${formData.flightType === 'MultiCity' ? listingStyles.toggleActive : ''}`}
            >
                Multi city
            </button>
        </div>
    );

    if (isListing) {
        if (formData.flightType === "MultiCity") {
            return (
                <div className={listingStyles.wrapper}>
                    <div className={listingStyles.searchCard}>
                        {renderListingToggle()}
                        <div className={listingStyles.multiCityShell}>
                            {renderListingTravelers({ card: true })}
                            {multiCityFlights.map((flight, index) => (
                                <div key={index} className={listingStyles.multiCityLegCard}>
                                    <div className={listingStyles.multiCityLegHeader}>
                                        <span className={listingStyles.multiCityLegTitle}>Flight {index + 1}</span>
                                        {multiCityFlights.length > 2 && (
                                            <button type="button" className={listingStyles.removeBtn} onClick={() => removeMultiCityFlight(index)}>
                                                <FaTimes /> Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className={listingStyles.multiCityFieldsRow}>
                                        <div className={listingStyles.homeRoutePair}>
                                            <AirportDropdown
                                                value={flight.from}
                                                onChange={(value) => handleMultiCityChange(index, "from", value)}
                                                placeholder="City or airport"
                                                label="FROM?"
                                                type="from"
                                                card
                                                dropdownOpen={multiCityDropdowns[`${index}-from`] || false}
                                                setDropdownOpen={(open) => setMultiCityDropdowns(prev => ({ ...prev, [`${index}-from`]: open }))}
                                                searchQuery={multiCitySearchQueries[`${index}-from`] || ''}
                                                setSearchQuery={(query) => setMultiCitySearchQueries(prev => ({ ...prev, [`${index}-from`]: query }))}
                                            />
                                            <button
                                                type="button"
                                                className={listingStyles.homeSwap}
                                                onClick={() => handleMultiCitySwap(index)}
                                                aria-label="Swap airports"
                                            >
                                                <IoIosSwap />
                                            </button>
                                            <AirportDropdown
                                                value={flight.to}
                                                onChange={(value) => handleMultiCityChange(index, "to", value)}
                                                excludeCode={flight.from}
                                                placeholder="City or airport"
                                                label="TO?"
                                                type="to"
                                                card
                                                dropdownOpen={multiCityDropdowns[`${index}-to`] || false}
                                                setDropdownOpen={(open) => setMultiCityDropdowns(prev => ({ ...prev, [`${index}-to`]: open }))}
                                                searchQuery={multiCitySearchQueries[`${index}-to`] || ''}
                                                setSearchQuery={(query) => setMultiCitySearchQueries(prev => ({ ...prev, [`${index}-to`]: query }))}
                                            />
                                        </div>
                                        <div className={`${listingStyles.listingField} ${listingStyles.homeField}`}>
                                            <div className={listingStyles.fieldIcon}><FaCalendarAlt /></div>
                                            <div className={listingStyles.fieldBody}>
                                                <span className={listingStyles.fieldLabel}>DEPARTURE</span>
                                                <div className={listingStyles.fieldValue}>
                                                    <DateInput
                                                        key={`listing-mc-date-${index}-${index > 0 && multiCityFlights[index - 1].departureDate
                                                            ? moment(multiCityFlights[index - 1].departureDate).format('YYYY-MM-DD')
                                                            : 'start'}`}
                                                        variant="unstyled"
                                                        placeholder="Select date"
                                                        valueFormat="DD MMM YYYY"
                                                        value={flight.departureDate}
                                                        onFocus={(e) => e.target.select()}
                                                        minDate={index > 0 && multiCityFlights[index - 1].departureDate
                                                            ? multiCityFlights[index - 1].departureDate
                                                            : new Date()}
                                                        defaultDate={flight.departureDate
                                                            || (index > 0 && multiCityFlights[index - 1].departureDate
                                                                ? multiCityFlights[index - 1].departureDate
                                                                : new Date())}
                                                        onChange={(date) => handleMultiCityChange(index, "departureDate", date)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={multiCityActionsRef} className={listingStyles.multiCityActions}>
                                <button
                                    type="button"
                                    className={listingStyles.addFlightBtn}
                                    onClick={addMultiCityFlight}
                                    disabled={multiCityFlights.length >= 5}
                                >
                                    <FaPlus /> Add Another Flight
                                </button>
                                <button className={listingStyles.searchBtn} onClick={handleSearch} type="button">
                                    <FaSearch /> Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={listingStyles.wrapper}>
                <div className={listingStyles.searchCard}>
                    {renderListingToggle()}
                    <div className={listingStyles.searchBar}>
                        <div className={listingStyles.fieldsRow}>
                            <div className={listingStyles.fromWrap}>
                                <AirportDropdown
                                    value={formData.from}
                                    onChange={(value) => handleChange("from", value)}
                                    placeholder="Search airport..."
                                    label="Leaving From?"
                                    type="from"
                                    dropdownOpen={fromDropdownOpen}
                                    setDropdownOpen={setFromDropdownOpen}
                                    searchQuery={fromSearchQuery}
                                    setSearchQuery={setFromSearchQuery}
                                />
                                <button
                                    type="button"
                                    className={listingStyles.swapBtn}
                                    onClick={handleSwap}
                                    aria-label="Swap airports"
                                >
                                    <IoIosSwap />
                                </button>
                            </div>
                            <AirportDropdown
                                value={formData.to}
                                onChange={(value) => handleChange("to", value)}
                                excludeCode={formData.from}
                                placeholder="Search airport..."
                                label="Going To?"
                                type="to"
                                dropdownOpen={toDropdownOpen}
                                setDropdownOpen={setToDropdownOpen}
                                searchQuery={toSearchQuery}
                                setSearchQuery={setToSearchQuery}
                            />
                            {renderListingDateField()}
                            {renderListingTravelers()}
                        </div>
                        <button className={listingStyles.searchBtn} onClick={handleSearch} type="button">
                            <FaSearch /> Search
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={listingStyles.homeRoot}>
            <div className="d-flex flex-wrap mb-2 gap-3 justify-content-between align-items-center">
                <div
                    className={listingStyles.toggleGroup}
                    role="tablist"
                    aria-label="Flight type"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={formData.flightType === 'OneWay'}
                        onClick={() => handleChange("flightType", "OneWay")}
                        className={`${listingStyles.toggleItem} ${formData.flightType === 'OneWay' ? listingStyles.toggleActive : ''}`}
                    >
                        One way
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={formData.flightType === 'Return'}
                        onClick={() => handleChange("flightType", "Return")}
                        className={`${listingStyles.toggleItem} ${formData.flightType === 'Return' ? listingStyles.toggleActive : ''}`}
                    >
                        Round trip
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={formData.flightType === 'MultiCity'}
                        onClick={() => handleChange("flightType", "MultiCity")}
                        className={`${listingStyles.toggleItem} ${formData.flightType === 'MultiCity' ? listingStyles.toggleActive : ''}`}
                    >
                        Multi city
                    </button>
                </div>
            </div>

            {/* Conditional rendering based on flight type */}
            {formData.flightType === "MultiCity" ? (
                <div className={`${listingStyles.homeShell} ${listingStyles.multiCityShell}`}>
                    {renderHomeTravelersCard()}

                    {multiCityFlights.map((flight, index) => (
                        <div key={index} className={listingStyles.multiCityLegCard}>
                            <div className={listingStyles.multiCityLegHeader}>
                                <span className={listingStyles.multiCityLegTitle}>Flight {index + 1}</span>
                                {multiCityFlights.length > 2 && (
                                    <button
                                        type="button"
                                        className={listingStyles.removeBtn}
                                        onClick={() => removeMultiCityFlight(index)}
                                    >
                                        <FaTimes /> Remove
                                    </button>
                                )}
                            </div>

                            <div className={listingStyles.multiCityFieldsRow}>
                                <div className={listingStyles.homeRoutePair}>
                                    <AirportDropdown
                                        value={flight.from}
                                        onChange={(value) => handleMultiCityChange(index, "from", value)}
                                        placeholder="City or airport"
                                        label="FROM?"
                                        type="from"
                                        card
                                        dropdownOpen={multiCityDropdowns[`${index}-from`] || false}
                                        setDropdownOpen={(open) => setMultiCityDropdowns(prev => ({ ...prev, [`${index}-from`]: open }))}
                                        searchQuery={multiCitySearchQueries[`${index}-from`] || ''}
                                        setSearchQuery={(query) => setMultiCitySearchQueries(prev => ({ ...prev, [`${index}-from`]: query }))}
                                    />
                                    <button
                                        type="button"
                                        className={listingStyles.homeSwap}
                                        onClick={() => handleMultiCitySwap(index)}
                                        aria-label="Swap airports"
                                    >
                                        <IoIosSwap />
                                    </button>
                                    <AirportDropdown
                                        value={flight.to}
                                        onChange={(value) => handleMultiCityChange(index, "to", value)}
                                        excludeCode={flight.from}
                                        placeholder="City or airport"
                                        label="TO?"
                                        type="to"
                                        card
                                        dropdownOpen={multiCityDropdowns[`${index}-to`] || false}
                                        setDropdownOpen={(open) => setMultiCityDropdowns(prev => ({ ...prev, [`${index}-to`]: open }))}
                                        searchQuery={multiCitySearchQueries[`${index}-to`] || ''}
                                        setSearchQuery={(query) => setMultiCitySearchQueries(prev => ({ ...prev, [`${index}-to`]: query }))}
                                    />
                                </div>

                                <div className={`${listingStyles.listingField} ${listingStyles.homeField}`}>
                                    <div className={listingStyles.fieldIcon}><FaCalendarAlt /></div>
                                    <div className={listingStyles.fieldBody}>
                                        <span className={listingStyles.fieldLabel}>DEPARTURE</span>
                                        <div className={listingStyles.fieldValue}>
                                            <DateInput
                                                key={`home-mc-date-${index}-${index > 0 && multiCityFlights[index - 1].departureDate
                                                    ? moment(multiCityFlights[index - 1].departureDate).format('YYYY-MM-DD')
                                                    : 'start'}`}
                                                variant="unstyled"
                                                placeholder="Select date"
                                                valueFormat="DD MMM YYYY"
                                                value={flight.departureDate}
                                                onFocus={(e) => e.target.select()}
                                                minDate={index > 0 && multiCityFlights[index - 1].departureDate
                                                    ? multiCityFlights[index - 1].departureDate
                                                    : new Date()}
                                                defaultDate={flight.departureDate
                                                    || (index > 0 && multiCityFlights[index - 1].departureDate
                                                        ? multiCityFlights[index - 1].departureDate
                                                        : new Date())}
                                                onChange={(date) => handleMultiCityChange(index, "departureDate", date)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className={listingStyles.multiCityActions}>
                        <button
                            type="button"
                            className={listingStyles.addFlightBtn}
                            onClick={addMultiCityFlight}
                            disabled={multiCityFlights.length >= 5}
                        >
                            <FaPlus /> Add Another Flight
                        </button>
                        <button
                            type="button"
                            className={listingStyles.searchBtn}
                            onClick={handleSearch}
                        >
                            <FaSearch /> Search
                        </button>
                    </div>
                </div>
            ) : (
                <div className={listingStyles.searchBar}>
                    <div className={listingStyles.fieldsRow}>
                        <div className={listingStyles.fromWrap}>
                            <AirportDropdown
                                value={formData.from}
                                onChange={(value) => handleChange("from", value)}
                                placeholder="City or airport"
                                label="LEAVING FROM?"
                                type="from"
                                dropdownOpen={fromDropdownOpen}
                                setDropdownOpen={setFromDropdownOpen}
                                searchQuery={fromSearchQuery}
                                setSearchQuery={setFromSearchQuery}
                            />
                            <button
                                type="button"
                                className={listingStyles.swapBtn}
                                onClick={handleSwap}
                                aria-label="Swap airports"
                            >
                                <IoIosSwap />
                            </button>
                        </div>
                        <AirportDropdown
                            value={formData.to}
                            onChange={(value) => handleChange("to", value)}
                            excludeCode={formData.from}
                            placeholder="City or airport"
                            label="GOING TO?"
                            type="to"
                            dropdownOpen={toDropdownOpen}
                            setDropdownOpen={setToDropdownOpen}
                            searchQuery={toSearchQuery}
                            setSearchQuery={setToSearchQuery}
                        />
                        {renderListingDateField()}
                        {renderListingTravelers()}
                    </div>
                    <button
                        type="button"
                        className={listingStyles.searchBtn}
                        onClick={handleSearch}
                    >
                        <FaSearch /> Search
                    </button>
                </div>
            )}
        </div>
    );
}
