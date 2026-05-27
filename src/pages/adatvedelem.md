# Adatkezelési tájékoztató

**Hatályos:** 2026. május 27. napjától  
**Utolsó módosítás:** 2026. május 27.

---

## 1. Az adatkezelő adatai

- **Név:** Chris Conen egyéni vállalkozó (Conen DIGITAL)
- **Székhely:** 9134 Bodonhely, Lepke utca 9.
- **Adószám:** 56302415-1-28
- **Nyilvántartási szám:** 54933347
- **E-mail (adatvédelmi ügyek): info@conendigital.hu
- **Weboldal:** https://nexus.conendigital.hu

Az adatkezelő (a továbbiakban: "**Szolgáltató**") tiszteletben tartja a Felhasználók személyes adatok védelméhez fűződő jogát, és a személyes adatokat az Európai Parlament és Tanács **(EU) 2016/679 rendelete (GDPR)**, valamint az információs önrendelkezési jogról és az információszabadságról szóló **2011. évi CXII. törvény (Infotv.)** rendelkezéseinek megfelelően kezeli.

A Szolgáltató mérete és tevékenységi köre alapján adatvédelmi tisztviselő (DPO) kinevezésére **nem köteles** (GDPR 37. cikk).

---

## 2. Kezelt adatok köre, jogalap, célok, megőrzési idő

| Adatkör | Kezelt adatok | Adatkezelés célja | Jogalap (GDPR) | Megőrzési idő |
|---|---|---|---|---|
| **Regisztráció** | e-mail-cím, jelszó (hash-elve), regisztráció időpontja | fiók létrehozása, bejelentkezés | szerződés teljesítése — GDPR 6. cikk (1) b) | fiók törléséig |
| **Munkamenet** | session cookie (Better Auth), IP-cím (technikai naplóban) | a bejelentkezett állapot fenntartása, biztonság | jogos érdek — GDPR 6. cikk (1) f) | session lejártáig, IP: max. 30 nap |
| **Előfizetés / fizetés** | előfizetési szint, Stripe customer ID, számlázási alapadatok | a fizetős szolgáltatás nyújtása, számlázás | szerződés — GDPR 6. cikk (1) b); jogi kötelezettség — 6. cikk (1) c) | számvitelről szóló 2000. évi C. tv. 169. § (2) alapján **8 év** |
| **AI chat-előzmények** | a Felhasználó által beírt üzenetek és az AI válaszai | a chat-funkció biztosítása, korábbi beszélgetések visszanézése | szerződés teljesítése — 6. cikk (1) b) | fiók törléséig vagy amíg a Felhasználó nem törli a beszélgetést |
| **Feltöltött dokumentumok és képek (chat)** | PDF, DOCX, TXT, JPEG, PNG | dokumentumelemzés, képértés | szerződés — 6. cikk (1) b) | feldolgozás után **nem kerül tárolásra** a Szolgáltató szerverein (egyszeri AI-feldolgozás) |
| **Site builder adatok** | a Felhasználó által megadott vállalati adatok, szövegek, képek | a generált weboldal létrehozása és tárolása | szerződés — 6. cikk (1) b) | fiók törléséig |
| **Builder képfeltöltések** | Vercel Blob-on tárolt képek | site builder képkezelés | szerződés — 6. cikk (1) b) | a Felhasználó általi törlésig vagy fiók törléséig |
| **Hibanaplók** | hibaüzenetek, technikai adatok (időbélyeg, hibakód, esetenként user ID) | hibakeresés, szolgáltatás javítása | jogos érdek — 6. cikk (1) f) | max. 90 nap |

A Szolgáltató **nem használ analytikai vagy nyomkövető eszközöket** (pl. Google Analytics, Meta Pixel, Vercel Analytics), és **nem profilozza** a Felhasználókat marketing célból.

---

## 3. Adatfeldolgozók és harmadik fél szolgáltatók

A Szolgáltatás működtetéséhez a Szolgáltató az alábbi adatfeldolgozókat veszi igénybe. Mindegyik szolgáltató saját adatkezelési és biztonsági szabályzattal rendelkezik, és a Szolgáltatóval kötött szerződés keretében a GDPR 28. cikke szerinti adatfeldolgozóként jár el.

