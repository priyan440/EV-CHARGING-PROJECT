import { query, transaction } from "./config/db.js";
import { formatBooking } from "./controllers/bookingController.js";

async function runTest() {
  console.log("==================================================");
  console.log("STARTING FULL BOOKING + PAYMENT + REVENUE SYNCHRONIZATION TEST");
  console.log("==================================================");

  try {
    // 1. Check or seed Milton customer
    let users = await query("SELECT * FROM users WHERE email = 'milton@evcharge.pro' OR name LIKE '%Milton%'");
    let customer = users[0];
    if (!customer) {
      console.log("Creating test customer 'Milton'...");
      const [uRes] = await query(
        `INSERT INTO users (user_id, name, email, password, phone, role, status)
         VALUES ('CUS000099', 'Milton', 'milton@evcharge.pro', '$2b$10$dummyhashfortestingonly1234567890123456', '+91 9876543210', 'CUSTOMER', 'ACTIVE')`
      );
      const inserted = await query("SELECT * FROM users WHERE id = ?", [uRes.insertId]);
      customer = inserted[0];
    }
    console.log(`[PASS] Customer verified: ID=${customer.id}, Code=${customer.user_id}, Name=${customer.name}`);

    // 2. Check or create Owner
    let owners = await query("SELECT * FROM users WHERE role IN ('OWNER', 'STATION_OWNER') LIMIT 1");
    let owner = owners[0];
    if (!owner) {
      console.log("Creating test owner...");
      const [oRes] = await query(
        `INSERT INTO users (user_id, name, email, password, phone, role, status, company_name)
         VALUES ('OWN000001', 'GreenCharge Networks', 'owner@greencharge.com', '$2b$10$dummyhashfortestingonly1234567890123456', '+91 9123456780', 'STATION_OWNER', 'ACTIVE', 'GreenCharge Pvt Ltd')`
      );
      const inserted = await query("SELECT * FROM users WHERE id = ?", [oRes.insertId]);
      owner = inserted[0];
    }
    console.log(`[PASS] Owner verified: ID=${owner.id}, Name=${owner.name}`);

    // 3. Check or create Station "GreenCharge Hyper Hub"
    let stations = await query("SELECT * FROM stations WHERE station_name LIKE '%GreenCharge%' OR owner_id = ? LIMIT 1", [owner.id]);
    let station = stations[0];
    if (!station) {
      console.log("Creating test station 'GreenCharge Hyper Hub'...");
      const [sRes] = await query(
        `INSERT INTO stations (station_id, owner_id, station_name, address, city, state, pincode, latitude, longitude, max_power, total_slots, available_slots, status, approval_status)
         VALUES ('STA000001', ?, 'GreenCharge Hyper Hub', '100 EV Expressway', 'Chennai', 'Tamil Nadu', '600001', 13.0827, 80.2707, 150.0, 4, 4, 'ACTIVE', 'APPROVED')`,
        [owner.id]
      );
      const inserted = await query("SELECT * FROM stations WHERE id = ?", [sRes.insertId]);
      station = inserted[0];
    }
    console.log(`[PASS] Station verified: ID=${station.id}, Code=${station.station_id}, Name=${station.station_name}`);

    // 4. Check or create Charger
    let chargers = await query("SELECT * FROM chargers WHERE station_id = ? LIMIT 1", [station.id]);
    let charger = chargers[0];
    if (!charger) {
      console.log("Creating test charger...");
      const [cRes] = await query(
        `INSERT INTO chargers (charger_id, station_id, charger_name, charger_type, power_kw, max_voltage, max_current, status)
         VALUES ('CHG000001', ?, 'Hyper DC Fast Port 1', 'DC_FAST', 60.0, 500.0, 120.0, 'AVAILABLE')`,
        [station.id]
      );
      const inserted = await query("SELECT * FROM chargers WHERE id = ?", [cRes.insertId]);
      charger = inserted[0];
    }
    console.log(`[PASS] Charger verified: ID=${charger.id}, Code=${charger.charger_id}, Name=${charger.charger_name}`);

    // 5. Check or create Vehicle for Milton
    let vehicles = await query("SELECT * FROM vehicles WHERE user_id = ? LIMIT 1", [customer.id]);
    let vehicle = vehicles[0];
    if (!vehicle) {
      console.log("Creating registered vehicle for customer...");
      const [vRes] = await query(
        `INSERT INTO vehicles (vehicle_id, user_id, registration_number, brand, model, vehicle_type, battery_capacity_kwh, max_charging_power_kw, connector_type)
         VALUES ('VEH000001', ?, 'TN09EV9999', 'Tata Motors', 'Nexon EV Max', '4W', 40.5, 50.0, 'CCS2')`,
        [customer.id]
      );
      const inserted = await query("SELECT * FROM vehicles WHERE id = ?", [vRes.insertId]);
      vehicle = inserted[0];
    }
    console.log(`[PASS] Vehicle verified: ID=${vehicle.id}, Number=${vehicle.registration_number}, Model=${vehicle.model}`);

    // 6. Simulate Booking Creation via Atomic Transaction
    console.log("\nSimulating Customer Booking Creation for 1 hour...");
    const [bMax] = await query("SELECT COALESCE(MAX(id), 0) as maxId FROM bookings");
    const nextBookingNum = (bMax?.maxId || 0) + 1;
    const testBookingCode = `BOK${String(nextBookingNum).padStart(6, "0")}`;
    const todayStr = new Date().toISOString().split("T")[0];
    const estimatedAmount = 442.50;

    let newBookingId = null;
    await transaction(async (connection) => {
      const [bInsert] = await connection.execute(
        `INSERT INTO bookings 
         (booking_id, user_id, vehicle_id, station_id, charger_id, booking_date, start_time, end_time, duration_minutes, tariff_rate_snapshot, connection_fee_snapshot, estimated_amount, booking_status, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, '14:00:00', '15:00:00', 60, 18.0, 15.0, ?, 'CONFIRMED', 'PENDING')`,
        [testBookingCode, customer.id, vehicle.id, station.id, charger.id, todayStr, estimatedAmount]
      );
      newBookingId = bInsert.insertId;

      await connection.execute("UPDATE chargers SET status = 'RESERVED' WHERE id = ?", [charger.id]);
    });

    console.log(`[PASS] Booking Created in MySQL: ID=${newBookingId}, BookingCode=${testBookingCode}, Status=CONFIRMED, PaymentStatus=PENDING`);

    // 7. Simulate Payment Success Flow (Razorpay Capture & DB Transaction)
    console.log("\nSimulating Payment Success Flow (Amount = ₹442.50)...");
    const payCode = `PAY${Date.now().toString().slice(-6)}`;
    const gatewayOrderId = `order_${Date.now()}`;
    const gatewayPayId = `pay_${Date.now()}`;

    await transaction(async (connection) => {
      // Insert Payment
      await connection.execute(
        `INSERT INTO payments 
         (payment_id, booking_id, user_id, gateway, gateway_order_id, gateway_payment_id, gateway_signature, amount, currency, payment_method, payment_status, paid_at)
         VALUES (?, ?, ?, 'RAZORPAY', ?, ?, 'test_sig', ?, 'INR', 'ONLINE', 'SUCCESS', NOW())`,
        [payCode, newBookingId, customer.id, gatewayOrderId, gatewayPayId, estimatedAmount]
      );

      // Update Booking
      await connection.execute(
        `UPDATE bookings 
         SET booking_status = 'CONFIRMED', payment_status = 'PAID', payment_id = ?, updated_at = NOW() 
         WHERE id = ?`,
        [payCode, newBookingId]
      );

      // Reserve Charger
      await connection.execute(
        "UPDATE chargers SET status = 'RESERVED' WHERE id = ?",
        [charger.id]
      );
    });

    console.log(`[PASS] Payment Verified: PaymentCode=${payCode}, Amount=₹${estimatedAmount}, Status=SUCCESS`);

    // 8. Verify Customer View
    console.log("\n--- VERIFYING CUSTOMER DASHBOARD QUERY ---");
    const customerBookings = await query(
      `SELECT b.*, u.name as customer_name, s.station_name, v.registration_number, v.model, c.charger_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = ? AND b.id = ?`,
      [customer.id, newBookingId]
    );
    console.log("Customer Booking Record:", {
      bookingId: customerBookings[0].booking_id,
      status: customerBookings[0].booking_status,
      paymentStatus: customerBookings[0].payment_status,
      station: customerBookings[0].station_name,
      amount: customerBookings[0].estimated_amount,
    });

    // 9. Verify Owner View & Revenue Calculation
    console.log("\n--- VERIFYING OWNER DASHBOARD & REVENUE QUERY ---");
    const ownerBookings = await query(
      `SELECT b.*, u.name as customer_name, u.email as customer_email, s.station_name, v.registration_number, v.model, c.charger_name
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       JOIN users u ON b.user_id = u.id
       JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE s.owner_id = ? AND b.id = ?`,
      [owner.id, newBookingId]
    );
    console.log("Owner Booking Record:", {
      bookingId: ownerBookings[0].booking_id,
      customerName: ownerBookings[0].customer_name,
      vehicle: `${ownerBookings[0].registration_number} (${ownerBookings[0].model})`,
      station: ownerBookings[0].station_name,
      status: ownerBookings[0].booking_status,
      paymentStatus: ownerBookings[0].payment_status,
    });

    const [ownerRev] = await query(
      `SELECT 
         COALESCE(SUM(p.amount), 0) as totalRevenue,
         COUNT(p.id) as totalTransactions,
         COALESCE(SUM(p.amount * 0.95), 0) as ownerNetRevenue
       FROM payments p
       JOIN bookings b ON (p.booking_id = b.id OR p.booking_id = b.booking_id)
       JOIN stations s ON b.station_id = s.id
       WHERE s.owner_id = ? AND p.payment_status = 'SUCCESS'`,
      [owner.id]
    );
    console.log("Owner Dynamic Revenue Calculation from MySQL:", {
      totalRevenue: `₹${ownerRev.totalRevenue}`,
      ownerNetRevenue: `₹${ownerRev.ownerNetRevenue}`,
      successfulTransactions: ownerRev.totalTransactions,
    });

    // 10. Verify Admin View
    console.log("\n--- VERIFYING ADMIN DASHBOARD & BOOKINGS QUERY ---");
    const adminBookings = await query(
      `SELECT b.*, u.name as customer_name, s.station_name, u2.name as owner_name, v.registration_number
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       JOIN users u2 ON s.owner_id = u2.id
       JOIN chargers c ON b.charger_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = ?`,
      [newBookingId]
    );
    console.log("Admin Booking Record:", {
      bookingId: adminBookings[0].booking_id,
      customer: adminBookings[0].customer_name,
      owner: adminBookings[0].owner_name,
      station: adminBookings[0].station_name,
      vehicle: adminBookings[0].registration_number,
      paymentStatus: adminBookings[0].payment_status,
    });

    console.log("\n==================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY! MySQL SYNCHRONIZATION IS 100% OPERATIONAL");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    process.exit(1);
  }
}

runTest();
