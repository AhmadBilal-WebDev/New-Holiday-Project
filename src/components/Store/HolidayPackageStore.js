"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConvertPrice } from "@/components/Currency/ConvertPrice";
import { resolveTransferSearchLocation } from "@/util/resolveTransferSearchLocation";
import { getRateOccupancy } from "@/components/Hotels/HotelDetail/RoomSelection/getRateOccupancy";

const emptyPackageInfo = () => ({
  package_id: '',
  currency: '',
  hotel_price: 0,
  flight_price: 0,
  transfer_price: 0,
  total_price: 0,
  price_per_person: 0,
  total_travelers: 0,
  total_nights: 0,
  savings: 0,
});

/** Convert a money field. `converted: false` when rates are missing (do not relabel currency). */
const convertMoneyField = (amount, fromCurrency, toCurrency, rates = {}) => {
  const num = Number(amount) || 0;
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
    return { amount: Number(num.toFixed(2)), converted: true };
  }
  if (!rates?.[fromCurrency] || !rates?.[toCurrency]) {
    return { amount: Number(num.toFixed(2)), converted: false };
  }
  const { newprice, newcurrency } = ConvertPrice(
    num,
    fromCurrency,
    toCurrency,
    rates
  );
  if (newcurrency !== toCurrency) {
    return { amount: Number(num.toFixed(2)), converted: false };
  }
  return {
    amount: Number(parseFloat(Number(newprice || 0).toFixed(2))),
    converted: true,
  };
};

/** Convert selected flight pricing into package/client currency (package mode only). */
const convertFlightPricingForPackage = (flight, packageCurrency, rates = {}) => {
  if (!flight?.pricing || !packageCurrency) return flight;

  const pricing = flight.pricing;
  // Always convert from true original when present (fixes earlier mislabeled SAR amounts)
  const fromCurrency = pricing.original_currency || pricing.currency;
  const sourceTotal =
    pricing.original_amount != null && pricing.original_currency
      ? Number(pricing.original_amount)
      : Number(pricing.total_amount) || 0;

  if (!fromCurrency || fromCurrency === packageCurrency) {
    return {
      ...flight,
      pricing: {
        ...pricing,
        total_amount: String(Number(sourceTotal.toFixed(2))),
        currency: packageCurrency,
        original_amount: Number(pricing.original_amount ?? pricing.total_amount) || 0,
        original_currency: pricing.original_currency || fromCurrency || packageCurrency,
      },
    };
  }

  const totalResult = convertMoneyField(
    sourceTotal,
    fromCurrency,
    packageCurrency,
    rates
  );
  // Rates missing — keep original amounts/currency; never fake client currency label
  if (!totalResult.converted) {
    return flight;
  }

  const nextPricing = {
    ...pricing,
    total_amount: String(totalResult.amount),
    currency: packageCurrency,
    original_amount: sourceTotal,
    original_currency: fromCurrency,
  };

  const sourceBase =
    pricing.original_base_amount != null
      ? pricing.original_base_amount
      : pricing.original_currency
        ? null
        : pricing.base_amount;
  const sourceTax =
    pricing.original_tax_amount != null
      ? pricing.original_tax_amount
      : pricing.original_currency
        ? null
        : pricing.tax_amount;

  // Prefer converting raw originals; if only converted fields exist, scale from total ratio
  if (sourceBase != null && sourceBase !== "") {
    const baseResult = convertMoneyField(
      sourceBase,
      fromCurrency,
      packageCurrency,
      rates
    );
    if (baseResult.converted) {
      nextPricing.base_amount = String(baseResult.amount);
      nextPricing.original_base_amount = Number(sourceBase) || 0;
    }
  } else if (pricing.base_amount != null && pricing.base_amount !== "" && sourceTotal) {
    const ratio = totalResult.amount / sourceTotal;
    nextPricing.base_amount = String(
      Number((Number(pricing.base_amount) * ratio).toFixed(2))
    );
  }

  if (sourceTax != null && sourceTax !== "") {
    const taxResult = convertMoneyField(
      sourceTax,
      fromCurrency,
      packageCurrency,
      rates
    );
    if (taxResult.converted) {
      nextPricing.tax_amount = String(taxResult.amount);
      nextPricing.original_tax_amount = Number(sourceTax) || 0;
    }
  } else if (pricing.tax_amount != null && pricing.tax_amount !== "" && sourceTotal) {
    const ratio = totalResult.amount / sourceTotal;
    nextPricing.tax_amount = String(
      Number((Number(pricing.tax_amount) * ratio).toFixed(2))
    );
  }

  return {
    ...flight,
    pricing: nextPricing,
  };
};

/** Convert only selected transfer fare into package currency (package mode only). */
const convertTransferPricingForPackage = (transfer, packageCurrency, rates = {}) => {
  if (!transfer || !packageCurrency) return transfer;

  const fromCurrency = transfer.original_currency || transfer.currency;
  const rawFare =
    transfer.original_price != null && transfer.original_currency
      ? Number(transfer.original_price)
      : Number(transfer.origin_fare ?? transfer.fare) || 0;

  // Strip listing UI FX fields — cart uses client/package currency only
  const {
    convertedPrice: _convertedPrice,
    convertedCurrency: _convertedCurrency,
    ...transferBase
  } = transfer;

  if (!fromCurrency || fromCurrency === packageCurrency) {
    return {
      ...transferBase,
      fare: rawFare,
      price: rawFare,
      display_price: rawFare,
      currency: packageCurrency,
      selected_currency: packageCurrency,
      client_currency: transfer.client_currency || packageCurrency,
      original_price: Number(transfer.original_price ?? transfer.origin_fare ?? transfer.fare) || 0,
      original_currency: transfer.original_currency || fromCurrency || packageCurrency,
      origin_fare: transfer.origin_fare ?? rawFare,
    };
  }

  const fareResult = convertMoneyField(
    rawFare,
    fromCurrency,
    packageCurrency,
    rates
  );
  if (!fareResult.converted) {
    return transferBase;
  }

  return {
    ...transferBase,
    fare: fareResult.amount,
    currency: packageCurrency,
    price: fareResult.amount,
    display_price: fareResult.amount,
    selected_currency: packageCurrency,
    client_currency: transfer.client_currency || packageCurrency,
    original_price: rawFare,
    original_currency: fromCurrency,
    origin_fare: transfer.origin_fare ?? rawFare,
  };
};

