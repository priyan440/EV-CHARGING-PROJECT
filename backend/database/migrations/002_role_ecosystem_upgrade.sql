-- =======================================================
-- Migration 002: Customer + Technician + Owner Role Ecosystem
-- =======================================================

USE ev_charging_db;

-- 1. Upgrade users table to support TECHNICIAN role and profile fields
ALTER TABLE users 
  MODIFY COLUMN role ENUM('USER', 'CUSTOMER', 'ADMIN', 'STATION_OWNER', 'TECHNICIAN') DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS experience VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS assigned_region VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS certifications VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS profile_image TEXT NULL;

-- 2. Upgrade vehicles table with connector, battery percentage, color, is_primary
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS connector_type VARCHAR(30) DEFAULT 'CCS2',
  ADD COLUMN IF NOT EXISTS battery_percentage INT DEFAULT 42,
  ADD COLUMN IF NOT EXISTS vehicle_color VARCHAR(30) DEFAULT 'Midnight Black',
  ADD COLUMN IF NOT EXISTS is_primary TINYINT(1) DEFAULT 0;

-- 3. Maintenance Jobs Table
CREATE TABLE IF NOT EXISTS maintenance_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(30) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    charger_id VARCHAR(50) NULL,
    technician_id INT NULL,
    issue TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('Assigned', 'Accepted', 'On the Way', 'In Progress', 'Waiting for Parts', 'Resolved', 'Verified', 'Closed') DEFAULT 'Assigned',
    reported_by VARCHAR(100) DEFAULT 'Customer Report',
    checklist JSON NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_jobs_tech (technician_id),
    INDEX idx_jobs_station (station_id),
    INDEX idx_jobs_status (status),
    CONSTRAINT fk_jobs_station FOREIGN KEY (station_id) REFERENCES charging_stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_jobs_tech FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Maintenance Reports Table
