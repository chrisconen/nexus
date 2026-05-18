import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const url = import.meta.env.TURSO_DATABASE_URL;
const authToken = import.meta.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DATABASE_URL is not set");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set");

const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

export * from "./schema";
