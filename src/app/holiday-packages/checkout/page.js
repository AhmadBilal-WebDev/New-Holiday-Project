"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHolidayPackageStore } from "@/components/Store/HolidayPackageStore";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FaHotel, FaPlane, FaCar, FaEdit, FaSuitcaseRolling } from "react-icons/fa";
import styles from "./checkout.module.css";
import moment from "moment";
import airline from "@/util/airlines.json"
import { IoAirplaneSharp, IoBedOutline, IoMoonOutline } from "react-icons/io5";
import Image from "next/image";
import { GoPerson } from "react-icons/go";
import { PiSuitcaseRolling } from "react-icons/pi";
import { GiGearStickPattern } from "react-icons/gi";
import { RiCalendarCheckLine, RiCalendarCloseLine } from "react-icons/ri";
import { FaLocationDot } from "react-icons/fa6";
import GuestInformation from "@/components/HolidayPackages/Checkout/GuestInformation";
import FlightDetail from "@/components/Flights/FlightDetail";
import { ConvertPrice } from "@/components/Currency/ConvertPrice";
import { useCurrency } from "@/util/currency";
import CheckoutTimer from "@/components/UmrahGetAway/Checkout/CheckoutTimer";
import { resolveTransferSearchLocation } from "@/util/resolveTransferSearchLocation";

