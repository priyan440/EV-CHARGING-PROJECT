import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

/**
 * Manual CLI utility to create an Administrator account.
 * This is NEVER run automatically; only on demand by system administrators.
 * Usage: node backend/scripts/create_admin.js [email] [password] [name] [phone]
 */
async function createAdmin() {
  const email = process.argv[2] || "admin@evcharge.com";
  const password = process.argv[3] || "admin123";
  const name = process.argv[4] || "System Administrator";
  const phone = process.argv[5] || "+91 98400 00000";

  console.log(`🔐 Creating Administrator account: ${email}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root123",
    database: process.env.DB_NAME || "ev_charging_system",
    port: parseInt(process.env.DB_PORT || "3306", 10),
  });

  try {
    const [existing] = await conn.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      console.log(`⚠️ User with email ${email} already exists (ID: ${existing[0].id}).`);
      process.exit(0);
    }

    const [maxRows] = await conn.execute("SELECT COALESCE(MAX(id), 0) as maxId FROM users");
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    const userCode = `ADM${String(nextId).padStart(6, "0")}`;

    const passwordHash = await bcrypt.hash(password, 10);

    await conn.execute(
      `INSERT INTO users (user_id, name, email, password_hash, phone, role, status)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE')`,
      [userCode, name, email, passwordHash, phone]
    );

    console.log(`✅ Administrator account created successfully!`);
    console.log(`   User Code : ${userCode}`);
    console.log(`   Email     : ${email}`);
    console.log(`   Role      : ADMIN`);
  } catch (err) {
    console.error(`❌ Failed to create admin: ${err.message}`);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

createAdmin();
