/**
 * geocodingService.js
 * OpenStreetMap Nominatim geocoding service for EV search
 * Free, keyless, reliable location searches
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Searches locations using OpenStreetMap Nominatim
 * @param {string} query - City, area, or station keyword
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Array>} List of geocoded locations
 */
export async function searchLocation(query, signal) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();
  const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
    cleanQuery
  )}&limit=6&addressdetails=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Nominatim HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      id: item.place_id,
      name: item.name || item.display_name.split(",")[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      class: item.class,
    }));
  } catch (err) {
    if (err.name === "AbortError") {
      return [];
    }
    console.warn("[Geocoding] Nominatim search failed:", err.message);
    return [];
  }
}

/**
 * Reverse geocodes latitude and longitude into human-readable city/area
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return "Current Location";

  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "Current Location";
    const data = await res.json();
    const addr = data.address || {};
    return addr.city || addr.town || addr.village || addr.suburb || addr.state || "Current Location";
  } catch {
    return "Current Location";
  }
}

export default {
  searchLocation,
  reverseGeocode,
};
