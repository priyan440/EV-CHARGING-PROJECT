import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

// Build pool configuration supporting both connection URI (DATABASE_URL / MYSQL_URL) and individual parameters
const getPoolConfig = () => {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const isCloudHost = process.env.DB_HOST && !["localhost", "127.0.0.1"].includes(process.env.DB_HOST);
  const useSsl = process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true" || (isCloudHost && process.env.DB_SSL !== "false");

  const sslConfig = useSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined;

  if (dbUrl) {
    return {
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: true,
      ...(sslConfig ? { ssl: sslConfig } : {}),
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root123",
    database: process.env.DB_NAME || "ev_charging_system",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true,
    ...(sslConfig ? { ssl: sslConfig } : {}),
  };
};

// Create MySQL Connection Pool (The ONLY Persistent Database for the Application)
export const pool = mysql.createPool(getPoolConfig());

// Helper for executing single SQL queries safely
export const query = async (sql, params = []) => {
  const safeParams = Array.isArray(params)
    ? params.map((p) => (p === undefined ? null : p))
    : params;
  try {
    const [rows] = await pool.execute(sql, safeParams);
    return rows;
  } catch (err) {
    console.error(`[MySQL Query Error] ${err.message}\nSQL: ${sql}\nParams:`, safeParams);
    throw err;
  }
};

// Helper for executing multi-statement SQL scripts (migrations / schema scripts)
export const queryRaw = async (sql) => {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(sql);
    return result;
  } catch (err) {
    console.error(`[MySQL Raw Error] ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }
};

// Helper for executing atomic MySQL Transactions (Rolls back automatically on failure)
export const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    console.error(`[MySQL Transaction Rolled Back]: ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }
};

// Primary Database Connection Initializer (Strict MySQL Only)
export const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`🐬 MySQL Connected Successfully`);
    console.log(`📦 Database: ${process.env.DB_NAME || "ev_charging_system"}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`❌ MySQL Connection Failed: ${error.message}`);
    console.error(`   Host: ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "3306"}`);
    console.error(`   User: ${process.env.DB_USER || "root"}`);
    console.error(`   Database: ${process.env.DB_NAME || "ev_charging_system"}`);
    return false;
  }
};

export default { pool, query, queryRaw, transaction, connectDB };
