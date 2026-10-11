import http from "http";
import { spawn } from "child_process";

async function testHealth() {
  console.log("Starting backend server to test /api/health with TiDB Cloud...");
  const child = spawn("node", ["backend/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: "5005" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => console.log(`[BACKEND] ${d.toString().trim()}`));
  child.stderr.on("data", (d) => console.error(`[BACKEND ERR] ${d.toString().trim()}`));

  // Wait 4 seconds for startup
  await new Promise((r) => setTimeout(r, 4000));

  console.log("\nPinging http://localhost:5005/api/health ...");
  const req = http.get("http://localhost:5005/api/health", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log(`\nHTTP Status: ${res.statusCode}`);
      console.log("Response Body:", data);
      child.kill("SIGTERM");
      process.exit(0);
    });
  });

  req.on("error", (err) => {
    console.error("Health check ping failed:", err.message);
    child.kill("SIGTERM");
    process.exit(1);
  });
}

testHealth();
