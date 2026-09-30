import { pool, query, transaction } from "../config/db.js";

async function migrateChargingRestructure() {
  console.log("⚡ Starting EV Charging Module & Data Separation Migration...");

  try {
    // 1. Ensure extra columns exist in `bookings`
    console.log("📦 Checking and updating `bookings` table columns...");
    const existingCols = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'ev_charging_db' AND TABLE_NAME = 'bookings'"
    );
    const existingColNames = existingCols.map((c) => c.COLUMN_NAME);

    const colsToAdd = [
      { name: "source", type: "VARCHAR(20) DEFAULT 'ORGANIC'" },
      { name: "charging_session_id", type: "VARCHAR(50) NULL" },
      { name: "actual_start_time", type: "DATETIME NULL" },
      { name: "actual_end_time", type: "DATETIME NULL" },
      { name: "actual_energy_used", type: "DECIMAL(8,2) NULL" },
      { name: "final_amount", type: "DECIMAL(10,2) NULL" },
      { name: "completed_at", type: "DATETIME NULL" },
      { name: "invoice_number", type: "VARCHAR(50) NULL" },
    ];

    for (const col of colsToAdd) {
      if (!existingColNames.includes(col.name)) {
        await query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  + Added column bookings.${col.name}`);
      }
    }

    // 2. Create `charging_sessions` table
    console.log("🔋 Creating `charging_sessions` table...");
    await query(`
      CREATE TABLE IF NOT EXISTS charging_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(50) UNIQUE NOT NULL,
        booking_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        vehicle_id INT NULL,
        station_id INT NOT NULL,
        slot_id INT NULL,
        connector_id VARCHAR(50) NULL,
        status ENUM('ACTIVE', 'COMPLETED', 'STOPPED', 'CANCELLED') DEFAULT 'ACTIVE',
        start_time DATETIME NOT NULL,
        end_time DATETIME NULL,
        starting_battery INT DEFAULT 20,
        current_battery INT DEFAULT 20,
        target_battery INT DEFAULT 80,
        final_battery INT NULL,
        energy_delivered DECIMAL(8,2) DEFAULT 0.00,
        charging_power DECIMAL(8,2) DEFAULT 50.00,
        duration_minutes INT DEFAULT 0,
        estimated_cost DECIMAL(10,2) DEFAULT 0.00,
        current_cost DECIMAL(10,2) DEFAULT 0.00,
        final_amount DECIMAL(10,2) DEFAULT 0.00,
        payment_status VARCHAR(20) DEFAULT 'PAID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_user (user_id),
        INDEX idx_session_booking (booking_id),
        INDEX idx_session_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create `invoices` table
    console.log("🧾 Creating `invoices` table...");
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        booking_id VARCHAR(50) NOT NULL,
        session_id VARCHAR(50) NULL,
        user_id INT NOT NULL,
        station_id INT NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        vehicle_model VARCHAR(100) NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        starting_battery INT NOT NULL,
        final_battery INT NOT NULL,
        energy_consumed DECIMAL(8,2) NOT NULL,
        tariff_per_kwh DECIMAL(8,2) DEFAULT 15.00,
        energy_charge DECIMAL(10,2) NOT NULL,
        service_fee DECIMAL(10,2) DEFAULT 10.00,
        discount DECIMAL(10,2) DEFAULT 10.00,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'UPI / Razorpay',
        payment_id VARCHAR(100) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'PAID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_invoice_user (user_id),
        INDEX idx_invoice_booking (booking_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Ensure demo users exist for seeded records
    console.log("👥 Creating demo customer fleet users...");
    const demoUsers = [
      { id: 999, name: "EV Network Fleet Customer", email: "fleet@evcharge.com", phone: "+91 98765 43299" },
      { id: 101, name: "Rahul Sharma", email: "rahul@evcharge.com", phone: "+91 98765 43210" },
      { id: 102, name: "Ananya Iyer", email: "ananya@evcharge.com", phone: "+91 98765 43211" },
    ];

    for (const du of demoUsers) {
      const existing = await query("SELECT id FROM users WHERE id = ?", [du.id]);
      if (existing && existing.length === 0) {
        await query(
          "INSERT INTO users (id, name, email, password, role, phone) VALUES (?, ?, ?, '$2b$10$wN1F9eXfR9...', 'USER', ?)",
          [du.id, du.name, du.email, du.phone]
        );
      }
    }

    // 5. Reassign historical seeded bookings (EVH%) away from user 3 to user 999
    console.log("🔄 Separating 1041 seeded records from Customer CUS0001 (user 3)...");
    await query(`
      UPDATE bookings 
      SET user_id = 999, source = 'SEEDED'
      WHERE booking_id LIKE 'EVH%'
    `);

    // 6. Setup exact initial authentic test data for Customer CUS0001 (user 3)
    console.log("🎯 Setting up exact 3 test bookings for Priyan Customer (CUS0001)...");
    
    // Clean any old test records for user 3
    await query("DELETE FROM bookings WHERE user_id = 3 AND booking_id NOT IN ('EV1001', 'EV1002', 'EV1003')");

    // Fetch primary station & slots
    const stations = await query("SELECT id, station_name, address FROM charging_stations LIMIT 1");
    const stationId = stations.length > 0 ? stations[0].id : 1;
    const slots = await query("SELECT id, connector_id FROM charging_slots WHERE station_id = ? LIMIT 2", [stationId]);
    const slot1 = slots[0] || { id: 1, connector_id: "STA001-C01" };
    const slot2 = slots[1] || { id: 2, connector_id: "STA001-C02" };

    const user3Vehicles = await query("SELECT id FROM vehicles WHERE user_id = 3 LIMIT 1");
    let vehId = 1;
    if (user3Vehicles.length > 0) {
      vehId = user3Vehicles[0].id;
    } else {
      const insV = await query(
        "INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, brand, model, battery_capacity, max_charging_power) VALUES (3, 'TN58AB1234', 'Car', 'Tata Motors', 'Nexon EV Max', 40.50, 50.00)"
      );
      vehId = insV.insertId || 1;
    }

    // 1. EV1001 - CONFIRMED (Upcoming)
    const b1 = await query("SELECT id FROM bookings WHERE booking_id = 'EV1001'");
    if (b1.length === 0) {
      await query(`
        INSERT INTO bookings 
        (booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, vehicle_type, charging_type, charging_power, energy_required, estimated_duration, duration, booking_date, start_time, end_time, battery_start_pct, battery_target_pct, payment_method, amount, status, qr_token, check_in_token, customer_name, customer_phone, vehicle_number, source)
        VALUES ('EV1001', 3, ?, ?, ?, ?, 'Car', 'DC Fast Charging', 50.00, 30.00, 45, 45, '2026-09-30', '10:00:00', '10:45:00', 20, 80, 'Razorpay Test Mode', 450.00, 'CONFIRMED', 'QR_EV1001_A1B2', 'QR_EV1001_A1B2', 'Priyan Customer', '+91 98765 43210', 'TN58AB1234', 'ORGANIC')
      `, [vehId, stationId, slot1.id, slot1.connector_id]);
    } else {
      await query(`
        UPDATE bookings 
        SET status = 'CONFIRMED', booking_date = '2026-09-30', start_time = '10:00:00', end_time = '10:45:00', user_id = 3
        WHERE booking_id = 'EV1001'
      `);
    }

    // 2. EV1002 - COMPLETED (with full session, payment, and invoice)
    const b2 = await query("SELECT id FROM bookings WHERE booking_id = 'EV1002'");
    if (b2.length === 0) {
      await query(`
        INSERT INTO bookings 
        (booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, vehicle_type, charging_type, charging_power, energy_required, estimated_duration, duration, booking_date, start_time, end_time, battery_start_pct, battery_target_pct, payment_method, amount, status, qr_token, check_in_token, customer_name, customer_phone, vehicle_number, source, actual_start_time, actual_end_time, actual_energy_used, final_amount, completed_at, invoice_number)
        VALUES ('EV1002', 3, ?, ?, ?, ?, 'Car', 'DC Fast Charging', 50.00, 29.10, 52, 52, '2026-09-29', '14:00:00', '14:52:00', 20, 78, 'Razorpay Test Mode', 436.50, 'COMPLETED', 'QR_EV1002_C3D4', 'QR_EV1002_C3D4', 'Priyan Customer', '+91 98765 43210', 'TN58AB1234', 'ORGANIC', '2026-09-29 14:00:00', '2026-09-29 14:52:00', 29.10, 436.50, '2026-09-29 14:52:00', 'INV-2026-00042')
      `, [vehId, stationId, slot1.id, slot1.connector_id]);
    } else {
      await query(`
        UPDATE bookings 
        SET status = 'COMPLETED', user_id = 3, actual_start_time = '2026-09-29 14:00:00', actual_end_time = '2026-09-29 14:52:00', actual_energy_used = 29.10, final_amount = 436.50, completed_at = '2026-09-29 14:52:00', invoice_number = 'INV-2026-00042'
        WHERE booking_id = 'EV1002'
      `);
    }

    // Insert completed session for EV1002
    await query("DELETE FROM charging_sessions WHERE booking_id = 'EV1002'");
    await query(`
      INSERT INTO charging_sessions
      (session_id, booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, status, start_time, end_time, starting_battery, current_battery, target_battery, final_battery, energy_delivered, charging_power, duration_minutes, estimated_cost, current_cost, final_amount, payment_status)
      VALUES
      ('CS00042', 'EV1002', 3, ?, ?, ?, ?, 'COMPLETED', '2026-09-29 14:00:00', '2026-09-29 14:52:00', 20, 78, 80, 78, 29.10, 50.00, 52, 450.00, 436.50, 436.50, 'PAID')
    `, [vehId, stationId, slot1.id, slot1.connector_id]);

    // Insert invoice for EV1002
    await query("DELETE FROM invoices WHERE booking_id = 'EV1002'");
    await query(`
      INSERT INTO invoices
      (invoice_number, booking_id, session_id, user_id, station_id, vehicle_number, vehicle_model, start_time, end_time, duration_minutes, starting_battery, final_battery, energy_consumed, tariff_per_kwh, energy_charge, service_fee, discount, total_amount, payment_method, payment_id, payment_status)
      VALUES
      ('INV-2026-00042', 'EV1002', 'CS00042', 3, ?, 'TN58AB1234', 'Tata Motors Nexon EV Max', '2026-09-29 14:00:00', '2026-09-29 14:52:00', 52, 20, 78, 29.10, 15.00, 436.50, 10.00, 10.00, 436.50, 'Razorpay UPI', 'pay_test_00042', 'PAID')
    `, [stationId]);

    // 3. EV1003 - CANCELLED
    const b3 = await query("SELECT id FROM bookings WHERE booking_id = 'EV1003'");
    if (b3.length === 0) {
      await query(`
        INSERT INTO bookings 
        (booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, vehicle_type, charging_type, charging_power, energy_required, estimated_duration, duration, booking_date, start_time, end_time, battery_start_pct, battery_target_pct, payment_method, amount, status, qr_token, check_in_token, customer_name, customer_phone, vehicle_number, source)
        VALUES ('EV1003', 3, ?, ?, ?, ?, 'Car', 'AC Charging', 22.00, 25.00, 60, 60, '2026-09-28', '09:00:00', '10:00:00', 30, 80, 'Razorpay Test Mode', 350.00, 'CANCELLED', 'QR_EV1003_E5F6', 'QR_EV1003_E5F6', 'Priyan Customer', '+91 98765 43210', 'TN58AB1234', 'ORGANIC')
      `, [vehId, stationId, slot2.id, slot2.connector_id]);
    } else {
      await query(`
        UPDATE bookings 
        SET status = 'CANCELLED', user_id = 3
        WHERE booking_id = 'EV1003'
      `);
    }

    // Check counts
    const user3Count = await query("SELECT COUNT(*) as count FROM bookings WHERE user_id = 3");
    const totalCount = await query("SELECT COUNT(*) as count FROM bookings");
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Customer CUS0001 (user 3) bookings count: ${user3Count[0].count} (Expected: 3)`);
    console.log(`📊 Total System / Station Bookings count: ${totalCount[0].count} (Preserved for Owner/Admin)`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrateChargingRestructure();
