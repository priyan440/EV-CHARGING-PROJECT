import { query, transaction } from "../config/db.js";
import { computeDynamicPrice } from "../utils/pricingCalculator.js";
import {
  emitBookingCreated,
  emitBookingUpdated,
  emitBookingCancelled,
  emitBookingCompleted,
  emitDashboardStats,
} from "../services/socketService.js";

// Helper to generate next unique booking ID: EV001, EV002, EV00125, etc.
const generateNextBookingId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT id, booking_id FROM bookings ORDER BY id DESC LIMIT 1"
  );
  let nextNum = 1;
  if (rows && rows.length > 0) {
    const lastId = rows[0].booking_id;
    const match = lastId?.match(/^EV(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    } else {
      nextNum = rows[0].id + 1;
    }
  }

  let candidate = `EV${String(nextNum).padStart(3, "0")}`;
  let exists = true;
  while (exists) {
    const [check] = await connection.execute(
      "SELECT id FROM bookings WHERE booking_id = ?",
      [candidate]
    );
    if (check.length === 0) {
      exists = false;
    } else {
      nextNum++;
      candidate = `EV${String(nextNum).padStart(3, "0")}`;
    }
  }
  return candidate;
};

// Helper to add minutes to HH:MM or HH:MM:SS string
const calculateEndTimeString = (startTimeStr, durationMinutes) => {
  try {
    const parts = (startTimeStr || "10:00:00").split(":");
    let hours = parseInt(parts[0], 10) || 10;
    let minutes = parseInt(parts[1], 10) || 0;

    let totalMins = hours * 60 + minutes + Math.round(durationMinutes);
    let endHours = Math.floor(totalMins / 60) % 24;
    let endMins = totalMins % 60;

    return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}:00`;
  } catch {
    return "11:30:00";
  }
};

// Helper to format minutes into "1 hr 36 min" or "45 min"
const formatDurationHuman = (minutes) => {
  const mins = Math.round(minutes);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0 && remMins > 0) return `${hrs} hr ${remMins} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${mins} min`;
};

// Helper to format booking object for frontend with full metadata
export const formatBooking = (b) => {
  const amount = parseFloat(b.amount) || 0;
  const chargingPower = parseFloat(b.charging_power) || 25.0;
  const energyRequired = parseFloat(b.energy_required) || 36.0;
  const durationMins = parseFloat(b.duration || b.estimated_duration) || 60;
  const startPct = parseInt(b.battery_start_pct, 10) || 20;
  const targetPct = parseInt(b.battery_target_pct, 10) || 80;

  const rawStatus = (b.status || "CONFIRMED").toUpperCase();
  const rawDate = b.booking_date
    ? new Date(b.booking_date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // Determine payment status
  let paymentStatus = "PENDING";
  if (["CONFIRMED", "COMPLETED", "IN_PROGRESS", "CHECKED_IN", "CHARGING", "PROTECTED", "ACTIVE"].includes(rawStatus)) {
    paymentStatus = "PAID";
  } else if (rawStatus === "CANCELLED") {
    paymentStatus = "REFUNDED";
  } else if (b.payment_status) {
    paymentStatus = b.payment_status.toUpperCase();
  }

  const isOffline = Boolean(b.is_offline);

  return {
    id: b.id,
    bookingId: b.booking_id || `EV${String(b.id).padStart(3, "0")}`,
    booking_id: b.booking_id || `EV${String(b.id).padStart(3, "0")}`,
    userId: b.user_id,
    counterId: `CUS${String(b.user_id || 1).padStart(4, "0")}`,
    customerName: b.customer_name || b.user_name || (isOffline ? "Walk-in Customer" : "EV Customer"),
    customerEmail: b.user_email || (isOffline ? "walkin@station.ev" : "customer@evcharge.pro"),
    customerPhone: b.customer_phone || b.user_phone || "+91 98765 43210",
    
    // Vehicle Details
    vehicleId: b.vehicle_id,
    vehicleNumber: b.vehicle_number || "TN58AB1234",
    vehicleModel: b.model ? `${b.brand || ""} ${b.model}`.trim() : "Tata Nexon EV Max",
    vehicleType: b.vehicle_type || "Car",
    
    // Station & Slot Details
    stationId: b.station_id,
    stationIdCode: `STA${String(b.station_id || 1).padStart(3, "0")}`,
    stationName: b.station_name || "GreenCharge Central",
    stationAddress: b.station_address || "Chennai EV Hub",
    slotId: b.slot_id,
    connectorId: b.connector_id || (b.slot_id ? `STA${String(b.station_id || 1).padStart(3, "0")}-C0${b.slot_id}` : "STA001-C01"),
    chargerId: b.slot_id ? `CHG${String(b.slot_id).padStart(4, "0")}` : "CHG0001",
    slotNumber: b.slot_number || b.bay_number || "C01",
    connectorType: b.connector_type || (b.charger_type === "AC" ? "Type 2" : "CCS2"),
    chargerType: b.charger_type || b.charging_type || "DC_FAST",
    chargingType: b.charging_type || (b.charger_type === "AC" ? "AC Charging" : "DC Fast Charging"),
    
    // Battery & Energy Metrics
    batteryStartPct: startPct,
    batteryTargetPct: targetPct,
    currentBattery: startPct,
    targetBattery: targetPct,
    batteryTransition: `${startPct}% → ${targetPct}%`,
    energyRequired,
    chargingPower,
    chargingPowerKw: chargingPower,
    
    // Duration & Timing
    duration: formatDurationHuman(durationMins),
    durationMinutes: durationMins,
    estimatedDuration: formatDurationHuman(durationMins),
    date: rawDate,
    bookingDate: b.booking_date || rawDate,
    time: b.start_time || "10:00:00",
    startTime: b.start_time || "10:00:00",
    endTime: b.end_time || calculateEndTimeString(b.start_time, durationMins),
    timeSlot: `${(b.start_time || "10:00").slice(0, 5)} - ${(b.end_time || calculateEndTimeString(b.start_time, durationMins)).slice(0, 5)}`,
    
    // Financials & Payment
    amount,
    totalAmount: amount,
    price: amount,
    paymentMethod: b.payment_method || (isOffline ? "Cash / POS" : "Razorpay Test Mode"),
    paymentStatus,
    
    // Status & Operational Metadata
    status: rawStatus,
    isOffline,
    bookingSource: isOffline ? "Offline / Walk-in" : "Online",
    assignedStaff: b.operator_name || "Station Bay Operator",
    checkedInAt: b.checked_in_at,
    isCheckedIn: Boolean(b.checked_in_at || ["CHECKED_IN", "CHARGING"].includes(rawStatus)),
    qrToken: b.qr_token || `QR_${b.booking_id || b.id}`,
    checkInToken: b.check_in_token || b.qr_token || `QR_${b.booking_id || b.id}`,
    noShowAt: b.no_show_at,
    createdAt: b.created_at || new Date().toISOString(),
  };
};

const parseId = (val) => {
  if (!val) return null;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
};

/**
 * Compute Real-Time Dashboard Statistics from MySQL
 */
export const computeDashboardStats = async (ownerId = null, role = "ADMIN") => {
  try {
    let baseFilter = "";
    let params = [];

    if (role === "STATION_OWNER" && ownerId) {
      baseFilter = "WHERE s.owner_id = ?";
      params.push(ownerId);
    }

    const sql = `
      SELECT 
        COUNT(b.id) as totalBookings,
        SUM(CASE WHEN DATE(b.booking_date) = CURDATE() THEN 1 ELSE 0 END) as todayBookings,
        SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END) as pendingBookings,
        SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedBookings,
        SUM(CASE WHEN b.status IN ('IN_PROGRESS', 'CHARGING', 'CHECKED_IN') THEN 1 ELSE 0 END) as inProgressBookings,
        SUM(CASE WHEN b.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN b.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelledBookings,
        SUM(CASE WHEN b.status = 'NO_SHOW' THEN 1 ELSE 0 END) as noShowBookings,
        SUM(CASE WHEN DATE(b.booking_date) >= CURDATE() AND b.status IN ('CONFIRMED', 'PENDING') THEN 1 ELSE 0 END) as upcomingBookings,
        COALESCE(SUM(CASE WHEN DATE(b.booking_date) = CURDATE() AND b.status != 'CANCELLED' THEN b.amount ELSE 0 END), 0) as todayRevenue,
        COALESCE(SUM(CASE WHEN b.status != 'CANCELLED' THEN b.amount ELSE 0 END), 0) as totalRevenue
      FROM bookings b
      LEFT JOIN charging_stations s ON b.station_id = s.id
      ${baseFilter}
    `;

    const rows = await query(sql, params);
    const s = rows[0] || {};

    return {
      totalBookings: parseInt(s.totalBookings, 10) || 0,
      todayBookings: parseInt(s.todayBookings, 10) || 0,
      pendingBookings: parseInt(s.pendingBookings, 10) || 0,
      confirmedBookings: parseInt(s.confirmedBookings, 10) || 0,
      inProgressBookings: parseInt(s.inProgressBookings, 10) || 0,
      completedBookings: parseInt(s.completedBookings, 10) || 0,
      cancelledBookings: parseInt(s.cancelledBookings, 10) || 0,
      noShowBookings: parseInt(s.noShowBookings, 10) || 0,
      upcomingBookings: parseInt(s.upcomingBookings, 10) || 0,
      todayRevenue: parseFloat(s.todayRevenue) || 0,
      totalRevenue: parseFloat(s.totalRevenue) || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Error computing dashboard stats:", err);
    return {
      totalBookings: 0,
      todayBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      inProgressBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      noShowBookings: 0,
      upcomingBookings: 0,
      todayRevenue: 0,
      totalRevenue: 0,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * GET /api/bookings/stats/owner & GET /api/bookings/stats
 * Endpoint to retrieve up-to-the-second dashboard statistics
 */
export const getDashboardStatsEndpoint = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const stats = await computeDashboardStats(userId, role);
    res.json({ success: true, stats, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error calculating statistics", error: error.message });
  }
};

/**
 * POST /api/bookings
 * Atomic Booking with Capacity Validation, Conflict Checking, and Real-Time Socket Broadcast
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      vehicleId,
      vehicleNumber,
      customerName,
      customerPhone,
      station_id,
      stationId,
      slot_id,
      slotId,
      connector_id,
      connectorId,
      current_battery,
      currentBattery,
      battery_start_pct,
      target_battery,
      targetBattery,
      battery_target_pct,
      duration,
      booking_date,
      bookingDate,
      date,
      start_time,
      startTime,
      time,
      payment_method = "Razorpay Test Mode",
      paymentMethod,
      amount,
      totalAmount,
      is_offline = false,
      isOffline = false,
      status: initialStatus = "CONFIRMED",
    } = req.body;

    const rawStationId = station_id || stationId;
    if (!rawStationId) {
      return res.status(400).json({ success: false, message: "Station ID is required." });
    }
    const targetStationId = parseId(rawStationId);

    const cleanDate = booking_date || bookingDate || date || new Date().toISOString().split("T")[0];
    const cleanStartTime = start_time || startTime || time || "10:00:00";
    const startPct = parseInt(battery_start_pct ?? current_battery ?? currentBattery ?? 20, 10);
    const targetPct = parseInt(battery_target_pct ?? target_battery ?? targetBattery ?? 80, 10);

    if (startPct >= targetPct) {
      return res.status(400).json({
        success: false,
        message: "Target battery percentage must be greater than current battery level.",
      });
    }

    const offlineFlag = Boolean(is_offline || isOffline);

    // Begin Database Transaction
    const newBooking = await transaction(async (connection) => {
      // 1. Fetch Station Details with Row Lock
      const [stationRows] = await connection.execute(
        "SELECT * FROM charging_stations WHERE id = ? FOR UPDATE",
        [targetStationId]
      );
      if (!stationRows || stationRows.length === 0) {
        throw new Error(`Station not found with ID: ${targetStationId}`);
      }
      const station = stationRows[0];
      const stationMaxPower = parseFloat(station.max_power) || 120.0;

      // 2. Fetch or Resolve Vehicle
      let resolvedVehicleId = parseId(vehicle_id || vehicleId);
      let vehicleRecord = null;
      if (resolvedVehicleId) {
        const [vRows] = await connection.execute(
          "SELECT * FROM vehicles WHERE id = ?",
          [resolvedVehicleId]
        );
        if (vRows && vRows.length > 0) vehicleRecord = vRows[0];
      }

      if (!vehicleRecord) {
        const [userVehicles] = await connection.execute(
          "SELECT * FROM vehicles WHERE user_id = ? ORDER BY id ASC LIMIT 1",
          [userId]
        );
        if (userVehicles && userVehicles.length > 0) {
          vehicleRecord = userVehicles[0];
          resolvedVehicleId = vehicleRecord.id;
        } else {
          // Auto-insert vehicle if not present
          const [insVeh] = await connection.execute(
            `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, battery_capacity, max_charging_power)
             VALUES (?, ?, 'Car', 'Tata Motors', 'Nexon EV Max', 40.50, 50.00)`,
            [userId, (vehicleNumber || `TN58EV${Date.now().toString().slice(-4)}`).toUpperCase()]
          );
          resolvedVehicleId = insVeh.insertId;
          const [newV] = await connection.execute("SELECT * FROM vehicles WHERE id = ?", [resolvedVehicleId]);
          vehicleRecord = newV[0];
        }
      }

      const batteryCapacity = parseFloat(vehicleRecord?.battery_capacity) || 40.50;
      const vehicleMaxPower = parseFloat(vehicleRecord?.max_charging_power) || 50.00;

      // 3. Fetch or Resolve Connector / Slot with Row Lock
      let targetSlotId = parseId(slot_id || slotId);
      let targetConnectorId = connector_id || connectorId;
      let slotRecord = null;

      if (targetSlotId) {
        const [sRows] = await connection.execute(
          "SELECT * FROM charging_slots WHERE id = ? FOR UPDATE",
          [targetSlotId]
        );
        if (sRows && sRows.length > 0) slotRecord = sRows[0];
      } else if (targetConnectorId) {
        const [sRows] = await connection.execute(
          "SELECT * FROM charging_slots WHERE station_id = ? AND connector_id = ? FOR UPDATE",
          [targetStationId, targetConnectorId]
        );
        if (sRows && sRows.length > 0) slotRecord = sRows[0];
      }

      if (!slotRecord) {
        // Find first available slot in station
        const [availSlots] = await connection.execute(
          "SELECT * FROM charging_slots WHERE station_id = ? AND status = 'AVAILABLE' ORDER BY id ASC LIMIT 1 FOR UPDATE",
          [targetStationId]
        );
        if (availSlots && availSlots.length > 0) {
          slotRecord = availSlots[0];
        } else {
          const [anySlots] = await connection.execute(
            "SELECT * FROM charging_slots WHERE station_id = ? ORDER BY id ASC LIMIT 1 FOR UPDATE",
            [targetStationId]
          );
          if (anySlots && anySlots.length > 0) {
            slotRecord = anySlots[0];
          } else {
            throw new Error("No connectors available at this charging station.");
          }
        }
      }

      targetSlotId = slotRecord.id;
      targetConnectorId = slotRecord.connector_id || `STA${String(targetStationId).padStart(3, "0")}-C01`;
      const connectorMaxPower = parseFloat(slotRecord.power_kw || slotRecord.max_power) || 50.0;
      const pricePerKwh = parseFloat(slotRecord.price_per_kwh) || 18.0;

      // 4. Dynamic Station Load Check
      const [activeLoads] = await connection.execute(
        `SELECT COALESCE(SUM(charging_power), 0) as totalLoad 
         FROM bookings 
         WHERE station_id = ? 
           AND status IN ('CONFIRMED', 'IN_PROGRESS') 
           AND booking_date = ?`,
        [targetStationId, cleanDate]
      );
      const currentStationLoad = parseFloat(activeLoads[0]?.totalLoad || 0);
      const availableStationPower = Math.max(0, stationMaxPower - currentStationLoad);

      // Effective Charging Power
      const effectiveChargingPower = Math.min(vehicleMaxPower, connectorMaxPower, availableStationPower > 0 ? availableStationPower : 25.0);

      // 5. Energy & Duration Calculation
      const energyRequired = parseFloat(((batteryCapacity * (targetPct - startPct)) / 100).toFixed(2));
      const chargingEfficiency = 0.90;
      const adjustedEnergy = energyRequired / chargingEfficiency;

      const estimatedDurationMinutes = Math.max(15, Math.round((adjustedEnergy / Math.max(10, effectiveChargingPower)) * 60));
      const cleanDuration = parseFloat(duration) || estimatedDurationMinutes;
      const cleanEndTime = calculateEndTimeString(cleanStartTime, cleanDuration);

      // 6. Overlapping Slot Conflict Detection (Server-side lock prevents double booking)
      const [conflicts] = await connection.execute(
        `SELECT id, booking_id, start_time, end_time FROM bookings 
         WHERE slot_id = ? 
           AND booking_date = ? 
           AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')
           AND NOT (end_time <= ? OR start_time >= ?)`,
        [targetSlotId, cleanDate, cleanStartTime, cleanEndTime]
      );

      if (conflicts && conflicts.length > 0) {
        throw new Error(
          `Connector unavailable during the selected time (${cleanStartTime.slice(0, 5)} - ${cleanEndTime.slice(0, 5)}). Please select another bay or time.`
        );
      }

      // 7. Dynamic Pricing & Total Amount Calculation
      const dynamicQuote = computeDynamicPrice({
        basePricePerKwh: pricePerKwh,
        time: cleanStartTime,
        slots: [slotRecord],
      });

      let bookingAmount = parseFloat(amount || totalAmount);
      if (!bookingAmount || isNaN(bookingAmount)) {
        const energyCost = adjustedEnergy * dynamicQuote.effectivePricePerKwh;
        const subtotal = energyCost + 20; // 20 INR service fee
        bookingAmount = Math.round(subtotal * 1.18 * 100) / 100; // 18% GST
      }

      // 8. Generate Unique Booking ID & QR Token
      const bookingIdCode = await generateNextBookingId(connection);
      const secureQrToken = `QR_${bookingIdCode}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Fetch user info for snapshot
      const [userSnapshot] = await connection.execute("SELECT name, phone FROM users WHERE id = ?", [userId]);
      const custName = customerName || userSnapshot?.[0]?.name || (offlineFlag ? "Walk-in Customer" : "EV Customer");
      const custPhone = customerPhone || userSnapshot?.[0]?.phone || "+91 98765 43210";
      const vehNum = (vehicleNumber || vehicleRecord?.vehicle_number || "TN58AB1234").toUpperCase();

      const bookingStatus = (initialStatus || "CONFIRMED").toUpperCase();

      // 9. Insert Booking Record into MySQL
      const [insertResult] = await connection.execute(
        `INSERT INTO bookings 
         (booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, vehicle_type, charging_type, charging_power, energy_required, estimated_duration, duration, booking_date, start_time, end_time, battery_start_pct, battery_target_pct, payment_method, amount, status, qr_token, check_in_token, customer_name, customer_phone, vehicle_number, is_offline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingIdCode,
          userId,
          resolvedVehicleId,
          targetStationId,
          targetSlotId,
          targetConnectorId,
          vehicleRecord?.vehicle_type || "Car",
          slotRecord.charger_type === "AC" ? "AC Charging" : "DC Fast Charging",
          effectiveChargingPower,
          energyRequired,
          cleanDuration,
          cleanDuration,
          cleanDate,
          cleanStartTime,
          cleanEndTime,
          startPct,
          targetPct,
          payment_method || paymentMethod || (offlineFlag ? "Cash / POS" : "Razorpay Test Mode"),
          bookingAmount,
          bookingStatus,
          secureQrToken,
          secureQrToken,
          custName,
          custPhone,
          vehNum,
          offlineFlag ? 1 : 0,
        ]
      );

      const insertedId = insertResult.insertId;

      // 10. Update Slot Status
      await connection.execute(
        "UPDATE charging_slots SET status = 'RESERVED', current_booking_id = ? WHERE id = ?",
        [bookingIdCode, targetSlotId]
      );

      // Update station available slots
      const [slotsCount] = await connection.execute(
        "SELECT status FROM charging_slots WHERE station_id = ?",
        [targetStationId]
      );
      const totalCount = slotsCount.length;
      const availCount = slotsCount.filter((s) => s.status === "AVAILABLE").length;
      await connection.execute(
        "UPDATE charging_stations SET total_slots = ?, available_slots = ? WHERE id = ?",
        [totalCount, availCount, targetStationId]
      );

      // 11. Insert Payment Record
      const txnId = req.body.transactionId || `pay_${offlineFlag ? "offline" : "test"}_${Date.now().toString().slice(-6)}`;
      await connection.execute(
        `INSERT INTO payments (booking_id, user_id, amount, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS')`,
        [
          insertedId,
          userId,
          bookingAmount,
          payment_method || paymentMethod || (offlineFlag ? "Cash / POS" : "Razorpay Test Mode"),
          txnId,
          req.body.razorpayOrderId || `order_${Date.now().toString().slice(-6)}`,
          req.body.razorpayPaymentId || txnId,
        ]
      );

      return {
        id: insertedId,
        bookingId: bookingIdCode,
        userId,
        stationId: targetStationId,
        slotId: targetSlotId,
        connectorId: targetConnectorId,
        amount: bookingAmount,
        status: bookingStatus,
      };
    });

    // 12. Fetch full enriched booking details for response & real-time broadcast
    const [fullBooking] = await query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              s.station_name, s.address as station_address, s.owner_id,
              v.vehicle_number, v.brand, v.model,
              cs.slot_number, cs.charger_type, cs.connector_type
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN charging_stations s ON b.station_id = s.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE b.id = ?`,
      [newBooking.id]
    );

    const formatted = formatBooking(fullBooking);

    // Compute updated real-time stats
    const stats = await computeDashboardStats(fullBooking?.owner_id, "STATION_OWNER");

    // Emit Real-Time Socket Event to Owner Dashboard!
    emitBookingCreated(formatted, stats);
    emitDashboardStats(stats);

    res.status(201).json({
      success: true,
      message: `Charging slot booked successfully! Booking ID: ${newBooking.bookingId}`,
      data: formatted,
      booking: formatted,
      stats,
    });
  } catch (error) {
    console.error("Create Booking Error:", error.message);
    const isConflict = error.message.includes("Capacity Exceeded") || error.message.includes("unavailable");
    res.status(isConflict ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
};

/**
 * POST /api/bookings/offline
 * Dedicated endpoint for station owners/operators to create walk-in offline bookings
 */
export const createOfflineBooking = async (req, res) => {
  req.body.is_offline = true;
  req.body.isOffline = true;
  req.body.payment_method = req.body.payment_method || "Cash / POS";
  return createBooking(req, res);
};

/**
 * GET /api/bookings & GET /api/bookings/my
 * Retrieves authentic bookings with full relational details
 */
export const getBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { search, status, date, paymentStatus, source } = req.query;

    let sql = `
      SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             s.station_name, s.address as station_address, s.owner_id,
             v.vehicle_number, v.brand, v.model,
             cs.slot_number, cs.charger_type, cs.connector_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN charging_stations s ON b.station_id = s.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN charging_slots cs ON b.slot_id = cs.id
    `;
    let conditions = [];
    let params = [];

    // Role-based filtering
    if (role === "USER" || req.path === "/my") {
      conditions.push("b.user_id = ?");
      params.push(userId);
    } else if (role === "STATION_OWNER") {
      conditions.push("(s.owner_id = ? OR b.station_id IN (SELECT id FROM charging_stations WHERE owner_id = ?))");
      params.push(userId, userId);
    }

    if (status && status !== "ALL") {
      conditions.push("b.status = ?");
      params.push(status.toUpperCase());
    }

    if (source && source !== "ALL") {
      if (source === "OFFLINE" || source === "Offline") {
        conditions.push("b.is_offline = 1");
      } else if (source === "ONLINE" || source === "Online") {
        conditions.push("(b.is_offline = 0 OR b.is_offline IS NULL)");
      }
    }

    if (date && date !== "ALL") {
      if (date === "TODAY" || date === "today") {
        conditions.push("DATE(b.booking_date) = CURDATE()");
      } else if (date === "UPCOMING" || date === "upcoming") {
        conditions.push("DATE(b.booking_date) >= CURDATE()");
      } else if (date === "PAST" || date === "past") {
        conditions.push("DATE(b.booking_date) < CURDATE()");
      } else {
        conditions.push("DATE(b.booking_date) = ?");
        params.push(date);
      }
    }

    if (search) {
      conditions.push("(b.booking_id LIKE ? OR u.name LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ? OR b.vehicle_number LIKE ? OR s.station_name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY b.id DESC";

    const rows = await query(sql, params);
    let formatted = rows.map(formatBooking);

    if (paymentStatus && paymentStatus !== "ALL") {
      formatted = formatted.filter((b) => b.paymentStatus === paymentStatus.toUpperCase());
    }

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Bookings Error:", error);
    res.status(500).json({ success: false, message: "Error fetching bookings", error: error.message });
  }
};

/**
 * GET /api/bookings/:bookingId
 */
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const isNumeric = /^\d+$/.test(bookingId);

    let sql = `
      SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             s.station_name, s.address as station_address, s.owner_id,
             v.vehicle_number, v.brand, v.model,
             cs.slot_number, cs.charger_type, cs.connector_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN charging_stations s ON b.station_id = s.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN charging_slots cs ON b.slot_id = cs.id
      WHERE (b.booking_id = ? OR b.id = ?)
    `;

    const rows = await query(sql, [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Booking "${bookingId}" not found in database.`,
      });
    }

    const b = rows[0];

    if (role === "USER" && b.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to view this booking." });
    }

    res.json({
      success: true,
      data: formatBooking(b),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching booking", error: error.message });
  }
};

