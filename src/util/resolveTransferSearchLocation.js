/**
 * Transfer search API does not resolve bare abbreviated airport-list names
 * (e.g. "King Abdulaziz Intl."). Prefer city when the label looks abbreviated.
 */
export function resolveTransferSearchLocation({ location, city, airportName } = {}) {
  const label = String(location || airportName || "").trim();
  const cityName = String(city || "").trim();
  const isAbbreviatedAirport = /\b(Intl\.?|Arpt\.?)\b/i.test(label);

  if (cityName && (!label || isAbbreviatedAirport)) {
    return cityName;
  }
  return label || cityName || "";
}
