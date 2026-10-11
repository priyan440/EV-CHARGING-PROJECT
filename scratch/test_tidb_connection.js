import mysql from "../backend/node_modules/mysql2/promise.js";

async function testTiDB() {
  console.log("Connecting to TiDB Cloud...");
  
  const config = {
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "Sbqbtmp2XvNLg2u.root",
    password: "e2qVqbOFDPQkNdsB",
    database: "sys",
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: false,
    },
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("✅ Successfully connected to TiDB Cloud!");

    const [databases] = await connection.query("SHOW DATABASES;");
    console.log("Databases available:", databases.map(d => Object.values(d)[0]));

    // Check if ev_charging_system database exists or create it
    console.log("Creating/verifying ev_charging_system database...");
    await connection.query("CREATE DATABASE IF NOT EXISTS ev_charging_system;");
    console.log("✅ ev_charging_system database is ready!");

    await connection.end();
  } catch (err) {
    console.error("❌ TiDB Connection Error:", err.message);
  }
}

testTiDB();
