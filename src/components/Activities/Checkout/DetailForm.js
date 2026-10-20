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
import { FaUser, FaUserPlus, FaCreditCard } from 'react-icons/fa';
import { BiLock } from 'react-icons/bi';
import { BsCheckCircleFill } from 'react-icons/bs';
import Link from 'next/link';
import Autocomplete from "react-google-autocomplete";
import LeadDetail from '@/components/LeadDetail/LeadDetail';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { DUPLICATE_NAME_MESSAGE, findDuplicateNameIndices } from '@/util/guestNameValidation';
import styles from './DetailForm.module.css';

function formatAgeRange(ageFrom, ageTo) {
    if (ageFrom == null && ageTo == null) return '';
    const to = ageTo != null && Number(ageTo) >= 999 ? '99+' : ageTo;
    if (ageFrom != null && to != null) return `(${ageFrom}-${to})`;
    if (ageFrom != null) return `(${ageFrom}+)`;
    return '';
}

function buildGuestFromPax(pax, type) {
    return {
        firstName: '',
        lastName: '',
        gender: 'male',
        type,
        ageFrom: pax?.ageFrom ?? null,
        ageTo: pax?.ageTo ?? null,
        paxType: pax?.paxType || null,
    };
}

/** Sum line totals from modality selected_pax for given pax types. */
function sumSelectedPaxTotal(activityDetail, paxTypes) {
    const selectedPax = activityDetail?.modality?.selected_pax;
    if (!Array.isArray(selectedPax) || selectedPax.length === 0) return null;
    return selectedPax.reduce((sum, pax) => {
        if (!paxTypes.includes(pax.paxType)) return sum;
        return sum + Number(pax.quantity || 0) * Number(pax.amount || 0);
    }, 0);
}

function getAdultPrice(activityDetail) {
    const fromPax = sumSelectedPaxTotal(activityDetail, ['ADULT', 'SENIOR']);
    if (fromPax != null) return fromPax.toFixed(2);
    return (Number(activityDetail?.adults) * Number(activityDetail?.price_per_adult)).toFixed(2);
}

function getChildPrice(activityDetail) {
    const fromPax = sumSelectedPaxTotal(activityDetail, ['CHILD', 'INFANT']);
    if (fromPax != null) return fromPax.toFixed(2);
    return (Number(activityDetail?.children) * Number(activityDetail?.price_per_child)).toFixed(2);
}

/** Use ageTo for API (0–3 → 3, 4–12 → 12). */
function resolveChildAge(ageTo, ageFrom) {
    if (ageTo != null && Number(ageTo) < 999) return Number(ageTo);
    if (ageFrom != null) return Number(ageFrom);
    return 0;
}

/**
 * Build children_details from selected_pax quantities.
 * Names come from optional guest form entries; age always from the band's upper limit.
 */
function buildChildrenDetails(activityDetail, otherGuestDetail = []) {
    const selectedPax = activityDetail?.modality?.selected_pax;
    const enteredChildren = (otherGuestDetail || []).filter(
        (g) => g.type === 'CH' || g.type === 'IN'
    );
    const details = [];

    if (Array.isArray(selectedPax) && selectedPax.length > 0) {
        for (const pax of selectedPax) {
            if (pax.paxType !== 'CHILD' && pax.paxType !== 'INFANT') continue;
            const qty = Number(pax.quantity || 0);
            const age = resolveChildAge(pax.ageTo, pax.ageFrom);
            for (let i = 0; i < qty; i++) {
                const matchIdx = enteredChildren.findIndex(
                    (g) => g.ageFrom === pax.ageFrom && g.ageTo === pax.ageTo
                );
                let first_name = '';
                let last_name = '';
                if (matchIdx >= 0) {
                    const guest = enteredChildren.splice(matchIdx, 1)[0];
                    first_name = guest.firstName?.trim() || '';
                    last_name = guest.lastName?.trim() || '';
                }
                details.push({ age, first_name, last_name });
            }
        }
        return details;
    }

    const childrenCount = Number(activityDetail?.children || 0);
    for (let i = 0; i < childrenCount; i++) {
        const guest = enteredChildren[i];
        details.push({
            age: resolveChildAge(guest?.ageTo, guest?.ageFrom),
            first_name: guest?.firstName?.trim() || '',
            last_name: guest?.lastName?.trim() || '',
        });
    }
    return details;
}

