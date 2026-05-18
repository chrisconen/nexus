import { config } from "dotenv";
config({ path: ".env.local" });

import type { Config } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is not set in .env.local");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set in .env.local");

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken,
  },
} satisfies Config;
