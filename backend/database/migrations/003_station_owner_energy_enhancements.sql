-- ============================================================
-- 003_station_owner_energy_enhancements.sql
-- Station Owner Features, Photo Storage, Dynamic Tariffs,
-- and Energy Cost & Smart Load Management Tables
-- ============================================================

USE ev_charging_system;

-- 1. STATION PHOTOS TABLE
CREATE TABLE IF NOT EXISTS station_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    photo_id VARCHAR(50) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    image_url TEXT NOT NULL,
    storage_asset_id VARCHAR(150) NULL,
    caption VARCHAR(255) NULL,
    category ENUM('EXTERIOR', 'CHARGING_BAY', 'EQUIPMENT', 'FACILITY', 'OTHER') DEFAULT 'EXTERIOR',
    is_primary BOOLEAN DEFAULT FALSE,
    file_size INT NULL,
    mime_type VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_station_photos_station (station_id),
    INDEX idx_station_photos_primary (is_primary),
    CONSTRAINT fk_station_photos_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TARIFF HISTORY TABLE
CREATE TABLE IF NOT EXISTS tariff_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    history_id VARCHAR(50) UNIQUE NOT NULL,
    tariff_id INT NULL,
    station_id INT NOT NULL,
    charger_type VARCHAR(50) DEFAULT 'ALL',
    base_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 18.00,
    peak_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 22.00,
    off_peak_rate_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 14.00,
    connection_fee DECIMAL(10, 2) NOT NULL DEFAULT 15.00,
    idle_fee_per_minute DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
    tax_percentage DECIMAL(5, 2) DEFAULT 18.00,
    peak_start VARCHAR(10) DEFAULT '18:00',
    peak_end VARCHAR(10) DEFAULT '22:00',
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    change_reason VARCHAR(255) NULL,
    changed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tariff_hist_station (station_id),
    INDEX idx_tariff_hist_tariff (tariff_id),
    CONSTRAINT fk_tariff_hist_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. STATION ENERGY CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS station_energy_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT UNIQUE NOT NULL,
    site_power_limit_kw DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    other_building_load_kw DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    safety_reserve_kw DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    control_mode ENUM('MONITOR', 'SMART_CONTROL') NOT NULL DEFAULT 'MONITOR',
    grid_cost_per_kwh DECIMAL(10, 2) NOT NULL DEFAULT 8.50,
    demand_charge_per_kw DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    overload_threshold_pct DECIMAL(5, 2) NOT NULL DEFAULT 90.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_energy_cfg_station (station_id),
    CONSTRAINT fk_energy_cfg_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CHARGER ENERGY READINGS TABLE
CREATE TABLE IF NOT EXISTS charger_energy_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reading_id VARCHAR(50) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    charger_id INT NOT NULL,
    reading_type ENUM('MEASURED', 'SIMULATED', 'ESTIMATED') NOT NULL DEFAULT 'SIMULATED',
    meter_value_kwh DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    instantaneous_power_kw DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    voltage DECIMAL(10, 2) DEFAULT 400.00,
    current_amp DECIMAL(10, 2) DEFAULT 0.00,
    battery_soc INT NULL,
    reading_source VARCHAR(100) DEFAULT 'SIMULATOR_V2',
    reading_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_readings_station_time (station_id, reading_timestamp),
    INDEX idx_readings_charger_time (charger_id, reading_timestamp),
    CONSTRAINT fk_readings_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    CONSTRAINT fk_readings_charger FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. LOAD ALLOCATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS load_allocation_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT NOT NULL,
    total_capacity_kw DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    building_load_kw DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    safety_reserve_kw DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    available_charging_kw DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
    total_requested_kw DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_allocated_kw DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    active_chargers_count INT DEFAULT 0,
    allocations_json TEXT NULL,
    mode ENUM('MONITOR', 'SMART_CONTROL') DEFAULT 'MONITOR',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_load_station_time (station_id, timestamp),
    CONSTRAINT fk_load_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ENERGY COST RECORDS TABLE
CREATE TABLE IF NOT EXISTS energy_cost_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    record_id VARCHAR(50) UNIQUE NOT NULL,
    station_id INT NOT NULL,
    record_date DATE NOT NULL,
    energy_consumed_kwh DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    grid_energy_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    charging_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    net_margin DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_type ENUM('ESTIMATED', 'RECONCILED') DEFAULT 'ESTIMATED',
    reconciled_bill_ref VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cost_station_date (station_id, record_date),
    CONSTRAINT fk_cost_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. SMART CONTROL AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS smart_control_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT NOT NULL,
    charger_id INT NULL,
    user_id INT NULL,
    command_type VARCHAR(100) NOT NULL,
    target_power_limit_kw DECIMAL(10, 2) NOT NULL,
    acknowledged BOOLEAN DEFAULT TRUE,
    response_status VARCHAR(50) DEFAULT 'SUCCESS',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ctrl_station (station_id),
    CONSTRAINT fk_ctrl_station FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
