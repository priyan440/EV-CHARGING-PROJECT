import { query, transaction } from "../config/db.js";
import axios from "axios";
import {
  computeDynamicPrice,
  DEFAULT_PRICING_RULE,
  normalizeTimeString,
} from "../utils/pricingCalculator.js";

// In-memory cache for Open Charge Map API (15-min TTL)
let ocmCache = { data: null, timestamp: 0 };
const OCM_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Helper to fetch Open Charge Map API India stations
 */
export async function fetchExternalStations(params = {}) {
  const now = Date.now();
  const apiKey = process.env.OPEN_CHARGE_MAP_API_KEY || "0a82895f-4c3b-4d9b-a73e-d273cc0aea38";

  const isCustomQuery = params.latitude || params.boundingbox || params.search;
  if (!isCustomQuery && ocmCache.data && now - ocmCache.timestamp < OCM_CACHE_TTL_MS) {
    return ocmCache.data;
  }

  try {
    const ocmUrl = "https://api.openchargemap.io/v3/poi/";
    const queryParams = {
      output: "json",
      countrycode: "IN",
      maxresults: params.maxresults || 150,
      compact: true,
      verbose: false,
    };

    if (params.latitude && params.longitude) {
      queryParams.latitude = params.latitude;
      queryParams.longitude = params.longitude;
      queryParams.distance = params.distance || 50;
      queryParams.distanceunit = "KM";
    }

    const response = await axios.get(ocmUrl, {
      params: queryParams,
      timeout: 8000,
      headers: {
        "X-API-Key": apiKey,
        "User-Agent": "VoltChargeEVPlatform/2.0",
      },
    });

    if (Array.isArray(response.data)) {
      const parsed = response.data
        .map((poi) => {
          const addr = poi.AddressInfo || {};
          const connections = poi.Connections || [];
          const connectors = connections.map((conn, idx) => ({
            id: `EXT_CHG_${poi.ID}_${idx}`,
            type: conn.ConnectionType?.Title || "CCS2",
            powerKw: conn.PowerKW || (conn.LevelID === 3 ? 60 : 22),
            status: poi.StatusType?.IsOperational ? "Available" : "Unknown",
            pricePerKwh: 18,
          }));

          const isFast = connectors.some((c) => c.powerKw >= 30 || c.type.includes("CCS"));

          return {
            id: `OCM_${poi.ID}`,
            name: addr.Title || `EV Station ${poi.ID}`,
            operator: poi.OperatorInfo?.Title || "Independent EV Network",
            address: addr.AddressLine1 || addr.Title || "India EV Hub",
            city: addr.Town || addr.StateOrProvince || "India",
            state: addr.StateOrProvince || "Tamil Nadu",
            latitude: addr.Latitude,
            longitude: addr.Longitude,
            status: poi.StatusType?.IsOperational !== false ? "Operational" : "Non-operational",
            isExternal: true,
            chargers: connectors.length > 0 ? connectors : [{ id: `EXT_${poi.ID}`, type: "CCS2", powerKw: 60, status: "Available", pricePerKwh: 18 }],
            isFast,
            rating: 4.8,
            amenities: ["WiFi", "Parking", "Restroom"],
          };
        })
        .filter((s) => s.latitude && s.longitude);

      if (!isCustomQuery) {
        ocmCache.data = parsed;
        ocmCache.timestamp = now;
      }
      return parsed;
    }
  } catch (err) {
    console.warn("External OCM fetch notice:", err.message);
  }
  return ocmCache.data || [];
}

/**
 * Format MySQL Station with its slots for React frontend compatibility
 */
/**
 * Format MySQL Station with its slots and dynamic pricing
 */
