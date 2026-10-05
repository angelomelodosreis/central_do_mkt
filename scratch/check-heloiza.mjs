import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function main() {
  const users = await client.execute({
    sql: "SELECT id, email, name, role FROM user",
    args: [],
  });
  console.log("TOTAL USERS:", users.rows.length);
  console.log("SAMPLE USERS:", JSON.stringify(users.rows.slice(0, 10), null, 2));

  if (users.rows.length > 0) {
    const user = users.rows[0];
    const grants = await client.execute({
      sql: "SELECT * FROM access_grant WHERE userId = ?",
      args: [user.id],
    });
    console.log("GRANTS:", JSON.stringify(grants.rows, null, 2));

    const squadMembers = await client.execute({
      sql: "SELECT sm.*, bu.label, bu.slug FROM squad_member sm LEFT JOIN business_unit bu ON sm.businessUnitId = bu.id WHERE sm.userId = ?",
      args: [user.id],
    });
    console.log("SQUAD_MEMBERS:", JSON.stringify(squadMembers.rows, null, 2));

    const rolePerms = await client.execute({
      sql: "SELECT * FROM role_permission WHERE role = ?",
      args: [user.role],
    });
    console.log("ROLE_PERMISSIONS for " + user.role + ":", JSON.stringify(rolePerms.rows, null, 2));
  }
}

main().catch(console.error);
