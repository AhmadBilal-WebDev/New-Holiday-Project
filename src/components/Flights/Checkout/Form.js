'use client'
import React, { useState, useEffect } from 'react'
import { Select } from '@mantine/core';
import { buildCountryOptions, resolvePhoneAutofill, matchCountryOption, applyCountrySelection } from '@/util/phoneAutofill';
import { DUPLICATE_NAME_MESSAGE, findDuplicateNameIndices } from '@/util/guestNameValidation';
import Link from 'next/link';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { useCurrency } from '@/util/currency';
import { notifications } from '@mantine/notifications';
import { DateInput } from '@mantine/dates';
import PackageBookingLoader from '@/components/Loader/PackageBookingLoader';
import { useRouter } from 'next/navigation';
import LeadDetail from '@/components/LeadDetail/LeadDetail';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { MdAirlineSeatReclineExtra } from 'react-icons/md';
import { IoInformationCircle } from 'react-icons/io5';
import { FaSuitcase, FaUser, FaUserPlus, FaCheck } from 'react-icons/fa';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { getTravelerCounts, getBaggageLabel, getBookingTripType } from './flightHelpers';
import styles from './Form.module.css';
export default function Form({ flightdata, onPassengersChange, mode = 'full', onContinue, ancillarySelections = null }) {
    const { currency, rates } = useCurrency();
    const router = useRouter();
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currencyKey, setCurrencyKey] = useState("");
    const [loaderError, setLoaderError] = useState("");
    const [confirmStatus, setConfirmStatus] = useState("pending"); // "pending" | "booking" | "payment" | "success" | "error"
    const [bookingFor, setBookingFor] = useState('self'); // self | other
    const [leadPassenger, setLeadPassenger] = useState({
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        dob: null,
        gender: 'male',
        country: '',
        phoneCode: '',
        phone: '',
        documentType: '',
        code: '',
        documentNumber: '',
        documentExpiry: null,
        type: 'adult'
    });
    const [errors, setErrors] = useState({});
    const [termsAccepted, setTermsAccepted] = useState(false);

    const countryOptions = buildCountryOptions();

    const createPassenger = (id, type) => ({
        id,
        type,
        title: '',
        firstName: '',
        lastName: '',
        gender: 'male',
        dob: '',
        email: '',
        country: '',
        code: '',
        phoneCode: '',
        phone: '',
        documentType: '',
        documentNumber: '',
        documentExpiry: null,
    });

    const getNationalityCode = (passenger) => {
        if (passenger?.code) return passenger.code;
        const matched = countryOptions.find((c) => c.value === passenger?.country);
        return matched?.cca2 || '';
    };

    useEffect(() => {
        if (!flightdata?.id) return;

        const counts = getTravelerCounts(flightdata);
        const passengerList = [];
        let passengerId = 1;

        // Skip first adult — that is the lead passenger
        for (let i = 1; i < counts.adult; i++) {
            passengerList.push(createPassenger(passengerId++, 'adult'));
        }
        for (let i = 0; i < counts.child; i++) {
            passengerList.push(createPassenger(passengerId++, 'child'));
        }
        for (let i = 0; i < counts.infant; i++) {
            passengerList.push(createPassenger(passengerId++, 'infant_without_seat'));
        }

        setPassengers(passengerList);
    }, [flightdata?.id]);

    useEffect(() => {
        if (!onPassengersChange) return;
        onPassengersChange([
            { id: 'lead', ...leadPassenger, type: leadPassenger.type || 'adult' },
            ...passengers,
        ]);
    }, [leadPassenger, passengers, onPassengersChange]);

    useEffect(() => {
        const callCurrencyAPI = async () => {
            if (!flightdata?.id) return;
            var APiCurrency = currency;
            if (Object.keys(rates).length === 1) {
                APiCurrency = flightdata?.pricing?.currency;
            }
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/checkout/currency`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: flightdata?.id,
                        type: "flight",
                        display_currency: APiCurrency,
                        model_currency: flightdata?.pricing?.currency,
                    }),
                });
                const data = await response.json();
                if (data?.success) {
                    setCurrencyKey(data?.data?.uuid);
                }
            } catch (error) {
                console.error("Error calling currency API:", error);
            }
        };

        callCurrencyAPI();
    }, [currency, flightdata?.id]);

    const getPassengerTypeLabel = (type) => {
        if (type === 'adult') return 'Adult';
        if (type === 'child') return 'Child';
        if (type === 'infant_without_seat') return 'Infant';
        return type;
    };

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    // Age rules at travel date: Adult 12+, Child 2–11, Infant under 2
    const getTravelReferenceDate = () => {
        const raw =
            flightdata?.segments?.[0]?.departure?.datetime ||
            flightdata?.segments?.[0]?.departure?.date ||
            flightdata?.search_criteria?.legs?.[0]?.departure_date ||
            null;
        const date = raw ? new Date(raw) : new Date();
        if (Number.isNaN(date.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        }
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const addYears = (baseDate, years) => {
        const date = new Date(baseDate);
        date.setFullYear(date.getFullYear() + years);
        return date;
    };

    const addDays = (baseDate, days) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + days);
        return date;
    };

    const normalizePassengerType = (type) => {
        const value = String(type || 'adult').toLowerCase();
        if (value.includes('infant') || value === 'inf') return 'infant';
        if (value.includes('child') || value === 'chd') return 'child';
        return 'adult';
    };

    const getDobBounds = (passengerType) => {
        const reference = getTravelReferenceDate();
        const today = getToday();
        const type = normalizePassengerType(passengerType);
        // Soft lower bound so calendar stays usable
        const oldestAllowed = addYears(reference, -120);

        if (type === 'child') {
            // 2 complete years, but under 12 on travel date
            return {
                minDate: addDays(addYears(reference, -12), 1),
                maxDate: addYears(reference, -2),
                defaultDate: addYears(reference, -6),
                message: 'Child age must be 2–11 years on the travel date',
            };
        }

        if (type === 'infant') {
            // Under 2 years on travel date; cannot be a future birth date
            const infantMax = addDays(addYears(reference, -0), 0);
            const maxDate = infantMax > today ? today : infantMax;
            return {
                minDate: addDays(addYears(reference, -2), 1),
                maxDate,
                defaultDate: addYears(reference, -1),
                message: 'Infant must be under 2 years on the travel date',
            };
        }

        // Adult 12+
        return {
            minDate: oldestAllowed,
            maxDate: addYears(reference, -12),
            defaultDate: addYears(reference, -30),
            message: 'Adult must be at least 12 years old on the travel date',
        };
    };

    const isDobInRange = (dob, passengerType) => {
        if (!dob) return false;
        const birthDate = dob instanceof Date ? dob : new Date(dob);
        if (Number.isNaN(birthDate.getTime())) return false;
        const { minDate, maxDate } = getDobBounds(passengerType);
        const value = new Date(birthDate);
        value.setHours(0, 0, 0, 0);
        return value >= minDate && value <= maxDate;
    };

    const fieldLabels = {
        title: 'Title',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        dob: 'Date of Birth',
        gender: 'Gender',
        country: 'Country',
        phone: 'Phone Number',
        documentType: 'ID Type',
        documentNumber: 'ID Number',
        documentExpiry: 'ID Expiry Date',
    };

    const getFieldLabel = (name) => fieldLabels[name] || name;

    const getToday = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const isFutureOrTodayDate = (value) => {
        if (!value) return false;
        const expiryDate = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(expiryDate.getTime())) return false;
        return expiryDate >= getToday();
    };

    const validateField = (name, value, isLeadPassenger = true, passengerData = null) => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return `${getFieldLabel(name)} is required`;
        }

        if (name === 'email' && isLeadPassenger && !validateEmail(value)) {
            return 'Please enter a valid email address';
        }

        if (name === 'phone') {
            const phoneCode = isLeadPassenger ? leadPassenger.phoneCode : passengerData?.phoneCode;
            const phone = isLeadPassenger ? leadPassenger.phone : passengerData?.phone;

            if (phoneCode && phone) {
                const phoneNumber = isValidPhoneNumber(phoneCode + phone);
                if (!phoneNumber) {
                    return 'Please enter a valid phone number';
                }
            }
        }

        if (name === 'dob') {
            const passengerType = isLeadPassenger
                ? (leadPassenger.type || 'adult')
                : (passengerData?.type || 'adult');
            if (!isDobInRange(value, passengerType)) {
                return getDobBounds(passengerType).message;
            }
        }

        if (name === 'documentExpiry' && !isFutureOrTodayDate(value)) {
            return 'Document expiry must be today or a future date';
        }

        return '';
    };

    const handleLeadPassengerChange = (field, value) => {
        // Only allow alphabets and spaces for name fields
        let finalValue = value;
        if (field === 'firstName' || field === 'lastName') {
            finalValue = value.replace(/[^a-zA-Z\s]/g, '');
        }

        setLeadPassenger(prev => ({ ...prev, [field]: finalValue }));

        // Clear error for this field
        if (errors[`lead_${field}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`lead_${field}`];
                return newErrors;
            });
        }
    };

    const handleLeadCountryChange = (value) => {
        const applied = applyCountrySelection(value, countryOptions, leadPassenger.phone);
        setLeadPassenger(prev => ({
            ...prev,
            country: applied.country,
            code: applied.code || '',
            phoneCode: applied.phoneCode,
            phone: applied.phone,
        }));

        if (errors['lead_country']) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors['lead_country'];
                return newErrors;
            });
        }
    };

    const handleLeadCountryAutofillBlur = (e) => {
        const typed = e?.target?.value;
        if (!typed || leadPassenger.country === typed) return;
        const matched = matchCountryOption(typed, countryOptions);
        if (matched) handleLeadCountryChange(matched.value);
    };

    const handleLeadPhoneChange = (value) => {
        const resolved = resolvePhoneAutofill(value, countryOptions, {
            country: leadPassenger.country,
            phoneCode: leadPassenger.phoneCode,
        });
        setLeadPassenger(prev => ({
            ...prev,
            phone: resolved.phone || '',
            ...(resolved.phoneCode ? { phoneCode: resolved.phoneCode } : {}),
            ...(resolved.country ? { country: resolved.country } : {}),
            ...(resolved.code ? { code: resolved.code } : {}),
        }));

        if (errors['lead_phone']) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors['lead_phone'];
                return newErrors;
            });
        }
    };

    const handlePassengerChange = (id, field, value) => {
        if (field === 'phone') {
            setPassengers(prev => prev.map(p => {
                if (p.id !== id) return p;
                const resolved = resolvePhoneAutofill(value, countryOptions, {
                    country: p.country,
                    phoneCode: p.phoneCode,
                });
                return {
                    ...p,
                    phone: resolved.phone || '',
                    ...(resolved.phoneCode ? { phoneCode: resolved.phoneCode } : {}),
                    ...(resolved.country ? { country: resolved.country } : {}),
                    ...(resolved.code ? { code: resolved.code } : {}),
                };
            }));
        } else {
            let finalValue = value;
            if (field === 'firstName' || field === 'lastName') {
                finalValue = value.replace(/[^a-zA-Z\s]/g, '');
            }

            setPassengers(prev => prev.map(p =>
                p.id === id ? { ...p, [field]: finalValue } : p
            ));
        }

        // Clear error for this field
        if (errors[`passenger_${id}_${field}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`passenger_${id}_${field}`];
                return newErrors;
            });
        }
    };

    const handlePassengerCountryChange = (id, value) => {
        setPassengers(prev => prev.map(p => {
            if (p.id !== id) return p;
            const applied = applyCountrySelection(value, countryOptions, p.phone);
            return {
                ...p,
                country: applied.country,
                code: applied.code || '',
                phoneCode: applied.phoneCode,
                phone: applied.phone,
            };
        }));

        if (errors[`passenger_${id}_country`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`passenger_${id}_country`];
                return newErrors;
            });
        }
    };

    const handlePassengerCountryAutofillBlur = (id, e) => {
        const typed = e?.target?.value;
        const passenger = passengers.find(p => p.id === id);
        if (!typed || passenger?.country === typed) return;
        const matched = matchCountryOption(typed, countryOptions);
        if (matched) handlePassengerCountryChange(id, matched.value);
    };

    const validateForm = (options = {}) => {
        const { requireTerms = true } = options;
        const newErrors = {};

        // Validate lead passenger
        const leadFields = ['title', 'firstName', 'lastName', 'email', 'dob', 'gender', 'country', 'phone', 'documentType', 'documentNumber', 'documentExpiry'];
        leadFields.forEach(field => {
            const error = validateField(field, leadPassenger[field], true);
            if (error) {
                newErrors[`lead_${field}`] = error;
            }
        });

        // Validate other passengers
        passengers.forEach(passenger => {
            const passengerFields = ['title', 'firstName', 'lastName', 'gender', 'dob', 'country', 'email', 'phone', 'documentType', 'documentNumber', 'documentExpiry'];
            passengerFields.forEach(field => {
                const error = validateField(field, passenger[field], false, passenger);
                if (error) {
                    newErrors[`passenger_${passenger.id}_${field}`] = error;
                }
            });
        });

        const allGuests = [leadPassenger, ...passengers];
        const duplicateIndices = findDuplicateNameIndices(allGuests);
        if (duplicateIndices.has(0)) {
            newErrors.lead_firstName = DUPLICATE_NAME_MESSAGE;
            newErrors.lead_lastName = DUPLICATE_NAME_MESSAGE;
        }
        passengers.forEach((passenger, index) => {
            if (duplicateIndices.has(index + 1)) {
                newErrors[`passenger_${passenger.id}_firstName`] = DUPLICATE_NAME_MESSAGE;
                newErrors[`passenger_${passenger.id}_lastName`] = DUPLICATE_NAME_MESSAGE;
            }
        });

        // Validate terms
        if (requireTerms && !termsAccepted) {
            newErrors['terms'] = 'You must accept the terms and conditions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = (e) => {
        e.preventDefault();
        if (!validateForm({ requireTerms: false })) {
            notifications.show({
                title: 'Incomplete details',
                message: 'Please fill all required passenger details before continuing.',
                color: 'red',
            });
            return;
        }
        onContinue?.();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            setConfirmStatus("pending");
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            setConfirmStatus("validate");

            // Calculate currency conversion
            const packageCurrency = flightdata?.pricing?.currency;
            const grandTotal = Number(flightdata?.pricing?.total_amount);

            let customerCurrency = currency;
            let customerExchangeRate = 1;
            let customerTotalAfterDiscount = grandTotal;

            // If currencies are different, convert the price
            if (currency !== packageCurrency && rates[packageCurrency] && rates[currency]) {
                const conversion = ConvertPrice(grandTotal, packageCurrency, currency, rates);
                customerCurrency = conversion.newcurrency;
                customerTotalAfterDiscount = parseFloat(conversion.newprice);

                // Calculate exchange rate
                customerExchangeRate = (rates[currency] / rates[packageCurrency]);
            } else {
                // Same currency, use original values
                customerCurrency = packageCurrency;
                customerExchangeRate = 1;
                customerTotalAfterDiscount = grandTotal;
            }

            const addonAmount = Number(ancillarySelections?.total?.amount || 0)
            if (addonAmount > 0) {
                customerTotalAfterDiscount = Number(
                    (Number(customerTotalAfterDiscount) + addonAmount).toFixed(2)
                )
            }

            const ancillaryPayload =
                ancillarySelections?.ancillary?.journeys?.length > 0
                    ? ancillarySelections.ancillary
                    : null

            // Create passengers array with lead passenger at index 0
            const passengersArray = [];
            // Add lead passenger first (index 0)
            passengersArray.push({
                type: leadPassenger.type || "adult",
                title: leadPassenger.title.toLowerCase(),
                firstName: leadPassenger.firstName,
                lastName: leadPassenger.lastName,
                dateOfBirth: leadPassenger.dob,
                gender: leadPassenger.gender === 'male' ? 'm' : 'f',
                email: leadPassenger.email,
                phone: `${leadPassenger.phoneCode}${leadPassenger.phone}`,
                nationality: getNationalityCode(leadPassenger),
                cardType: leadPassenger.documentType,
                cardNum: leadPassenger.documentNumber,
                cardExpiredDate: leadPassenger.documentExpiry,
            });

            // Add other passengers
            passengers.forEach(passenger => {
                passengersArray.push({
                    type: passenger.type,
                    title: passenger.title.toLowerCase(),
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    dateOfBirth: passenger.dob,
                    gender: passenger.gender === 'male' ? 'm' : 'f',
                    email: passenger.email,
                    phone: `${passenger.phoneCode}${passenger.phone}`,
                    nationality: getNationalityCode(passenger),
                    cardType: passenger.documentType,
                    cardNum: passenger.documentNumber,
                    cardExpiredDate: passenger.documentExpiry,
                });
            });
            const request = {
                booking_type: "hold",
                payment_method: "stripe",
                currency_uuid: currencyKey,
                trip_type: getBookingTripType(flightdata),
                provider: flightdata.provider,
                offer_id: flightdata.id,
                passengers: passengersArray,
                grand_total: Number((grandTotal + (addonAmount > 0 ? addonAmount : 0)).toFixed(2)),
                customer_currency: customerCurrency,
                customer_exchange_rate: customerExchangeRate,
                customer_amount: customerTotalAfterDiscount,
                tag: flightdata?.tag || "",
                segments: flightdata?.segments,
                pricing: flightdata?.pricing,
                // Persist search legs so voucher/invoice can group multi-city stops correctly
                search_criteria: flightdata?.search_criteria || null,
                ...(ancillaryPayload ? { ancillary: ancillaryPayload } : {}),
            };

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // 'ngrok-skip-browser-warning': 'true',
                    },
                    body: JSON.stringify(request),
                });
                const response = await res.json();
                if (response?.success) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setConfirmStatus("reserve");
                    await handlePayment(response?.data);
                } else {
                    setLoaderError(response?.error?.message || "Booking failed. Please try again.");
                    setConfirmStatus("error");
                    setTimeout(() => {
                        setLoading(false);
                        notifications.show({
                            title: 'Error',
                            message: response?.error?.message,
                            autoClose: 3500,
                            color: 'red'
                        })
                    }, 1000);
                }
            } catch (err) {
                setLoaderError("A network error occurred. Please try again.");
                setConfirmStatus("error");
                setTimeout(() => setLoading(false), 1000);
            }
        } else {
            // Scroll to first error
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handlePayment = async (data) => {
        const domain = window.location.origin;
        const checkoutUrl = window.location.href;
        const request = {
            "provider": data?.provider,
            'booking_reference': data?.booking_reference,
            'success_url': `${domain}/flights/voucher/${data?.booking_reference}`,
            'cancel_url': `${checkoutUrl}`
        }
        localStorage.setItem('lead_details_fill', JSON.stringify(leadPassenger));
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flights/booking/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'ngrok-skip-browser-warning': 'true', 
                },
                body: JSON.stringify(request),
            });
            const response = await res.json();
            if (response?.success) {
                setConfirmStatus("payment");
                setTimeout(() => {
                    setLoading(false);
                    router.push(response?.data?.checkout_url);
                }, 800);

            } else {
                setLoaderError(response?.error?.message || "Booking failed. Please try again.");
                setConfirmStatus("error");
                setTimeout(() => {
                    setLoading(false);
                    notifications.show({
                        title: 'Error',
                        message: response?.error?.message,
                        autoClose: 3500,
                        color: 'red'
                    })
                }, 1000);
            }
        } catch (err) {
            setLoaderError("A network error occurred. Please try again.");
            setConfirmStatus("error");
            setTimeout(() => setLoading(false), 1000);
        }
    };

    const handleLoaderComplete = () => {
    };

    const showPassengerFields = mode === 'full' || mode === 'passengers';
    const showOverview = mode === 'overview';
    const showPayFooter = mode === 'full' || mode === 'overview';

    const passengerSummary = [
        {
            id: 'lead',
            label: 'Lead passenger',
            name: [leadPassenger.firstName, leadPassenger.lastName].filter(Boolean).join(' ') || '—',
            type: leadPassenger.type || 'adult',
        },
        ...passengers.map((p, idx) => ({
            id: p.id,
            label: `Passenger ${idx + 2}`,
            name: [p.firstName, p.lastName].filter(Boolean).join(' ') || '—',
            type: p.type,
        })),
    ];

    const seatsByPassenger = ancillarySelections?.seats || {};
    const seatSegmentsMeta = ancillarySelections?.seatSegments || [];
    const baggageByPassenger = ancillarySelections?.baggage?.byPassenger || {};
    const baggageItems = ancillarySelections?.baggage?.items || [];

    const getPassengerBags = (passengerId) => {
        if (baggageItems.length) {
            return baggageItems.filter((bag) => String(bag.passengerId) === String(passengerId));
        }
        const byLeg = baggageByPassenger?.[passengerId] || {};
        return Object.entries(byLeg).map(([legId, bag]) => ({
            ...bag,
            legId,
            passengerId,
        }));
    };

    const getPassengerSeats = (passengerId) => {
        const bySegment = seatsByPassenger?.[passengerId] || {};
        return Object.entries(bySegment)
            .filter(([, seat]) => seat?.seatName)
            .map(([segmentKey, seat]) => {
                const meta = seatSegmentsMeta.find((s) => s.segment_key === segmentKey);
                return {
                    segmentKey,
                    seatName: seat.seatName,
                    price: seat.seatPrice ?? seat.price,
                    currency: seat.seatCurrency || seat.currency,
                    route: meta ? `${meta.from} → ${meta.to}` : null,
                };
            });
    };

    return (
        <div className={styles.formWrapper}>
            {showPassengerFields && <LeadDetail setFormData={setLeadPassenger} module="flight" />}
            {loading && (
                <PackageBookingLoader
                    errorMessage={loaderError}
                    showLoader={loading}
                    onComplete={handleLoaderComplete}
                    confirmStatus={confirmStatus}
                    componentName="Flight"
                />
            )}

            {showPassengerFields && (
                <>
                    {/* <div className={styles.alertBanner}>
                    Enter the names exactly as they appear in your passport/ID to avoid check-in complications.
                </div> */}

                    <div className={styles.welcomeCard}>
                        <h2 className={styles.welcomeTitle}>Who Are We Welcoming?</h2>
                        <div className={styles.welcomeOptions} role="radiogroup" aria-label="Who are we welcoming">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={bookingFor === 'self'}
                                className={`${styles.welcomeOption} ${bookingFor === 'self' ? styles.welcomeOptionActive : ''}`}
                                onClick={() => setBookingFor('self')}
                            >
                                <span className={styles.welcomeIcon} aria-hidden="true">
                                    <FaUser size={14} />
                                </span>
                                <span className={styles.welcomeText}>
                                    <span className={styles.welcomeOptionTitle}>I&apos;m the main guest</span>
                                    <span className={styles.welcomeOptionDesc}>Booking for myself</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                role="radio"
                                aria-checked={bookingFor === 'other'}
                                className={`${styles.welcomeOption} ${bookingFor === 'other' ? styles.welcomeOptionActive : ''}`}
                                onClick={() => setBookingFor('other')}
                            >
                                <span className={styles.welcomeIcon} aria-hidden="true">
                                    <FaUserPlus size={14} />
                                </span>
                                <span className={styles.welcomeText}>
                                    <span className={styles.welcomeOptionTitle}>Booking for someone else</span>
                                    <span className={styles.welcomeOptionDesc}>You&apos;re arranging this trip</span>
                                </span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showPassengerFields && (
                <div className={styles.formCard}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Enter Your Information</h2>
                            <p className={styles.sectionDesc}>
                                Details you&apos;ve saved in your profile pre-fill here.
                            </p>
                        </div>

                        <div className={styles.fieldGrid}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadFirstName" className={styles.label}>
                                    First Name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="leadFirstName"
                                    value={leadPassenger.firstName}
                                    onChange={(e) => handleLeadPassengerChange('firstName', e.target.value)}
                                    className={`${styles.input} ${errors.lead_firstName ? `is-invalid ${styles.inputError}` : ''}`}
                                    placeholder="First Name"
                                    autoComplete="given-name"
                                />
                                {errors.lead_firstName && <p className={styles.errorText}>{errors.lead_firstName}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadLastName" className={styles.label}>
                                    Last Name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="leadLastName"
                                    value={leadPassenger.lastName}
                                    onChange={(e) => handleLeadPassengerChange('lastName', e.target.value)}
                                    className={`${styles.input} ${errors.lead_lastName ? `is-invalid ${styles.inputError}` : ''}`}
                                    placeholder="Last Name"
                                    autoComplete="family-name"
                                />
                                {errors.lead_lastName && <p className={styles.errorText}>{errors.lead_lastName}</p>}
                            </div>

                            <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                                <label htmlFor="leadEmail" className={styles.label}>
                                    Email Address <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="email"
                                    id="leadEmail"
                                    value={leadPassenger.email}
                                    onChange={(e) => handleLeadPassengerChange('email', e.target.value)}
                                    className={`${styles.input} ${errors.lead_email ? `is-invalid ${styles.inputError}` : ''}`}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                                {errors.lead_email && <p className={styles.errorText}>{errors.lead_email}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadCountry" className={styles.label}>
                                    Select Country <span className={styles.required}>*</span>
                                </label>
                                <Select
                                    id="leadCountry"
                                    placeholder="United Kingdom"
                                    searchable
                                    value={leadPassenger.country || null}
                                    onChange={handleLeadCountryChange}
                                    onBlur={handleLeadCountryAutofillBlur}
                                    inputProps={{
                                        autoComplete: "country-name",
                                        name: "country",
                                    }}
                                    data={countryOptions}
                                    limit={50}
                                    error={errors.lead_country}
                                    classNames={{ root: styles.selectInput }}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadTitle" className={styles.label}>
                                    Title <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="leadTitle"
                                    value={leadPassenger.title}
                                    onChange={(e) => handleLeadPassengerChange('title', e.target.value)}
                                    className={`${styles.select} ${errors.lead_title ? `is-invalid ${styles.inputError}` : ''}`}
                                >
                                    <option value="">Select</option>
                                    <option value="MR">Mr</option>
                                    <option value="MRS">Mrs</option>
                                    <option value="MISS">Miss</option>
                                    <option value="DR">Dr</option>
                                </select>
                                {errors.lead_title && <p className={styles.errorText}>{errors.lead_title}</p>}
                            </div>

                            <div className={styles.phoneRow}>
                                <div className={styles.fieldGroup}>
                                    <label htmlFor="leadPhoneCode" className={styles.label}>
                                        Code <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="leadPhoneCode"
                                        value={leadPassenger.phoneCode}
                                        onChange={(e) => handleLeadPassengerChange('phoneCode', e.target.value)}
                                        className={`${styles.input} ${errors.lead_phone ? `is-invalid ${styles.inputError}` : ''}`}
                                        placeholder="+1"
                                        inputMode="tel"
                                        autoComplete="tel-country-code"
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label htmlFor="leadPhone" className={styles.label}>
                                        Phone Number <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        id="leadPhone"
                                        name="phone"
                                        value={leadPassenger.phone}
                                        onChange={(e) => handleLeadPhoneChange(e.target.value)}
                                        className={`${styles.input} ${errors.lead_phone ? `is-invalid ${styles.inputError}` : ''}`}
                                        placeholder="Enter Phone Number..."
                                        autoComplete="tel"
                                        inputMode="tel"
                                    />
                                    {errors.lead_phone && <p className={styles.errorText}>{errors.lead_phone}</p>}
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadDob" className={styles.label}>
                                    Date of Birth <span className={styles.required}>*</span>
                                </label>
                                <DateInput
                                    minDate={getDobBounds(leadPassenger.type || 'adult').minDate}
                                    maxDate={getDobBounds(leadPassenger.type || 'adult').maxDate}
                                    defaultDate={
                                        leadPassenger.dob ||
                                        getDobBounds(leadPassenger.type || 'adult').defaultDate
                                    }
                                    placeholder="Date of Birth"
                                    clearable="true"
                                    error={errors.lead_dob}
                                    value={leadPassenger.dob}
                                    onChange={(date) => handleLeadPassengerChange('dob', date)}
                                    classNames={{ root: styles.dateInput }}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <span className={styles.label}>
                                    Gender <span className={styles.required}>*</span>
                                </span>
                                <div className={styles.genderGroup}>
                                    <label className={styles.radioLabel} htmlFor="leadMale">
                                        <input
                                            className={styles.radioInput}
                                            type="radio"
                                            name="leadGender"
                                            id="leadMale"
                                            value="male"
                                            checked={leadPassenger.gender === 'male'}
                                            onChange={(e) => handleLeadPassengerChange('gender', e.target.value)}
                                        />
                                        Male
                                    </label>
                                    <label className={styles.radioLabel} htmlFor="leadFemale">
                                        <input
                                            className={styles.radioInput}
                                            type="radio"
                                            name="leadGender"
                                            id="leadFemale"
                                            value="female"
                                            checked={leadPassenger.gender === 'female'}
                                            onChange={(e) => handleLeadPassengerChange('gender', e.target.value)}
                                        />
                                        Female
                                    </label>
                                </div>
                                {errors.lead_gender && <p className={styles.errorText}>{errors.lead_gender}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadDocumentType" className={styles.label}>
                                    ID Type <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="leadDocumentType"
                                    value={leadPassenger.documentType}
                                    onChange={(e) => handleLeadPassengerChange('documentType', e.target.value)}
                                    className={`${styles.select} ${errors.lead_documentType ? `is-invalid ${styles.inputError}` : ''}`}
                                >
                                    <option value="">Select</option>
                                    <option value="P">Passport</option>
                                    <option value="N">ID Card</option>
                                    <option value="O">Other</option>
                                </select>
                                {errors.lead_documentType && <p className={styles.errorText}>{errors.lead_documentType}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadDocumentNumber" className={styles.label}>
                                    ID Number <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="leadDocumentNumber"
                                    value={leadPassenger.documentNumber}
                                    onChange={(e) => handleLeadPassengerChange('documentNumber', e.target.value)}
                                    className={`${styles.input} ${errors.lead_documentNumber ? `is-invalid ${styles.inputError}` : ''}`}
                                    placeholder="e.g. AB1360538"
                                />
                                {errors.lead_documentNumber && <p className={styles.errorText}>{errors.lead_documentNumber}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label htmlFor="leadDocumentExpiry" className={styles.label}>
                                    ID Expiry Date <span className={styles.required}>*</span>
                                </label>
                                <DateInput
                                    minDate={getToday()}
                                    placeholder="DD-MM-YYYY"
                                    clearable="true"
                                    error={errors.lead_documentExpiry}
                                    value={leadPassenger.documentExpiry}
                                    onChange={(date) => handleLeadPassengerChange('documentExpiry', date)}
                                    classNames={{ root: styles.dateInput }}
                                />
                            </div>
                        </div>

                        <p className={styles.sectionNote}>
                            This information will be used for all booking confirmations and communications. Ensure that the name matches travel documents.
                        </p>
                    </section>
                </div>
            )}

            {showPassengerFields && passengers.length > 0 && (
                <div className={styles.formCard}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Other Passengers</h2>
                            <p className={styles.sectionDesc}>
                                Enter passenger details exactly as shown on their passport or government-issued ID.
                            </p>
                        </div>

                        {passengers.map((passenger, index) => (
                            <div key={passenger.id} className={styles.passengerBlock}>
                                <div className={styles.passengerHeader}>
                                    <h3 className={styles.passengerTitle}>Passenger {index + 2}</h3>
                                    <span className={styles.passengerBadge}>{getPassengerTypeLabel(passenger.type)}</span>
                                </div>

                                <div className={styles.fieldGrid}>
                                    <div className={styles.nameRow}>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                Title <span className={styles.required}>*</span>
                                            </label>
                                            <select
                                                value={passenger.title}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'title', e.target.value)}
                                                className={`${styles.select} ${errors[`passenger_${passenger.id}_title`] ? `is-invalid ${styles.inputError}` : ''}`}
                                            >
                                                <option value="">Select</option>
                                                <option value="MR">Mr</option>
                                                <option value="MRS">Mrs</option>
                                                <option value="MISS">Miss</option>
                                                <option value="DR">Dr</option>
                                            </select>
                                            {errors[`passenger_${passenger.id}_title`] && (
                                                <p className={styles.errorText}>{errors[`passenger_${passenger.id}_title`]}</p>
                                            )}
                                        </div>

                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                First Name <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={passenger.firstName}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'firstName', e.target.value)}
                                                placeholder="First Name"
                                                className={`${styles.input} ${errors[`passenger_${passenger.id}_firstName`] ? `is-invalid ${styles.inputError}` : ''}`}
                                            />
                                            {errors[`passenger_${passenger.id}_firstName`] && (
                                                <p className={styles.errorText}>{errors[`passenger_${passenger.id}_firstName`]}</p>
                                            )}
                                        </div>

                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                Last Name <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={passenger.lastName}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'lastName', e.target.value)}
                                                placeholder="Last Name"
                                                className={`${styles.input} ${errors[`passenger_${passenger.id}_lastName`] ? `is-invalid ${styles.inputError}` : ''}`}
                                            />
                                            {errors[`passenger_${passenger.id}_lastName`] && (
                                                <p className={styles.errorText}>{errors[`passenger_${passenger.id}_lastName`]}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            Date of Birth <span className={styles.required}>*</span>
                                        </label>
                                        <DateInput
                                            minDate={getDobBounds(passenger.type).minDate}
                                            maxDate={getDobBounds(passenger.type).maxDate}
                                            defaultDate={
                                                passenger.dob || getDobBounds(passenger.type).defaultDate
                                            }
                                            placeholder="Date of Birth"
                                            clearable="true"
                                            error={errors[`passenger_${passenger.id}_dob`]}
                                            value={passenger.dob}
                                            onChange={(date) => handlePassengerChange(passenger.id, 'dob', date)}
                                            classNames={{ root: styles.dateInput }}
                                        />
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            Email <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={passenger.email}
                                            onChange={(e) => handlePassengerChange(passenger.id, 'email', e.target.value)}
                                            placeholder="Email"
                                            className={`${styles.input} ${errors[`passenger_${passenger.id}_email`] ? `is-invalid ${styles.inputError}` : ''}`}
                                        />
                                        {errors[`passenger_${passenger.id}_email`] && (
                                            <p className={styles.errorText}>{errors[`passenger_${passenger.id}_email`]}</p>
                                        )}
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <span className={styles.label}>
                                            Gender <span className={styles.required}>*</span>
                                        </span>
                                        <div className={styles.genderGroup}>
                                            <label className={styles.radioLabel} htmlFor={`male_${passenger.id}`}>
                                                <input
                                                    className={styles.radioInput}
                                                    type="radio"
                                                    name={`gender_${passenger.id}`}
                                                    id={`male_${passenger.id}`}
                                                    value="male"
                                                    checked={passenger.gender === 'male'}
                                                    onChange={(e) => handlePassengerChange(passenger.id, 'gender', e.target.value)}
                                                />
                                                Male
                                            </label>
                                            <label className={styles.radioLabel} htmlFor={`female_${passenger.id}`}>
                                                <input
                                                    className={styles.radioInput}
                                                    type="radio"
                                                    name={`gender_${passenger.id}`}
                                                    id={`female_${passenger.id}`}
                                                    value="female"
                                                    checked={passenger.gender === 'female'}
                                                    onChange={(e) => handlePassengerChange(passenger.id, 'gender', e.target.value)}
                                                />
                                                Female
                                            </label>
                                        </div>
                                        {errors[`passenger_${passenger.id}_gender`] && (
                                            <p className={styles.errorText}>{errors[`passenger_${passenger.id}_gender`]}</p>
                                        )}
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            Country <span className={styles.required}>*</span>
                                        </label>
                                        <Select
                                            placeholder="Select Country"
                                            searchable
                                            value={passenger.country || null}
                                            onChange={(value) => handlePassengerCountryChange(passenger.id, value)}
                                            onBlur={(e) => handlePassengerCountryAutofillBlur(passenger.id, e)}
                                            inputProps={{
                                                autoComplete: "country-name",
                                                name: `passenger_${passenger.id}_country`,
                                            }}
                                            data={countryOptions}
                                            limit={50}
                                            error={errors[`passenger_${passenger.id}_country`]}
                                            classNames={{ root: styles.selectInput }}
                                        />
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            Phone Number <span className={styles.required}>*</span>
                                        </label>
                                        <div className={`${styles.phoneGroup} ${errors[`passenger_${passenger.id}_phone`] ? styles.phoneGroupError : ''}`}>
                                            <span className={styles.phonePrefix}>
                                                {passenger.phoneCode || '+__'}
                                            </span>
                                            <input
                                                type="tel"
                                                name={`passenger_${passenger.id}_phone`}
                                                value={passenger.phone}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'phone', e.target.value)}
                                                className={`${styles.input} ${styles.phoneInput} ${errors[`passenger_${passenger.id}_phone`] ? 'is-invalid' : ''}`}
                                                placeholder="1234567890"
                                                autoComplete="tel"
                                                inputMode="tel"
                                            />
                                        </div>
                                        {errors[`passenger_${passenger.id}_phone`] && (
                                            <p className={styles.errorText}>{errors[`passenger_${passenger.id}_phone`]}</p>
                                        )}
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            ID Type <span className={styles.required}>*</span>
                                        </label>
                                        <select
                                            value={passenger.documentType}
                                            onChange={(e) => handlePassengerChange(passenger.id, 'documentType', e.target.value)}
                                            className={`${styles.select} ${errors[`passenger_${passenger.id}_documentType`] ? `is-invalid ${styles.inputError}` : ''}`}
                                        >
                                            <option value="">Select</option>
                                            <option value="P">Passport</option>
                                            <option value="N">ID Card</option>
                                            <option value="O">Other</option>
                                        </select>
                                        {errors[`passenger_${passenger.id}_documentType`] && (
                                            <p className={styles.errorText}>{errors[`passenger_${passenger.id}_documentType`]}</p>
                                        )}
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            ID Number <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={passenger.documentNumber}
                                            onChange={(e) => handlePassengerChange(passenger.id, 'documentNumber', e.target.value)}
                                            placeholder="e.g. AB1360538"
                                            className={`${styles.input} ${errors[`passenger_${passenger.id}_documentNumber`] ? `is-invalid ${styles.inputError}` : ''}`}
                                        />
                                        {errors[`passenger_${passenger.id}_documentNumber`] && (
                                            <p className={styles.errorText}>{errors[`passenger_${passenger.id}_documentNumber`]}</p>
                                        )}
                                    </div>

                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            ID Expiry Date <span className={styles.required}>*</span>
                                        </label>
                                        <DateInput
                                            minDate={getToday()}
                                            placeholder="DD-MM-YYYY"
                                            clearable="true"
                                            error={errors[`passenger_${passenger.id}_documentExpiry`]}
                                            value={passenger.documentExpiry}
                                            onChange={(date) => handlePassengerChange(passenger.id, 'documentExpiry', date)}
                                            classNames={{ root: styles.dateInput }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                </div>
            )}

            {(showOverview || showPayFooter || mode === 'passengers') && (
                <div className={styles.formCard}>
                    {showOverview && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>Passenger overview</h2>
                                <p className={styles.sectionDesc}>
                                    Check each passenger&apos;s details, extra baggage, and seats before you pay.
                                </p>
                            </div>
                            <div className={styles.overviewList}>
                                {passengerSummary.map((item) => {
                                    const isInfant = String(item.type || '').toLowerCase().includes('infant');
                                    const passengerSeats = getPassengerSeats(item.id);
                                    const passengerBags = getPassengerBags(item.id);
                                    const typeLabel = String(item.type || 'adult')
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (c) => c.toUpperCase());
                                    const roleLabel =
                                        item.id === 'lead' || item.label === 'Lead passenger'
                                            ? 'Lead Passenger'
                                            : item.label;

                                    return (
                                        <div key={item.id} className={styles.overviewItem}>
                                            <div className={styles.overviewTop}>
                                                <span className={styles.overviewAvatar} aria-hidden>
                                                    <FaUser />
                                                </span>
                                                <div className={styles.overviewIdentity}>
                                                    <p className={styles.overviewName}>{item.name}</p>
                                                    <p className={styles.overviewMeta}>
                                                        {roleLabel} - {typeLabel}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.overviewDetailRows}>
                                                {passengerBags.map((bag) => (
                                                    <div
                                                        key={`${item.id}-${bag.legId || bag.ancillary_key}`}
                                                        className={styles.overviewDetailRow}
                                                    >
                                                        <span className={styles.overviewDetailLabel}>
                                                            Extra baggage
                                                            {bag.legLabel ? ` · ${bag.legLabel}` : ''}
                                                        </span>
                                                        <span className={styles.overviewDetailValue}>
                                                            <FaSuitcase className={styles.overviewDetailIcon} />
                                                            {getBaggageLabel(bag)}
                                                            <strong>
                                                                <PriceDisplay
                                                                    currency={bag.currency}
                                                                    price={bag.price}
                                                                />
                                                            </strong>
                                                        </span>
                                                    </div>
                                                ))}

                                                {!isInfant &&
                                                    (passengerSeats.length > 0 ? (
                                                        passengerSeats.map((seat) => (
                                                            <div
                                                                key={`${item.id}-${seat.segmentKey}`}
                                                                className={styles.overviewDetailRow}
                                                            >
                                                                <span className={styles.overviewDetailLabel}>
                                                                    Seat
                                                                    {seat.route ? ` · ${seat.route}` : ''}
                                                                </span>
                                                                <span className={styles.overviewDetailValue}>
                                                                    <MdAirlineSeatReclineExtra
                                                                        className={styles.overviewDetailIcon}
                                                                    />
                                                                    {seat.seatName}
                                                                    {seat.price != null && seat.price !== '' && (
                                                                        <strong>
                                                                            <PriceDisplay
                                                                                currency={seat.currency}
                                                                                price={seat.price}
                                                                            />
                                                                        </strong>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className={styles.overviewDetailRow}>
                                                            <span className={styles.overviewDetailLabel}>Seat</span>
                                                            <span className={styles.overviewDetailMuted}>
                                                                Airline assigned
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {showPayFooter && (
                        <div className={styles.importantSection}>
                            <div className={styles.importantHeader}>
                                <IoInformationCircle className={styles.importantIcon} aria-hidden />
                                <h3 className={styles.importantTitle}>Important Information</h3>
                            </div>
                            <ul className={styles.importantList}>
                                <li>
                                    <FaCheck className={styles.importantCheck} aria-hidden />
                                    <span>Please arrive at the airport at least 3 hours before international flights and 2 hours before domestic flights.</span>
                                </li>
                                <li>
                                    <FaCheck className={styles.importantCheck} aria-hidden />
                                    <span>Valid passport and visa (if required) must be presented at check-in.</span>
                                </li>
                                <li>
                                    <FaCheck className={styles.importantCheck} aria-hidden />
                                    <span>Check-in closes 60 minutes before international flights and 45 minutes for domestic flights.</span>
                                </li>
                                <li>
                                    <FaCheck className={styles.importantCheck} aria-hidden />
                                    <span>Baggage allowance is subject to airline terms and conditions.</span>
                                </li>
                                <li>
                                    <FaCheck className={styles.importantCheck} aria-hidden />
                                    <span>This is an electronic ticket. No paper ticket is required for travel.</span>
                                </li>
                            </ul>
                        </div>
                    )}

                    {mode === 'passengers' && (
                        <div className={styles.footer}>
                            <button onClick={handleContinue} type="button" className={styles.submitBtn}>
                                Continue →
                            </button>
                        </div>
                    )}

                    {showPayFooter && (
                        <div className={styles.footer}>
                            <div className={styles.termsRow}>
                                <input
                                    className={`${styles.termsCheckbox} ${errors.terms ? 'is-invalid' : ''}`}
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={(e) => {
                                        setTermsAccepted(e.target.checked);
                                        if (e.target.checked && errors.terms) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.terms;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                />
                                <label className={styles.termsLabel} htmlFor="terms">
                                    I agree to the{' '}
                                    <Link href="/terms-and-conditions" target="_blank" className={styles.termsLink}>
                                        terms and conditions
                                    </Link>
                                    . <span className={styles.required}>*</span>
                                </label>
                            </div>
                            {errors.terms && <p className={styles.errorText}>{errors.terms}</p>}

                            <button onClick={handleSubmit} type="submit" className={styles.submitBtn}>
                                Confirm Booking →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