const formatStationWithSlots = (station, slots = [], pricingRule = null) => {
  const stationSlots = slots.filter((slot) => slot.station_id === station.id);
  const totalSlots = stationSlots.length;
  const availableSlots = stationSlots.filter((s) => s.status === "AVAILABLE").length;

  const chargers = stationSlots.map((s) => ({
    id: s.id,
    slotId: s.id,
    chargerId: `CHG${String(s.id).padStart(4, "0")}`,
    slotNumber: s.slot_number,
    connector: s.charger_type === "DC_FAST" ? "CCS2" : "Type 2",
    type: s.charger_type === "DC_FAST" ? "DC Fast Charging" : "AC Charging",
    chargerType: s.charger_type,
    powerKw: parseFloat(s.power_kw) || 60,
    pricePerKwh: parseFloat(s.price_per_kwh) || 18,
    status: s.status === "AVAILABLE" ? "Available" : s.status === "OCCUPIED" ? "Occupied" : "Reserved",
    rawStatus: s.status,
  }));

  const isFast = chargers.some((c) => c.powerKw >= 30 || c.chargerType === "DC_FAST");
  const basePricePerKwh = chargers.length > 0 ? chargers[0].pricePerKwh : 18.0;

  // Compute live real-time price quote based on current hour and utilization
  const livePriceQuote = computeDynamicPrice({
    basePricePerKwh,
    time: null, // evaluates current local time
    slots: stationSlots,
    rule: pricingRule,
  });

  return {
    id: station.id,
    stationId: `STA${String(station.id).padStart(3, "0")}`,
    ownerId: station.owner_id,
    ownerCounterId: `OWNER${String(station.owner_id).padStart(4, "0")}`,
    name: station.station_name,
    stationName: station.station_name,
    address: station.address,
    city: station.address.split(",").pop()?.trim() || "India",
    latitude: parseFloat(station.latitude),
    longitude: parseFloat(station.longitude),
    contactNumber: station.contact_number,
    phone: station.contact_number,
    totalSlots: totalSlots || station.total_slots || 4,
    availableSlots: availableSlots,
    total_slots: totalSlots || station.total_slots || 4,
    available_slots: availableSlots,
    status: station.status === "ACTIVE" ? "Available" : station.status,
    operationalStatus: station.status,
    rating: 4.9,
    chargers,
    slots: stationSlots,
    isFast,
    isExternal: false,
    amenities: ["Free WiFi", "Coffee Lounge", "Restroom", "CCTV Security"],
    // Dynamic Pricing attributes
    basePricePerKwh,
    pricePerKwh: livePriceQuote.effectivePricePerKwh,
    effectivePricePerKwh: livePriceQuote.effectivePricePerKwh,
    priceBadge: livePriceQuote.badge,
    priceBadgeType: livePriceQuote.badgeType,
    dynamicPricing: livePriceQuote,
    livePriceQuote: livePriceQuote,
    createdAt: station.created_at,
  };
};

/**
 * GET /api/stations
 * Get all stations from MySQL with their slots & dynamic pricing
 */
export const getStations = async (req, res) => {
  try {
    const stations = await query("SELECT * FROM charging_stations ORDER BY id ASC");
    const slots = await query("SELECT * FROM charging_slots ORDER BY id ASC");
    const rules = await query("SELECT * FROM pricing_rules");
    const rulesMap = {};
    rules.forEach((r) => {
      rulesMap[r.station_id] = r;
    });

    const formatted = stations.map((st) => formatStationWithSlots(st, slots, rulesMap[st.id]));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Stations Error:", error);
    res.status(500).json({ success: false, message: "Error fetching stations", error: error.message });
  }
};

const parseStationId = (id) => parseInt(String(id).replace(/\D/g, ""), 10) || parseInt(id, 10);

/**
 * GET /api/stations/:id
 * Get single station by ID with dynamic pricing
 */
export const getStationById = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const stations = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);

    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const slots = await query("SELECT * FROM charging_slots WHERE station_id = ?", [stationId]);
    const rules = await query("SELECT * FROM pricing_rules WHERE station_id = ?", [stationId]);
    const rule = rules.length > 0 ? rules[0] : null;

    const formatted = formatStationWithSlots(stations[0], slots, rule);

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching station", error: error.message });
  }
};

/**
 * GET /api/stations/:id/price-quote?start=&duration=
 * Real-time price quote for station booking
 */
export const getPriceQuote = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { start, time, duration = 45, slotId } = req.query;

    const stations = await query("SELECT id, station_name FROM charging_stations WHERE id = ?", [stationId]);
    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const slots = await query(
      "SELECT id, slot_number, price_per_kwh, status FROM charging_slots WHERE station_id = ?",
      [stationId]
    );

    let baseRate = 18.0;
    if (slotId) {
      const matchedSlot = slots.find((s) => s.id === parseInt(slotId, 10));
      if (matchedSlot) baseRate = parseFloat(matchedSlot.price_per_kwh);
    } else if (slots.length > 0) {
      baseRate = parseFloat(slots[0].price_per_kwh);
    }

    const rules = await query("SELECT * FROM pricing_rules WHERE station_id = ?", [stationId]);
    const rule = rules.length > 0 ? rules[0] : null;

    const quote = computeDynamicPrice({
      basePricePerKwh: baseRate,
      time: start || time,
      slots,
      rule,
    });

    res.json({
      success: true,
      data: {
        stationId,
        stationName: stations[0].station_name,
        durationMinutes: parseFloat(duration) || 45,
        ...quote,
      },
    });
  } catch (err) {
    console.error("Price Quote Error:", err);
    res.status(500).json({ success: false, message: "Failed to compute price quote", error: err.message });
  }
};

