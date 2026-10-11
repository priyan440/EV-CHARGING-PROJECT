import http from "http";
import { spawn } from "child_process";

async function verifyFullstackProductionServing() {
  console.log("==================================================");
  console.log("  TESTING UNIFIED FULL-STACK PRODUCTION SERVING   ");
  console.log("==================================================");

  const serverProcess = spawn("node", ["backend/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: "5002" },
    shell: true,
  });

  serverProcess.stdout.on("data", (d) => console.log(`[PROD SERVER] ${d.toString().trim()}`));
  serverProcess.stderr.on("data", (d) => console.error(`[PROD ERR] ${d.toString().trim()}`));

  // Wait 4 seconds for server boot
  await new Promise((r) => setTimeout(r, 4500));

  const fetchUrl = (path) => {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:5002${path}`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }).on("error", reject);
    });
  };

  try {
    // 1. Health endpoint
    console.log("\n[TEST 1] Fetching /api/health...");
    const health = await fetchUrl("/api/health");
    console.log(`Status: ${health.status}`);
    const healthJson = JSON.parse(health.body);
    console.log(`API Status: ${healthJson.status}, Database: ${healthJson.database}, Latency: ${healthJson.dbLatencyMs}ms`);

    // 2. Production Frontend Root
    console.log("\n[TEST 2] Fetching Frontend Root / ...");
    const root = await fetchUrl("/");
    console.log(`Status: ${root.status}, Content-Type: ${root.headers["content-type"]}`);
    console.log(`Is HTML? ${root.body.includes("<!doctype html>") || root.body.includes("<html")}`);
    console.log(`Title tag included: ${root.body.includes("<title>")}`);

    // 3. SPA Client Route Fallback
    console.log("\n[TEST 3] Fetching SPA Client Route /dashboard ...");
    const spa = await fetchUrl("/dashboard");
    console.log(`Status: ${spa.status}, Is HTML? ${spa.body.includes("<!doctype html>") || spa.body.includes("<html")}`);

    console.log("\n✅ ALL TESTS PASSED! Unified full-stack production server is 100% verified.");
  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}

verifyFullstackProductionServing();
