/**
 * Minden tool regisztrálása.
 *
 * Ezt a fájlt kell importálni az API route-okban, mielőtt a tool-okat használnánk.
 * Külön fájlban van, hogy elkerüljük a körkörös függőségeket
 * a tools/index.ts (registry) és a tool fájlok (registerTool) között.
 *
 * Használat:
 *   import "@/lib/llm/tools/register-all";
 */

// Importáljuk a tool-okat — a registerTool() hívások a modul betöltésekor futnak le
import "./tools/web-search";
import "./tools/webpage-audit";
import "./tools/generate-website";
import "./tools/invoice-info";
import "./tools/calculate-pricing";

// Itt lehetnek további tool-ok a jövőben:
// import "./tools/social-media-generator";
// import "./tools/business-idea-validator";
// import "./tools/document-analyze";
