// src/pages/api/portal.ts
// → az URL: /api/portal
// A Stripe Customer Portal session létrehozása. A user innen tudja lemondani
// az előfizetést, kártyát cserélni, és Pro ↔ Premium között váltani (a portál
// viselkedését a Stripe Dashboard → Settings → Billing → Customer portal adja).
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, user as userTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

export const prerender = false;

// Ugyanaz az env, mint a checkout.ts-ben — egységesen PUBLIC_APP_URL.
const APP_URL = import.meta.env.PUBLIC_APP_URL || "http://localhost:4321";

export const POST: APIRoute = async ({ request }) => {
  // 1. Bejelentkezés — ugyanúgy, ahogy a checkout.ts csinálja (nincs middleware,
  //    tehát NINCS locals.user; a sessiont a headerből kérjük le).
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response("Nem vagy bejelentkezve", { status: 401 });
  }

  const { user } = session;

  // 2. A Stripe customer ID-t a DB-ből olvassuk — a Stripe-mezők nincsenek
  //    az auth additionalFields-ben (csak a 'tier' van ott).
  const [dbUser] = await db
    .select({ stripeCustomerId: userTable.stripeCustomerId })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  if (!dbUser?.stripeCustomerId) {
    // Még sosem fizetett → nincs mit kezelni. Vissza az árazásra.
    return new Response(null, {
      status: 303,
      headers: { Location: "/arazas" },
    });
  }

  // 3. Portal session létrehozása, majd átirányítás a Stripe-hoz.
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${APP_URL}/fiok`,
    });

    return new Response(null, {
      status: 303,
      headers: { Location: portalSession.url },
    });
  } catch (err) {
    console.error("[portal] Session létrehozása sikertelen:", err);
    return new Response("Nem sikerült megnyitni az előfizetés-kezelőt", {
      status: 500,
    });
  }
};