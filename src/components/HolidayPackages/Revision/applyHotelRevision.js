import { buildHotelRevisionPayload } from './buildHotelRevisionPayload';

/**
 * POST /api/holiday-packages/revise/apply
 */
export async function applyHotelRevision({
  packageId,
  hotelDetail,
  roomList,
  selectedRooms,
  checkRatesData,
  reviseContext,
  packageCurrency,
  rates = {},
}) {
  const payload = buildHotelRevisionPayload({
    packageId,
    hotelDetail,
    roomList,
    selectedRooms,
    checkRatesData,
    reviseContext,
    packageCurrency,
    rates,
  });

  if (!payload.package_id) {
    return {
      success: false,
      message: 'Package ID missing. Please refresh and try again.',
    };
  }

  if (!payload.selected_room_units?.length) {
    return {
      success: false,
      message: 'Please select at least one room to continue.',
    };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/holiday-packages/revise/apply`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({...payload}),
      }
    );
    const data = await response.json().catch(() => null);
    const status = String(data?.Content?.status || '').trim().toLowerCase();

    if (status === 'expired') {
      return {
        success: false,
        expired: true,
        message:
          data?.Content?.message
          || data?.Description
          || data?.Title
          || 'Session expired. Please search again.',
        data,
      };
    }

    if (!response.ok || data?.Success === false || data?.success === false) {
      return {
        success: false,
        message:
          data?.Content?.message
          || data?.Description
          || data?.message
          || data?.Title
          || 'Failed to apply hotel revision. Please try again.',
        data,
      };
    }

    return { success: true, data, payload };
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Unable to apply hotel revision right now.',
    };
  }
}
