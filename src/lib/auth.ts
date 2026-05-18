import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP-hez egyszerűbb, később bevezetjük
  },
  user: {
    additionalFields: {
      tier: {
        type: "string",
        defaultValue: "free",
        input: false, // user nem állíthatja regisztrációkor
      },
    },
  },
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
});

export type Session = typeof auth.$Infer.Session;
