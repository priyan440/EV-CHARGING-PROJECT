import { pool, query, transaction } from "../config/db.js";

/**
 * seed_bookings.js
 * Generates 60 days of realistic EV charging session history for Station Owner 2.
 * Includes realistic weekly seasonality, commuter peak hours, and connector distributions.
 */

async function seedHistoricalBookings() {
  console.log("🌱 Generating 60 days of realistic booking history...");

  try {
    // 1. Verify owner and station existence
    const owners = await query("SELECT id FROM users WHERE role = 'STATION_OWNER' LIMIT 1");
    if (!owners || owners.length === 0) {
      console.error("❌ No station owner found in database. Please run initial ev_charging_db.sql first.");
      process.exit(1);
    }
    const ownerId = owners[0].id;

    const stations = await query("SELECT id, station_name FROM charging_stations WHERE owner_id = ?", [ownerId]);
    if (!stations || stations.length === 0) {
      console.error(`❌ No stations found for owner ID ${ownerId}.`);
      process.exit(1);
    }

    const stationIds = stations.map((s) => s.id);

    // Get slots for these stations
    const slots = await query(
      `SELECT id, station_id, slot_number, charger_type, power_kw, price_per_kwh 
       FROM charging_slots 
       WHERE station_id IN (${stationIds.map(() => "?").join(",")})`,
      stationIds
    );

    if (!slots || slots.length === 0) {
      console.error("❌ No charging slots found for owner stations.");
      process.exit(1);
    }

    // Get customer user and vehicle
    const customers = await query("SELECT id FROM users WHERE role = 'USER' LIMIT 1");
    const customerId = customers.length > 0 ? customers[0].id : 3;

    const vehicles = await query("SELECT id, vehicle_type FROM vehicles WHERE user_id = ? LIMIT 3", [customerId]);
    const vehicleId = vehicles.length > 0 ? vehicles[0].id : 1;

    // 2. Clean previous generated historical bookings
    console.log("🧹 Clearing previous historical seed bookings...");
    await query("DELETE FROM bookings WHERE booking_id LIKE 'EVH%'");

    // 3. Generate 60 days of realistic sessions
    const now = new Date();
    const bookingsToInsert = [];
    const paymentsToInsert = [];
    let bookingCounter = 1;

    for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - dayOffset);
      const dateStr = sessionDate.toISOString().slice(0, 10);
      const dayOfWeek = sessionDate.getDay(); // 0 = Sun, 6 = Sat

      // Determine daily session count with weekly seasonality
      // Mon-Thu: 10-15 sessions
      // Fri: 16-22 sessions (evening surge)
      // Sat-Sun: 20-28 sessions (heavy weekend demand)
      let baseCount = 12;
      if (dayOfWeek === 5) baseCount = 18; // Friday
      else if (dayOfWeek === 6 || dayOfWeek === 0) baseCount = 24; // Weekend

      // Add small natural variance (-2 to +3)
      const dailyCount = Math.max(6, baseCount + Math.floor(Math.random() * 6) - 2);

      for (let s = 0; s < dailyCount; s++) {
        // Distribute session times across typical hours:
        // Morning peak: 8:00 - 10:30 (30% probability)
        // Evening peak: 17:30 - 21:30 (45% probability)
        // Daytime: 11:00 - 17:00 (18% probability)
        // Off-peak night: 22:00 - 06:00 (7% probability)
        const randTime = Math.random();
        let hour = 18;
        let minute = Math.floor(Math.random() * 60);

        if (randTime < 0.30) {
          hour = 8 + Math.floor(Math.random() * 3); // 8, 9, 10
        } else if (randTime < 0.75) {
          hour = 17 + Math.floor(Math.random() * 5); // 17, 18, 19, 20, 21
        } else if (randTime < 0.93) {
          hour = 11 + Math.floor(Math.random() * 6); // 11 to 16
        } else {
          hour = Math.random() < 0.5 ? Math.floor(Math.random() * 6) : 22 + Math.floor(Math.random() * 2);
        }

        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

        // Pick random slot from owner's stations
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const isDcFast = slot.charger_type === "DC_FAST";

        // Duration in minutes
        const duration = isDcFast ? [30, 45, 60][Math.floor(Math.random() * 3)] : [60, 90, 120, 180][Math.floor(Math.random() * 4)];
        
        // Amount calculation
        const kwh = isDcFast ? (duration / 60) * (parseFloat(slot.power_kw) * 0.75) : (duration / 60) * (parseFloat(slot.power_kw) * 0.9);
        const amount = Math.max(120, Math.round(kwh * parseFloat(slot.price_per_kwh) + 20));

        const bookingId = `EVH${String(bookingCounter).padStart(5, "0")}`;
        const status = dayOffset === 0 ? "CONFIRMED" : "COMPLETED";

        bookingsToInsert.push({
          booking_id: bookingId,
          user_id: customerId,
          vehicle_id: vehicleId,
          station_id: slot.station_id,
          slot_id: slot.id,
          vehicle_type: "Car",
          charging_type: isDcFast ? "DC Fast Charging" : "AC Standard Charging",
          duration,
          booking_date: dateStr,
          start_time: timeStr,
          amount,
          status,
        });

        paymentsToInsert.push({
          booking_code: bookingId,
          user_id: customerId,
          amount,
          transaction_id: `pay_sim_${bookingCounter}`,
          razorpay_order_id: `order_sim_${bookingCounter}`,
          razorpay_payment_id: `pay_sim_${bookingCounter}`,
          payment_status: "SUCCESS",
          created_at: `${dateStr} ${timeStr}`,
        });

        bookingCounter++;
      }
    }

    console.log(`📦 Inserting ${bookingsToInsert.length} bookings into MySQL...`);

    // Batch insert bookings inside a transaction
    await transaction(async (connection) => {
      for (const b of bookingsToInsert) {
        const [res] = await connection.execute(
          `INSERT INTO bookings 
           (booking_id, user_id, vehicle_id, station_id, slot_id, vehicle_type, charging_type, duration, booking_date, start_time, payment_method, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.booking_id, b.user_id, b.vehicle_id, b.station_id, b.slot_id, b.vehicle_type, b.charging_type, b.duration, b.booking_date, b.start_time, "Razorpay Test Mode", b.amount, b.status]
        );
        const numericId = res.insertId;

        await connection.execute(
          `INSERT INTO payments 
           (booking_id, user_id, amount, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, payment_status, created_at)
           VALUES (?, ?, ?, 'Razorpay Test Mode', ?, ?, ?, 'SUCCESS', ?)`,
          [numericId, b.user_id, b.amount, `pay_sim_${numericId}`, `order_sim_${numericId}`, `pay_sim_${numericId}`, `${b.booking_date} ${b.start_time}`]
        );
      }
    });

    console.log(`✅ Successfully seeded ${bookingsToInsert.length} historical bookings across 60 days!`);
    console.log(`📊 Date range: 60 days ago (${bookingsToInsert[0]?.booking_date}) to today (${bookingsToInsert[bookingsToInsert.length - 1]?.booking_date})`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding historical bookings:", err);
    process.exit(1);
  }
}

seedHistoricalBookings();
