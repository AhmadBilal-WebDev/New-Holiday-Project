'use client'
import React, { useState, useEffect } from 'react'
import { Select } from "@mantine/core";
import { buildCountryOptions, resolvePhoneAutofill, matchCountryOption, applyCountrySelection } from '@/util/phoneAutofill';
import { DUPLICATE_NAME_MESSAGE, findDuplicateNameIndices } from '@/util/guestNameValidation';
import { TiDeleteOutline } from "react-icons/ti";
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import PackageBookingLoader from '@/components/Loader/PackageBookingLoader';
import { useCurrency } from '@/util/currency';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import { IoCopyOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { CiCircleCheck } from 'react-icons/ci';
import { FaUniversity, FaCreditCard, FaLock, FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';
import { MdOutlineLock } from 'react-icons/md';
import Link from 'next/link';
import LeadDetail from '@/components/LeadDetail/LeadDetail';
import Autocomplete from "react-google-autocomplete";
import LocationPicker from './LocationPicker';
import LocationMapModal from './LocationMapModal';
import { useJsApiLoader } from '@react-google-maps/api';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import styles from "./CheckoutTransfer.module.css";
import TopContact from '@/components/Home/TopContact/TopContact';

export default function CheckoutTransfer({ transferDetail, selectedExtras = [], onSelectedExtrasChange }) {
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const { currency, rates } = useCurrency();
    const [totalPersons, setTotalPersons] = useState({ adults: 0 });
    const [otherGuestDetail, setOtherGuestDetail] = useState([]);
    const [otherGuestError, setOtherGuestError] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaderError, setLoaderError] = useState("");
    const [currencyKey, setCurrencyKey] = useState("");
    const [confirmStatus, setConfirmStatus] = useState("pending"); // "pending" | "booking" | "payment" | "success" | "error"
    const [formData, setFormData] = useState({
        title: "",
        address: "",
        firstName: "",
        lastName: "",
        email: "",
        country: "",
        phoneCode: "",
        phone: "",
        requests: "",
        gender: "male",
        terms: false,
        flightNumber: "",
    });
    const [bookingOptionDetails, setBookingOptionDetails] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(null); // 'bank_transfer' | 'stripe'
    const [copiedField, setCopiedField] = useState(null);

    // Reset bank_transfer selection if provider is not custom
    useEffect(() => {
        if (paymentMethod === 'bank_transfer' && transferDetail?.provider !== 'custom') {
            setPaymentMethod(null);
        }
    }, [transferDetail?.provider]);

    // Location states
    const [pickupLocation, setPickupLocation] = useState({
        address: transferDetail?.searchParams?.pickupLocation || '',
        lat: null,
        lng: null
    });
    const [dropoffLocation, setDropoffLocation] = useState({
        address: transferDetail?.searchParams?.dropoffLocation || '',
        lat: null,
        lng: null
    });
    const [mapModal, setMapModal] = useState({
        isOpen: false,
        type: null, // 'pickup' or 'dropoff'
        initialLocation: null
    });

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        libraries: ['places'],
    });

    // Check if pickup or dropoff location contains "airport"
    const isAirportTransfer = () => {
        const pickupLoc = transferDetail?.searchParams?.pickupLocation?.toLowerCase() || '';
        const dropoffLoc = transferDetail?.searchParams?.dropoffLocation?.toLowerCase() || '';
        return pickupLoc.includes('airport') || dropoffLoc.includes('airport');
    };

    const bankInfo = {
        accountName: "Al Hijaz Tours Ltd",
        accountNumber: "58516868",
        // iban: "GB29NWBK60161331926819",
        sortcode: "309950",
        // branch: "London Branch",
    };

    useEffect(() => {
        setTotalPersons({
            adults: Math.max((transferDetail?.vehicle_details?.passenger_capacity || 0) - 1, 0),
        });

        // Initialize location states from transferDetail
        if (transferDetail?.searchParams) {
            setPickupLocation({
                address: transferDetail.searchParams.pickupLocation || '',
                lat: null,
                lng: null
            });
            setDropoffLocation({
                address: transferDetail.searchParams.dropoffLocation || '',
                lat: null,
                lng: null
            });
        }
    }, [transferDetail]);

    useEffect(() => {
        const callCurrencyAPI = async () => {
            if (!transferDetail?.id) return;
            var APiCurrency = currency;
            if (Object.keys(rates).length === 1) {
                APiCurrency = transferDetail?.currency;
            }
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/checkout/currency`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: transferDetail?.id,
                        type: "transfer",
                        display_currency: APiCurrency,
                        model_currency: transferDetail?.currency,
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
    }, [currency, transferDetail?.id]);

    const countryOptions = buildCountryOptions();
    // ---- Handle field change ----
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === "checkbox" ? checked : value;

        if (name === "phone" && typeof finalValue === "string") {
            const resolved = resolvePhoneAutofill(finalValue, countryOptions, {
                country: formData.country,
                phoneCode: formData.phoneCode,
            });
            setFormData((prev) => ({
                ...prev,
                phone: resolved.phone || "",
                ...(resolved.phoneCode ? { phoneCode: resolved.phoneCode } : {}),
                ...(resolved.country ? { country: resolved.country } : {}),
            }));
        } else {
            setFormData({
                ...formData,
                [name]: finalValue,
            });
        }

        if (errors[name]) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    // ---- Handle address autocomplete selection ----
    const handlePlaceSelected = (place) => {
        if (!place || !place.formatted_address) return;

        // Get formatted address
        const address = place.formatted_address;

        // Extract country from address components
        const countryComponent = place.address_components?.find(
            (component) => component.types.includes("country")
        );

        if (countryComponent) {
            // Find matching country in our country list
            const countryName = countryComponent.long_name;
            const matchedCountry = countryOptions.find(
                (c) => c.value === countryName || c.label === countryName
            );

            if (matchedCountry) {
                setFormData({
                    ...formData,
                    address: address,
                    country: matchedCountry.value,
                    phoneCode: matchedCountry.code || "",
                });

                // Clear errors
                setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.address;
                    delete updated.country;
                    return updated;
                });
            } else {
                // Country not found in our list, just set address
                setFormData({
                    ...formData,
                    address: address,
                });

                if (errors.address) {
                    setErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.address;
                        return updated;
                    });
                }
            }
        } else {
            // No country component, just set address
            setFormData({
                ...formData,
                address: address,
            });

            if (errors.address) {
                setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.address;
                    return updated;
                });
            }
        }
    };

    // ---- Handle country selection ----
    const handleCountryChange = (value) => {
        const applied = applyCountrySelection(value, countryOptions, formData.phone);
        setFormData({
            ...formData,
            country: applied.country,
            phoneCode: applied.phoneCode,
            phone: applied.phone,
        });

        if (errors.country) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated.country;
                return updated;
            });
        }
    };

    const handleCountryAutofillBlur = (e) => {
        const typed = e?.target?.value;
        if (!typed || formData.country === typed) return;
        const matched = matchCountryOption(typed, countryOptions);
        if (matched) handleCountryChange(matched.value);
    };

    // ---- Validation ----
    const validateForm = () => {
        const newErrors = {};
        const otherGuestErrors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.title) newErrors.title = "Please select a title.";
        if (!formData.firstName) newErrors.firstName = "First name is required.";
        if (!formData.lastName) newErrors.lastName = "Last name is required.";
        if (!formData.email) {
            newErrors.email = "Email is required.";
        } else if (emailRegex.test(formData.email) === false) {
            newErrors.email = "Please enter a valid email address.";
        }
        if (!formData.country) newErrors.country = "Please select a country.";
        if (!formData.phone) newErrors.phone = "Phone number is required.";
        if (formData.phone) {
            if (formData.phone.length > 15 || formData.phone.length < 6) {
                newErrors.phone = "Phone number must be between 6 and 15 digits.";
            }
        }
        if (!formData.address) newErrors.address = "Address is required.";
        if (!pickupLocation.address || !pickupLocation.address.trim()) {
            newErrors.pickupLocation = "Pickup location is required.";
        }
        if (!dropoffLocation.address || !dropoffLocation.address.trim()) {
            if (transferDetail?.searchParams?.transferType !== 'all-round') {
                newErrors.dropoffLocation = "Dropoff location is required.";
            }
        }
        if (isAirportTransfer() && !formData.flightNumber.trim()) {
            newErrors.flightNumber = "Flight number is required for airport transfers.";
        }
        // if (!formData.cardNumber) newErrors.cardNumber = "Card number is required.";
        // if (!formData.expiry) newErrors.expiry = "Expiry date is required.";
        // if (!formData.cvv) newErrors.cvv = "CVV is required.";
        if (!formData.terms) newErrors.terms = "You must agree to terms.";

        const allGuests = [
            { firstName: formData.firstName, lastName: formData.lastName },
            ...otherGuestDetail,
        ];
        const duplicateIndices = findDuplicateNameIndices(allGuests);
        if (duplicateIndices.has(0)) {
            newErrors.firstName = DUPLICATE_NAME_MESSAGE;
            newErrors.lastName = DUPLICATE_NAME_MESSAGE;
        }

        if (otherGuestDetail.length > 0) {
            otherGuestDetail.forEach((guest, index) => {
                const guestErrors = {};
                if (!guest.firstName.trim()) {
                    guestErrors.firstName = "First name is required";
                }
                if (!guest.lastName.trim()) {
                    guestErrors.lastName = "Last name is required";
                }
                if (duplicateIndices.has(index + 1)) {
                    guestErrors.firstName = DUPLICATE_NAME_MESSAGE;
                    guestErrors.lastName = DUPLICATE_NAME_MESSAGE;
                }
                otherGuestErrors[index] = guestErrors;
            });

            setOtherGuestError(otherGuestErrors);
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && otherGuestErrors.every(err => Object.keys(err).length === 0);
    };

    const handleGuestAdd = () => {
        const totalAllowed = totalPersons?.adults + totalPersons?.children;
        const currentAdults = otherGuestDetail.filter(g => g.type === 'AD').length;
        const currentChildren = otherGuestDetail.filter(g => g.type === 'CH').length;
        if (otherGuestDetail.length >= totalAllowed) {
            return;
        }
        setOtherGuestError([])
        if (currentAdults < totalPersons?.adults) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', gender: 'male', type: 'AD' }]);
        } else if (currentChildren < totalPersons?.children) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', gender: 'male', type: 'CH' }]);
        }

    };
    const handleGuestRemove = (index) => {
        const updatedGuests = otherGuestDetail.filter((_, i) => i !== index);
        setOtherGuestDetail(updatedGuests);
    };
    const handleGuestChange = (e, index) => {
        let field = e.target.name;
        const value = e.target.value;

        // Normalize gender field
        if (field.startsWith("gender_")) {
            field = "gender";
        }

        const updatedGuests = [...otherGuestDetail];
        updatedGuests[index][field] = value;
        setOtherGuestDetail(updatedGuests);

        // Clear error if exists
        const updatedErrors = [...otherGuestError];
        if (updatedErrors[index]?.[field]) {
            updatedErrors[index][field] = "";
            setOtherGuestError(updatedErrors);
        }
    };
    // ---- Submit handler ----
    const handleCheckout = async () => {
        // if (!paymentMethod) {
        //     notifications.show({ title: 'Payment Method Required', message: 'Please select a payment method to continue.', autoClose: 3000, color: 'yellow' });
        //     return;
        // }
        // if (!validateForm()) return;
        // setConfirmStatus("pending");
        // setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConfirmStatus("validate");
        var NewOtherPassenger = {};
        if (otherGuestDetail.length > 0) {
            NewOtherPassenger = convertPassengers(otherGuestDetail);
        }

        // Calculate currency conversion
        const packageCurrency = transferDetail?.currency || 'GBP';
        const extrasTotal = (selectedExtras || []).reduce(
            (sum, extra) => sum + Number(extra?.amount || 0),
            0
        );
        const grandTotal =
            Number(transferDetail?.fare || 0) * Number(transferDetail?.quantity || 1) + extrasTotal;

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
        debugger
        transferDetail.selected_extras = selectedExtras;
        const request = {
            booked_qty: transferDetail?.quantity || 1,
            flight_number: formData.flightNumber || '',
            exact_pickup_point: pickupLocation.address || '',
            exact_dropoff_point: dropoffLocation.address || '',
            currency_uuid: currencyKey,
            provider: transferDetail?.provider,
            // transferId: transferDetail?.id,
            special_request: formData.requests,
            lead_title: formData?.title,
            lead_first_name: formData?.firstName,
            lead_last_name: formData?.lastName,
            email: formData?.email,
            address: formData?.address,
            country: formData?.country,
            // phone_code: formData?.phoneCode,
            payment_method: paymentMethod,
            phone_number: formData?.phoneCode + formData?.phone,
            gender: formData?.gender,
            guest_details: NewOtherPassenger,
            // pickup_location: transferDetail?.searchParams?.pickupLocation,
            // dropoff_location: transferDetail?.searchParams?.dropoffLocation,
            // pickup_date: transferDetail?.searchParams?.pickupDate,
            // pickup_time: transferDetail?.searchParams?.pickupTime,
            // dropoff_date: transferDetail?.searchParams?.dropoffDate || "",
            // dropoff_time: transferDetail?.searchParams?.dropoffTime || "",
            // passengers: transferDetail?.searchParams?.passengers,
            // transfer_type: transferDetail?.searchParams?.transferType,
            // customer_currency: customerCurrency,
            // customer_exchange_rate: customerExchangeRate,
            // amount: customerTotalAfterDiscount,
            // extras: selectedExtras || [],
            selected_transfers: [transferDetail],
        };
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/booking`, {
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
                if (paymentMethod === 'bank_transfer') {
                    setConfirmStatus("success");
                    setTimeout(() => {
                        setLoading(false);
                        router.push(`/transfers/voucher/${response?.data?.invoice_number}`);
                    }, 800);
                } else {
                    await handlePayment(response?.data);
                }
            } else {
                setLoaderError(response?.Description);
                setConfirmStatus("error");
                setTimeout(() => {
                    setLoading(false);
                    notifications.show({
                        title: response.Title,
                        message: response?.Description,
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

    const handlePayment = async (data) => {
        const domain = window.location.origin;
        const checkoutUrl = window.location;
        const request = {
            'invoice_number': data?.invoice_number,
            'success_url': `${domain}/transfers/voucher/${data?.invoice_number}`,
            'cancel_url': `${checkoutUrl}`
        }
        localStorage.setItem('lead_details_fill', JSON.stringify(formData));
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transfers/booking/checkout`, {
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

    const copyToClipboard = (text, field) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedField(field);
                setTimeout(() => setCopiedField(null), 2000);
            }).catch(() => fallbackCopy(text, field));
        } else {
            fallbackCopy(text, field);
        }
    };

    const fallbackCopy = (text, field) => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        try {
            document.execCommand('copy');
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
        document.body.removeChild(el);
    };

    const convertPassengers = (list) => {
        return list.map((item) => ({
            first_name: item.firstName,
            last_name: item.lastName,
            gender: item.gender,
        }));
    };
    // Handle location picker changes
    const handlePickupLocationChange = (locationData) => {
        setPickupLocation(locationData);
        if (errors.pickupLocation) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated.pickupLocation;
                return updated;
            });
        }
    };

    const handleDropoffLocationChange = (locationData) => {
        setDropoffLocation(locationData);
        if (errors.dropoffLocation) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated.dropoffLocation;
                return updated;
            });
        }
    };

    // Handle map modal
    const handleOpenMap = (type, currentLocation) => {
        setMapModal({
            isOpen: true,
            type,
            initialLocation: currentLocation
        });
    };

    const handleMapSelectLocation = (locationData) => {
        if (mapModal.type === 'pickup') {
            handlePickupLocationChange(locationData);
        } else if (mapModal.type === 'dropoff') {
            handleDropoffLocationChange(locationData);
        }
    };

    const handleCloseMap = () => {
        setMapModal({
            isOpen: false,
            type: null,
            initialLocation: null
        });
    };

    const availableExtras = Array.isArray(transferDetail?.extras) ? transferDetail.extras : [];

    const getExtraMetaParts = (extra) => {
        const parts = [];
        if (extra?.weight_kg) parts.push(extra.weight_kg);
        if (extra?.age) parts.push(extra.age);
        return parts;
    };

    const toggleExtra = (extra) => {
        if (!onSelectedExtrasChange) return;
        const code = extra?.code;
        const alreadySelected = selectedExtras.some((item) => item.code === code);
        if (alreadySelected) {
            onSelectedExtrasChange(selectedExtras.filter((item) => item.code !== code));
        } else {
            onSelectedExtrasChange([...selectedExtras, extra]);
        }
    };

    // Render map modal component
    const renderMapModal = () => (
        <LocationMapModal
            isOpen={mapModal.isOpen}
            onClose={handleCloseMap}
            locationdata={transferDetail?.searchParams}
            onSelectLocation={handleMapSelectLocation}
            initialLocation={mapModal.initialLocation}
            title={mapModal.type === 'pickup' ? 'Select Pickup Location' : 'Select Dropoff Location'}
        />
    );

    return (
        <div>
            <div className={styles.formWrapper}>
                <LeadDetail setFormData={setFormData} />
                {loading && (
                    <PackageBookingLoader
                        errorMessage={loaderError}
                        showLoader={loading}
                        onComplete={handleLoaderComplete}
                        confirmStatus={confirmStatus}
                        componentName="Transfer"
                    />
                )}

                {/* Map Modal */}
                {isLoaded ? (
                    <>
                        {renderMapModal()}
                        {/* <div className="rounded border p-3 mb-3">
                        <h5 className="mb-3">Pickup and Dropoff Locations</h5>
                        <div className="alert alert-info py-2 mb-3" role="alert">
                            <small>
                                <strong>Two ways to select location:</strong>
                                <ul className="mb-0 mt-1 ps-3">
                                    <li><strong>Type:</strong> Enter address in the field with autocomplete suggestions</li>
                                    <li><strong>Map:</strong> Click the map button to visually select any location</li>
                                </ul>
                            </small>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <LocationPicker
                                    label="Pickup Location"
                                    value={pickupLocation.address}
                                    onChange={handlePickupLocationChange}
                                    error={errors.pickupLocation}
                                    placeholder="Enter pickup location"
                                    onOpenMap={(name, location) => handleOpenMap('pickup', location)}
                                    name="pickup"
                                />
                            </div>

                            <div className="col-md-6">
                                <LocationPicker
                                    label="Dropoff Location"
                                    value={dropoffLocation.address}
                                    onChange={handleDropoffLocationChange}
                                    error={errors.dropoffLocation}
                                    placeholder="Enter dropoff location"
                                    onOpenMap={(name, location) => handleOpenMap('dropoff', location)}
                                    name="dropoff"
                                />
                            </div>
                            {isAirportTransfer() && (
                                <div className="col-md-6">
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            Flight Number <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="flightNumber"
                                            value={formData.flightNumber}
                                            onChange={handleChange}
                                            className={`${styles.input} ${errors.flightNumber ? styles.inputError : ""}`}
                                            placeholder="e.g., BA123, EK456"
                                            autoComplete="off"
                                        />
                                        {errors.flightNumber && (
                                            <p className={styles.errorText}>{errors.flightNumber}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> */}
                    </>
                ) : (
                    <div className="rounded border p-3 mb-3">
                        <h5 className="mb-3">Pickup and Dropoff Locations</h5>
                        <div className="d-flex align-items-center gap-2 text-muted" style={{ minHeight: 80 }}>
                            <div className="spinner-border spinner-border-sm" role="status" />
                            <span>Loading map services...</span>
                        </div>
                    </div>
                )}

                {/* Extra Services */}
                {availableExtras.length > 0 && (
                    <div className={styles.formCard}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Extra Services</h2>
                            <p className={styles.sectionDesc}>
                                Optional add-ons for your transfer. Selected extras will be added to the total price.
                            </p>
                            <div className={styles.extrasList}>
                                {availableExtras.map((extra) => {
                                    const isSelected = selectedExtras.some((item) => item.code === extra.code);
                                    const metaParts = getExtraMetaParts(extra);
                                    return (
                                        <label
                                            key={extra.code}
                                            className={`${styles.extraItem} ${isSelected ? styles.extraItemActive : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className={styles.extraCheckbox}
                                                checked={isSelected}
                                                onChange={() => toggleExtra(extra)}
                                            />
                                            <div className={styles.extraContent}>
                                                <div className={styles.extraInfo}>
                                                    <span className={styles.extraName}>
                                                        {extra.name || extra.type}
                                                    </span>
                                                    {metaParts.length > 0 ? (
                                                        <div className={styles.extraMeta}>
                                                            {metaParts.map((part) => (
                                                                <span key={part} className={styles.extraMetaTag}>
                                                                    {part}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        extra.type && extra.name && extra.type !== extra.name ? (
                                                            <span className={styles.extraMetaText}>{extra.type}</span>
                                                        ) : null
                                                    )}
                                                </div>
                                                <span className={styles.extraPrice}>
                                                    <PriceDisplay
                                                        price={Number(extra.amount || 0)}
                                                        currency={transferDetail?.currency}
                                                    />
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {/* Lead Guest Info */}
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
                                <label className={styles.label} htmlFor="transferFirstName">
                                    First Name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    id="transferFirstName"
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                                    placeholder="First Name"
                                    autoComplete="given-name"
                                />
                                {errors.firstName && (
                                    <p className={styles.errorText}>{errors.firstName}</p>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="transferLastName">
                                    Last Name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    id="transferLastName"
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                                    placeholder="Last Name"
                                    autoComplete="family-name"
                                />
                                {errors.lastName && (
                                    <p className={styles.errorText}>{errors.lastName}</p>
                                )}
                            </div>

                            <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                                <label className={styles.label} htmlFor="transferEmail">
                                    Email Address <span className={styles.required}>*</span>
                                </label>
                                <input
                                    id="transferEmail"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <p className={styles.errorText}>{errors.email}</p>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    Select Country <span className={styles.required}>*</span>
                                </label>
                                <Select
                                    placeholder="Select Country"
                                    searchable
                                    data={countryOptions}
                                    value={formData.country || null}
                                    limit={50}
                                    onChange={handleCountryChange}
                                    onBlur={handleCountryAutofillBlur}
                                    inputProps={{
                                        autoComplete: "country-name",
                                        name: "country",
                                    }}
                                    error={errors.country}
                                    classNames={{ root: styles.selectInput }}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="transferAddress">
                                    Address <span className={styles.required}>*</span>
                                </label>
                                <Autocomplete
                                    id="transferAddress"
                                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    placeholder="House No. / Street"
                                    className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onPlaceSelected={handlePlaceSelected}
                                    options={{
                                        types: ["geocode", "establishment"],
                                    }}
                                />
                                {errors.address && (
                                    <p className={styles.errorText}>{errors.address}</p>
                                )}
                            </div>

                            <div className={styles.phoneRow}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="transferPhoneCode">
                                        Code
                                    </label>
                                    <input
                                        id="transferPhoneCode"
                                        type="text"
                                        name="phoneCode"
                                        value={formData.phoneCode}
                                        onChange={handleChange}
                                        className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                                        placeholder="+1"
                                        inputMode="tel"
                                        autoComplete="tel-country-code"
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="transferPhone">
                                        Phone Number <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        id="transferPhone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        onKeyDown={(e) => {
                                            if (e.ctrlKey || e.metaKey || e.altKey) return;
                                            if (
                                                !/[0-9+]/.test(e.key) &&
                                                !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)
                                            ) {
                                                e.preventDefault();
                                            }
                                        }}
                                        className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                                        placeholder="Phone Number"
                                        autoComplete="tel"
                                        inputMode="tel"
                                    />
                                    {errors.phone && (
                                        <p className={styles.errorText}>{errors.phone}</p>
                                    )}
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="transferTitle">
                                    Title <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="transferTitle"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`${styles.select} ${errors.title ? styles.inputError : ""}`}
                                >
                                    <option value="">Select</option>
                                    <option value="MR">Mr</option>
                                    <option value="MRS">Mrs</option>
                                    <option value="MISS">Miss</option>
                                    <option value="DR">Dr</option>
                                </select>
                                {errors.title && <p className={styles.errorText}>{errors.title}</p>}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    Gender <span className={styles.required}>*</span>
                                </label>
                                <div className={styles.genderGroup}>
                                    <label className={styles.genderOption} htmlFor="leadRadio1">
                                        <input
                                            checked={formData.gender === "male"}
                                            type="radio"
                                            onChange={handleChange}
                                            name="gender"
                                            id="leadRadio1"
                                            value="male"
                                        />
                                        Male
                                    </label>
                                    <label className={styles.genderOption} htmlFor="leadRadio2">
                                        <input
                                            checked={formData.gender === "female"}
                                            type="radio"
                                            onChange={handleChange}
                                            name="gender"
                                            id="leadRadio2"
                                            value="female"
                                        />
                                        Female
                                    </label>
                                </div>
                            </div>
                        </div>

                        <p className={styles.sectionNote}>
                            This information will be used for all booking confirmations and
                            communications. Ensure that the name matches travel documents.
                        </p>
                    </section>
                </div>
                <div className={styles.otherGuestsCard}>
                    <div className={styles.otherGuestsHeader}>
                        <h2 className={styles.otherGuestsTitle}>Other Guests</h2>
                        <p className={styles.otherGuestsSubtitle}>
                            Add details for additional guests staying in the room
                        </p>
                    </div>

                    <hr className={styles.otherGuestsDivider} />

                    <div className={styles.otherGuestsAction}>
                        <p className={styles.otherGuestsHint}>
                            You can add remaining adults and children travelling with you.
                        </p>
                        <button
                            type="button"
                            onClick={handleGuestAdd}
                            className={styles.addGuestBtn}
                        >
                            + Add Guest
                        </button>
                    </div>

                    {otherGuestDetail.length > 0 && (
                        <div className={styles.guestList}>
                            {otherGuestDetail.map((item, index) => (
                                <div key={index} className={styles.guestBlock}>
                                    <div className={styles.guestHeader}>
                                        <div className={styles.guestTitleRow}>
                                            <h3 className={styles.guestTitle}>Passenger {index + 2}</h3>
                                            {(item.type === 'CH' || item.type === 'IN') && (
                                                <span className={styles.guestBadge}>
                                                    {item.type === 'CH' ? 'Child' : 'Infant'}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleGuestRemove(index)}
                                            className={styles.removeGuestBtn}
                                            aria-label={`Remove passenger ${index + 2}`}
                                        >
                                            <TiDeleteOutline size={20} />
                                        </button>
                                    </div>
                                    <div className={styles.fieldGridThree}>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                First Name <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                onChange={(e) => handleGuestChange(e, index)}
                                                value={item.firstName}
                                                placeholder="First Name"
                                                className={`${styles.input} ${otherGuestError[index]?.firstName ? styles.inputError : ""}`}
                                            />
                                            {otherGuestError[index]?.firstName && (
                                                <p className={styles.errorText}>{otherGuestError[index]?.firstName}</p>
                                            )}
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                Last Name <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                onChange={(e) => handleGuestChange(e, index)}
                                                value={item.lastName}
                                                placeholder="Last Name"
                                                className={`${styles.input} ${otherGuestError[index]?.lastName ? styles.inputError : ""}`}
                                            />
                                            {otherGuestError[index]?.lastName && (
                                                <p className={styles.errorText}>{otherGuestError[index]?.lastName}</p>
                                            )}
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <label className={styles.label}>
                                                Gender <span className={styles.required}>*</span>
                                            </label>
                                            <div className={styles.genderGroup}>
                                                <label className={styles.genderOption} htmlFor={`male_${index}`}>
                                                    <input
                                                        checked={item.gender === "male"}
                                                        type="radio"
                                                        onChange={(e) => handleGuestChange(e, index)}
                                                        name={`gender_${index}`}
                                                        id={`male_${index}`}
                                                        value="male"
                                                    />
                                                    Male
                                                </label>
                                                <label className={styles.genderOption} htmlFor={`female_${index}`}>
                                                    <input
                                                        checked={item.gender === "female"}
                                                        type="radio"
                                                        onChange={(e) => handleGuestChange(e, index)}
                                                        name={`gender_${index}`}
                                                        id={`female_${index}`}
                                                        value="female"
                                                    />
                                                    Female
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Secure Payment Method */}
                <div className={styles.paymentCard}>
                    <div className={styles.paymentHeader}>
                        <MdOutlineLock className={styles.paymentHeaderIcon} size={20} aria-hidden="true" />
                        <h2 className={styles.paymentHeaderTitle}>Secure Payment Method</h2>
                    </div>

                    <div className={styles.paymentBody}>
                        <div
                            className={`${styles.paymentOptions} ${transferDetail?.provider !== 'custom' ? styles.paymentOptionsSingle : ''
                                }`}
                        >
                            {transferDetail?.provider === 'custom' && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('bank_transfer')}
                                    className={`${styles.paymentOption} ${paymentMethod === 'bank_transfer' ? styles.paymentOptionActive : ''
                                        }`}
                                >
                                    <span
                                        className={`${styles.paymentIcon} ${paymentMethod === 'bank_transfer'
                                            ? styles.paymentIconActive
                                            : styles.paymentIconInactive
                                            }`}
                                    >
                                        <FaUniversity size={18} />
                                    </span>
                                    <span className={styles.paymentOptionCopy}>
                                        <span className={styles.paymentOptionTitle}>Bank Transfer</span>
                                        <span className={styles.paymentOptionDesc}>Direct wire</span>
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('stripe')}
                                className={`${styles.paymentOption} ${paymentMethod === 'stripe' ? styles.paymentOptionActive : ''
                                    }`}
                            >
                                <span
                                    className={`${styles.paymentIcon} ${paymentMethod === 'stripe'
                                        ? styles.paymentIconActive
                                        : styles.paymentIconInactive
                                        }`}
                                >
                                    <FaCreditCard size={18} />
                                </span>
                                <span className={styles.paymentOptionCopy}>
                                    <span className={styles.paymentOptionTitle}>Credit / Debit Card</span>
                                    <span className={styles.paymentOptionDesc}>Visa · MC · Amex</span>
                                </span>
                                <span className={styles.cardBrandRow} aria-hidden="true">
                                    <FaCcVisa />
                                    <FaCcAmex />
                                    <FaCcMastercard />
                                </span>
                            </button>
                        </div>

                        {paymentMethod === 'bank_transfer' && (
                            <div className={styles.paymentDetailBox}>
                                <div className={styles.paymentDetailHeader}>
                                    <FaUniversity size={16} className={styles.paymentDetailHeaderIcon} />
                                    <span>Bank Account Details</span>
                                </div>
                                <div className={styles.bankGrid}>
                                    <div>
                                        <div className={styles.bankFieldLabel}>Account Name</div>
                                        <div className={styles.bankFieldValue}>
                                            <span>{bankInfo.accountName}</span>
                                            <button
                                                type="button"
                                                className={styles.copyBtn}
                                                onClick={() => copyToClipboard(bankInfo.accountName, 'accountName')}
                                                title="Copy"
                                            >
                                                {copiedField === 'accountName' ? (
                                                    <IoCheckmarkCircleOutline size={16} className={styles.copySuccess} />
                                                ) : (
                                                    <IoCopyOutline size={15} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className={styles.bankFieldLabel}>Account Number</div>
                                        <div className={styles.bankFieldValue}>
                                            <span>{bankInfo.accountNumber}</span>
                                            <button
                                                type="button"
                                                className={styles.copyBtn}
                                                onClick={() =>
                                                    copyToClipboard(bankInfo.accountNumber, 'accountNumber')
                                                }
                                                title="Copy"
                                            >
                                                {copiedField === 'accountNumber' ? (
                                                    <IoCheckmarkCircleOutline size={16} className={styles.copySuccess} />
                                                ) : (
                                                    <IoCopyOutline size={15} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className={styles.bankFieldLabel}>Sort Code</div>
                                        <div className={styles.bankFieldValue}>
                                            <span>{bankInfo.sortcode}</span>
                                            <button
                                                type="button"
                                                className={styles.copyBtn}
                                                onClick={() => copyToClipboard(bankInfo.sortcode, 'sortcode')}
                                                title="Copy"
                                            >
                                                {copiedField === 'sortcode' ? (
                                                    <IoCheckmarkCircleOutline size={16} className={styles.copySuccess} />
                                                ) : (
                                                    <IoCopyOutline size={15} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.paymentAlert}>
                                    <strong>Important:</strong> After completing your bank transfer, please send
                                    the payment proof (screenshot or bank receipt) to our support team via email
                                    or WhatsApp. Include your booking reference number in the transfer
                                    description. Your booking will be confirmed once payment is verified.
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'stripe' && (
                            <div className={styles.paymentDetailBox}>
                                <p className={styles.paymentDetailText}>
                                    You will be securely redirected to Stripe&apos;s payment page to enter your
                                    card details. We accept Visa, Mastercard, American Express and more.
                                </p>
                                <p className={styles.paymentDetailNote}>
                                    Your card details are never stored on our servers. All transactions are
                                    processed securely through Stripe.
                                </p>
                            </div>
                        )}

                        {paymentMethod === 'stripe' && (
                            <div className={styles.stripeBar}>
                                <div className={styles.stripeBarLeft}>
                                    <FaLock size={14} />
                                    <span>
                                        Secured &amp; powered by <strong>Stripe</strong>
                                    </span>
                                </div>
                                <div className={styles.trustBadges}>
                                    <span className={styles.trustBadge}>
                                        <CiCircleCheck size={14} /> 256-bit
                                    </span>
                                    <span className={styles.trustBadge}>
                                        <CiCircleCheck size={14} /> PCI DSS Compliant
                                    </span>
                                    <span className={styles.trustBadge}>
                                        <CiCircleCheck size={14} /> 3D Secure
                                    </span>
                                </div>
                            </div>
                        )}

                        {!paymentMethod && (
                            <p className={styles.paymentHint}>
                                Please select a payment method above to continue.
                            </p>
                        )}
                    </div>
                </div>

                {/* Special Requests */}
                <div className={styles.specialCard}>
                    <div className={styles.specialHeader}>
                        <h2 className={styles.specialTitle}>Special Requests</h2>
                        <p className={styles.specialSubtitle}>
                            List any operational requirements — child seats, oversized luggage, preferred
                            cabin temperature.
                        </p>
                    </div>
                    <hr className={styles.specialDivider} />
                    <div className={styles.specialBody}>
                        <textarea
                            className={styles.specialTextarea}
                            rows={5}
                            name="requests"
                            value={formData.requests}
                            onChange={handleChange}
                            placeholder="Write your customized request here..."
                        />
                    </div>
                </div>

                {/* Terms */}
                <div className={styles.termsBar}>
                    <div className={styles.termsCheck}>
                        <input
                            className={`${styles.termsCheckbox} ${errors.terms ? 'is-invalid' : ''}`}
                            type="checkbox"
                            name="terms"
                            id="transfer-terms"
                            checked={formData.terms}
                            onChange={handleChange}
                        />
                        <label className={styles.termsLabel} htmlFor="transfer-terms">
                            I agree to the{' '}
                            <Link
                                target="_blank"
                                href="/terms-and-conditions"
                                className={styles.termsLink}
                            >
                                terms and conditions
                            </Link>
                            . <span className={styles.termsRequired}>*</span>
                        </label>
                    </div>
                    {errors.terms && <p className={styles.errorText}>{errors.terms}</p>}
                </div>

                <button
                    type="button"
                    onClick={handleCheckout}
                    className={styles.confirmBtn}
                    disabled={loading || !paymentMethod}
                >
                    {loading ? (
                        'Processing...'
                    ) : paymentMethod === 'bank_transfer' ? (
                        <>
                            <FaUniversity /> Reserve &amp; Get Bank Details
                        </>
                    ) : (
                        <>
                            Pay{' '}
                            <PriceDisplay
                                price={
                                    Number(transferDetail?.quantity || 1) *
                                    Number(transferDetail?.fare || 0) +
                                    selectedExtras.reduce(
                                        (sum, extra) => sum + Number(extra?.amount || 0),
                                        0
                                    )
                                }
                                currency={transferDetail?.currency}
                            />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
