-- ============================================================
-- Migration 005: Station Expenses and Profitability Advisor
-- Creates table station_expenses with foreign keys & indexes
-- ============================================================

CREATE TABLE IF NOT EXISTS `station_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `expense_id` VARCHAR(50) NOT NULL UNIQUE,
  `station_id` INT NOT NULL,
  `category` ENUM(
    'ELECTRICITY',
    'MAINTENANCE',
    'PAYMENT_FEE',
    'RENT_LEASE',
    'INSURANCE',
    'INTERNET_TELECOM',
    'EQUIPMENT',
    'OTHER'
  ) NOT NULL DEFAULT 'OTHER',
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `expense_date` DATE NOT NULL,
  `description` TEXT,
  `document_reference` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_station_expenses_station` (`station_id`),
  INDEX `idx_station_expenses_date` (`expense_date`),
  INDEX `idx_station_expenses_category` (`category`),
  INDEX `idx_station_expenses_created_by` (`created_by`),
  CONSTRAINT `fk_station_expenses_station` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_station_expenses_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
