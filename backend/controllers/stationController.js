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
export const calculateStationDynamicLoad = (station, chargers = [], activeBookings = []) => {
  const maxPower = parseFloat(station.max_power) || 120.0;
  const maxCurrent = maxPower * 1.5;

  const stationBookings = activeBookings.filter(
    (b) => Number(b.station_id) === Number(station.id) && ["CONFIRMED", "IN_PROGRESS", "ACTIVE"].includes(b.booking_status || b.status)
  );

  let activeLoad = 0;
  stationBookings.forEach((b) => {
    const power = parseFloat(b.charging_power || b.power_kw) || 25.0;
    activeLoad += power;
  });

  const occupiedChargers = chargers.filter(
    (c) => c.station_id === station.id && ["CHARGING", "OCCUPIED", "RESERVED"].includes(c.status)
  );
  if (activeLoad === 0 && occupiedChargers.length > 0) {
    occupiedChargers.forEach((c) => {
      activeLoad += parseFloat(c.power_kw) || 25.0;
    });
  }

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
    activeSessions: stationBookings.length || occupiedChargers.length,
  };
};

/**
 * Format MySQL Station with chargers, connectors, power management, and dynamic pricing
 */
export const formatStationWithSlots = (station, chargers = [], tariff = null, activeBookings = [], connectorsInDb = []) => {
  const stationChargers = chargers.filter((c) => c.station_id === station.id);
  const totalSlots = stationChargers.length || station.total_slots || 4;
  const availableSlots = stationChargers.filter((c) => c.status === "AVAILABLE").length;
  const occupiedSlotsCount = totalSlots - availableSlots;

  const powerMetrics = calculateStationDynamicLoad(station, chargers, activeBookings);

  const basePricePerKwh = tariff ? parseFloat(tariff.base_rate_per_kwh) : 18.0;
  const peakPricePerKwh = tariff ? parseFloat(tariff.peak_rate_per_kwh) : 22.0;
  const offPeakPricePerKwh = tariff ? parseFloat(tariff.off_peak_rate_per_kwh) : 14.0;
  const connectionFee = tariff ? parseFloat(tariff.connection_fee) : 15.0;

  const connectors = stationChargers.map((c, idx) => {
    const connObj = Array.isArray(connectorsInDb) ? connectorsInDb.find((cn) => cn.charger_id === c.id) : null;
    const connectorDbId = connObj ? connObj.id : c.id;
    const connectorCode = connObj ? connObj.connector_id : `CON${String(c.id).padStart(6, "0")}`;
    const connectorType = connObj?.connector_type || (c.charger_type === "AC" ? "Type 2" : "CCS2");
    const connectorDisplayId = `STA${String(station.id).padStart(3, "0")}-C0${idx + 1}`;
    const powerKw = parseFloat(connObj?.power_kw || c.power_kw) || 60;
    const isAvail = c.status === "AVAILABLE";

    return {
      id: c.id,
      slotId: c.id,
      chargerId: c.id,
      charger_id: c.id,
      chargerDbId: c.id,
      chargerCode: c.charger_id || `CHG${String(c.id).padStart(4, "0")}`,
      connectorId: connectorDbId,
      connector_id: connectorDbId,
      connectorDbId: connectorDbId,
      connectorCode,
      connectorDisplayId,
      slotNumber: `C0${idx + 1}`,
      connector: connectorType,
      connectorType,
      type: c.charger_type === "DC_FAST" ? "DC Fast Charging" : "AC Charging",
      chargerType: c.charger_type || "DC_FAST",
      powerKw,
      maxPower: powerKw,
      pricePerKwh: basePricePerKwh,
      status: isAvail ? "Available" : c.status === "OCCUPIED" ? "Occupied" : c.status === "CHARGING" ? "Charging" : "Reserved",
      rawStatus: c.status,
      isAvailable: isAvail,
    };
  });

  const isFast = connectors.some((c) => c.powerKw >= 30 || c.connectorType.includes("CCS"));

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
    stationId: station.station_id || `STA${String(station.id).padStart(3, "0")}`,
    station_id: station.station_id || `STA${String(station.id).padStart(3, "0")}`,
    ownerId: station.owner_id,
    owner_id: station.owner_id,
    ownerCounterId: `OWN${String(station.owner_id).padStart(6, "0")}`,
    name: station.station_name,
    stationName: station.station_name,
    station_name: station.station_name,
    address: station.address,
    city: station.city || "Chennai",
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
    approval_status: station.approval_status || "APPROVED",
    approvalStatus: station.approval_status || "APPROVED",
    status: station.status || "ACTIVE",
    rawStatus: station.status || "ACTIVE",
    operationalStatus: station.status === "ACTIVE" ? "Available" : station.status,
    availabilityStatus: station.status === "ACTIVE" ? "Available" : station.status,
    isActive: station.status === "ACTIVE",
    is_active: station.status === "ACTIVE",
    rating: 4.9,
    image: station.image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
    amenities: parsedAmenities,
    
    // Connectors / Chargers
    connectors,
    chargers: connectors,
    slots: connectors,
    isFast,
    isExternal: false,

    // Tariff attributes
    basePricePerKwh,
    pricePerKwh: basePricePerKwh,
    peakPricePerKwh,
    offPeakPricePerKwh,
    connectionFee,
    effectivePricePerKwh: basePricePerKwh,
    createdAt: station.created_at,
    created_at: station.created_at,
  };
};

