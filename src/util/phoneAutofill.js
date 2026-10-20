import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { countryListLocal } from '@/util/CountryList';

/** Build Mantine Select options with dial code + ISO country code for autofill matching. */
export function buildCountryOptions() {
    return countryListLocal.item.map((item) => ({
        label: item.name.common,
        value: item.name.common,
        cca2: item.cca2,
        code:
            item.idd?.root && item.idd?.suffixes?.length
                ? item.idd.root + item.idd.suffixes[0]
                : item.idd?.root,
    }));
}

/** Match a browser-autofilled country name to an option. */
export function matchCountryOption(rawName, countryOptions) {
    if (!rawName || !countryOptions?.length) return null;
    const normalized = String(rawName).trim().toLowerCase();
    if (!normalized) return null;

    return (
        countryOptions.find((c) => c.value.toLowerCase() === normalized) ||
        countryOptions.find((c) => c.label.toLowerCase() === normalized) ||
        countryOptions.find((c) => normalized.includes(c.value.toLowerCase())) ||
        countryOptions.find((c) => c.value.toLowerCase().includes(normalized)) ||
        null
    );
}

/** Apply a country selection and strip dial-code digits already stuck in the phone field. */
export function applyCountrySelection(countryValue, countryOptions, currentPhone = '') {
    const selected =
        matchCountryOption(countryValue, countryOptions) ||
        countryOptions?.find((c) => c.value === countryValue) ||
        null;

    if (!selected) {
        return {
            country: countryValue || '',
            phoneCode: '',
            phone: String(currentPhone || '').replace(/\D/g, ''),
            code: '',
        };
    }

    let phone = String(currentPhone || '').replace(/\D/g, '');
    const codeDigits = String(selected.code || '').replace(/\D/g, '');
    if (codeDigits && phone.startsWith(codeDigits) && phone.length > codeDigits.length + 3) {
        phone = phone.slice(codeDigits.length);
    }

    return {
        country: selected.value,
        phoneCode: selected.code || '',
        phone,
        code: selected.cca2 || '',
    };
}


/**
 * Split an autofilled / pasted phone into country + dial code + national number.
 * Handles values like "+441234567890", "441234567890", or national digits only.
 */
export function resolvePhoneAutofill(rawValue, countryOptions, hints = {}) {
    const { country: currentCountry = '', phoneCode: currentPhoneCode = '' } = hints;
    const cleaned = String(rawValue ?? '').trim();

    if (!cleaned) {
        return { phone: '' };
    }

    const hasPlus = cleaned.includes('+');
    const digitsOnly = cleaned.replace(/\D/g, '');

    if (!digitsOnly) {
        return { phone: '' };
    }

    const currentCodeDigits = String(currentPhoneCode || '').replace(/\D/g, '');

    // Already selected dial code — strip it if the value includes the full international number
    if (currentCodeDigits && digitsOnly.startsWith(currentCodeDigits) && digitsOnly.length > currentCodeDigits.length + 3) {
        return {
            country: currentCountry || undefined,
            phoneCode: currentPhoneCode.startsWith('+') ? currentPhoneCode : `+${currentCodeDigits}`,
            phone: digitsOnly.slice(currentCodeDigits.length),
        };
    }

    // Parse international numbers (autofill usually dumps code + national into one field)
    const shouldParse =
        hasPlus ||
        (!currentPhoneCode && digitsOnly.length >= 10) ||
        (currentCodeDigits && digitsOnly.startsWith(currentCodeDigits));

    if (shouldParse) {
        const candidates = [];
        if (hasPlus) {
            candidates.push(cleaned.replace(/[^\d+]/g, ''));
        }
        candidates.push(`+${digitsOnly}`);

        const currentOpt = countryOptions?.find((c) => c.value === currentCountry);
        if (currentOpt?.cca2) {
            candidates.push(digitsOnly);
        }

        for (const candidate of candidates) {
            const parsed =
                candidate === digitsOnly && currentOpt?.cca2
                    ? parsePhoneNumberFromString(digitsOnly, currentOpt.cca2)
                    : parsePhoneNumberFromString(candidate);

            if (!parsed?.countryCallingCode || !parsed?.nationalNumber) continue;

            // Avoid treating short local typing as an international parse
            if (!hasPlus && currentPhoneCode && digitsOnly.length <= parsed.nationalNumber.length + 1) {
                continue;
            }

            const dial = `+${parsed.countryCallingCode}`;
            const byIso = parsed.country
                ? countryOptions?.find((c) => c.cca2 === parsed.country)
                : null;
            const byDial = countryOptions?.find((c) => c.code === dial);
            const keepCurrent =
                currentCountry &&
                countryOptions?.find((c) => c.value === currentCountry)?.code === dial
                    ? countryOptions.find((c) => c.value === currentCountry)
                    : null;

            const matched = keepCurrent || byIso || byDial;

            return {
                country: matched?.value || currentCountry || undefined,
                phoneCode: dial,
                phone: parsed.nationalNumber,
                code: matched?.cca2 || undefined,
            };
        }
    }

    return { phone: digitsOnly };
}
