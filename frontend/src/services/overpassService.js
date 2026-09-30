/**
 * overpassService.js
 * Sourced directly from OpenStreetMap Overpass API for real EV charging stations
 * Query tag: amenity=charging_station
 * Real data, zero hardcoded fake stations, multi-endpoint fallback.
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Format connector info from OSM tags
 */
function extractConnectors(tags = {}) {
  const connectors = [];

  if (tags["socket:type2_combo"] || tags["socket:type2_combo:output"]) {
    connectors.push("CCS2");
  }
  if (tags["socket:type2"] || tags["socket:type2:output"]) {
    connectors.push("Type 2");
  }
  if (tags["socket:chademo"] || tags["socket:chademo:output"]) {
    connectors.push("CHAdeMO");
  }
  if (tags["socket:gbt"] || tags["socket:gbt:output"]) {
    connectors.push("GB/T");
  }
  if (tags["socket:type1"] || tags["socket:type1:output"]) {
    connectors.push("Type 1");
  }
  if (tags["socket:schuko"]) {
    connectors.push("Standard AC");
  }
  if (tags.connector) {
    connectors.push(tags.connector);
  }

  return connectors.length > 0 ? Array.from(new Set(connectors)).join(" / ") : (tags["socket:type"] || null);
}

/**
 * Extract power in kW from OSM tags
 */
function extractPower(tags = {}) {
  const powerKeys = [
    "charging_station:output",
    "socket:output",
    "power",
    "socket:type2_combo:output",
    "socket:type2:output",
    "socket:chademo:output",
  ];

  for (const k of powerKeys) {
    if (tags[k]) {
      const match = String(tags[k]).match(/([\d.]+)/);
      if (match) return match[1];
    }
  }

  return null;
}

/**
 * Parse strict status:
 * operational -> green
 * non-operational -> red
 * unknown -> gray (never assume unknown = operational)
 */
function determineStatus(tags = {}) {
  const opStatus = (tags.operational_status || tags.status || "").toLowerCase();
  const disused = (tags.disused || "").toLowerCase();
  const abandoned = (tags.abandoned || "").toLowerCase();
  const operational = (tags.operational || "").toLowerCase();

  // Explicit non-operational
  if (
    opStatus === "broken" ||
    opStatus === "out_of_order" ||
    opStatus === "non-operational" ||
    opStatus === "closed" ||
    disused === "yes" ||
    abandoned === "yes" ||
    operational === "no"
  ) {
    return "non-operational";
  }

  // Explicit operational
  if (
    opStatus === "operational" ||
    disused === "no" ||
    abandoned === "no" ||
    operational === "yes"
  ) {
    return "operational";
  }

  // Default to unknown - Do NOT assume unknown = operational
  return "unknown";
}

/**
 * Fetches real charging stations from OpenStreetMap via Overpass API
 * @param {Object} bounds - Leaflet LatLngBounds or { south, west, north, east }
 * @param {AbortSignal} [signal] - Optional abort signal for cancellation
 * @returns {Promise<Array>} Normalized array of real EV stations
 */
export async function fetchChargingStations(bounds, signal) {
  if (!bounds) return [];

  // Extract bounding coordinates
  let south, west, north, east;
  if (typeof bounds.getSouth === "function") {
    south = bounds.getSouth();
    west = bounds.getWest();
    north = bounds.getNorth();
    east = bounds.getEast();
  } else {
    south = bounds.south;
    west = bounds.west;
    north = bounds.north;
    east = bounds.east;
  }

  if (
    south == null ||
    west == null ||
    north == null ||
    east == null ||
    isNaN(south) ||
    isNaN(west) ||
    isNaN(north) ||
    isNaN(east)
  ) {
    return [];
  }

  // Cap bounds to valid geo coordinates
  south = Math.max(-90, Math.min(90, south));
  north = Math.max(-90, Math.min(90, north));
  west = Math.max(-180, Math.min(180, west));
  east = Math.max(-180, Math.min(180, east));

  // Dynamic Overpass query for amenity=charging_station
  const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="charging_station"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});
  way["amenity"="charging_station"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});
  relation["amenity"="charging_station"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});
);
out center tags;`;

  let lastError = null;

  // Try endpoints sequentially
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Accept": "application/json",
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) {
        return [];
      }

      const seenIds = new Set();
      const normalizedStations = [];

      for (const el of data.elements) {
        const id = `osm_${el.type}_${el.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        let lat = el.lat;
        let lng = el.lon;

        if ((lat == null || lng == null) && el.center) {
          lat = el.center.lat;
          lng = el.center.lon;
        }

        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) continue;

        const tags = el.tags || {};
        const name =
          tags.name ||
          tags["name:en"] ||
          (tags.operator ? `${tags.operator} Charging Station` : "") ||
          (tags.brand ? `${tags.brand} EV Point` : "") ||
          "EV Charging Station";

        const operator = tags.operator || tags.brand || tags.network || "Not available";
        const brand = tags.brand || tags.operator || "Not available";
        const capacity = tags.capacity || tags["capacity:charging"] || tags.slots || null;
        const powerVal = extractPower(tags);
        const connectorVal = extractConnectors(tags);
        const accessVal = tags.access ? (tags.access === "yes" ? "Public" : tags.access) : "Public";
        const openingHoursVal = tags.opening_hours || "24/7";

        let feeVal = "Not available";
        if (tags.fee) {
          feeVal = tags.fee === "yes" ? "Paid / Fee applies" : tags.fee === "no" ? "Free" : tags.fee;
        } else if (tags.charge) {
          feeVal = tags.charge;
        }

        const status = determineStatus(tags);

        normalizedStations.push({
          id,
          osmId: el.id,
          osmType: el.type,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          name,
          operator,
          brand,
          capacity: capacity ? `${capacity} vehicles` : "Not available",
          capacityRaw: capacity ? parseInt(capacity, 10) : 4,
          power: powerVal ? `${powerVal} kW` : "Not available",
          powerKw: powerVal ? parseFloat(powerVal) : 50,
          connector: connectorVal || "Not available",
          access: accessVal,
          openingHours: openingHoursVal,
          fee: feeVal,
          status, // "operational" | "non-operational" | "unknown"
          isExternal: true,
          source: "OpenStreetMap",
          city: tags["addr:city"] || tags["addr:suburb"] || tags["addr:district"] || "",
          address:
            tags["addr:full"] ||
            [tags["addr:street"], tags["addr:housenumber"], tags["addr:postcode"]]
              .filter(Boolean)
              .join(", ") ||
            tags["addr:city"] ||
            "",
          rawTags: tags,
        });
      }

      return normalizedStations;
    } catch (err) {
      if (err.name === "AbortError") {
        throw err; // Forward abort to caller
      }
      lastError = err;
      console.warn(`[Overpass] Endpoint ${endpoint} failed, trying next fallback:`, err.message);
    }
  }

  // If all public endpoints failed, throw so the caller knows and can show UI error
  throw lastError || new Error("All Overpass endpoints failed");
}

export default {
  fetchChargingStations,
};