/** True when package is flight + transfer only (no hotel) — needs client-side cart. */
export const isFlightTransferOnlyPackage = (selectedServices) =>
  !!selectedServices?.flight &&
  !!selectedServices?.transfer &&
  !selectedServices?.hotel;

const toLocString = (value) =>
  value == null || value === "" ? null : String(value);

const toPackageAmount = (amount, fromCurrency, packageCurrency, rates = {}) => {
  const num = Number(amount) || 0;
  if (!fromCurrency || !packageCurrency || fromCurrency === packageCurrency) {
    return Number(num.toFixed(2));
  }
  const result = convertMoneyField(num, fromCurrency, packageCurrency, rates);
  // If rates missing, keep original numeric amount (caller should not relabel currency)
  return result.amount;
};

/** Build selectedHotelRooms for cart — price/currency in package currency; original_* from service. */
const buildSelectedHotelRoomsForCart = (
  hotelSelection,
  packageCurrency,
  rates = {}
) => {
  const hotelData = hotelSelection?.hotelData || hotelSelection;
  const selectedRoom = hotelSelection?.selectedRoom || [];
  const rooms = hotelData?.rooms || [];
  if (!rooms.length) return null;

  const selectedRooms = Array.isArray(selectedRoom) && selectedRoom.length
    ? selectedRoom
    : null;

  // Package hotels often keep original FX on hotel.metadata (e.g. EUR) while rate.price is package currency
  const hotelOriginalCurrency =
    hotelData?.metadata?.original_currency || null;

  const out = [];

  rooms.forEach((room) => {
    (room?.rates || []).forEach((rate) => {
      const selectedMatch = selectedRooms
        ? selectedRooms.find((s) => {
            if (s.ratekey !== rate.rate_key) return false;
            if (s.roomTypeId != null && s.roomTypeId !== "") {
              return (
                String(rate?.metadata?.room_type_id || "") ===
                String(s.roomTypeId)
              );
            }
            return true;
          })
        : rate?.is_selected || rate?.selected_for_package || rate?.price_added_to_package
          ? { qty: 1 }
          : null;

      if (!selectedMatch && selectedRooms) return;
      if (
        !selectedMatch &&
        !rate?.is_selected &&
        !rate?.selected_for_package &&
        !rate?.price_added_to_package
      ) {
        return;
      }

      const qty = Number(selectedMatch?.qty || 1);
      // rate.price is already in package currency on listing packages
      const packageUnitPrice = Number(rate.price) || 0;
      const rateCurrency = rate.currency || packageCurrency;
      const convertedUnit = toPackageAmount(
        packageUnitPrice,
        rateCurrency,
        packageCurrency,
        rates
      );
      const convertedTotal = Number((convertedUnit * qty).toFixed(2));
      const meta = rate.metadata || {};
      const serviceOriginalPrice =
        meta.original_price != null
          ? Number(meta.original_price)
          : packageUnitPrice;
      const serviceOriginalCurrency =
        meta.original_currency ||
        hotelOriginalCurrency ||
        rateCurrency;

      out.push({
        rateKey: rate.rate_key,
        quantity: qty,
        price: convertedTotal,
        currency: packageCurrency,
        displayPrice: convertedTotal,
        displayCurrency: packageCurrency,
        roomType: room.name || rate.room_type || "",
        boardName: rate.board_name || "",
        adults: selectedMatch?.adults ?? rate.adults ?? 1,
        children: Array.isArray(selectedMatch?.children)
          ? selectedMatch.children.length
          : Number(selectedMatch?.children ?? rate.children ?? 0),
        metadata: {
          ...meta,
          original_price: serviceOriginalPrice,
          original_currency: serviceOriginalCurrency,
        },
        roomTypeId:
          selectedMatch?.roomTypeId ||
          meta.room_type_id ||
          room.id ||
          "",
        boardTypeId:
          selectedMatch?.boardTypeId || meta.board_type_id || null,
      });
    });
  });

  return out.length ? out : null;
};

const buildCartHotelContext = (hotelSelection, searchData = {}, packageCurrency) => {
  if (!hotelSelection) return null;
  const hotelData = hotelSelection.hotelData || hotelSelection;
  const mainDates = searchData.dates || {};
  const hotelSearch = searchData.hotel || {};
  const location = hotelData.location || {};
  const hotelId =
    hotelData.hotel_code ||
    hotelData.provider_code ||
    hotelData.id ||
    null;

  // Prefer selected rate search_request dates when hotel object has no checkIn/checkOut
  const selectedRate =
    (hotelData.rooms || [])
      .flatMap((room) => room?.rates || [])
      .find(
        (rate) =>
          rate?.is_selected ||
          rate?.selected_for_package ||
          rate?.price_added_to_package
      ) || null;
  const rateSearch = selectedRate?.metadata?.search_request || {};

  return {
    id: hotelId,
    name: hotelData.hotel_name || hotelData.name || "",
    provider: hotelData.provider || null,
    city:
      hotelData.city ||
      location.city ||
      location.destination_name ||
      hotelSearch.city ||
      null,
    address:
      hotelData.address ||
      location.address ||
      location.zone_name ||
      hotelSearch.location ||
      location.destination_name ||
      null,
    checkIn:
      hotelData.checkIn ||
      rateSearch.checkIn ||
      hotelSearch.dates?.checkIn ||
      hotelSearch.dates?.check_in ||
      mainDates.checkIn ||
      null,
    checkOut:
      hotelData.checkOut ||
      rateSearch.checkOut ||
      hotelSearch.dates?.checkOut ||
      hotelSearch.dates?.check_out ||
      mainDates.checkOut ||
      null,
    currency: packageCurrency,
    hotel_code: hotelId,
  };
};

