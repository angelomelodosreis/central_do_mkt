import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./.data/local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const users = await client.execute(
    "SELECT id, name, email, role, status FROM user WHERE name LIKE '%Tati%' OR name LIKE '%Thiago%' OR email LIKE '%tati%' OR email LIKE '%thiago%' OR name LIKE '%Heloiza%'"
  );
  console.log("USERS:", JSON.stringify(users.rows, null, 2));

  const bus = await client.execute(
    "SELECT id, slug, label FROM business_unit WHERE slug LIKE '%demo%' OR label LIKE '%Demonstra%'"
  );
  console.log("BUs:", JSON.stringify(bus.rows, null, 2));

  const allBUs = await client.execute("SELECT id, slug, label FROM business_unit LIMIT 10");
  console.log("Sample BUs:", JSON.stringify(allBUs.rows, null, 2));
}

run().catch(console.error);