CREATE TABLE IF NOT EXISTS maintenance_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_id VARCHAR(30) UNIQUE NOT NULL,
    job_id INT NOT NULL,
    technician_id INT NOT NULL,
    problem_found TEXT NOT NULL,
    root_cause TEXT NULL,
    action_taken TEXT NOT NULL,
    parts_used VARCHAR(255) NULL,
    testing_result VARCHAR(100) DEFAULT 'PASS',
    final_status VARCHAR(50) DEFAULT 'OPERATIONAL',
    notes TEXT NULL,
    images TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rep_job (job_id),
    INDEX idx_rep_tech (technician_id),
    CONSTRAINT fk_rep_job FOREIGN KEY (job_id) REFERENCES maintenance_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_rep_tech FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Support Tickets Table (Customer Help & Support / Report Station Problem)
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    station_id INT NULL,
    booking_id VARCHAR(50) NULL,
    technician_id INT NULL,
    category ENUM('Charging Problem', 'Payment Problem', 'Booking Problem', 'Station Problem', 'Vehicle Problem', 'Other') DEFAULT 'Charging Problem',
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('Open', 'Assigned', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ticket_cust (customer_id),
    INDEX idx_ticket_tech (technician_id),
    INDEX idx_ticket_status (status),
    CONSTRAINT fk_ticket_cust FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_tech FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Ticket Messages Table (Customer <-> Technician Real-time Communication)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_role VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_ticket (ticket_id),
    CONSTRAINT fk_msg_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Spare Parts Inventory Table
CREATE TABLE IF NOT EXISTS spare_parts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    part_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INT DEFAULT 0,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(50) DEFAULT 'In Stock'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Part Requests Table
CREATE TABLE IF NOT EXISTS part_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(30) UNIQUE NOT NULL,
    job_id INT NOT NULL,
    technician_id INT NOT NULL,
    part_name VARCHAR(150) NOT NULL,
    quantity INT DEFAULT 1,
    reason TEXT NULL,
    status ENUM('Requested', 'Approved', 'Issued', 'Used') DEFAULT 'Requested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_preq_job (job_id),
    INDEX idx_preq_tech (technician_id),
    CONSTRAINT fk_preq_job FOREIGN KEY (job_id) REFERENCES maintenance_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_preq_tech FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Technician Live Geolocation Table
CREATE TABLE IF NOT EXISTS technician_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL UNIQUE,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    is_sharing TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tech_loc_user FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- SEED INITIAL TECHNICIAN & WORKFLOW DATA
-- =======================================================

-- Seed Technician (ID: 4, Counter: TECH0001, Pass: tech123 / password123)
INSERT INTO users (id, counter_id, name, email, password, phone, role, employee_id, specialization, experience, assigned_region, certifications) VALUES
(4, 'TECH0001', 'Vijay Kumar', 'tech@evcharge.com', '$2a$10$vWIUvMHRIaR3.Fwnh5T8KOty9GJyYmkLxki0fuPaAiS0.FTd.IMkm', '9876543213', 'TECHNICIAN', 'EMP-TECH-2026', 'EV Charger & DC Fast Grid Maintenance', '4 Years', 'Tamil Nadu & Bangalore North', 'Certified EVSE Level 3 & High Voltage Safety')
ON DUPLICATE KEY UPDATE name=VALUES(name), role='TECHNICIAN', employee_id=VALUES(employee_id), specialization=VALUES(specialization);

-- Seed Spare Parts Inventory
INSERT INTO spare_parts (id, part_code, name, category, stock, location, status) VALUES
(1, 'PRT-001', 'Liquid Cooled CCS2 250kW Cable Assembly', 'Cable Assembly', 6, 'Main Regional Warehouse', 'In Stock'),
(2, 'PRT-002', '150kW SiC Inverter Power Module', 'Power Electronics', 3, 'Station 1 Secure Vault', 'In Stock'),
(3, 'PRT-003', 'RFID Solenoid Lock Pin Actuator', 'Mechanical Locks', 10, 'Station 2 Toolroom', 'In Stock'),
(4, 'PRT-004', 'Thermal Coolant Sensor Probe Array', 'Sensors', 14, 'Station 4 Cabinet', 'In Stock'),
(5, 'PRT-005', 'Emergency Cutoff Breaker Relay 500A', 'Electrical Protection', 2, 'Main Regional Warehouse', 'Low Stock')
ON DUPLICATE KEY UPDATE stock=VALUES(stock);

-- Seed Initial Maintenance Jobs
INSERT INTO maintenance_jobs (id, job_id, station_id, charger_id, technician_id, issue, priority, status, reported_by, checklist) VALUES
(1, 'JOB-2026-001', 1, 'BAY-02', 4, 'Bay 02 DC Fast Cable connector latch stuck and thermal warning', 'HIGH', 'Assigned', 'Customer Support Ticket #TCK-001', '{"electrical": "PASS", "cable": "FAIL", "connector": "FAIL", "emergencyStop": "PASS", "display": "PASS", "paymentTerminal": "PASS", "network": "PASS", "cooling": "PASS", "powerOutput": "PASS", "safety": "PASS"}'),
(2, 'JOB-2026-002', 3, 'BAY-01', 4, 'Payment terminal NFC reader intermittent timeout during RFID scan', 'MEDIUM', 'In Progress', 'Station Owner', '{"electrical": "PASS", "cable": "PASS", "connector": "PASS", "emergencyStop": "PASS", "display": "PASS", "paymentTerminal": "FAIL", "network": "PASS", "cooling": "PASS", "powerOutput": "PASS", "safety": "PASS"}'),
(3, 'JOB-2026-003', 2, 'BAY-01', 4, '500A Circuit Breaker tripped after high load DC charging session', 'CRITICAL', 'Accepted', 'Automated Grid Monitor', NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Seed Initial Support Ticket
INSERT INTO support_tickets (id, ticket_id, customer_id, station_id, booking_id, technician_id, category, description, priority, status) VALUES
(1, 'TCK-2026-001', 3, 1, 'EV001', 4, 'Charging Problem', 'Charger Bay 02 cable latch would not disengage smoothly at end of session.', 'HIGH', 'In Progress')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Seed Initial Ticket Messages (Customer <-> Technician)
INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message) VALUES
(1, 1, 3, 'Priyan Customer', 'CUSTOMER', 'Hi, Charger Bay 02 stopped charging at 45% and the lock pin was tight.'),
(2, 1, 4, 'Vijay Kumar (Technician)', 'TECHNICIAN', 'Hello Priyan, I have received your report and I am currently en route to Station Central to inspect the solenoid and latch.')
ON DUPLICATE KEY UPDATE message=VALUES(message);
