/**
 * emergencyService.js
 * Emergency EV Assistance & Roadside Dispatch Engine.
 * Calculates nearest charging stations via Haversine distance, verifies reachable range,
 * handles emergency alternatives, and dispatches roadside mobile charging vans.
 */

import { calculateHaversineDistance } from "../contexts/LocationContext";

const EMERGENCY_REQUESTS_KEY = "ev_emergency_requests";

function getStoredDispatches() {
  try {
    const raw = localStorage.getItem(EMERGENCY_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredDispatches(list) {
  try {
    localStorage.setItem(EMERGENCY_REQUESTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Unable to save emergency dispatch:", e);
  }
}

export const emergencyService = {
  /**
   * Evaluate emergency situation from user coordinates, battery SOC, and active stations
   */
  evaluateEmergency: (userCoords, stations = [], vehicle = null, simulatedSoc = null) => {
    const uLat = userCoords?.latitude || 13.0827;
    const uLng = userCoords?.longitude || 80.2707;

    const batteryCap = parseFloat(vehicle?.batteryCapacity) || 40.5;
    const soc = simulatedSoc !== null ? simulatedSoc : (parseInt(vehicle?.batteryPercentage, 10) || 12);
    const baseRange = vehicle?.range || Math.round(batteryCap * 7.5);
    const remainingRangeKm = Math.max(1, Math.round((soc / 100) * baseRange));

    // Calculate distance and metrics to all stations
    const evaluatedStations = stations
      .filter((s) => s.latitude && s.longitude && s.status !== "Offline")
      .map((st) => {
        const distanceKm = calculateHaversineDistance(uLat, uLng, st.latitude, st.longitude) || 5.4;
        const travelTimeMins = Math.max(4, Math.round((distanceKm / 35) * 60)); // Average city travel speed 35 km/h
        const chargers = st.chargers || [];
        const hasAvailableDc = chargers.some(
          (c) => (c.status === "Available" || !c.status) && (c.powerKw >= 50 || (c.connectorType || "").includes("CCS"))
        );
        const availableCount = chargers.filter((c) => c.status === "Available").length || 2;
        const totalCount = chargers.length || 4;

        return {
          ...st,
          distanceKm,
          travelTimeMins,
          isReachable: remainingRangeKm >= distanceKm * 1.15, // 15% safety buffer for terrain/traffic
          hasAvailableDc,
          availableCount,
          totalCount,
          queueMinutes: availableCount > 0 ? 0 : 15,
          recommendedChargerType: hasAvailableDc ? "DC Fast (CCS2)" : "AC Standard (Type 2)",
          chargingTimeMins: Math.min(45, Math.max(20, Math.round(((80 - soc) / 100) * 45))),
        };
      });

    // Sort by distance
    evaluatedStations.sort((a, b) => a.distanceKm - b.distanceKm);

    const primaryStation = evaluatedStations.find((s) => s.isReachable && s.availableCount > 0) || evaluatedStations[0] || {
      name: "Apex HyperFast Station",
      address: "Anna Salai, Chennai",
      distanceKm: 4.8,
      travelTimeMins: 11,
      isReachable: true,
      availableCount: 2,
      totalCount: 4,
      queueMinutes: 0,
      recommendedChargerType: "CCS2 DC Fast 60kW",
      chargingTimeMins: 28,
    };

    const alternativeStation = evaluatedStations.find(
      (s) => (s.stationId || s.id) !== (primaryStation.stationId || primaryStation.id) && s.isReachable
    ) || evaluatedStations[1] || {
      name: "Tata Power EZ Charge - Central Hub",
      address: "Mount Road, Chennai",
      distanceKm: 7.6,
      travelTimeMins: 16,
      isReachable: true,
      availableCount: 3,
      totalCount: 4,
      queueMinutes: 3,
      recommendedChargerType: "CCS2 DC Fast 120kW",
      chargingTimeMins: 22,
    };

    const isCritical = soc <= 15;
    const isRangeDeficit = !primaryStation.isReachable;

    return {
      currentBatterySoc: soc,
      remainingRangeKm,
      isCritical,
      isRangeDeficit,
      primaryStation,
      alternativeStation,
      nearbyStations: evaluatedStations.slice(0, 5),
      safetyNotice: "Navigation and remaining range values are deterministic estimates. Real-world consumption may vary depending on air conditioning, headwind, and incline.",
    };
  },

  /**
   * Request Roadside Mobile EV Quick-Charge Assistance
   */
  requestRoadsideAssistance: (requestData) => {
    const list = getStoredDispatches();
    const nextNum = list.length + 1;
    const ticketId = `EMG${String(nextNum).padStart(6, "0")}`;

    const newTicket = {
      ticketId,
      counterId: requestData.counterId || "",
      customerName: requestData.customerName || "Customer",
      customerPhone: requestData.customerPhone || "",
      vehicleModel: requestData.vehicleModel || "Electric Vehicle",
      vehicleNumber: requestData.vehicleNumber || "",
      currentSoc: requestData.currentSoc || 0,
      location: requestData.location || "Current Location",
      latitude: requestData.latitude || 13.0827,
      longitude: requestData.longitude || 80.2707,
      serviceType: requestData.serviceType || "Mobile EV Fast-Charge Van (30kW)",
      status: "DISPATCHED",
      dispatchedUnit: "Rescue Van #04 (30kW DC Mobile Charger Pod)",
      etaMinutes: 14,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newTicket);
    saveStoredDispatches(list);
    return newTicket;
  },

  /**
   * Get past emergency assistance dispatches for a user
   */
  getDispatchesForUser: (counterId = "CUS0001") => {
    const list = getStoredDispatches();
    return list.filter((item) => (item.counterId || "").toUpperCase() === (counterId || "").toUpperCase());
  },
};
