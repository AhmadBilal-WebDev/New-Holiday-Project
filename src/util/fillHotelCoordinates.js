/**
 * Background geocode for hotels missing lat/lng (Places Text Search).
 * Does not block listing — patches React Query cache as coords arrive.
 */

export function hotelNeedsGeocode(hotel) {
  const lat = hotel?.location?.latitude;
  const lng = hotel?.location?.longitude;
  if (lat == null || lng == null) return true;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return Number.isNaN(latNum) || Number.isNaN(lngNum);
}

function hotelCacheKey(hotel) {
  return `${hotel?.provider ?? ''}:${hotel?.id ?? ''}`;
}

function createConcurrencyQueue({ concurrency = 3, signal } = {}) {
  let active = 0;
  const queue = [];

  const pump = () => {
    if (signal?.aborted) {
      queue.length = 0;
      return;
    }
    while (active < concurrency && queue.length) {
      const task = queue.shift();
      active += 1;
      Promise.resolve()
        .then(task)
        .catch(() => {})
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  return (task) => {
    if (signal?.aborted) return;
    queue.push(task);
    pump();
  };
}

/**
 * @returns {(chunk: object[]) => void} enqueue hotels from a stream chunk
 */
export function createHotelCoordinateFiller({
  queryClient,
  queryKey,
  city,
  country,
  signal,
  concurrency = 3,
}) {
  const started = new Set();
  const enqueue = createConcurrencyQueue({ concurrency, signal });

  return (chunk = []) => {
    for (const hotel of chunk) {
      if (!hotel?.id || !hotel?.name || !hotelNeedsGeocode(hotel)) continue;

      const key = hotelCacheKey(hotel);
      if (started.has(key)) continue;
      started.add(key);

      enqueue(async () => {
        if (signal?.aborted) return;

        const res = await fetch('/api/places/hotel-geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: hotel.name,
            city: city || hotel?.location?.city || '',
            country: country || '',
          }),
          signal,
        });

        const data = await res.json();
        if (!data?.success || data.latitude == null || data.longitude == null) return;
        if (signal?.aborted) return;

        queryClient.setQueryData(queryKey, (prev = []) =>
          prev.map((h) => {
            if (hotelCacheKey(h) !== key) return h;
            if (!hotelNeedsGeocode(h)) return h;
            return {
              ...h,
              location: {
                ...(h.location || {}),
                latitude: data.latitude,
                longitude: data.longitude,
                ...(data.formattedAddress && !h.location?.address
                  ? { address: data.formattedAddress }
                  : {}),
              },
            };
          })
        );
      });
    }
  };
}
