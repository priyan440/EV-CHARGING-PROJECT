import { query, transaction } from "../config/db.js";
import { computeDynamicPrice } from "../utils/pricingCalculator.js";

// Helper to generate next unique booking ID: EV001, EV002, etc.
const generateNextBookingId = async (connection) => {
  const [rows] = await connection.execute(
    "SELECT id, booking_id FROM bookings ORDER BY id DESC LIMIT 1"
  );
  let nextNum = 1;
  if (rows && rows.length > 0) {
    const lastId = rows[0].booking_id;
    const match = lastId.match(/^EV(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    } else {
      nextNum = rows[0].id + 1;
    }
  }

  // Ensure uniqueness against existing bookings
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

// Helper to format booking object for frontend
const formatBooking = (b) => {
  const amount = parseFloat(b.amount) || 0;
  return {
    id: b.id,
    bookingId: b.booking_id,
    booking_id: b.booking_id,
    userId: b.user_id,
    counterId: `CUS${String(b.user_id).padStart(4, "0")}`,
    customerName: b.customer_name || b.user_name || "EV Customer",
    customerEmail: b.user_email || "",
    customerPhone: b.user_phone || "",
    vehicleId: b.vehicle_id,
    vehicleNumber: b.vehicle_number || "TN58AB1234",
    vehicleModel: b.model ? `${b.brand || ""} ${b.model}`.trim() : "Tata Nexon EV",
    vehicleType: b.vehicle_type || "Car",
    stationId: b.station_id,
    stationName: b.station_name || "EV Power Hub",
    stationAddress: b.station_address || "",
    slotId: b.slot_id,
    chargerId: b.slot_id ? `CHG${String(b.slot_id).padStart(4, "0")}` : "CHG0001",
    slotNumber: b.slot_number || "BAY-01",
    chargerType: b.charger_type || b.charging_type || "DC_FAST",
    chargingType: b.charging_type || "DC Fast Charging",
    connectorType: b.charger_type === "AC" ? "Type 2" : "CCS2",
    duration: b.duration ? `${b.duration} min` : "45 min",
    durationMinutes: parseFloat(b.duration) || 45,
    date: b.booking_date ? new Date(b.booking_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    bookingDate: b.booking_date,
    time: b.start_time || "14:00:00",
    startTime: b.start_time,
    amount,
    totalAmount: amount,
    price: amount,
    paymentMethod: b.payment_method || "Razorpay Test Mode",
    paymentStatus: b.status === "CONFIRMED" || b.status === "COMPLETED" ? "Paid" : b.status === "CANCELLED" ? "REFUNDED" : "Pending",
    status: b.status,
    qrToken: `QR_${b.booking_id}_${b.id}`,
    createdAt: b.created_at,
  };
};

/**
 * POST /api/bookings
 * Create a new booking with MySQL transaction & conflict checking
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      vehicle_id,
      vehicleId,
      vehicleNumber,
      station_id,
      stationId,
      slot_id,
      slotId,
      vehicle_type,
      vehicleType = "Car",
      charging_type,
      chargingType = "DC Fast Charging",
      duration = 45,
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
    } = req.body;

    const targetStationId = station_id || stationId;
    if (!targetStationId) {
      return res.status(400).json({ success: false, message: "Station is required." });
    }

    const cleanDate = booking_date || bookingDate || date || new Date().toISOString().split("T")[0];
    const cleanTime = start_time || startTime || time || "14:00:00";
    const cleanDuration = parseFloat(duration) || 45.0;
    const cleanAmount = parseFloat(amount || totalAmount) || 350.0;
    const cleanPaymentMethod = payment_method || paymentMethod || "Razorpay Test Mode";

    // Start Transaction
    const newBooking = await transaction(async (connection) => {
      // 1. Resolve vehicle
      let resolvedVehicleId = vehicle_id || vehicleId;
      if (!resolvedVehicleId) {
        // Look up user's primary vehicle
        const [vehicles] = await connection.execute(
          "SELECT id FROM vehicles WHERE user_id = ? ORDER BY id ASC LIMIT 1",
          [userId]
        );
        if (vehicles && vehicles.length > 0) {
          resolvedVehicleId = vehicles[0].id;
        } else {
          // Auto-insert user vehicle if none exists yet
          const [newVeh] = await connection.execute(
            `INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, battery_capacity)
             VALUES (?, ?, ?, 'Tata Motors', 'Nexon EV', 40.50)`,
            [userId, (vehicleNumber || `TN58EV${Date.now().toString().slice(-4)}`).toUpperCase(), vehicleType]
          );
          resolvedVehicleId = newVeh.insertId;
        }
      }

      // 2. Resolve slot
      let targetSlotId = slot_id || slotId;
      if (!targetSlotId) {
        // Auto-select first available slot for this station
        const [availableSlots] = await connection.execute(
          "SELECT id, charger_type, price_per_kwh FROM charging_slots WHERE station_id = ? AND status = 'AVAILABLE' LIMIT 1",
          [targetStationId]
        );
        if (availableSlots && availableSlots.length > 0) {
          targetSlotId = availableSlots[0].id;
        } else {
          // If no slot is marked AVAILABLE, check if any slot exists
          const [anySlots] = await connection.execute(
            "SELECT id FROM charging_slots WHERE station_id = ? LIMIT 1",
            [targetStationId]
          );
          if (anySlots && anySlots.length > 0) {
            targetSlotId = anySlots[0].id;
          }
        }
      }

      // 3. Dynamic Pricing Calculation
      const [stRows] = await connection.execute(
        `SELECT s.id,
                pr.peak_start, pr.peak_end, pr.peak_multiplier, pr.offpeak_discount, pr.utilization_threshold, pr.max_multiplier
         FROM charging_stations s
         LEFT JOIN pricing_rules pr ON s.id = pr.station_id
         WHERE s.id = ?`,
        [targetStationId]
      );

      const [slotRows] = await connection.execute(
        "SELECT id, charger_type, price_per_kwh, status FROM charging_slots WHERE station_id = ?",
        [targetStationId]
      );

      const activeSlot = slotRows.find((s) => s.id === targetSlotId);
      const baseRate = parseFloat(activeSlot?.price_per_kwh || slotRows[0]?.price_per_kwh || 18.0);
      const dynamicRule = stRows[0]?.peak_start
        ? {
            peak_start: stRows[0].peak_start,
            peak_end: stRows[0].peak_end,
            peak_multiplier: stRows[0].peak_multiplier,
            offpeak_discount: stRows[0].offpeak_discount,
            utilization_threshold: stRows[0].utilization_threshold,
            max_multiplier: stRows[0].max_multiplier,
          }
        : null;

      const dynamicQuote = computeDynamicPrice({
        basePricePerKwh: baseRate,
        time: cleanTime,
        slots: slotRows,
        rule: dynamicRule,
      });

      // If amount was not explicitly passed, calculate dynamically using effective rate
      let bookingAmount = parseFloat(amount || totalAmount);
      if (!bookingAmount || isNaN(bookingAmount)) {
        const estKwh = parseFloat(req.body.estimated_kwh || req.body.estimatedKwh) || (cleanDuration * 0.4);
        const chargingCost = estKwh * dynamicQuote.effectivePricePerKwh;
        const subtotal = chargingCost + 20; // service fee
        bookingAmount = Math.round((subtotal * 1.18) * 100) / 100;
      }

      // 4. BOOKING CONFLICT CHECK:
      // Verify that no other user has reserved this specific slot for this date and time
      if (targetSlotId) {
        const [conflicts] = await connection.execute(
          `SELECT id, booking_id, status FROM bookings 
           WHERE slot_id = ? 
             AND booking_date = ? 
             AND start_time = ? 
             AND status IN ('CONFIRMED', 'IN_PROGRESS', 'PENDING')`,
          [targetSlotId, cleanDate, cleanTime]
        );

        if (conflicts && conflicts.length > 0) {
          throw new Error(
            `CONFLICT: Charging slot is already reserved for ${cleanDate} at ${cleanTime}. Please select a different slot or time.`
          );
        }
      }

      // 5. Generate unique Booking ID (EV001, EV002, etc.)
      const bookingIdCode = await generateNextBookingId(connection);

      // 6. Insert Booking into MySQL
      const [insertResult] = await connection.execute(
        `INSERT INTO bookings 
         (booking_id, user_id, vehicle_id, station_id, slot_id, vehicle_type, charging_type, duration, booking_date, start_time, payment_method, amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
        [
          bookingIdCode,
          userId,
          resolvedVehicleId,
          targetStationId,
          targetSlotId || null,
          vehicleType,
          chargingType,
          cleanDuration,
          cleanDate,
          cleanTime,
          cleanPaymentMethod,
          bookingAmount,
        ]
      );

      const insertedBookingId = insertResult.insertId;

      // 6. Update Slot Status to RESERVED in MySQL
      if (targetSlotId) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'RESERVED' WHERE id = ?",
          [targetSlotId]
        );

        // Update station slot counts
        const [slots] = await connection.execute(
          "SELECT status FROM charging_slots WHERE station_id = ?",
          [targetStationId]
        );
        const total = slots.length;
        const avail = slots.filter((s) => s.status === "AVAILABLE").length;
        await connection.execute(
          "UPDATE charging_stations SET total_slots = ?, available_slots = ? WHERE id = ?",
          [total, avail, targetStationId]
        );
      }

      // 7. Insert Payment record into MySQL
      const txnId = req.body.transactionId || `pay_test_${Date.now().toString().slice(-6)}`;
      await connection.execute(
        `INSERT INTO payments (booking_id, user_id, amount, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SUCCESS')`,
        [
          insertedBookingId,
          userId,
          bookingAmount,
          cleanPaymentMethod,
          txnId,
          req.body.razorpayOrderId || `order_test_${Date.now().toString().slice(-6)}`,
          req.body.razorpayPaymentId || txnId,
        ]
      );

      return {
        id: insertedBookingId,
        bookingId: bookingIdCode,
        userId,
        vehicleId: resolvedVehicleId,
        stationId: targetStationId,
        slotId: targetSlotId,
        amount: bookingAmount,
        date: cleanDate,
        time: cleanTime,
        status: "CONFIRMED",
        dynamicPricing: dynamicQuote,
      };
    });

    // Fetch full details of created booking
    const [fullBooking] = await query(
      `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              s.station_name, s.address as station_address,
              v.vehicle_number, v.brand, v.model,
              cs.slot_number, cs.charger_type
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN charging_stations s ON b.station_id = s.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE b.id = ?`,
      [newBooking.id]
    );

    const formatted = formatBooking(fullBooking);
    if (newBooking.dynamicPricing) {
      formatted.dynamicPricing = newBooking.dynamicPricing;
      formatted.ratePerKwh = newBooking.dynamicPricing.effectivePricePerKwh;
      formatted.priceBadge = newBooking.dynamicPricing.badge;
      formatted.priceBadgeType = newBooking.dynamicPricing.badgeType;
    }

    res.status(201).json({
      success: true,
      message: `Charging slot booked successfully! Booking ID: ${newBooking.bookingId}`,
      data: formatted,
      booking: formatted,
      quote: newBooking.dynamicPricing || null,
    });
  } catch (error) {
    console.error("Create Booking Error:", error);
    const isConflict = error.message.includes("CONFLICT");
    return res.status(isConflict ? 409 : 500).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
};

/**
 * GET /api/bookings
 * Get bookings with role-based filtering (Admin = all, Station Owner = station bookings, User = own bookings)
 */
export const getBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { search, status } = req.query;

    let sql = `
      SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             s.station_name, s.address as station_address,
             v.vehicle_number, v.brand, v.model,
             cs.slot_number, cs.charger_type
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN charging_stations s ON b.station_id = s.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN charging_slots cs ON b.slot_id = cs.id
    `;
    let conditions = [];
    let params = [];

    if (role === "USER") {
      conditions.push("b.user_id = ?");
      params.push(userId);
    } else if (role === "STATION_OWNER") {
      conditions.push("s.owner_id = ?");
      params.push(userId);
    }

    if (status) {
      conditions.push("b.status = ?");
      params.push(status.toUpperCase());
    }

    if (search) {
      conditions.push("(b.booking_id LIKE ? OR u.name LIKE ? OR s.station_name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY b.id DESC";

    const rows = await query(sql, params);
    const formatted = rows.map(formatBooking);

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
 * Search/Fetch booking by booking_id (e.g. EV001) or primary key id
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
             cs.slot_number, cs.charger_type
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN charging_stations s ON b.station_id = s.id
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

    // Authorization check
    if (role === "USER" && b.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to view this booking." });
    }
    if (role === "STATION_OWNER" && b.owner_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to view this station booking." });
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
 * GET /api/bookings/user/:userId
 * Fetch bookings for a specific user ID
 */
export const getUserBookings = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const requesterId = req.user.id;
    const role = req.user.role;

    if (role !== "ADMIN" && parseInt(targetUserId, 10) !== requesterId) {
      return res.status(403).json({ success: false, message: "Unauthorized to view user bookings." });
    }

    const rows = await query(
      `SELECT b.*, u.name as user_name, s.station_name, v.vehicle_number, cs.slot_number
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN charging_stations s ON b.station_id = s.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN charging_slots cs ON b.slot_id = cs.id
       WHERE b.user_id = ? ORDER BY b.id DESC`,
      [targetUserId]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows.map(formatBooking),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user bookings", error: error.message });
  }
};

/**
 * PUT /api/bookings/:bookingId
 * Update booking status (e.g. CANCELLED, COMPLETED, IN_PROGRESS)
 * Automatically releases slot back to AVAILABLE on cancellation!
 */
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const cleanStatus = status.toUpperCase();
    const validStatuses = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const isNumeric = /^\d+$/.test(bookingId);
    const existing = await query(
      "SELECT * FROM bookings WHERE booking_id = ? OR id = ?",
      [bookingId.toUpperCase(), isNumeric ? parseInt(bookingId, 10) : 0]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = existing[0];

    // Authorization check
    if (role === "USER" && booking.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this booking." });
    }

    await transaction(async (connection) => {
      // 1. Update Booking status
      await connection.execute(
        "UPDATE bookings SET status = ? WHERE id = ?",
        [cleanStatus, booking.id]
      );

      // 2. If status is CANCELLED or COMPLETED, release slot to AVAILABLE!
      if (cleanStatus === "CANCELLED" || cleanStatus === "COMPLETED") {
        if (booking.slot_id) {
          // Check if any other active booking is using this slot right now
          const [otherActive] = await connection.execute(
            `SELECT id FROM bookings 
             WHERE slot_id = ? 
               AND id != ? 
               AND status IN ('CONFIRMED', 'IN_PROGRESS')`,
            [booking.slot_id, booking.id]
          );

          if (!otherActive || otherActive.length === 0) {
            await connection.execute(
              "UPDATE charging_slots SET status = 'AVAILABLE' WHERE id = ?",
              [booking.slot_id]
            );
          }

          // Sync station slot counts
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

        // If cancelled, update payment status to REFUNDED
        if (cleanStatus === "CANCELLED") {
          await connection.execute(
            "UPDATE payments SET payment_status = 'REFUNDED' WHERE booking_id = ?",
            [booking.id]
          );
        }
      } else if (cleanStatus === "IN_PROGRESS" && booking.slot_id) {
        await connection.execute(
          "UPDATE charging_slots SET status = 'OCCUPIED' WHERE id = ?",
          [booking.slot_id]
        );
      }
    });

    res.json({
      success: true,
      message: `Booking ${booking.booking_id} status updated to ${cleanStatus}.`,
      bookingId: booking.booking_id,
      status: cleanStatus,
    });
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json({ success: false, message: "Error updating booking", error: error.message });
  }
};

/**
 * DELETE /api/bookings/:bookingId
 * Delete booking (cancels and releases slot)
 */
export const deleteBooking = async (req, res) => {
  req.body.status = "CANCELLED";
  return updateBooking(req, res);
};

export default {
  createBooking,
  getBookings,
  getBookingById,
  getUserBookings,
  updateBooking,
  deleteBooking,
};
