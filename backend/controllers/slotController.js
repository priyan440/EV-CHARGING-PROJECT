import { query } from "../config/db.js";

// Recalculate station slot counts helper
const syncStationSlotCounts = async (stationId) => {
  try {
    const chargers = await query("SELECT status FROM chargers WHERE station_id = ?", [stationId]);
    const total = chargers.length;
    const available = chargers.filter((s) => s.status === "AVAILABLE").length;
    await query(
      "UPDATE stations SET total_slots = ?, available_slots = ? WHERE id = ?",
      [total, available, stationId]
    );
  } catch (err) {
    console.warn("syncStationSlotCounts warning:", err.message);
  }
};

/**
 * GET /api/slots/station/:stationId
 */
export const getSlotsByStation = async (req, res) => {
  try {
    const { stationId } = req.params;
    const chargers = await query(
      "SELECT * FROM chargers WHERE station_id = ? ORDER BY id ASC",
      [stationId]
    );

    const formatted = chargers.map((s) => ({
      id: s.id,
      slotId: s.id,
      chargerId: s.charger_id || `CHG${String(s.id).padStart(6, "0")}`,
      stationId: s.station_id,
      slotNumber: s.charger_name,
      chargerType: s.charger_type,
      connector: s.charger_type === "DC_FAST" ? "CCS2" : "Type 2",
      powerKw: parseFloat(s.power_kw),
      pricePerKwh: 18.0,
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
 */
export const getSlotById = async (req, res) => {
  try {
    const slotId = req.params.id;
    const chargers = await query("SELECT * FROM chargers WHERE id = ?", [slotId]);

    if (!chargers || chargers.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const s = chargers[0];
    res.json({
      success: true,
      data: {
        id: s.id,
        chargerId: s.charger_id || `CHG${String(s.id).padStart(6, "0")}`,
        stationId: s.station_id,
        slotNumber: s.charger_name,
        chargerType: s.charger_type,
        powerKw: parseFloat(s.power_kw),
        pricePerKwh: 18.0,
        status: s.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching slot", error: error.message });
  }
};

/**
 * POST /api/slots
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
      status = "AVAILABLE",
    } = req.body;

    const targetStationId = station_id || stationId;
    if (!targetStationId) {
      return res.status(400).json({ success: false, message: "Station ID is required." });
    }

    const cleanSlotNumber = slot_number || slotNumber || "Charger 1";
    const cleanType = charger_type || chargerType || "DC_FAST";
    const cleanPower = parseFloat(power_kw || powerKw) || 60.0;

    const [cMax] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM chargers");
    const nextCId = (cMax[0]?.maxId || 0) + 1;
    const charger_id = `CHG${String(nextCId).padStart(6, "0")}`;

    const result = await query(
      `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, status, connector_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [charger_id, targetStationId, cleanSlotNumber, cleanType, cleanPower, status]
    );

    await syncStationSlotCounts(targetStationId);

    res.status(201).json({
      success: true,
      message: "Charging slot added successfully!",
      data: {
        id: result.insertId,
        chargerId: charger_id,
        stationId: targetStationId,
        slotNumber: cleanSlotNumber,
        chargerType: cleanType,
        powerKw: cleanPower,
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
 */
export const updateSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const { slot_number, slotNumber, charger_type, chargerType, power_kw, powerKw, status } = req.body;

    const existing = await query("SELECT * FROM chargers WHERE id = ?", [slotId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const slot = existing[0];
    const cleanNumber = slot_number || slotNumber || slot.charger_name;
    const cleanType = charger_type || chargerType || slot.charger_type;
    const cleanPower = parseFloat(power_kw || powerKw || slot.power_kw);
    const cleanStatus = status || slot.status;

    await query(
      `UPDATE chargers 
       SET charger_name = ?, charger_type = ?, power_kw = ?, status = ?
       WHERE id = ?`,
      [cleanNumber, cleanType, cleanPower, cleanStatus, slotId]
    );

    await syncStationSlotCounts(slot.station_id);

    res.json({
      success: true,
      message: "Slot updated successfully!",
      data: {
        id: parseInt(slotId, 10),
        chargerId: slot.charger_id,
        stationId: slot.station_id,
        slotNumber: cleanNumber,
        chargerType: cleanType,
        powerKw: cleanPower,
        status: cleanStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating slot", error: error.message });
  }
};

/**
 * PATCH /api/slots/:id/status
 */
export const updateSlotStatus = async (req, res) => {
  try {
    const slotId = req.params.id;
    const { status } = req.body;

    const validStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "CHARGING", "MAINTENANCE", "FAULTED", "OFFLINE"];
    const upperStatus = (status || "").toUpperCase();

    if (!validStatuses.includes(upperStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existing = await query("SELECT station_id FROM chargers WHERE id = ?", [slotId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    await query("UPDATE chargers SET status = ? WHERE id = ?", [upperStatus, slotId]);
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
 */
export const deleteSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const existing = await query("SELECT station_id FROM chargers WHERE id = ?", [slotId]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    const stationId = existing[0].station_id;

    await query("DELETE FROM chargers WHERE id = ?", [slotId]);
    await syncStationSlotCounts(stationId);

    res.json({ success: true, message: "Slot deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting slot", error: error.message });
  }
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
};

const minutesToTimeStr = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

const formatTime12h = (timeStr) => {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * GET /api/slots/timeline
 * Full 24-hour timeline with booked intervals, maintenance, and available windows for dynamic duration
 */
export const getChargerTimeline = async (req, res) => {
  try {
    const {
      stationId,
      station_id,
      chargerId,
      charger_id,
      date,
      booking_date,
      durationMinutes,
      duration_minutes,
    } = req.query;

    const sId = stationId || station_id;
    const cId = chargerId || charger_id;
    const durMins = Math.max(5, parseInt(durationMinutes || duration_minutes, 10) || 30);
    const cleanDate = (date || booking_date || new Date().toISOString().split("T")[0]).split("T")[0];

    // Find charger and station
    let charger = null;
    if (cId) {
      const isNum = /^\d+$/.test(cId);
      const chgRows = await query(
        `SELECT c.*, s.station_name, s.opening_time, s.closing_time, s.status as station_status,
                t.base_rate_per_kwh
         FROM chargers c
         JOIN stations s ON c.station_id = s.id
         LEFT JOIN tariffs t ON s.id = t.station_id AND t.status = 'ACTIVE'
         WHERE c.id = ? OR c.charger_id = ? LIMIT 1`,
        [isNum ? parseInt(cId, 10) : 0, String(cId)]
      );
      if (chgRows.length > 0) charger = chgRows[0];
    }

    if (!charger && sId) {
      const isStnNum = /^\d+$/.test(sId);
      const chgRows = await query(
        `SELECT c.*, s.station_name, s.opening_time, s.closing_time, s.status as station_status,
                t.base_rate_per_kwh
         FROM chargers c
         JOIN stations s ON c.station_id = s.id
         LEFT JOIN tariffs t ON s.id = t.station_id AND t.status = 'ACTIVE'
         WHERE s.id = ? OR s.station_id = ?
         ORDER BY c.id ASC LIMIT 1`,
        [isStnNum ? parseInt(sId, 10) : 0, String(sId)]
      );
      if (chgRows.length > 0) charger = chgRows[0];
    }

    if (!charger) {
      return res.status(404).json({ success: false, message: "Charger or station not found." });
    }

    // Fetch existing bookings for this charger on date
    const bookings = await query(
      `SELECT id, booking_id, start_time, end_time, duration_minutes, booking_status
       FROM bookings
       WHERE (charger_id = ? OR connector_id = ?)
         AND booking_date = ?
         AND booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
       ORDER BY start_time ASC`,
      [charger.id, charger.id, cleanDate]
    );

    const bookedIntervals = (bookings || []).map((b) => {
      const startMins = parseTimeToMinutes(b.start_time);
      const endMins = parseTimeToMinutes(b.end_time);
      return {
        bookingId: b.booking_id || `EV${String(b.id).padStart(4, "0")}`,
        startTime: String(b.start_time).slice(0, 5),
        endTime: String(b.end_time).slice(0, 5),
        startTimeFormatted: formatTime12h(b.start_time),
        endTimeFormatted: formatTime12h(b.end_time),
        startMinutes: startMins,
        endMinutes: endMins,
        durationMinutes: b.duration_minutes || (endMins - startMins),
        status: b.booking_status,
      };
    });

    const isMaintenance = ["MAINTENANCE", "FAULTED", "OFFLINE"].includes((charger.status || "").toUpperCase());

    // Current time in minutes if date is today
    const getLocalDateStr = (d = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const isToday = cleanDate === todayStr;
    const isPastDate = cleanDate < todayStr;
    const currentMins = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
    const minStartMins = isToday ? currentMins : 0;

    // Station open/close in minutes (default 00:00 to 24:00)
    const openMins = 0; // 24-Hour accessible
    const closeMins = 1440;

    // Build 24 Hourly timeline segments
    const hourlyTimeline = [];
    for (let h = 0; h < 24; h++) {
      const hStart = h * 60;
      const hEnd = (h + 1) * 60;
      const isPast = isToday && hEnd <= currentMins;

      // Check overlap with bookings
      const overlaps = bookedIntervals.filter((b) => b.startMinutes < hEnd && b.endMinutes > hStart);

      let status = "AVAILABLE";
      if (isMaintenance) status = "MAINTENANCE";
      else if (overlaps.length > 0) status = "BOOKED";
      else if (isPast) status = "PAST";

      const ampm = h >= 12 ? "PM" : "AM";
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayHour} ${ampm}`;

      hourlyTimeline.push({
        hour: h,
        startMinutes: hStart,
        endMinutes: hEnd,
        startTime: `${String(h).padStart(2, "0")}:00`,
        label,
        status,
        bookedCount: overlaps.length,
      });
    }

    // Build 15-minute interval blocks for granular 24-hour visual display
    const granularBlocks = [];
    for (let m = 0; m < 1440; m += 15) {
      const bStart = m;
      const bEnd = m + 15;
      const isPast = isToday && bEnd <= currentMins;
      const overlaps = bookedIntervals.filter((b) => b.startMinutes < bEnd && b.endMinutes > bStart);

      let status = "AVAILABLE";
      if (isMaintenance) status = "MAINTENANCE";
      else if (overlaps.length > 0) status = "BOOKED";
      else if (isPast) status = "PAST";

      const timeStr = minutesToTimeStr(m).slice(0, 5);
      granularBlocks.push({
        minutes: m,
        time: timeStr,
        formatted: formatTime12h(timeStr),
        status,
      });
    }

    // Find Earliest Available Slot that can fit the required duration
    let earliestSlot = null;

    if (!isMaintenance && !isPastDate) {
      for (let t = minStartMins; t + durMins <= closeMins; t += 5) {
        const slotEnd = t + durMins;
        const hasCollision = bookedIntervals.some((b) => t < b.endMinutes && slotEnd > b.startMinutes);
        if (!hasCollision) {
          const sTime = minutesToTimeStr(t).slice(0, 5);
          const eTime = minutesToTimeStr(slotEnd).slice(0, 5);
          earliestSlot = {
            startTime: sTime,
            endTime: eTime,
            startTimeFormatted: formatTime12h(sTime),
            endTimeFormatted: formatTime12h(eTime),
            startMinutes: t,
            endMinutes: slotEnd,
            durationMinutes: durMins,
            available: true,
          };
          break;
        }
      }
    }

    // Generate list of dynamic valid slots across the 24 hours (15-min increments)
    const availableIntervals = [];
    if (!isMaintenance && !isPastDate) {
      for (let t = 0; t + durMins <= closeMins; t += 15) {
        if (isToday && t < minStartMins) continue;

        const slotEnd = t + durMins;
        const hasCollision = bookedIntervals.some((b) => t < b.endMinutes && slotEnd > b.startMinutes);
        if (!hasCollision) {
          const sTime = minutesToTimeStr(t).slice(0, 5);
          const eTime = minutesToTimeStr(slotEnd).slice(0, 5);
          availableIntervals.push({
            startTime: sTime,
            endTime: eTime,
            startTimeFormatted: formatTime12h(sTime),
            endTimeFormatted: formatTime12h(eTime),
            durationMinutes: durMins,
            label: `${formatTime12h(sTime)} - ${formatTime12h(eTime)}`,
          });
        }
      }
    }

    res.json({
      success: true,
      charger: {
        id: charger.id,
        chargerId: charger.charger_id || `CHG${String(charger.id).padStart(6, "0")}`,
        chargerName: charger.charger_name,
        chargerType: charger.charger_type,
        powerKw: parseFloat(charger.power_kw) || 60.0,
        status: charger.status,
        ratePerKwh: parseFloat(charger.base_rate_per_kwh) || 18.0,
      },
      station: {
        id: charger.station_id,
        stationName: charger.station_name,
        openingTime: charger.opening_time || "00:00",
        closingTime: charger.closing_time || "23:59",
      },
      date: cleanDate,
      durationMinutes: durMins,
      bookedIntervals,
      hourlyTimeline,
      granularBlocks,
      earliestSlot,
      availableSlots: availableIntervals,
      totalAvailableSlots: availableIntervals.length,
    });
  } catch (error) {
    console.error("Get Charger Timeline Error:", error);
    res.status(500).json({ success: false, message: "Error calculating timeline", error: error.message });
  }
};

/**
 * GET /api/slots/station-timeline
 * Comprehensive multi-charger timeline grid for an entire station
 */
export const getStationTimeline = async (req, res) => {
  try {
    const {
      stationId,
      station_id,
      date,
      booking_date,
      durationMinutes,
      duration_minutes,
      vehicleId,
    } = req.query;

    const sId = stationId || station_id;
    if (!sId) {
      return res.status(400).json({ success: false, message: "stationId is required." });
    }

    const durMins = Math.max(5, parseInt(durationMinutes || duration_minutes, 10) || 20);
    const cleanDate = (date || booking_date || new Date().toISOString().split("T")[0]).split("T")[0];

    const isStnNum = /^\d+$/.test(sId);
    const stnRows = await query(
      `SELECT s.*, t.base_rate_per_kwh 
       FROM stations s
       LEFT JOIN tariffs t ON s.id = t.station_id AND t.status = 'ACTIVE'
       WHERE s.id = ? OR s.station_id = ? LIMIT 1`,
      [isStnNum ? parseInt(sId, 10) : 0, String(sId)]
    );

    if (!stnRows || stnRows.length === 0) {
      return res.status(404).json({ success: false, message: "Station not found." });
    }
    const station = stnRows[0];

    // Fetch chargers of this station
    const chargers = await query(
      `SELECT c.*, sc.id as connector_table_id, ct.connector_name
       FROM chargers c
       LEFT JOIN station_connectors sc ON c.id = sc.charger_id
       LEFT JOIN connector_types ct ON sc.connector_type_id = ct.id
       WHERE c.station_id = ?
       ORDER BY c.id ASC`,
      [station.id]
    );

    // Fetch active bookings for this station on this date
    const allBookings = await query(
      `SELECT b.id, b.booking_id, b.charger_id, b.connector_id, b.start_time, b.end_time, 
              b.duration_minutes, b.booking_status, b.actual_charging_minutes
       FROM bookings b
       WHERE b.station_id = ?
         AND b.booking_date = ?
         AND b.booking_status NOT IN ('CANCELLED', 'EXPIRED', 'NO_SHOW')
       ORDER BY b.start_time ASC`,
      [station.id, cleanDate]
    );

    // Helper for local YYYY-MM-DD
    const getLocalDateStr = (d = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const isToday = cleanDate === todayStr;
    const isPastDate = cleanDate < todayStr;
    const currentMins = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
    // For today, allow slots at or after current time (e.g. 8:00 AM when current time is 7:30 AM)
    const minStartMins = isToday ? currentMins : 0;

    let overallEarliest = null;
    let recommendedCharger = null;

    const chargerTimelines = chargers.map((c) => {
      const cId = c.id;
      const cBookings = allBookings.filter((b) => b.charger_id === cId || b.connector_id === cId);
      const isMaintenance = ["MAINTENANCE", "FAULTED", "OFFLINE"].includes((c.status || "").toUpperCase());

      const bookedIntervals = cBookings.map((b) => {
        const startMins = parseTimeToMinutes(b.start_time);
        const endMins = parseTimeToMinutes(b.end_time);
        return {
          id: b.id,
          bookingId: b.booking_id || `EV${String(b.id).padStart(4, "0")}`,
          startTime: String(b.start_time).slice(0, 5),
          endTime: String(b.end_time).slice(0, 5),
          startTimeFormatted: formatTime12h(b.start_time),
          endTimeFormatted: formatTime12h(b.end_time),
          startMinutes: startMins,
          endMinutes: endMins,
          durationMinutes: b.duration_minutes || (endMins - startMins),
          status: b.booking_status, // 'CHARGING', 'CONFIRMED', etc.
        };
      });

      // Generate dynamic available slots for this charger (15-min intervals across 24h)
      const availableSlots = [];
      let chargerEarliestSlot = null;

      if (!isMaintenance && !isPastDate) {
        // Generate valid charging slots across 24 hours (00:00 to 24:00)
        for (let t = 0; t + durMins <= 1440; t += 15) {
          const isSlotInPast = isToday && t < minStartMins;
          if (isSlotInPast) continue;

          const slotEnd = t + durMins;
          const hasCollision = bookedIntervals.some((b) => t < b.endMinutes && slotEnd > b.startMinutes);
          if (!hasCollision) {
            const sTime = minutesToTimeStr(t).slice(0, 5);
            const eTime = minutesToTimeStr(slotEnd).slice(0, 5);
            const slotObj = {
              startTime: sTime,
              endTime: eTime,
              startTimeFormatted: formatTime12h(sTime),
              endTimeFormatted: formatTime12h(eTime),
              startMinutes: t,
              endMinutes: slotEnd,
              durationMinutes: durMins,
              label: `${formatTime12h(sTime)} - ${formatTime12h(eTime)}`,
            };
            availableSlots.push(slotObj);
            if (!chargerEarliestSlot) {
              chargerEarliestSlot = slotObj;
            }
          }
        }
      }

      // Check for global earliest recommendation
      if (chargerEarliestSlot && (!overallEarliest || chargerEarliestSlot.startMinutes < overallEarliest.startMinutes)) {
        overallEarliest = chargerEarliestSlot;
        recommendedCharger = {
          chargerId: c.id,
          chargerName: c.charger_name,
          powerKw: parseFloat(c.power_kw) || 60,
          chargerType: c.charger_type,
          earliestSlot: chargerEarliestSlot,
        };
      }

      return {
        id: c.id,
        chargerId: c.charger_id || `CHG${String(c.id).padStart(6, "0")}`,
        chargerName: c.charger_name,
        chargerType: c.charger_type,
        connectorType: c.connector_name || (c.charger_type === "DC_FAST" ? "CCS2" : "Type 2"),
        powerKw: parseFloat(c.power_kw) || 60.0,
        ratePerKwh: parseFloat(station.base_rate_per_kwh || 18.0),
        status: c.status,
        isAvailable: c.status === "AVAILABLE" && !isMaintenance,
        bookedIntervals,
        availableSlots,
        totalAvailable: availableSlots.length,
        earliestSlot: chargerEarliestSlot,
      };
    });

    res.json({
      success: true,
      station: {
        id: station.id,
        stationId: station.station_id,
        stationName: station.station_name,
        address: station.address,
        city: station.city,
        state: station.state,
        phone: station.contact_number || "+91 98765 43210",
        openingTime: station.opening_time || "Open 24 Hours",
        ratePerKwh: parseFloat(station.base_rate_per_kwh || 18.0),
        amenities: station.amenities ? station.amenities.split(",") : ["Restroom", "Café", "WiFi", "Waiting Area"],
      },
      date: cleanDate,
      durationMinutes: durMins,
      chargers: chargerTimelines,
      recommendedCharger,
      earliestAvailableTime: overallEarliest ? overallEarliest.startTimeFormatted : null,
    });
  } catch (error) {
    console.error("Get Station Timeline Error:", error);
    res.status(500).json({ success: false, message: "Error calculating station timeline", error: error.message });
  }
};

/**
 * GET /api/slots/earliest
 * Quick lookup for earliest available slot on a charger
 */
export const getEarliestSlot = async (req, res) => {
  return getChargerTimeline(req, res);
};

export default {
  getSlotsByStation,
  getSlotById,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deleteSlot,
  getChargerTimeline,
  getStationTimeline,
  getEarliestSlot,
};
