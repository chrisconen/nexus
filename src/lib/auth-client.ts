import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_AUTH_URL || "http://localhost:4321",
});

export const { signIn, signUp, signOut, useSession } = authClient;
