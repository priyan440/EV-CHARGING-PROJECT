import jwt from "jsonwebtoken";

const token = jwt.sign(
  {
    id: 3,
    user_id: "OWN000003",
    counterId: "OWN000003",
    email: "priyan@evowner.com",
    role: "STATION_OWNER",
  },
  process.env.JWT_SECRET || "ev_charging_secret_key_2026",
  { expiresIn: "1h" }
);

async function testProfitability() {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log("1. Testing GET /api/owner/profitability/summary...");
  const sumRes = await fetch("http://localhost:5001/api/owner/profitability/summary", { headers });
  const sumData = await sumRes.json();
  console.log("Summary status:", sumRes.status, sumData);

  console.log("\n2. Testing GET /api/owner/profitability/stations...");
  const stRes = await fetch("http://localhost:5001/api/owner/profitability/stations", { headers });
  const stData = await stRes.json();
  console.log("Stations count:", stData.stations?.length, stData.stations?.[0]);

  console.log("\n3. Testing GET /api/owner/profitability/trends...");
  const trRes = await fetch("http://localhost:5001/api/owner/profitability/trends", { headers });
  const trData = await trRes.json();
  console.log("Trends points:", trData.trends?.length, trData.trends?.[0]);

  console.log("\n4. Testing POST /api/owner/expenses...");
  const newExp = {
    stationId: 1,
    category: "MAINTENANCE",
    amount: 1250.0,
    currency: "INR",
    expenseDate: "2026-10-10",
    description: "Scheduled preventative connector inspection & filter replacement",
    documentReference: "INV-2026-MAINT-001",
  };
  const expPostRes = await fetch("http://localhost:5001/api/owner/expenses", {
    method: "POST",
    headers,
    body: JSON.stringify(newExp),
  });
  const expPostData = await expPostRes.json();
  console.log("Expense Created:", expPostRes.status, expPostData);

  console.log("\n5. Testing GET /api/owner/expenses...");
  const expListRes = await fetch("http://localhost:5001/api/owner/expenses", { headers });
  const expListData = await expListRes.json();
  console.log("Expenses count:", expListData.pagination?.totalItems, expListData.data?.[0]);

  process.exit(0);
}

testProfitability().catch((err) => {
  console.error(err);
  process.exit(1);
});
