import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

async function addTechnician() {
  const hash = await bcrypt.hash("tech123", 10);
  try {
    await pool.execute(
      `INSERT IGNORE INTO users (id, counter_id, name, email, password, phone, role)
       VALUES (200, 'TECH0001', 'Dave Wilson', 'tech@evcharge.com', ?, '9876543210', 'TECHNICIAN')`,
      [hash]
    );
    console.log("✅ Technician user created: tech@evcharge.com / tech123");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

addTechnician();
