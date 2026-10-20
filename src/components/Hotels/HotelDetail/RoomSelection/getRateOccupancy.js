/**
 * Normalize children to check-rates format: [{ age: number }, ...]
 * Accepts [{ age }], plain ages [2], or empty.
 */
export function normalizeChildrenAges(children) {
  if (!Array.isArray(children) || children.length === 0) return [];

  return children
    .map((child) => {
      if (child != null && typeof child === 'object' && 'age' in child) {
        const age = Number(child.age);
        return Number.isFinite(age) ? { age } : null;
      }
      const age = Number(child);
      return Number.isFinite(age) ? { age } : null;
    })
    .filter(Boolean);
}

/**
 * Resolve adults + children for a rate from the rate's own occupancy,
 * matching the correct search_request room (not always rooms[0]).
 */
export function getRateOccupancy(rate) {
  const searchRooms = rate?.metadata?.search_request?.rooms || [];
  const rateAdults =
    rate?.adults != null && rate?.adults !== '' ? Number(rate.adults) : null;
  const rateChildrenCount =
    rate?.children != null && rate?.children !== '' ? Number(rate.children) : null;

  const childCount = (sr) =>
    Array.isArray(sr?.children) ? sr.children.length : Number(sr?.children ?? 0);

  const matched =
    rateAdults != null && rateChildrenCount != null
      ? searchRooms.find(
          (sr) =>
            Number(sr?.adults ?? 0) === rateAdults &&
            childCount(sr) === rateChildrenCount
        )
      : null;

  const matchedByAdults =
    matched ||
    (rateAdults != null
      ? searchRooms.find((sr) => Number(sr?.adults ?? 0) === rateAdults)
      : null);

  return {
    adults: rateAdults ?? Number(matchedByAdults?.adults ?? 2),
    children: normalizeChildrenAges(matchedByAdults?.children),
  };
}
