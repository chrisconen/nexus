import Stripe from "stripe";

/**
 * Stripe kliens — egyetlen példány az egész app számára.
 *
 * Megjegyzés az API-verzióról: NEM adunk meg apiVersion-t. A stripe-node
 * SDK a saját beépített verziójához van rögzítve, és ehhez illeszkednek a
 * TypeScript-típusok. Ha kézzel felülírnánk (pl. a fiók 2025-05-28.basil
 * verziójára), a típusok elcsúsznának. A webhook feldolgozás verzió-toleráns,
 * úgyhogy ez biztonságos.
 */
const secretKey = import.meta.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY nincs beállítva (.env)");
}

export const stripe = new Stripe(secretKey);

/**
 * Price ID-k a .env-ből. Ezek a Stripe Dashboard → Products → Pricing
 * szekcióból másolt price_... azonosítók (NEM a prod_... termék-ID-k).
 */
export const STRIPE_PRICES = {
  pro: import.meta.env.STRIPE_PRICE_PRO,
  premium: import.meta.env.STRIPE_PRICE_PREMIUM,
} as const;

/** A fizetős tier-ek (a "free" nem fizetős, nincs Stripe price-a). */
export type PaidTier = "pro" | "premium";

/** Az összes lehetséges tier (a user.tier mező enum-ja). */
export type Tier = "free" | PaidTier;

/**
 * tier → Stripe price ID.
 * A checkout endpoint ezzel választ árat a kiválasztott tier alapján.
 */
export function priceIdForTier(tier: PaidTier): string {
  const priceId = STRIPE_PRICES[tier];
  if (!priceId) {
    throw new Error(`Nincs Stripe price ID a(z) "${tier}" tierhez (.env)`);
  }
  return priceId;
}

/**
 * Stripe price ID → tier (a fordított irány).
 * A webhook ezzel fejti vissza, melyik tierre fizetett be / váltott a user,
 * pl. customer.subscription.updated eseménynél (Pro ↔ Premium váltás).
 * Ismeretlen price esetén null — a hívó dönti el, mit kezd vele.
 */
export function tierForPriceId(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICES.pro) return "pro";
  if (priceId === STRIPE_PRICES.premium) return "premium";
  return null;
}