/**
 * PUT /api/bookings/:bookingId
 * Owner / User updates booking status (Pending, Confirmed, In Progress, Completed, Cancelled, No Show)
 * Re-computes capacity, updates DB, and broadcasts real-time updates!
 */
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const status = (req.body.status || "CONFIRMED").toUpperCase();
    const userId = req.user.id;
    const role = req.user.role;

    const isNumeric = /^\d+$/.test(bookingId);
    const existing = await query(
      `SELECT b.*, s.owner_id FROM bookings b 
       LEFT JOIN charging_stations s ON b.station_id = s.id 
       WHERE b.booking_id = ? OR b.id = ?`,
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = existing[0];

    // Authorization check
    if (role === "USER" && booking.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to modify this booking." });
    }

    await transaction(async (connection) => {
      // 1. Update Booking status & timestamp
      let updateSql = "UPDATE bookings SET status = ?";
      let updateParams = [status];

      if (status === "IN_PROGRESS" || status === "CHARGING") {
        updateSql += ", checked_in_at = COALESCE(checked_in_at, NOW())";
      } else if (status === "NO_SHOW") {
        updateSql += ", no_show_at = COALESCE(no_show_at, NOW())";
      }

      updateSql += " WHERE id = ?";
      updateParams.push(booking.id);

      await connection.execute(updateSql, updateParams);

      // 2. Connector Slot State Machine
      if (status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW") {
        if (booking.slot_id) {
          const [otherActive] = await connection.execute(
            `SELECT id FROM bookings 
             WHERE slot_id = ? 
               AND id != ? 
               AND status IN ('CONFIRMED', 'IN_PROGRESS', 'CHARGING')`,
            [booking.slot_id, booking.id]
          );

          if (!otherActive || otherActive.length === 0) {
            await connection.execute(
              "UPDATE charging_slots SET status = 'AVAILABLE', current_booking_id = NULL WHERE id = ?",
              [booking.slot_id]
            );
          }

          // Sync station available slots count
          const [slots] = await connection.execute(
            "SELECT status FROM charging_slots WHERE station_id = ?",
            [booking.station_id]
          );
          const total = slots.length;
          const avail = slots.filter((s) => s.status === "AVAILABLE").length;
          await connection.execute(
            "UPDATE charging_stations SET total_slots = ?, available_slots = ? WHERE id = ?",
            [total, avail, booking.station_id]
          );
        }

        if (status === "CANCELLED") {
          await connection.execute(
            "UPDATE payments SET payment_status = 'REFUNDED' WHERE booking_id = ?",
            [booking.id]
          );
        }
      } else if ((status === "IN_PROGRESS" || status === "CHARGING") && booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'OCCUPIED', current_booking_id = ? WHERE id = ?",
          [booking.booking_id, booking.slot_id]
        );
      } else if (status === "CONFIRMED" && booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'RESERVED', current_booking_id = ? WHERE id = ?",
          [booking.booking_id, booking.slot_id]
        );
      }
    });

    // Fetch updated enriched booking
    const [updatedRow] = await query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              s.station_name, s.address as station_address, s.owner_id,
              v.vehicle_number, v.brand, v.model,
              cs.slot_number, cs.charger_type, cs.connector_type
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN charging_stations s ON b.station_id = s.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE b.id = ?`,
      [booking.id]
    );

    const formatted = formatBooking(updatedRow);

    // Compute updated real-time stats
    const stats = await computeDashboardStats(booking.owner_id, "STATION_OWNER");

    // Broadcast real-time Socket event
    if (status === "CANCELLED") {
      emitBookingCancelled(formatted, stats);
    } else if (status === "COMPLETED") {
      emitBookingCompleted(formatted, stats);
    } else {
      emitBookingUpdated(formatted, stats);
    }
    emitDashboardStats(stats);

    res.json({
      success: true,
      message: `Booking ${booking.booking_id} status updated to ${status}.`,
      bookingId: booking.booking_id,
      booking: formatted,
      data: formatted,
      stats,
      status,
    });
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json({ success: false, message: "Error updating booking", error: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  req.body.status = "CANCELLED";
  return updateBooking(req, res);
};

export const getUserBookings = async (req, res) => {
  req.query.userId = req.params.userId;
  return getBookings(req, res);
};

export const deleteBooking = async (req, res) => {
  req.body.status = "CANCELLED";
  return updateBooking(req, res);
};

export default {
  createBooking,
  createOfflineBooking,
  getBookings,
  getBookingById,
  getUserBookings,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getDashboardStatsEndpoint,
  computeDashboardStats,
  formatBooking,
};
