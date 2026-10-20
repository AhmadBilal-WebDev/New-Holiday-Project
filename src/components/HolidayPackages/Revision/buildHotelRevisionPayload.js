import { ConvertPrice } from '@/components/Currency/ConvertPrice';

function isSameRate(selected, rate) {
  if (selected?.ratekey !== rate?.rate_key) return false;
  const selectedTypeId = selected?.roomTypeId != null && selected.roomTypeId !== ''
    ? String(selected.roomTypeId)
    : null;
  const rateTypeId = rate?.metadata?.room_type_id != null
    ? String(rate.metadata.room_type_id)
    : null;
  if (selectedTypeId && rateTypeId) {
    return selectedTypeId === rateTypeId;
  }
  return true;
}

function findRoomIndex(rooms, selected) {
  return (rooms || []).findIndex((room) => room.id === selected.roomId);
}

function findRateIndex(room, selected) {
  if (!room?.rates) return -1;
  return room.rates.findIndex((rate) => isSameRate(selected, rate));
}

function childrenCount(value) {
  if (Array.isArray(value)) return value.length;
  return Number(value || 0);
}

/**
 * Build holiday-packages revise/apply payload from check-rates + selected rooms.
 */
export function buildHotelRevisionPayload({
  packageId,
  hotelDetail,
  roomList,
  selectedRooms,
  checkRatesData,
  reviseContext,
  packageCurrency,
  rates = {},
}) {
  const checkData = checkRatesData?.data || {};
  const roomsSource = Array.isArray(roomList) && roomList.length
    ? roomList
    : (hotelDetail?.rooms || []);

  const selected_room_units = [];
  const selectedPairs = [];

  (selectedRooms || []).forEach((selected) => {
    const roomIndex = findRoomIndex(roomsSource, selected);
    const room = roomsSource[roomIndex];
    if (!room) return;
    const rateIndex = findRateIndex(room, selected);
    const rate = rateIndex >= 0 ? room.rates[rateIndex] : null;
    if (!rate) return;

    const qty = Number(selected?.qty || 1);
    const unitPrice = Number(rate?.price || 0);
    const roomPrice = unitPrice * qty;
    const roomCurrency = rate?.currency || packageCurrency;
    const { newprice, newcurrency } = ConvertPrice(
      roomPrice,
      roomCurrency,
      packageCurrency || roomCurrency,
      rates
    );

    selectedPairs.push({ roomIndex, rateIndex, selected, room, rate, qty });
    selected_room_units.push({
      rateKey: String(rate?.rate_key || selected?.ratekey || ''),
      roomIndex,
      rateIndex,
      quantity: qty,
      adults: Number(selected?.adults ?? rate?.adults ?? 0),
      children: childrenCount(selected?.children ?? rate?.children),
      price: Number(parseFloat(Number(newprice || 0).toFixed(2))),
      currency: newcurrency || packageCurrency || roomCurrency,
      boardName: rate?.board_name,
      roomType: room?.name || '',
      optionId: rate?.metadata?.optionId,
      roomTypeId: String(selected?.roomTypeId || rate?.metadata?.room_type_id || room?.id || ''),
      boardTypeId: String(selected?.boardTypeId || rate?.metadata?.board_type_id || ''),
    });
  });

  const unitsTotal = selected_room_units.reduce((sum, unit) => sum + Number(unit.price || 0), 0);
  const sourceCurrency = checkData?.currency
    || selected_room_units[0]?.currency
    || packageCurrency;
  const sourcePrice = Number(checkData?.total_net);
  const totalFromCheckRates = Number.isFinite(sourcePrice) && sourcePrice > 0
    ? sourcePrice
    : unitsTotal;
  const { newprice: confirmedPriceRaw, newcurrency: confirmedCurrency } = ConvertPrice(
    totalFromCheckRates,
    Number.isFinite(sourcePrice) && sourcePrice > 0 ? (checkData?.currency || sourceCurrency) : (selected_room_units[0]?.currency || sourceCurrency),
    packageCurrency || sourceCurrency,
    rates
  );
  const confirmedPrice = Number(parseFloat(Number(confirmedPriceRaw || unitsTotal || 0).toFixed(2)));
  const finalCurrency = confirmedCurrency || packageCurrency || sourceCurrency;
  const fromCurrencyForRate = Number.isFinite(sourcePrice) && sourcePrice > 0
    ? (checkData?.currency || sourceCurrency)
    : (selected_room_units[0]?.currency || sourceCurrency);
  const conversionRate =
    fromCurrencyForRate
    && finalCurrency
    && fromCurrencyForRate !== finalCurrency
    && rates?.[fromCurrencyForRate]
    && rates?.[finalCurrency]
    ? Number(rates[finalCurrency]) / Number(rates[fromCurrencyForRate])
    : 1;

  const annotatedRooms = roomsSource.map((hotelRoom, rIdx) => ({
    ...hotelRoom,
    selected_for_package: selectedPairs.some((p) => p.roomIndex === rIdx),
    price_added_to_package: selectedPairs.some((p) => p.roomIndex === rIdx),
    rates: (hotelRoom?.rates || []).map((hotelRate, tIdx) => {
      const match = selectedPairs.find(
        (p) => p.roomIndex === rIdx && p.rateIndex === tIdx
      );
      if (!match) {
        return {
          ...hotelRate,
          selected_for_package: false,
          price_added_to_package: false,
        };
      }

      const checkRate = checkData?.rooms?.[0]?.rates?.[0];
      return {
        ...hotelRate,
        price: Number(
          ConvertPrice(
            Number(hotelRate?.price || 0),
            hotelRate?.currency || sourceCurrency,
            packageCurrency || sourceCurrency,
            rates
          ).newprice
        ),
        currency: finalCurrency,
        board_type: checkRate?.board_type ?? hotelRate?.board_type,
        board_name: checkRate?.board_name ?? hotelRate?.board_name,
        adults: match.selected?.adults ?? checkRate?.adults ?? hotelRate?.adults,
        children: match.selected?.children ?? checkRate?.children ?? hotelRate?.children,
        cancellation_policies:
          checkRate?.cancellation_policies ?? hotelRate?.cancellation_policies,
        payment_type: checkRate?.payment_type ?? hotelRate?.payment_type,
        allotment: checkRate?.allotment ?? hotelRate?.allotment,
        on_request: checkRate?.on_request ?? hotelRate?.on_request,
        taxes: checkRate?.taxes ?? hotelRate?.taxes,
        original_price: Number(hotelRate?.price ?? 0),
        original_currency: hotelRate?.currency || sourceCurrency,
        conversion_rate: conversionRate,
        markup: hotelRate?.markup ?? hotelRate?.metadata?.markup,
        selected_for_package: true,
        price_added_to_package: true,
      };
    }),
  }));

  const hotelId = String(
    checkData?.hotel_code
    || hotelDetail?.hotel_code
    || hotelDetail?.id
    || reviseContext?.hotel?.id
    || reviseContext?.current_hotel?.id
    || ''
  );

  const hotel = {
    ...hotelDetail,
    id: hotelId,
    hotel_code: hotelId,
    name: checkData?.hotel_name || hotelDetail?.hotel_name || hotelDetail?.name || '',
    hotel_name: checkData?.hotel_name || hotelDetail?.hotel_name || hotelDetail?.name || '',
    provider: checkRatesData?.provider || hotelDetail?.provider || reviseContext?.hotel?.provider || '',
    provider_code: hotelId,
    star_rating:
      checkData?.stars
      ?? checkData?.category_code
      ?? hotelDetail?.star_rating
      ?? null,
    images: hotelDetail?.images || hotelDetail?.main_images || [],
    main_images: hotelDetail?.main_images || hotelDetail?.images || [],
    all_images: hotelDetail?.all_images || [],
    address: checkData?.address || hotelDetail?.address || '',
    city:
      checkData?.destination_name
      || hotelDetail?.city
      || reviseContext?.hotel?.city
      || '',
    checkIn: hotelDetail?.checkIn || reviseContext?.check_in || reviseContext?.hotel?.checkIn || null,
    checkOut: hotelDetail?.checkOut || reviseContext?.check_out || reviseContext?.hotel?.checkOut || null,
    check_in: hotelDetail?.checkIn || reviseContext?.check_in || reviseContext?.hotel?.checkIn || null,
    check_out: hotelDetail?.checkOut || reviseContext?.check_out || reviseContext?.hotel?.checkOut || null,
    currency: finalCurrency,
    price: confirmedPrice,
    rooms: annotatedRooms,
    selected_room_id: String(selected_room_units[0]?.rateKey || ''),
    check_rates_request: { data: checkData },
  };

  return {
    package_id: packageId || reviseContext?.package_id || '',
    failed_service: 'hotel',
    hotel,
    selected_room_units,
  };
}
