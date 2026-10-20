'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Select, Switch } from '@mantine/core'
import { Popover, SegmentedControl, TextInput, Box } from "@mantine/core";
import { DatePicker, MonthPicker } from "@mantine/dates";
import { FaCalendarAlt, FaMapMarkerAlt, FaMinus, FaMoon, FaPlus, FaUsers, FaTimes, FaPlane, FaCheck, FaSearch } from "react-icons/fa";
import { AirportList } from '@/util/AirportList';
import moment from 'moment';
import { useRouter, usePathname } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import styles from './FlightSearch.module.css';
import listingStyles from './UmrahGetAwayListing.module.css';
import MobileAirportSelector from './MobileAirportSelector';

const EXCLUDED_DEPARTURE_AIRPORTS = new Set(['JED', 'MED']);

const umrahFromAirportList = AirportList.filter(
    (airport) => !EXCLUDED_DEPARTURE_AIRPORTS.has(String(airport?.airportCode || '').toUpperCase())
);

const parsePickerDate = (value) => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function UmrahGetAway({ variant = 'home', onSearch }) {
    const isListing = variant === 'listing';
    const router = useRouter();
    const pathname = usePathname();
    const [breakPoint, setBreakPoint] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [airportDropdownOpen, setAirportDropdownOpen] = useState(false);
    const [airportSearchQuery, setAirportSearchQuery] = useState('');
    const [recentFromAirports, setRecentFromAirports] = useState([]);
    const [formData, setFormData] = useState({
        flightType: 'MakkahFirst',
        from: null,
        madinahNights: null,
        makkahNights: null,
        departureDate: null,
        dateMode: 'date',
        flexibility: null
    });
    const [errors, setErrors] = useState({});
    const [opened, setOpened] = useState(false);
    const [calendarDate, setCalendarDate] = useState(() => new Date());
    const [guestsPopover, setGuestsPopover] = useState(false);
    const [rooms, setRooms] = useState([
        { adults: 2, children: 0, childrenAges: [], errors: {} }
    ]);
    useEffect(() => {
        setBreakPoint(window.innerWidth <= 600);
        setIsMobile(window.innerWidth <= 768);

        // Load recent airports from localStorage (exclude Jeddah / Madinah)
        const savedRecentFrom = localStorage.getItem('recentFromAirports');
        if (savedRecentFrom) {
            const recent = JSON.parse(savedRecentFrom).filter(
                (code) => !EXCLUDED_DEPARTURE_AIRPORTS.has(String(code || '').toUpperCase())
            );
            setRecentFromAirports(recent);
        }

        const handleResize = () => {
            setBreakPoint(window.innerWidth <= 600);
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        if (localStorage.getItem('umrah_getaway_search') && pathname === '/umrah-getaway/search') {
            const searchList = JSON.parse(localStorage.getItem('umrah_getaway_search'));
            // console.log('searchList', searchList);
            setFormData({
                flightType: searchList?.journey_type === 'makkahFirst' ? 'MakkahFirst' : 'MadinahFirst',
                from: searchList?.departure_city || null,
                madinahNights: searchList?.madinah_nights ? String(searchList.madinah_nights) : null,
                makkahNights: searchList?.makkah_nights ? String(searchList.makkah_nights) : null,
                departureDate: searchList?.departure_date || null,
                dateMode: searchList?.dateType || 'date',
                flexibility: searchList?.flexibleDays || null
            });
            const storedrooms = (searchList?.rooms || []).slice(0, 5).map(room => {
                let childrenAges = Array.isArray(room.childrenAges) ? [...room.childrenAges] : [];
                const childrenCount = Math.min(
                    4,
                    childrenAges.length > 0 ? childrenAges.length : Number(room.children) || 0
                );
                childrenAges = childrenAges.slice(0, childrenCount);
                while (childrenAges.length < childrenCount) childrenAges.push(null);
                return {
                    adults: Math.min(6, Math.max(1, Number(room.adults) || 1)),
                    children: childrenCount,
                    childrenAges,
                    errors: {}
                };
            });
            setRooms(storedrooms.length ? storedrooms : [{ adults: 2, children: 0, childrenAges: [], errors: {} }]);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [pathname])

    const handleDatePopoverChange = (isOpen) => {
        if (isOpen) {
            setCalendarDate(parsePickerDate(formData.departureDate) || new Date());
        }
        setOpened(isOpen);
    };

    const nightsArray = useMemo(() =>
        Array.from({ length: 15 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1} ${i + 1 === 1 ? 'Night' : 'Nights'}`
        })), []
    );

    const NightSelect = ({ value, onChange, error, layout = 'listing' }) => {
        if (isMobile) {
            const selectClass = layout === 'listing'
                ? listingStyles.nativeSelect
                : 'form-control hotel-date-range';
            const selectStyle = layout === 'home' ? { paddingLeft: '40px' } : undefined;

            return (
                <select
                    className={selectClass}
                    style={selectStyle}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    aria-invalid={!!error}
                >
                    <option value="">{layout === 'listing' ? 'Select nights' : 'Nights'}</option>
                    {nightsArray.map((night) => (
                        <option key={night.value} value={night.value}>{night.label}</option>
                    ))}
                </select>
            );
        }

        if (layout === 'listing') {
            return (
                <Select
                    variant='unstyled'
                    placeholder='Select nights'
                    classNames={{ input: listingStyles.selectInput }}
                    data={nightsArray}
                    value={value}
                    onChange={onChange}
                    error={!!error}
                />
            );
        }

        return (
            <Select
                id="floatingInput"
                variant='unstyled'
                placeholder='Nights'
                className="form-control hotel-date-range"
                data={nightsArray}
                value={value}
                onChange={onChange}
                style={{ paddingLeft: '40px' }}
                error={!!error}
            />
        );
    };
    const airportOptions = useMemo(() =>
        umrahFromAirportList.map(airport => ({
            value: airport.airportCode,
            label: `${airport.airportName} (${airport.airportCode}) - ${airport.countryName}`,
            searchable: `${airport.airportCode} ${airport.airportName} ${airport.cityName} ${airport.countryName}`
        })), []
    );

    // Handle form input changes
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user makes a change
        setErrors(prev => ({ ...prev, [field]: null }));
    };

    // Room Management Functions
    const totalAdults = rooms.reduce((sum, room) => sum + room.adults, 0);
    const totalChildren = rooms.reduce((sum, room) => sum + room.children, 0);
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
        setGuestsPopover(false);
    };
    const validateForm = () => {
        const newErrors = {};

        // Check required fields
        if (!formData.from) {
            newErrors.from = "Please select departure airport";
        }
        if (!formData.madinahNights) {
            newErrors.madinahNights = "Please select Madinah nights";
        }
        if (!formData.makkahNights) {
            newErrors.makkahNights = "Please select Makkah nights";
        }
        if (!formData.departureDate) {
            newErrors.departureDate = "Please select departure date";
        }
        if (formData.dateMode === 'flexible' && !formData.flexibility) {
            newErrors.flexibility = "Please select flexibility option";
        }

        // Check room children ages
        const hasRoomErrors = rooms.some(room => {
            if (room.children > 0) {
                return room.childrenAges.some(age => !age);
            }
            return false;
        });

        if (hasRoomErrors) {
            alert("Please select age for all children in all rooms");
            return false;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }

        return true;
    };
    const SubmitForm = () => {
        if (!validateForm()) return;

        // Build search parameters
        const searchList = {
            journey_type: formData.flightType === 'MakkahFirst' ? 'makkahFirst' : 'madinahFirst',
            departure_city: formData.from,
            madinah_nights: formData.madinahNights,
            makkah_nights: formData.makkahNights,
            departure_date: formData.departureDate,
            dateType: formData.dateMode,
            flexibleDays: formData.flexibility,
            rooms: rooms.map(room => ({
                adults: room.adults,
                children: room.children,
                childrenAges: room.childrenAges
            }))
        };
        const queryParams = new URLSearchParams();
        queryParams.set('journey_type', formData.flightType === 'MakkahFirst' ? 'makkahFirst' : 'madinahFirst');
        queryParams.set('madinah_nights', formData.madinahNights);
        queryParams.set('makkah_nights', formData.makkahNights);
        queryParams.set('departure_city', formData.from);
        queryParams.set('departure_date', formData.departureDate);
        // Include travelers in URL so search page useEffect re-runs when only adults/rooms change
        // (rooms live in localStorage; without these params the URL stays identical and Next.js skips navigation)
        queryParams.set('adult', String(totalAdults));
        queryParams.set('child', String(totalChildren));
        queryParams.set('rooms', String(rooms.length));
        queryParams.set(
            'pax',
            rooms
                .map((room) => `${room.adults}a${room.children}c${(room.childrenAges || []).join('-')}`)
                .join('_')
        );
        if (formData.dateMode === 'flexible') {
            queryParams.set('flexibleDays', formData.flexibility);
        }
        // Force a new URL on every Search click so the listing page useEffect
        // re-runs even when criteria are unchanged (same pattern as hotels).
        queryParams.set('r', String(Date.now()));
        if (localStorage.getItem('umrah_getaway_search')) {
            localStorage.removeItem('umrah_getaway_search');
        }
        localStorage.setItem('umrah_getaway_search', JSON.stringify(searchList));
        onSearch?.();
        router.push(`/umrah-getaway/search?${queryParams.toString()}`);
    };

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

        // Convert to array of countries with their airports
        const countriesArray = Object.entries(groupedByCountry)
            .map(([country, airports]) => ({
                country,
                airports: airports.slice(0, 20)
            }))
            .slice(0, 10);

        return countriesArray;
    };

    // Get selected airport details
    const getAirportLabel = (code) => {
        const airport = umrahFromAirportList.find(a => a.airportCode === code);
        return airport ? `${airport.cityName} (${airport.airportCode})` : '';
    };

    const getTravelersLabel = () => {
        const adults = `${totalAdults} Adult${totalAdults !== 1 ? 's' : ''}`;
        const roomsLabel = `${rooms.length} Room${rooms.length !== 1 ? 's' : ''}`;
        if (isListing) {
            return `${adults} · ${roomsLabel}`;
        }
        return `${adults}, ${totalChildren} ${totalChildren === 1 ? 'Child' : 'Children'}, ${roomsLabel}`;
    };

    const getDateLabel = () => {
        if (!formData.departureDate) return '';
        const formatted = moment(formData.departureDate).format(isListing ? 'DD MMM YYYY' : 'DD-MM-YYYY');
        if (formData.dateMode === 'flexible' && formData.flexibility) {
            return `${formatted} ±${formData.flexibility} Days`;
        }
        return formatted;
    };

    // Add airport to recent list
    const addToRecentAirports = (airportCode) => {
        if (!airportCode) return;
        if (EXCLUDED_DEPARTURE_AIRPORTS.has(String(airportCode).toUpperCase())) return;

        // Remove if already exists
        const filteredList = recentFromAirports.filter(code => code !== airportCode);
        // Add to beginning
        const newList = [airportCode, ...filteredList].slice(0, 2);

        setRecentFromAirports(newList);
        localStorage.setItem('recentFromAirports', JSON.stringify(newList));
    };

    // Airport Dropdown Component
    const AirportDropdown = () => {
        const getAirportsToDisplay = () => {
            if (airportSearchQuery) {
                return filterAirports(umrahFromAirportList, airportSearchQuery, formData.from);
            } else {
                if (recentFromAirports.length > 0) {
                    const recentAirports = recentFromAirports
                        .map(code => umrahFromAirportList.find(a => a.airportCode === code))
                        .filter(Boolean);

                    if (recentAirports.length > 0) {
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
        const totalAirports = groupedAirports.reduce((sum, group) => sum + group.airports.length, 0);

        const handleSelect = (airportCode) => {
            handleChange('from', airportCode);
            addToRecentAirports(airportCode);
            setAirportDropdownOpen(false);
            setAirportSearchQuery('');
        };

        const handleClear = (e) => {
            e.stopPropagation();
            handleChange('from', null);
            setAirportSearchQuery('');
        };

        const airportFieldClass = isListing
            ? (isMobile ? listingStyles.mobileField : listingStyles.listingField)
            : '';

        const airportInput = (
            <>
                <input
                    type="text"
                    style={isListing ? { cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.92rem', color: '#E7247A', padding: 0, outline: 'none' } : { paddingLeft: '40px', paddingRight: formData.from ? '40px' : '12px', cursor: 'pointer' }}
                    className={isListing ? '' : 'form-control hotel-date-range'}
                    placeholder={isListing ? 'Select airport' : ' '}
                    value={getAirportLabel(formData.from)}
                    onClick={() => setAirportDropdownOpen(true)}
                    readOnly
                />
                {formData.from && (
                    <button
                        className={isListing ? listingStyles.clearButton : styles.clearButton}
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear selection"
                    >
                        <FaTimes />
                    </button>
                )}
            </>
        );

        // Mobile view
        if (isMobile) {
            return (
                <>
                    {isListing ? (
                        <div className={airportFieldClass}>
                            <div className={listingStyles.fieldIcon}><FaMapMarkerAlt /></div>
                            <div className={listingStyles.fieldBody}>
                                <span className={listingStyles.fieldLabel}>FROM AIRPORT</span>
                                <div className={listingStyles.fieldValue} style={{ position: 'relative' }}>
                                    {airportInput}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-floating w-100 position-relative">
                            {airportInput}
                            <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">From Airport?</label>
                        </div>
                    )}

                    <MobileAirportSelector
                        isOpen={airportDropdownOpen}
                        onClose={() => setAirportDropdownOpen(false)}
                        onSelect={handleSelect}
                        selectedValue={formData.from}
                        label="From Airport?"
                        type="from"
                        recentAirports={recentFromAirports}
                        excludeCodes={['JED', 'MED']}
                    />
                </>
            );
        }

        // Desktop view
        return (
            <Popover
                opened={airportDropdownOpen}
                onChange={setAirportDropdownOpen}
                position="bottom-start"
                width="target"
                shadow="md"
                offset={8}
                clickOutsideEvents={["mouseup", "touchend"]}
                middlewares={{ flip: false, shift: false }}
            >
                <Popover.Target>
                    {isListing ? (
                        <div className={`${airportFieldClass} cursor-pointer`} onClick={() => setAirportDropdownOpen(true)}>
                            <div className={listingStyles.fieldIcon}><FaMapMarkerAlt /></div>
                            <div className={listingStyles.fieldBody}>
                                <span className={listingStyles.fieldLabel}>FROM AIRPORT</span>
                                <div className={listingStyles.fieldValue} style={{ position: 'relative' }}>
                                    {airportInput}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-floating w-100 position-relative">
                            {airportInput}
                            <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">From Airport?</label>
                        </div>
                    )}
                </Popover.Target>
                <Popover.Dropdown className={styles.customDropdown}>
                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search airports..."
                            value={airportSearchQuery}
                            onChange={(e) => setAirportSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className={styles.airportList}>
                        {totalAirports > 0 ? (
                            groupedAirports.map((group, groupIndex) => (
                                <React.Fragment key={group.country}>
                                    <div className={styles.countryHeader}>
                                        {!airportSearchQuery ? (groupIndex === 0 ? 'Recent Searches' : '') : group.country}
                                        {formData.from && group.airports.find(a => a.airportCode === formData.from) && (
                                            <span className={styles.selectedBadge}>Current</span>
                                        )}
                                    </div>
                                    {group.airports.map((airport) => (
                                        <div
                                            key={airport.airportCode}
                                            className={`${styles.airportOption} ${formData.from === airport.airportCode ? styles.selected : ''}`}
                                            onClick={() => handleSelect(airport.airportCode)}
                                        >
                                            <div className={styles.airportIconWrapper}>
                                                <FaPlane className={styles.airportIcon} />
                                            </div>
                                            <div className={styles.airportDetails}>
                                                <div className={styles.airportMainInfo}>
                                                    <span className={styles.airportName}>{airport.airportName}</span>
                                                    <span className={styles.airportCode}>({airport.airportCode})</span>
                                                </div>
                                                <div className={styles.airportLocation}>
                                                    {airport.cityName}
                                                </div>
                                            </div>
                                            {formData.from === airport.airportCode && (
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
                                {airportSearchQuery ? 'No airports found' : 'Start typing to search airports...'}
                            </div>
                        )}
                    </div>
                </Popover.Dropdown>
            </Popover>
        );
    };

    const guestsPopoverContent = (
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
                            <label className="small " >Adults</label>
                        </div>
                        <div className="e301a14002">
                            <div className="e301a14002">
                                <button onClick={() => handleRoomChange(index, "adults", -1)} className="adult-modal-btn" ><FaMinus /></button>
                                <span className="mx-2" aria-hidden="true">{room.adults}</span>
                                <button onClick={() => handleRoomChange(index, "adults", 1)} className="adult-modal-btn" ><FaPlus /></button>
                            </div>
                        </div>
                    </div>
                    <div className="e484bb5b7a mt-2">
                        <div className="c5aae0350e">
                            <label className="small " >Children</label>
                        </div>
                        <div className="e301a14002">
                            <div className="e301a14002">
                                <button onClick={() => handleRoomChange(index, "children", -1)} className="adult-modal-btn" ><FaMinus /></button>
                                <span className="mx-2" aria-hidden="true">{room.children}</span>
                                <button onClick={() => handleRoomChange(index, "children", 1)} className="adult-modal-btn" ><FaPlus /></button>
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
                                        <option key={n + 1} value={n + 1}>{n + 1}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                    {room.errors.childrenAges && (
                        <p className="text-danger small mt-1">{room.errors.childrenAges}</p>
                    )}
                </div>
            ))}
            <hr />
            <p onClick={addRoom} className="small cursor-pointer text-end mb-1 text-primary">+ Add Room</p>
            <button onClick={ClosePopover} type="button" className="btn  w-100 btn-outline-success">Done</button>
        </div>
    );

    const datePopoverDropdown = (
        <Popover.Dropdown>
            <SegmentedControl
                fullWidth
                value={formData.dateMode}
                onChange={(mode) => handleChange("dateMode", mode)}
                data={[
                    { label: "Specific Date", value: "date" },
                    { label: "Flexible Dates", value: "flexible" },
                ]}
                mb="sm"
            />
            <Box>
                {formData.dateMode === "date" && (
                    <DatePicker
                        value={parsePickerDate(formData.departureDate)}
                        date={calendarDate}
                        defaultDate={parsePickerDate(formData.departureDate) || new Date()}
                        onDateChange={setCalendarDate}
                        onChange={(val) => {
                            handleChange("departureDate", val);
                            handleChange("flexibility", null);
                            setOpened(false);
                        }}
                        minDate={new Date()}
                    />
                )}
                {formData.dateMode === "flexible" && (
                    <>
                        <DatePicker
                            label="Preferred Date"
                            value={parsePickerDate(formData.departureDate)}
                            date={calendarDate}
                            defaultDate={parsePickerDate(formData.departureDate) || new Date()}
                            onDateChange={setCalendarDate}
                            onChange={(val) => {
                                handleChange("departureDate", val);
                                if (val && formData.flexibility) setOpened(false);
                            }}
                            minDate={new Date()}
                            mb="sm"
                        />
                        <SegmentedControl
                            fullWidth
                            value={formData.flexibility}
                            onChange={(val) => {
                                handleChange("flexibility", val);
                                if (formData.departureDate && val) setOpened(false);
                            }}
                            data={[
                                { label: "±3 Days", value: "3" },
                                { label: "±7 Days", value: "7" },
                                { label: "±10 Days", value: "10" },
                            ]}
                        />
                    </>
                )}
            </Box>
        </Popover.Dropdown>
    );

    const renderTravelersPopover = (listingField = false) => (
        <Popover
            width={300}
            opened={guestsPopover}
            onChange={setGuestsPopover}
            position="bottom-end"
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
                {listingField ? (
                    <div className={`${isMobile ? listingStyles.mobileField : listingStyles.listingField} cursor-pointer`} onClick={() => setGuestsPopover((o) => !o)}>
                        <div className={listingStyles.fieldIcon}><FaUsers /></div>
                        <div className={listingStyles.fieldBody}>
                            <span className={listingStyles.fieldLabel}>TRAVELERS</span>
                            <button type="button" className={listingStyles.travelersBtn}>{getTravelersLabel()}</button>
                        </div>
                    </div>
                ) : breakPoint ? (
                    <div className="d-flex align-items-center position-relative mt-3 mt-md-0">
                        <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                            <FaUsers size={20} />
                        </div>
                        <div className="form-floating w-100">
                            <button style={{ paddingLeft: '40px' }} id="floatingInput3" className="btn-sm text-start form-control" onClick={() => setGuestsPopover((o) => !o)}>
                                {getTravelersLabel()}
                            </button>
                            <label htmlFor="floatingInput3" style={{ paddingLeft: '40px' }}>Guests</label>
                        </div>
                    </div>
                ) : (
                    <button className="btn-sm form-control" onClick={() => setGuestsPopover((o) => !o)}>
                        {getTravelersLabel()}
                    </button>
                )}
            </Popover.Target>
            <Popover.Dropdown>{guestsPopoverContent}</Popover.Dropdown>
        </Popover>
    );

    if (isListing) {
        const isMadinahFirst = formData.flightType === 'MadinahFirst';
        const firstNightLabel = isMadinahFirst ? 'MADINAH NIGHTS' : 'MAKKAH NIGHTS';
        const secondNightLabel = isMadinahFirst ? 'MAKKAH NIGHTS' : 'MADINAH NIGHTS';
        const firstNightValue = isMadinahFirst ? formData.madinahNights : formData.makkahNights;
        const secondNightValue = isMadinahFirst ? formData.makkahNights : formData.madinahNights;
        const firstNightKey = isMadinahFirst ? 'madinahNights' : 'makkahNights';
        const secondNightKey = isMadinahFirst ? 'makkahNights' : 'madinahNights';
        const firstNightError = isMadinahFirst ? errors.madinahNights : errors.makkahNights;
        const secondNightError = isMadinahFirst ? errors.makkahNights : errors.madinahNights;

        const renderNightField = (label, value, fieldKey, error) => {
            const fieldClass = isMobile ? listingStyles.mobileField : listingStyles.listingField;
            return (
                <div className={fieldClass}>
                    <div className={listingStyles.fieldIcon}><FaMoon /></div>
                    <div className={listingStyles.fieldBody}>
                        <span className={listingStyles.fieldLabel}>{label}</span>
                        <div className={listingStyles.fieldValue}>
                            <NightSelect
                                value={value}
                                onChange={(val) => handleChange(fieldKey, val)}
                                error={error}
                            />
                        </div>
                    </div>
                </div>
            );
        };

        const renderDateField = () => {
            const fieldClass = isMobile ? listingStyles.mobileField : listingStyles.listingField;
            return (
                <Popover opened={opened} onChange={handleDatePopoverChange} position="bottom-start" width="auto">
                    <Popover.Target>
                        <div className={`${fieldClass} cursor-pointer`} onClick={() => handleDatePopoverChange(true)}>
                            <div className={listingStyles.fieldIcon}><FaCalendarAlt /></div>
                            <div className={listingStyles.fieldBody}>
                                <span className={listingStyles.fieldLabel}>DEPARTURE DATE</span>
                                <div className={listingStyles.fieldValue}>
                                    <TextInput
                                        variant='unstyled'
                                        classNames={{ input: listingStyles.textInput }}
                                        value={getDateLabel()}
                                        placeholder="Select date"
                                        onClick={() => handleDatePopoverChange(true)}
                                        error={!!errors.departureDate || !!errors.flexibility}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>
                    </Popover.Target>
                    {datePopoverDropdown}
                </Popover>
            );
        };

        return (
            <div className={listingStyles.wrapper}>
                <div className={listingStyles.toggleGroup}>
                    <div
                        onClick={() => handleChange("flightType", "MakkahFirst")}
                        className={`${listingStyles.toggleItem} ${formData.flightType === 'MakkahFirst' ? listingStyles.toggleActive : ''}`}
                    >
                        Makkah First
                    </div>
                    <div
                        onClick={() => handleChange("flightType", "MadinahFirst")}
                        className={`${listingStyles.toggleItem} ${formData.flightType === 'MadinahFirst' ? listingStyles.toggleActive : ''}`}
                    >
                        Madinah First
                    </div>
                </div>

                {isMobile ? (
                    <div className={listingStyles.mobileFields}>
                        {renderNightField(firstNightLabel, firstNightValue, firstNightKey, firstNightError)}
                        {renderNightField(secondNightLabel, secondNightValue, secondNightKey, secondNightError)}
                        <AirportDropdown />
                        {renderDateField()}
                        {renderTravelersPopover(true)}
                        <button onClick={SubmitForm} className={listingStyles.mobileSearchBtn} type="button">
                            <FaSearch /> Search
                        </button>
                    </div>
                ) : (
                    <div className={listingStyles.searchBar}>
                        <div className={listingStyles.fieldsRow}>
                            {renderNightField(firstNightLabel, firstNightValue, firstNightKey, firstNightError)}
                            {renderNightField(secondNightLabel, secondNightValue, secondNightKey, secondNightError)}
                            <AirportDropdown />
                            {renderDateField()}
                            {renderTravelersPopover(true)}
                        </div>
                        <button onClick={SubmitForm} className={listingStyles.searchBtn} type="button">
                            <FaSearch /> Search
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                <div className="flight-type flex-wrap d-flex gap-2 align-items-start justify-content-start text-start">
                    <div onClick={(e) => handleChange("flightType", "MakkahFirst")} className={`${formData.flightType === 'MakkahFirst' ? 'active' : ''}  small`}>
                        <span>Makkah First</span>
                    </div>
                    <div onClick={(e) => handleChange("flightType", "MadinahFirst")} className={`${formData.flightType === 'MadinahFirst' ? 'active' : ''}  small`}>
                        <span>Madinah First</span>
                    </div>
                    {/* <Switch value="MakkahFirst" onChange={(e) => handleChange('flightType', e.target.value)} checked={formData.flightType === 'MakkahFirst'} color='#E7247A' label=" Makkah First" />
                    <Switch className='' onChange={(e) => handleChange('flightType', e.target.value)} checked={formData.flightType === 'MadinahFirst'} value="MadinahFirst" color='#E7247A' label="Madinah First" /> */}
                </div>
                <div className="traveller">
                    {renderTravelersPopover(false)}
                </div>
            </div>
            <div className="row gy-2 gx-lg-2 gx-3 mt-1">
                <div className="col-xl-5 col-lg-12 col-md-12 col-12">
                    <div className="row gy-2 gx-lg-2 gx-3">
                        <div className="col-lg-6">
                            <div className="d-flex align-items-center position-relative">
                                <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                    <FaMoon size={20} />
                                </div>
                                <div className="form-floating w-100">
                                    <NightSelect
                                        layout="home"
                                        value={formData.flightType === 'MadinahFirst' ? formData.madinahNights : formData.makkahNights}
                                        onChange={(value) => handleChange(formData.flightType === 'MadinahFirst' ? 'madinahNights' : 'makkahNights', value)}
                                        error={formData.flightType === 'MadinahFirst' ? errors.madinahNights : errors.makkahNights}
                                    />
                                    <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">{formData.flightType === 'MadinahFirst' ? 'Madinah Nights' : 'Makkah Nights'}</label>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="d-flex align-items-center position-relative">
                                <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                    <FaMoon size={20} />
                                </div>
                                <div className="form-floating w-100">
                                    <NightSelect
                                        layout="home"
                                        value={formData.flightType === 'MadinahFirst' ? formData.makkahNights : formData.madinahNights}
                                        onChange={(value) => handleChange(formData.flightType === 'MadinahFirst' ? 'makkahNights' : 'madinahNights', value)}
                                        error={formData.flightType === 'MadinahFirst' ? errors.makkahNights : errors.madinahNights}
                                    />
                                    <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">{formData.flightType === 'MadinahFirst' ? 'Makkah Nights' : 'Madinah Nights'}</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-xl-7 col-lg-12 col-md-12 col-12">
                    <div className="row  gy-2 gx-lg-2 gx-3">
                        <div className="col-lg-4">
                            <div className="d-flex align-items-center position-relative">
                                <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                    <FaMapMarkerAlt size={20} />
                                </div>
                                <AirportDropdown />
                            </div>
                        </div>
                        <div className="col-lg-4">
                            <Popover opened={opened} onChange={handleDatePopoverChange} position="bottom-start" width="auto">
                                <Popover.Target>
                                    <div className="d-flex align-items-center position-relative">
                                        <div className="position-absolute" style={{ left: '12px', zIndex: 10, color: '#222020bb' }}>
                                            <FaCalendarAlt size={20} />
                                        </div>
                                        <div className="form-floating w-100">
                                            <TextInput
                                                id="floatingInput"
                                                variant='unstyled'
                                                style={{ paddingLeft: '40px' }}
                                                value={getDateLabel()}
                                                placeholder="Date"
                                                className="form-control hotel-date-range"
                                                onClick={() => handleDatePopoverChange(true)}
                                                error={!!errors.departureDate || !!errors.flexibility}
                                                readOnly
                                            />
                                            <label style={{ paddingLeft: '40px' }} htmlFor="floatingInput">Departure Date</label>
                                        </div>
                                    </div>
                                </Popover.Target>

                                {datePopoverDropdown}
                            </Popover>
                        </div>
                        <div className="col-lg-4  pt-md-0">
                            <button onClick={SubmitForm} className="btn btn-success search-btn-styling-home bg-color w-100 h-100" type="button">
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
