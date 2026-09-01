import express from "express";
import axios from "axios";
import { Station } from "../models/Station.js";

const router = express.Router();

// Memory cache for Open Charge Map API responses (15 min expiration)
let ocmCache = {
  data: null,
  timestamp: 0,
};

const OCM_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Helper to fetch & parse Open Charge Map API POIs for India
 */
async function fetchOpenChargeMapStations(params = {}) {
  const now = Date.now();
  const apiKey = process.env.OPEN_CHARGE_MAP_API_KEY || "0a82895f-4c3b-4d9b-a73e-d273cc0aea38";

  // Use cache if available and fresh (unless custom bounding box or coordinates requested)
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

    if (params.boundingbox) {
      queryParams.boundingbox = params.boundingbox;
    }

    const response = await axios.get(ocmUrl, {
      params: queryParams,
      timeout: 8000, // 8 sec timeout
      headers: {
        "X-API-Key": apiKey,
        "User-Agent": "VoltChargeEVPlatform/2.0",
      },
    });

    if (Array.isArray(response.data)) {
      const parsedStations = response.data.map((poi) => {
        const addr = poi.AddressInfo || {};
        const operator = poi.OperatorInfo?.Title || "Independent EV Network";
        const connections = poi.Connections || [];

        const connectors = connections.map((conn, idx) => ({
          id: `EXT_CHG_${poi.ID}_${idx}`,
          type: conn.ConnectionType?.Title || "CCS2",
          powerKw: conn.PowerKW || (conn.LevelID === 3 ? 60 : 22),
          status: poi.StatusType?.IsOperational ? "Available" : "Unknown",
          pricePerKwh: 18,
        }));

        let isFast = connectors.some((c) => c.powerKw >= 30 || c.type.includes("CCS"));

        return {
          id: `OCM_${poi.ID}`,
          name: addr.Title || `EV Station ${poi.ID}`,
          operator,
          address: addr.AddressLine1 || addr.Title || "India EV Hub",
          city: addr.Town || addr.StateOrProvince || "India",
          state: addr.StateOrProvince || "Tamil Nadu",
          pincode: addr.Postcode || "",
          latitude: addr.Latitude,
          longitude: addr.Longitude,
          status: poi.StatusType?.IsOperational !== false ? "Operational" : "Non-operational",
          isExternal: true, // Distinct tag: External OCM station vs Platform bookable station
          chargers: connectors.length > 0 ? connectors : [{ id: `EXT_${poi.ID}`, type: "CCS2", powerKw: 60, status: "Available", pricePerKwh: 18 }],
          isFast,
          accessType: poi.UsageType?.Title || "Public",
          rating: 4.8,
          amenities: ["WiFi", "Parking", "Restroom"],
          attribution: "Powered by Open Charge Map & OpenStreetMap",
        };
      }).filter((s) => s.latitude && s.longitude);

      if (!isCustomQuery) {
        ocmCache.data = parsedStations;
        ocmCache.timestamp = now;
      }

      return parsedStations;
    }
  } catch (err) {
    console.warn("Open Charge Map API fetch notice:", err.message);
  }

  // Fallback to cached data or empty array if API fails
  return ocmCache.data || [];
}

/**
 * GET /api/ev-stations & GET /api/stations/external
 * Fetches real India EV stations from Open Charge Map API
 */
router.get("/external", async (req, res) => {
  try {
    const externalStations = await fetchOpenChargeMapStations(req.query);
    res.json({
      success: true,
      count: externalStations.length,
      source: "Open Charge Map API (countrycode=IN)",
      data: externalStations,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching external EV stations", error: err.message });
  }
});

// Alias route GET /api/ev-stations
router.get("/ev-stations", async (req, res) => {
  try {
    const externalStations = await fetchOpenChargeMapStations(req.query);
    res.json({
      success: true,
      count: externalStations.length,
      source: "Open Charge Map API (countrycode=IN)",
      data: externalStations,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching external EV stations", error: err.message });
  }
});

// GET /api/stations (Local Platform DB Stations)
router.get("/", async (req, res) => {
  try {
    const stations = await Station.find({});
    res.json({ success: true, count: stations.length, data: stations });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching stations", error: err.message });
  }
});

// POST /api/stations
router.post("/", async (req, res) => {
  try {
    const newStation = new Station(req.body);
    await newStation.save();
    res.json({ success: true, data: newStation });
  } catch (err) {
    res.status(400).json({ success: false, message: "Error creating station", error: err.message });
  }
});

// PUT /api/stations/:id/pricing
router.put("/:id/pricing", async (req, res) => {
  try {
    const { peakRate, offPeakRate, peakHoursStart, peakHoursEnd } = req.body;
    const station = await Station.findOneAndUpdate(
      { stationId: req.params.id },
      { peakRate, offPeakRate, peakHoursStart, peakHoursEnd },
      { new: true }
    );
    res.json({ success: true, message: "Pricing updated successfully", data: station });
  } catch (err) {
    res.status(400).json({ success: false, message: "Error updating pricing", error: err.message });
  }
});

export default router;
