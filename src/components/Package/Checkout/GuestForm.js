'use client'
import React, { useState, useEffect } from 'react'
import { Select } from "@mantine/core";
import { buildCountryOptions, resolvePhoneAutofill, matchCountryOption, applyCountrySelection } from '@/util/phoneAutofill';
import { TiDeleteOutline } from "react-icons/ti";
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import PackageBookingLoader from '@/components/Loader/PackageBookingLoader';
import { useCurrency } from '@/util/currency';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import LeadDetail from '@/components/LeadDetail/LeadDetail';
import Autocomplete from "react-google-autocomplete";
import Link from 'next/link';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { FaUser, FaUserPlus } from 'react-icons/fa';
import { DUPLICATE_NAME_MESSAGE, findDuplicateNameIndices } from '@/util/guestNameValidation';
import styles from './GuestForm.module.css';

export default function GuestForm({ packageDetail, servicesTotal, selectedServices, expandedRooms, withoutBedTotal }) {
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const { currency, rates } = useCurrency();
    const [totalPersons, setTotalPersons] = useState({ adults: 0, children: 0, infants: 0 });
    const [otherGuestDetail, setOtherGuestDetail] = useState([]);
    const [otherGuestError, setOtherGuestError] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaderError, setLoaderError] = useState("");
    const [confirmStatus, setConfirmStatus] = useState("pending"); // "pending" | "booking" | "payment" | "success" | "error"
    const [bookingFor, setBookingFor] = useState('self'); // self | other
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
    });
    useEffect(() => {
        const totals = packageDetail?.selected_rooms ? packageDetail?.selected_rooms.reduce(
            (acc, item) => {
                acc.adults += Number(item.adults);
                acc.children += Number(item.children);
                acc.infants += Number(item.infants);
                return acc;
            },
            { adults: 0, children: 0, infants: 0 }
        ) : [{ adults: 0, children: 0, infants: 0 }];
        const updatedTotals = {
            ...totals,
            adults: Math.max(totals.adults - 1, 0)
        };

        setTotalPersons(updatedTotals);
    }, [packageDetail]);
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
        const totalAllowed = totalPersons?.adults + totalPersons?.children + totalPersons?.infants;
        const currentAdults = otherGuestDetail.filter(g => g.type === 'AD').length;
        const currentChildren = otherGuestDetail.filter(g => g.type === 'CH').length;
        const currentInfant = otherGuestDetail.filter(g => g.type === 'IN').length;
        if (otherGuestDetail.length >= totalAllowed) {
            return;
        }
        setOtherGuestError([])
        if (currentAdults < totalPersons?.adults) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', gender: 'male', type: 'AD' }]);
        } else if (currentChildren < totalPersons?.children) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', gender: 'male', type: 'CH' }]);
        } else if (currentInfant < totalPersons?.infants) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', gender: 'male', type: 'IN' }]);
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
        if (!validateForm()) return;
        setConfirmStatus("pending");
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConfirmStatus("validate");
        var NewOtherPassenger = {};
        if (otherGuestDetail.length > 0) {
            NewOtherPassenger = convertPassengers(otherGuestDetail);
        }

        // Calculate currency conversion
        const packageCurrency = packageDetail?.currency_code || 'GBP';
        const grandTotal = Number(packageDetail?.total_amount) + servicesTotal;

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

        const updatedRooms = expandedRooms.map(({ adultsWB, childrenWB, infantsWB, ...rest }) => ({
            ...rest,
            adults_without_bed: adultsWB,
            children_without_bed: childrenWB,
            infants_without_bed: infantsWB
        }));
        const request = {
            package_id: packageDetail?.id,
            lead_title: formData?.title,
            lead_first_name: formData?.firstName,
            lead_last_name: formData?.lastName,
            lead_email: formData?.email,
            lead_address: formData?.address,
            lead_country: formData?.country,
            lead_phone_code: formData?.phoneCode,
            lead_phone: formData?.phone,
            lead_gender: formData?.gender,
            other_passengers: NewOtherPassenger,
            special_request: formData.requests,
            customer_currency: customerCurrency,
            customer_exchange_rate: customerExchangeRate,
            customer_total_after_discount: customerTotalAfterDiscount,
            room_selections: expandedRooms?.length ? updatedRooms : (packageDetail?.selected_rooms || []),
            additional_services: selectedServices || [],

            grand_total_after_discount: customerTotalAfterDiscount
        };
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/packages/booking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(request),
            });
            const response = await res.json();
            if (response?.Success) {
                await new Promise(resolve => setTimeout(resolve, 800));
                setConfirmStatus("reserve");
                await handlePayment(response?.Content);
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
    const handlePayment = async (data) => {
        const domain = window.location.origin;
        const checkoutUrl = window.location;
        const request = {
            'booking_reference': data?.booking?.booking_reference,
            'success_url': `${domain}/${packageDetail?.category?.slug}/voucher/${data?.booking?.booking_reference}`,
            'cancel_url': `${checkoutUrl}`
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/packages/payment/checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'ngrok-skip-browser-warning': 'true', 
                },
                body: JSON.stringify(request),
            });
            const response = await res.json();
            if (response?.Success) {
                setConfirmStatus("payment");
                setTimeout(() => {
                    setLoading(false);
                    router.push(response?.Content?.checkout_url);
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
    const convertPassengers = (list) => {
        const result = {
            additional_adults: [],
            children_details: [],
            infants_details: [],
        };

        let adultIndex = 2;  // adult count starts from 2
        let childIndex = 1;  // child starts from 1
        let infantIndex = 1; // infant starts from 1

        list.forEach((item) => {
            const formatted = {
                index: null,
                gender: item.gender,
                last_name: item.lastName,
                first_name: item.firstName,
            };

            if (item.type === "AD") {
                formatted.index = adultIndex++;
                result.additional_adults.push(formatted);
            }

            if (item.type === "CH") {
                formatted.index = childIndex++;
                result.children_details.push(formatted);
            }

            if (item.type === "IN") {
                formatted.index = infantIndex++;
                result.infants_details.push(formatted);
            }
        });

        return result;
    };

    return (
        <div className={`package-guest-form ${styles.formWrapper}`}>
            <LeadDetail setFormData={setFormData} />
            {loading && (
                <PackageBookingLoader
                    errorMessage={loaderError}
                    showLoader={loading}
                    onComplete={handleLoaderComplete}
                    confirmStatus={confirmStatus}
                    componentName="Package"
                />
            )}

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
                            <label htmlFor="pkgFirstName" className={styles.label}>First Name</label>
                            <input
                                id="pkgFirstName"
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                                placeholder="First Name"
                                autoComplete="given-name"
                            />
                            {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="pkgLastName" className={styles.label}>Last Name</label>
                            <input
                                id="pkgLastName"
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                                placeholder="Last Name"
                                autoComplete="family-name"
                            />
                            {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
                        </div>

                        <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                            <label htmlFor="pkgEmail" className={styles.label}>Email Address</label>
                            <input
                                id="pkgEmail"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Select Country</label>
                            <Select
                                placeholder="United Kingdom"
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
                                className={styles.mantineSelect}
                                error={errors.country || undefined}
                            />
                            {errors.country && <p className={styles.errorText}>{errors.country}</p>}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="pkgCity" className={styles.label}>City</label>
                            <Autocomplete
                                id="pkgCity"
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                placeholder="London"
                                className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                onPlaceSelected={handlePlaceSelected}
                                options={{
                                    types: ["(cities)"],
                                }}
                            />
                            {errors.address && <p className={styles.errorText}>{errors.address}</p>}
                        </div>

                        <div className={styles.phoneRow}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="pkgPhoneCode" className={styles.label}>Code</label>
                                <input
                                    id="pkgPhoneCode"
                                    type="text"
                                    name="phoneCode"
                                    value={formData.phoneCode}
                                    onChange={handleChange}
                                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                                    placeholder="+1"
                                    inputMode="tel"
                                    autoComplete="tel-country-code"
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="pkgPhone" className={styles.label}>Phone Number</label>
                                <input
                                    id="pkgPhone"
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
                                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                                    placeholder="Enter Phone Number..."
                                    autoComplete="tel"
                                    inputMode="tel"
                                />
                                {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                            </div>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="pkgTitle" className={styles.label}>Title</label>
                            <select
                                id="pkgTitle"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
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
                            <label className={styles.label}>Gender</label>
                            <div className={styles.genderGroup}>
                                <div className="form-check form-check-inline mb-0">
                                    <input
                                        className="form-check-input"
                                        checked={formData.gender === "male"}
                                        type="radio"
                                        onChange={handleChange}
                                        name="gender"
                                        id="leadRadio1"
                                        value="male"
                                    />
                                    <label className="form-check-label" htmlFor="leadRadio1">Male</label>
                                </div>
                                <div className="form-check form-check-inline mb-0">
                                    <input
                                        className="form-check-input"
                                        checked={formData.gender === "female"}
                                        type="radio"
                                        onChange={handleChange}
                                        name="gender"
                                        id="leadRadio2"
                                        value="female"
                                    />
                                    <label className="form-check-label" htmlFor="leadRadio2">Female</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className={styles.note}>
                        This information will be used for booking confirmations. Ensure the name matches travel documents.
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
                        disabled={
                            otherGuestDetail.length >=
                            (totalPersons?.adults || 0) + (totalPersons?.children || 0) + (totalPersons?.infants || 0)
                        }
                    >
                        + Add Guest
                    </button>
                </div>

                {otherGuestDetail.length > 0 && (
                    <div className={styles.guestList}>
                        {otherGuestDetail.map((item, index) => (
                            <div key={index} className={styles.guestItem}>
                                <div className={styles.guestItemHeader}>
                                    <h3 className={styles.guestItemTitle}>
                                        Guest {index + 2}
                                        {(item.type === 'CH' || item.type === 'IN') && (
                                            <span className={styles.guestTypeBadge}>
                                                {item.type === 'CH' ? 'Child' : 'Infant'}
                                            </span>
                                        )}
                                    </h3>
                                    <button
                                        type="button"
                                        className={styles.guestRemoveBtn}
                                        onClick={() => handleGuestRemove(index)}
                                        aria-label={`Remove guest ${index + 2}`}
                                    >
                                        <TiDeleteOutline size={20} />
                                    </button>
                                </div>

                                <div className={styles.guestFields}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor={`guestFirst_${index}`}>
                                            First Name
                                        </label>
                                        <input
                                            id={`guestFirst_${index}`}
                                            type="text"
                                            name="firstName"
                                            onChange={(e) => handleGuestChange(e, index)}
                                            value={item.firstName}
                                            placeholder="First Name"
                                            className={`${styles.input} ${otherGuestError[index]?.firstName ? styles.inputError : ''}`}
                                        />
                                        {otherGuestError[index]?.firstName && (
                                            <p className={styles.errorText}>{otherGuestError[index]?.firstName}</p>
                                        )}
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label} htmlFor={`guestLast_${index}`}>
                                            Last Name
                                        </label>
                                        <input
                                            id={`guestLast_${index}`}
                                            type="text"
                                            name="lastName"
                                            onChange={(e) => handleGuestChange(e, index)}
                                            value={item.lastName}
                                            placeholder="Last Name"
                                            className={`${styles.input} ${otherGuestError[index]?.lastName ? styles.inputError : ''}`}
                                        />
                                        {otherGuestError[index]?.lastName && (
                                            <p className={styles.errorText}>{otherGuestError[index]?.lastName}</p>
                                        )}
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>Gender</label>
                                        <div className={styles.genderGroup}>
                                            <div className="form-check form-check-inline mb-0">
                                                <input
                                                    className="form-check-input"
                                                    checked={item.gender === "male"}
                                                    type="radio"
                                                    onChange={(e) => handleGuestChange(e, index)}
                                                    name={`gender_${index}`}
                                                    id={`male_${index}`}
                                                    value="male"
                                                />
                                                <label className="form-check-label" htmlFor={`male_${index}`}>Male</label>
                                            </div>
                                            <div className="form-check form-check-inline mb-0">
                                                <input
                                                    className="form-check-input"
                                                    checked={item.gender === "female"}
                                                    type="radio"
                                                    onChange={(e) => handleGuestChange(e, index)}
                                                    name={`gender_${index}`}
                                                    id={`female_${index}`}
                                                    value="female"
                                                />
                                                <label className="form-check-label" htmlFor={`female_${index}`}>Female</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Special Requests */}
            <div className={styles.specialCard}>
                <div className={styles.specialHeader}>
                    <h2 className={styles.specialTitle}>Special Requests</h2>
                    <p className={styles.specialSubtitle}>
                        List any operational requirements — child seats, oversized luggage, preferred cabin temperature.
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
                <div className={`form-check ${styles.termsCheck}`}>
                    <input
                        className={`form-check-input ${errors.terms ? "is-invalid" : ""}`}
                        type="checkbox"
                        name="terms"
                        id="terms"
                        checked={formData.terms}
                        onChange={handleChange}
                    />
                    <label className={`form-check-label ${styles.termsLabel}`} htmlFor="terms">
                        I agree to the{' '}
                        <Link target="_blank" href="/terms-and-conditions" className={styles.termsLink}>
                            terms and conditions
                        </Link>
                        . <span className={styles.termsRequired}>*</span>
                    </label>
                </div>
                {errors.terms && (
                    <p className={styles.errorText}>{errors.terms}</p>
                )}
            </div>

            <button
                onClick={handleCheckout}
                type="button"
                disabled={loading}
                className={styles.confirmBtn}
            >
                {loading ? (
                    'Processing...'
                ) : (
                    <>
                        Confirm &amp; Pay{' '}
                        <PriceDisplay
                            price={Number(packageDetail?.total_amount || 0) + Number(servicesTotal || 0)}
                            currency={packageDetail?.currency_code}
                        />
                    </>
                )}
            </button>
        </div>
    )
}