### 3.1. Infrastruktúra-szolgáltatók

| Szolgáltató | Funkció | Székhely | Adattovábbítás jogalapja |
|---|---|---|---|
| **Vercel Inc.** | tárhely, hosting, képtárolás (Blob) | USA | SCC (Standard Contractual Clauses) |
| **Turso (ChiselStrike Inc.)** | adatbázis (libsql) | EU/USA | SCC |
| **Resend, Inc.** | tranzakciós e-mailek küldése | USA | SCC |
| **Stripe Payments Europe, Ltd.** | fizetés feldolgozása | Írország (EU) | GDPR-megfelelő, EU-n belüli |

### 3.2. AI-szolgáltatók (a Szolgáltatás kulcsfontosságú része)

A Szolgáltatás működéséhez a Felhasználó által a chatbe vagy site builderbe beírt üzenetek **harmadik fél AI-szolgáltatóinak szervereire kerülnek továbbításra** a válaszgenerálás céljából. A választott előfizetési szint határozza meg, melyik szolgáltató dolgozza fel az adott üzenetet:

| Szint | AI-szolgáltató | Modell | Szerver helye | Modelltanításra használja? |
|---|---|---|---|---|
| Free | **Groq, Inc.** | Llama 4 Scout | USA | Nem (API-üzemmódban) |
| Pro | **DeepSeek** | V4 Flash | nem-EU | Nem (API-üzemmódban) |
| Premium | **Anthropic PBC** | Claude Sonnet 4.6 | USA | Nem (API alapból nem tanít) |

**Fontos tudnivalók:**

- Az API-alapú használat során — szemben az ingyenes consumer AI-felületekkel — **az AI-szolgáltatók alapesetben nem használják a Felhasználó adatait a modelljeik tanítására**.
- Az adattovábbítás az EU-n kívülre (USA, egyéb) a GDPR V. fejezete szerinti **Standard Contractual Clauses (SCC)** alapján történik.
- A Felhasználó **ne adjon meg** különleges személyes adatokat (egészségi állapot, politikai vélemény, vallási meggyőződés), illetve mások személyes adatait a chatben, amennyiben azok feldolgozására nincs megfelelő jogalapja.

### 3.3. Linkek a partnerek adatvédelmi szabályzataihoz

- Vercel: https://vercel.com/legal/privacy-policy
- Turso: https://turso.tech/privacy
- Resend: https://resend.com/legal/privacy-policy
- Stripe: https://stripe.com/privacy
- Groq: https://groq.com/privacy-policy/
- DeepSeek: https://chat.deepseek.com/downloads/DeepSeek%20Privacy%20Policy.html
- Anthropic: https://www.anthropic.com/legal/privacy

---

## 4. Cookie-k és hasonló technológiák

A Szolgáltató **kizárólag a működéshez feltétlenül szükséges (technikai) cookie-kat** használja:

| Cookie | Cél | Élettartam |
|---|---|---|
| Better Auth session | bejelentkezett állapot fenntartása | session vagy max. 30 nap |
| CSRF token | biztonsági védelem (cross-site request forgery elleni védelem) | session |

Mivel ezek a cookie-k a szolgáltatás nyújtásához **feltétlenül szükségesek**, az elektronikus hírközlésről szóló **2003. évi C. törvény 155. § (4) bekezdése** és az EU 2002/58/EK irányelv (ePrivacy) alapján **a Felhasználó előzetes hozzájárulása nem szükséges**, csak megfelelő tájékoztatás — amit jelen dokumentum biztosít.

A Szolgáltató **nem helyez el harmadik fél (analytikai, hirdetési, követő) cookie-kat**.

---

## 5. A Felhasználó jogai (GDPR III. fejezet)

A Felhasználó az alábbi jogokkal élhet a kezelt személyes adataival kapcsolatban:

