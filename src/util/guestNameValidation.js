export const DUPLICATE_NAME_MESSAGE =
  "Same name cannot be used for multiple guests.";

/**
 * Returns indices of guests whose first + last name both match another guest.
 * Empty names are skipped (required-field validation covers those).
 */
export function findDuplicateNameIndices(guests = []) {
  const nameToIndices = new Map();

  guests.forEach((guest, index) => {
    const first = (guest?.firstName || "").trim();
    const last = (guest?.lastName || "").trim();
    if (!first || !last) return;

    const key = `${first.toLowerCase()}|${last.toLowerCase()}`;
    if (!nameToIndices.has(key)) {
      nameToIndices.set(key, []);
    }
    nameToIndices.get(key).push(index);
  });

  const duplicates = new Set();
  for (const indices of nameToIndices.values()) {
    if (indices.length > 1) {
      indices.forEach((i) => duplicates.add(i));
    }
  }
  return duplicates;
}
