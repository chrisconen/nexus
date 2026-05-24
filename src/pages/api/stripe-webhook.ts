// src/pages/api/stripe-webhook.ts
// → az URL: /api/stripe-webhook  (ezt kell beállítani a Stripe Dashboard
//   webhook endpoint-jánál, és ezt figyeli a `stripe listen --forward-to`)
import type { APIRoute } from "astro";
import { db, user as userTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { stripe, tierForPriceId } from "@/lib/stripe";
import type Stripe from "stripe";

export const prerender = false;

const WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET;

/**
 * Megkeresi a NEXUS usert egy Stripe customer ID alapján.
 * A subscription-eseményeknél (updated/deleted) nincs mindig metadata,
 * de a customer ID mindig van — ezért ez a megbízható horgony.
 */
async function findUserByCustomerId(customerId: string) {
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.stripeCustomerId, customerId))
    .limit(1);
  return row ?? null;
}

/**
 * Egy subscription objektumból kiszedi a számunkra fontos mezőket,
 * egységesen — így a checkout és az updated ág is ugyanazt használja.
 */
function readSubscriptionFields(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const tier = tierForPriceId(priceId);
  const status = subscription.status;
  // FONTOS (Basil API / stripe-node v22): a current_period_end a SUBSCRIPTION
  // ITEM-en van, NEM a subscription objektumon. A Basil (2025-03-31) áthelyezte
  // ide; a subscription.current_period_end ezen az SDK-n undefined lenne.
  const periodEnd = item?.current_period_end ?? null;
  // A cancel_at_period_end VISZONT a subscription objektumon maradt.
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
  return {
    tier,
    status,
    periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd,
  };
}

export const POST: APIRoute = async ({ request }) => {
  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET nincs beállítva");
    return new Response("Server misconfigured", { status: 500 });
  }

  // 1. NYERS body — az aláírás a nyers byte-okon számolódik, NEM .json()!
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Hiányzó aláírás", { status: 400 });
  }

  // 2. Aláírás-ellenőrzés. constructEventAsync — Web-standard (Astro/Vercel)
  //    környezetben ez kell, nem a szinkron constructEvent.
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ismeretlen";
    console.error("[webhook] Aláírás-ellenőrzés sikertelen:", msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  // 3. Eseménytípus szerinti feldolgozás.
  try {
    switch (event.type) {
      // --- Sikeres checkout: a tier aktiválása ---
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!userId || (tier !== "pro" && tier !== "premium")) {
          console.error(
            "[webhook] checkout.session.completed: hiányos metadata",
            { userId, tier }
          );
          break; // 200-zal felelünk, de nem írunk semmit hibás adatra
        }

        // ÚJ: a period end + cancel flag már az első aktiváláskor bekerül.
        // Lekérjük a subscriptiont, hogy ne maradjon null a /fiok-on,
        // amíg meg nem jön az első updated esemény.
        let periodEnd: Date | null = null;
        let cancelAtPeriodEnd = false;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const fields = readSubscriptionFields(sub);
            periodEnd = fields.periodEnd;
            cancelAtPeriodEnd = fields.cancelAtPeriodEnd;
          } catch (err) {
            // Ha a retrieve hibázik, nem bukik el az egész aktiválás —
            // a period end majd az első updated eseménynél kitöltődik.
            console.error(
              "[webhook] checkout: subscription retrieve sikertelen",
              err
            );
          }
        }

        await db
          .update(userTable)
          .set({
            tier,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
            subscriptionPeriodEnd: periodEnd,
            cancelAtPeriodEnd,
          })
          .where(eq(userTable.id, userId));

        console.log(`[webhook] Tier aktiválva: user=${userId} → ${tier}`);
        break;
      }

      // --- Előfizetés frissült: státusz + tier-váltás + cancel flag ---
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const user = await findUserByCustomerId(customerId);
        if (!user) {
          console.error(
            "[webhook] subscription.updated: nincs user",
            customerId
          );
          break;
        }

        const { tier, status, periodEnd, cancelAtPeriodEnd } =
          readSubscriptionFields(subscription);

        await db
          .update(userTable)
          .set({
            // Ha a tier visszafejthető és aktív a subscription, frissítjük.
            // Ha nem aktív (pl. past_due), a tiert nem bántjuk itt — a
            // deleted esemény fogja free-re tenni, ha tényleg megszűnik.
            ...(tier && status === "active" ? { tier } : {}),
            subscriptionStatus: status,
            subscriptionPeriodEnd: periodEnd,
            // ÚJ: a period-végi lemondás flagje. A portál lemondási flow-ja
            // ezt állítja true-ra, miközben a status MARAD "active".
            cancelAtPeriodEnd,
          })
          .where(eq(userTable.id, user.id));

        console.log(
          `[webhook] Subscription frissült: user=${user.id} ` +
            `státusz=${status} tier=${tier ?? "(nincs változás)"} ` +
            `cancelAtPeriodEnd=${cancelAtPeriodEnd}`
        );
        break;
      }

      // --- Előfizetés megszűnt: vissza free-re ---
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const user = await findUserByCustomerId(customerId);
        if (!user) {
          console.error(
            "[webhook] subscription.deleted: nincs user",
            customerId
          );
          break;
        }

        await db
          .update(userTable)
          .set({
            tier: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            subscriptionPeriodEnd: null,
            cancelAtPeriodEnd: false, // ÚJ: reset, hogy ne ragadjon be
          })
          .where(eq(userTable.id, user.id));

        console.log(`[webhook] Előfizetés lemondva: user=${user.id} → free`);
        break;
      }

      // --- Sikertelen fizetés: past_due jelölés (a tier marad egyelőre) ---
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;

        if (!customerId) break;

        const user = await findUserByCustomerId(customerId);
        if (!user) break;

        await db
          .update(userTable)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(userTable.id, user.id));

        console.log(`[webhook] Sikertelen fizetés: user=${user.id} → past_due`);
        break;
      }

      default:
        // Sok más eseményt is kapunk; ezeket csendben nyugtázzuk.
        break;
    }
  } catch (err) {
    // Ha a feldolgozás hibázik, 500-at adunk → a Stripe újrapróbálja.
    console.error("[webhook] Feldolgozási hiba:", err);
    return new Response("Processing error", { status: 500 });
  }

  // 4. Mindig 200, ha eljutottunk idáig — különben a Stripe retry-zik.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};