| Jog | GDPR-cikk | Mit jelent |
|---|---|---|
| **Hozzáférés joga** | 15. cikk | tájékoztatást kérhetsz arról, hogy milyen adatokat kezelünk rólad |
| **Helyesbítés** | 16. cikk | pontatlan adat helyesbítését kérheted |
| **Törlés ("elfeledtetés")** | 17. cikk | az adataid törlését kérheted, amennyiben a kezelés jogalapja megszűnt |
| **Adatkezelés korlátozása** | 18. cikk | a kezelés ideiglenes korlátozását kérheted vita esetén |
| **Adathordozhatóság** | 20. cikk | géppel olvasható formában (pl. JSON) megkaphatod az általad megadott adatokat |
| **Tiltakozás** | 21. cikk | tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen |
| **Hozzájárulás visszavonása** | 7. cikk (3) | a hozzájáruláson alapuló adatkezelést bármikor visszavonhatod |
| **Panasztétel** | 77. cikk | felügyeleti hatósághoz fordulhatsz (lásd 7. pont) |

**Kérelmedet** az alábbi módon jelezheted:
- E-mail: [TÖLTSD KI]
- Postai cím: 9134 Bodonhely, Lepke utca 9.

A Szolgáltató a kérelemre **legfeljebb 1 hónapon belül** válaszol (GDPR 12. cikk (3)). Bonyolult vagy nagy számú kérelem esetén ez 2 hónappal meghosszabbítható, erről a Felhasználót értesíteni kell.

**Fiók törlése:** a Felhasználó a fiókját bármikor törölheti a Beállítások menüből. A törlés visszafordíthatatlan; minden chat-előzmény, builder-site és kapcsolódó adat törlésre kerül a számlázási adatok kivételével, amelyeket a Szolgáltató a számviteli törvény szerinti 8 évig köteles megőrizni.

---

## 6. Adatbiztonsági intézkedések

A Szolgáltató az alábbi technikai és szervezési intézkedéseket alkalmazza:

- **Titkosított adatátvitel:** HTTPS/TLS minden Felhasználó-szerver kommunikációhoz
- **Jelszótárolás:** kizárólag hash-elt formában (bcrypt/argon2 — Better Auth alapértelmezés szerint)
- **Hozzáférés-szabályozás:** a Szolgáltató fiókjához kizárólag a Szolgáltató fér hozzá, többfaktoros azonosítással
- **Adatbázis:** Turso (libsql) szigorú hozzáférés-vezérléssel, titkosított kapcsolattal
- **Titok-kezelés:** API-kulcsok és érzékeny konfigurációk környezeti változókban, verziókezelt rendszeren kívül
- **Biztonsági mentés:** rendszeres adatbázis-snapshot a szolgáltató oldaláról
- **Incidenskezelés:** adatvédelmi incidens esetén a Szolgáltató **72 órán belül** értesíti a NAIH-ot (GDPR 33. cikk), és — ha az incidens magas kockázatot jelent — a Felhasználókat is (GDPR 34. cikk).

---

## 7. Jogorvoslati lehetőség

Ha a Felhasználó úgy ítéli meg, hogy a Szolgáltató adatkezelése a GDPR-t vagy más jogszabályt sért, panaszt nyújthat be:

**Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)**  
Cím: 1055 Budapest, Falk Miksa utca 9–11.  
Postacím: 1363 Budapest, Pf.: 9.  
Telefon: +36-1-391-1400  
E-mail: ugyfelszolgalat@naih.hu  
Weboldal: https://naih.hu

A Felhasználó bírósági utat is igénybe vehet (GDPR 79. cikk). A per a Felhasználó lakóhelye vagy a Szolgáltató székhelye szerinti törvényszék előtt is megindítható.

---

## 8. A tájékoztató módosítása

A Szolgáltató fenntartja a jogot a jelen tájékoztató egyoldalú módosítására. A módosításról a Felhasználókat e-mailben és/vagy a weboldalon értesíti, legalább **15 nappal a hatálybalépés előtt**. Lényeges változás (pl. új adatfeldolgozó, új adatkezelési cél) esetén a Szolgáltató kifejezett hozzájárulást kér, ha azt a jogalap szükségessé teszi.

---

*Jelen Adatkezelési tájékoztató 2026. május 27. napján lép hatályba.*
