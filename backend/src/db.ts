import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://loadlab:change-me@localhost:5432/loadlab",
  max: Number(process.env.PG_POOL_MAX ?? 10),
});

export async function migrate() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".sql")) continue;
    await pool.query(fs.readFileSync(path.join(dir, file), "utf8"));
  }
}
