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
import styles from './Checkout.module.css';
export default function CheckoutForm({ packageData }) {
    const { currency, rates } = useCurrency();
    const router = useRouter();
    // Initialize passenger data from flight data
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaderError, setLoaderError] = useState("");
    const [currencyKey, setCurrencyKey] = useState("");
    const [confirmStatus, setConfirmStatus] = useState("pending"); // "pending" | "booking" | "payment" | "success" | "error"
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
        // passportNumber: '',
        // passportExpiry: '',
        type: 'adult'
    });
    const [errors, setErrors] = useState({});
    const [termsAccepted, setTermsAccepted] = useState(false);

    const countryOptions = buildCountryOptions();


    useEffect(() => {
        
        if (packageData?.original_request) {
            const passengerList = [];
            let passengerId = 1;
            const { adult, child } = packageData.original_request;
            // Count passenger types
            const counts = { adult: adult || 0, child: child || 0 };

            // Skip first adult as it's the lead passenger
            if (counts.adult > 0) {
                for (let i = 1; i < counts.adult; i++) {
                    passengerList.push({
                        id: passengerId++,
                        type: 'adult',
                        title: '',
                        firstName: '',
                        lastName: '',
                        gender: 'male',
                        dob: '',
                        email: '',
                        country: '',
                        phoneCode: '',
                        phone: '',
                        // passportNumber: '',
                        // passportExpiry: ''
                    });
                }
            }

            // Add children
            if (counts.child > 0) {
                for (let i = 0; i < counts.child; i++) {
                    passengerList.push({
                        id: passengerId++,
                        type: 'child',
                        title: '',
                        firstName: '',
                        lastName: '',
                        gender: 'male',
                        dob: '',
                        email: '',
                        country: '',
                        phoneCode: '',
                        phone: '',
                        // passportNumber: '',
                        // passportExpiry: ''
                    });
                }
            }

            setPassengers(passengerList);
        }
    }, [packageData]);

    useEffect(() => {
        const callCurrencyAPI = async () => {
            if (!packageData?.package_id) return;
            var APiCurrency = currency;
            if (Object.keys(rates).length === 1) {
                APiCurrency = packageData?.pricing?.currency;
            }
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/checkout/currency`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: packageData?.package_id,
                        type: "umrah-getaway",
                        display_currency: APiCurrency,
                        model_currency: packageData?.pricing?.currency,
                    }),
                });
                const result = await response.json();
                if (result?.success) {
                    setCurrencyKey(result?.data?.uuid);
                }
            } catch (error) {
                console.error("Error calling currency API:", error);
            }
        };

        callCurrencyAPI();
    }, [currency, packageData]);

    const getPassengerTypeLabel = (type) => {
        if (type === 'adult') return 'Adult';
        if (type === 'child') return 'Child';
        return type;
    };

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateField = (name, value, isLeadPassenger = true, passengerData = null) => {
        const isEmpty = !value || (typeof value === 'string' && value.trim() === '');

        // Email / phone optional for other passengers — only validate format when provided
        if (!isLeadPassenger && (name === 'email' || name === 'phone')) {
            if (isEmpty) return '';
            if (name === 'email' && !validateEmail(value)) {
                return 'Please enter a valid email address';
            }
            if (name === 'phone') {
                const phoneCode = passengerData?.phoneCode;
                const phone = passengerData?.phone;
                if (phoneCode && phone && !isValidPhoneNumber(phoneCode + phone)) {
                    return 'Please enter a valid phone number';
                }
            }
            return '';
        }

        if (isEmpty) {
            return `${name.replace(/([A-Z])/g, ' $1').trim()} is required`;
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

        return '';
    };

    // Strip special chars (e.g. "+" from autofill) — digits only
    const handleLeadPassengerChange = (field, value) => {
        if (field === 'phone') {
            const resolved = resolvePhoneAutofill(value, countryOptions, {
                country: leadPassenger.country,
                phoneCode: leadPassenger.phoneCode,
            });
            setLeadPassenger(prev => ({
                ...prev,
                phone: resolved.phone || '',
                ...(resolved.phoneCode ? { phoneCode: resolved.phoneCode } : {}),
                ...(resolved.country ? { country: resolved.country } : {}),
            }));
        } else {
            setLeadPassenger(prev => ({ ...prev, [field]: value }));
        }

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
                };
            }));
        } else {
            setPassengers(prev => prev.map(p =>
                p.id === id ? { ...p, [field]: value } : p
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

    const validateForm = () => {
        const newErrors = {};

        // Validate lead passenger
        const leadFields = ['title', 'firstName', 'lastName', 'email', 'dob', 'gender', 'country', 'phone'];
        leadFields.forEach(field => {
            const error = validateField(field, leadPassenger[field], true);
            if (error) {
                newErrors[`lead_${field}`] = error;
            }
        });

        // Validate other passengers (email & phone optional)
        passengers.forEach(passenger => {
            const passengerFields = ['title', 'firstName', 'lastName', 'gender', 'dob', 'country', 'email', 'phone'];
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
        if (!termsAccepted) {
            newErrors['terms'] = 'You must accept the terms and conditions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const showCheckoutError = (title, message) => {
        setLoaderError(message);
        setConfirmStatus("error");
        setTimeout(() => {
            setLoading(false);
            notifications.show({
                title: title || "Error",
                message,
                autoClose: 3500,
                color: "red",
            });
        }, 1000);
    };

    const validateCheckout = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/checkout/validate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ package_id: packageData.package_id }),
                }
            );
            const response = await res.json();
            if (response?.Success) {
                return true;
            }
            showCheckoutError(response?.Title, response?.Description);
            return false;
        } catch {
            showCheckoutError("Error", "A network error occurred. Please try again.");
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            setLoaderError("");
            setConfirmStatus("pending");
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            setConfirmStatus("validate");

            const isValid = await validateCheckout();
            if (!isValid) return;
            setConfirmStatus("validate");
            // Calculate currency conversion
            const packageCurrency = packageData?.pricing?.currency;
            const grandTotal = Number(packageData?.pricing?.total_price);

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

            // Create passengers array with lead passenger at index 0
            const AdultArray = passengers
                .filter(p => p.type === 'adult')
                .map((p, i) => {
                    const { id, ...rest } = p; // remove id
                    return {
                        ...rest,
                        index: i + 1
                    };
                });

            const ChildArray = passengers
                .filter(p => p.type === 'child')
                .map((p, i) => {
                    const { id, ...rest } = p; // remove id
                    return {
                        ...rest,
                        index: i + 1
                    };
                });

            const domain = window.location.origin;
            const checkoutUrl = window.location;

            const request = {
                "package_id": packageData.package_id,
                "title": leadPassenger.title,
                "firstName": leadPassenger.firstName,
                "lastName": leadPassenger.lastName,
                "currency_uuid": currencyKey,
                // "booking_type": null,
                // "contact_id": null,
                "markup": { enabled: false, type: null, value: 0, amount: 0, price_after_markup:  Number(packageData?.pricing?.total_price) },
                "email": leadPassenger.email,
                "dob": leadPassenger.dob,
                "gender": leadPassenger.gender,
                "country": leadPassenger.country,
                "phoneCode": leadPassenger.phoneCode,
                "phone": leadPassenger.phone,
                "other_passengers": {
                    "additional_adults": AdultArray,
                    "children_details": ChildArray
                },
                // "grand_total": grandTotal,
                // "customer_currency": customerCurrency,
                // "customer_exchange_rate": customerExchangeRate,
                // "customer_amount": customerTotalAfterDiscount,
                "success_url": `${domain}/umrah-getaway/${packageData?.package_id}`,
                "cancel_url": `${checkoutUrl}`
            };
            // `${domain}/flights/voucher/${data?.booking_reference}`,
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customized/packages/booking/confirm`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // 'ngrok-skip-browser-warning': 'true',
                    },
                    body: JSON.stringify(request),
                });
                const response = await res.json();
                if (response?.Success) {
                    localStorage.setItem('lead_details_fill', JSON.stringify(leadPassenger));
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setConfirmStatus("payment");
                    router.push(response?.Content?.checkout_url);
                    // await handlePayment(response?.data);
                } else {
                    setLoaderError(response?.Description);
                    setConfirmStatus("error");
                    setTimeout(() => {
                        setLoading(false);
                        notifications.show({
                            title: response?.Title || 'Error',
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
        } else {
            // Scroll to first error
            const firstError = document.querySelector('.is-invalid');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleLoaderComplete = () => {
    };

    return (
        <div className={`umrah-getaway-checkout ${styles.checkoutForm}`}>
            <LeadDetail setFormData={setLeadPassenger} module="flight" />
            {loading && (
                <PackageBookingLoader
                    errorMessage={loaderError}
                    showLoader={loading}
                    onComplete={handleLoaderComplete}
                    confirmStatus={confirmStatus}
                    componentName="Package"
                />
            )}

            {/* Lead Person Information */}
            <div className={styles.sectionCard}>
                <h5 className={styles.formSectionTitle}>Lead Person Information</h5>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label htmlFor="leadTitle" className="form-label">Title <span className="text-danger">*</span></label>
                        <select
                            id="leadTitle"
                            value={leadPassenger.title}
                            onChange={(e) => handleLeadPassengerChange('title', e.target.value)}
                            className={`form-select ${errors.lead_title ? 'is-invalid' : ''}`}
                        >
                            <option value="">Select</option>
                            <option value="MR">Mr</option>
                            <option value="MRS">Mrs</option>
                            <option value="MISS">Miss</option>
                           
                            <option value="DR">Dr</option>
                        </select>
                        {errors.lead_title && <div className="invalid-feedback">{errors.lead_title}</div>}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadFirstName" className="form-label">First Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            id="leadFirstName"
                            value={leadPassenger.firstName}
                            onChange={(e) => handleLeadPassengerChange('firstName', e.target.value)}
                            className={`form-control ${errors.lead_firstName ? 'is-invalid' : ''}`}
                            placeholder="First Name"
                        />
                        {errors.lead_firstName && <div className="invalid-feedback">{errors.lead_firstName}</div>}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadLastName" className="form-label">Last Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            id="leadLastName"
                            value={leadPassenger.lastName}
                            onChange={(e) => handleLeadPassengerChange('lastName', e.target.value)}
                            className={`form-control ${errors.lead_lastName ? 'is-invalid' : ''}`}
                            placeholder="Last Name"
                        />
                        {errors.lead_lastName && <div className="invalid-feedback">{errors.lead_lastName}</div>}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadEmail" className="form-label">Email <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            id="leadEmail"
                            value={leadPassenger.email}
                            onChange={(e) => handleLeadPassengerChange('email', e.target.value)}
                            className={`form-control ${errors.lead_email ? 'is-invalid' : ''}`}
                            placeholder="you@example.com"
                        />
                        {errors.lead_email && <div className="invalid-feedback">{errors.lead_email}</div>}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadDob" className="form-label">Date of Birth <span className="text-danger">*</span></label>
                        <DateInput maxDate={new Date()} placeholder='Date of Birth' clearable="true" error={errors.lead_dob} value={leadPassenger.dob} onChange={(date) => handleLeadPassengerChange('dob', date)} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Gender <span className="text-danger">*</span></label>
                        <div className="">
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="leadGender"
                                    id="leadMale"
                                    value="male"
                                    checked={leadPassenger.gender === 'male'}
                                    onChange={(e) => handleLeadPassengerChange('gender', e.target.value)}
                                />
                                <label className="form-check-label" htmlFor="leadMale">Male</label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="leadGender"
                                    id="leadFemale"
                                    value="female"
                                    checked={leadPassenger.gender === 'female'}
                                    onChange={(e) => handleLeadPassengerChange('gender', e.target.value)}
                                />
                                <label className="form-check-label" htmlFor="leadFemale">Female</label>
                            </div>
                        </div>
                        {errors.lead_gender && <div className="text-danger small">{errors.lead_gender}</div>}
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadCountry" className="form-label">Country <span className="text-danger">*</span></label>
                        <Select
                            id="leadCountry"
                            placeholder="Select Country"
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

                        />
                    </div>
                    <div className="col-md-6">
                        <label htmlFor="leadPhone" className="form-label">Phone Number <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text bg-light">
                                {leadPassenger.phoneCode || "+__"}
                            </span>
                            <input
                                type="tel"
                                name="phone"
                                value={leadPassenger.phone}
                                onChange={(e) => handleLeadPhoneChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                                    if (
                                        !/[0-9+]/.test(e.key) &&
                                        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)
                                    ) {
                                        e.preventDefault();
                                    }
                                }}
                                className={`form-control ${errors.lead_phone ? "is-invalid" : ""}`}
                                placeholder="1234567890"
                                autoComplete="tel"
                                inputMode="tel"
                            />
                        </div>
                        {errors.lead_phone && <div className="invalid-feedback d-block">{errors.lead_phone}</div>}
                    </div>
                    {/* <div className="col-md-6">
                        <label htmlFor="leadPassportNumber" className="form-label">Passport Number <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            id="leadPassportNumber"
                            value={leadPassenger.passportNumber}
                            onChange={(e) => handleLeadPassengerChange('passportNumber', e.target.value)}
                            className={`form-control ${errors.lead_passportNumber ? 'is-invalid' : ''}`}
                            placeholder="A1234567"
                        />
                        {errors.lead_passportNumber && <div className="invalid-feedback">{errors.lead_passportNumber}</div>}
                    </div> */}
                    {/* <div className="col-md-6">
                        <label htmlFor="leadPassportExpiry" className="form-label">Passport Expiry <span className="text-danger">*</span></label>
                        <input
                            type="date"
                            id="leadPassportExpiry"
                            value={leadPassenger.passportExpiry}
                            onChange={(e) => handleLeadPassengerChange('passportExpiry', e.target.value)}
                            className={`form-control ${errors.lead_passportExpiry ? 'is-invalid' : ''}`}
                        />
                        {errors.lead_passportExpiry && <div className="invalid-feedback">{errors.lead_passportExpiry}</div>}
                    </div> */}
                </div>
                <hr className={styles.formDivider} />
                <p className={styles.formSectionNote}>
                    This information will be used for all booking confirmations and
                    communications. Ensure that the name matches travel documents.
                </p>
            </div>

            {/* Other Passengers */}
            {passengers.length > 0 && (
                <div className={styles.sectionCard}>
                    <h5 className={styles.formSectionTitle}>Other Passengers</h5>
                    {passengers.map((passenger, index) => (
                        <div key={passenger.id} className="mb-4">
                            <div className="row">
                                <div className="col-12 d-flex justify-content-between align-items-center mb-3">
                                    <h6 className={styles.passengerTitle}>
                                        Passenger {index + 2}{' '}
                                        <span className={styles.passengerBadge}>{getPassengerTypeLabel(passenger.type)}</span>
                                    </h6>
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Title <span className="text-danger">*</span></label>
                                    <select
                                        value={passenger.title}
                                        onChange={(e) => handlePassengerChange(passenger.id, 'title', e.target.value)}
                                        className={`form-select ${errors[`passenger_${passenger.id}_title`] ? 'is-invalid' : ''}`}
                                    >
                                        <option value="">Select</option>
                                        <option value="MR">Mr</option>
                                        <option value="MRS">Mrs</option>
                                        <option value="MISS">Miss</option>
                                        <option value="DR">Dr</option>
                                    </select>
                                    {errors[`passenger_${passenger.id}_title`] && <div className="invalid-feedback">{errors[`passenger_${passenger.id}_title`]}</div>}
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>First Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        value={passenger.firstName}
                                        onChange={(e) => handlePassengerChange(passenger.id, 'firstName', e.target.value)}
                                        placeholder="First Name"
                                        className={`form-control ${errors[`passenger_${passenger.id}_firstName`] ? 'is-invalid' : ''}`}
                                    />
                                    {errors[`passenger_${passenger.id}_firstName`] && <div className="invalid-feedback">{errors[`passenger_${passenger.id}_firstName`]}</div>}
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Last Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        value={passenger.lastName}
                                        onChange={(e) => handlePassengerChange(passenger.id, 'lastName', e.target.value)}
                                        placeholder="Last Name"
                                        className={`form-control ${errors[`passenger_${passenger.id}_lastName`] ? 'is-invalid' : ''}`}
                                    />
                                    {errors[`passenger_${passenger.id}_lastName`] && <div className="invalid-feedback">{errors[`passenger_${passenger.id}_lastName`]}</div>}
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Email</label>
                                    <input
                                        type="text"
                                        value={passenger.email}
                                        onChange={(e) => handlePassengerChange(passenger.id, 'email', e.target.value)}
                                        placeholder="Email"
                                        className={`form-control ${errors[`passenger_${passenger.id}_email`] ? 'is-invalid' : ''}`}
                                    />
                                    {errors[`passenger_${passenger.id}_email`] && <div className="invalid-feedback">{errors[`passenger_${passenger.id}_email`]}</div>}
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Date of Birth <span className="text-danger">*</span></label>
                                    <DateInput
                                        maxDate={new Date()}
                                        placeholder="DD-MM-YYYY"
                                        valueFormat="DD-MM-YYYY"
                                        clearable="true"
                                        error={errors[`passenger_${passenger.id}_dob`]}
                                        value={passenger.dob}
                                        onChange={(date) => handlePassengerChange(passenger.id, 'dob', date)}
                                    />
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Gender <span className="text-danger">*</span></label>
                                    <div className="">
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name={`gender_${passenger.id}`}
                                                id={`male_${passenger.id}`}
                                                value="male"
                                                checked={passenger.gender === 'male'}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'gender', e.target.value)}
                                            />
                                            <label className="form-check-label" htmlFor={`male_${passenger.id}`}>Male</label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name={`gender_${passenger.id}`}
                                                id={`female_${passenger.id}`}
                                                value="female"
                                                checked={passenger.gender === 'female'}
                                                onChange={(e) => handlePassengerChange(passenger.id, 'gender', e.target.value)}
                                            />
                                            <label className="form-check-label" htmlFor={`female_${passenger.id}`}>Female</label>
                                        </div>
                                    </div>
                                    {errors[`passenger_${passenger.id}_gender`] && <div className="text-danger small">{errors[`passenger_${passenger.id}_gender`]}</div>}
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Country <span className="text-danger">*</span></label>
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
                                    />
                                </div>
                                <div className="col-12 col-md-6 mb-3">
                                    <label>Phone Number</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light">
                                            {passenger.phoneCode || "+"}
                                        </span>
                                        <input
                                            type="tel"
                                            name={`passenger_${passenger.id}_phone`}
                                            value={passenger.phone}
                                            onChange={(e) => handlePassengerChange(passenger.id, 'phone', e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.ctrlKey || e.metaKey || e.altKey) return;
                                                if (
                                                    !/[0-9+]/.test(e.key) &&
                                                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className={`form-control ${errors[`passenger_${passenger.id}_phone`] ? "is-invalid" : ""}`}
                                            placeholder="3001234567"
                                            autoComplete="tel"
                                            inputMode="tel"
                                        />
                                    </div>
                                    {errors[`passenger_${passenger.id}_phone`] && <div className="invalid-feedback d-block">{errors[`passenger_${passenger.id}_phone`]}</div>}
                                </div>
                            </div>
                            {index < passengers.length - 1 && <hr />}
                        </div>
                    ))}
                </div>
            )}
            <div className={styles.importantInfoBox}>
                <h4 className={styles.importantInfoTitle}>Important Information</h4>
                <ul className={styles.importantInfoList}>
                    <li>Please ensure all travelers carry valid passports and visas (if required) throughout the journey.</li>
                    <li>Hotel check-in and check-out times are subject to the hotel’s policy. Early check-in or late check-out is not guaranteed.</li>
                    <li>Flight schedules are subject to airline confirmation and may change. Please reconfirm timings 24 hours before departure.</li>
                    <li>Baggage allowance and onboard services depend on airline rules and selected fare.</li>
                    <li>Airport transfers and other included services operate as per the confirmed itinerary only.</li>
                    <li>Any additional services not mentioned in the package itinerary will be charged separately.</li>
                    <li>This booking is confirmed electronically; no physical documents are required except valid travel IDs.</li>
                </ul>
            </div>
            <div className="form-check mt-4">
                <input
                    className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`}
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
                <label className="form-check-label" htmlFor="terms">
                    I agree to the <Link href="/terms-and-conditions" target='_blank'>terms and conditions</Link>. <span className="text-danger">*</span>
                </label>
                {errors.terms && <div className="text-danger small mt-1">{errors.terms}</div>}
            </div>
            <div className="d-grid mt-4">
                <button onClick={handleSubmit} type="submit" className="btn btn-success">Confirm Booking</button>
            </div>
        </div>
    )
}