/** Next child/infant age band still needing a guest slot. */
function getNextPaxSlot(activityDetail, otherGuestDetail, guestType) {
    const selectedPax = activityDetail?.modality?.selected_pax;
    if (!Array.isArray(selectedPax) || !selectedPax.length) {
        return { firstName: '', lastName: '', gender: 'male', type: guestType, ageFrom: null, ageTo: null };
    }

    const targetPaxTypes =
        guestType === 'CH' ? ['CHILD'] :
            guestType === 'IN' ? ['INFANT'] :
                ['ADULT', 'SENIOR'];

    for (const pax of selectedPax) {
        if (!targetPaxTypes.includes(pax.paxType)) continue;
        const needed = Number(pax.quantity || 0);
        const used = otherGuestDetail.filter(
            (g) =>
                g.type === guestType &&
                g.ageFrom === pax.ageFrom &&
                g.ageTo === pax.ageTo
        ).length;
        // Lead adult already accounts for one adult outside otherGuestDetail
        const leadOffset =
            guestType === 'AD' && (pax.paxType === 'ADULT' || pax.paxType === 'SENIOR')
                ? (selectedPax.findIndex(
                    (p) => p.paxType === 'ADULT' || p.paxType === 'SENIOR'
                ) === selectedPax.indexOf(pax)
                    ? 1
                    : 0)
                : 0;
        if (used + leadOffset < needed) {
            return buildGuestFromPax(pax, guestType);
        }
    }

    return { firstName: '', lastName: '', gender: 'male', type: guestType, ageFrom: null, ageTo: null };
}

