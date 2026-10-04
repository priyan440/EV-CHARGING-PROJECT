-- ============================================================
-- DATABASE MIGRATION SCRIPT
-- Safely aligns existing tables with complete relational MySQL architecture
-- ============================================================

USE ev_charging_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ensure columns in users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) UNIQUE NULL AFTER id,
  ADD COLUMN IF NOT EXISTS counter_id VARCHAR(50) UNIQUE NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER password,
  ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE' AFTER role,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Populate user_id / counter_id for existing users if NULL
UPDATE users SET user_id = CONCAT(
  CASE 
    WHEN role = 'ADMIN' THEN 'ADMIN'
    WHEN role IN ('STATION_OWNER', 'OWNER') THEN 'OWNER'
    WHEN role IN ('TECHNICIAN', 'TECH') THEN 'TECH'
    ELSE 'CUS'
  END,
  LPAD(id, 4, '0')
) WHERE user_id IS NULL OR user_id = '';

UPDATE users SET counter_id = user_id WHERE counter_id IS NULL OR counter_id = '';
UPDATE users SET password_hash = password WHERE password_hash IS NULL;

-- 2. Ensure customers table exists and populate from users with role USER/CUSTOMER
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(150) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_cust_id (customer_id),
    INDEX idx_customers_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO customers (customer_id, user_id, name, email, phone)
SELECT user_id, id, name, email, phone FROM users WHERE role IN ('USER', 'CUSTOMER');

