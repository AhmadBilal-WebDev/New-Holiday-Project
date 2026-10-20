"use client";

import React, { useState, useEffect } from "react";
import { Select } from "@mantine/core";
import { buildCountryOptions, resolvePhoneAutofill, matchCountryOption, applyCountrySelection } from "@/util/phoneAutofill";
import { DUPLICATE_NAME_MESSAGE, findDuplicateNameIndices } from "@/util/guestNameValidation";
import PackageBookingLoader from "@/components/Loader/PackageBookingLoader";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { TiDeleteOutline } from "react-icons/ti";
import { BiLock } from "react-icons/bi";
import { BsBank, BsCheckCircleFill } from "react-icons/bs";
import { FaUser, FaUserPlus } from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import LeadDetail from '@/components/LeadDetail/LeadDetail';
import Link from "next/link";
import moment from "moment";
import { ConvertPrice } from "@/components/Currency/ConvertPrice";
import PriceDisplay from "@/components/Currency/PriceDisplay";
import styles from "./CheckoutForm.module.css";

export default function CheckoutForm({ data, currency, rates }) {
    const [bookingFor, setBookingFor] = useState("self"); // self | other
    const [showLoader, setShowLoader] = useState(false);
    const [loaderError, setLoaderError] = useState("");
    const [currencyKey, setCurrencyKey] = useState("");
    const [otherGuestDetail, setOtherGuestDetail] = useState([]);
    const [otherGuestError, setOtherGuestError] = useState([]);
    const [roomOnRequest, setRoomOnRequest] = useState(false);
    const [confirmStatus, setConfirmStatus] = useState("pending");
    const [searchData, setSearchData] = useState({});
    const [paymentMethod, setPaymentMethod] = useState("card");
    const router = useRouter();
    console.log("Checkout Data:", data);
    useEffect(() => {
        if (!data?.rooms) return;
        const totals = data?.rooms ? data?.rooms.reduce(
            (acc, room) => {
                room.rates.forEach(rate => {
                    acc.adults += rate.adults || 0;
                    acc.children += rate.children || 0;
                });
                return acc;
            },
            { adults: 0, children: 0 }
        ) : [];
        const adjustedTotals = {
            ...totals,
            adults: Math.max(totals.adults - 1, 0),
        };
        setSearchData(adjustedTotals);
        const isAnyRoomOnRequest = data.rooms.some(room =>
            room.rates.some(rate => rate.on_request === true)
        );
        setRoomOnRequest(isAnyRoomOnRequest);
    }, [data]);

    useEffect(() => {
        const callCurrencyAPI = async () => {
            if (!data?.hotel_code) return;
            var APiCurrency = currency;
            if (Object.keys(rates).length === 1) {
                APiCurrency = data?.currency;
            }
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/checkout/currency`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: data?.hotel_code,
                        type: "hotel",
                        display_currency: APiCurrency,
                        model_currency: data?.currency,
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
    }, [currency, data]);
    // ---- Create country list array ----
    const countryOptions = buildCountryOptions();

    // ---- Form state ----
    const [formData, setFormData] = useState({
        title: "",
        firstName: "",
        lastName: "",
        email: "",
        country: "",
        phoneCode: "",
        phone: "",
        requests: "",
        cardNumber: "",
        expiry: "",
        cvv: "",
        terms: false,
    });

    // ---- Validation errors ----
    const [errors, setErrors] = useState({});

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
    // ---- Submit handler ----
    const handleCheckout = async () => {
        if (!validateForm()) return;
        setLoaderError("");
        setConfirmStatus("pending");
        setShowLoader(true);

        // Wait for first two steps (2 seconds each)
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConfirmStatus("validate");

        const otherAdults = otherGuestDetail.filter(item => item.type === 'AD');
        const childAges = (data?.request?.rooms || []).flatMap((room) => room?.children || []).map((child) => child?.age);
        const otherChilds = otherGuestDetail
            .filter(item => item.type === 'CH')
            .map((item, index) => ({
                ...item,
                age: childAges[index],
            }));
        let selectedPaymentMethod = 'stripe';
        if (paymentMethod === 'bank') {
            selectedPaymentMethod = 'bank_transfer';
        }
        // Calculate currency conversion
        const hotelCurrency = data?.currency;
        const grandTotal = Number(data?.total_net);

        let customerCurrency = currency;
        let customerExchangeRate = 1;
        let customerTotalAfterDiscount = grandTotal;
        if (currency !== hotelCurrency && rates[hotelCurrency] && rates[currency]) {
            const conversion = ConvertPrice(data?.total_net, data?.currency, currency, rates);
            customerCurrency = conversion.newcurrency;
            customerTotalAfterDiscount = parseFloat(conversion.newprice);

            // Calculate exchange rate
            customerExchangeRate = (rates[currency] / rates[hotelCurrency]);
        } else {
            customerCurrency = hotelCurrency;
            customerExchangeRate = 1;
            customerTotalAfterDiscount = grandTotal;
        }
        // Now make the API call
        const domain = window.location.origin;
        const checkoutUrl = window.location;
        const request = {
            "provider": data?.provider,
            "currency_uuid": currencyKey,
            "holder_title": formData?.title,
            "holder_email": formData?.email,
            "checkIn": data?.check_in,
            "checkOut": data?.check_out,
            "holder_phone": formData?.phoneCode + formData?.phone,
            "holder_country": formData?.country,
            "remark": formData?.requests,
            "otherAdults": otherAdults,
            "otherChilds": otherChilds,
            "payment_method": selectedPaymentMethod,
            "holder": {
                "name": formData.firstName,
                "surname": formData.lastName,
            },
            "rooms": data.rooms.map(item => ({
                code: item.code,
                name: item.name,
                status: item.status,
                rates: item.rates.map(rate => ({
                    rate_key: rate.rate_key,
                    rate_type: rate.rate_type,
                    prebook_id: item?.metadata?.prebook_id || '',
                    rate_id: item?.metadata?.rate_id || '',
                    adults: rate.adults,
                    children: rate.children,
                    rooms: rate.rooms,
                })),
            })),
            "clientReference": `ref_${Date.now()}`,
            "currency": data?.currency,
            "booking_amount": data?.total_net,
            "converted_price": customerTotalAfterDiscount,
            "exchange_rate": customerExchangeRate,
            "converted_currency": customerCurrency,
            "success_url": `${domain}/hotels/voucher`,
            "cancel_url": `${checkoutUrl}`,

            "check_rates_request": {
                "data": data,
            }
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/create-booking`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'ngrok-skip-browser-warning': 'true', 
                },
                body: JSON.stringify(request),
            });
            const response = await res.json();
            if (response?.success) {
                setConfirmStatus("reserve");
                if (roomOnRequest || selectedPaymentMethod === 'bank_transfer') {
                    setShowLoader(false);
                    router.push(`/hotels/voucher/${response?.data?.invoice_number}`);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 800));
                setConfirmStatus("payment");
                setTimeout(() => {
                    setShowLoader(false);
                    router.push(`${response?.data?.checkout_url}`);
                }, 800);
            } else {
                setLoaderError(response?.error?.message || "Booking failed. Please try again.");
                setConfirmStatus("error");
                setTimeout(() => {
                    setShowLoader(false);
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
            setTimeout(() => setShowLoader(false), 1000);
        }
    };
    const handleGuestAdd = () => {
        const totalAllowed = searchData?.adults + searchData?.children;
        const currentAdults = otherGuestDetail.filter(g => g.type === 'AD').length;
        const currentChildren = otherGuestDetail.filter(g => g.type === 'CH').length;
        if (otherGuestDetail.length >= totalAllowed) {
            return;
        }
        setOtherGuestError([])
        if (currentAdults < searchData?.adults) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', type: 'AD' }]);
        } else if (currentChildren < searchData?.children) {
            setOtherGuestDetail([...otherGuestDetail, { firstName: '', lastName: '', type: 'CH' }]);
        }

    };
    const handleGuestRemove = (index) => {
        const updatedGuests = otherGuestDetail.filter((_, i) => i !== index);
        setOtherGuestDetail(updatedGuests);
    };
    const handleGuestChange = (e, index) => {
        const { name, value } = e.target;
        const updatedGuests = [...otherGuestDetail];
        updatedGuests[index][name] = value;
        setOtherGuestDetail(updatedGuests);

        const updatedErrors = [...otherGuestError];
        if (updatedErrors[index]?.[name]) {
            updatedErrors[index][name] = "";
            setOtherGuestError(updatedErrors);
        }
    };
    const handleLoaderComplete = () => {

    }
    const totalAllowedGuests = (searchData?.adults || 0) + (searchData?.children || 0);
    const canAddGuest = otherGuestDetail.length < totalAllowedGuests;
    const showBankTransfer =
        moment(data?.check_in).isAfter(moment().add(3, "days")) && data?.provider === "custom";

    return (
        <div className={styles.formWrapper}>
            <LeadDetail setFormData={setFormData} />
            {showLoader && (
                <PackageBookingLoader
                    errorMessage={loaderError}
                    showLoader={showLoader}
                    onComplete={handleLoaderComplete}
                    confirmStatus={confirmStatus}
                    componentName="Room"
                />
            )}

            <div className={styles.welcomeCard}>
                <h2 className={styles.welcomeTitle}>Who Are We Welcoming?</h2>
                <div className={styles.welcomeOptions} role="radiogroup" aria-label="Who are we welcoming">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={bookingFor === "self"}
                        className={`${styles.welcomeOption} ${bookingFor === "self" ? styles.welcomeOptionActive : ""}`}
                        onClick={() => setBookingFor("self")}
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
                        aria-checked={bookingFor === "other"}
                        className={`${styles.welcomeOption} ${bookingFor === "other" ? styles.welcomeOptionActive : ""}`}
                        onClick={() => setBookingFor("other")}
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
                            <label htmlFor="title" className={styles.label}>
                                Title <span className={styles.required}>*</span>
                            </label>
                            <select
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`${styles.select} ${errors.title ? `is-invalid ${styles.inputError}` : ""}`}
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
                            <label htmlFor="firstName" className={styles.label}>
                                First Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.firstName ? `is-invalid ${styles.inputError}` : ""}`}
                                placeholder="First Name"
                                autoComplete="off"
                            />
                            {errors.firstName && <p className={styles.errorText}>{errors.firstName}</p>}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="lastName" className={styles.label}>
                                Last Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.lastName ? `is-invalid ${styles.inputError}` : ""}`}
                                placeholder="Last Name"
                                autoComplete="off"
                            />
                            {errors.lastName && <p className={styles.errorText}>{errors.lastName}</p>}
                        </div>

                        <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                            <label htmlFor="email" className={styles.label}>
                                Email Address <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.email ? `is-invalid ${styles.inputError}` : ""}`}
                                placeholder="you@example.com"
                                autoComplete="off"
                            />
                            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="country" className={styles.label}>
                                Select Country <span className={styles.required}>*</span>
                            </label>
                            <Select
                                id="country"
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
                            <label htmlFor="phone" className={styles.label}>
                                Phone Number <span className={styles.required}>*</span>
                            </label>
                            <div className={`${styles.phoneGroup} ${errors.phone ? styles.phoneGroupError : ""}`}>
                                <span className={styles.phonePrefix}>
                                    {formData.phoneCode || "+__"}
                                </span>
                                <input
                                    type="tel"
                                    id="phone"
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
                                    className={`${styles.input} ${styles.phoneInput} ${errors.phone ? "is-invalid" : ""}`}
                                    placeholder="Phone Number"
                                    autoComplete="tel"
                                    inputMode="tel"
                                />
                            </div>
                            {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                        </div>
                    </div>
                </section>
            </div>

            {(canAddGuest || otherGuestDetail.length > 0) && (
                <div className={styles.formCard}>
                    <div className={styles.guestSection}>
                        <div className={styles.guestSectionHeader}>
                            <div>
                                <h2 className={`${styles.sectionTitle} ${styles.sectionTitleDark}`}>Other Guests</h2>
                                <p className={styles.sectionDesc}>
                                    Add details for additional guests staying in the room.
                                </p>
                            </div>
                            {canAddGuest && (
                                <button
                                    type="button"
                                    onClick={handleGuestAdd}
                                    className={styles.addGuestBtn}
                                >
                                    + Add Guest
                                </button>
                            )}
                        </div>

                        {otherGuestDetail.map((item, index) => (
                            <div key={index} className={styles.guestBlock}>
                                <div className={styles.guestHeader}>
                                    <div className={styles.guestTitleRow}>
                                        <h3 className={styles.guestTitle}>Guest {index + 2}</h3>
                                        {item.type === 'CH' && (
                                            <span className={styles.guestBadge}>Child</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleGuestRemove(index)}
                                        className={styles.removeGuestBtn}
                                        aria-label={`Remove guest ${index + 2}`}
                                    >
                                        <TiDeleteOutline size={20} />
                                    </button>
                                </div>

                                <div className={styles.fieldGrid}>
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
                                            className={`${styles.input} ${otherGuestError[index]?.firstName ? `is-invalid ${styles.inputError}` : ""}`}
                                        />
                                        {otherGuestError[index]?.firstName && (
                                            <p className={styles.errorText}>{otherGuestError[index].firstName}</p>
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
                                            className={`${styles.input} ${otherGuestError[index]?.lastName ? `is-invalid ${styles.inputError}` : ""}`}
                                        />
                                        {otherGuestError[index]?.lastName && (
                                            <p className={styles.errorText}>{otherGuestError[index].lastName}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.payCard}>
                <h2 className={styles.payTitle}>
                    <BiLock className={styles.payTitleIcon} aria-hidden="true" />
                    Secure Payment Method
                </h2>
                <p className={styles.paySubtitle}>Select your preferred payment method</p>

                {roomOnRequest ? (
                    <div className={styles.payOnRequest}>
                        An On Request room is not instantly confirmed and requires approval from the hotel before the booking can be finalized. This means the availability and price are subject to confirmation at the time of request, and the room may not be guaranteed immediately. For this reason, payment cannot be processed during checkout. Once the booking is confirmed, you will be notified and can proceed with the payment to secure your reservation.
                    </div>
                ) : (
                    <div className={styles.payOptions}>
                        {showBankTransfer && (
                            <div
                                className={`${styles.payOption} ${paymentMethod === "bank" ? styles.payOptionActive : ""}`}
                                onClick={() => setPaymentMethod("bank")}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") setPaymentMethod("bank");
                                }}
                            >
                                <div className={styles.payRadio}>
                                    <span className={styles.payRadioDot} />
                                </div>
                                <div className={styles.payOptionBody}>
                                    <div className={styles.payOptionLabel}>Bank Transfer</div>
                                    <div className={styles.payOptionDesc}>Direct deposit to our account</div>
                                </div>
                            </div>
                        )}

                        <div
                            className={`${styles.payOption} ${paymentMethod === "card" ? styles.payOptionActive : ""} ${showBankTransfer ? "" : styles.fieldGroupFull}`}
                            onClick={() => setPaymentMethod("card")}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setPaymentMethod("card");
                            }}
                            style={showBankTransfer ? undefined : { gridColumn: "1 / -1" }}
                        >
                            <div className={styles.payRadio}>
                                <span className={styles.payRadioDot} />
                            </div>
                            <div className={styles.payOptionBody}>
                                <div className={styles.payOptionLabel}>Credit / Debit Card</div>
                                <div className={styles.payOptionDesc}>Visa, Mastercard, Amex &amp; more</div>
                                <div className={styles.payBrands}>
                                    <span className={styles.payBrand}>VISA</span>
                                    <span className={styles.payBrand}>MC</span>
                                    <span className={styles.payBrand}>AMEX</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {paymentMethod === "card" && !roomOnRequest && (
                    <div className={styles.payContent}>
                        <div className={styles.payStripeBar}>
                            <div className={styles.payStripeLeft}>
                                <BiLock size={16} />
                                Secured &amp; powered by <strong>Stripe</strong>
                            </div>
                            <div className={styles.payTrustBadges}>
                                <span className={styles.payBadge}><BsCheckCircleFill size={11} /> 256-bit</span>
                                <span className={styles.payBadge}><BsCheckCircleFill size={11} /> SSL/PCI DSS Compliant</span>
                                <span className={styles.payBadge}><BsCheckCircleFill size={11} /> 3D Secure</span>
                            </div>
                        </div>
                    </div>
                )}

                {paymentMethod === "bank" && !roomOnRequest && (
                    <div className={styles.payContent}>
                        <div className={styles.payBankCard}>
                            <div className={styles.payBankHeader}>
                                <BsBank size={18} />
                                <h6>Our Bank Account Details</h6>
                            </div>
                            <div className={styles.payBankRows}>
                                <div className={styles.payBankRow}>
                                    <span className={styles.payBankKey}>Account Title</span>
                                    <span className={styles.payBankVal}>Al Hijaz Tours Ltd</span>
                                </div>
                                <div className={styles.payBankRow}>
                                    <span className={styles.payBankKey}>Account Number</span>
                                    <span className={styles.payBankVal}>58516868</span>
                                </div>
                                <div className={styles.payBankRow}>
                                    <span className={styles.payBankKey}>Sort Code</span>
                                    <span className={styles.payBankVal}>309950</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.payBankNote}>
                            <MdVerified size={15} />
                            <span>
                                After completing the bank transfer, please send the payment receipt to
                                {" "}<strong>info@alhijaztours.net</strong> with your booking reference.
                                Your booking will be confirmed within <strong>24 hours</strong> of payment verification.
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.formCard}>
                <section className={styles.section}>
                    <h2 className={`${styles.sectionTitle} ${styles.sectionTitleDark}`}>Special Requests</h2>
                    <p className={`${styles.sectionDesc}`} style={{ marginBottom: "0.85rem" }}>
                        Special requests cannot be guaranteed – but the property will do its best to meet your needs.
                    </p>
                    <div className={styles.fieldGroup}>
                        <label htmlFor="requests" className={styles.label}>
                            Please write your requests in English (optional)
                        </label>
                        <textarea
                            id="requests"
                            className={styles.textarea}
                            rows={5}
                            name="requests"
                            value={formData.requests}
                            onChange={handleChange}
                            placeholder="Write any special requests here..."
                        />
                    </div>
                </section>
            </div>

            <div className={styles.footer}>
                <div className={styles.termsRow}>
                    <input
                        className={`${styles.termsCheckbox} ${errors.terms ? "is-invalid" : ""}`}
                        type="checkbox"
                        id="terms"
                        name="terms"
                        checked={formData.terms}
                        onChange={handleChange}
                    />
                    <label className={styles.termsLabel} htmlFor="terms">
                        I agree to the{" "}
                        <Link href="/terms-and-conditions" target="_blank" className={styles.termsLink}>
                            terms and conditions
                        </Link>
                        . <span className={styles.required}>*</span>
                    </label>
                </div>
                {errors.terms && <p className={styles.errorText}>{errors.terms}</p>}

                <button
                    onClick={handleCheckout}
                    type="button"
                    className={styles.submitBtn}
                >
                    {data?.total_net != null ? (
                        <>
                            Pay <PriceDisplay price={data.total_net} currency={data?.currency} />
                        </>
                    ) : (
                        "Confirm Booking"
                    )}
                </button>
            </div>
        </div>
    );
}

