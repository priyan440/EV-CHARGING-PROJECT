-- =======================================================
-- Migration 001: Create login_activity table
-- =======================================================

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
