import https from "https";

https.get("https://ev-charging-project-81ck.onrender.com/api/health", { timeout: 10000 }, (res) => {
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", JSON.stringify(res.headers, null, 2));
  let data = "";
  res.on("data", (c) => data += c);
  res.on("end", () => {
    console.log("Body length:", data.length);
    console.log("Body:", data.slice(0, 500));
  });
}).on("error", (e) => {
  console.error("Fetch Error:", e.message);
});
