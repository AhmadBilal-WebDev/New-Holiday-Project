function normalizeRooms(originalRequest) {
  if (Array.isArray(originalRequest?.rooms) && originalRequest.rooms.length > 0) {
    return originalRequest.rooms.map((room) => ({
      adults: room.adults,
      children: room.children ?? room.childrenAges?.length ?? 0,
      childrenAges: room.childrenAges || [],
    }));
  }

  const adult = Number(originalRequest?.adult || 2);
  const child = Number(originalRequest?.child || 0);

  return [{ adults: adult, children: child, childrenAges: [] }];
}

export function buildUmrahSearchFromPackage(packageData) {
  const original = packageData?.original_request || {};
  const details = packageData?.details_request_info || {};

  const journey_type = original.journeyType || details.journey_type || "makkahFirst";
  const departure_city = original.departureCity || details.departure_city || "";
  const madinah_nights = original.madinahNights ?? details.madinah_nights ?? "";
  const makkah_nights = original.makkahNights ?? details.makkah_nights ?? "";
  const departure_date = original.departureDate || details.departure_date || "";
  const dateType = original.dateType || details.dateType || "date";
  const flexibleDays = original.flexibleDays || details.flexibleDays;

  const searchList = {
    journey_type,
    departure_city,
    madinah_nights,
    makkah_nights,
    departure_date,
    dateType,
    rooms: normalizeRooms(original),
  };

  if (dateType === "flexible" && flexibleDays) {
    searchList.flexibleDays = flexibleDays;
  }

  const rooms = searchList.rooms || [];
  const adult = rooms.reduce((sum, room) => sum + Number(room.adults || 0), 0);
  const child = rooms.reduce((sum, room) => sum + Number(room.children || 0), 0);

  const queryParams = new URLSearchParams();
  queryParams.set("journey_type", journey_type);
  if (madinah_nights !== "") queryParams.set("madinah_nights", String(madinah_nights));
  if (makkah_nights !== "") queryParams.set("makkah_nights", String(makkah_nights));
  if (departure_city) queryParams.set("departure_city", departure_city);
  if (departure_date) queryParams.set("departure_date", departure_date);
  queryParams.set("adult", String(adult));
  queryParams.set("child", String(child));
  queryParams.set("rooms", String(rooms.length || 1));
  if (dateType === "flexible" && flexibleDays) {
    queryParams.set("flexibleDays", String(flexibleDays));
  }

  return {
    searchList,
    url: `/umrah-getaway/search?${queryParams.toString()}`,
  };
}

export function redirectToUmrahSearch(packageData, router) {
  if (!packageData) {
    router.push("/umrah-getaway/search");
    return;
  }

  const { searchList, url } = buildUmrahSearchFromPackage(packageData);

  if (searchList.departure_city) {
    localStorage.setItem("umrah_getaway_search", JSON.stringify(searchList));
    router.push(url);
    return;
  }

  router.push("/umrah-getaway/search");
}
