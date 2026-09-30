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
            connectorId: `EXT_${poi.ID}_C${idx + 1}`,
            slotNumber: `C0${idx + 1}`,
            type: conn.ConnectionType?.Title || "CCS2",
            connector: conn.ConnectionType?.Title || "CCS2",
            connectorType: conn.ConnectionType?.Title || "CCS2",
            powerKw: conn.PowerKW || (conn.LevelID === 3 ? 60 : 22),
            maxPower: conn.PowerKW || (conn.LevelID === 3 ? 60 : 22),
            status: poi.StatusType?.IsOperational ? "Available" : "Unknown",
            pricePerKwh: 18,
          }));

          const isFast = connectors.some((c) => c.powerKw >= 30 || c.type.includes("CCS"));

          return {
            id: `OCM_${poi.ID}`,
            stationId: `OCM_${poi.ID}`,
            name: addr.Title || `EV Station ${poi.ID}`,
            stationName: addr.Title || `EV Station ${poi.ID}`,
            operator: poi.OperatorInfo?.Title || "Independent EV Network",
            address: addr.AddressLine1 || addr.Title || "India EV Hub",
            city: addr.Town || addr.StateOrProvince || "India",
            state: addr.StateOrProvince || "Tamil Nadu",
            latitude: addr.Latitude,
            longitude: addr.Longitude,
            maximumPower: 120,
            maxPower: 120,
            maximumCurrent: 180,
            maxCurrent: 180,
            currentPower: 45,
            currentLoad: 45,
            availablePower: 75,
            currentCurrent: 68,
            status: poi.StatusType?.IsOperational !== false ? "Available" : "Non-operational",
            operationalStatus: poi.StatusType?.IsOperational !== false ? "Available" : "Non-operational",
            isExternal: true,
            chargers: connectors.length > 0 ? connectors : [{ id: `EXT_${poi.ID}`, connectorId: `EXT_${poi.ID}_C1`, slotNumber: "C01", connector: "CCS2", connectorType: "CCS2", type: "CCS2", powerKw: 60, maxPower: 60, status: "Available", pricePerKwh: 18 }],
            connectors: connectors.length > 0 ? connectors : [{ id: `EXT_${poi.ID}`, connectorId: `EXT_${poi.ID}_C1`, slotNumber: "C01", connector: "CCS2", connectorType: "CCS2", type: "CCS2", powerKw: 60, maxPower: 60, status: "Available", pricePerKwh: 18 }],
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
 * Calculate dynamic load from active sessions and confirmed bookings for a station
 */
export const calculateStationDynamicLoad = (station, slots = [], activeBookings = []) => {
  const maxPower = parseFloat(station.max_power) || 120.0;
  const maxCurrent = parseFloat(station.max_current) || 180.0;

  // Filter bookings belonging to this station that are currently active or confirmed for today
  const stationBookings = activeBookings.filter(
    (b) => Number(b.station_id) === Number(station.id) && ["CONFIRMED", "IN_PROGRESS"].includes(b.status)
  );

  // Calculate sum of active charging power
  let activeLoad = 0;
  stationBookings.forEach((b) => {
    const power = parseFloat(b.charging_power) || 25.0;
    activeLoad += power;
  });

  // Also include slots marked OCCUPIED if no explicit booking record
  const occupiedSlots = slots.filter(
    (s) => s.station_id === station.id && s.status === "OCCUPIED"
  );
  if (activeLoad === 0 && occupiedSlots.length > 0) {
    occupiedSlots.forEach((s) => {
      activeLoad += parseFloat(s.power_kw) || 25.0;
    });
  }

  // Ensure active load does not exceed max power
  activeLoad = Math.min(activeLoad, maxPower);
  const availablePower = Math.max(0, maxPower - activeLoad);
  const loadPercentage = maxPower > 0 ? Math.round((activeLoad / maxPower) * 100) : 0;
  const currentCurrent = maxPower > 0 ? Math.round((activeLoad / maxPower) * maxCurrent) : 0;

  return {
    maximumPower: maxPower,
    maxPower,
    maximumCurrent: maxCurrent,
    maxCurrent,
    currentLoad: activeLoad,
    currentPower: activeLoad,
    availablePower,
    availableCapacity: availablePower,
    currentCurrent,
    loadPercentage,
    activeSessions: stationBookings.length || occupiedSlots.length,
  };
};

/**
 * Format MySQL Station with connectors, power management, and dynamic pricing
 */
export const formatStationWithSlots = (station, slots = [], pricingRule = null, activeBookings = []) => {
  const stationSlots = slots.filter((slot) => slot.station_id === station.id);
  const totalSlots = stationSlots.length || station.total_slots || 4;
  const availableSlots = stationSlots.filter((s) => s.status === "AVAILABLE").length;
  const occupiedSlotsCount = totalSlots - availableSlots;

  const powerMetrics = calculateStationDynamicLoad(station, slots, activeBookings);

  const connectors = stationSlots.map((s, idx) => {
    const connectorType = s.connector_type || (s.charger_type === "DC_FAST" ? "CCS2" : "Type 2");
    const connectorId = s.connector_id || `STA${String(station.id).padStart(3, "0")}-C0${idx + 1}`;
    const powerKw = parseFloat(s.power_kw || s.max_power) || 60;
    const pricePerKwh = parseFloat(s.price_per_kwh) || 18;
    const isAvail = s.status === "AVAILABLE";

    return {
      id: s.id,
      slotId: s.id,
      connectorId,
      chargerId: `CHG${String(s.id).padStart(4, "0")}`,
      slotNumber: s.slot_number || `C0${idx + 1}`,
      connector: connectorType,
      connectorType,
      type: s.charger_type === "DC_FAST" ? "DC Fast Charging" : "AC Charging",
      chargerType: s.charger_type,
      powerKw,
      maxPower: powerKw,
      pricePerKwh,
      status: isAvail ? "Available" : s.status === "OCCUPIED" ? "Occupied" : "Reserved",
      rawStatus: s.status,
      isAvailable: isAvail,
    };
  });

  const isFast = connectors.some((c) => c.powerKw >= 30 || c.connectorType.includes("CCS"));
  const basePricePerKwh = connectors.length > 0 ? connectors[0].pricePerKwh : 18.0;

  // Compute live price quote
  const livePriceQuote = computeDynamicPrice({
    basePricePerKwh,
    time: null,
    slots: stationSlots,
    rule: pricingRule,
  });

  let parsedAmenities = ["Free WiFi", "Coffee Lounge", "Restroom", "CCTV Security"];
  try {
    if (station.amenities) {
      parsedAmenities = typeof station.amenities === "string" ? JSON.parse(station.amenities) : station.amenities;
    }
  } catch (e) {
    if (typeof station.amenities === "string") {
      parsedAmenities = station.amenities.split(",").map((a) => a.trim());
    }
  }

  return {
    id: station.id,
    stationId: `STA${String(station.id).padStart(3, "0")}`,
    ownerId: station.owner_id,
    ownerCounterId: `OWNER${String(station.owner_id).padStart(4, "0")}`,
    name: station.station_name,
    stationName: station.station_name,
    address: station.address,
    city: station.city || station.address.split(",").pop()?.trim() || "Chennai",
    state: station.state || "Tamil Nadu",
    pincode: station.pincode || "600001",
    latitude: parseFloat(station.latitude),
    longitude: parseFloat(station.longitude),
    contactNumber: station.contact_number,
    phone: station.contact_number,
    openingTime: station.opening_time || "06:00:00",
    closingTime: station.closing_time || "23:59:00",
    openingHours: `${(station.opening_time || "06:00").slice(0, 5)} - ${(station.closing_time || "23:59").slice(0, 5)}`,
    
    // Power Management Attributes
    ...powerMetrics,

    totalSlots,
    total_slots: totalSlots,
    availableSlots,
    available_slots: availableSlots,
    occupiedConnectors: occupiedSlotsCount,
    network_id: station.network_id || null,
    network_name: station.network_name || "GreenCharge Network",
    networkName: station.network_name || "GreenCharge Network",
    approval_status: station.approval_status || "APPROVED",
    approvalStatus: station.approval_status || "APPROVED",
    status: station.status || "ACTIVE",
    rawStatus: station.status || "ACTIVE",
    operationalStatus: station.status === "ACTIVE" ? "Available" : station.status,
    availabilityStatus: station.status === "ACTIVE" ? "Available" : station.status,
    is_active: Boolean(station.is_active ?? true),
    isActive: Boolean(station.is_active ?? true),
    rating: 4.9,
    image: station.image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    amenities: parsedAmenities,
    
    // Connectors / Chargers
    connectors,
    chargers: connectors,
    slots: stationSlots,
    isFast,
    isExternal: false,

    // Dynamic Pricing attributes
    basePricePerKwh,
    pricePerKwh: livePriceQuote.effectivePricePerKwh,
    effectivePricePerKwh: livePriceQuote.effectivePricePerKwh,
    priceBadge: livePriceQuote.badge,
    priceBadgeType: livePriceQuote.badgeType,
    dynamicPricing: livePriceQuote,
    createdAt: station.created_at,
  };
};

/**
 * GET /api/stations/approved
 * Returns only approved & active stations for public discovery & customer booking
 */
export const getApprovedStations = async (req, res) => {
  try {
    const stations = await query(
      "SELECT * FROM charging_stations WHERE (status = 'ACTIVE' OR approval_status = 'APPROVED' OR is_active = TRUE) AND approval_status != 'REJECTED' AND status != 'INACTIVE' ORDER BY id ASC"
    );
    const slots = await query("SELECT * FROM charging_slots ORDER BY id ASC");
    const rules = await query("SELECT * FROM pricing_rules");
    const activeBookings = await query(
      "SELECT station_id, charging_power, status FROM bookings WHERE status IN ('CONFIRMED', 'IN_PROGRESS')"
    );

    const rulesMap = {};
    rules.forEach((r) => {
      rulesMap[r.station_id] = r;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, slots, rulesMap[st.id], activeBookings)
    );

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Approved Stations Error:", error);
    res.status(500).json({ success: false, message: "Error fetching approved stations", error: error.message });
  }
};

/**
 * GET /api/stations/map
 * Returns lightweight map station marker data for the interactive Live EV Map
 */
export const getStationsMap = async (req, res) => {
  try {
    const stations = await query(
      "SELECT * FROM charging_stations WHERE (status = 'ACTIVE' OR approval_status = 'APPROVED' OR is_active = TRUE) AND approval_status != 'REJECTED' ORDER BY id ASC"
    );
    const slots = await query("SELECT * FROM charging_slots ORDER BY id ASC");

    const mapData = stations.map((st) => {
      const stationSlots = slots.filter((s) => s.station_id === st.id);
      const totalBays = stationSlots.length || st.total_slots || 4;
      const availableBays = stationSlots.filter((s) => s.status === "AVAILABLE").length;
      const occupiedBays = totalBays - availableBays;

      const chargingTypes = Array.from(
        new Set(
          stationSlots.map((s) =>
            s.charger_type === "DC_FAST" ? "DC Fast" : "AC"
          )
        )
      );
      if (chargingTypes.length === 0) chargingTypes.push("DC Fast", "AC");

      let calculatedStatus = "AVAILABLE";
      if (st.status === "MAINTENANCE" || st.approval_status === "SUSPENDED") {
        calculatedStatus = "OFFLINE";
      } else if (availableBays === 0) {
        calculatedStatus = "OCCUPIED";
      } else if (availableBays <= 1) {
        calculatedStatus = "LIMITED";
      } else {
        calculatedStatus = "AVAILABLE";
      }

      let parsedAmenities = ["WiFi", "Parking", "Restroom"];
      try {
        if (st.amenities) {
          parsedAmenities = typeof st.amenities === "string" ? JSON.parse(st.amenities) : st.amenities;
        }
      } catch (e) {}

      return {
        id: st.id,
        stationId: `STA${String(st.id).padStart(3, "0")}`,
        stationName: st.station_name,
        name: st.station_name,
        networkName: st.network_name || "GreenCharge",
        operator: st.network_name || "GreenCharge",
        address: st.address,
        city: st.city || "Chennai",
        state: st.state || "Tamil Nadu",
        pincode: st.pincode || "600001",
        latitude: parseFloat(st.latitude),
        longitude: parseFloat(st.longitude),
        lat: parseFloat(st.latitude),
        lng: parseFloat(st.longitude),
        status: calculatedStatus,
        operationalStatus: st.status || "ACTIVE",
        availableBays,
        totalBays,
        occupiedBays,
        power: `${st.max_power || 120} kW`,
        powerKw: parseFloat(st.max_power || 120),
        chargingTypes,
        connectorTypes: st.connector_types || "CCS2, Type 2",
        pricePerKwh: parseFloat(st.charging_price || 18.0),
        openingHours: st.is_24x7 ? "24x7 Open" : `${(st.opening_time || "06:00").slice(0, 5)} - ${(st.closing_time || "23:00").slice(0, 5)}`,
        rating: 4.9,
        image: st.image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
        amenities: parsedAmenities,
      };
    });

    res.json({
      success: true,
      count: mapData.length,
      data: mapData,
    });
  } catch (error) {
    console.error("Get Map Stations Error:", error);
    res.status(500).json({ success: false, message: "Error fetching map stations", error: error.message });
  }
};

/**
 * GET /api/stations
 * Get all stations from MySQL with dynamic power monitor & connectors
 */
export const getStations = async (req, res) => {
  try {
    const stations = await query("SELECT * FROM charging_stations ORDER BY id ASC");
    const slots = await query("SELECT * FROM charging_slots ORDER BY id ASC");
    const rules = await query("SELECT * FROM pricing_rules");
    const activeBookings = await query(
      "SELECT station_id, charging_power, status FROM bookings WHERE status IN ('CONFIRMED', 'IN_PROGRESS')"
    );

    const rulesMap = {};
    rules.forEach((r) => {
      rulesMap[r.station_id] = r;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, slots, rulesMap[st.id], activeBookings)
    );

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
 * Get single station by ID with full power monitor & connectors
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
    const activeBookings = await query(
      "SELECT station_id, charging_power, status FROM bookings WHERE station_id = ? AND status IN ('CONFIRMED', 'IN_PROGRESS')",
      [stationId]
    );

    const rule = rules.length > 0 ? rules[0] : null;
    const formatted = formatStationWithSlots(stations[0], slots, rule, activeBookings);

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching station", error: error.message });
  }
};

/**
 * GET /api/stations/:id/power-status
 * Live Power Management statistics for Station Owner Dashboard
 */
export const getStationPowerStatus = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const stations = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);

    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const slots = await query("SELECT * FROM charging_slots WHERE station_id = ?", [stationId]);
    const activeBookings = await query(
      "SELECT station_id, charging_power, status FROM bookings WHERE station_id = ? AND status IN ('CONFIRMED', 'IN_PROGRESS')",
      [stationId]
    );

    const metrics = calculateStationDynamicLoad(stations[0], slots, activeBookings);
    const totalConnectors = slots.length;
    const availableConnectors = slots.filter((s) => s.status === "AVAILABLE").length;
    const occupiedConnectors = totalConnectors - availableConnectors;

    res.json({
      success: true,
      data: {
        stationId: `STA${String(stationId).padStart(3, "0")}`,
        stationName: stations[0].station_name,
        ...metrics,
        totalConnectors,
        availableConnectors,
        occupiedConnectors,
        connectors: slots.map((s) => ({
          connectorId: s.connector_id || `C0${s.id}`,
          slotNumber: s.slot_number,
          type: s.connector_type || "CCS2",
          powerKw: parseFloat(s.power_kw),
          status: s.status,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching power status", error: error.message });
  }
};

/**
 * PUT /api/stations/:id/power
 * Configure Station Maximum Power Limit & Current Limit (Station Owner / Admin)
 */
export const updateStationPower = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { maxPower, maximumPower, maxCurrent, maximumCurrent } = req.body;

    const targetPower = parseFloat(maxPower || maximumPower);
    const targetCurrent = parseFloat(maxCurrent || maximumCurrent);

    if (!targetPower || targetPower <= 0) {
      return res.status(400).json({ success: false, message: "Valid Maximum Power in kW is required." });
    }

    await query(
      "UPDATE charging_stations SET max_power = ?, max_current = ? WHERE id = ?",
      [targetPower, targetCurrent || targetPower * 1.5, stationId]
    );

    const stations = await query("SELECT * FROM charging_stations WHERE id = ?", [stationId]);
    const slots = await query("SELECT * FROM charging_slots WHERE station_id = ?", [stationId]);
    const metrics = calculateStationDynamicLoad(stations[0], slots, []);

    res.json({
      success: true,
      message: `Station power limits updated: ${targetPower} kW max capacity, ${targetCurrent || targetPower * 1.5} A max current.`,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station power limits", error: error.message });
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
    const slots = await query("SELECT * FROM charging_slots ORDER BY id ASC");
    const rules = await query("SELECT * FROM pricing_rules");
    const activeBookings = await query(
      "SELECT station_id, charging_power, status FROM bookings WHERE status IN ('CONFIRMED', 'IN_PROGRESS')"
    );

    const rulesMap = {};
    rules.forEach((r) => {
      rulesMap[r.station_id] = r;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, slots, rulesMap[st.id], activeBookings)
    );

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
 * GET /api/stations/:id/price-quote
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
    res.status(500).json({ success: false, message: "Failed to compute price quote", error: err.message });
  }
};

export const getExternalStations = async (req, res) => {
  try {
    const data = await fetchExternalStations(req.query);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "External stations error", error: err.message });
  }
};

export const createStation = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.body.ownerId || 2;
    const {
      name,
      stationName,
      networkName = "GreenCharge Network",
      networkId = null,
      description = "",
      address,
      city = "Chennai",
      state = "Tamil Nadu",
      pincode = "600001",
      latitude = 13.0827,
      longitude = 80.2707,
      openingTime = "06:00:00",
      closingTime = "23:00:00",
      is24x7 = true,
      contactNumber = "+91 98401 23456",
      email = "",
      parkingCapacity = 10,
      baysCount = 4,
      acChargers = 2,
      dcChargers = 2,
      connectorTypes = "CCS2, Type 2, CHAdeMO",
      chargingPrice = 18.00,
      serviceFee = 20.00,
      amenities = ["WiFi", "Parking", "Restroom"],
      image = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      bays = [],
      maxPower = 120,
      maximumPower = 120,
      maxCurrent = 180,
      maximumCurrent = 180,
    } = req.body;

    const finalName = stationName || name || "New EV Charging Hub";
    const power = parseFloat(maxPower || maximumPower) || 120.0;
    const current = parseFloat(maxCurrent || maximumCurrent) || 180.0;
    const totalBays = bays.length > 0 ? bays.length : parseInt(baysCount || 4, 10);
    const amenitiesJson = typeof amenities === "string" ? amenities : JSON.stringify(amenities);

    // Initial status for Station Owner submission is PENDING approval (status = INACTIVE until approved)
    const isAdmin = req.user?.role === "ADMIN";
    const initialStatus = isAdmin ? "ACTIVE" : "INACTIVE";
    const initialApproval = isAdmin ? "APPROVED" : "PENDING";
    const initialActive = isAdmin ? true : false;

    const result = await query(
      `INSERT INTO charging_stations 
       (owner_id, network_id, network_name, station_name, description, address, city, state, pincode, 
        latitude, longitude, opening_time, closing_time, is_24x7, contact_number, parking_capacity, 
        total_slots, available_slots, ac_chargers, dc_chargers, connector_types, charging_price, 
        service_fee, amenities, image, max_power, max_current, status, approval_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        networkId,
        networkName,
        finalName,
        description,
        address || "EV Corridor, Anna Salai",
        city,
        state,
        pincode,
        parseFloat(latitude),
        parseFloat(longitude),
        openingTime.length === 5 ? `${openingTime}:00` : openingTime,
        closingTime.length === 5 ? `${closingTime}:00` : closingTime,
        Boolean(is24x7),
        contactNumber,
        parseInt(parkingCapacity, 10),
        totalBays,
        totalBays,
        parseInt(acChargers, 10),
        parseInt(dcChargers, 10),
        connectorTypes,
        parseFloat(chargingPrice),
        parseFloat(serviceFee),
        amenitiesJson,
        image,
        power,
        current,
        initialStatus,
        initialApproval,
        initialActive,
      ]
    );

    const stationId = result?.insertId || result?.id || 1;

    // Insert Default Pricing Rules for the station
    try {
      await query(
        `INSERT INTO pricing_rules (station_id, peak_start, peak_end, peak_multiplier, offpeak_discount, utilization_threshold, max_multiplier)
         VALUES (?, '18:00:00', '21:00:00', 1.25, 0.15, 0.75, 1.50)
         ON DUPLICATE KEY UPDATE station_id = station_id`,
        [stationId]
      );
    } catch (pricingErr) {
      console.warn("Pricing rules init notice:", pricingErr.message);
    }

    // Insert Charging Bays / Slots
    if (bays && bays.length > 0) {
      for (let i = 0; i < bays.length; i++) {
        const b = bays[i];
        const bayNum = b.bayNumber || b.slotNumber || `BAY-0${i + 1}`;
        const connType = b.connectorType || b.connector || "CCS2";
        const chgType = b.chargingType || (connType === "Type 2" ? "AC" : "DC_FAST");
        const bayPower = parseFloat(b.powerKW || b.powerKw || 60);
        const bayPrice = parseFloat(b.pricePerKWh || b.pricePerKwh || chargingPrice);

        await query(
          `INSERT INTO charging_slots (station_id, slot_number, bay_number, connector_id, connector_type, charger_type, power_kw, max_power, price_per_kwh, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
          [
            stationId,
            bayNum,
            bayNum,
            `STA${String(stationId).padStart(3, "0")}-C0${i + 1}`,
            connType,
            chgType,
            bayPower,
            bayPower,
            bayPrice,
          ]
        );
      }
    } else {
      // Auto-generate realistic bays based on counts
      const totalDc = parseInt(dcChargers || 2, 10);
      const totalAc = parseInt(acChargers || 2, 10);
      let count = 1;

      for (let i = 0; i < totalDc; i++) {
        await query(
          `INSERT INTO charging_slots (station_id, slot_number, bay_number, connector_id, connector_type, charger_type, power_kw, max_power, price_per_kwh, status)
           VALUES (?, ?, ?, ?, 'CCS2', 'DC_FAST', 60.00, 60.00, ?, 'AVAILABLE')`,
          [
            stationId,
            `BAY-0${count}`,
            `BAY-0${count}`,
            `STA${String(stationId).padStart(3, "0")}-C0${count}`,
            parseFloat(chargingPrice) || 18.00,
          ]
        );
        count++;
      }

      for (let i = 0; i < totalAc; i++) {
        await query(
          `INSERT INTO charging_slots (station_id, slot_number, bay_number, connector_id, connector_type, charger_type, power_kw, max_power, price_per_kwh, status)
           VALUES (?, ?, ?, ?, 'Type 2', 'AC', 22.00, 22.00, ?, 'AVAILABLE')`,
          [
            stationId,
            `BAY-0${count}`,
            `BAY-0${count}`,
            `STA${String(stationId).padStart(3, "0")}-C0${count}`,
            Math.max(12, (parseFloat(chargingPrice) || 18.00) - 4),
          ]
        );
        count++;
      }
    }

    res.status(201).json({
      success: true,
      message: isAdmin
        ? `Station "${finalName}" published successfully!`
        : `Station "${finalName}" submitted successfully! Awaiting Admin approval.`,
      stationId,
      status: initialStatus,
      approvalStatus: initialApproval,
    });
  } catch (error) {
    console.error("Create Station Error:", error);
    res.status(500).json({ success: false, message: "Error creating station", error: error.message });
  }
};

