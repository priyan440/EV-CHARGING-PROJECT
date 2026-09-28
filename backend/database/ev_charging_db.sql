-- =======================================================
-- EV CHARGING STATION MANAGEMENT SYSTEM DATABASE (MySQL)
-- Database Name: ev_charging_db
-- =======================================================

CREATE DATABASE IF NOT EXISTS ev_charging_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ev_charging_db;

-- -------------------------------------------------------
-- 1. USERS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    counter_id VARCHAR(30) UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('USER', 'ADMIN', 'STATION_OWNER') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_counter (counter_id),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 2. VEHICLES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    battery_capacity DECIMAL(10,2) DEFAULT 40.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vehicles_user (user_id),
    INDEX idx_vehicles_number (vehicle_number),
    CONSTRAINT fk_vehicles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 3. CHARGING STATIONS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS charging_stations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    owner_id INT NOT NULL,
    station_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    contact_number VARCHAR(20),
    total_slots INT DEFAULT 0,
    available_slots INT DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stations_owner (owner_id),
    INDEX idx_stations_status (status),
    CONSTRAINT fk_stations_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 4. CHARGING SLOTS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS charging_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT NOT NULL,
    slot_number VARCHAR(30) NOT NULL,
    charger_type ENUM('AC', 'DC_FAST') NOT NULL,
    power_kw DECIMAL(10,2) NOT NULL DEFAULT 60.00,
    price_per_kwh DECIMAL(10,2) NOT NULL DEFAULT 18.00,
    status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    INDEX idx_slots_station (station_id),
    INDEX idx_slots_status (status),
    CONSTRAINT fk_slots_station FOREIGN KEY (station_id) 
        REFERENCES charging_stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 5. BOOKINGS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    station_id INT NOT NULL,
    slot_id INT NULL,
    vehicle_type VARCHAR(30),
    charging_type VARCHAR(30),
    duration DECIMAL(5,2),
    booking_date DATE NOT NULL,
    start_time TIME,
    payment_method VARCHAR(30) DEFAULT 'Razorpay Test Mode',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bookings_bid (booking_id),
    INDEX idx_bookings_user (user_id),
    INDEX idx_bookings_station (station_id),
    INDEX idx_bookings_date (booking_date),
    INDEX idx_bookings_status (status),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_vehicle FOREIGN KEY (vehicle_id) 
        REFERENCES vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_station FOREIGN KEY (station_id) 
        REFERENCES charging_stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_slot FOREIGN KEY (slot_id) 
        REFERENCES charging_slots(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 6. PAYMENTS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'Razorpay Test Mode',
    transaction_id VARCHAR(150),
    razorpay_order_id VARCHAR(150),
    razorpay_payment_id VARCHAR(150),
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payments_booking (booking_id),
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_status (payment_status),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 7. LOGIN ACTIVITY TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_activity_user (user_id),
    INDEX idx_login_activity_created (created_at),
    CONSTRAINT fk_login_activity_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 8. PRICING RULES TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT NOT NULL UNIQUE,
    peak_start TIME NOT NULL DEFAULT '18:00:00',
    peak_end TIME NOT NULL DEFAULT '21:00:00',
    peak_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    offpeak_discount DECIMAL(4,2) NOT NULL DEFAULT 0.15,
    utilization_threshold DECIMAL(4,2) NOT NULL DEFAULT 0.75,
    max_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pricing_station (station_id),
    CONSTRAINT fk_pricing_station FOREIGN KEY (station_id) 
        REFERENCES charging_stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- INITIAL SEED DATA
-- =======================================================

-- Test Users (Credentials: CUS0001 / password123, OWNER0001 / ownerpassword, ADM0001 / admin123)
INSERT INTO users (id, counter_id, name, email, password, phone, role) VALUES
(1, 'ADM0001', 'System Administrator', 'admin@evcharge.com', '$2a$10$vWIUvMHRIaR3.Fwnh5T8KOty9GJyYmkLxki0fuPaAiS0.FTd.IMkm', '9876543210', 'ADMIN'),
(2, 'OWNER0001', 'Kumar Station Owner', 'owner@evcharge.com', '$2a$10$vWIUvMHRIaR3.Fwnh5T8KOY0qjvw/0qOrcWa7ivuIwGVGxjOVJm5i', '9876543211', 'STATION_OWNER'),
(3, 'CUS0001', 'Priyan Customer', 'priyan@evcharge.com', '$2a$10$vWIUvMHRIaR3.Fwnh5T8KO0mZnKqUMio.sgdJ6P63gf7l9S9wKSo2', '9876543212', 'USER')
ON DUPLICATE KEY UPDATE name=VALUES(name), counter_id=VALUES(counter_id), password=VALUES(password), email=VALUES(email);

-- Seed Vehicles for User 3
INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type, brand, model, battery_capacity) VALUES
(1, 3, 'TN58AB1234', 'Car', 'Tata Motors', 'Nexon EV Max', 40.50),
(2, 3, 'TN01AB5678', 'Car', 'MG Motor', 'ZS EV Exclusive', 50.30),
(3, 3, 'TN69AZ7708', 'Car', 'Tata Motors', 'Tigor EV', 26.00)
ON DUPLICATE KEY UPDATE model=VALUES(model);

