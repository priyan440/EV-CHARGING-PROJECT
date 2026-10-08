-- ============================================================
-- EV CHARGING STATION MANAGEMENT SYSTEM
-- COMPLETE MYSQL NORMALIZED RELATIONAL SCHEMA
-- Database: ev_charging_system
-- ============================================================

CREATE DATABASE IF NOT EXISTS ev_charging_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ev_charging_system;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. USERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    role ENUM('ADMIN', 'STATION_OWNER', 'USER', 'TECHNICIAN', 'CUSTOMER', 'OWNER', 'TECH') NOT NULL DEFAULT 'USER',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
    company_name VARCHAR(150) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(20) NULL,
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 2500.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_user_id (user_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 1B. STATION OWNERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS station_owners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    owner_code VARCHAR(50) UNIQUE NULL,
    business_name VARCHAR(150) NULL,
    business_email VARCHAR(150) NULL,
    business_phone VARCHAR(30) NULL,
    address TEXT NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owners_user_id (user_id),
    CONSTRAINT fk_owners_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. VEHICLES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT '4W',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    battery_capacity DECIMAL(6, 2) DEFAULT 40.00,
    connector_type VARCHAR(50) DEFAULT 'CCS2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vehicles_user_id (user_id),
    INDEX idx_vehicles_reg (registration_number),
    CONSTRAINT fk_vehicles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2B. BATTERY DETAILS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS battery_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    battery_capacity DECIMAL(6, 2) NULL,
    battery_type VARCHAR(50) NULL,
    current_percentage DECIMAL(5, 2) NULL,
    health_percentage DECIMAL(5, 2) NULL,
    temperature DECIMAL(5, 2) NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_battery_vehicle_id (vehicle_id),
    CONSTRAINT fk_battery_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. STATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id VARCHAR(50) UNIQUE NOT NULL,
    owner_id INT NOT NULL,
    station_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Chennai',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    pincode VARCHAR(20) DEFAULT '600001',
    latitude DECIMAL(10, 7) NOT NULL DEFAULT 13.0827,
    longitude DECIMAL(10, 7) NOT NULL DEFAULT 80.2707,
    opening_time VARCHAR(25) DEFAULT '06:00 AM',
    closing_time VARCHAR(25) DEFAULT '11:00 PM',
    contact_number VARCHAR(30) NULL,
    total_slots INT DEFAULT 4,
    available_slots INT DEFAULT 4,
    max_power DECIMAL(10, 2) DEFAULT 150.00,
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'PENDING', 'APPROVED') DEFAULT 'ACTIVE',
    approval_status ENUM('APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED') DEFAULT 'APPROVED',
    amenities TEXT NULL,
    image VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stations_station_id (station_id),
    INDEX idx_stations_owner_id (owner_id),
    INDEX idx_stations_status (status),
    CONSTRAINT fk_stations_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. CHARGERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chargers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    charger_id VARCHAR(50) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    charger_name VARCHAR(100) NOT NULL,
    charger_type ENUM('AC', 'DC_FAST', 'CCS2', 'TYPE2', 'CHADEMO', 'GB_T') DEFAULT 'DC_FAST',
    power_kw DECIMAL(10, 2) DEFAULT 60.00,
    status ENUM('AVAILABLE', 'RESERVED', 'CHARGING', 'OCCUPIED', 'FAULTED', 'MAINTENANCE', 'OFFLINE') DEFAULT 'AVAILABLE',
    connector_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chargers_charger_id (charger_id),
    INDEX idx_chargers_station_id (station_id),
    INDEX idx_chargers_status (status),
    CONSTRAINT fk_chargers_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. CHARGER CONNECTORS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charger_connectors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    connector_id VARCHAR(50) UNIQUE NOT NULL,
    charger_id INT NOT NULL,
    connector_type VARCHAR(50) DEFAULT 'CCS2',
    power_kw DECIMAL(10, 2) DEFAULT 60.00,
    status ENUM('AVAILABLE', 'RESERVED', 'OCCUPIED', 'FAULTED', 'MAINTENANCE', 'OFFLINE') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_connectors_conn_id (connector_id),
    INDEX idx_connectors_charger_id (charger_id),
    CONSTRAINT fk_connectors_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. TARIFFS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tariffs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tariff_id VARCHAR(50) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    base_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 18.00,
    peak_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 22.00,
    off_peak_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 14.00,
    connection_fee DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    idle_fee_per_minute DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
    peak_start VARCHAR(10) DEFAULT '18:00',
    peak_end VARCHAR(10) DEFAULT '22:00',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tariffs_tariff_id (tariff_id),
    INDEX idx_tariffs_station_id (station_id),
    CONSTRAINT fk_tariffs_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. BOOKINGS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    vehicle_id INT NULL,
    station_id INT NOT NULL,
    charger_id INT NOT NULL,
    connector_id INT NULL,
    tariff_id INT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    tariff_rate_snapshot DECIMAL(10, 2) NOT NULL DEFAULT 18.00,
    connection_fee_snapshot DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    estimated_amount DECIMAL(10, 2) NOT NULL DEFAULT 400.00,
    payment_id VARCHAR(50) NULL,
    booking_status ENUM('PENDING', 'CONFIRMED', 'PROTECTED', 'CHECKED_IN', 'ACTIVE', 'CHARGING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED') DEFAULT 'CONFIRMED',
    payment_status ENUM('PENDING', 'SUCCESS', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bookings_booking_id (booking_id),
    INDEX idx_bookings_user_id (user_id),
    INDEX idx_bookings_station_id (station_id),
    INDEX idx_bookings_charger_id (charger_id),
    INDEX idx_bookings_date_slot (station_id, charger_id, booking_date, start_time, end_time),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_connector FOREIGN KEY (connector_id) REFERENCES charger_connectors(id) ON DELETE SET NULL,
    CONSTRAINT fk_bookings_tariff FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. PAYMENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    booking_id INT NULL,
    user_id INT NOT NULL,
    gateway VARCHAR(50) DEFAULT 'RAZORPAY',
    gateway_order_id VARCHAR(100) NULL,
    gateway_payment_id VARCHAR(100) NULL,
    gateway_signature VARCHAR(255) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50) DEFAULT 'CARD',
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED') DEFAULT 'SUCCESS',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payments_payment_id (payment_id),
    INDEX idx_payments_booking_id (booking_id),
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (payment_status),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8B. WALLET TRANSACTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    type ENUM('CREDIT', 'DEBIT') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255) NULL,
    booking_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wallet_tx_user (user_id),
    INDEX idx_wallet_tx_booking (booking_id),
    CONSTRAINT fk_wallet_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. CHARGING SESSIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS charging_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    booking_id INT NULL,
    user_id INT NOT NULL,
    vehicle_id INT NULL,
    station_id INT NOT NULL,
    charger_id INT NOT NULL,
    connector_id INT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    initial_meter DECIMAL(10, 2) DEFAULT 0.00,
    final_meter DECIMAL(10, 2) DEFAULT 0.00,
    energy_kwh DECIMAL(10, 2) DEFAULT 0.00,
    power_kw DECIMAL(10, 2) DEFAULT 50.00,
    voltage DECIMAL(10, 2) DEFAULT 400.00,
    current_amp DECIMAL(10, 2) DEFAULT 80.00,
    battery_soc INT DEFAULT 20,
    duration_minutes INT DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    session_status ENUM('PENDING', 'STARTED', 'CHARGING', 'COMPLETED', 'CANCELLED', 'INTERRUPTED') DEFAULT 'CHARGING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sessions_session_id (session_id),
    INDEX idx_sessions_booking_id (booking_id),
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_station_id (station_id),
    INDEX idx_sessions_charger_id (charger_id),
    INDEX idx_sessions_status (session_status),
    CONSTRAINT fk_sessions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
    CONSTRAINT fk_sessions_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_connector FOREIGN KEY (connector_id) REFERENCES charger_connectors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. MAINTENANCE TICKETS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    charger_id INT NULL,
    station_id INT NOT NULL,
    technician_id INT NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_maint_ticket_id (ticket_id),
    INDEX idx_maint_station_id (station_id),
    INDEX idx_maint_charger_id (charger_id),
    INDEX idx_maint_technician_id (technician_id),
    INDEX idx_maint_status (status),
    CONSTRAINT fk_maint_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE SET NULL,
    CONSTRAINT fk_maint_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_maint_technician FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. NOTIFICATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id VARCHAR(50) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user_id (user_id),
    INDEX idx_notif_is_read (is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. AUDIT LOGS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 13. COMPLAINTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    booking_id INT NULL,
    station_id INT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    assigned_to INT NULL,
    resolution TEXT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_complaints_code (complaint_code),
    INDEX idx_complaints_user (user_id),
    INDEX idx_complaints_station (station_id),
    INDEX idx_complaints_booking (booking_id),
    INDEX idx_complaints_status (status),
    CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaints_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT fk_complaints_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    CONSTRAINT fk_complaints_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 14. EMERGENCY REQUESTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    vehicle_model VARCHAR(150) NULL,
    vehicle_number VARCHAR(50) NULL,
    contact_number VARCHAR(30) NULL,
    emergency_type ENUM('BATTERY_DEPLETED', 'VEHICLE_BREAKDOWN', 'CHARGING_FAILURE', 'ACCIDENT', 'OTHER') DEFAULT 'BATTERY_DEPLETED',
    current_soc INT DEFAULT 8,
    latitude DECIMAL(10, 7) NOT NULL DEFAULT 13.0827,
    longitude DECIMAL(10, 7) NOT NULL DEFAULT 80.2707,
    location_address TEXT NULL,
    status ENUM('PENDING', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED') DEFAULT 'PENDING',
    assigned_unit VARCHAR(100) DEFAULT 'Rescue Unit 01',
    eta_minutes INT DEFAULT 20,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_emergency_req_id (request_id),
    INDEX idx_emergency_user_id (user_id),
    INDEX idx_emergency_status (status),
    CONSTRAINT fk_emergency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


