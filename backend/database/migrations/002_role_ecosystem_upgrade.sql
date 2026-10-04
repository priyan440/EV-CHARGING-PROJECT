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