-- Seed Charging Stations for Owner 2
INSERT INTO charging_stations (id, owner_id, station_name, address, latitude, longitude, contact_number, total_slots, available_slots, status) VALUES
(1, 2, 'EV Power Hub Chennai Central', 'No. 12, EV Corridor, Anna Salai, Chennai, Tamil Nadu', 13.0827000, 80.2707000, '+91 98401 23456', 4, 3, 'ACTIVE'),
(2, 2, 'GreenCharge Highway Station OMR', 'OMR IT Expressway, Sholinganallur, Chennai, Tamil Nadu', 12.9010000, 80.2279000, '+91 98401 98765', 4, 4, 'ACTIVE'),
(3, 2, 'VoltPoint Express Bangalore Central', 'MG Road, Ashok Nagar, Bengaluru, Karnataka', 12.9716000, 77.5946000, '+91 98801 11223', 3, 2, 'ACTIVE'),
(4, 2, 'EcoDrive Fast Charge Hub Coimbatore', 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu', 11.0168000, 76.9558000, '+91 94431 55667', 4, 4, 'ACTIVE')
ON DUPLICATE KEY UPDATE station_name=VALUES(station_name);

-- Seed Charging Slots
INSERT INTO charging_slots (id, station_id, slot_number, charger_type, power_kw, price_per_kwh, status) VALUES
(1, 1, 'BAY-01', 'DC_FAST', 60.00, 18.00, 'AVAILABLE'),
(2, 1, 'BAY-02', 'DC_FAST', 120.00, 22.00, 'RESERVED'),
(3, 1, 'BAY-03', 'AC', 22.00, 14.00, 'AVAILABLE'),
(4, 1, 'BAY-04', 'AC', 11.00, 12.00, 'AVAILABLE'),

(5, 2, 'BAY-01', 'DC_FAST', 150.00, 24.00, 'AVAILABLE'),
(6, 2, 'BAY-02', 'DC_FAST', 60.00, 18.00, 'AVAILABLE'),
(7, 2, 'BAY-03', 'AC', 22.00, 14.00, 'AVAILABLE'),
(8, 2, 'BAY-04', 'AC', 11.00, 12.00, 'AVAILABLE'),

(9, 3, 'BAY-01', 'DC_FAST', 60.00, 19.00, 'OCCUPIED'),
(10, 3, 'BAY-02', 'DC_FAST', 100.00, 21.00, 'AVAILABLE'),
(11, 3, 'BAY-03', 'AC', 22.00, 15.00, 'AVAILABLE'),

(12, 4, 'BAY-01', 'DC_FAST', 60.00, 17.50, 'AVAILABLE'),
(13, 4, 'BAY-02', 'DC_FAST', 60.00, 17.50, 'AVAILABLE'),
(14, 4, 'BAY-03', 'AC', 22.00, 13.50, 'AVAILABLE'),
(15, 4, 'BAY-04', 'AC', 11.00, 11.00, 'AVAILABLE')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Seed Bookings
INSERT INTO bookings (id, booking_id, user_id, vehicle_id, station_id, slot_id, vehicle_type, charging_type, duration, booking_date, start_time, payment_method, amount, status) VALUES
(1, 'EV001', 3, 1, 1, 2, 'Car', 'DC Fast Charging', 45.00, '2026-09-17', '14:00:00', 'Razorpay Test Mode', 416.00, 'CONFIRMED'),
(2, 'EV002', 3, 2, 3, 9, 'Car', 'DC Fast Charging', 60.00, '2026-09-16', '10:30:00', 'Razorpay Test Mode', 520.00, 'COMPLETED')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Seed Payments
INSERT INTO payments (id, booking_id, user_id, amount, payment_method, transaction_id, razorpay_order_id, razorpay_payment_id, payment_status) VALUES
(1, 1, 3, 416.00, 'Razorpay Test Mode', 'pay_test_0001', 'order_test_0001', 'pay_test_0001', 'SUCCESS'),
(2, 2, 3, 520.00, 'Razorpay Test Mode', 'pay_test_0002', 'order_test_0002', 'pay_test_0002', 'SUCCESS')
ON DUPLICATE KEY UPDATE payment_status=VALUES(payment_status);