export const updateStation = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { name, stationName, address, contactNumber, maxPower, maximumPower, maxCurrent, maximumCurrent, status } = req.body;

    const updates = [];
    const params = [];

    if (name || stationName) {
      updates.push("station_name = ?");
      params.push(name || stationName);
    }
    if (address) {
      updates.push("address = ?");
      params.push(address);
    }
    if (contactNumber) {
      updates.push("contact_number = ?");
      params.push(contactNumber);
    }
    if (maxPower || maximumPower) {
      updates.push("max_power = ?");
      params.push(parseFloat(maxPower || maximumPower));
    }
    if (maxCurrent || maximumCurrent) {
      updates.push("max_current = ?");
      params.push(parseFloat(maxCurrent || maximumCurrent));
    }
    if (status) {
      updates.push("status = ?");
      params.push(status.toUpperCase());
    }

    if (updates.length > 0) {
      params.push(stationId);
      await query(`UPDATE charging_stations SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    res.json({ success: true, message: "Station updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station", error: error.message });
  }
};

export const deleteStation = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    await query("DELETE FROM charging_stations WHERE id = ?", [stationId]);
    res.json({ success: true, message: "Station deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting station", error: error.message });
  }
};

export const getPricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const rules = await query("SELECT * FROM pricing_rules WHERE station_id = ?", [stationId]);
    res.json({ success: true, data: rules[0] || DEFAULT_PRICING_RULE });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching pricing rules", error: err.message });
  }
};

export const updatePricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { peak_start, peak_end, peak_multiplier, offpeak_discount } = req.body;
    await query(
      `INSERT INTO pricing_rules (station_id, peak_start, peak_end, peak_multiplier, offpeak_discount)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         peak_start = VALUES(peak_start),
         peak_end = VALUES(peak_end),
         peak_multiplier = VALUES(peak_multiplier),
         offpeak_discount = VALUES(offpeak_discount)`,
      [stationId, peak_start || '18:00:00', peak_end || '21:00:00', parseFloat(peak_multiplier) || 1.25, parseFloat(offpeak_discount) || 0.15]
    );
    res.json({ success: true, message: "Pricing rules updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating pricing rules", error: err.message });
  }
};

export default {
  getStations,
  getStationById,
  getStationPowerStatus,
  updateStationPower,
  getMyStations,
  createStation,
  updateStation,
  deleteStation,
  getPriceQuote,
  getPricingRules,
  updatePricingRules,
  getExternalStations,
  fetchExternalStations,
};
