import { query, transaction } from "../config/db.js";

// Helper to generate unique session ID e.g. CS00043
const generateSessionId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT session_id FROM charging_sessions ORDER BY id DESC LIMIT 1"
  );
  let nextNum = 1;
  if (rows && rows.length > 0) {
    const match = rows[0].session_id.match(/^CS(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  let candidate = `CS${String(nextNum).padStart(5, "0")}`;
  let exists = true;
  while (exists) {
    const [check] = await connection.execute(
      "SELECT id FROM charging_sessions WHERE session_id = ?",
      [candidate]
    );
    if (check.length === 0) {
      exists = false;
    } else {
      nextNum++;
      candidate = `CS${String(nextNum).padStart(5, "0")}`;
    }
  }
  return candidate;
};

// Helper to generate unique invoice ID e.g. INV-2026-00043
const generateInvoiceNumber = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1"
  );
  let nextNum = 1;
  if (rows && rows.length > 0) {
    const match = rows[0].invoice_number.match(/^INV-\d+-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  let candidate = `INV-2026-${String(nextNum).padStart(5, "0")}`;
  let exists = true;
  while (exists) {
    const [check] = await connection.execute(
      "SELECT id FROM invoices WHERE invoice_number = ?",
      [candidate]
    );
    if (check.length === 0) {
      exists = false;
    } else {
      nextNum++;
      candidate = `INV-2026-${String(nextNum).padStart(5, "0")}`;
    }
  }
  return candidate;
};

/**
 * GET /api/charging/active
 * Returns current authenticated customer's active charging session
 */
export const getActiveSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await query(
      `SELECT cs.*, 
              s.station_name, s.address as station_address, s.max_power as station_power,
              v.vehicle_number, v.brand, v.model as vehicle_model,
              b.booking_id as booking_code, b.charging_type as booking_charging_type,
              cslot.slot_number, cslot.charger_type, cslot.connector_type
       FROM charging_sessions cs
       JOIN charging_stations s ON cs.station_id = s.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       LEFT JOIN bookings b ON cs.booking_id = b.booking_id
       LEFT JOIN charging_slots cslot ON cs.slot_id = cslot.id
       WHERE cs.user_id = ? AND cs.status = 'ACTIVE'
       ORDER BY cs.id DESC LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        active: false,
        session: null,
        message: "No active charging session found.",
      });
    }

    const s = rows[0];
    const sessionData = {
      id: s.id,
      sessionId: s.session_id,
      session_id: s.session_id,
      bookingId: s.booking_id,
      booking_id: s.booking_id,
      userId: s.user_id,
      stationId: s.station_id,
      stationName: s.station_name,
      stationAddress: s.station_address,
      connectorId: s.connector_id || `STA${String(s.station_id).padStart(3, "0")}-C01`,
      slotNumber: s.slot_number || "C01",
      connectorType: s.connector_type || (s.charger_type === "AC" ? "Type 2" : "CCS2"),
      chargingType: s.charger_type === "AC" ? "AC Standard" : "DC Fast Charging",
      vehicleId: s.vehicle_id,
      vehicleNumber: s.vehicle_number || "TN58AB1234",
      vehicleModel: s.vehicle_model ? `${s.brand || ""} ${s.vehicle_model}`.trim() : "Tata Motors Nexon EV Max",
      status: s.status,
      startTime: s.start_time,
      startingBattery: s.starting_battery,
      currentBattery: s.current_battery,
      targetBattery: s.target_battery,
      energyDelivered: parseFloat(s.energy_delivered) || 0.0,
      chargingPower: parseFloat(s.charging_power) || 50.0,
      durationMinutes: s.duration_minutes || 0,
      estimatedCost: parseFloat(s.estimated_cost) || 450.0,
      currentCost: parseFloat(s.current_cost) || 0.0,
      paymentStatus: s.payment_status || "PAID",
      createdAt: s.created_at,
    };

    res.json({
      success: true,
      active: true,
      session: sessionData,
      data: sessionData,
    });
  } catch (error) {
    console.error("Get Active Session Error:", error);
    res.status(500).json({ success: false, message: "Error fetching active session", error: error.message });
  }
};

/**
 * POST /api/charging/start
 * Starts a live charging session from a confirmed/checked-in booking
 */
export const startChargingSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required to start charging." });
    }

    const isNumeric = /^\d+$/.test(bookingId);

    // Find the booking
    const bookingRows = await query(
      "SELECT * FROM bookings WHERE (booking_id = ? OR id = ?) AND user_id = ?",
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0, userId]
    );

    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found or does not belong to you." });
    }

    const booking = bookingRows[0];

    // Check if booking already completed or cancelled
    if (booking.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "This booking has already been completed." });
    }
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot start charging for a cancelled booking." });
    }

    // Check if an active session already exists for this booking
    const existingSession = await query(
      "SELECT * FROM charging_sessions WHERE booking_id = ? AND status = 'ACTIVE'",
      [booking.booking_id]
    );

    if (existingSession && existingSession.length > 0) {
      return res.json({
        success: true,
        message: "Charging session is already active.",
        sessionId: existingSession[0].session_id,
        session: existingSession[0],
      });
    }

    // Start session inside transaction
    const newSession = await transaction(async (connection) => {
      const sessionId = await generateSessionId(connection);
      const startPct = booking.battery_start_pct || 20;
      const targetPct = booking.battery_target_pct || 80;
      const powerKw = parseFloat(booking.charging_power) || 50.0;
      const estimatedCost = parseFloat(booking.amount) || 450.0;
      const now = new Date();

      // 1. Insert active charging session
      const [insertRes] = await connection.execute(
        `INSERT INTO charging_sessions 
         (session_id, booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, status, start_time, starting_battery, current_battery, target_battery, energy_delivered, charging_power, duration_minutes, estimated_cost, current_cost, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, 0.00, ?, 0, ?, 0.00, 'PAID')`,
        [
          sessionId,
          booking.booking_id,
          userId,
          booking.vehicle_id,
          booking.station_id,
          booking.slot_id,
          booking.connector_id,
          now,
          startPct,
          startPct,
          targetPct,
          powerKw,
          estimatedCost,
        ]
      );

      // 2. Update booking to ACTIVE & record actual start time
      await connection.execute(
        `UPDATE bookings 
         SET status = 'ACTIVE', 
             charging_session_id = ?, 
             actual_start_time = ?, 
             checked_in_at = COALESCE(checked_in_at, ?)
         WHERE id = ?`,
        [sessionId, now, now, booking.id]
      );

      // 3. Update connector slot to CHARGING / OCCUPIED
      if (booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'OCCUPIED' WHERE id = ?",
          [booking.slot_id]
        );
      }

      return {
        id: insertRes.insertId,
        sessionId,
        session_id: sessionId,
        bookingId: booking.booking_id,
        status: "ACTIVE",
        startTime: now,
        startingBattery: startPct,
        currentBattery: startPct,
        targetBattery: targetPct,
        chargingPower: powerKw,
        estimatedCost,
      };
    });

    res.status(201).json({
      success: true,
      message: `Charging session ${newSession.sessionId} started successfully!`,
      sessionId: newSession.sessionId,
      session: newSession,
    });
  } catch (error) {
    console.error("Start Charging Error:", error);
    res.status(500).json({ success: false, message: "Error starting charging session", error: error.message });
  }
};

/**
 * PUT /api/charging/:sessionId/telemetry
 * Updates live progress metrics (battery %, kWh delivered, current cost, elapsed minutes)
 */
export const updateLiveTelemetry = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { current_battery, energy_delivered, current_cost, duration_minutes } = req.body;

    await query(
      `UPDATE charging_sessions 
       SET current_battery = COALESCE(?, current_battery),
           energy_delivered = COALESCE(?, energy_delivered),
           current_cost = COALESCE(?, current_cost),
           duration_minutes = COALESCE(?, duration_minutes)
       WHERE session_id = ? AND user_id = ? AND status = 'ACTIVE'`,
      [current_battery, energy_delivered, current_cost, duration_minutes, sessionId, userId]
    );

    res.json({ success: true, message: "Telemetry updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating telemetry", error: error.message });
  }
};

/**
 * POST /api/charging/:sessionId/stop
 * Atomic Stop Charging Flow:
 * 1. Finalize session & calculate exact energy/amount
 * 2. Update session ACTIVE -> COMPLETED
 * 3. Update ORIGINAL booking ACTIVE -> COMPLETED with actuals
 * 4. Release connector slot -> AVAILABLE
 * 5. Update station available slots
 * 6. Generate official unique PDF Invoice record INV-2026-XXXXX
 * 7. Return complete unified payload
 */
export const stopChargingSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { final_battery, energy_delivered, duration_minutes, current_cost } = req.body;

    const result = await transaction(async (connection) => {
      // 1. Fetch Session FOR UPDATE
      const [sessionRows] = await connection.execute(
        "SELECT * FROM charging_sessions WHERE session_id = ? AND user_id = ? FOR UPDATE",
        [sessionId, userId]
      );

      if (!sessionRows || sessionRows.length === 0) {
        throw new Error(`Charging session ${sessionId} not found.`);
      }

      const session = sessionRows[0];

      if (session.status === "COMPLETED") {
        throw new Error("Charging session has already been completed.");
      }

      // 2. Fetch original Booking FOR UPDATE
      const [bookingRows] = await connection.execute(
        "SELECT * FROM bookings WHERE booking_id = ? FOR UPDATE",
        [session.booking_id]
      );
      const booking = bookingRows && bookingRows.length > 0 ? bookingRows[0] : null;

      // 3. Fetch Station & Vehicle Details
      const [stationRows] = await connection.execute(
        "SELECT * FROM charging_stations WHERE id = ?",
        [session.station_id]
      );
      const station = stationRows[0] || {};

      const [vehRows] = await connection.execute(
        "SELECT * FROM vehicles WHERE id = ?",
        [session.vehicle_id || 1]
      );
      const vehicle = vehRows[0] || {};

      // 4. Calculate Final Charging Metrics
      const now = new Date();
      const startingBattery = session.starting_battery || 20;
      const targetBattery = session.target_battery || 80;
      const calcFinalBattery = parseInt(final_battery ?? session.current_battery ?? targetBattery, 10);
      const finalBattery = Math.max(startingBattery, Math.min(100, calcFinalBattery));

      const batteryGained = Math.max(0, finalBattery - startingBattery);
      const batteryCapacity = parseFloat(vehicle.battery_capacity) || 40.50;

      // Energy Delivered
      let finalEnergy = parseFloat(energy_delivered);
      if (isNaN(finalEnergy) || finalEnergy <= 0) {
        finalEnergy = parseFloat(((batteryCapacity * batteryGained) / 100).toFixed(2));
      }
      if (finalEnergy <= 0) finalEnergy = 29.10;

      // Duration
      let finalDuration = parseInt(duration_minutes, 10);
      if (isNaN(finalDuration) || finalDuration <= 0) {
        const chargingPower = parseFloat(session.charging_power) || 50.0;
        finalDuration = Math.max(15, Math.round((finalEnergy / chargingPower) * 60));
      }

      // Financials
      const tariffPerKwh = 15.00;
      const energyCharge = parseFloat((finalEnergy * tariffPerKwh).toFixed(2));
      const serviceFee = 10.00;
      const discount = 10.00;
      const totalAmount = parseFloat((energyCharge + serviceFee - discount).toFixed(2));

      // 5. Generate unique Invoice Number
      const invoiceNumber = await generateInvoiceNumber(connection);

      // 6. Update Charging Session to COMPLETED
      await connection.execute(
        `UPDATE charging_sessions 
         SET status = 'COMPLETED',
             end_time = ?,
             final_battery = ?,
             current_battery = ?,
             energy_delivered = ?,
             duration_minutes = ?,
             final_amount = ?,
             current_cost = ?,
             payment_status = 'PAID'
         WHERE id = ?`,
        [
          now,
          finalBattery,
          finalBattery,
          finalEnergy,
          finalDuration,
          totalAmount,
          totalAmount,
          session.id,
        ]
      );

      // 7. Update ORIGINAL Booking to COMPLETED
      if (booking) {
        await connection.execute(
          `UPDATE bookings 
           SET status = 'COMPLETED',
               actual_end_time = ?,
               actual_energy_used = ?,
               final_amount = ?,
               completed_at = ?,
               invoice_number = ?
           WHERE id = ?`,
          [
            now,
            finalEnergy,
            totalAmount,
            now,
            invoiceNumber,
            booking.id,
          ]
        );
      }

      // 8. Release Connector Slot back to AVAILABLE
      if (session.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'AVAILABLE', current_booking_id = NULL WHERE id = ?",
          [session.slot_id]
        );
      }

      // 9. Sync Station Available Connectors Count
      const [slotsCount] = await connection.execute(
        "SELECT status FROM charging_slots WHERE station_id = ?",
        [session.station_id]
      );
      const totalCount = slotsCount.length;
      const availCount = slotsCount.filter((s) => s.status === "AVAILABLE").length;
      await connection.execute(
        "UPDATE charging_stations SET total_slots = ?, available_slots = ? WHERE id = ?",
        [totalCount, availCount, session.station_id]
      );

      // 10. Create Official Invoice Record
      const vehNumber = vehicle.vehicle_number || booking?.vehicle_number || "TN58AB1234";
      const vehModel = vehicle.model ? `${vehicle.brand || ""} ${vehicle.model}`.trim() : "Tata Motors Nexon EV Max";
      const paymentTxnId = `pay_${sessionId.toLowerCase()}_${Date.now().toString().slice(-4)}`;

      await connection.execute(
        `INSERT INTO invoices 
         (invoice_number, booking_id, session_id, user_id, station_id, vehicle_number, vehicle_model, start_time, end_time, duration_minutes, starting_battery, final_battery, energy_consumed, tariff_per_kwh, energy_charge, service_fee, discount, total_amount, payment_method, payment_id, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Razorpay UPI', ?, 'PAID')`,
        [
          invoiceNumber,
          session.booking_id,
          session.session_id,
          userId,
          session.station_id,
          vehNumber,
          vehModel,
          session.start_time,
          now,
          finalDuration,
          startingBattery,
          finalBattery,
          finalEnergy,
          tariffPerKwh,
          energyCharge,
          serviceFee,
          discount,
          totalAmount,
          paymentTxnId,
        ]
      );

      return {
        sessionId: session.session_id,
        bookingId: session.booking_id,
        status: "COMPLETED",
        startTime: session.start_time,
        endTime: now,
        startingBattery,
        finalBattery,
        batteryTransition: `${startingBattery}% → ${finalBattery}%`,
        energyDelivered: finalEnergy,
        durationMinutes: finalDuration,
        tariffPerKwh,
        energyCharge,
        serviceFee,
        discount,
        finalAmount: totalAmount,
        invoiceNumber,
        paymentId: paymentTxnId,
        paymentStatus: "PAID",
        stationName: station.station_name || "GreenCharge Central",
        stationAddress: station.address || "",
        vehicleNumber: vehNumber,
        vehicleModel: vehModel,
      };
    });

    res.json({
      success: true,
      message: `Charging session ${result.sessionId} stopped and finalized successfully. Booking marked as COMPLETED.`,
      data: result,
      summary: result,
    });
  } catch (error) {
    console.error("Stop Charging Error:", error.message);
    const isDup = error.message.includes("already been completed");
    res.status(isDup ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to stop charging session",
    });
  }
};