/**
 * GET /api/stations/:id/pricing-rules
 * Get pricing rules for station
 */
export const getPricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const rules = await query("SELECT * FROM pricing_rules WHERE station_id = ?", [stationId]);

    if (rules.length > 0) {
      return res.json({ success: true, data: rules[0] });
    }

    res.json({
      success: true,
      data: {
        station_id: stationId,
        ...DEFAULT_PRICING_RULE,
      },
    });
  } catch (err) {
    console.error("Get Pricing Rules Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch pricing rules", error: err.message });
  }
};

/**
 * PUT /api/stations/:id/pricing-rules
 * Update dynamic pricing rules for owner's station
 */
export const updatePricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const ownerId = req.user.id;

    if (req.user.role !== "ADMIN") {
      const station = await query(
        "SELECT id FROM charging_stations WHERE id = ? AND owner_id = ?",
        [stationId, ownerId]
      );
      if (!station || station.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to modify pricing rules for this station.",
        });
      }
    }

    const {
      peak_start = "18:00:00",
      peak_end = "21:00:00",
      peak_multiplier = 1.25,
      offpeak_discount = 0.15,
      utilization_threshold = 0.75,
      max_multiplier = 1.50,
    } = req.body;

    await query(
      `INSERT INTO pricing_rules 
       (station_id, peak_start, peak_end, peak_multiplier, offpeak_discount, utilization_threshold, max_multiplier)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       peak_start = VALUES(peak_start),
       peak_end = VALUES(peak_end),
       peak_multiplier = VALUES(peak_multiplier),
       offpeak_discount = VALUES(offpeak_discount),
       utilization_threshold = VALUES(utilization_threshold),
       max_multiplier = VALUES(max_multiplier)`,
      [
        stationId,
        normalizeTimeString(peak_start),
        normalizeTimeString(peak_end),
        parseFloat(peak_multiplier),
        parseFloat(offpeak_discount),
        parseFloat(utilization_threshold),
        parseFloat(max_multiplier),
      ]
    );

    const updated = await query("SELECT * FROM pricing_rules WHERE station_id = ?", [stationId]);

    res.json({
      success: true,
      message: "Pricing rules updated successfully!",
      data: updated[0],
    });
  } catch (err) {
    console.error("Update Pricing Rules Error:", err);
    res.status(500).json({ success: false, message: "Failed to update pricing rules", error: err.message });
  }
};

/**
 * GET /api/stations/owner/my-stations
 * Get stations owned by authenticated Station Owner
 */
export const getMyStations = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const stations = await query("SELECT * FROM charging_stations WHERE owner_id = ? ORDER BY id ASC", [ownerId]);
    const slots = await query(
      "SELECT cs.* FROM charging_slots cs JOIN charging_stations s ON cs.station_id = s.id WHERE s.owner_id = ?",
      [ownerId]
    );

    const formatted = stations.map((st) => formatStationWithSlots(st, slots));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching owner stations", error: error.message });
  }
};

/**
 * POST /api/stations
 * Create new charging station
 */
