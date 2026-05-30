import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { resolve } from "path";

// ENV betöltés: prod env felülírja a .env.local-t
config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is not set");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set");

const isProd = process.argv.includes("--prod");
if (isProd && url.includes("dev-")) {
  throw new Error(
    `STOP: db:migrate:prod futott, de a TURSO_DATABASE_URL dev DB-re mutat (${url}).\n` +
    `Állítsd be a prod env vars-okat: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... pnpm db:migrate:prod`
  );
}

const client = createClient({ url, authToken });
const db = drizzle(client);

console.log(`Running migrations on: ${url}`);

await migrate(db, { migrationsFolder: resolve("drizzle") });

console.log("Migrations complete.");
client.close();