/**
 * GET /api/charging/history
 * Returns completed charging sessions for authenticated customer
 */
export const getChargingHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await query(
      `SELECT cs.*, 
              s.station_name, s.address as station_address,
              v.vehicle_number, v.brand, v.model as vehicle_model,
              cslot.slot_number, cslot.charger_type, cslot.connector_type,
              inv.invoice_number, inv.tariff_per_kwh, inv.energy_charge, inv.service_fee, inv.discount
       FROM charging_sessions cs
       JOIN charging_stations s ON cs.station_id = s.id
       LEFT JOIN vehicles v ON cs.vehicle_id = v.id
       LEFT JOIN charging_slots cslot ON cs.slot_id = cslot.id
       LEFT JOIN invoices inv ON cs.session_id = inv.session_id
       WHERE cs.user_id = ? AND cs.status = 'COMPLETED'
       ORDER BY cs.id DESC`,
      [userId]
    );

    const history = rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      session_id: r.session_id,
      bookingId: r.booking_id,
      booking_id: r.booking_id,
      stationName: r.station_name,
      stationAddress: r.station_address,
      connectorId: r.connector_id || `STA${String(r.station_id).padStart(3, "0")}-C01`,
      slotNumber: r.slot_number || "C01",
      connectorType: r.connector_type || (r.charger_type === "AC" ? "Type 2" : "CCS2"),
      vehicleNumber: r.vehicle_number || "TN58AB1234",
      vehicleModel: r.vehicle_model ? `${r.brand || ""} ${r.vehicle_model}`.trim() : "Tata Motors Nexon EV Max",
      startTime: r.start_time,
      endTime: r.end_time,
      startingBattery: r.starting_battery,
      finalBattery: r.final_battery || r.current_battery,
      batteryTransition: `${r.starting_battery}% → ${r.final_battery || r.current_battery}%`,
      energyDelivered: parseFloat(r.energy_delivered) || 0.0,
      durationMinutes: r.duration_minutes || 0,
      chargingPower: parseFloat(r.charging_power) || 50.0,
      finalAmount: parseFloat(r.final_amount || r.current_cost) || 0.0,
      invoiceNumber: r.invoice_number || `INV-2026-${String(r.id).padStart(5, "0")}`,
      paymentStatus: r.payment_status || "PAID",
      status: "COMPLETED",
      createdAt: r.created_at,
    }));

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Get Charging History Error:", error);
    res.status(500).json({ success: false, message: "Error fetching charging history", error: error.message });
  }
};

