"use client";
import React, { useEffect, useState, useCallback } from "react";
import { DateTimePicker } from "@mantine/dates";
import { Popover } from "@mantine/core";
import "@mantine/dates/styles.css";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import moment from "moment";
import { FaCalendarAlt, FaUsers, FaMinus, FaPlus, FaSearch } from "react-icons/fa";
import TransferLocationSelector from './TransferLocationSelector';
import { usePathname , useSearchParams } from "next/navigation";
import { useHolidayPackageStore } from '@/components/Store/HolidayPackageStore';
import styles from './TransferSearch.module.css';

const toPackageTransferLoc = (loc) => ({
    location: loc?.name || loc?.city || '',
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    city: loc?.city || loc?.name || '',
    country: loc?.country || '',
    code: loc?.code || '',
});

const emptyLocation = {
    id: "",
    name: "",
    lat: null,
    lng: null,
    city: "",
    country: ""
};

const defaultPassengerState = {
    adults: 1,
    children: 0,
    infants: 0,
};

function getPassengerLabel(adults, children, infants) {
    const parts = [];
    const a = Number(adults) || 0;
    const c = Number(children) || 0;
    const i = Number(infants) || 0;
    if (a > 0) parts.push(`${a} Adult${a !== 1 ? 's' : ''}`);
    if (c > 0) parts.push(`${c} Child${c !== 1 ? 'ren' : ''}`);
    if (i > 0) parts.push(`${i} Infant${i !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : 'Select passengers';
}

export default function TransferSearch({ onSearch, variant = 'default' }) {
    const isHero = variant === 'hero';
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { isActive, updateServiceSearchData } = useHolidayPackageStore();
    const [breakPoint, setBreakPoint] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [popoverOpened, setPopoverOpened] = useState(false);
    const [formData, setFormData] = useState({
        tripType: "one-way",
        from: { ...emptyLocation },
        to: { ...emptyLocation },
        pickupDateTime: null,
        dropoffDateTime: null,
        ...defaultPassengerState,
    });

    useEffect(() => {
        setBreakPoint(window.innerWidth <= 500);
        setIsMobile(window.innerWidth <= 768);

        const handleResize = () => {
            setBreakPoint(window.innerWidth <= 500);
            setIsMobile(window.innerWidth <= 768);
        };

        if (pathname === '/transfers') {
            const transferType = searchParams.get('transferType');
            const pickupLatitude = searchParams.get('pickupLatitude') || searchParams.get('fromLat');
            const pickupLongitude = searchParams.get('pickupLongitude') || searchParams.get('fromLng');
            const pickupLocation = searchParams.get('pickupLocation');
            const fromCountry = searchParams.get('fromCountry');
            const dropoffLatitude = searchParams.get('dropoffLatitude') || searchParams.get('toLat');
            const dropoffLongitude = searchParams.get('dropoffLongitude') || searchParams.get('toLng');
            const dropoffLocation = searchParams.get('dropoffLocation');
            const toCountry = searchParams.get('toCountry');
            const pickupDate = searchParams.get('pickupDate');
            const pickupTime = searchParams.get('pickupTime');
            const dropoffDate = searchParams.get('dropoffDate');
            const dropoffTime = searchParams.get('dropoffTime');
            const passengers = searchParams.get('passengers');
            const adultsParam = searchParams.get('adults');
            const childrenParam = searchParams.get('children');
            const infantsParam = searchParams.get('infants');

            if (transferType || pickupLatitude || dropoffLatitude || pickupDate) {
                const adults = adultsParam != null
                    ? Math.max(1, Number(adultsParam) || 1)
                    : Math.max(1, Number(passengers) || 1);
                setFormData({
                    tripType: transferType || "one-way",
                    from: {
                        id: "",
                        name: pickupLocation || "",
                        lat: pickupLatitude ? parseFloat(pickupLatitude) : null,
                        lng: pickupLongitude ? parseFloat(pickupLongitude) : null,
                        city: pickupLocation || "",
                        country: fromCountry || ""
                    },
                    to: {
                        id: "",
                        name: dropoffLocation || "",
                        lat: dropoffLatitude ? parseFloat(dropoffLatitude) : null,
                        lng: dropoffLongitude ? parseFloat(dropoffLongitude) : null,
                        city: dropoffLocation || "",
                        country: toCountry || ""
                    },
                    pickupDateTime: pickupDate && pickupTime ? moment(`${pickupDate} ${pickupTime}`, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']).toDate() : null,
                    dropoffDateTime: dropoffDate && dropoffTime ? moment(`${dropoffDate} ${dropoffTime}`, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']).toDate() : null,
                    adults,
                    children: Math.max(0, Number(childrenParam) || 0),
                    infants: Math.max(0, Number(infantsParam) || 0),
                });
            } else {
                setFormData({
                    tripType: "one-way",
                    from: { ...emptyLocation },
                    to: { ...emptyLocation },
                    pickupDateTime: null,
                    dropoffDateTime: null,
                    ...defaultPassengerState,
                });
            }
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pathname, searchParams]);

    useEffect(() => {
        console.log('FormData updated:', {
            from: { name: formData.from.name, lat: formData.from.lat, lng: formData.from.lng },
            to: { name: formData.to.name, lat: formData.to.lat, lng: formData.to.lng }
        });
    }, [formData.from, formData.to]);

    const handleChange = (field, value) => {
        if (field === 'pickupDateTime') {
            setFormData((prev) => ({
                ...prev,
                dropoffDateTime: null,
            }));
        }
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCountChange = (type, increment) => {
        setFormData((prev) => {
            const next = { ...prev };
            if (type === 'adults') {
                next.adults = increment
                    ? Math.min(16, prev.adults + 1)
                    : Math.max(1, prev.adults - 1);
            } else if (type === 'children') {
                next.children = increment
                    ? Math.min(16, prev.children + 1)
                    : Math.max(0, prev.children - 1);
            } else if (type === 'infants') {
                next.infants = increment
                    ? Math.min(16, prev.infants + 1)
                    : Math.max(0, prev.infants - 1);
            }
            return next;
        });
    };

    const handleFromLocationChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            from: {
                ...prev.from,
                name: e.target.value
            }
        }));
    };

    const handleToLocationChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            to: {
                ...prev.to,
                name: e.target.value
            }
        }));
    };

    const handleFromPlaceSelected = useCallback((place) => {
        if (!place.geometry) {
            console.error('No geometry in place object');
            return;
        }

        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        const placeId = place.place_id;
        const placeName = place.displayName || place.formatted_address || place.name;

        let city = "";
        let country = "";

        if (place.address_components) {
            place.address_components.forEach(component => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                } else if (component.types.includes('postal_town')) {
                    city = component.long_name;
                }
                if (component.types.includes('country')) {
                    country = component.long_name;
                }
            });
        }

        setFormData((prev) => ({
            ...prev,
            from: {
                id: placeId,
                name: placeName,
                lat,
                lng,
                city,
                country,
            },
        }));
    }, []);

    const handleToPlaceSelected = useCallback((place) => {
        if (!place.geometry) {
            console.error('No geometry in place object');
            return;
        }

        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        const placeId = place.place_id;
        const placeName = place.displayName || place.formatted_address || place.name;

        let city = "";
        let country = "";

        if (place.address_components) {
            place.address_components.forEach(component => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                } else if (component.types.includes('postal_town')) {
                    city = component.long_name;
                }
                if (component.types.includes('country')) {
                    country = component.long_name;
                }
            });
        }

        setFormData((prev) => ({
            ...prev,
            to: {
                id: placeId,
                name: placeName,
                lat,
                lng,
                city,
                country,
            },
        }));
    }, []);

    const validateForm = () => {
        if (!formData.from.name) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please select a pickup location',
                color: 'red',
            });
            return false;
        }

        if (!formData.to.name && formData.tripType !== 'all-round') {
            notifications.show({
                title: 'Validation Error',
                message: 'Please select a drop-off location',
                color: 'red',
            });
            return false;
        }

        if (!formData.pickupDateTime) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please select pickup date and time',
                color: 'red',
            });
            return false;
        }

        if (formData.tripType === 'return' && !formData.dropoffDateTime) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please select return date and time for return trip',
                color: 'red',
            });
            return false;
        }

        if (!formData.adults || Number(formData.adults) < 1) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please select at least 1 adult',
                color: 'red',
            });
            return false;
        }

        const now = new Date();
        if (formData.pickupDateTime < now) {
            notifications.show({
                title: 'Validation Error',
                message: 'Pickup date and time cannot be in the past',
                color: 'red',
            });
            return false;
        }

        if (formData.tripType === 'return' && formData.dropoffDateTime) {
            if (formData.dropoffDateTime <= formData.pickupDateTime) {
                notifications.show({
                    title: 'Validation Error',
                    message: 'Return date and time must be after pickup date and time',
                    color: 'red',
                });
                return false;
            }
        }

        return true;
    };

    const handleSearch = () => {
        if (!validateForm()) {
            return;
        }

        const adults = Number(formData.adults) || 1;
        const children = Number(formData.children) || 0;
        const infants = Number(formData.infants) || 0;
        const totalPassengers = adults + children + infants;

        const queryParams = new URLSearchParams();
        queryParams.append('transferType', formData.tripType);
        queryParams.append('pickupLatitude', formData.from.lat);
        queryParams.append('pickupLongitude', formData.from.lng);
        queryParams.append('pickupLocation', formData.from.name);
        queryParams.append('dropoffLatitude', formData.to.lat);
        queryParams.append('dropoffLongitude', formData.to.lng);
        queryParams.append('dropoffLocation', formData.to.name);
        queryParams.append('pickupDate', moment(formData.pickupDateTime).format('YYYY-MM-DD'));
        queryParams.append('pickupTime', moment(formData.pickupDateTime).format('HH:mm'));
        if (formData.dropoffDateTime) {
            queryParams.append('dropoffDate', moment(formData.dropoffDateTime).format('YYYY-MM-DD'));
            queryParams.append('dropoffTime', moment(formData.dropoffDateTime).format('HH:mm'));
        }
        queryParams.append('adults', String(adults));
        queryParams.append('children', String(children));
        queryParams.append('infants', String(infants));
        queryParams.append('passengers', String(totalPassengers));

        const isPackageContext =
            searchParams.get('packageMode') === 'true' ||
            searchParams.get('edit') === 'true';

        if (isPackageContext) {
            if (searchParams.get('packageMode') === 'true' || isActive) {
                queryParams.set('packageMode', 'true');
            }
            if (searchParams.get('edit') === 'true') {
                queryParams.set('edit', 'true');
            }

            const pickupDate = moment(formData.pickupDateTime).format('YYYY-MM-DD');
            const dropoffDate = formData.dropoffDateTime
                ? moment(formData.dropoffDateTime).format('YYYY-MM-DD')
                : pickupDate;

            updateServiceSearchData(
                'transfer',
                {
                    pickup: toPackageTransferLoc(formData.from),
                    dropoff: toPackageTransferLoc(formData.to),
                    sameAsPickup: false,
                    dates: {
                        pickup: pickupDate,
                        dropoff: dropoffDate,
                        check_in: pickupDate,
                        check_out: dropoffDate,
                    },
                    totalGuests: {
                        adults,
                        children,
                        infants,
                    },
                }
            );
        }

        if (onSearch) onSearch();
        router.push(`/transfers?${queryParams.toString()}`);
    };

    const passengerLabel = getPassengerLabel(formData.adults, formData.children, formData.infants);

    const travelersPopoverContent = (
        <div className="p-2" style={{ minWidth: 260 }}>
            <div className="e484bb5b7a mt-2">
                <div className="c5aae0350e">
                    <label className="small mb-0 fw-semibold">Adults</label>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Age 12+</div>
                </div>
                <div className="e301a14002">
                    <div className="e301a14002">
                        <button type="button" onClick={() => handleCountChange('adults', false)} className="adult-modal-btn"><FaMinus /></button>
                        <span className="mx-2" aria-hidden="true">{formData.adults}</span>
                        <button type="button" onClick={() => handleCountChange('adults', true)} className="adult-modal-btn"><FaPlus /></button>
                    </div>
                </div>
            </div>
            <div className="e484bb5b7a mt-3">
                <div className="c5aae0350e">
                    <label className="small mb-0 fw-semibold">Children</label>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Age 2–11</div>
                </div>
                <div className="e301a14002">
                    <div className="e301a14002">
                        <button type="button" onClick={() => handleCountChange('children', false)} className="adult-modal-btn"><FaMinus /></button>
                        <span className="mx-2" aria-hidden="true">{formData.children}</span>
                        <button type="button" onClick={() => handleCountChange('children', true)} className="adult-modal-btn"><FaPlus /></button>
                    </div>
                </div>
            </div>
            <div className="e484bb5b7a mt-3">
                <div className="c5aae0350e">
                    <label className="small mb-0 fw-semibold">Infants</label>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Under 2</div>
                </div>
                <div className="e301a14002">
                    <div className="e301a14002">
                        <button type="button" onClick={() => handleCountChange('infants', false)} className="adult-modal-btn"><FaMinus /></button>
                        <span className="mx-2" aria-hidden="true">{formData.infants}</span>
                        <button type="button" onClick={() => handleCountChange('infants', true)} className="adult-modal-btn"><FaPlus /></button>
                    </div>
                </div>
            </div>
            <button
                onClick={() => setPopoverOpened(false)}
                type="button"
                className="btn mt-3 w-100 btn-outline-success"
            >
                Done
            </button>
        </div>
    );

    const tripToggle = (
        <div
            className={styles.tripToggle}
            role="radiogroup"
            aria-label="Trip type"
        >
            <button
                type="button"
                role="radio"
                aria-checked={formData.tripType === 'one-way'}
                onClick={() => handleChange("tripType", "one-way")}
                className={`${styles.tripOption} ${formData.tripType === 'one-way' ? styles.tripOptionActive : ''}`}
            >
                One-Way
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={formData.tripType === 'return'}
                onClick={() => handleChange("tripType", "return")}
                className={`${styles.tripOption} ${formData.tripType === 'return' ? styles.tripOptionActive : ''}`}
            >
                Return
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={formData.tripType === 'all-round'}
                onClick={() => handleChange("tripType", "all-round")}
                className={`${styles.tripOption} ${formData.tripType === 'all-round' ? styles.tripOptionActive : ''}`}
            >
                All-Round
            </button>
        </div>
    );

    const travelersControl = (
        <Popover
            width={300}
            opened={popoverOpened}
            onChange={setPopoverOpened}
            position="bottom-end"
            withArrow
            shadow="md"
            withinPortal
            zIndex={4000}
            middlewares={{ flip: false, shift: true, inline: false }}
            clickOutsideEvents={["mouseup", "touchend"]}
        >
            <Popover.Target>
                {isHero ? (
                    <button
                        type="button"
                        className={styles.travelerBtn}
                        onClick={() => setPopoverOpened((o) => !o)}
                    >
                        <FaUsers size={14} className={styles.travelerIcon} aria-hidden="true" />
                        {passengerLabel}
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`form-select form-select-sm text-start ${breakPoint ? 'w-100' : ''}`}
                        style={{
                            minWidth: breakPoint ? '100%' : 220,
                            paddingLeft: breakPoint ? 40 : undefined,
                            position: 'relative',
                        }}
                        onClick={() => setPopoverOpened((o) => !o)}
                    >
                        {breakPoint && (
                            <FaUsers
                                size={18}
                                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#222020bb' }}
                            />
                        )}
                        {passengerLabel}
                    </button>
                )}
            </Popover.Target>
            <Popover.Dropdown className={styles.travelersDropdown}>
                {travelersPopoverContent}
            </Popover.Dropdown>
        </Popover>
    );

    const pickupField = (
        <TransferLocationSelector
            value={formData.from.name}
            onChange={handleFromLocationChange}
            detailLoader={setIsLoadingDetail}
            onPlaceSelected={handleFromPlaceSelected}
            isMobile={isMobile}
            label={isHero ? "Where From?" : "Pickup Location?"}
            placeholder={isHero ? "Where From?" : "Pickup Location?"}
            inputName="pickupLocation"
        />
    );

    const dropoffField = (
        <TransferLocationSelector
            value={formData.to.name}
            onChange={handleToLocationChange}
            detailLoader={setIsLoadingDetail}
            onPlaceSelected={handleToPlaceSelected}
            isMobile={isMobile}
            label={isHero ? "Where To?" : "Drop off Location?"}
            placeholder={isHero ? "Where To?" : "Drop off Location?"}
            inputName="dropoffLocation"
        />
    );

    const pickupDateField = (
        <div className="d-flex align-items-center position-relative w-100">
            <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                <FaCalendarAlt size={18} />
            </div>
            <div className="form-floating w-100">
                <DateTimePicker
                    value={formData.pickupDateTime}
                    variant="unstyled"
                    valueFormat="DD-MM-YYYY hh:mm A"
                    id="transfer-pickup-datetime"
                    onChange={(date) => handleChange("pickupDateTime", date)}
                    className="form-control hotel-date-range"
                    placeholder="Departure Date"
                    minDate={new Date()}
                    style={{ paddingLeft: 0 }}
                    timePickerProps={{
                        format: '12h',
                        withDropdown: true,
                        popoverProps: { withinPortal: false },
                        styles: {
                            field: { fontSize: 16 },
                            input: { fontSize: 16 },
                        },
                    }}
                />
                <label style={{ paddingLeft: '58px' }} htmlFor="transfer-pickup-datetime">
                    Departure Date
                </label>
            </div>
        </div>
    );

    const returnDateField = (
        <div className="d-flex align-items-center position-relative w-100">
            <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                <FaCalendarAlt size={18} />
            </div>
            <div className="form-floating w-100">
                <DateTimePicker
                    value={formData.dropoffDateTime}
                    onChange={(date) => handleChange("dropoffDateTime", date)}
                    className="form-control hotel-date-range"
                    placeholder="Return Date"
                    valueFormat="DD-MM-YYYY hh:mm A"
                    variant="unstyled"
                    id="transfer-return-datetime"
                    minDate={formData.pickupDateTime || new Date()}
                    date={formData.pickupDateTime || new Date()}
                    readOnly={formData.tripType === 'one-way'}
                    style={{ paddingLeft: 0 }}
                    timePickerProps={{
                        format: '12h',
                        withDropdown: true,
                        popoverProps: { withinPortal: false },
                        styles: {
                            field: { fontSize: 16 },
                            input: { fontSize: 16 },
                        },
                    }}
                />
                <label style={{ paddingLeft: '58px' }} htmlFor="transfer-return-datetime">
                    Return Date
                </label>
            </div>
        </div>
    );

    if (isHero) {
        return (
            <div className={styles.heroWrap}>
                <div className={styles.topRow}>
                    {tripToggle}
                    {travelersControl}
                </div>

                <div className={styles.bar}>
                    <div className={styles.field}>{pickupField}</div>
                    <div className={styles.fieldDivider} aria-hidden="true" />
                    <div className={styles.field}>{dropoffField}</div>
                    <div className={styles.fieldDivider} aria-hidden="true" />
                    <div className={styles.field}>{pickupDateField}</div>
                    <div className={styles.fieldDivider} aria-hidden="true" />
                    <div className={styles.field}>{returnDateField}</div>
                    <div className={styles.searchAction}>
                        <button
                            className={styles.searchBtn}
                            onClick={handleSearch}
                            disabled={isLoadingDetail}
                            type="button"
                        >
                            <FaSearch size={14} aria-hidden="true" />
                            Search
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2">
            <div className="d-flex gap-2 flex-wrap justify-content-between align-items-center">
                {tripToggle}
                <div className="traveller mt-3 mt-md-0">
                    {travelersControl}
                </div>
            </div>
            <div className="row gy-2 gx-lg-2 gx-3 mt-1">
                <div className="col-xl-5 col-lg-12 col-md-12 col-12">
                    <div className="row gy-2 gx-lg-2 gx-3">
                        <div className="col-lg-6">{pickupField}</div>
                        <div className="col-lg-6">{dropoffField}</div>
                    </div>
                </div>
                <div className="col-xl-7 col-lg-12 col-md-12 col-12">
                    <div className="row gy-2 gx-lg-2 gx-3">
                        <div className="col-lg-4">{pickupDateField}</div>
                        <div className="col-lg-4">{returnDateField}</div>
                        <div className="col-lg-4 pt-md-0">
                            <button
                                className="btn btn-success bg-color search-btn-styling-home w-100 h-100"
                                onClick={handleSearch}
                                disabled={isLoadingDetail}
                                type="button"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
