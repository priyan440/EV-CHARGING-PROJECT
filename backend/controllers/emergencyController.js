import { query } from "../config/db.js";

/**
 * Helper to generate sequential EMG IDs e.g. EMG000001
 */
async function generateEmergencyId() {
  try {
    const rows = await query("SELECT id FROM emergency_requests ORDER BY id DESC LIMIT 1");
    const nextId = rows.length > 0 ? rows[0].id + 1 : 1;
    return `EMG${String(nextId).padStart(6, "0")}`;
  } catch {
    return `EMG${Date.now().toString().slice(-6)}`;
  }
}

/**
 * Create a new emergency assistance request
 * POST /api/emergency/request
 */
export async function createEmergencyRequest(req, res) {
  try {
    const userId = req.user ? req.user.id : 1;
    const {
      vehicle_model,
      vehicleModel,
      vehicle_number,
      vehicleNumber,
      contact_number,
      contactNumber,
      emergency_type,
      emergencyType,
      current_soc,
      currentSoc,
      latitude,
      longitude,
      location_address,
      location,
      notes,
    } = req.body;

    const reqId = await generateEmergencyId();
    const cleanVehicleModel = vehicle_model || vehicleModel || "EV Vehicle";
    const cleanVehicleNumber = vehicle_number || vehicleNumber || "N/A";
    const cleanContact = contact_number || contactNumber || req.user?.phone || "+91 9876543210";
    const cleanType = emergency_type || emergencyType || "BATTERY_DEPLETED";
    const cleanSoc = parseInt(current_soc ?? currentSoc ?? 8, 10);
    const cleanLat = parseFloat(latitude || 13.0827);
    const cleanLng = parseFloat(longitude || 80.2707);
    const cleanAddress = location_address || location || "Current GPS Location";
    const assignedUnit = "Mobile Quick-Charge Rescue Van #04";
    const etaMinutes = Math.floor(Math.random() * 10) + 15; // 15-25 mins

    const result = await query(
      `INSERT INTO emergency_requests 
       (request_id, user_id, vehicle_model, vehicle_number, contact_number, emergency_type, current_soc, latitude, longitude, location_address, status, assigned_unit, eta_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISPATCHED', ?, ?, ?)`,
      [
        reqId,
        userId,
        cleanVehicleModel,
        cleanVehicleNumber,
        cleanContact,
        cleanType,
        cleanSoc,
        cleanLat,
        cleanLng,
        cleanAddress,
        assignedUnit,
        etaMinutes,
        notes || "Critical low-battery emergency dispatch requested.",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Emergency assistance team dispatched successfully.",
      data: {
        id: result.insertId,
        requestId: reqId,
        request_id: reqId,
        ticketId: reqId,
        status: "DISPATCHED",
        emergencyType: cleanType,
        vehicleModel: cleanVehicleModel,
        vehicleNumber: cleanVehicleNumber,
        currentSoc: cleanSoc,
        latitude: cleanLat,
        longitude: cleanLng,
        location: cleanAddress,
        assignedUnit,
        dispatchedUnit: assignedUnit,
        etaMinutes,
        emergencyContact: "+91 1800-EV-RESCUE",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Emergency Request Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit emergency request",
      error: error.message,
    });
  }
}

/**
 * Get user's emergency requests
 * GET /api/emergency/my-requests
 */
export async function getMyEmergencyRequests(req, res) {
  try {
    const userId = req.user ? req.user.id : 1;
    const rows = await query(
      `SELECT id, request_id, user_id, vehicle_model, vehicle_number, contact_number, 
              emergency_type, current_soc, latitude, longitude, location_address, 
              status, assigned_unit, eta_minutes, notes, created_at, updated_at
       FROM emergency_requests 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get My Emergency Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve emergency requests",
      error: error.message,
    });
  }
}

/**
 * Get all emergency requests (Admin / Dispatcher)
 * GET /api/emergency/requests
 */
export async function getAllEmergencyRequests(req, res) {
  try {
    const rows = await query(
      `SELECT er.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM emergency_requests er
       LEFT JOIN users u ON er.user_id = u.id
       ORDER BY er.created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get All Emergency Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve all emergency requests",
      error: error.message,
    });
  }
}

/**
 * Update emergency request status
 * PATCH /api/emergency/requests/:id/status
 */
export async function updateEmergencyStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, assigned_unit, assignedUnit, notes } = req.body;

    const cleanStatus = (status || "IN_PROGRESS").toUpperCase();
    const cleanUnit = assigned_unit || assignedUnit || "Rescue Unit 01";

    const numericId = parseInt(id, 10);
    if (!isNaN(numericId) && String(numericId) === String(id)) {
      await query(
        `UPDATE emergency_requests 
         SET status = ?, assigned_unit = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cleanStatus, cleanUnit, notes || null, numericId]
      );
    } else {
      await query(
        `UPDATE emergency_requests 
         SET status = ?, assigned_unit = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
         WHERE request_id = ?`,
        [cleanStatus, cleanUnit, notes || null, id]
      );
    }

    res.json({
      success: true,
      message: `Emergency request ${id} updated to ${cleanStatus}`,
    });
  } catch (error) {
    console.error("Update Emergency Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update emergency request status",
      error: error.message,
    });
  }
}

/**
 * Get nearby service points and operational emergency stations
 * GET /api/emergency/nearby-services
 */
export async function getNearbyEmergencyServices(req, res) {
  try {
    const lat = parseFloat(req.query.lat || 13.0827);
    const lng = parseFloat(req.query.lng || 80.2707);

    const stations = await query(
      `SELECT id, station_id, station_name, address, city, latitude, longitude,
              contact_number, opening_time, closing_time, total_slots, available_slots, max_power, status
       FROM stations 
       WHERE status = 'ACTIVE' 
       LIMIT 10`
    );

    const mapped = stations.map((st) => {
      const stLat = parseFloat(st.latitude);
      const stLng = parseFloat(st.longitude);
      // Haversine distance in KM
      const R = 6371;
      const dLat = ((stLat - lat) * Math.PI) / 180;
      const dLon = ((stLng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((stLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(R * c * 10) / 10;

      return {
        id: st.id,
        stationId: st.station_id,
        name: st.station_name,
        address: st.address,
        city: st.city,
        latitude: stLat,
        longitude: stLng,
        contactNumber: st.contact_number || "+91 1800-EV-HELP",
        distanceKm: distanceKm || 1.8,
        travelTimeMins: Math.max(3, Math.round(distanceKm * 3.5)),
        availableChargers: st.available_slots || 3,
        totalChargers: st.total_slots || 4,
        maxPowerKw: st.max_power || 120,
        isFastCharging: (st.max_power || 120) >= 50,
      };
    });

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      currentLocation: { latitude: lat, longitude: lng },
      stations: mapped,
      emergencyHelpline: "+91 1800-EV-RESCUE",
    });
  } catch (error) {
    console.error("Nearby Emergency Services Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nearby emergency services",
      error: error.message,
    });
  }
}
