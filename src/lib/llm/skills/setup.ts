// Skill-ek regisztrálása — ezt kell importálni az API route-okban,
// mielőtt a skillRouter-t hívnánk.
// Külön fájlban van, hogy elkerüljük a körkörös függőséget
// a skills/index.ts (skillRouter) és a skill fájlok (registerSkill) között.

import "./chat-assistant";
import "./site-builder";
import "./section-rewriter";
import "./copywriter";
import "./tool-assistant";
import "./web-auditor";