/**
 * GET /api/invoices/:identifier
 * Fetches invoice by invoiceNumber or bookingId or sessionId
 */
export const getInvoiceByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user.id;

    const rows = await query(
      `SELECT inv.*, 
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
              s.station_name, s.address as station_address,
              b.charging_type, b.charging_power, b.slot_id,
              cs.connector_id
       FROM invoices inv
       JOIN users u ON inv.user_id = u.id
       JOIN charging_stations s ON inv.station_id = s.id
       LEFT JOIN bookings b ON inv.booking_id = b.booking_id
       LEFT JOIN charging_sessions cs ON inv.session_id = cs.session_id
       WHERE (inv.invoice_number = ? OR inv.booking_id = ? OR inv.session_id = ?)
         AND (inv.user_id = ? OR ? = 'ADMIN')
       LIMIT 1`,
      [identifier, identifier, identifier, userId, req.user.role]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: `Invoice "${identifier}" not found.` });
    }

    const inv = rows[0];
    const formattedInvoice = {
      invoiceNumber: inv.invoice_number,
      invoiceDate: new Date(inv.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      customer: {
        id: `CUS${String(inv.user_id).padStart(4, "0")}`,
        name: inv.customer_name || "Priyan Customer",
        email: inv.customer_email || "priyan@evcharge.com",
        phone: inv.customer_phone || "+91 98765 43210",
      },
      station: {
        name: inv.station_name,
        address: inv.station_address,
      },
      vehicle: {
        model: inv.vehicle_model || "Tata Motors Nexon EV Max",
        number: inv.vehicle_number,
      },
      charging: {
        bookingId: inv.booking_id,
        sessionId: inv.session_id,
        connectorId: inv.connector_id || "STA001-C01",
        chargingType: inv.charging_type || "CCS2",
        powerKw: parseFloat(inv.charging_power) || 50.0,
        startTime: inv.start_time,
        endTime: inv.end_time,
        durationMinutes: inv.duration_minutes,
        startingBattery: inv.starting_battery,
        finalBattery: inv.final_battery,
        energyConsumed: parseFloat(inv.energy_consumed),
      },
      pricing: {
        tariffPerKwh: parseFloat(inv.tariff_per_kwh),
        energyCharge: parseFloat(inv.energy_charge),
        serviceFee: parseFloat(inv.service_fee),
        discount: parseFloat(inv.discount),
        totalAmount: parseFloat(inv.total_amount),
      },
      payment: {
        method: inv.payment_method || "Razorpay UPI",
        paymentId: inv.payment_id,
        status: inv.payment_status || "PAID",
      },
    };

    res.json({
      success: true,
      data: formattedInvoice,
    });
  } catch (error) {
    console.error("Get Invoice Error:", error);
    res.status(500).json({ success: false, message: "Error fetching invoice", error: error.message });
  }
};

export default {
  getActiveSession,
  startChargingSession,
  updateLiveTelemetry,
  stopChargingSession,
  getChargingHistory,
  getInvoiceByIdentifier,
};
