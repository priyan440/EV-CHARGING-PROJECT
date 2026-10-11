import mysql from "../backend/node_modules/mysql2/promise.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testWithPem() {
  const pemPath = path.join(__dirname, "../backend/certs/isrgrootx1.pem");
  console.log("Checking cert at:", pemPath, "Exists?", fs.existsSync(pemPath));

  const caCert = fs.readFileSync(pemPath);

  const config = {
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "Sbqbtmp2XvNLg2u.root",
    password: "e2qVqbOFDPQkNdsB",
    database: "ev_charging_system",
    ssl: {
      minVersion: "TLSv1.2",
      ca: caCert,
      rejectUnauthorized: true,
    },
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("🔒 Successfully connected with ISRG Root X1 CA TLS verification (rejectUnauthorized: true)!");
    const [res] = await connection.query("SELECT DATABASE() as db, VERSION() as version;");
    console.log("Query result:", res);
    await connection.end();
  } catch (err) {
    console.error("❌ TLS verification connection error:", err);
  }
}

testWithPem();