export const createStation = async (req, res) => {
  try {
    const ownerId = req.user.role === "ADMIN" && req.body.owner_id ? req.body.owner_id : req.user.id;
    const {
      station_name,
      stationName,
      name,
      address,
      latitude,
      longitude,
      contact_number,
      contactNumber,
      phone,
      slots = [],
      total_slots,
    } = req.body;

    const cleanName = station_name || stationName || name;
    if (!cleanName || !cleanName.trim()) {
      return res.status(400).json({ success: false, message: "Station name is required." });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: "Station address is required." });
    }

    const cleanLat = parseFloat(latitude) || 13.0827;
    const cleanLng = parseFloat(longitude) || 80.2707;
    const cleanContact = contact_number || contactNumber || phone || "+91 98401 23456";

    const result = await transaction(async (connection) => {
      const [stationResult] = await connection.execute(
        `INSERT INTO charging_stations 
         (owner_id, station_name, address, latitude, longitude, contact_number, total_slots, available_slots, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [ownerId, cleanName.trim(), address.trim(), cleanLat, cleanLng, cleanContact, slots.length || total_slots || 4, slots.length || total_slots || 4]
      );
      const newStationId = stationResult.insertId;

      // If slots are provided, insert them
      if (Array.isArray(slots) && slots.length > 0) {
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          await connection.execute(
            `INSERT INTO charging_slots (station_id, slot_number, charger_type, power_kw, price_per_kwh, status)
             VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
            [
              newStationId,
              s.slot_number || `BAY-0${i + 1}`,
              s.charger_type || "DC_FAST",
              parseFloat(s.power_kw) || 60,
              parseFloat(s.price_per_kwh) || 18,
            ]
          );
        }
      } else {
        // Default 4 initial slots
        const defaultSlots = [
          { number: "BAY-01", type: "DC_FAST", power: 60, price: 18 },
          { number: "BAY-02", type: "DC_FAST", power: 120, price: 22 },
          { number: "BAY-03", type: "AC", power: 22, price: 14 },
          { number: "BAY-04", type: "AC", power: 11, price: 12 },
        ];
        for (const s of defaultSlots) {
          await connection.execute(
            `INSERT INTO charging_slots (station_id, slot_number, charger_type, power_kw, price_per_kwh, status)
             VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
            [newStationId, s.number, s.type, s.power, s.price]
          );
        }
      }

      return newStationId;
    });

    const createdStation = await query("SELECT * FROM charging_stations WHERE id = ?", [result]);
    const createdSlots = await query("SELECT * FROM charging_slots WHERE station_id = ?", [result]);

    res.status(201).json({
      success: true,
      message: "Charging station created successfully!",
      data: formatStationWithSlots(createdStation[0], createdSlots),
    });
  } catch (error) {
    console.error("Create Station Error:", error);
    res.status(500).json({ success: false, message: "Error creating station.", error: error.message });
  }
};

/**
 * PUT /api/stations/:id
 * Update charging station
 */
export const updateStation = async (req, res) => {
  try {
    const stationId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const existing = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    if (!isAdmin && existing[0].owner_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this station." });
    }

    const {
      station_name,
      stationName,
      address,
      latitude,
      longitude,
      contact_number,
      contactNumber,
      status,
    } = req.body;

    const cleanName = station_name || stationName || existing[0].station_name;
    const cleanAddress = address || existing[0].address;
    const cleanLat = latitude ? parseFloat(latitude) : existing[0].latitude;
    const cleanLng = longitude ? parseFloat(longitude) : existing[0].longitude;
    const cleanContact = contact_number || contactNumber || existing[0].contact_number;
    const cleanStatus = status || existing[0].status;

    await query(
      `UPDATE charging_stations 
       SET station_name = ?, address = ?, latitude = ?, longitude = ?, contact_number = ?, status = ?
       WHERE id = ?`,
      [cleanName, cleanAddress, cleanLat, cleanLng, cleanContact, cleanStatus, stationId]
    );

    const updated = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);
    const slots = await query("SELECT * FROM charging_slots WHERE station_id = ?", [stationId]);

    res.json({
      success: true,
      message: "Station updated successfully!",
      data: formatStationWithSlots(updated[0], slots),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station", error: error.message });
  }
};

/**
 * DELETE /api/stations/:id
 * Delete charging station
 */
export const deleteStation = async (req, res) => {
  try {
    const stationId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const existing = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }

    if (!isAdmin && existing[0].owner_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this station." });
    }

    await query("DELETE FROM charging_stations WHERE id = ?", [stationId]);

    res.json({ success: true, message: "Charging station deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting station", error: error.message });
  }
};

/**
 * GET /api/ev-stations & /api/stations/external
 * Open Charge Map external stations API
 */
export const getExternalStations = async (req, res) => {
  try {
    const data = await fetchExternalStations(req.query);
    res.json({
      success: true,
      count: data.length,
      source: "Open Charge Map API (countrycode=IN)",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching external stations", error: error.message });
  }
};

export default {
  getStations,
  getStationById,
  getMyStations,
  createStation,
  updateStation,
  deleteStation,
  getExternalStations,
  getPriceQuote,
  getPricingRules,
  updatePricingRules,
};
