import { query } from "../config/db.js";

async function run() {
  const users = await query("SELECT id, user_id, name, email, role, status FROM users");
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}
run();
