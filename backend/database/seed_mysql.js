import { query } from "../config/db.js";
import bcrypt from "bcryptjs";

async function addColumnIfNotExists(table, column, definition) {
  const check = await query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = ?
  `, [table, column]);

  if (check.length === 0) {
    try {
      await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`+ Added column ${column} to table ${table}`);
    } catch (err) {
      console.warn(`Could not add column ${column} to ${table}:`, err.message);
    }
  }
}

export async function initializeDatabaseSchema() {
  console.log("🛠️ Checking and upgrading MySQL Database Schema for EV Platform...");

  // 0. ev_networks table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ev_networks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        network_id VARCHAR(50) UNIQUE,
        owner_id INT NOT NULL,
        network_name VARCHAR(150) NOT NULL,
        logo TEXT NULL,
        description TEXT NULL,
        contact_email VARCHAR(150),
        contact_phone VARCHAR(50),
        website VARCHAR(200),
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE') DEFAULT 'APPROVED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_network_owner (owner_id),
        INDEX idx_network_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.warn("ev_networks table check notice:", err.message);
  }

  // 1. users columns (for owner details & approval status)
  await addColumnIfNotExists("users", "company_name", "VARCHAR(150) NULL");
  await addColumnIfNotExists("users", "network_name", "VARCHAR(150) NULL");
  await addColumnIfNotExists("users", "business_reg_number", "VARCHAR(100) NULL");
  await addColumnIfNotExists("users", "address", "TEXT NULL");
  await addColumnIfNotExists("users", "city", "VARCHAR(100) NULL");
  await addColumnIfNotExists("users", "state", "VARCHAR(100) NULL");
  await addColumnIfNotExists("users", "pincode", "VARCHAR(20) NULL");
  await addColumnIfNotExists("users", "owner_status", "ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') DEFAULT 'APPROVED'");

  // 2. charging_stations columns
  await addColumnIfNotExists("charging_stations", "network_id", "INT NULL");
  await addColumnIfNotExists("charging_stations", "network_name", "VARCHAR(150) DEFAULT 'GreenCharge'");
  await addColumnIfNotExists("charging_stations", "description", "TEXT NULL");
  await addColumnIfNotExists("charging_stations", "is_24x7", "BOOLEAN DEFAULT TRUE");
  await addColumnIfNotExists("charging_stations", "parking_capacity", "INT DEFAULT 10");
  await addColumnIfNotExists("charging_stations", "ac_chargers", "INT DEFAULT 2");
  await addColumnIfNotExists("charging_stations", "dc_chargers", "INT DEFAULT 2");
  await addColumnIfNotExists("charging_stations", "connector_types", "VARCHAR(255) DEFAULT 'CCS2, Type 2, CHAdeMO'");
  await addColumnIfNotExists("charging_stations", "charging_price", "DECIMAL(10,2) DEFAULT 18.00");
  await addColumnIfNotExists("charging_stations", "service_fee", "DECIMAL(10,2) DEFAULT 20.00");
  await addColumnIfNotExists("charging_stations", "approval_status", "ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') DEFAULT 'APPROVED'");
  await addColumnIfNotExists("charging_stations", "is_active", "BOOLEAN DEFAULT TRUE");
  await addColumnIfNotExists("charging_stations", "max_power", "DECIMAL(10,2) DEFAULT 120.00");
  await addColumnIfNotExists("charging_stations", "max_current", "DECIMAL(10,2) DEFAULT 180.00");
  await addColumnIfNotExists("charging_stations", "opening_time", "TIME DEFAULT '06:00:00'");
  await addColumnIfNotExists("charging_stations", "closing_time", "TIME DEFAULT '23:00:00'");
  await addColumnIfNotExists("charging_stations", "city", "VARCHAR(100) DEFAULT 'Chennai'");
  await addColumnIfNotExists("charging_stations", "state", "VARCHAR(100) DEFAULT 'Tamil Nadu'");
  await addColumnIfNotExists("charging_stations", "pincode", "VARCHAR(20) DEFAULT '600001'");
  await addColumnIfNotExists("charging_stations", "amenities", "TEXT NULL");
  await addColumnIfNotExists("charging_stations", "image", "TEXT NULL");

  // 3. charging_slots columns
  await addColumnIfNotExists("charging_slots", "connector_id", "VARCHAR(50) NULL");
  await addColumnIfNotExists("charging_slots", "connector_type", "VARCHAR(50) DEFAULT 'CCS2'");
  await addColumnIfNotExists("charging_slots", "bay_number", "VARCHAR(50) NULL");
  await addColumnIfNotExists("charging_slots", "charging_type", "VARCHAR(50) DEFAULT 'DC Fast Charging'");
  await addColumnIfNotExists("charging_slots", "max_power", "DECIMAL(10,2) DEFAULT 60.00");
  await addColumnIfNotExists("charging_slots", "current_booking_id", "VARCHAR(50) NULL");
  await addColumnIfNotExists("charging_slots", "protected_until", "DATETIME NULL");
  await addColumnIfNotExists("charging_slots", "last_status_change", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

  // Allow flexible charger statuses
  try {
    await query("ALTER TABLE charging_slots MODIFY COLUMN status VARCHAR(40) DEFAULT 'AVAILABLE'");
  } catch (err) {
    console.warn("charging_slots status modify notice:", err.message);
  }

  // 4. vehicles columns
  await addColumnIfNotExists("vehicles", "max_charging_power", "DECIMAL(10,2) DEFAULT 50.00");
  await addColumnIfNotExists("vehicles", "current_battery_pct", "INT DEFAULT 20");
  await addColumnIfNotExists("vehicles", "target_battery_pct", "INT DEFAULT 80");

  // 5. bookings columns
  await addColumnIfNotExists("bookings", "connector_id", "VARCHAR(50) NULL");
  await addColumnIfNotExists("bookings", "end_time", "TIME NULL");
  await addColumnIfNotExists("bookings", "battery_start_pct", "INT DEFAULT 20");
  await addColumnIfNotExists("bookings", "battery_target_pct", "INT DEFAULT 80");
  await addColumnIfNotExists("bookings", "energy_required", "DECIMAL(10,2) DEFAULT 36.00");
  await addColumnIfNotExists("bookings", "charging_power", "DECIMAL(10,2) DEFAULT 30.00");
  await addColumnIfNotExists("bookings", "estimated_duration", "DECIMAL(10,2) DEFAULT 60.00");
  await addColumnIfNotExists("bookings", "qr_token", "VARCHAR(255) NULL");
  await addColumnIfNotExists("bookings", "check_in_token", "VARCHAR(255) NULL");
  await addColumnIfNotExists("bookings", "checked_in_at", "DATETIME NULL");
  await addColumnIfNotExists("bookings", "grace_period_expires_at", "DATETIME NULL");
  await addColumnIfNotExists("bookings", "is_offline", "BOOLEAN DEFAULT FALSE");
  await addColumnIfNotExists("bookings", "operator_id", "INT NULL");
  await addColumnIfNotExists("bookings", "customer_name", "VARCHAR(150) NULL");
  await addColumnIfNotExists("bookings", "customer_phone", "VARCHAR(50) NULL");
  await addColumnIfNotExists("bookings", "vehicle_number", "VARCHAR(50) NULL");
  await addColumnIfNotExists("bookings", "no_show_at", "DATETIME NULL");

  // Allow expanded booking statuses
  try {
    await query("ALTER TABLE bookings MODIFY COLUMN status VARCHAR(40) DEFAULT 'CONFIRMED'");
  } catch (err) {
    console.warn("bookings status modify notice:", err.message);
  }

  // 6. reservation_policies table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS reservation_policies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        station_id INT NULL UNIQUE,
        protection_minutes INT DEFAULT 10,
        grace_period_minutes INT DEFAULT 10,
        queue_timeout_minutes INT DEFAULT 5,
        max_advance_days INT DEFAULT 7,
        max_duration_hours INT DEFAULT 4,
        cancellation_window_mins INT DEFAULT 15,
        no_show_penalty_pct INT DEFAULT 20,
        auto_assign_queue BOOLEAN DEFAULT TRUE,
        allow_offline_booking BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_policy_station (station_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure default global policy (station_id NULL or 0) exists
    const existingPolicy = await query("SELECT id FROM reservation_policies WHERE station_id IS NULL OR station_id = 0 LIMIT 1");
    if (existingPolicy.length === 0) {
      await query(`
        INSERT INTO reservation_policies 
        (station_id, protection_minutes, grace_period_minutes, queue_timeout_minutes, max_advance_days, max_duration_hours, cancellation_window_mins, no_show_penalty_pct, auto_assign_queue, allow_offline_booking)
        VALUES (NULL, 10, 10, 5, 7, 4, 15, 20, TRUE, TRUE)
      `);
    }
  } catch (err) {
    console.warn("reservation_policies table init notice:", err.message);
  }

  // 7. offline_bookings table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS offline_bookings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        offline_booking_id VARCHAR(50) UNIQUE NOT NULL,
        station_id INT NOT NULL,
        slot_id INT NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(50) DEFAULT 'Car',
        connector_type VARCHAR(50) DEFAULT 'CCS2',
        charging_type VARCHAR(50) DEFAULT 'DC Fast Charging',
        power_kw DECIMAL(10,2) DEFAULT 50.00,
        duration_minutes INT DEFAULT 45,
        amount DECIMAL(10,2) DEFAULT 0.00,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CASH_PENDING') DEFAULT 'PAID',
        operator_id INT NULL,
        status VARCHAR(40) DEFAULT 'CHARGING',
        arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_offline_station (station_id),
        INDEX idx_offline_slot (slot_id),
        INDEX idx_offline_status (status),
        INDEX idx_offline_vehicle (vehicle_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.warn("offline_bookings table init notice:", err.message);
  }

  // 8. queue_entries table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        queue_token VARCHAR(50) UNIQUE NOT NULL,
        station_id INT NOT NULL,
        user_id INT NULL,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(50) DEFAULT 'Car',
        connector_type VARCHAR(50) DEFAULT 'CCS2',
        required_duration INT DEFAULT 45,
        position INT DEFAULT 1,
        status ENUM('WAITING', 'NOTIFIED', 'ASSIGNED', 'COMPLETED', 'CANCELLED', 'EXPIRED') DEFAULT 'WAITING',
        estimated_wait_minutes INT DEFAULT 15,
        assigned_slot_id INT NULL,
        expires_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_queue_station_status (station_id, status),
        INDEX idx_queue_vehicle (vehicle_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.warn("queue_entries table init notice:", err.message);
  }

  // 9. audit_logs table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        log_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INT NULL,
        operator_id INT NULL,
        station_id INT NULL,
        charger_id VARCHAR(50) NULL,
        slot_id INT NULL,
        booking_id VARCHAR(50) NULL,
        action VARCHAR(100) NOT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NULL,
        reason TEXT NULL,
        details JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_station (station_id),
        INDEX idx_audit_booking (booking_id),
        INDEX idx_audit_action (action),
        INDEX idx_audit_created (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.warn("audit_logs table init notice:", err.message);
  }

  // 10. Performance Indexes on bookings and charging_slots
  try {
    await query("CREATE INDEX IF NOT EXISTS idx_bookings_slot_date ON bookings (slot_id, booking_date, status)");
  } catch {}
  try {
    await query("CREATE INDEX IF NOT EXISTS idx_bookings_station_date ON bookings (station_id, booking_date, status)");
  } catch {}
  try {
    await query("CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings (booking_id)");
  } catch {}

  // Seed default networks if empty
  try {
    const existingNetworks = await query("SELECT COUNT(*) as count FROM ev_networks");
    if (existingNetworks[0]?.count === 0) {
      await query(`
        INSERT INTO ev_networks (network_id, owner_id, network_name, description, contact_email, contact_phone, website, status)
        VALUES 
        ('NET001', 2, 'GreenCharge Network', 'Leading ultrafast EV charging network in South India', 'support@greencharge.com', '+91 98401 23456', 'https://greencharge.com', 'APPROVED'),
        ('NET002', 4, 'VoltHub Power', 'Nationwide highway and tech park EV fast charging network', 'support@volthub.com', '+91 98801 11223', 'https://volthub.com', 'APPROVED'),
        ('NET003', 2, 'ChargePoint Local', 'Urban and mall destination charging points', 'support@chargepointlocal.com', '+91 94431 55667', 'https://chargepointlocal.com', 'APPROVED')
      `);
    }
  } catch (err) {
    console.warn("Default network seed notice:", err.message);
  }

  console.log("✅ MySQL Schema verified and enhanced successfully.");
}

export async function seedComprehensiveData() {
  console.log("⚡ Seeding Realistic Platform Stations, Connectors & Vehicles into MySQL...");

  const salt = await bcrypt.genSalt(10);
  const userPass = await bcrypt.hash("password123", salt);
  const ownerPass = await bcrypt.hash("ownerpassword", salt);
  const adminPass = await bcrypt.hash("admin123", salt);

  // 1. Seed Users (Admin, Owners, Customer)
  await query(`
    INSERT INTO users (id, counter_id, name, email, password, phone, role) VALUES
    (1, 'ADM0001', 'System Administrator', 'admin@evcharge.com', '${adminPass}', '+91 98765 43210', 'ADMIN'),
    (2, 'OWNER0001', 'Kumar Station Owner', 'owner@evcharge.com', '${ownerPass}', '+91 98765 43211', 'STATION_OWNER'),
    (3, 'CUS0001', 'Priyan Customer', 'priyan@evcharge.com', '${userPass}', '+91 98765 43212', 'USER'),
    (4, 'OWNER0002', 'Senthil GreenEnergy', 'senthil@greencharge.com', '${ownerPass}', '+91 98765 43213', 'STATION_OWNER')
    ON DUPLICATE KEY UPDATE name=VALUES(name), counter_id=VALUES(counter_id), role=VALUES(role);
  `);

  // 2. Seed Customer Vehicles with accurate battery capacities & max charging powers
  await query(`
    INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, brand, model, battery_capacity, max_charging_power, current_battery_pct, target_battery_pct) VALUES
    (1, 3, 'TN58AB1234', 'Car', 'Tata Motors', 'Nexon EV Max', 40.50, 50.00, 20, 80),
    (2, 3, 'TN01AB5678', 'Car', 'MG Motor', 'ZS EV Exclusive', 50.30, 60.00, 30, 85),
    (3, 3, 'TN69AZ7708', 'Car', 'Hyundai', 'Ioniq 5', 72.60, 150.00, 15, 90),
    (4, 3, 'TN38EV9999', 'Car', 'Tesla', 'Model 3', 60.00, 120.00, 20, 80)
    ON DUPLICATE KEY UPDATE 
      model=VALUES(model), 
      battery_capacity=VALUES(battery_capacity),
      max_charging_power=VALUES(max_charging_power);
  `);

  // 3. 10 Realistic Diverse Charging Stations with distinct power limits, locations, pricing
  const stationsData = [
    {
      id: 1,
      owner_id: 2,
      station_name: "GreenCharge Central",
      address: "183 Arcot Road, Vadapalani, Chennai, Tamil Nadu",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600026",
      latitude: 13.0504,
      longitude: 80.2096,
      contact_number: "+91 1800 209 5161",
      max_power: 100.00,
      max_current: 150.00,
      opening_time: "06:00:00",
      closing_time: "23:59:00",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Shopping Mall", "Coffee Lounge", "Restroom", "CCTV Security"]),
      slots: [
        { slot_number: "C01", connector_id: "STA001-C01", connector_type: "CCS2", power_kw: 25.00, price_per_kwh: 18.00, status: "AVAILABLE" },
        { slot_number: "C02", connector_id: "STA001-C02", connector_type: "CCS2", power_kw: 25.00, price_per_kwh: 18.00, status: "OCCUPIED" },
        { slot_number: "C03", connector_id: "STA001-C03", connector_type: "Type 2", power_kw: 25.00, price_per_kwh: 14.00, status: "AVAILABLE" },
        { slot_number: "C04", connector_id: "STA001-C04", connector_type: "CHAdeMO", power_kw: 25.00, price_per_kwh: 18.00, status: "AVAILABLE" },
      ],
    },
    {
      id: 2,
      owner_id: 2,
      station_name: "VoltPoint EV Hub",
      address: "2 Mount Road, Express Avenue Parking, Royapettah, Chennai, Tamil Nadu",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600014",
      latitude: 13.0592,
      longitude: 80.2638,
      contact_number: "+91 1800 891 9000",
      max_power: 150.00,
      max_current: 220.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Jio Cafe", "Restrooms", "Fast Charging", "24/7 Security"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA002-C01", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 20.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA002-C02", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 20.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA002-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 15.00, status: "AVAILABLE" },
        { slot_number: "BAY-04", connector_id: "STA002-C04", connector_type: "GB/T", power_kw: 15.00, price_per_kwh: 14.00, status: "AVAILABLE" },
      ],
    },
    {
      id: 3,
      owner_id: 4,
      station_name: "EcoCharge Station",
      address: "Plot 45 SIDCO Industrial Estate, Guindy, Chennai, Tamil Nadu",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600032",
      latitude: 13.0067,
      longitude: 80.2020,
      contact_number: "+91 90470 20000",
      max_power: 120.00,
      max_current: 180.00,
      opening_time: "05:00:00",
      closing_time: "23:30:00",
      image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Solar Canopy", "Cafe", "Tire Inflator", "Restroom"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA003-C01", connector_type: "CCS2", power_kw: 50.00, price_per_kwh: 17.50, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA003-C02", connector_type: "CCS2", power_kw: 50.00, price_per_kwh: 17.50, status: "OCCUPIED" },
        { slot_number: "BAY-03", connector_id: "STA003-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 13.50, status: "AVAILABLE" },
      ],
    },
    {
      id: 4,
      owner_id: 4,
      station_name: "FastVolt Charging",
      address: "Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu",
      city: "Coimbatore",
      state: "Tamil Nadu",
      pincode: "641004",
      latitude: 11.0168,
      longitude: 76.9558,
      contact_number: "+91 94431 55667",
      max_power: 180.00,
      max_current: 260.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1558441719-67450885d7bc?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Highway Food Plaza", "Free WiFi", "Restroom", "24/7 Security"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA004-C01", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 18.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA004-C02", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 18.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA004-C03", connector_type: "CCS2", power_kw: 40.00, price_per_kwh: 16.50, status: "AVAILABLE" },
        { slot_number: "BAY-04", connector_id: "STA004-C04", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 12.50, status: "AVAILABLE" },
      ],
    },
    {
      id: 5,
      owner_id: 2,
      station_name: "PowerGrid EV Station",
      address: "Mahadevapura, Whitefield Main Road, Bengaluru, Karnataka",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560048",
      latitude: 12.9959,
      longitude: 77.6964,
      contact_number: "+91 1800 209 5161",
      max_power: 240.00,
      max_current: 360.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Shopping Mall", "Multi-Level Parking", "Food Court", "Restrooms"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA005-C01", connector_type: "CCS2", power_kw: 120.00, price_per_kwh: 22.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA005-C02", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 19.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA005-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 14.00, status: "AVAILABLE" },
        { slot_number: "BAY-04", connector_id: "STA005-C04", connector_type: "CHAdeMO", power_kw: 50.00, price_per_kwh: 18.00, status: "AVAILABLE" },
      ],
    },
    {
      id: 6,
      owner_id: 4,
      station_name: "ChargeX Hub",
      address: "Hitec City, Madhapur, Hyderabad, Telangana",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      latitude: 17.4483,
      longitude: 78.3915,
      contact_number: "+91 98850 12345",
      max_power: 120.00,
      max_current: 180.00,
      opening_time: "06:00:00",
      closing_time: "23:00:00",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["IT Park Lounge", "High Speed WiFi", "Restroom", "Coffee Shop"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA006-C01", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 19.50, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA006-C02", connector_type: "CCS2", power_kw: 40.00, price_per_kwh: 18.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA006-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 13.50, status: "AVAILABLE" },
      ],
    },
    {
      id: 7,
      owner_id: 2,
      station_name: "CityCharge Point",
      address: "G Block, Bandra Kurla Complex (BKC), Mumbai, Maharashtra",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400051",
      latitude: 19.0657,
      longitude: 72.8686,
      contact_number: "+91 1800 891 9000",
      max_power: 160.00,
      max_current: 240.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Cafe", "VIP Waiting Lounge", "Solar Roof", "Valet Parking"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA007-C01", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 21.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA007-C02", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 21.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA007-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 15.00, status: "AVAILABLE" },
        { slot_number: "BAY-04", connector_id: "STA007-C04", connector_type: "GB/T", power_kw: 18.00, price_per_kwh: 14.50, status: "AVAILABLE" },
      ],
    },
    {
      id: 8,
      owner_id: 4,
      station_name: "Highway EV Charge",
      address: "NH 44 National Highway Toll Plaza, Salem, Tamil Nadu",
      city: "Salem",
      state: "Tamil Nadu",
      pincode: "636001",
      latitude: 11.6643,
      longitude: 78.1460,
      contact_number: "+91 94440 98765",
      max_power: 200.00,
      max_current: 300.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1558441719-67450885d7bc?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Highway Motel", "Diner", "Restrooms", "Battery Health Check"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA008-C01", connector_type: "CCS2", power_kw: 100.00, price_per_kwh: 19.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA008-C02", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 18.00, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA008-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 13.00, status: "AVAILABLE" },
        { slot_number: "BAY-04", connector_id: "STA008-C04", connector_type: "Type 2", power_kw: 18.00, price_per_kwh: 12.00, status: "AVAILABLE" },
      ],
    },
    {
      id: 9,
      owner_id: 2,
      station_name: "SmartVolt Station",
      address: "Thillai Nagar Main Road, Tiruchirappalli (Trichy), Tamil Nadu",
      city: "Tiruchirappalli",
      state: "Tamil Nadu",
      pincode: "620018",
      latitude: 10.8269,
      longitude: 78.6856,
      contact_number: "+91 98420 54321",
      max_power: 90.00,
      max_current: 140.00,
      opening_time: "06:00:00",
      closing_time: "23:00:00",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Restrooms", "CCTV Surveillance", "Payment Kiosk"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA009-C01", connector_type: "CCS2", power_kw: 45.00, price_per_kwh: 17.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA009-C02", connector_type: "CCS2", power_kw: 30.00, price_per_kwh: 16.50, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA009-C03", connector_type: "Type 2", power_kw: 15.00, price_per_kwh: 12.50, status: "AVAILABLE" },
      ],
    },
    {
      id: 10,
      owner_id: 4,
      station_name: "ElectroDrive Hub",
      address: "Senapati Bapat Road, Shivaji Nagar, Pune, Maharashtra",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411016",
      latitude: 18.5314,
      longitude: 73.8293,
      contact_number: "+91 98220 11223",
      max_power: 140.00,
      max_current: 210.00,
      opening_time: "00:00:00",
      closing_time: "23:59:59",
      image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
      amenities: JSON.stringify(["Coffee Shop", "WiFi", "Restroom", "24/7 Security"]),
      slots: [
        { slot_number: "BAY-01", connector_id: "STA010-C01", connector_type: "CCS2", power_kw: 60.00, price_per_kwh: 19.00, status: "AVAILABLE" },
        { slot_number: "BAY-02", connector_id: "STA010-C02", connector_type: "CCS2", power_kw: 50.00, price_per_kwh: 18.50, status: "AVAILABLE" },
        { slot_number: "BAY-03", connector_id: "STA010-C03", connector_type: "Type 2", power_kw: 22.00, price_per_kwh: 14.00, status: "AVAILABLE" },
      ],
    },
  ];

  let slotIdCounter = 1;
  for (const st of stationsData) {
    const totalSlots = st.slots.length;
    const availSlots = st.slots.filter(s => s.status === "AVAILABLE").length;

    await query(`
      INSERT INTO charging_stations 
      (id, owner_id, station_name, address, city, state, pincode, latitude, longitude, contact_number, max_power, max_current, opening_time, closing_time, total_slots, available_slots, status, amenities, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      ON DUPLICATE KEY UPDATE 
        station_name=VALUES(station_name),
        address=VALUES(address),
        city=VALUES(city),
        state=VALUES(state),
        pincode=VALUES(pincode),
        latitude=VALUES(latitude),
        longitude=VALUES(longitude),
        contact_number=VALUES(contact_number),
        max_power=VALUES(max_power),
        max_current=VALUES(max_current),
        opening_time=VALUES(opening_time),
        closing_time=VALUES(closing_time),
        total_slots=VALUES(total_slots),
        available_slots=VALUES(available_slots),
        amenities=VALUES(amenities),
        image=VALUES(image);
    `, [
      st.id,
      st.owner_id,
      st.station_name,
      st.address,
      st.city,
      st.state,
      st.pincode,
      st.latitude,
      st.longitude,
      st.contact_number,
      st.max_power,
      st.max_current,
      st.opening_time,
      st.closing_time,
      totalSlots,
      availSlots,
      st.amenities,
      st.image
    ]);

    for (const slot of st.slots) {
      const chargerType = slot.connector_type.includes("CCS") || slot.connector_type.includes("CHAdeMO") || slot.power_kw >= 30 ? "DC_FAST" : "AC";
      await query(`
        INSERT INTO charging_slots 
        (id, station_id, slot_number, connector_id, connector_type, charger_type, power_kw, max_power, price_per_kwh, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          slot_number=VALUES(slot_number),
          connector_id=VALUES(connector_id),
          connector_type=VALUES(connector_type),
          charger_type=VALUES(charger_type),
          power_kw=VALUES(power_kw),
          max_power=VALUES(max_power),
          price_per_kwh=VALUES(price_per_kwh),
          status=VALUES(status);
      `, [
        slotIdCounter,
        st.id,
        slot.slot_number,
        slot.connector_id,
        slot.connector_type,
        chargerType,
        slot.power_kw,
        slot.power_kw,
        slot.price_per_kwh,
        slot.status
      ]);
      slotIdCounter++;
    }

    // Insert Pricing Rules
    await query(`
      INSERT INTO pricing_rules (station_id, peak_start, peak_end, peak_multiplier, offpeak_discount, utilization_threshold, max_multiplier)
      VALUES (?, '18:00:00', '21:00:00', 1.25, 0.15, 0.75, 1.50)
      ON DUPLICATE KEY UPDATE 
        peak_multiplier=VALUES(peak_multiplier),
        offpeak_discount=VALUES(offpeak_discount);
    `, [st.id]);
  }

  // 4. Seed Initial Verified Bookings for User 3
  await query(`
    INSERT INTO bookings 
    (id, booking_id, user_id, vehicle_id, station_id, slot_id, connector_id, vehicle_type, charging_type, charging_power, energy_required, estimated_duration, duration, booking_date, start_time, end_time, battery_start_pct, battery_target_pct, payment_method, amount, status)
    VALUES 
    (1, 'EV00125', 3, 4, 1, 2, 'STA001-C02', 'Car', 'DC Fast Charging', 25.00, 36.00, 96.00, 96.00, CURDATE(), '10:00:00', '11:36:00', 20, 80, 'Razorpay Test Mode', 540.00, 'CONFIRMED'),
    (2, 'EV00126', 3, 1, 3, 7, 'STA003-C02', 'Car', 'DC Fast Charging', 50.00, 24.30, 32.00, 32.00, CURDATE(), '14:00:00', '14:32:00', 25, 85, 'Razorpay Test Mode', 485.00, 'IN_PROGRESS')
    ON DUPLICATE KEY UPDATE status=VALUES(status);
  `);

  console.log("✅ Platform Stations, Connectors, Vehicles & Bookings successfully seeded!");
}

if (process.argv[1]?.endsWith("seed_mysql.js")) {
  (async () => {
    await initializeDatabaseSchema();
    await seedComprehensiveData();
    process.exit(0);
  })();
}
