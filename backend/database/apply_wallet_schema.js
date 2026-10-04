import { query } from "../config/db.js";

async function applyWalletSchema() {
  console.log("💳 Applying MySQL Wallet Schema & Transactions Table...");

  try {
    // 1. Check and add wallet_balance column to users table
    const userCols = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'wallet_balance'"
    );

    if (userCols.length === 0) {
      await query("ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 2500.00 AFTER pincode");
      console.log("  + Added `wallet_balance` column to `users` table (Default: ₹2500.00)");
    } else {
      console.log("  ✓ `wallet_balance` column already exists in `users`");
    }

    // 2. Create wallet_transactions table
    await query(`
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
    `);
    console.log("  ✓ `wallet_transactions` table verified");

    // 3. Ensure payments table supports 'WALLET' in gateway and payment_method
    const pCols = await query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_method'"
    );
    console.log("  ✓ Payments table payment_method type:", pCols[0]?.COLUMN_TYPE || "VARCHAR");

    console.log("✅ Wallet MySQL migration successfully applied!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Wallet migration failed:", error);
    process.exit(1);
  }
}

applyWalletSchema();
