-- ============================================================
-- 004_admin_control_center_repairs.sql
-- Enhanced Schema for Owner Verification, Station Approval,
-- Heartbeat Tracking, Incident Management, Payment Reconciliation,
-- Audit Logs, and Safe Remote Commands.
-- ============================================================

USE ev_charging_system;

-- 1. Upgrade users table status if needed
ALTER TABLE users 
  MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE';

-- 2. Upgrade station_owners table
CREATE TABLE IF NOT EXISTS station_owners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    owner_code VARCHAR(50) UNIQUE NULL,
    business_name VARCHAR(150) NULL,
    business_email VARCHAR(150) NULL,
    business_phone VARCHAR(30) NULL,
    address TEXT NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED') DEFAULT 'PENDING',
    rejection_reason TEXT NULL,
    suspension_reason TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owners_user_id (user_id),
    INDEX idx_owners_status (verification_status),
    CONSTRAINT fk_owners_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Remote Commands Table
CREATE TABLE IF NOT EXISTS remote_commands (
    id INT PRIMARY KEY AUTO_INCREMENT,
    command_id VARCHAR(50) UNIQUE NOT NULL,
    charger_id INT NOT NULL,
    station_id INT NOT NULL,
    user_id INT NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    target_payload TEXT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED', 'TIMED_OUT') DEFAULT 'PENDING',
    is_simulated BOOLEAN DEFAULT FALSE,
    response_payload TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cmd_charger (charger_id),
    INDEX idx_cmd_station (station_id),
    INDEX idx_cmd_user (user_id),
    INDEX idx_cmd_status (status),
    CONSTRAINT fk_cmd_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    CONSTRAINT fk_cmd_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_cmd_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
