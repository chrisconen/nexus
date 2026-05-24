import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db, user as userTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { stripe, priceIdForTier, type PaidTier } from "@/lib/stripe";

export const prerender = false;

const APP_URL = import.meta.env.PUBLIC_APP_URL || "http://localhost:4321";

export const POST: APIRoute = async ({ request }) => {
  // 1. Bejelentkezés ellenőrzése
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;

  // 2. Body: melyik tierre fizet elő?
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Hibás JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tier = body.tier as PaidTier;
  if (tier !== "pro" && tier !== "premium") {
    return new Response(JSON.stringify({ error: "Érvénytelen tier" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let priceId: string;
  try {
    priceId = priceIdForTier(tier);
  } catch (err) {
    console.error("[checkout] price ID hiba:", err);
    return new Response(JSON.stringify({ error: "Szerverkonfigurációs hiba" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Stripe customer — közvetlen DB-olvasás, mert a Stripe-mezők
    //    nincsenek az auth additionalFields-ben (csak a 'tier' van ott).
    const [dbUser] = await db
      .select({
        stripeCustomerId: userTable.stripeCustomerId,
      })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    let customerId = dbUser?.stripeCustomerId ?? null;

    // Ha még nincs Stripe customer, létrehozzuk és AZONNAL elmentjük.
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id, // kettős kötés a webhookhoz
        },
      });
      customerId = customer.id;

      await db
        .update(userTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(userTable.id, user.id));
    }

    // 4. Checkout session létrehozás
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/elofizetes/siker?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/elofizetes/megse`,
      client_reference_id: user.id,
      // A metadata KULCSFONTOSSÁGÚ: a webhook ebből tudja, kinek mit aktiváljon.
      // Mind a session-re, mind a létrejövő subscription-re rátesszük.
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
    });

    if (!checkoutSession.url) {
      throw new Error("A Stripe nem adott vissza checkout URL-t");
    }

    // 5. Visszaadjuk az URL-t, a kliens erre irányít át
    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[checkout] Stripe hiba:", err);
    return new Response(
      JSON.stringify({ error: "Nem sikerült elindítani a fizetést. Próbáld újra." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};