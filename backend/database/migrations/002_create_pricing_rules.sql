-- =======================================================
-- Migration 002: Create pricing_rules table
-- =======================================================

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