const enrichTransferForCart = (
  transfer,
  searchData = {},
  selectedCurrency,
  rates = {}
) => {
  if (!transfer) return null;

  const transferSearch = searchData.transfer || {};
  const guests = searchData.totalGuests || {};
  const pickup = transferSearch.pickup || {};
  const dropoff = transferSearch.dropoff || {};
  const transferDates = transferSearch.dates || {};
  const mainDates = searchData.dates || {};
  const searchParams = transfer.searchParams || {};

  // Service original amount/currency — never use UI convertedPrice/convertedCurrency for cart
  const originalFare =
    Number(
      transfer.original_price ??
        transfer.origin_fare ??
        transfer.fare
    ) || 0;
  const originalCurrency =
    transfer.original_currency ||
    transfer.currency ||
    selectedCurrency;

  const fareResult = convertMoneyField(
    originalFare,
    originalCurrency,
    selectedCurrency,
    rates
  );
  const displayPrice = Number(
    (fareResult.converted
      ? fareResult.amount
      : originalCurrency === selectedCurrency
        ? originalFare
        : Number(transfer.fare) || originalFare
    ).toFixed(2)
  );

  const pickupLocationLabel =
    pickup.location ||
    searchParams.pickupLocation ||
    transfer?.locations?.[0]?.pickup_address ||
    "";
  const dropoffLocationLabel =
    dropoff.location ||
    searchParams.dropoffLocation ||
    transfer?.locations?.[0]?.dropoff_address ||
    "";

  // Drop listing-only FX fields from cart payload
  const {
    convertedPrice: _convertedPrice,
    convertedCurrency: _convertedCurrency,
    ...transferRest
  } = transfer;

  return {
    ...transferRest,
    // fare/price in client/package currency (e.g. SAR)
    fare: displayPrice,
    currency: selectedCurrency,
    price: displayPrice,
    display_price: displayPrice,
    selected_currency: selectedCurrency,
    client_currency: transfer.client_currency || selectedCurrency,
    original_price: originalFare,
    original_currency: originalCurrency,
    origin_fare: transfer.origin_fare ?? originalFare,
    search_criteria: {
      pickup_location: pickupLocationLabel,
      dropoff_location: dropoffLocationLabel,
      pickup_date:
        searchParams.pickupDate ||
        transferDates.pickup ||
        transferDates.check_in ||
        mainDates.checkIn ||
        null,
      pickup_time: searchParams.pickupTime || "10:00:00",
      dropoff_date:
        searchParams.dropoffDate ||
        transferDates.dropoff ||
        transferDates.check_out ||
        null,
      dropoff_time: searchParams.dropoffTime || null,
      passengers: Number(searchParams.passengers || guests.adults || 1),
      transfer_type:
        searchParams.transferType || transfer?.trip_type || "one-way",
    },
    vehicle_name:
      transfer?.vehicle_name ||
      transfer?.vehicle_details?.name ||
      transfer?.vehicle ||
      "",
    pickup_location:
      pickup.city ||
      transfer?.locations?.[0]?.pickup_city ||
      pickupLocationLabel,
    dropoff_location:
      dropoff.city ||
      transfer?.locations?.[0]?.dropoff_city ||
      dropoffLocationLabel,
  };
};

/** Resolve package currency from selected package data only (never a static default). */
const resolvePackageCurrency = ({
  packageInfo = {},
  selectedData = {},
  packagePricing = {},
  searchData = {},
} = {}) =>
  packageInfo.currency ||
  selectedData.packageInfo?.currency ||
  selectedData.flight?.pricing?.currency ||
  selectedData.flight?.total_currency ||
  selectedData.hotel?.hotelData?.currency ||
  selectedData.hotel?.currency ||
  selectedData.transfer?.selected_currency ||
  selectedData.transfer?.currency ||
  packagePricing.flightCurrency ||
  packagePricing.hotelCurrency ||
  packagePricing.transferCurrency ||
  searchData.currency ||
  null;

/**
 * Build /api/holiday-packages/cart body from selected package / store state.
 * price + currency = package currency; original_* = original service values.
 */