/**
 * GET /api/stations/approved
 */
export const getApprovedStations = async (req, res) => {
  try {
    const stations = await query(
      "SELECT * FROM stations WHERE (status = 'ACTIVE' OR approval_status = 'APPROVED') AND approval_status != 'REJECTED' ORDER BY id ASC"
    );
    const chargers = await query("SELECT * FROM chargers ORDER BY id ASC");
    const connectorsInDb = await query("SELECT * FROM charger_connectors ORDER BY id ASC");
    const tariffs = await query("SELECT * FROM tariffs WHERE status = 'ACTIVE' ORDER BY id DESC");
    const activeBookings = await query(
      "SELECT station_id, charger_id, booking_status FROM bookings WHERE booking_status IN ('CONFIRMED', 'IN_PROGRESS', 'ACTIVE')"
    );

    const tariffMap = {};
    tariffs.forEach((t) => {
      if (!tariffMap[t.station_id]) tariffMap[t.station_id] = t;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, chargers, tariffMap[st.id], activeBookings, connectorsInDb)
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
 */
export const getStationsMap = async (req, res) => {
  try {
    const stations = await query(
      "SELECT * FROM stations WHERE (status = 'ACTIVE' OR approval_status = 'APPROVED') AND approval_status != 'REJECTED' ORDER BY id ASC"
    );
    const chargers = await query("SELECT * FROM chargers ORDER BY id ASC");
    const tariffs = await query("SELECT * FROM tariffs WHERE status = 'ACTIVE' ORDER BY id DESC");

    const tariffMap = {};
    tariffs.forEach((t) => {
      if (!tariffMap[t.station_id]) tariffMap[t.station_id] = t;
    });

    const mapData = stations.map((st) => {
      const stationChargers = chargers.filter((c) => c.station_id === st.id);
      const totalBays = stationChargers.length || st.total_slots || 4;
      const availableBays = stationChargers.filter((c) => c.status === "AVAILABLE").length;
      const occupiedBays = totalBays - availableBays;

      const chargingTypes = Array.from(
        new Set(stationChargers.map((c) => (c.charger_type === "DC_FAST" ? "DC Fast" : "AC")))
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

      const currentTariff = tariffMap[st.id];

      return {
        id: st.id,
        stationId: st.station_id || `STA${String(st.id).padStart(3, "0")}`,
        stationName: st.station_name,
        name: st.station_name,
        operator: "GreenCharge Network",
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
        connectorTypes: "CCS2, Type 2",
        pricePerKwh: currentTariff ? parseFloat(currentTariff.base_rate_per_kwh) : 18.0,
        openingHours: `${(st.opening_time || "06:00").slice(0, 5)} - ${(st.closing_time || "23:00").slice(0, 5)}`,
        rating: 4.9,
        image: st.image || "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
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
 */
export const getStations = async (req, res) => {
  try {
    const stations = await query("SELECT * FROM stations ORDER BY id ASC");
    const chargers = await query("SELECT * FROM chargers ORDER BY id ASC");
    const connectorsInDb = await query("SELECT * FROM charger_connectors ORDER BY id ASC");
    const tariffs = await query("SELECT * FROM tariffs WHERE status = 'ACTIVE' ORDER BY id DESC");
    const activeBookings = await query(
      "SELECT station_id, charger_id, booking_status FROM bookings WHERE booking_status IN ('CONFIRMED', 'IN_PROGRESS', 'ACTIVE')"
    );

    const tariffMap = {};
    tariffs.forEach((t) => {
      if (!tariffMap[t.station_id]) tariffMap[t.station_id] = t;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, chargers, tariffMap[st.id], activeBookings, connectorsInDb)
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
 */
export const getStationById = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const stations = await query("SELECT * FROM stations WHERE id = ?", [stationId]);

    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const chargers = await query("SELECT * FROM chargers WHERE station_id = ?", [stationId]);
    const connectorsInDb = await query(
      "SELECT * FROM charger_connectors WHERE charger_id IN (SELECT id FROM chargers WHERE station_id = ?)",
      [stationId]
    );
    const tariffs = await query("SELECT * FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC", [stationId]);
    const activeBookings = await query(
      "SELECT station_id, charger_id, booking_status FROM bookings WHERE station_id = ? AND booking_status IN ('CONFIRMED', 'IN_PROGRESS', 'ACTIVE')",
      [stationId]
    );

    const tariff = tariffs.length > 0 ? tariffs[0] : null;
    const formatted = formatStationWithSlots(stations[0], chargers, tariff, activeBookings, connectorsInDb);

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching station", error: error.message });
  }
};

/**
 * GET /api/stations/:id/power-status
 */
export const getStationPowerStatus = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const stations = await query("SELECT * FROM stations WHERE id = ?", [stationId]);

    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const chargers = await query("SELECT * FROM chargers WHERE station_id = ?", [stationId]);
    const activeBookings = await query(
      "SELECT station_id, charger_id, booking_status FROM bookings WHERE station_id = ? AND booking_status IN ('CONFIRMED', 'IN_PROGRESS', 'ACTIVE')",
      [stationId]
    );

    const metrics = calculateStationDynamicLoad(stations[0], chargers, activeBookings);
    const totalConnectors = chargers.length;
    const availableConnectors = chargers.filter((s) => s.status === "AVAILABLE").length;
    const occupiedConnectors = totalConnectors - availableConnectors;

    res.json({
      success: true,
      data: {
        stationId: stations[0].station_id || `STA${String(stationId).padStart(3, "0")}`,
        stationName: stations[0].station_name,
        ...metrics,
        totalConnectors,
        availableConnectors,
        occupiedConnectors,
        connectors: chargers.map((c) => ({
          connectorId: c.charger_id || `CHG${c.id}`,
          type: c.charger_type === "AC" ? "Type 2" : "CCS2",
          powerKw: parseFloat(c.power_kw),
          status: c.status,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching power status", error: error.message });
  }
};

/**
 * PUT /api/stations/:id/power
 */
export const updateStationPower = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { maxPower, maximumPower } = req.body;

    const targetPower = parseFloat(maxPower || maximumPower);
    if (!targetPower || targetPower <= 0) {
      return res.status(400).json({ success: false, message: "Valid Maximum Power in kW is required." });
    }

    await query("UPDATE stations SET max_power = ? WHERE id = ?", [targetPower, stationId]);

    const stations = await query("SELECT * FROM stations WHERE id = ?", [stationId]);
    const chargers = await query("SELECT * FROM chargers WHERE station_id = ?", [stationId]);
    const metrics = calculateStationDynamicLoad(stations[0], chargers, []);

    res.json({
      success: true,
      message: `Station power limits updated: ${targetPower} kW max capacity.`,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station power limits", error: error.message });
  }
};

/**
 * GET /api/stations/owner/my-stations
 */
export const getMyStations = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const stations = await query(
      "SELECT * FROM stations WHERE owner_id = ? ORDER BY id ASC",
      [ownerId]
    );

    const chargers = await query("SELECT * FROM chargers ORDER BY id ASC");
    const tariffs = await query("SELECT * FROM tariffs WHERE status = 'ACTIVE' ORDER BY id DESC");
    const activeBookings = await query(
      "SELECT station_id, charger_id, booking_status FROM bookings WHERE booking_status IN ('CONFIRMED', 'IN_PROGRESS', 'ACTIVE')"
    );

    const tariffMap = {};
    tariffs.forEach((t) => {
      if (!tariffMap[t.station_id]) tariffMap[t.station_id] = t;
    });

    const formatted = stations.map((st) =>
      formatStationWithSlots(st, chargers, tariffMap[st.id], activeBookings)
    );

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("getMyStations MySQL Error:", error);
    res.status(500).json({ success: false, message: "Error fetching owner stations", error: error.message });
  }
};

/**
 * GET /api/stations/:id/price-quote
 */
export const getPriceQuote = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { duration = 45 } = req.query;

    const stations = await query("SELECT id, station_name FROM stations WHERE id = ?", [stationId]);
    if (!stations || stations.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found" });
    }

    const tariffs = await query(
      "SELECT * FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
      [stationId]
    );

    const baseRate = tariffs.length > 0 ? parseFloat(tariffs[0].base_rate_per_kwh) : 18.0;
    const connectionFee = tariffs.length > 0 ? parseFloat(tariffs[0].connection_fee) : 15.0;

    res.json({
      success: true,
      data: {
        stationId,
        stationName: stations[0].station_name,
        durationMinutes: parseFloat(duration) || 45,
        basePricePerKwh: baseRate,
        connectionFee,
        effectivePricePerKwh: baseRate,
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

/**
 * POST /api/stations
 * Create Station in MySQL
 */
export const createStation = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const {
      name,
      stationName,
      address,
      city = "Chennai",
      state = "Tamil Nadu",
      pincode = "600001",
      latitude = 13.0827,
      longitude = 80.2707,
      openingTime = "06:00:00",
      closingTime = "23:00:00",
      contactNumber = "+91 98401 23456",
      baysCount = 4,
      acChargers = 2,
      dcChargers = 2,
      chargingPrice = 18.00,
      amenities = ["WiFi", "Parking", "Restroom"],
      image = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      maxPower = 120,
    } = req.body;

    const finalName = stationName || name || "New EV Charging Hub";
    const power = parseFloat(maxPower) || 120.0;
    const totalBays = parseInt(baysCount || (parseInt(acChargers || 0, 10) + parseInt(dcChargers || 0, 10)) || 4, 10);
    const amenitiesJson = typeof amenities === "string" ? amenities : JSON.stringify(amenities);

    // Generate dynamic station_id
    const maxRows = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM stations");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const station_id = `STA${String(nextId).padStart(6, "0")}`;

    const resultData = await transaction(async (connection) => {
      // 1. Insert into stations
      const [stationResult] = await connection.execute(
        `INSERT INTO stations 
         (station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, opening_time, closing_time, contact_number, total_slots, available_slots, max_power, status, approval_status, amenities, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'APPROVED', ?, ?)`,
        [
          station_id,
          ownerId,
          finalName,
          address || "EV Corridor, Anna Salai",
          city,
          state,
          pincode,
          parseFloat(latitude),
          parseFloat(longitude),
          openingTime.length === 5 ? `${openingTime}:00` : openingTime,
          closingTime.length === 5 ? `${closingTime}:00` : closingTime,
          contactNumber,
          totalBays,
          totalBays,
          power,
          amenitiesJson,
          image,
        ]
      );
      const insertedStationId = stationResult.insertId;

      // 2. Insert Default Tariff for the station
      const [tMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM tariffs");
      const nextTId = (tMax[0]?.maxId || 0) + 1;
      const tariff_id = `TAR${String(nextTId).padStart(6, "0")}`;
      const baseRate = parseFloat(chargingPrice) || 18.00;

      await connection.execute(
        `INSERT INTO tariffs (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
         VALUES (?, ?, ?, ?, ?, 15.00, 2.00, '18:00', '22:00', 'ACTIVE')`,
        [tariff_id, insertedStationId, baseRate, baseRate + 4.00, Math.max(10, baseRate - 4.00)]
      );

      // 3. Insert Chargers
      const totalDc = parseInt(dcChargers || 2, 10);
      const totalAc = parseInt(acChargers || 2, 10);
      let count = 1;

      for (let i = 0; i < totalDc; i++) {
        const [cMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM chargers");
        const nextCId = (cMax[0]?.maxId || 0) + 1;
        const charger_id = `CHG${String(nextCId).padStart(6, "0")}`;

        const [chgRes] = await connection.execute(
          `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
           VALUES (?, ?, ?, 'DC_FAST', 60.00, 'AVAILABLE', 1)`,
          [charger_id, insertedStationId, `DC Fast Charger ${count}`]
        );

        // Insert Connector
        const [connMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM charger_connectors");
        const nextConnId = (connMax[0]?.maxId || 0) + 1;
        await connection.execute(
          `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
           VALUES (?, ?, 'CCS2', 60.00, 'AVAILABLE')`,
          [`CON${String(nextConnId).padStart(6, "0")}`, chgRes.insertId]
        );
        count++;
      }

      for (let i = 0; i < totalAc; i++) {
        const [cMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM chargers");
        const nextCId = (cMax[0]?.maxId || 0) + 1;
        const charger_id = `CHG${String(nextCId).padStart(6, "0")}`;

        const [chgRes] = await connection.execute(
          `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
           VALUES (?, ?, ?, 'AC', 22.00, 'AVAILABLE', 1)`,
          [charger_id, insertedStationId, `AC Charger ${count}`]
        );

        // Insert Connector
        const [connMax] = await connection.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM charger_connectors");
        const nextConnId = (connMax[0]?.maxId || 0) + 1;
        await connection.execute(
          `INSERT INTO charger_connectors (connector_id, charger_id, connector_type, power_kw, status)
           VALUES (?, ?, 'Type 2', 22.00, 'AVAILABLE')`,
          [`CON${String(nextConnId).padStart(6, "0")}`, chgRes.insertId]
        );
        count++;
      }

      // Record Audit Log
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
         VALUES (?, 'STATION_CREATED', 'STATION', ?, ?)`,
        [ownerId, String(insertedStationId), `Created station ${finalName} with ${totalBays} chargers`]
      );

      return {
        stationId: insertedStationId,
        station_id,
      };
    });

    res.status(201).json({
      success: true,
      message: `Station "${finalName}" created successfully!`,
      stationId: resultData.stationId,
      station_id: resultData.station_id,
      status: "ACTIVE",
      approvalStatus: "APPROVED",
    });
  } catch (error) {
    console.error("Create Station Error:", error);
    res.status(500).json({ success: false, message: "Error creating station", error: error.message });
  }
};

/**
 * PUT /api/stations/:id
 */
export const updateStation = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { name, stationName, address, contactNumber, maxPower, status } = req.body;

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
    if (maxPower) {
      updates.push("max_power = ?");
      params.push(parseFloat(maxPower));
    }
    if (status) {
      updates.push("status = ?");
      params.push(status.toUpperCase());
    }

    if (updates.length > 0) {
      params.push(stationId);
      await query(`UPDATE stations SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    res.json({ success: true, message: "Station updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating station", error: error.message });
  }
};

/**
 * DELETE /api/stations/:id
 */
export const deleteStation = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    await query("DELETE FROM stations WHERE id = ?", [stationId]);
    res.json({ success: true, message: "Station deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting station", error: error.message });
  }
};

/**
 * GET /api/stations/:id/pricing-rules
 */
export const getPricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const tariffs = await query(
      "SELECT * FROM tariffs WHERE station_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
      [stationId]
    );

    if (tariffs.length > 0) {
      const t = tariffs[0];
      return res.json({
        success: true,
        data: {
          stationId,
          baseRate: parseFloat(t.base_rate_per_kwh),
          peakRate: parseFloat(t.peak_rate_per_kwh),
          offPeakRate: parseFloat(t.off_peak_rate_per_kwh),
          connectionFee: parseFloat(t.connection_fee),
          idleFee: parseFloat(t.idle_fee_per_minute),
          peakStart: t.peak_start,
          peakEnd: t.peak_end,
          status: t.status,
        },
      });
    }

    res.json({
      success: true,
      data: {
        stationId,
        baseRate: 18.0,
        peakRate: 22.0,
        offPeakRate: 14.0,
        connectionFee: 15.0,
        idleFee: 2.0,
        peakStart: "18:00",
        peakEnd: "22:00",
        status: "ACTIVE",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching pricing rules", error: err.message });
  }
};

/**
 * PUT /api/stations/:id/pricing-rules
 */
export const updatePricingRules = async (req, res) => {
  try {
    const stationId = parseStationId(req.params.id);
    const { baseRate, peakRate, offPeakRate, connectionFee, idleFee, peakStart, peakEnd } = req.body;

    const base = parseFloat(baseRate) || 18.0;
    const peak = parseFloat(peakRate) || base + 4.0;
    const offPeak = parseFloat(offPeakRate) || Math.max(10, base - 4.0);
    const connFee = parseFloat(connectionFee) || 15.0;
    const idle = parseFloat(idleFee) || 2.0;
    const pStart = peakStart || "18:00";
    const pEnd = peakEnd || "22:00";

    const [existing] = await query("SELECT id FROM tariffs WHERE station_id = ?", [stationId]);

    if (existing && existing.length > 0) {
      await query(
        `UPDATE tariffs 
         SET base_rate_per_kwh = ?, peak_rate_per_kwh = ?, off_peak_rate_per_kwh = ?, connection_fee = ?, idle_fee_per_minute = ?, peak_start = ?, peak_end = ?
         WHERE station_id = ?`,
        [base, peak, offPeak, connFee, idle, pStart, pEnd, stationId]
      );
    } else {
      const [tMax] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM tariffs");
      const tariff_id = `TAR${String((tMax[0]?.maxId || 0) + 1).padStart(6, "0")}`;
      await query(
        `INSERT INTO tariffs (tariff_id, station_id, base_rate_per_kwh, peak_rate_per_kwh, off_peak_rate_per_kwh, connection_fee, idle_fee_per_minute, peak_start, peak_end, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [tariff_id, stationId, base, peak, offPeak, connFee, idle, pStart, pEnd]
      );
    }

    res.json({ success: true, message: "Station tariffs updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating pricing rules", error: err.message });
  }
};

/**
 * GET /api/stations/:stationId/connectors
 * Get all connectors for a specific station
 */
export const getStationConnectors = async (req, res) => {
  try {
    const stationIdParam = req.params.stationId || req.params.id;
    const isNumeric = /^\d+$/.test(stationIdParam);
    const stnRows = await query(
      "SELECT id, station_id, station_name FROM stations WHERE id = ? OR station_id = ? LIMIT 1",
      [isNumeric ? parseInt(stationIdParam, 10) : 0, stationIdParam]
    );

    if (!stnRows || stnRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }
    const station = stnRows[0];

    const rows = await query(
      `SELECT sc.*, ct.connector_name, ct.max_power_kw as type_max_power, ct.description as type_desc
       FROM station_connectors sc
       JOIN connector_types ct ON sc.connector_type_id = ct.id
       WHERE sc.station_id = ?
       ORDER BY sc.id ASC`,
      [station.id]
    );

    const formatted = rows.map((c) => ({
      id: c.id,
      connectorId: c.connector_id,
      connector_id: c.connector_id,
      stationId: c.station_id,
      station_id: c.station_id,
      connectorTypeId: c.connector_type_id,
      connector_type_id: c.connector_type_id,
      connectorType: c.connector_name,
      connector_type: c.connector_name,
      connectorNumber: c.connector_number,
      connector_number: c.connector_number,
      powerKw: parseFloat(c.power_kw),
      power_kw: parseFloat(c.power_kw),
      status: c.status,
      createdAt: c.created_at,
      created_at: c.created_at,
    }));

    res.json({
      success: true,
      count: formatted.length,
      station: { id: station.id, stationName: station.station_name },
      data: formatted,
      connectors: formatted,
    });
  } catch (error) {
    console.error("Get Station Connectors Error:", error);
    res.status(500).json({ success: false, message: "Error fetching station connectors", error: error.message });
  }
};

/**
 * POST /api/stations/:stationId/connectors
 * Add a new connector to a station
 */
export const addStationConnector = async (req, res) => {
  try {
    const stationIdParam = req.params.stationId || req.params.id;
    const isNumeric = /^\d+$/.test(stationIdParam);
    const [stnRows] = await query(
      "SELECT id, owner_id FROM stations WHERE id = ? OR station_id = ? LIMIT 1",
      [isNumeric ? parseInt(stationIdParam, 10) : 0, stationIdParam]
    );

    if (!stnRows || stnRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }
    const station = stnRows[0];

    // Auth check: Admin or Station Owner of this station
    if (req.user.role !== "ADMIN" && station.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to manage connectors for this station." });
    }

    const { connector_type_id, connectorTypeId, connector_number, connectorNumber, power_kw, powerKw, status = "AVAILABLE" } = req.body;

    const typeId = parseInt(connector_type_id || connectorTypeId || 1, 10);
    const power = parseFloat(power_kw || powerKw || 60.0);
    const connStatus = (status || "AVAILABLE").toUpperCase();

    // Generate unique connector_id code
    const [maxRows] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM station_connectors");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const connCode = `STA${String(station.id).padStart(3, "0")}-C0${nextId}`;
    const num = connector_number || connectorNumber || `Connector ${String(nextId).padStart(2, "0")}`;

    const [ins] = await query(
      `INSERT INTO station_connectors (connector_id, station_id, connector_type_id, connector_number, power_kw, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [connCode, station.id, typeId, num, power, connStatus]
    );

    res.status(201).json({
      success: true,
      message: "Connector added successfully!",
      connectorId: connCode,
      id: ins.insertId,
    });
  } catch (error) {
    console.error("Add Connector Error:", error);
    res.status(500).json({ success: false, message: "Error adding connector", error: error.message });
  }
};

/**
 * PUT /api/connectors/:id
 * Update connector details / status (e.g. AVAILABLE, MAINTENANCE, FAULT, OFFLINE)
 */
export const updateConnector = async (req, res) => {
  try {
    const connId = req.params.id;
    const isNumeric = /^\d+$/.test(connId);
    const [existing] = await query(
      `SELECT sc.*, s.owner_id 
       FROM station_connectors sc 
       JOIN stations s ON sc.station_id = s.id 
       WHERE sc.id = ? OR sc.connector_id = ? LIMIT 1`,
      [isNumeric ? parseInt(connId, 10) : 0, connId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Connector not found." });
    }

    const conn = existing[0];
    if (req.user.role !== "ADMIN" && conn.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to update this connector." });
    }

    const { status, power_kw, powerKw, connector_number, connectorNumber, connector_type_id, connectorTypeId } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push("status = ?");
      params.push(status.toUpperCase());
    }
    if (power_kw || powerKw) {
      updates.push("power_kw = ?");
      params.push(parseFloat(power_kw || powerKw));
    }
    if (connector_number || connectorNumber) {
      updates.push("connector_number = ?");
      params.push(connector_number || connectorNumber);
    }
    if (connector_type_id || connectorTypeId) {
      updates.push("connector_type_id = ?");
      params.push(parseInt(connector_type_id || connectorTypeId, 10));
    }

    if (updates.length > 0) {
      params.push(conn.id);
      await query(`UPDATE station_connectors SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);
    }

    res.json({ success: true, message: "Connector updated successfully." });
  } catch (error) {
    console.error("Update Connector Error:", error);
    res.status(500).json({ success: false, message: "Error updating connector", error: error.message });
  }
};

/**
 * DELETE /api/connectors/:id
 * Delete a connector
 */
export const deleteConnector = async (req, res) => {
  try {
    const connId = req.params.id;
    const isNumeric = /^\d+$/.test(connId);
    const [existing] = await query(
      `SELECT sc.*, s.owner_id 
       FROM station_connectors sc 
       JOIN stations s ON sc.station_id = s.id 
       WHERE sc.id = ? OR sc.connector_id = ? LIMIT 1`,
      [isNumeric ? parseInt(connId, 10) : 0, connId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Connector not found." });
    }

    const conn = existing[0];
    if (req.user.role !== "ADMIN" && conn.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this connector." });
    }

    await query("DELETE FROM station_connectors WHERE id = ?", [conn.id]);
    res.json({ success: true, message: "Connector deleted successfully." });
  } catch (error) {
    console.error("Delete Connector Error:", error);
    res.status(500).json({ success: false, message: "Error deleting connector", error: error.message });
  }
};

export default {
  getStations,
  getApprovedStations,
  getStationsMap,
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
  getStationConnectors,
  addStationConnector,
  updateConnector,
  deleteConnector,
};