export default function HolidayPackageCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearPackageData } = useHolidayPackageStore();
  const { currency, rates } = useCurrency();
  const packageIdFromUrl = searchParams.get("package_id");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPackageLoading, setIsPackageLoading] = useState(true);
  const [packageLoadError, setPackageLoadError] = useState("");
  const [showGuestInfo, setShowGuestInfo] = useState(1);
  const [checkoutExpiresAt, setCheckoutExpiresAt] = useState(null);
  const [checkoutTtlMinutes, setCheckoutTtlMinutes] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [packagePricing, setPackagePricing] = useState({
    hotelPrice: 0,
    hotelCurrency: "",
    flightPrice: 0,
    flightCurrency: "",
    transferPrice: 0,
    transferCurrency: "",
    totalPrice: 0,
  });
  const [packageConfig, setPackageConfig] = useState({
    selectedServices: { hotel: false, flight: false, transfer: false },
    searchData: {},
  });
  const expireNotifiedRef = useRef(false);
  const initStartedRef = useRef(false);

  const normalizeSelectedServices = useCallback((services, hotelData, flightData, transferData) => {
    if (Array.isArray(services)) {
      return {
        hotel: services.includes("hotel"),
        flight: services.includes("flight"),
        transfer: services.includes("transfer"),
      };
    }
    if (services && typeof services === "object") {
      return {
        hotel: !!services.hotel,
        flight: !!services.flight,
        transfer: !!services.transfer,
      };
    }
    return {
      hotel: !!hotelData,
      flight: !!flightData,
      transfer: !!transferData,
    };
  }, []);

  const buildSearchDataFromRequest = useCallback((searchRequest) => {
    if (!searchRequest || typeof searchRequest !== "object") return {};

    const checkIn = searchRequest?.dates?.checkIn || searchRequest?.stayDates?.checkIn || "";
    const checkOut = searchRequest?.dates?.checkOut || searchRequest?.stayDates?.checkOut || "";
    const roomInfo = searchRequest?.travelers?.rooms?.[0] || {};

    return {
      dates: { checkIn, checkOut },
      totalGuests: {
        adults: Number(roomInfo.adults || searchRequest?.travelers?.simple?.adults || 1),
        children: Number(roomInfo.children || searchRequest?.travelers?.simple?.children || 0),
        infants: Number(
          roomInfo.infants ||
          searchRequest?.travelers?.simple?.infantsLap ||
          0
        ),
      },
      hotel: {
        city: searchRequest?.hotelDestination?.city || searchRequest?.goingTo?.city || "",
        location:
          searchRequest?.hotelDestination?.location ||
          searchRequest?.hotelDestinationLabel ||
          searchRequest?.goingTo?.location ||
          "",
        lat: searchRequest?.hotelDestination?.latitude || searchRequest?.goingTo?.latitude || "",
        lng: searchRequest?.hotelDestination?.longitude || searchRequest?.goingTo?.longitude || "",
        country:
          searchRequest?.hotelDestination?.countryCode ||
          searchRequest?.goingTo?.countryCode ||
          "",
        dates: { checkIn, checkOut },
      },
      flight: {
        from: searchRequest?.leavingFrom?.airportCode || "",
        to: searchRequest?.goingTo?.airportCode || "",
        dates: { depart: checkIn, return: checkOut },
        tripType: "Return",
        cabinClass: searchRequest?.economyClass === "economy" ? "Y" : "Y",
        fromLocation: {
          city: searchRequest?.leavingFrom?.city || "",
          location: searchRequest?.leavingFrom?.location || "",
          lat: searchRequest?.leavingFrom?.latitude || "",
          lng: searchRequest?.leavingFrom?.longitude || "",
          country: searchRequest?.leavingFrom?.countryCode || "",
          airportCode: searchRequest?.leavingFrom?.airportCode || "",
        },
        toLocation: {
          city: searchRequest?.goingTo?.city || "",
          location: searchRequest?.goingTo?.location || "",
          lat: searchRequest?.goingTo?.latitude || "",
          lng: searchRequest?.goingTo?.longitude || "",
          country: searchRequest?.goingTo?.countryCode || "",
          airportCode: searchRequest?.goingTo?.airportCode || "",
        },
      },
      transfer: {
        pickup: {
          city: searchRequest?.transferPickup?.city || "",
          location: searchRequest?.transferPickup?.location || "",
          lat: searchRequest?.transferPickup?.latitude || "",
          lng: searchRequest?.transferPickup?.longitude || "",
          country: searchRequest?.transferPickup?.countryCode || "",
        },
        dropoff: {
          city: searchRequest?.transferDropoff?.city || "",
          location: searchRequest?.transferDropoff?.location || "",
          lat: searchRequest?.transferDropoff?.latitude || "",
          lng: searchRequest?.transferDropoff?.longitude || "",
          country: searchRequest?.transferDropoff?.countryCode || "",
        },
        dates: { pickup: checkOut },
      },
    };
  }, []);

  const normalizeHotelForStore = useCallback((hotel) => {
    if (!hotel) return { hotelData: null, selectedRooms: [] };

    const adultsPerRoom =
      Number(hotel?.search_criteria?.adults) ||
      Number(hotel?.search_criteria?.adult) ||
      2;
    const childrenPerRoom =
      Number(hotel?.search_criteria?.children) ||
      Number(hotel?.search_criteria?.child) ||
      0;

    const normalizedRooms = Array.isArray(hotel?.rooms)
      ? hotel.rooms.map((room, index) => ({
        id: room?.room_number || index + 1,
        name: room?.room_type || `Room ${index + 1}`,
        rates: [
          {
            rate_key: room?.rate_key || `${hotel?.offer?.id || "hotel"}_${index + 1}`,
            board_name: room?.board_name || "",
            currency: room?.currency || hotel?.currency || "GBP",
            price: Number(room?.unit_price ?? room?.price ?? 0),
            adults: adultsPerRoom,
            children: childrenPerRoom,
            metadata: {
              room_type_id: room?.room_number || index + 1,
            },
            is_selected: true,
          },
        ],
      }))
      : [];

    const selectedRooms = Array.isArray(hotel?.rooms)
      ? hotel.rooms.map((room, index) => ({
        roomId: room?.room_number || index + 1,
        ratekey: room?.rate_key || `${hotel?.offer?.id || "hotel"}_${index + 1}`,
        qty: Number(room?.quantity || 1),
        roomTypeId: room?.room_number || index + 1,
        boardTypeId: "",
        adults: adultsPerRoom,
        children: Array.from({ length: childrenPerRoom }, () => ({ age: 8 })),
      }))
      : [];

    return {
      hotelData: {
        hotel_name: hotel?.name || hotel?.offer?.name || "",
        checkIn: hotel?.check_in || hotel?.offer?.checkIn || "",
        checkOut: hotel?.check_out || hotel?.offer?.checkOut || "",
        city: hotel?.offer?.city || hotel?.city || "",
        address: hotel?.offer?.address || hotel?.address || "",
        provider: hotel?.offer?.provider || hotel?.provider || "",
        hotel_code: hotel?.offer?.hotel_code || hotel?.offer?.id || hotel?.hotel_code || "",
        main_images:
          hotel?.main_images ||
          hotel?.offer?.main_images ||
          hotel?.images ||
          hotel?.offer?.images ||
          [],
        rooms: normalizedRooms,
      },
      selectedRooms,
    };
  }, []);

  const normalizeTransferForStore = useCallback((transfer) => {
    if (!transfer) return null;
    const offer = transfer?.offer || {};
    return {
      ...offer,
      fare: Number(transfer?.subtotal ?? offer?.display_price ?? offer?.fare ?? 0),
      currency: transfer?.currency || offer?.currency || "GBP",
      vehicle_image: offer?.vehicle_image || null,
      vehicle_details: offer?.vehicle_details || {
        name: transfer?.vehicle_name || offer?.vehicle_name || "Transfer",
        vehicle_description: null,
        passenger_capacity: 1,
        luggage_capacity: 0,
        transmission_type: "-",
      },
      searchParams: transfer?.searchParams || offer?.searchParams || null,
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [showGuestInfo]);

  useEffect(() => {
    let cancelled = false;

    const loadPackageFromDetailsApi = async () => {
      if (!packageIdFromUrl) {
        notifications.show({
          title: "Missing package",
          message: "Package ID is missing in the URL.",
          color: "red",
        });
        setIsPackageLoading(false);
        setPackageLoadError("Package ID is missing in the URL.");
        setSelectedData(null);
        return;
      }

      setIsPackageLoading(true);
      setPackageLoadError("");
      setSelectedData(null);
      initStartedRef.current = false;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/details?package_id=${encodeURIComponent(packageIdFromUrl)}`,
          {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
        );
        const data = await response.json();
        const content = data?.Content ?? data?.data ?? data;

        if (data?.Success === false || !content) {
          throw new Error(
            data?.Description ||
            data?.Title ||
            "Failed to load package details.",
          );
        }

        if (cancelled) return;

        const hotelRaw = content?.hotel || null;
        const flightRaw = content?.flight || null;
        const transferRaw = content?.transfer || null;
        const selectedServices = normalizeSelectedServices(
          content?.services,
          hotelRaw,
          flightRaw,
          transferRaw,
        );
        const searchData =
          content?.searchData ||
          content?.search_data ||
          buildSearchDataFromRequest(content?.search_request);
        const packagePricingInfo = content?.pricing || {};
        const packageCurrency =
          content?.currency || packagePricingInfo?.currency || "";
        const { hotelData, selectedRooms } = normalizeHotelForStore(hotelRaw);
        const flightData = flightRaw?.offer || flightRaw || null;
        const transferData = normalizeTransferForStore(transferRaw);

        const checkIn =
          content?.search_request?.dates?.checkIn ||
          hotelRaw?.check_in ||
          hotelRaw?.offer?.checkIn ||
          "";
        const checkOut =
          content?.search_request?.dates?.checkOut ||
          hotelRaw?.check_out ||
          hotelRaw?.offer?.checkOut ||
          "";
        const totalTravelers =
          packagePricingInfo?.total_travelers ||
          content?.search_request?.travelers?.rooms?.reduce(
            (acc, room) =>
              acc +
              Number(room?.adults || 0) +
              Number(room?.children || 0) +
              Number(room?.infants || 0),
            0,
          ) ||
          (Number(content?.search_request?.travelers?.simple?.adults || 0) +
            Number(content?.search_request?.travelers?.simple?.children || 0) +
            Number(content?.search_request?.travelers?.simple?.infantsLap || 0)) ||
          0;
        const totalNights =
          packagePricingInfo?.total_nights ||
          (checkIn && checkOut
            ? moment(checkOut).diff(moment(checkIn), "days")
            : 0) ||
          0;

        const hotelPrice =
          Number(packagePricingInfo?.hotel_price) ||
          Number(
            hotelRaw?.rooms?.reduce(
              (sum, room) =>
                sum +
                Number(room?.unit_price ?? room?.price ?? 0) *
                  Number(room?.quantity || 1),
              0,
            ),
          ) ||
          0;
        const flightPrice =
          Number(packagePricingInfo?.flight_price) ||
          Number(flightData?.pricing?.total_amount) ||
          0;
        const transferPrice =
          Number(packagePricingInfo?.transfer_price) ||
          Number(transferData?.fare) ||
          0;
        const hotelCurrency =
          packageCurrency ||
          hotelRaw?.currency ||
          hotelRaw?.rooms?.[0]?.currency ||
          "";
        const flightCurrency =
          packageCurrency || flightData?.pricing?.currency || "";
        const transferCurrency =
          packageCurrency || transferData?.currency || "";
        const totalPrice =
          Number(packagePricingInfo?.total_price) ||
          hotelPrice + flightPrice + transferPrice;

        const nextSelectedData = {
          packageInfo: {
            package_id: content?.package_id || packageIdFromUrl,
            currency: packageCurrency,
            hotel_price: hotelPrice,
            flight_price: flightPrice,
            transfer_price: transferPrice,
            total_price: totalPrice,
            price_per_person: Number(packagePricingInfo?.price_per_person) || 0,
            total_travelers: totalTravelers,
            total_nights: totalNights,
            savings: packagePricingInfo?.savings || 0,
          },
          hotel:
            selectedServices?.hotel && hotelData
              ? { hotelData, selectedRoom: selectedRooms }
              : null,
          flight: selectedServices?.flight && flightData ? flightData : null,
          transfer:
            selectedServices?.transfer && transferData ? transferData : null,
        };

        setSelectedData(nextSelectedData);
        setPackageConfig({
          selectedServices,
          searchData,
        });
        setPackagePricing({
          hotelPrice,
          hotelCurrency,
          flightPrice,
          flightCurrency,
          transferPrice,
          transferCurrency,
          totalPrice,
        });

        if (content?.checkout_expires_at) {
          setCheckoutExpiresAt(content.checkout_expires_at);
          setCheckoutTtlMinutes(content?.checkout_ttl_minutes ?? null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch package details:", error);
        const errorMessage = error?.message || "Unable to load package details.";
        notifications.show({
          title: "Unable to load package",
          message: errorMessage,
          color: "red",
        });
        setPackageLoadError(errorMessage);
        setSelectedData(null);
      } finally {
        if (!cancelled) setIsPackageLoading(false);
      }
    };

    loadPackageFromDetailsApi();

    return () => {
      cancelled = true;
    };
  }, [
    packageIdFromUrl,
    normalizeSelectedServices,
    buildSearchDataFromRequest,
    normalizeHotelForStore,
    normalizeTransferForStore,
  ]);

  const markSessionExpired = useCallback((showToast = true) => {
    setSessionExpired(true);
    if (!showToast || expireNotifiedRef.current) return;
    expireNotifiedRef.current = true;
    notifications.show({
      title: "Checkout session expired",
      message:
        "Your reserved package, price, and availability are no longer held. Search again to continue with the latest options.",
      color: "red",
    });
  }, []);

  const handleCheckoutExpire = useCallback(() => {
    markSessionExpired(true);
  }, [markSessionExpired]);

  const handleTimerGoToSearch = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    const packageId = selectedData?.packageInfo?.package_id;
    if (!packageId || initStartedRef.current) return;
    initStartedRef.current = true;

    const initCheckoutSession = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/checkout/init`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ package_id: packageId }),
          },
        );
        const data = await response.json();

        if (data.Success && data?.Content?.checkout_expires_at) {
          setCheckoutExpiresAt(data.Content.checkout_expires_at);
          setCheckoutTtlMinutes(data.Content.checkout_ttl_minutes ?? null);
        } else {
          // Already expired — modal/banner only, no toast spam
          expireNotifiedRef.current = true;
          setCheckoutExpiresAt(new Date().toISOString());
          setSessionExpired(true);
        }
      } catch (err) {
        console.error("Error initializing checkout session:", err);
        expireNotifiedRef.current = true;
        setCheckoutExpiresAt(new Date().toISOString());
        setSessionExpired(true);
      }
    };

    // initCheckoutSession();
  }, [selectedData?.packageInfo?.package_id, markSessionExpired]);

  // const handleRemoveService = (serviceType) => {
  //   const validation = validatePackage();

  //   // Check if removing would leave less than 2 services
  //   const currentServiceCount = Object.values(packageConfig.selectedServices)
  //     .filter(Boolean).length;

  //   if (currentServiceCount <= 2) {
  //     notifications.show({
  //       title: "Cannot Remove",
  //       message: "Package must have at least 2 services",
  //       color: "orange",
  //     });
  //     return;
  //   }

  //   removeService(serviceType);
  //   notifications.show({
  //     title: "Service Removed",
  //     message: `${serviceType} has been removed from your package`,
  //     color: "blue",
  //   });
  // };

  const handleChangeService = (serviceType) => {
    // For hotel, just add edit flag
    if (serviceType === "hotel") {
      router.push(`/hotels/${makingSlug(selectedData?.hotel?.hotelData?.hotel_name)}?packageId=${selectedData?.packageInfo?.package_id}&id=${selectedData?.hotel?.hotelData?.hotel_code}&code=${ProviderShortNames(selectedData?.hotel?.hotelData?.provider)}&edit=true`);
      return;
    }

    // For flight, build URL with search parameters
    if (serviceType === "flight") {
      const flightData = packageConfig.searchData.flight || {};
      const dates = packageConfig.searchData.dates || {};
      const guests = packageConfig.searchData.totalGuests || {};
      const tripType = flightData.tripType === "OneWay" ? "OneWay" : "Return";
      const departureDate = flightData.dates?.depart || dates.checkIn || "";
      const returnDate = tripType === "OneWay"
        ? ""
        : (flightData.dates?.return || dates.checkOut || "");

      const params = new URLSearchParams();
      params.append("edit", "true");
      params.append("DepartureCode", flightData.from || "");
      params.append("ArrivalCode", flightData.to || "");
      params.append("DepartureDate", departureDate);
      if (returnDate) params.append("ReturnDate", returnDate);
      params.append("adult", guests.adults || 1);
      params.append("child", guests.children || 0);
      params.append("infant", guests.infants || 0);
      params.append("CabinType", flightData.cabinClass || "Y");
      params.append("AirTripType", tripType);

      router.push(`/flights?${params.toString()}`);
      return;
    }

    // For transfer, build URL with search parameters
    if (serviceType === "transfer") {
      const hotelData = packageConfig.searchData.hotel || {};
      const flightData = packageConfig.searchData.flight || {};
      const transferData = packageConfig.searchData.transfer || {};
      const dates = packageConfig.searchData.dates || {};
      const guests = packageConfig.searchData.totalGuests || {};

      // Determine pickup location (hotel if available, otherwise departure airport)
      let pickupLat, pickupLng, pickupLocation, pickupCountry;
      let dropoffLat, dropoffLng, dropoffLocation, dropoffCountry;

      if (hotelData.lat && hotelData.lng) {
        // Use hotel location for pickup
        pickupLat = hotelData.lat;
        pickupLng = hotelData.lng;
        pickupLocation = resolveTransferSearchLocation(hotelData);
        pickupCountry = hotelData.country;
      } else if (flightData.fromLocation?.lat) {
        // Use departure airport location for pickup
        pickupLat = flightData.fromLocation.lat;
        pickupLng = flightData.fromLocation.lng;
        pickupLocation = resolveTransferSearchLocation(flightData.fromLocation);
        pickupCountry = flightData.fromLocation.country;
      }

      // Use arrival airport for dropoff if available
      if (flightData.toLocation?.lat) {
        dropoffLat = flightData.toLocation.lat;
        dropoffLng = flightData.toLocation.lng;
        dropoffLocation = resolveTransferSearchLocation(flightData.toLocation);
        dropoffCountry = flightData.toLocation.country;
      } else if (hotelData.lat && hotelData.lng) {
        // Fallback to hotel location
        dropoffLat = hotelData.lat;
        dropoffLng = hotelData.lng;
        dropoffLocation = resolveTransferSearchLocation(hotelData);
        dropoffCountry = hotelData.country;
      }

      const params = new URLSearchParams();
      params.append("edit", "true");
      params.append("transferType", "all-round");
      params.append("pickupLatitude", dropoffLat || "");
      params.append("pickupLongitude", dropoffLng || "");
      params.append("pickupLocation", dropoffLocation || "");
      params.append("fromCountry", dropoffCountry || "");
      // comment start
      // params.append("dropoffLatitude", dropoffLat || "");
      // params.append("dropoffLongitude", dropoffLng || "");
      // params.append("dropoffLocation", dropoffLocation || "");
      // params.append("toCountry", dropoffCountry || "");
      // comment end 
      params.append("dropoffLatitude", "");
      params.append("dropoffLongitude", "");
      params.append("dropoffLocation", "");
      params.append("toCountry", "");
      params.append(
        "pickupDate",
        transferData.dates?.pickup
          || transferData.dates?.check_in
          || hotelData.dates?.checkOut
          || dates.checkOut
          || ""
      );
      params.append("pickupTime", "00:00");
      params.append("passengers", guests.adults + guests.children || 1);

      router.push(`/transfers?${params.toString()}`);
      return;
    }
  };
  const makingSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  }
  const ProviderShortNames = (encodedProvider) => {
    if (!encodedProvider) return '';
    const provider = encodeProvider(encodedProvider).toLowerCase();
    return provider;
  };
  const encodeProvider = (str) => {
    return [...str].map(c => (c.charCodeAt(0) + 3).toString(36)).join('');
  }
  const handleProceedToPayment = async () => {
    if (sessionExpired) {
      notifications.show({
        title: "Checkout session expired",
        message: "Please search again to continue with the latest package options.",
        color: "red",
      });
      return;
    }

    const validation = (() => {
      const errors = [];
      const selectedCount = Object.values(
        packageConfig?.selectedServices || {},
      ).filter(Boolean).length;

      if (selectedCount < 2) {
        errors.push("At least 2 services must be selected");
      }

      Object.entries(packageConfig?.selectedServices || {}).forEach(
        ([service, isSelected]) => {
          if (isSelected && !selectedData?.[service]) {
            errors.push(`${service} must be selected`);
          }
        },
      );

      return { isValid: errors.length === 0, errors };
    })();

    if (!validation.isValid) {
      notifications.show({
        title: "Invalid Package",
        message: validation.errors.join(", "),
        color: "red",
      });
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowGuestInfo(2);
    }, 2000);

  };
  const groupSegments = (flight) => {
    if (flight.trip_type === 'return') {
      const midpoint = Math.ceil(flight.segments.length / 2);
      return [
        { segments: flight.segments.slice(0, midpoint), label: 'Departure' },
        { segments: flight.segments.slice(midpoint), label: 'Return' }
      ];
    } else if (flight.trip_type === 'multicity') {
      // For multi-city, group segments by legs based on search criteria
      const legs = flight.search_criteria?.legs || [];
      if (legs.length === 0) {
        // Fallback: treat each segment as a separate leg
        return flight.segments.map((segment, idx) => ({
          segments: [segment],
          label: `Flight ${idx + 1}`
        }));
      }

      const groupedLegs = [];
      let currentSegmentIndex = 0;

      legs.forEach((leg, legIndex) => {
        const legSegments = [];
        const origin = leg.origin;
        const destination = leg.destination;

        // Collect all segments that belong to this leg
        while (currentSegmentIndex < flight.segments.length) {
          const segment = flight.segments[currentSegmentIndex];
          legSegments.push(segment);
          currentSegmentIndex++;

          // Check if we've reached the final destination for this leg
          if (segment.arrival.airport_code === destination) {
            break;
          }
        }

        if (legSegments.length > 0) {
          groupedLegs.push({
            segments: legSegments,
            label: `Flight ${legIndex + 1}`
          });
        }
      });

      return groupedLegs;
    }
    return [{ segments: flight.segments, label: 'Departure' }];
  };
  const clearDataAndRedirect = () => {
    clearPackageData();
    router.push("/");
  };
  if (isPackageLoading) {
    return (
      <div className={`${styles.page} ${styles.checkoutSkeletonPage}`}>
        <div className={styles.inner}>
          <header className={styles.checkoutSkeletonHeader}>
            <div className={styles.checkoutSkeletonBrandRow}>
              <div className={styles.checkoutSkeletonIcon} />
              <div className={styles.checkoutSkeletonBrandText}>
                <div className={styles.checkoutSkeletonLineLg} />
                <div className={styles.checkoutSkeletonLineSm} />
              </div>
            </div>
            <div className={styles.checkoutSkeletonStepper}>
              <div className={styles.checkoutSkeletonStep}>
                <div className={styles.checkoutSkeletonStepCircle} />
                <div className={styles.checkoutSkeletonStepText} />
              </div>
              <div className={styles.checkoutSkeletonStepConnector} />
              <div className={styles.checkoutSkeletonStep}>
                <div className={styles.checkoutSkeletonStepCircle} />
                <div className={styles.checkoutSkeletonStepText} />
              </div>
            </div>
          </header>

          <div className={styles.layout}>
            <div className={styles.mainCol}>
              <div className={styles.checkoutSkeletonCard}>
                <div className={styles.checkoutSkeletonCardHeader}>
                  <div className={styles.checkoutSkeletonHeaderLeft}>
                    <div className={styles.checkoutSkeletonBadge} />
                    <div className={styles.checkoutSkeletonHeaderText}>
                      <div className={styles.checkoutSkeletonLineMd} />
                      <div className={styles.checkoutSkeletonLineXs} />
                    </div>
                  </div>
                  <div className={styles.checkoutSkeletonButton} />
                </div>
                <div className={styles.checkoutSkeletonMedia} />
                <div className={styles.checkoutSkeletonStats}>
                  <div className={styles.checkoutSkeletonStat} />
                  <div className={styles.checkoutSkeletonStat} />
                  <div className={styles.checkoutSkeletonStat} />
                </div>
              </div>

              <div className={styles.checkoutSkeletonCard}>
                <div className={styles.checkoutSkeletonCardHeader}>
                  <div className={styles.checkoutSkeletonHeaderLeft}>
                    <div className={styles.checkoutSkeletonBadge} />
                    <div className={styles.checkoutSkeletonHeaderText}>
                      <div className={styles.checkoutSkeletonLineMd} />
                      <div className={styles.checkoutSkeletonLineXs} />
                    </div>
                  </div>
                  <div className={styles.checkoutSkeletonButton} />
                </div>
                <div className={styles.checkoutSkeletonItinerary} />
                <div className={styles.checkoutSkeletonItinerary} />
              </div>
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.checkoutSkeletonSummary}>
                <div className={styles.checkoutSkeletonSummaryHeader}>
                  <div className={styles.checkoutSkeletonSummaryIcon} />
                  <div className={styles.checkoutSkeletonSummaryText}>
                    <div className={styles.checkoutSkeletonLineMd} />
                    <div className={styles.checkoutSkeletonLineXs} />
                  </div>
                </div>
                <div className={styles.checkoutSkeletonSummaryBody}>
                  <div className={styles.checkoutSkeletonRow} />
                  <div className={styles.checkoutSkeletonRow} />
                  <div className={styles.checkoutSkeletonRow} />
                  <div className={styles.checkoutSkeletonTotal} />
                  <div className={styles.checkoutSkeletonCta} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedData) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.serviceCard}>
            <h2 className={styles.serviceTitle}>Unable to load package</h2>
            <p className={styles.serviceMeta}>
              {packageLoadError || "No active package found for this checkout link."}
            </p>
            <Button mt="md" onClick={() => router.push("/")}>
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const convertToNumber = (amount, fromCurrency) => {
    if (!amount) return 0;
    if (!fromCurrency || currency === fromCurrency || !rates[fromCurrency] || !rates[currency]) {
      return Number(amount);
    }
    const conversion = ConvertPrice(amount, fromCurrency, currency, rates);
    return parseFloat(conversion.newprice);
  };

  const handlePriceConversion = (amount, fromCurrency) => {
    const converted = convertToNumber(amount, fromCurrency);
    const displayCurrency = (fromCurrency && rates[fromCurrency] && rates[currency]) ? currency : (fromCurrency || currency);
    return displayCurrency + ' ' + converted.toFixed(2);
  };

  const calculatedTotal = (
    (selectedData.hotel ? convertToNumber(packagePricing.hotelPrice, packagePricing.hotelCurrency) : 0) +
    (selectedData.flight ? convertToNumber(packagePricing.flightPrice, packagePricing.flightCurrency) : 0) +
    (selectedData.transfer ? convertToNumber(packagePricing.transferPrice, packagePricing.transferCurrency) : 0)
  ).toFixed(2);

  const hotelNights = selectedData?.hotel?.hotelData
    ? moment(selectedData.hotel.hotelData.checkOut).diff(moment(selectedData.hotel.hotelData.checkIn), 'days')
    : 0;

  const getLegBadgeClass = (label, idx) => {
    if (selectedData.flight?.trip_type === 'multicity') return styles.flightLegBadgeMulti;
    if (idx === 0 || label === 'Departure') return styles.flightLegBadgeOut;
    return styles.flightLegBadgeReturn;
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerBrand}>
              <div className={styles.headerIcon}>
                <FaSuitcaseRolling />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Your Holiday Package</h1>
                <p className={styles.headerSubtitle}>
                  Review your services, then confirm guest details to complete booking
                </p>
              </div>
            </div>
          </div>

          <div className={styles.stepper} aria-label="Checkout progress">
            <div className={`${styles.step} ${showGuestInfo === 1 ? styles.stepActive : styles.stepDone}`}>
              <div className={styles.stepNum}>{showGuestInfo > 1 ? "✓" : "1"}</div>
              <div className={styles.stepLabel}>
                <span className={styles.stepLabelTitle}>Review Package</span>
                <span className={styles.stepLabelHint}>Confirm selected services</span>
              </div>
            </div>
            <div className={`${styles.stepConnector} ${showGuestInfo > 1 ? styles.stepConnectorActive : ""}`}>
              <div className={styles.stepConnectorFill} />
            </div>
            <div className={`${styles.step} ${showGuestInfo === 2 ? styles.stepActive : ""}`}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepLabel}>
                <span className={styles.stepLabelTitle}>Guest Details</span>
                <span className={styles.stepLabelHint}>Traveller information</span>
              </div>
            </div>
          </div>

          {checkoutExpiresAt && (
            <div className={styles.checkoutTimerWrap}>
              <CheckoutTimer
                expiresAt={checkoutExpiresAt}
                ttlMinutes={checkoutTtlMinutes}
                onExpire={handleCheckoutExpire}
                packageData={selectedData}
                onGoToSearch={handleTimerGoToSearch}
              />
            </div>
          )}
        </header>

        <div className={styles.layout}>
          <div className={styles.mainCol}>
            {showGuestInfo === 1 ? (
              <>
                {/* Hotel Section */}
                {selectedData.hotel && (
                  <section className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div className={styles.serviceHeaderLeft}>
                        <div className={styles.serviceIconBadge}>
                          <FaHotel />
                        </div>
                        <div>
                          <h2 className={styles.serviceTitle}>Hotel</h2>
                          <p className={styles.serviceMeta}>Accommodation details</p>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        className={styles.changeBtn}
                        leftSection={<FaEdit />}
                        onClick={() => handleChangeService("hotel")}
                      >
                        Edit
                      </Button>
                    </div>

                    <div className={styles.serviceBody}>
                      {selectedData?.hotel?.hotelData?.main_images?.length !== 0 && selectedData?.hotel?.hotelData?.main_images?.[0]?.url ? (
                        <div className={styles.hotelMedia}>
                          <Image
                            fill
                            sizes="(max-width: 768px) 100vw, 700px"
                            className={styles.hotelImage}
                            src={selectedData?.hotel?.hotelData?.main_images[0]?.url}
                            alt={selectedData?.hotel?.hotelData?.hotel_name}
                          />
                          <div className={styles.hotelOverlay} />
                          {selectedData?.hotel?.hotelData?.city && (
                            <div className={styles.hotelCityBadge}>{selectedData?.hotel?.hotelData?.city}</div>
                          )}
                          <div className={styles.hotelFooter}>
                            <h3 className={styles.hotelName}>{selectedData?.hotel?.hotelData?.hotel_name}</h3>
                            {selectedData?.hotel?.hotelData?.address && (
                              <div className={styles.hotelAddress}>
                                <FaLocationDot size={14} className={styles.hotelAddressIcon} />
                                <span>{selectedData?.hotel?.hotelData?.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.hotelPlaceholder}>
                          {selectedData?.hotel?.hotelData?.city && (
                            <div className={styles.hotelCityBadge}>{selectedData?.hotel?.hotelData?.city}</div>
                          )}
                          <div className={styles.hotelPlaceholderIcon}>
                            <FaHotel />
                          </div>
                          <h3 className={styles.hotelPlaceholderName}>{selectedData?.hotel?.hotelData?.hotel_name}</h3>
                        </div>
                      )}

                      <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                          <RiCalendarCheckLine size={18} className={styles.statIcon} />
                          <div>
                            <div className={styles.statLabel}>Check-in</div>
                            <div className={styles.statValue}>{moment(selectedData?.hotel?.hotelData?.checkIn).format('DD MMM YYYY')}</div>
                          </div>
                        </div>
                        <div className={styles.statItem}>
                          <RiCalendarCloseLine size={18} className={styles.statIcon} />
                          <div>
                            <div className={styles.statLabel}>Check-out</div>
                            <div className={styles.statValue}>{moment(selectedData?.hotel?.hotelData?.checkOut).format('DD MMM YYYY')}</div>
                          </div>
                        </div>
                        <div className={styles.statItem}>
                          <IoMoonOutline size={18} className={styles.statIcon} />
                          <div>
                            <div className={styles.statLabel}>Nights</div>
                            <div className={styles.statValue}>
                              {hotelNights} {hotelNights === 1 ? 'Night' : 'Nights'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedData?.hotel?.selectedRoom?.length > 0 && (
                        <div className={styles.roomsBlock}>
                          <div className={styles.roomsLabel}>
                            <IoBedOutline size={14} /> Room Types
                          </div>
                          <div className={styles.roomsRow}>
                            {selectedData?.hotel?.hotelData?.rooms
                              ?.filter(item => selectedData?.hotel?.selectedRoom.some(room => room?.roomId === item.id))
                              .map((item, index) => (
                                <div key={index}>
                                  {item?.rates
                                    ?.filter(rate => selectedData?.hotel?.selectedRoom.some(room => room?.ratekey === rate.rate_key))
                                    .map((rateItem, rateIndex) => (
                                      <span key={rateIndex} className={styles.roomChip}>
                                        {item.name} ({rateItem.board_name})
                                      </span>
                                    ))}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Flight Section */}
                {selectedData.flight && (
                  <section className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div className={styles.serviceHeaderLeft}>
                        <div className={`${styles.serviceIconBadge} ${styles.serviceIconBadgeFlight}`}>
                          <FaPlane />
                        </div>
                        <div>
                          <h2 className={styles.serviceTitle}>Flight</h2>
                          <p className={styles.serviceMeta}>Itinerary overview</p>
                        </div>
                      </div>
                      <div className={styles.flightHeaderActions}>
                        <FlightDetail flightdata={selectedData.flight} />
                        <Button
                          size="xs"
                          className={styles.changeBtn}
                          leftSection={<FaEdit />}
                          onClick={() => handleChangeService("flight")}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className={styles.serviceBody}>
                      {groupSegments(selectedData.flight).map((group, idx) => {
                        const firstSegment = group.segments[0];
                        const lastSegment = group.segments[group.segments.length - 1];
                        const totalTime = group.segments.reduce((acc, seg, segIdx) => {
                          let time = acc + seg.duration;
                          const nextSeg = group.segments[segIdx + 1];
                          if (nextSeg) {
                            time += moment(nextSeg.departure.datetime).diff(moment(seg.arrival.datetime), 'minutes');
                          }
                          return time;
                        }, 0);
                        const airlineData = airline.find((a) => a.iata === firstSegment.airline.code);

                        return (
                          <div key={idx} className={styles.flightLeg}>
                            <div className={styles.flightLegTop}>
                              <span className={`${styles.flightLegBadge} ${getLegBadgeClass(group.label, idx)}`}>
                                {group.label}
                              </span>
                              <span className={styles.flightLegDate}>
                                {moment(firstSegment.departure.datetime).format('ll')}
                              </span>
                            </div>

                            <div className={styles.flightRow}>
                              <div className={styles.airlineBlock}>
                                {firstSegment.airline?.logo_url ? (
                                  <Image
                                    src={firstSegment.airline.logo_url}
                                    height={34}
                                    width={34}
                                    quality={50}
                                    className={styles.airlineLogo}
                                    alt={firstSegment.airline.code + '-' + idx}
                                  />
                                ) : airlineData?.logo ? (
                                  <Image
                                    src={airlineData.logo}
                                    height={34}
                                    width={34}
                                    quality={50}
                                    className={styles.airlineLogo}
                                    alt={airlineData.icao + '-' + idx}
                                  />
                                ) : null}
                                <div style={{ minWidth: 0 }}>
                                  <div className={styles.airlineName}>
                                    {firstSegment.airline.name || airlineData?.name || firstSegment.airline.code}
                                  </div>
                                  <div className={styles.airlineCabin}>
                                    {firstSegment.cabin_class?.name || 'Economy'}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.routeBlock}>
                                <div className={styles.timeBlock}>
                                  <div className={styles.timeValue}>{moment(firstSegment.departure.datetime).format('LT')}</div>
                                  <div className={styles.airportCode}>{firstSegment.departure.airport_code}</div>
                                </div>
                                <div className={styles.routeLine}>
                                  <div className={styles.routeTrack}>
                                    <span className={styles.routePlane}><IoAirplaneSharp /></span>
                                  </div>
                                  <div className={styles.routeStops}>
                                    {group.segments.length === 1 && group.segments[0].stops === 0
                                      ? 'Direct'
                                      : `${group.segments.length - 1} ${group.segments.length - 1 === 1 ? 'stop' : 'stops'}`}
                                  </div>
                                </div>
                                <div className={styles.timeBlock}>
                                  <div className={styles.timeValue}>{moment(lastSegment.arrival.datetime).format('LT')}</div>
                                  <div className={styles.airportCode}>{lastSegment.arrival.airport_code}</div>
                                </div>
                              </div>

                              <div className={styles.durationBlock}>
                                <div className={styles.durationLabel}>Duration</div>
                                <div className={styles.durationValue}>
                                  {Math.floor(totalTime / 60)}h {totalTime % 60}m
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Transfer Section */}
                {selectedData.transfer && (
                  <section className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div className={styles.serviceHeaderLeft}>
                        <div className={`${styles.serviceIconBadge} ${styles.serviceIconBadgeTransfer}`}>
                          <FaCar />
                        </div>
                        <div>
                          <h2 className={styles.serviceTitle}>Transfer</h2>
                          <p className={styles.serviceMeta}>Ground transportation</p>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        className={styles.changeBtn}
                        leftSection={<FaEdit />}
                        onClick={() => handleChangeService("transfer")}
                      >
                        Edit
                      </Button>
                    </div>

                    <div className={styles.serviceBody}>
                      <div className={styles.transferGrid}>
                        {selectedData.transfer.vehicle_image && (
                          <div className={styles.transferImageWrap}>
                            <Image
                              src={selectedData.transfer.vehicle_image}
                              height={220}
                              width={220}
                              quality={100}
                              className={styles.transferImage}
                              alt={selectedData.transfer.vehicle_details.name}
                            />
                          </div>
                        )}
                        <div>
                          <h3 className={styles.transferName}>
                            {selectedData.transfer.vehicle_details.name}
                          </h3>
                          <p className={styles.transferDesc}>
                            {selectedData.transfer.vehicle_details?.vehicle_description}
                          </p>
                          <div className={styles.transferSpecs}>
                            <span className={styles.specChip}>
                              <GoPerson /> Pax: 1 - {selectedData.transfer.vehicle_details.passenger_capacity}
                            </span>
                            <span className={styles.specChip}>
                              <PiSuitcaseRolling /> Luggage: {selectedData.transfer.vehicle_details?.luggage_capacity}
                            </span>
                            <span className={styles.specChip}>
                              <GiGearStickPattern /> {selectedData.transfer.vehicle_details?.transmission_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : sessionExpired ? (
              <div className={styles.expiredActions}>
                <Button
                  size="lg"
                  onClick={handleTimerGoToSearch}
                  className={styles.proceedBtn}
                >
                  Search packages again
                </Button>
              </div>
            ) : (
              <GuestInformation
                packageConfig={packageConfig}
                Selectedcurrency={currency}
                calculatedTotal={calculatedTotal}
                selectedData={selectedData}
                packagePricing={packagePricing}
                onBack={() => setShowGuestInfo(1)}
              />
            )}
          </div>

          {/* Price Summary Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.priceSummary}>
              <div className={styles.priceSummaryHeader}>
                <div className={styles.priceSummaryHeaderInner}>
                  <div className={styles.priceSummaryHeaderIcon}>
                    <FaSuitcaseRolling />
                  </div>
                  <div>
                    <h4 className={styles.priceSummaryTitle}>Price Summary</h4>
                    <p className={styles.priceSummarySubtitle}>Your selected services</p>
                  </div>
                </div>
              </div>

              <div className={styles.priceSummaryBody}>
                {selectedData.hotel && (
                  <div className={styles.priceRow}>
                    <div className={styles.priceRowLeft}>
                      <div className={styles.priceRowIconWrap}><FaHotel /></div>
                      <span className={styles.priceRowLabel}>Hotel</span>
                    </div>
                    <span className={styles.priceRowValue}>
                      {handlePriceConversion(packagePricing.hotelPrice, packagePricing.hotelCurrency)}
                    </span>
                  </div>
                )}

                {selectedData.flight && (
                  <div className={styles.priceRow}>
                    <div className={styles.priceRowLeft}>
                      <div className={styles.priceRowIconWrap}><FaPlane /></div>
                      <span className={styles.priceRowLabel}>Flight</span>
                    </div>
                    <span className={styles.priceRowValue}>
                      {handlePriceConversion(packagePricing.flightPrice, packagePricing.flightCurrency)}
                    </span>
                  </div>
                )}

                {selectedData.transfer && (
                  <div className={styles.priceRow}>
                    <div className={styles.priceRowLeft}>
                      <div className={styles.priceRowIconWrap}><FaCar /></div>
                      <span className={styles.priceRowLabel}>Transfer</span>
                    </div>
                    <span className={styles.priceRowValue}>
                      {handlePriceConversion(packagePricing.transferPrice, packagePricing.transferCurrency)}
                    </span>
                  </div>
                )}

                <hr className={styles.priceDivider} />

                <div className={styles.totalBox}>
                  <span className={styles.totalLabel}>Total Amount</span>
                  <div className={styles.totalValueWrap}>
                    <span className={styles.totalValue}>{currency} {calculatedTotal}</span>
                    <span className={styles.totalNote}>VAT and taxes included</span>
                  </div>
                </div>

                {showGuestInfo === 1 && (
                  <div className={styles.actions}>
                    {sessionExpired ? (
                      <Button
                        fullWidth
                        size="lg"
                        onClick={handleTimerGoToSearch}
                        className={styles.proceedBtn}
                      >
                        Search packages again
                      </Button>
                    ) : (
                      <>
                        <Button
                          fullWidth
                          size="lg"
                          onClick={handleProceedToPayment}
                          loading={isProcessing}
                          className={styles.proceedBtn}
                        >
                          Confirm and Continue
                        </Button>
                        <p className={styles.notChargedNote}>Not charged yet</p>
                      </>
                    )}

                    <Button
                      fullWidth
                      variant="outline"
                      color="red"
                      onClick={clearDataAndRedirect}
                      className={styles.cancelBtn}
                    >
                      Cancel Booking
                    </Button>

                    {!sessionExpired && (
                      <p className={styles.secureNote}>
                        You can still change services before entering guest details
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