-- 3. Ensure owners table exists and populate from users with role STATION_OWNER/OWNER
CREATE TABLE IF NOT EXISTS owners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    business_name VARCHAR(150) NULL,
    contact_number VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    gst_number VARCHAR(50) NULL,
    status ENUM('ACTIVE', 'PENDING', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owners_owner_id (owner_id),
    INDEX idx_owners_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO owners (owner_id, user_id, business_name, contact_number, email)
SELECT user_id, id, COALESCE(company_name, name), phone, email FROM users WHERE role IN ('STATION_OWNER', 'OWNER');

-- 4. Ensure technicians table exists and populate from users with role TECHNICIAN
CREATE TABLE IF NOT EXISTS technicians (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id VARCHAR(50) UNIQUE NOT NULL,
    counter_id VARCHAR(50) NULL,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    specialization VARCHAR(150) DEFAULT 'DC Fast Charger Repair',
    availability ENUM('AVAILABLE', 'BUSY', 'OFF_DUTY') DEFAULT 'AVAILABLE',
    status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') DEFAULT 'ACTIVE',
    is_online BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 4.90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_technicians_tech_id (technician_id),
    INDEX idx_technicians_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO technicians (technician_id, counter_id, user_id, name, email, phone, specialization)
SELECT user_id, user_id, id, name, email, phone, COALESCE(specialization, 'DC Fast Charger Repair') FROM users WHERE role IN ('TECHNICIAN', 'TECH');

-- 5. Ensure stations table exists and sync from charging_stations if needed
CREATE TABLE IF NOT EXISTS stations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id VARCHAR(50) UNIQUE NOT NULL,
    owner_id VARCHAR(50) NOT NULL,
    owner_user_id INT NULL,
    station_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Chennai',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    pincode VARCHAR(20) DEFAULT '600001',
    latitude DECIMAL(10, 7) NOT NULL DEFAULT 13.0827,
    longitude DECIMAL(10, 7) NOT NULL DEFAULT 80.2707,
    opening_time TIME DEFAULT '00:00:00',
    closing_time TIME DEFAULT '23:59:59',
    contact_number VARCHAR(30) NULL,
    total_slots INT DEFAULT 4,
    available_slots INT DEFAULT 4,
    power_kw DECIMAL(10, 2) DEFAULT 150.00,
    max_power DECIMAL(10, 2) DEFAULT 150.00,
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'APPROVED', 'Operational', 'Available') DEFAULT 'ACTIVE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stations_station_id (station_id),
    INDEX idx_stations_owner_id (owner_id),
    INDEX idx_stations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Ensure chargers table exists
CREATE TABLE IF NOT EXISTS chargers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    charger_id VARCHAR(50) UNIQUE NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    owner_id VARCHAR(50) NOT NULL,
    charger_name VARCHAR(100) NOT NULL,
    charger_type ENUM('AC', 'DC_FAST', 'CCS2', 'TYPE2', 'CHADEMO', 'GB_T') DEFAULT 'DC_FAST',
    power_rating DECIMAL(10, 2) DEFAULT 60.00,
    price_per_kwh DECIMAL(10, 2) DEFAULT 18.00,
    status ENUM('AVAILABLE', 'RESERVED', 'PROTECTED', 'CHARGING', 'OCCUPIED', 'MAINTENANCE', 'OFFLINE', 'FAULTED', 'Available', 'Occupied', 'Charging', 'Maintenance') DEFAULT 'AVAILABLE',
    online_status ENUM('ONLINE', 'OFFLINE') DEFAULT 'ONLINE',
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chargers_charger_id (charger_id),
    INDEX idx_chargers_station_id (station_id),
    INDEX idx_chargers_owner_id (owner_id),
    INDEX idx_chargers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Ensure connectors table exists
CREATE TABLE IF NOT EXISTS connectors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    connector_id VARCHAR(50) UNIQUE NOT NULL,
    charger_id VARCHAR(50) NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    connector_number INT DEFAULT 1,
    connector_type VARCHAR(50) DEFAULT 'CCS2',
    status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CHARGING', 'FAULTED', 'MAINTENANCE', 'Available') DEFAULT 'AVAILABLE',
    power DECIMAL(10, 2) DEFAULT 60.00,
    voltage DECIMAL(10, 2) DEFAULT 400.00,
    current DECIMAL(10, 2) DEFAULT 150.00,
    energy_delivered DECIMAL(10, 2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_connectors_conn_id (connector_id),
    INDEX idx_connectors_charger_id (charger_id),
    INDEX idx_connectors_station_id (station_id),
    INDEX idx_connectors_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Ensure bookings table columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NULL AFTER booking_id,
  ADD COLUMN IF NOT EXISTS charger_id VARCHAR(50) NULL AFTER slot_id,
  ADD COLUMN IF NOT EXISTS connector_id VARCHAR(50) NULL AFTER charger_id,
  ADD COLUMN IF NOT EXISTS owner_id VARCHAR(50) NULL AFTER connector_id,
  ADD COLUMN IF NOT EXISTS estimated_duration DECIMAL(5,2) DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS payment_status ENUM('PENDING', 'SUCCESS', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PAID',
  ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update bookings customer_id and owner_id from related tables if NULL
UPDATE bookings b 
JOIN users u ON b.user_id = u.id
SET b.customer_id = COALESCE(u.user_id, u.counter_id, CONCAT('CUS', LPAD(u.id, 4, '0')))
WHERE b.customer_id IS NULL;

-- 9. Ensure payments table columns
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(50) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NULL AFTER booking_counter_id,
  ADD COLUMN IF NOT EXISTS owner_id VARCHAR(50) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS station_id INT NULL AFTER owner_id,
  ADD COLUMN IF NOT EXISTS status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'SUCCESS',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 10. Ensure maintenance_tickets table
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    station_id VARCHAR(50) NOT NULL,
    charger_id VARCHAR(50) NULL,
    connector_id VARCHAR(50) NULL,
    owner_id VARCHAR(50) NOT NULL,
    technician_id VARCHAR(50) NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'WORK_COMPLETED', 'RESOLVED', 'CLOSED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_maint_ticket_id (ticket_id),
    INDEX idx_maint_station (station_id),
    INDEX idx_maint_charger (charger_id),
    INDEX idx_maint_owner (owner_id),
    INDEX idx_maint_tech (technician_id),
    INDEX idx_maint_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Ensure notifications, audit_logs, reviews, tariffs
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id VARCHAR(50) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id VARCHAR(50) NULL,
    station_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    rating INT NOT NULL DEFAULT 5,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reviews_station (station_id),
    INDEX idx_reviews_cust (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tariffs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tariff_id VARCHAR(50) UNIQUE NULL,
    station_id VARCHAR(50) NOT NULL,
    charger_id VARCHAR(50) NULL,
    tariff_name VARCHAR(100) DEFAULT 'Standard EV Tariff',
    rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 18.00,
    base_fee DECIMAL(10, 2) DEFAULT 0.00,
    tax_percentage DECIMAL(5, 2) DEFAULT 18.00,
    peak_rate DECIMAL(10, 2) DEFAULT 22.00,
    off_peak_rate DECIMAL(10, 2) DEFAULT 14.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tariffs_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
