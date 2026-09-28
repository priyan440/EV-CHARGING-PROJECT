import { query, transaction } from "../config/db.js";

// Recalculate station slot counts helper
const syncStationSlotCounts = async (stationId) => {
  try {
    const slots = await query("SELECT status FROM charging_slots WHERE station_id = ?", [stationId]);
    const total = slots.length;
    const available = slots.filter((s) => s.status === "AVAILABLE").length;
    await query(
      "UPDATE charging_stations SET total_slots = ?, available_slots = ? WHERE id = ?",
      [total, available, stationId]
    );
  } catch (err) {
    console.warn("syncStationSlotCounts warning:", err.message);
  }
};

/**
 * GET /api/slots/station/:stationId
 * Get slots for a specific charging station
 */
export const getSlotsByStation = async (req, res) => {
  try {
    const { stationId } = req.params;
    const slots = await query(
      "SELECT * FROM charging_slots WHERE station_id = ? ORDER BY id ASC",
      [stationId]
    );

    const formatted = slots.map((s) => ({
      id: s.id,
      slotId: s.id,
      chargerId: `CHG${String(s.id).padStart(4, "0")}`,
      stationId: s.station_id,
      slotNumber: s.slot_number,
      chargerType: s.charger_type,
      connector: s.charger_type === "DC_FAST" ? "CCS2" : "Type 2",
      powerKw: parseFloat(s.power_kw),
      pricePerKwh: parseFloat(s.price_per_kwh),
      status: s.status,
      isAvailable: s.status === "AVAILABLE",
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching slots", error: error.message });
  }
};

/**
 * GET /api/slots/:id
 * Get single slot by ID
 */
export const getSlotById = async (req, res) => {
  try {
    const slotId = req.params.id;
    const slots = await query("SELECT * FROM charging_slots WHERE id = ?", [slotId]);

    if (!slots || slots.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const s = slots[0];
    res.json({
      success: true,
      data: {
        id: s.id,
        chargerId: `CHG${String(s.id).padStart(4, "0")}`,
        stationId: s.station_id,
        slotNumber: s.slot_number,
        chargerType: s.charger_type,
        powerKw: parseFloat(s.power_kw),
        pricePerKwh: parseFloat(s.price_per_kwh),
        status: s.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching slot", error: error.message });
  }
};

/**
 * POST /api/slots
 * Add a new slot to a charging station
 */
export const createSlot = async (req, res) => {
  try {
    const {
      station_id,
      stationId,
      slot_number,
      slotNumber,
      charger_type,
      chargerType = "DC_FAST",
      power_kw,
      powerKw = 60.0,
      price_per_kwh,
      pricePerKwh = 18.0,
      status = "AVAILABLE",
    } = req.body;

    const targetStationId = station_id || stationId;
    if (!targetStationId) {
      return res.status(400).json({ success: false, message: "Station ID is required." });
    }

    const cleanSlotNumber = slot_number || slotNumber || "BAY-01";
    const cleanType = charger_type || chargerType || "DC_FAST";
    const cleanPower = parseFloat(power_kw || powerKw) || 60.0;
    const cleanPrice = parseFloat(price_per_kwh || pricePerKwh) || 18.0;

    const result = await query(
      `INSERT INTO charging_slots (station_id, slot_number, charger_type, power_kw, price_per_kwh, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetStationId, cleanSlotNumber, cleanType, cleanPower, cleanPrice, status]
    );

    await syncStationSlotCounts(targetStationId);

    res.status(201).json({
      success: true,
      message: "Charging slot added successfully!",
      data: {
        id: result.insertId,
        chargerId: `CHG${String(result.insertId).padStart(4, "0")}`,
        stationId: targetStationId,
        slotNumber: cleanSlotNumber,
        chargerType: cleanType,
        powerKw: cleanPower,
        pricePerKwh: cleanPrice,
        status,
      },
    });
  } catch (error) {
    console.error("Create Slot Error:", error);
    res.status(500).json({ success: false, message: "Error creating slot", error: error.message });
  }
};

/**
 * PUT /api/slots/:id
 * Update charging slot details
 */
export const updateSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const {
      slot_number,
      slotNumber,
      charger_type,
      chargerType,
      power_kw,
      powerKw,
      price_per_kwh,
      pricePerKwh,
      status,
    } = req.body;

    const existing = await query("SELECT * FROM charging_slots WHERE id = ?", [slotId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const slot = existing[0];
    const cleanNumber = slot_number || slotNumber || slot.slot_number;
    const cleanType = charger_type || chargerType || slot.charger_type;
    const cleanPower = parseFloat(power_kw || powerKw || slot.power_kw);
    const cleanPrice = parseFloat(price_per_kwh || pricePerKwh || slot.price_per_kwh);
    const cleanStatus = status || slot.status;

    await query(
      `UPDATE charging_slots 
       SET slot_number = ?, charger_type = ?, power_kw = ?, price_per_kwh = ?, status = ?
       WHERE id = ?`,
      [cleanNumber, cleanType, cleanPower, cleanPrice, cleanStatus, slotId]
    );

    await syncStationSlotCounts(slot.station_id);

    res.json({
      success: true,
      message: "Slot updated successfully!",
      data: {
        id: parseInt(slotId, 10),
        chargerId: `CHG${String(slotId).padStart(4, "0")}`,
        stationId: slot.station_id,
        slotNumber: cleanNumber,
        chargerType: cleanType,
        powerKw: cleanPower,
        pricePerKwh: cleanPrice,
        status: cleanStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating slot", error: error.message });
  }
};

/**
 * PATCH /api/slots/:id/status
 * Toggle or update slot status (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE)
 */
export const updateSlotStatus = async (req, res) => {
  try {
    const slotId = req.params.id;
    const { status } = req.body;

    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];
    const upperStatus = (status || "").toUpperCase();

    if (!validStatuses.includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existing = await query("SELECT station_id FROM charging_slots WHERE id = ?", [slotId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    await query("UPDATE charging_slots SET status = ? WHERE id = ?", [upperStatus, slotId]);
    await syncStationSlotCounts(existing[0].station_id);

    res.json({
      success: true,
      message: `Slot status updated to ${upperStatus}`,
      slotId: parseInt(slotId, 10),
      status: upperStatus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating slot status", error: error.message });
  }
};

/**
 * DELETE /api/slots/:id
 * Delete a slot
 */
export const deleteSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const existing = await query("SELECT station_id FROM charging_slots WHERE id = ?", [slotId]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const stationId = existing[0].station_id;

    await query("DELETE FROM charging_slots WHERE id = ?", [slotId]);
    await syncStationSlotCounts(stationId);

    res.json({ success: true, message: "Slot deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting slot", error: error.message });
  }
};

export default {
  getSlotsByStation,
  getSlotById,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deleteSlot,
};