const buildHolidayPackageCartPayload = ({
  packageId,
  selectedServices = {},
  hotel = null,
  flight = null,
  transfer = null,
  searchData = {},
  packageInfo = {},
  packagePricing = {},
  selectedCurrency,
  rates = {},
}) => {
  const packageCurrency =
    selectedCurrency ||
    resolvePackageCurrency({ packageInfo, searchData, packagePricing }) ||
    null;

  if (!packageCurrency) {
    throw new Error("Package currency missing. Cannot build cart payload.");
  }

  const hasHotel = !!hotel;
  const hasFlight = !!flight;
  const hasTransfer = !!transfer;

  const services = [];
  if (selectedServices.hotel && hasHotel) services.push("stay");
  if (selectedServices.flight && hasFlight) services.push("flight");
  if (selectedServices.transfer && hasTransfer) services.push("car");

  const flightForCart = hasFlight
    ? convertFlightPricingForPackage(flight, packageCurrency, rates)
    : null;
  const enrichedTransfer = hasTransfer
    ? enrichTransferForCart(
        convertTransferPricingForPackage(transfer, packageCurrency, rates),
        searchData,
        packageCurrency,
        rates
      )
    : null;
  const hotelContext = selectedServices.hotel && hasHotel
    ? buildCartHotelContext(hotel, searchData, packageCurrency)
    : null;
  const selectedHotelRooms = selectedServices.hotel && hasHotel
    ? buildSelectedHotelRoomsForCart(hotel, packageCurrency, rates)
    : null;

  // Treat 0 as unset so empty packageInfo (flight+transfer) does not wipe real prices
  const hasValidInfoPrice = (value) =>
    value != null && value !== "" && Number(value) !== 0;

  const isFlightTransferOnly = isFlightTransferOnlyPackage(selectedServices);

  const resolveServicePrice = (infoPrice, pricingAmount, pricingCurrency) => {
    if (hasValidInfoPrice(infoPrice)) {
      return Number(Number(infoPrice).toFixed(2));
    }
    return toPackageAmount(
      pricingAmount,
      pricingCurrency,
      packageCurrency,
      rates
    );
  };

  const hotelPrice = resolveServicePrice(
    packageInfo.hotel_price,
    packagePricing.hotelPrice,
    packagePricing.hotelCurrency
  );
  // Flight+transfer: always use converted service amounts (ignore stale packageInfo)
  const flightPrice = isFlightTransferOnly
    ? toPackageAmount(
        flightForCart?.pricing?.total_amount,
        flightForCart?.pricing?.currency,
        packageCurrency,
        rates
      )
    : resolveServicePrice(
        hasValidInfoPrice(packageInfo.flight_price)
          ? packageInfo.flight_price
          : flightForCart?.pricing?.total_amount,
        packagePricing.flightPrice,
        packagePricing.flightCurrency
      );
  const transferPrice = isFlightTransferOnly
    ? toPackageAmount(
        enrichedTransfer?.display_price ?? enrichedTransfer?.fare,
        enrichedTransfer?.selected_currency || enrichedTransfer?.currency,
        packageCurrency,
        rates
      )
    : resolveServicePrice(
        hasValidInfoPrice(packageInfo.transfer_price)
          ? packageInfo.transfer_price
          : enrichedTransfer?.display_price,
        packagePricing.transferPrice,
        packagePricing.transferCurrency
      );

  const hotelPriceRounded = Number(Number(hotelPrice).toFixed(2));
  const flightPriceRounded = Number(Number(flightPrice).toFixed(2));
  const transferPriceRounded = Number(Number(transferPrice).toFixed(2));
  const totalPrice = Number(
    (
      (hasHotel ? hotelPriceRounded : 0) +
      (hasFlight ? flightPriceRounded : 0) +
      (hasTransfer ? transferPriceRounded : 0)
    ).toFixed(2)
  );

  const flightSearch = searchData.flight || {};
  const transferSearch = searchData.transfer || {};
  const hotelSearch = searchData.hotel || {};
  const guests = searchData.totalGuests || {};
  const rooms = searchData.rooms || [];
  const childrenAges = rooms.flatMap((r) => r.childrenAges || []);
  const fromLoc = flightSearch.fromLocation || {};
  const toLoc = flightSearch.toLocation || {};
  const pickup = transferSearch.pickup || {};
  const dropoff = transferSearch.dropoff || {};
  const transferDates = transferSearch.dates || {};
  const mainDates = searchData.dates || {};
  const searchParams = transfer?.searchParams || {};

  const adultCount = Number(guests.adults) || 1;
  const childCount = Number(guests.children) || 0;
  const infantCount = Number(guests.infants) || 0;
  const roomsFromGuests = [
    {
      adults: adultCount,
      children: childCount,
      childrenAges,
      infants: infantCount,
      infantAges: [],
    },
  ];

  const cartSearchData = {
    leavingFrom: {
      location: fromLoc.airportName || fromLoc.location || null,
      city: fromLoc.city || hotelSearch.city || null,
      countryCode: fromLoc.countryCode || hotelSearch.countryCode || null,
      latitude: fromLoc.lat ?? null,
      longitude: fromLoc.lng ?? null,
      airportCode: flightSearch.from || fromLoc.airportCode || null,
    },
    goingTo: {
      location:
        toLoc.airportName ||
        toLoc.formattedAddress ||
        toLoc.location ||
        hotelSearch.location ||
        null,
      city: toLoc.city || hotelSearch.city || null,
      countryCode: toLoc.countryCode || hotelSearch.countryCode || null,
      latitude: toLoc.lat ?? hotelSearch.lat ?? null,
      longitude: toLoc.lng ?? hotelSearch.lng ?? null,
      airportCode: flightSearch.to || toLoc.airportCode || null,
    },
    hotelDestination: hasHotel
      ? {
          city: hotelSearch.city || toLoc.city || hotelContext?.city || null,
          countryCode: hotelSearch.countryCode || toLoc.countryCode || null,
          location:
            hotelSearch.location ||
            toLoc.formattedAddress ||
            toLoc.city ||
            hotelContext?.address ||
            null,
          airport_code:
            hotelSearch.airport_code ||
            flightSearch.to ||
            toLoc.airportCode ||
            null,
          latitude: toLocString(hotelSearch.lat ?? toLoc.lat),
          longitude: toLocString(hotelSearch.lng ?? toLoc.lng),
        }
      : undefined,
    hotelDestinationLabel: hasHotel
      ? hotelSearch.location ||
        toLoc.formattedAddress ||
        toLoc.city ||
        hotelContext?.city ||
        null
      : undefined,
    stayDates: hasHotel
      ? {
          checkIn:
            hotelContext?.checkIn ||
            hotelSearch.dates?.checkIn ||
            mainDates.checkIn ||
            null,
          checkOut:
            hotelContext?.checkOut ||
            hotelSearch.dates?.checkOut ||
            mainDates.checkOut ||
            null,
        }
      : undefined,
    dates: {
      checkIn: mainDates.checkIn || null,
      checkOut: mainDates.checkOut || null,
    },
    travelers: hasHotel
      ? {
          rooms: rooms.length ? rooms : roomsFromGuests,
        }
      : {
          simple: {
            adults: adultCount,
            children: childCount,
            childrenAges,
            infantsLap: infantCount,
            infantAgesLap: [],
            infantsSeat: 0,
            infantAgesSeat: [],
          },
          rooms: roomsFromGuests,
        },
    economyClass: flightSearch.cabinClassName || "economy",
    currency: packageCurrency,
    transferPickup: hasTransfer
      ? {
          city: pickup.city || null,
          countryCode: pickup.code || pickup.countryCode || null,
          location:
            pickup.location ||
            enrichedTransfer?.search_criteria?.pickup_location ||
            null,
          latitude: toLocString(pickup.lat ?? searchParams.fromLat),
          longitude: toLocString(pickup.lng ?? searchParams.fromLng),
          airportCode: null,
        }
      : undefined,
    transferDropoff: hasTransfer
      ? {
          city: dropoff.city || null,
          countryCode: dropoff.code || dropoff.countryCode || null,
          location:
            dropoff.location ||
            enrichedTransfer?.search_criteria?.dropoff_location ||
            null,
          latitude: toLocString(dropoff.lat ?? searchParams.toLat),
          longitude: toLocString(dropoff.lng ?? searchParams.toLng),
          airportCode: null,
        }
      : undefined,
    transferDates: hasTransfer
      ? {
          checkIn:
            transferDates.check_in ||
            transferDates.pickup ||
            mainDates.checkIn ||
            null,
          checkOut:
            transferDates.check_out ||
            transferDates.dropoff ||
            mainDates.checkOut ||
            null,
        }
      : undefined,
  };

  // Drop undefined optional keys
  Object.keys(cartSearchData).forEach((key) => {
    if (cartSearchData[key] === undefined) delete cartSearchData[key];
  });

  const pricing = {
    hotel_price: hasHotel ? hotelPriceRounded : 0,
    flight_price: hasFlight ? flightPriceRounded : 0,
    transfer_price: hasTransfer ? transferPriceRounded : 0,
    total_price: totalPrice,
    currency: packageCurrency,
  };

  return {
    package_id: packageId,
    package_context: {
      packageId,
      services,
      hotel: hotelContext,
      flight: flightForCart,
      transfer: enrichedTransfer,
      searchData: cartSearchData,
      selectedHotelRooms,
      isFromPackageFlow: true,
      pricing,
      selectedCurrency: packageCurrency,
    },
    pricing,
    total_price: totalPrice,
    currency: packageCurrency,
  };
};

