import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./.data/local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const users = await client.execute("SELECT id, name, email, role, status FROM user");
  console.log("All USERS count:", users.rows.length);
  console.log("USERS:", JSON.stringify(users.rows, null, 2));

  const bus = await client.execute("SELECT id, slug, label FROM business_unit");
  console.log("All BUs:", JSON.stringify(bus.rows, null, 2));
}

run().catch(console.error);
