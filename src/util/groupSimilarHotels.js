function normalizeHotelName(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeCoords(hotel) {
  const lat = Number(hotel?.location?.latitude);
  const lng = Number(hotel?.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function getHotelNumericPrice(hotel) {
  const n = Number(hotel?.price);
  return Number.isFinite(n) ? n : Infinity;
}

export function groupSimilarHotels(hotels) {
  if (!Array.isArray(hotels) || hotels.length === 0) return [];

  const n = hotels.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  const union = (a, b) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pb] = pa;
  };

  const nameIndex = new Map();
  const coordIndex = new Map();

  for (let i = 0; i < n; i++) {
    const nameKey = normalizeHotelName(hotels[i]?.name);
    if (nameKey) {
      if (nameIndex.has(nameKey)) union(nameIndex.get(nameKey), i);
      else nameIndex.set(nameKey, i);
    }

    const coordKey = normalizeCoords(hotels[i]);
    if (coordKey) {
      if (coordIndex.has(coordKey)) union(coordIndex.get(coordKey), i);
      else coordIndex.set(coordKey, i);
    }
  }

  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root).push(hotels[i]);
  }

  const pickCheapest = (list) =>
    list.reduce((min, hotel) => (
      getHotelNumericPrice(hotel) < getHotelNumericPrice(min) ? hotel : min
    ), list[0]);

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, group]) => {
      // Prefer custom provider; otherwise show the cheapest third-party rate only.
      const customHotels = group.filter(
        (hotel) => hotel?.provider?.toLowerCase?.() === 'custom'
      );
      return customHotels.length > 0 ? pickCheapest(customHotels) : pickCheapest(group);
    });
}