export const useHolidayPackageStore = create(

  persist(
    (set, get) => ({
      // Package configuration
      isActive: false,
      packageConfig: {
        selectedServices: {
          hotel: false,
          flight: false,
          transfer: false,
        },
        searchData: {},
      },

      // Selected service data
      selectedData: {
        packageInfo: emptyPackageInfo(),
        hotel: null, // { hotelData, selectedRoom, roomPrice }
        flight: null, // Flight object with price
        transfer: null, // Transfer object with price
      },

      // Package pricing
      packagePricing: {
        hotelPrice: 0,
        hotelCurrency: '',
        flightPrice: 0,
        flightCurrency: '',
        transferPrice: 0,
        transferCurrency: '',
        totalPrice: 0,
      },

      // Service order (fixed priority)
      SERVICE_ORDER: ["hotel", "flight", "transfer"],

      // ============================================
      // INITIALIZATION
      // ============================================
      initializePackage: (services, searchData) =>
        set({
          isActive: true,
          packageConfig: {
            selectedServices: services,
            searchData: searchData,
          },
          selectedData: {
            packageInfo: emptyPackageInfo(),
            hotel: null,
            flight: null,
            transfer: null,
          },
          packagePricing: {
            hotelPrice: 0,
            hotelCurrency: '',
            flightPrice: 0,
            flightCurrency: '',
            transferPrice: 0,
            transferCurrency: '',
            totalPrice: 0,
          },
        }),

      /**
       * Update package search for one service from that service's own listing search.
       * Clears that service's selection so the user picks again against the new search.
       * Does not change selectedServices (which services are in the package).
       */
      updateServiceSearchData: (serviceType, serviceSearchPatch, extras = {}) => {
        if (!get().isActive) return;
        if (!["hotel", "flight", "transfer"].includes(serviceType)) return;

        const hadSelection = !!get().selectedData?.[serviceType];

        set((state) => {
          const prevSearch = state.packageConfig.searchData || {};
          const nextSearch = {
            ...prevSearch,
            [serviceType]: {
              ...(prevSearch[serviceType] || {}),
              ...serviceSearchPatch,
            },
          };

          if (extras.totalGuests) {
            nextSearch.totalGuests = {
              ...(prevSearch.totalGuests || {}),
              ...extras.totalGuests,
            };
          }

          if (extras.dates) {
            nextSearch.dates = {
              ...(prevSearch.dates || {}),
              ...extras.dates,
            };
          }

          if (extras.rooms) {
            nextSearch.rooms = extras.rooms;
          }

          const nextSelected = hadSelection
            ? { ...state.selectedData, [serviceType]: null }
            : state.selectedData;

          const nextPricing = hadSelection
            ? {
                ...state.packagePricing,
                [`${serviceType}Price`]: 0,
                [`${serviceType}Currency`]: "",
              }
            : state.packagePricing;

          return {
            packageConfig: {
              ...state.packageConfig,
              searchData: nextSearch,
            },
            selectedData: nextSelected,
            packagePricing: nextPricing,
          };
        });

        if (hadSelection) {
          get().calculateTotalPrice();
        }
      },

      // ============================================
      // SERVICE FLOW HELPERS
      // ============================================
      getServiceFlow: () => {
        const { packageConfig, SERVICE_ORDER } = get();
        return SERVICE_ORDER.filter(
          (service) => packageConfig.selectedServices[service]
        );
      },

      getNextService: (type) => {
        const flow = get().getServiceFlow();
        const currentIndex = flow.indexOf(type);

        if (currentIndex === -1) {
          // type not in flow (e.g. "packageInfo"), return first service
          return flow.length > 0 ? flow[0] : null;
        }

        // Return the next service after the current one, or null if at end
        return currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null;
      },

      getNextRoute: (type) => {
        const nextService = get().getNextService(type);
        const { packageConfig, selectedData } = get();
        const packageId = selectedData?.packageInfo?.package_id;
        const checkoutUrl = packageId
          ? `/holiday-packages/checkout?package_id=${encodeURIComponent(packageId)}`
          : "/holiday-packages/checkout";
        if (!nextService) {
          return checkoutUrl;
        }

        // For hotel, just return the listing page (it reads from store)
        if (nextService === "hotel") {
          return "/holiday-packages/hotels";
        }

        // For flight, build URL with search parameters
        if (nextService === "flight") {
          const flightData = packageConfig.searchData.flight || {};
          const dates = packageConfig.searchData.dates || {};
          const guests = packageConfig.searchData.totalGuests || {};
          const tripType = flightData.tripType === "OneWay" ? "OneWay" : "Return";
          const departureDate = flightData.dates?.depart || dates.checkIn || "";
          const returnDate = tripType === "OneWay"
            ? ""
            : (flightData.dates?.return || dates.checkOut || "");

          const params = new URLSearchParams();
          params.append("packageMode", "true");
          params.append("DepartureCode", flightData.from || "");
          params.append("ArrivalCode", flightData.to || "");
          params.append("DepartureDate", departureDate);
          if (returnDate) params.append("ReturnDate", returnDate);
          params.append("adult", guests.adults || 1);
          params.append("child", guests.children || 0);
          params.append("infant", guests.infants || 0);
          params.append("CabinType", flightData.cabinClass || "Y");
          params.append("AirTripType", tripType);
          return `/flights?${params.toString()}`;
        }

        // For transfer, build URL with search parameters
        if (nextService === "transfer") {
          const hotelData = packageConfig.searchData.hotel || {};
          const flightData = packageConfig.searchData.flight || {};
          const transferData = packageConfig.searchData.transfer || {};
          const dates = packageConfig.searchData.dates || {};
          const guests = packageConfig.searchData.totalGuests || {};

          // Determine pickup location (explicit transfer > hotel > arrival airport)
          let pickupLat, pickupLng, pickupLocation, pickupCountry;
          let dropoffLat, dropoffLng, dropoffLocation, dropoffCountry;

          if (transferData.pickup?.lat && transferData.pickup?.lng) {
            pickupLat = transferData.pickup.lat;
            pickupLng = transferData.pickup.lng;
            pickupLocation = resolveTransferSearchLocation(transferData.pickup);
            pickupCountry = transferData.pickup.country;
          } else if (hotelData.lat && hotelData.lng) {
            // Use hotel location for pickup
            pickupLat = hotelData.lat;
            pickupLng = hotelData.lng;
            pickupLocation = resolveTransferSearchLocation(hotelData);
            pickupCountry = hotelData.country;
          } else if (flightData.toLocation?.lat) {
            // Use arrival airport location for pickup
            pickupLat = flightData.toLocation.lat;
            pickupLng = flightData.toLocation.lng;
            pickupLocation = resolveTransferSearchLocation(flightData.toLocation);
            pickupCountry = flightData.toLocation.country;
          }

          // Use arrival airport for dropoff if available
          // if (flightData.toLocation?.lat) {
          //   dropoffLat = flightData.toLocation.lat;
          //   dropoffLng = flightData.toLocation.lng;
          //   dropoffLocation = flightData.toLocation.city;
          //   dropoffCountry = flightData.toLocation.country;
          // } else if (hotelData.lat && hotelData.lng) {
          //   // Fallback to hotel location
          //   dropoffLat = hotelData.lat;
          //   dropoffLng = hotelData.lng;
          //   dropoffLocation = hotelData.location || hotelData.city;
          //   dropoffCountry = hotelData.country;
          // }

          const params = new URLSearchParams();
          params.append("packageMode", "true");
          params.append("transferType", "all-round");
          params.append("fromLat", pickupLat || "");
          params.append("fromLng", pickupLng || "");
          params.append("pickupLocation", pickupLocation || "");
          params.append("fromCountry", pickupCountry || "");
          // comment start
          // params.append("toLat", dropoffLat || "");
          // params.append("toLng", dropoffLng || "");
          // params.append("dropoffLocation", dropoffLocation || "");
          // params.append("toCountry", dropoffCountry || "");
          // comment end 
          params.append("toLat", "");
          params.append("toLng", "");
          params.append("dropoffLocation", "");
          params.append("toCountry", "");
          params.append(
            "pickupDate",
            transferData.dates?.pickup || hotelData.dates?.checkOut || dates.checkOut || ""
          );
          params.append("pickupTime", "00:00:00");
          params.append("passengers", guests.adults + guests.children || 1);

          return `/transfers?${params.toString()}`;
        }

        return checkoutUrl;
      },

      // ============================================
      // SET SERVICE DATA
      // ============================================
      // Build selectedRoom entries from rates marked is_selected: true
      getSelectedRoomsFromRates: (rooms) => {
        const selected = [];
        (rooms || []).forEach((room) => {
          (room?.rates || []).forEach((rate) => {
            if (!rate?.is_selected) return;
            const occupancy = getRateOccupancy(rate);
            selected.push({
              roomId: room.id,
              ratekey: rate.rate_key,
              qty: 1,
              roomTypeId: rate?.metadata?.room_type_id || '',
              boardTypeId: rate?.metadata?.board_type_id || '',
              adults: occupancy.adults,
              children: occupancy.children,
            });
          });
        });
        return selected;
      },

      // Sync is_selected on each rate from current selectedRoom list (holiday package only)
      markRoomsIsSelected: (rooms, selectedRoom) => {
        return (rooms || []).map((room) => ({
          ...room,
          rates: (room.rates || []).map((rate) => {
            const isSelected = (selectedRoom || []).some((selected) => {
              if (selected.ratekey !== rate.rate_key) return false;
              if (selected.roomTypeId != null && selected.roomTypeId !== '') {
                return String(rate?.metadata?.room_type_id || '') === String(selected.roomTypeId);
              }
              return true;
            });
            return { ...rate, is_selected: isSelected };
          }),
        }));
      },

      setHotelData: (hotelData, selectedRoom) => {
        let total = 0;
        let currencySymbol = '';

        // Package list passes full room objects; normalize to { roomId, ratekey, qty, ... }
        // using rates where is_selected === true
        let normalizedSelected = selectedRoom || [];
        if (
          Array.isArray(selectedRoom) &&
          selectedRoom.length > 0 &&
          Array.isArray(selectedRoom[0]?.rates)
        ) {
          normalizedSelected = get().getSelectedRoomsFromRates(selectedRoom);
        }

        normalizedSelected.forEach((selected) => {
          const room = hotelData?.rooms?.find((r) => r.id === selected.roomId);
          if (room) {
            const rate = room.rates.find((rt) => {
              if (rt.rate_key !== selected.ratekey) return false;
              if (selected.roomTypeId != null && selected.roomTypeId !== '') {
                return String(rt?.metadata?.room_type_id || '') === String(selected.roomTypeId);
              }
              return true;
            });
            if (rate) {
              currencySymbol = rate.currency || currencySymbol;
              total += Number(rate.price) * selected.qty;
            }
          }
        });

        const roomsWithFlags = get().markRoomsIsSelected(hotelData?.rooms, normalizedSelected);
        const hotelDataWithFlags = hotelData
          ? { ...hotelData, rooms: roomsWithFlags }
          : hotelData;

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            hotel: {
              hotelData: hotelDataWithFlags,
              selectedRoom: normalizedSelected,
            },
          },
          packagePricing: {
            ...state.packagePricing,
            hotelPrice: total,
            hotelCurrency: currencySymbol,
          },
        }));

        get().calculateTotalPrice();
        return get().getNextRoute('hotel');
      },

      setFlightData: (flightData) => {
        const flightPrice = Number(flightData?.pricing?.total_amount) || 0;
        const flightCurrency = flightData?.pricing?.currency || '';
        set((state) => ({
          selectedData: {
            ...state.selectedData,
            flight: flightData,

          },
          packagePricing: {
            ...state.packagePricing,
            flightPrice,
            flightCurrency,
          },
        }));

        get().calculateTotalPrice();
        return get().getNextRoute('flight');
      },

      // Convert search-flight pricing into package currency before storing (package mode)
      prepareFlightForPackage: (flightData, rates = {}) => {
        const { selectedData, packageConfig } = get();
        let packageCurrency = selectedData?.packageInfo?.currency;
        // Flight+transfer: use flight client_currency (e.g. SAR) — no hotel package currency
        if (
          !packageCurrency &&
          isFlightTransferOnlyPackage(packageConfig?.selectedServices)
        ) {
          packageCurrency = flightData?.client_currency || null;
        }
        return convertFlightPricingForPackage(flightData, packageCurrency, rates);
      },

      // Convert search-transfer fare into package currency before storing (package mode)
      prepareTransferForPackage: (transferData, rates = {}) => {
        const { selectedData, packageConfig } = get();
        let packageCurrency = selectedData?.packageInfo?.currency;
        // Flight+transfer: keep same client_currency used for flight cart
        if (
          !packageCurrency &&
          isFlightTransferOnlyPackage(packageConfig?.selectedServices)
        ) {
          packageCurrency =
            selectedData?.flight?.client_currency ||
            transferData?.client_currency ||
            null;
        }
        return convertTransferPricingForPackage(transferData, packageCurrency, rates);
      },

      setTransferData: (transferData) => {
        const transferPrice = Number(transferData?.fare) || 0;
        const transferCurrency = transferData?.currency || '';

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            transfer: transferData,
          },
          packagePricing: {
            ...state.packagePricing,
            transferPrice,
            transferCurrency,
          },
        }));

        get().calculateTotalPrice();
        return get().getNextRoute('transfer');
      },
      
      setPackageInfo: (packageInfo) => {
        set((state) => ({
          selectedData: {
            ...state.selectedData,
            packageInfo: {
              package_id: packageInfo.package_id || '',
              currency: packageInfo.currency || '',
              hotel_price: Number(packageInfo.hotel_price) || 0,
              flight_price: Number(packageInfo.flight_price) || 0,
              transfer_price: Number(packageInfo.transfer_price) || 0,
              total_price: Number(packageInfo.total_price) || 0,
              price_per_person: Number(packageInfo.price_per_person) || 0,
              total_travelers: packageInfo.total_travelers || 0,
              total_nights: packageInfo.total_nights || 0,
              savings: packageInfo.savings || 0,
            },
          },
        }));

        get().calculateTotalPrice();
        return get().getNextRoute('packageInfo');
      },

      // Convert service prices into package currency and refresh package totals.
      // Call after hotel/flight/transfer changes in package mode (pass exchange rates).
      recalculatePackageInfoPricing: (rates = {}) => {
        const { selectedData, packagePricing } = get();
        const info = selectedData.packageInfo || {};
        const packageCurrency = info.currency;
        if (!packageCurrency) return info;

        const toPackageCurrency = (amount, fromCurrency) => {
          const num = Number(amount) || 0;
          if (!fromCurrency || fromCurrency === packageCurrency) {
            return Number(num.toFixed(2));
          }
          if (!rates?.[fromCurrency] || !rates?.[packageCurrency]) {
            return Number(num.toFixed(2));
          }
          const { newprice } = ConvertPrice(num, fromCurrency, packageCurrency, rates);
          return Number(parseFloat(newprice).toFixed(2));
        };

        let hotel_price = Number(info.hotel_price) || 0;
        let flight_price = Number(info.flight_price) || 0;
        let transfer_price = Number(info.transfer_price) || 0;

        if (selectedData.hotel) {
          hotel_price = toPackageCurrency(
            packagePricing.hotelPrice,
            packagePricing.hotelCurrency
          );
        }
        if (selectedData.flight) {
          flight_price = toPackageCurrency(
            packagePricing.flightPrice,
            packagePricing.flightCurrency
          );
        }
        if (selectedData.transfer) {
          transfer_price = toPackageCurrency(
            packagePricing.transferPrice,
            packagePricing.transferCurrency
          );
        }

        const total_price = Number((hotel_price + flight_price + transfer_price).toFixed(2));
        const travelers = Number(info.total_travelers) || 1;
        const price_per_person = Number((total_price / travelers).toFixed(2));

        const updatedInfo = {
          ...info,
          hotel_price,
          flight_price,
          transfer_price,
          total_price,
          price_per_person,
        };

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            packageInfo: updatedInfo,
          },
        }));

        return updatedInfo;
      },
      // ============================================
      // UPDATE SERVICE (for changes in checkout)
      // ============================================
      updateHotelRoom: (newRoom) => {
        const { selectedData } = get();
        if (!selectedData.hotel) return;
        let total = 0;
        let currencySymbol = '';

        newRoom.forEach(selected => {
          const room = selectedData.hotel?.hotelData?.rooms.find(r => r.id === selected.roomId);
          if (room) {
            const rate = room.rates.find((rt) => {
              if (rt.rate_key !== selected.ratekey) return false;
              if (selected.roomTypeId != null && selected.roomTypeId !== '') {
                return String(rt?.metadata?.room_type_id || '') === String(selected.roomTypeId);
              }
              return true;
            });
            if (rate) {
              currencySymbol = rate.currency || currencySymbol;
              total += (Number(rate.price) * selected.qty);
            }
          }
        });

        const roomsWithFlags = get().markRoomsIsSelected(
          selectedData.hotel?.hotelData?.rooms,
          newRoom
        );

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            hotel: {
              ...state.selectedData.hotel,
              hotelData: {
                ...state.selectedData.hotel.hotelData,
                rooms: roomsWithFlags,
              },
              selectedRoom: newRoom,
            },
          },
          packagePricing: {
            ...state.packagePricing,
            hotelPrice: total,
            hotelCurrency: currencySymbol,
          },
        }));

        get().calculateTotalPrice();
      },

      updateFlight: (newFlight) => {
        const flightPrice = Number(newFlight?.pricing?.total_amount) || 0;
        const flightCurrency = newFlight?.pricing?.currency || '';

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            flight: newFlight,
          },
          packagePricing: {
            ...state.packagePricing,
            flightPrice,
            flightCurrency,
          },
        }));

        get().calculateTotalPrice();
      },

      updateTransfer: (newTransfer) => {
        const transferPrice = Number(newTransfer?.fare) || 0;
        const transferCurrency = newTransfer?.currency || '';

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            transfer: newTransfer,
          },
          packagePricing: {
            ...state.packagePricing,
            transferPrice,
            transferCurrency,
          },
        }));

        get().calculateTotalPrice();
      },

      // ============================================
      // REMOVE SERVICE (in checkout)
      // ============================================
      removeService: (serviceType) => {
        set((state) => ({
          selectedData: {
            ...state.selectedData,
            [serviceType]: null,
          },
          packagePricing: {
            ...state.packagePricing,
            [`${serviceType}Price`]: 0,
          },
          packageConfig: {
            ...state.packageConfig,
            selectedServices: {
              ...state.packageConfig.selectedServices,
              [serviceType]: false,
            },
          },
        }));

        get().calculateTotalPrice();
      },

      // ============================================
      // PRICE CALCULATION
      // ============================================
      calculateTotalPrice: () => {
        const { packagePricing } = get();
        const total =
          packagePricing.hotelPrice +
          packagePricing.flightPrice +
          packagePricing.transferPrice;

        set((state) => ({
          packagePricing: {
            ...state.packagePricing,
            totalPrice: total,
          },
        }));

        return total;
      },

      // ============================================
      // GETTERS FOR COMPONENTS
      // ============================================
      getPackagePrice: () => {
        return get().packagePricing.totalPrice;
      },

      getSelectedServicePrice: (serviceType) => {
        const { packagePricing } = get();
        return packagePricing[`${serviceType}Price`] || 0;
      },

      isServiceSelected: (serviceType) => {
        return get().packageConfig.selectedServices[serviceType];
      },

      getSelectedService: (serviceType) => {
        return get().selectedData[serviceType];
      },

      // ============================================
      // VALIDATION
      // ============================================
      validatePackage: () => {
        const { packageConfig, selectedData } = get();
        const errors = [];

        // Check if at least 2 services selected
        const selectedCount = Object.values(
          packageConfig.selectedServices
        ).filter(Boolean).length;

        if (selectedCount < 2) {
          errors.push("At least 2 services must be selected");
        }

        // Check if all selected services have data
        Object.entries(packageConfig.selectedServices).forEach(
          ([service, isSelected]) => {
            if (isSelected && !selectedData[service]) {
              errors.push(`${service} must be selected`);
            }
          }
        );

        return {
          isValid: errors.length === 0,
          errors,
        };
      },

      /**
       * Create or update holiday package cart via POST /api/holiday-packages/cart.
       * Uses selected package data; currency always comes from the package (never static).
       * For flight+transfer only (no hotel), generates package_id as pkg_<timestamp> if missing.
       */
      createOrUpdatePackageCart: async (rates = {}) => {
        const { packageConfig, selectedData, packagePricing } = get();
        const { selectedServices, searchData } = packageConfig || {};
        const info = selectedData?.packageInfo || {};

        const hasHotel = !!selectedServices?.hotel && !!selectedData?.hotel;
        const hasFlight = !!selectedServices?.flight && !!selectedData?.flight;
        const hasTransfer =
          !!selectedServices?.transfer && !!selectedData?.transfer;
        if (isFlightTransferOnlyPackage(selectedServices)) {
          // Allow step-by-step flow: first flight or transfer can create cart,
          // then second service updates the same cart.
          if (!selectedData?.flight && !selectedData?.transfer) {
            throw new Error(
              "At least one service (flight or transfer) must be selected before creating cart"
            );
          }
        } else if (!hasHotel && !hasFlight && !hasTransfer) {
          throw new Error("No package services selected for cart");
        }

        let packageId = info.package_id || "";
        // Flight+transfer has no search package_id — always mint on first cart create
        if (isFlightTransferOnlyPackage(selectedServices) && !packageId) {
          packageId = `pkg_${Date.now()}`;
        }
        if (!packageId) {
          throw new Error("Package ID missing. Cannot sync cart.");
        }

        let currency = resolvePackageCurrency({
          packageInfo: info,
          selectedData,
          packagePricing,
          searchData,
        });
        // Flight+transfer only: cart currency + prices must use flight client_currency (e.g. SAR)
        if (isFlightTransferOnlyPackage(selectedServices)) {
          const clientCurrency =
            selectedData?.flight?.client_currency ||
            selectedData?.transfer?.client_currency ||
            null;
          if (clientCurrency) {
            currency = clientCurrency;
          }

          // Ensure FX rates exist before converting service currency → client_currency
          const sources = [
            selectedData?.flight?.pricing?.original_currency ||
              selectedData?.flight?.pricing?.currency,
            selectedData?.transfer?.original_currency ||
              selectedData?.transfer?.currency,
          ].filter(Boolean);
          const needsFx = sources.some((from) => from !== currency);
          if (needsFx) {
            const missingRate =
              !rates?.[currency] ||
              sources.some((from) => from !== currency && !rates?.[from]);
            if (missingRate) {
              throw new Error(
                "Currency rates not loaded yet. Please wait a moment and try again."
              );
            }
          }
        }
        if (!currency) {
          throw new Error("Package currency missing. Cannot sync cart.");
        }

        const payload = buildHolidayPackageCartPayload({
          packageId,
          selectedServices,
          hotel: selectedData.hotel,
          flight: selectedData.flight,
          transfer: selectedData.transfer,
          searchData,
          packageInfo: info,
          packagePricing,
          selectedCurrency: currency,
          rates,
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/cart`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json().catch(() => ({}));
        if (
          !response.ok ||
          data?.Success === false ||
          data?.success === false
        ) {
          throw new Error(
            data?.Message ||
              data?.message ||
              data?.Description ||
              "Failed to create holiday package cart"
          );
        }

        const resultPackageId =
          data?.Content?.package_id ||
          data?.Content?.packageId ||
          packageId;
        const pricing = payload.pricing;

        set((state) => ({
          selectedData: {
            ...state.selectedData,
            packageInfo: {
              ...state.selectedData.packageInfo,
              package_id: resultPackageId,
              currency: pricing.currency,
              hotel_price: pricing.hotel_price,
              flight_price: pricing.flight_price,
              transfer_price: pricing.transfer_price,
              total_price: pricing.total_price,
            },
            flight: payload.package_context.flight || state.selectedData.flight,
            transfer:
              payload.package_context.transfer || state.selectedData.transfer,
          },
          packagePricing: {
            ...state.packagePricing,
            hotelPrice: pricing.hotel_price,
            hotelCurrency: pricing.currency,
            transferPrice: pricing.transfer_price,
            transferCurrency: pricing.currency,
            flightPrice: pricing.flight_price,
            flightCurrency: pricing.currency,
            totalPrice: pricing.total_price,
          },
        }));

        return { packageId: resultPackageId, data, payload };
      },

      /** @deprecated Prefer createOrUpdatePackageCart — kept for flight+transfer flow. */
      createFlightTransferCart: async (rates = {}) => {
        return get().createOrUpdatePackageCart(rates);
      },

      // ============================================
      // RESET
      // ============================================
      clearPackageData: () =>
        set({
          isActive: false,
          packageConfig: {
            selectedServices: {
              hotel: false,
              flight: false,
              transfer: false,
            },
            searchData: {},
          },
          selectedData: {
            packageInfo: emptyPackageInfo(),
            hotel: null,
            flight: null,
            transfer: null,
          },
          packagePricing: {
            hotelPrice: 0,
            hotelCurrency: '',
            flightPrice: 0,
            flightCurrency: '',
            transferPrice: 0,
            transferCurrency: '',
            totalPrice: 0,
          },
        }),
    }),
    {
      name: "holiday-package-storage",
      getStorage: () => localStorage,
    }
  )
);