export default function DetailForm({ activityDetail }) {
    // console.log(activityDetail)
    const [errors, setErrors] = useState({});
    const router = useRouter();
    const { currency, rates } = useCurrency();
    const [totalPersons, setTotalPersons] = useState({ adults: 0, children: 0 });
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
    });
    const [questionAnswers, setQuestionAnswers] = useState({});
    const [bookingFor, setBookingFor] = useState('self'); // self | other

    const activityQuestions = Array.isArray(activityDetail?.questions)
        ? activityDetail.questions
        : [];
    const LEAD_DERIVED_QUESTION_CODES = ['LEAD_NAME', 'PHONENUMBER', 'EMAILCONTACTO', 'TLFCONTACTO'];

    const isLeadDerivedQuestion = (code) => LEAD_DERIVED_QUESTION_CODES.includes(String(code || '').toUpperCase());

    const getLeadDerivedAnswer = (code) => {
        switch (String(code || '').toUpperCase()) {
            case 'LEAD_NAME':
                return [formData.title, formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();
            case 'PHONENUMBER':
            case 'TLFCONTACTO':
                return `${formData.phoneCode || ''}${formData.phone || ''}`.replace(/\s+/g, '').trim();
            case 'EMAILCONTACTO':
                return (formData.email || '').trim();
            default:
                return '';
        }
    };

    const visibleQuestions = activityQuestions.filter((q) => !isLeadDerivedQuestion(q?.code));

    const buildQuestionAnswersPayload = () => {
        return activityQuestions
            .filter((q) => q?.code)
            .map((q) => {
                const code = q.code;
                const answer = isLeadDerivedQuestion(code)
                    ? getLeadDerivedAnswer(code)
                    : String(questionAnswers[code] || '').trim();
                return { code, answer };
            });
    };
    useEffect(() => {
        setTotalPersons({
            adults: Math.max((activityDetail?.adults || 0) - 1, 0),
            children: activityDetail?.children || 0,
        });
        // Additional travelers are optional — start empty; user adds via "Add New Guest"
        setOtherGuestDetail([]);
        setOtherGuestError([]);

        const initialAnswers = {};
        (Array.isArray(activityDetail?.questions) ? activityDetail.questions : []).forEach((q) => {
            if (!q?.code || isLeadDerivedQuestion(q.code)) return;
            initialAnswers[q.code] = '';
        });
        setQuestionAnswers(initialAnswers);
    }, [activityDetail]);

    useEffect(() => {
        const callCurrencyAPI = async () => {
            if (!activityDetail?.id) return;
            var APiCurrency = currency;
            if (Object.keys(rates).length === 1) {
                APiCurrency = activityDetail?.currency;
            }
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/checkout/currency`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model_id: activityDetail?.id,
                        type: "activity",
                        display_currency: APiCurrency,
                        model_currency: activityDetail?.currency,
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
    }, [currency, activityDetail]);

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

        visibleQuestions.forEach((q) => {
            if (!q?.code) return;
            const isRequired = q.required !== false;
            if (isRequired && !String(questionAnswers[q.code] || '').trim()) {
                newErrors[`question_${q.code}`] = 'This field is required.';
            }
        });

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
            setOtherGuestDetail([
                ...otherGuestDetail,
                getNextPaxSlot(activityDetail, otherGuestDetail, 'AD'),
            ]);
        } else if (currentChildren < totalPersons?.children) {
            setOtherGuestDetail([
                ...otherGuestDetail,
                getNextPaxSlot(activityDetail, otherGuestDetail, 'CH'),
            ]);
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

    const handleQuestionChange = (code, value) => {
        setQuestionAnswers((prev) => ({
            ...prev,
            [code]: value,
        }));
        const errorKey = `question_${code}`;
        if (errors[errorKey]) {
            setErrors((prev) => {
                const updated = { ...prev };
                delete updated[errorKey];
                return updated;
            });
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
        const packageCurrency = activityDetail?.currency;
        const grandTotal = Number(activityDetail?.grand_total);

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

        const request = {
            activity_id: activityDetail?.id,
            currency_uuid: currencyKey,
            special_request: formData.requests,
            lead_title: formData?.title,
            lead_first_name: formData?.firstName,
            lead_last_name: formData?.lastName,
            lead_email: formData?.email,
            lead_address: formData?.address,
            lead_country: formData?.country,
            lead_phone_code: formData?.phoneCode,
            lead_phone: formData?.phone,
            lead_gender: formData?.gender,
            travel_date: activityDetail?.travel_date,
            adults: activityDetail?.adults,
            adult_price: getAdultPrice(activityDetail),
            children: activityDetail?.children,
            child_price: getChildPrice(activityDetail),
            grand_total: grandTotal,
            other_passengers: NewOtherPassenger,
            customer_currency: customerCurrency,
            customer_exchange_rate: customerExchangeRate,
            customer_total: customerTotalAfterDiscount,
            additional_services: activityDetail?.selected_services || [],
            provider: activityDetail.provider,
            payment_method: 'stripe',
            language: activityDetail?.modality?.language?.code || '',
            modality_code: activityDetail?.modality.code,
            rate_key: activityDetail?.modality.rate_key,
            children_details: buildChildrenDetails(activityDetail, otherGuestDetail),
            question_answers: buildQuestionAnswersPayload(),
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/booking`, {
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
            'success_url': `${domain}/activities/voucher/${data?.booking?.booking_reference}`,
            'cancel_url': `${checkoutUrl}`
        }
        localStorage.setItem('lead_details_fill', JSON.stringify(formData));
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/payment/checkout`, {
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
        };

        let adultIndex = 2;  // adult count starts from 2
        let childIndex = 1;  // child starts from 1

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
        });

        return result;
    };

    const totalAllowedGuests = (totalPersons?.adults || 0) + (totalPersons?.children || 0);
    const canAddGuest = otherGuestDetail.length < totalAllowedGuests;

    return (
        <div className={`${styles.formWrapper} activity-guest-form`}>
            <LeadDetail setFormData={setFormData} />
            {loading && (
                <PackageBookingLoader
                    errorMessage={loaderError}
                    showLoader={loading}
                    onComplete={handleLoaderComplete}
                    confirmStatus={confirmStatus}
                    componentName="Activity"
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
                            <label htmlFor="title" className={styles.label}>
                                Title <span className={styles.required}>*</span>
                            </label>
                            <select
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={`${styles.select} ${errors.title ? `is-invalid ${styles.inputError}` : ''}`}
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
                            <label className={styles.label}>Gender <span className={styles.required}>*</span></label>
                            <div className={styles.genderRow}>
                                <label className={styles.genderOption} htmlFor="leadRadio1">
                                    <input
                                        checked={formData.gender === 'male'}
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
                                        checked={formData.gender === 'female'}
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
                                className={`${styles.input} ${errors.firstName ? `is-invalid ${styles.inputError}` : ''}`}
                                placeholder="Jane"
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
                                className={`${styles.input} ${errors.lastName ? `is-invalid ${styles.inputError}` : ''}`}
                                placeholder="Smith"
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
                                className={`${styles.input} ${errors.email ? `is-invalid ${styles.inputError}` : ''}`}
                                placeholder="jane.smith@example.com"
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
                                placeholder="United Kingdom"
                                searchable
                                data={countryOptions}
                                value={formData.country || null}
                                limit={50}
                                onChange={handleCountryChange}
                                onBlur={handleCountryAutofillBlur}
                                inputProps={{
                                    autoComplete: 'country-name',
                                    name: 'country',
                                }}
                                error={errors.country}
                                classNames={{ root: styles.selectInput }}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="address" className={styles.label}>
                                City / Address <span className={styles.required}>*</span>
                            </label>
                            <Autocomplete
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                placeholder="London"
                                className={`${styles.input} ${errors.address ? `is-invalid ${styles.inputError}` : ''}`}
                                name="address"
                                id="address"
                                value={formData.address}
                                onChange={handleChange}
                                onPlaceSelected={handlePlaceSelected}
                                options={{
                                    types: ['geocode', 'establishment'],
                                }}
                            />
                            {errors.address && <p className={styles.errorText}>{errors.address}</p>}
                        </div>

                        <div className={`${styles.fieldGroup} ${styles.codeField}`}>
                            <label htmlFor="phoneCode" className={styles.label}>
                                Code <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                id="phoneCode"
                                name="phoneCode"
                                value={formData.phoneCode || ''}
                                readOnly
                                className={styles.input}
                                placeholder="+1"
                                tabIndex={-1}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label htmlFor="phone" className={styles.label}>
                                Phone Number <span className={styles.required}>*</span>
                            </label>
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
                                className={`${styles.input} ${errors.phone ? `is-invalid ${styles.inputError}` : ''}`}
                                placeholder="Enter Phone Number..."
                                autoComplete="tel"
                                inputMode="tel"
                            />
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
                                    Add details for additional guests travelling with you.
                                </p>
                            </div>
                            {canAddGuest && (
                                <button type="button" onClick={handleGuestAdd} className={styles.addGuestBtn}>
                                    + Add Guest
                                </button>
                            )}
                        </div>

                        {otherGuestDetail.length === 0 && (
                            <p className={styles.sectionDesc}>
                                You can add remaining adults and children travelling with you.
                            </p>
                        )}

                        {otherGuestDetail.map((item, index) => {
                            const ageLabel = formatAgeRange(item.ageFrom, item.ageTo);
                            return (
                                <div key={index} className={styles.guestBlock}>
                                    <div className={styles.guestHeader}>
                                        <div className={styles.guestTitleRow}>
                                            <h3 className={styles.guestTitle}>Guest {index + 2}</h3>
                                            {(item.type === 'CH' || item.type === 'IN') && (
                                                <span className={styles.guestBadge}>
                                                    {item.type === 'CH' ? 'Child' : 'Infant'}
                                                    {ageLabel ? ` ${ageLabel}` : ''}
                                                </span>
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
                                                className={`${styles.input} ${otherGuestError[index]?.firstName ? `is-invalid ${styles.inputError}` : ''}`}
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
                                                className={`${styles.input} ${otherGuestError[index]?.lastName ? `is-invalid ${styles.inputError}` : ''}`}
                                            />
                                            {otherGuestError[index]?.lastName && (
                                                <p className={styles.errorText}>{otherGuestError[index].lastName}</p>
                                            )}
                                        </div>
                                        <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                                            <label className={styles.label}>Gender</label>
                                            <div className={styles.genderRow}>
                                                <label className={styles.genderOption} htmlFor={`male_${index}`}>
                                                    <input
                                                        className=""
                                                        checked={item.gender === 'male'}
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
                                                        checked={item.gender === 'female'}
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
                            );
                        })}
                    </div>
                </div>
            )}

            {visibleQuestions.length > 0 && (
                <div className={styles.formCard}>
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Additional Details</h2>
                            <p className={styles.sectionDesc}>
                                Please provide the required information for this activity
                            </p>
                        </div>
                        <div className={styles.fieldGrid}>
                            {visibleQuestions.map((question) => {
                                const code = question.code;
                                const isRequired = question.required !== false;
                                const errorKey = `question_${code}`;
                                return (
                                    <div key={code} className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            {question.text || code}
                                            {isRequired ? <span className={styles.required}> *</span> : ''}
                                        </label>
                                        <input
                                            type="text"
                                            className={`${styles.input} ${errors[errorKey] ? `is-invalid ${styles.inputError}` : ''}`}
                                            value={questionAnswers[code] || ''}
                                            onChange={(e) => handleQuestionChange(code, e.target.value)}
                                            placeholder={question.text || code}
                                            autoComplete="off"
                                        />
                                        {errors[errorKey] && (
                                            <p className={styles.errorText}>{errors[errorKey]}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}


            <div className={styles.formCard}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleDark}`}>Special Requests</h2>
                        <p className={styles.sectionDesc}>
                            List any operational requirements — child seats, oversized luggage, preferred timing.
                        </p>
                    </div>
                    <div className={styles.fieldGroup}>
                        <textarea
                            id="requests"
                            className={styles.textarea}
                            rows={5}
                            name="requests"
                            value={formData.requests}
                            onChange={handleChange}
                            placeholder="Write your customized request here..."
                        />
                    </div>
                </section>
            </div>

            <div className={styles.payCard}>
                <h2 className={styles.payTitle}>
                    <BiLock className={styles.payTitleIcon} aria-hidden="true" />
                    Secure Payment Method
                </h2>
                <p className={styles.paySubtitle}>Pay safely with your debit or credit card</p>

                <div
                    className={`${styles.payOption} ${styles.payOptionActive}`}
                    style={{ gridColumn: '1 / -1' }}
                    role="radio"
                    aria-checked="true"
                >
                    <div className={styles.payOptionRow}>
                        <div className={styles.payOptionLeft}>
                            <span className={styles.payMethodIcon} aria-hidden="true">
                                <FaCreditCard size={16} />
                            </span>
                            <div className={styles.payOptionBody}>
                                <div className={styles.payOptionLabel}>Credit / Debit Card</div>
                                <div className={styles.payOptionDesc}>Visa · MC · Amex</div>
                            </div>
                        </div>
                        <div className={styles.payBrands}>
                            <span className={styles.payBrand}>VISA</span>
                            <span className={styles.payBrand}>MC</span>
                            <span className={styles.payBrand}>AMEX</span>
                        </div>
                    </div>
                </div>

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
            </div>

            <div className={styles.footer}>
                <div className={styles.termsPill}>
                    <input
                        className={`${styles.termsCheckbox} ${errors.terms ? 'is-invalid' : ''}`}
                        type="checkbox"
                        id="terms"
                        name="terms"
                        checked={formData.terms}
                        onChange={handleChange}
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

                <button
                    onClick={handleCheckout}
                    type="button"
                    className={styles.submitBtn}
                    disabled={loading}
                >
                    {loading ? (
                        'Processing...'
                    ) : activityDetail?.grand_total != null ? (
                        <>
                            Pay <PriceDisplay price={activityDetail.grand_total} currency={activityDetail?.currency} />
                        </>
                    ) : (
                        'Confirm & Pay Securely'
                    )}
                </button>
            </div>
        </div>
    )
}
