// === IPARÁGI SABLONOK ===
// Egy sablon = előre megírt SiteData-váz: szekciósorrend, iparági alapszövegek,
// paletta- és betűtípus-ajánlás, plusz AI-brief a generáláshoz.
// Az AI a vázat tölti fel a user-specifikus tartalommal — a kettő kombinálódik.

import type { Section, SectionStyle, SectionType } from "./types";

export interface IndustryTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  /** A prompt-ban használt iparág-megnevezés */
  businessTypeLabel: string;
  /** Ajánlott paletta kulcs (COLOR_PALETTES) — onboardingban előválasztódik */
  palette: string;
  fonts: { heading: string; body: string };
  /** Iparág-specifikus instrukciók az AI-generáláshoz */
  aiBrief: string;
  /** A sablon szekcióváza — friss id-kkal minden híváskor */
  buildSections: () => Section[];
}

// Distributive Omit — a Section unió minden tagjára külön alkalmazza az Omit-ot,
// így a "type" mező alapján szűkül a többi kötelező mező.
type SectionInput = Section extends infer S
  ? S extends Section
    ? Omit<S, "id" | "enabled" | "style"> & { style?: SectionStyle }
    : never
  : never;

function sec(data: SectionInput): Section {
  return { id: crypto.randomUUID(), enabled: true, style: {}, ...data } as Section;
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  szepsegszalon: {
    id: "szepsegszalon",
    label: "Fodrászat / Szépségszalon",
    icon: "💇",
    description: "Szolgáltatások árlistával, galéria, bejelentkezés",
    businessTypeLabel: "fodrászat / szépségszalon",
    palette: "rose",
    fonts: { heading: "Playfair Display", body: "Open Sans" },
    aiBrief: `Iparág: szépségipar (fodrászat, kozmetika, műköröm).
- A szolgáltatásoknál mindig szerepeljen ár (Ft, "-tól" formában is jó).
- A hangsúly a bizalmon és a személyes élményen van: a vendég tudni akarja, kihez ül be.
- GYIK-témák: bejelentkezés módja, lemondási feltételek, mennyi időt vesz igénybe egy kezelés, milyen termékekkel dolgoztok.
- A CTA mindig időpontfoglalásra ösztönözzön.`,
    buildSections: () => [
      sec({ type: "hero", headline: "Szépség, amiben jól érzed magad", subheadline: "Professzionális hajvágás, festés és styling — kényeztető környezetben, egyéni tanácsadással.", ctaText: "Időpontfoglalás", ctaUrl: "#kapcsolat", layout: "center" }),
      sec({ type: "services", title: "Szolgáltatásaink", subtitle: "Áraink tájékoztató jellegűek — pontos árat a konzultáció után adunk.", columns: 3, items: [
        { name: "Női hajvágás", description: "Mosás, vágás, szárítás — formára igazítva, egyéni tanácsadással.", price: "8 900 Ft-tól", icon: "scissors" },
        { name: "Férfi hajvágás", description: "Klasszikus vagy modern fazon, géppel vagy ollóval.", price: "4 900 Ft-tól", icon: "scissors" },
        { name: "Hajfestés", description: "Teljes festés, melír vagy balayage prémium alapanyagokkal.", price: "16 900 Ft-tól", icon: "palette" },
        { name: "Alkalmi frizura", description: "Esküvőre, ballagásra, rendezvényre — próbalehetőséggel.", price: "12 900 Ft-tól", icon: "star" },
      ]}),
      sec({ type: "gallery", title: "Munkáink", subtitle: "Néhány kedvenc az elmúlt hónapokból", columns: 3, images: [] }),
      sec({ type: "about", title: "Rólunk", text: "Szalonunkban a szakmai tudás és a nyugodt, barátságos légkör találkozik. Hiszünk abban, hogy egy jó frizura nem sablonból készül: először meghallgatunk, aztán alkotunk. Folyamatosan képezzük magunkat, és csak olyan termékekkel dolgozunk, amiket mi magunk is használnánk.", layout: "text-left" }),
      sec({ type: "testimonials", title: "Vendégeink mondták", items: [
        { name: "Kovács Anna", text: "Évek óta ide járok, és még egyszer sem jöttem ki úgy, hogy ne lettem volna elégedett. Végre valaki, aki azt csinálja, amit kérek — sőt, jobbat!", rating: 5 },
        { name: "Nagy Petra", text: "Az alkalmi frizurám az esküvőmön tökéletes volt, egész este tartott. Csak ajánlani tudom!", rating: 5 },
      ]}),
      sec({ type: "offers", title: "Aktuális ajánlataink", items: [
        { title: "Első alkalom kedvezmény", description: "Új vendégeinknek az első hajvágás árából 20% kedvezményt adunk.", discountPrice: "-20%", badge: "ÚJ VENDÉG" },
      ]}),
      sec({ type: "faq", title: "Gyakran ismételt kérdések", items: [
        { question: "Hogyan tudok időpontot foglalni?", answer: "Telefonon, Facebook-üzenetben vagy az oldal alján található űrlapon keresztül. Igyekszünk 24 órán belül visszajelezni." },
        { question: "Mi történik, ha nem tudok elmenni a foglalt időpontra?", answer: "Kérjük, legalább 24 órával korábban jelezd — így másnak oda tudjuk adni az időpontot, és neked sem számolunk fel díjat." },
        { question: "Mennyi időt vesz igénybe egy festés?", answer: "Technikától függően 2–4 óra. Foglaláskor pontos időtartamot mondunk, hogy tervezni tudj." },
      ]}),
      sec({ type: "cta", headline: "Foglald le az időpontod még ma", text: "Az esti és hétvégi időpontok hamar betelnek — írj vagy hívj minket bátran!", buttonText: "Időpontot kérek", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat", text: "Kérdésed van, vagy időpontot foglalnál? Írj nekünk — hamarosan válaszolunk!", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Telefonszám", type: "tel", required: true },
        { label: "Milyen szolgáltatás érdekel?", type: "textarea", required: true },
      ]}),
    ],
  },

  autoszerviz: {
    id: "autoszerviz",
    label: "Autószerelő / Autószerviz",
    icon: "🔧",
    description: "Szolgáltatások, számok, bizalomépítés",
    businessTypeLabel: "autószerelő műhely / autószerviz",
    palette: "blue",
    fonts: { heading: "Montserrat", body: "Inter" },
    aiBrief: `Iparág: autójavítás, szerviz.
- A bizalom a kulcs: átlátható árak, garancia a munkára, gyors visszajelzés.
- A szolgáltatásoknál a tipikus tételek: olajcsere, fékjavítás, futómű, diagnosztika, műszaki vizsgára felkészítés, klímatöltés.
- Statisztikák: hány év tapasztalat, hány javított autó, garancia hossza.
- GYIK-témák: kell-e időpont, mennyi idő egy javítás, adnak-e garanciát, milyen márkákkal foglalkoznak, van-e csereautó.
- A hangnem egyenes és megbízható, nem "marketinges".`,
    buildSections: () => [
      sec({ type: "hero", headline: "Az autód jó kezekben van", subheadline: "Gyors hibafeltárás, korrekt ár, garancia minden elvégzett munkára. Hívj, és mondjuk meg, mikor tudunk fogadni.", ctaText: "Időpontot kérek", ctaUrl: "#kapcsolat", layout: "left" }),
      sec({ type: "services", title: "Szolgáltatásaink", columns: 3, items: [
        { name: "Olaj- és szűrőcsere", description: "Gyártói előírás szerinti olajjal, szervizkönyvi bejegyzéssel.", price: "15 000 Ft-tól", icon: "wrench" },
        { name: "Fékrendszer javítás", description: "Féktárcsa, fékbetét csere, fékfolyadék ellenőrzés és csere.", price: "20 000 Ft-tól", icon: "shield" },
        { name: "Diagnosztika", description: "Számítógépes hibakód-olvasás és hibafeltárás minden főbb márkához.", price: "8 000 Ft", icon: "zap" },
        { name: "Műszaki vizsgára felkészítés", description: "Átvizsgálás, javítás, és kérésre a vizsgáztatást is intézzük.", price: "egyedi ár", icon: "check-circle" },
        { name: "Futómű beállítás", description: "Számítógépes futóműállítás, egyenetlen gumikopás megszüntetése.", price: "12 000 Ft-tól", icon: "car" },
        { name: "Klímatöltés és tisztítás", description: "Klímarendszer töltés, fertőtlenítés, tömítettség-vizsgálat.", price: "14 000 Ft-tól", icon: "clock" },
      ]}),
      sec({ type: "stats", items: [
        { value: "15+ év", label: "Szakmai tapasztalat" },
        { value: "5 000+", label: "Javított autó" },
        { value: "1 év", label: "Garancia a munkánkra" },
      ]}),
      sec({ type: "about", title: "Miért minket válassz?", text: "Nálunk nincs mellébeszélés: javítás előtt pontos árajánlatot adunk, és csak azt cseréljük, amit tényleg kell. A kiszerelt alkatrészeket kérésre megmutatjuk. Célunk, hogy az autód megbízhatóan működjön — és hogy legközelebb is hozzánk hozd.", layout: "text-left" }),
      sec({ type: "testimonials", title: "Ügyfeleink mondták", items: [
        { name: "Szabó Gábor", text: "Három műhely után itt találták meg végre a hibát. Korrekt ár, gyors munka, azóta ide hozom mindkét autónkat.", rating: 5 },
        { name: "Tóth László", text: "Műszakira vittem az autót, mindent intéztek, egy hét alatt kész lett. Ajánlom mindenkinek.", rating: 5 },
      ]}),
      sec({ type: "faq", title: "Gyakran ismételt kérdések", items: [
        { question: "Kell időpontot foglalnom?", answer: "Igen, időpont-egyeztetés után tudunk fogadni — így nem kell várakoznod. Sürgős esetben hívj, és igyekszünk beszorítani." },
        { question: "Adtok garanciát a javításra?", answer: "Igen, minden elvégzett munkára és a beépített alkatrészekre garanciát vállalunk." },
        { question: "Milyen márkákkal foglalkoztok?", answer: "Minden elterjedt személyautó-márkával. Ha kérdésed van, hívj minket, és megmondjuk, tudunk-e segíteni." },
        { question: "Mennyi idő alatt készül el az autóm?", answer: "A hibától függ — átvételkor pontos becslést adunk, és ha közben bármi változik, azonnal hívunk." },
      ]}),
      sec({ type: "cta", headline: "Furcsa hangot hallasz? Ég a hibalámpa?", text: "Ne várd meg, amíg nagyobb baj lesz belőle. Hívj minket, és megnézzük.", buttonText: "Kapcsolatfelvétel", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat", text: "Írd meg, mi a gond az autóval, és mi visszahívunk időponttal és tájékoztató árral.", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Telefonszám", type: "tel", required: true },
        { label: "Autó típusa és a hiba leírása", type: "textarea", required: true },
      ]}),
    ],
  },

  etterem: {
    id: "etterem",
    label: "Étterem / Kávézó",
    icon: "🍽️",
    description: "Étlap-kiemelések, galéria, napi ajánlat",
    businessTypeLabel: "étterem / kávézó",
    palette: "amber",
    fonts: { heading: "Playfair Display", body: "Lora" },
    aiBrief: `Iparág: vendéglátás (étterem, kávézó, bisztró).
- A hangulat ad el: a szövegek legyenek étvágygerjesztőek és személyesek.
- A "services" szekció itt az étlap-kiemeléseket jelenti (kategóriák vagy sztárfogások, árral).
- Az "offers" a napi menü / heti ajánlat helye.
- GYIK-témák: asztalfoglalás, nyitvatartás, allergének/vegetáriánus opciók, rendezvények, parkolás.
- A CTA asztalfoglalásra ösztönözzön.`,
    buildSections: () => [
      sec({ type: "hero", headline: "Ízek, amikért visszajársz", subheadline: "Friss alapanyagok, házias fogások és jó kávé — várunk egy asztalnál.", ctaText: "Asztalfoglalás", ctaUrl: "#kapcsolat", layout: "center" }),
      sec({ type: "about", title: "A mi történetünk", text: "Konyhánk a hagyományos ízekre épül, de nem fél újítani. Az alapanyagokat helyi termelőktől szerezzük be, a desszertek házilag készülnek. Nálunk az étel nem csak étel: vendéglátás, ahogy azt otthon megszoktad.", layout: "text-right" }),
      sec({ type: "services", title: "Étlapunk kedvencei", subtitle: "A teljes étlapot a helyszínen vagy üzenetben kérheted", columns: 3, items: [
        { name: "Házi húsleves", description: "Gazdagon, cérnametélttel, ahogy a nagymama készítette.", price: "1 890 Ft", icon: "utensils" },
        { name: "Séf ajánlata", description: "Hetente változó főfogás szezonális alapanyagokból.", price: "3 490 Ft", icon: "star" },
        { name: "Házi desszertek", description: "Naponta frissen készült sütemények és torták.", price: "1 190 Ft-tól", icon: "heart" },
      ]}),
      sec({ type: "offers", title: "Napi menü", subtitle: "Hétköznap 11:30–15:00 között", items: [
        { title: "Kétfogásos napi menü", description: "Leves + főétel, naponta változó kínálattal. Kövesd Facebook-oldalunkat a heti menüért!", discountPrice: "2 190 Ft", badge: "NAPI" },
      ]}),
      sec({ type: "gallery", title: "Hangulat és fogások", columns: 3, images: [] }),
      sec({ type: "testimonials", title: "Vendégeink mondták", items: [
        { name: "Kiss Judit", text: "A húsleves olyan, mint otthon, a kiszolgálás pedig kedves és gyors. A család kedvenc vasárnapi helye lett.", rating: 5 },
        { name: "Horváth Márk", text: "Céges ebédre kerestünk helyet — azóta minden héten itt vagyunk. Ár-érték arányban verhetetlen.", rating: 5 },
      ]}),
      sec({ type: "faq", title: "Jó, ha tudod", items: [
        { question: "Kell asztalt foglalni?", answer: "Hétvégén és ünnepnapokon mindenképp ajánljuk. Telefonon vagy az űrlapon keresztül foglalhatsz." },
        { question: "Van vegetáriánus / gluténmentes opció?", answer: "Igen, étlapunkon mindig találsz vegetáriánus fogást, és több ételünk kérhető gluténmentesen. Allergén-kérdésben bátran kérdezd kollégáinkat." },
        { question: "Vállaltok rendezvényeket?", answer: "Igen — születésnap, családi esemény, céges vacsora esetén kérj egyedi ajánlatot." },
      ]}),
      sec({ type: "cta", headline: "Foglalj asztalt még ma", text: "Egy jó ebéd vagy vacsora csak egy üzenetnyire van.", buttonText: "Asztalfoglalás", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat és foglalás", text: "Írd meg, hány főre és mikorra foglalnál — visszaigazolást küldünk.", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Telefonszám", type: "tel", required: true },
        { label: "Időpont és létszám", type: "textarea", required: true },
      ]}),
    ],
  },

  wellness: {
    id: "wellness",
    label: "Masszőr / Wellness",
    icon: "🌿",
    description: "Kezelések, árak, nyugodt hangvétel",
    businessTypeLabel: "masszázs / wellness szolgáltatás",
    palette: "forest",
    fonts: { heading: "Lora", body: "Open Sans" },
    aiBrief: `Iparág: masszázs, wellness, testkezelések.
- A hangnem nyugodt, megnyugtató, de konkrét — a vendég tudni akarja, mit kap és mennyiért.
- Tipikus kezelések: svédmasszázs, frissítő masszázs, hátmasszázs, talpmasszázs, sportmasszázs — időtartammal és árral.
- A "pricing" szekcióban bérletek jelenhetnek meg (pl. 5 alkalmas kedvezménnyel).
- GYIK-témák: mire számíts az első alkalommal, milyen panaszokra ajánlott, mit hozzon magával, lemondási feltételek.
- A CTA időpontfoglalásra ösztönözzön.`,
    buildSections: () => [
      sec({ type: "hero", headline: "Engedd el a feszültséget", subheadline: "Személyre szabott masszázs és testkezelések — mert a pihenés nem luxus, hanem szükséglet.", ctaText: "Időpontfoglalás", ctaUrl: "#kapcsolat", layout: "center" }),
      sec({ type: "services", title: "Kezeléseink", columns: 3, items: [
        { name: "Frissítő masszázs", description: "Teljes testes átmozgató masszázs a hétköznapi stressz ellen. 60 perc.", price: "12 000 Ft", icon: "heart" },
        { name: "Hát-nyak-váll masszázs", description: "Célzott kezelés ülőmunkából adódó panaszokra. 30 perc.", price: "7 000 Ft", icon: "zap" },
        { name: "Talpmasszázs", description: "Reflexzónás talpkezelés a teljes test ellazításáért. 45 perc.", price: "9 000 Ft", icon: "star" },
      ]}),
      sec({ type: "pricing", title: "Bérletek", subtitle: "Rendszeres vendégeinknek kedvezményes csomagok", plans: [
        { name: "5 alkalmas bérlet", price: "54 000 Ft", period: "60 perces frissítő masszázs", features: ["10% kedvezmény", "3 hónapig felhasználható", "Átruházható"], highlighted: true, ctaText: "Érdekel" },
        { name: "10 alkalmas bérlet", price: "102 000 Ft", period: "60 perces frissítő masszázs", features: ["15% kedvezmény", "6 hónapig felhasználható", "Átruházható"], highlighted: false, ctaText: "Érdekel" },
      ]}),
      sec({ type: "about", title: "Rólam", text: "Képzett masszőrként hiszem, hogy minden test más — ezért minden kezelés egyéni állapotfelméréssel kezdődik. Célom nem csak a pillanatnyi ellazulás, hanem hogy hosszú távon jobban érezd magad a bőrödben.", layout: "text-left" }),
      sec({ type: "testimonials", title: "Vendégeim mondták", items: [
        { name: "Varga Eszter", text: "Hetek óta fájt a nyakam az irodai munkától — két kezelés után úgy éreztem, kicseréltek. Azóta havonta jövök.", rating: 5 },
        { name: "Balogh Dániel", text: "Sportolóként rendszeresen járok ide. Profi, alapos, és mindig az aktuális állapotomhoz igazítja a kezelést.", rating: 5 },
      ]}),
      sec({ type: "faq", title: "Gyakori kérdések", items: [
        { question: "Mire számítsak az első alkalommal?", answer: "Rövid állapotfelméréssel kezdünk: átbeszéljük a panaszaidat és a célod, ezután következik a kezelés. Az első alkalom kb. 15 perccel hosszabb." },
        { question: "Mit hozzak magammal?", answer: "Semmit — törölközőt, lepedőt mi biztosítunk. Kényelmes ruhában gyere, és ha teheted, a kezelés után hagyj időt a pihenésre." },
        { question: "Milyen panaszokra ajánlott a masszázs?", answer: "Izomfeszültség, ülőmunkából adódó hát- és nyakfájdalom, stressz, alvásproblémák esetén kifejezetten hatásos. Komolyabb panasz esetén kérd ki orvosod véleményét." },
      ]}),
      sec({ type: "cta", headline: "Adj magadnak egy órát", text: "A legjobb befektetés az, amit a saját egészségedbe teszel.", buttonText: "Időpontot foglalok", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat", text: "Írj üzenetet, és 24 órán belül visszajelzek a szabad időpontokkal.", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Telefonszám", type: "tel", required: true },
        { label: "Melyik kezelés érdekel, és mikor érnél rá?", type: "textarea", required: true },
      ]}),
    ],
  },

  iparos: {
    id: "iparos",
    label: "Villanyszerelő / Víz-gáz / Iparos",
    icon: "⚡",
    description: "Szolgáltatások, gyors elérés, referencia-számok",
    businessTypeLabel: "iparos szolgáltatás (villanyszerelés, víz-gáz-fűtés, egyéb szakipari munka)",
    palette: "ocean",
    fonts: { heading: "Montserrat", body: "Inter" },
    aiBrief: `Iparág: szakipari szolgáltatás (villanyszerelő, víz-gáz-fűtés szerelő, burkoló, festő stb.).
- A megrendelő gyors, megbízható szakembert keres — a szöveg legyen rövid, egyenes, bizalomépítő.
- Kulcsüzenetek: pontos érkezés, tiszta munkavégzés, garancia, ingyenes felmérés/árajánlat.
- Statisztikák: év tapasztalat, elvégzett munkák, kiszállási idő.
- GYIK-témák: mennyibe kerül a kiszállás, mikor tud jönni, ad-e számlát és garanciát, vállal-e sürgős/hibaelhárítási munkát.
- A CTA azonnali kapcsolatfelvételre ösztönözzön (telefon kiemelten).`,
    buildSections: () => [
      sec({ type: "hero", headline: "Megbízható szakember, egy hívásra", subheadline: "Pontos érkezés, korrekt árajánlat, garancia a munkára. Hívj, és megbeszéljük, miben segíthetek.", ctaText: "Hívj most", ctaUrl: "#kapcsolat", layout: "left" }),
      sec({ type: "services", title: "Miben segíthetek?", columns: 3, items: [
        { name: "Hibaelhárítás", description: "Gyors kiszállás, a hiba feltárása és javítása akár aznap.", price: "kiszállás: 8 000 Ft-tól", icon: "zap" },
        { name: "Felújítás, korszerűsítés", description: "Teljes körű kivitelezés lakásfelújításnál, ingyenes felméréssel.", price: "egyedi árajánlat", icon: "hammer" },
        { name: "Karbantartás", description: "Rendszeres átvizsgálás, hogy a nagyobb hibát megelőzzük.", price: "egyedi árajánlat", icon: "wrench" },
      ]}),
      sec({ type: "stats", items: [
        { value: "10+ év", label: "Tapasztalat" },
        { value: "1 000+", label: "Elvégzett munka" },
        { value: "48 órán belül", label: "Kiszállás" },
      ]}),
      sec({ type: "about", title: "Miért engem hívj?", text: "Azt vallom, hogy a jó munka önmagáért beszél: időben érkezem, tisztán dolgozom, és annyit kérek, amennyiben megegyeztünk. Minden munkámra számlát adok és garanciát vállalok. A legtöbb új megrendelőm ajánlás útján talál meg — szerintem ez a legjobb referencia.", layout: "text-left" }),
      sec({ type: "testimonials", title: "Megrendelőim mondták", items: [
        { name: "Fekete Zoltán", text: "Pénteken hívtam, hétfőn jött, délre kész volt. Pontosan annyiba került, amennyit előre mondott. Ritka az ilyen.", rating: 5 },
        { name: "Molnár Ágnes", text: "A teljes lakásfelújításnál ő vitte a szakipari munkákat. Megbízható, precíz, és utána még a port is feltakarította.", rating: 5 },
      ]}),
      sec({ type: "faq", title: "Gyakori kérdések", items: [
        { question: "Mennyibe kerül a kiszállás?", answer: "A kiszállási díj a távolságtól függ — telefonon előre pontos összeget mondok. Ha megrendeled a munkát, a kiszállási díj az árba beszámít." },
        { question: "Mikor tudsz jönni?", answer: "Hibaelhárításnál általában 48 órán belül. Nagyobb munkáknál időpontot egyeztetünk, és azt tartom is." },
        { question: "Adsz számlát és garanciát?", answer: "Igen, minden munkámról számlát állítok ki, és garanciát vállalok az elvégzett munkára." },
      ]}),
      sec({ type: "cta", headline: "Ne halogasd a javítást", text: "A kis hibából lesz a nagy kár. Írj vagy hívj, és megnézzük, mielőtt drágább lenne.", buttonText: "Kapcsolatfelvétel", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat", text: "Írd le röviden, mire van szükséged — még aznap visszahívlak.", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Telefonszám", type: "tel", required: true },
        { label: "A munka rövid leírása", type: "textarea", required: true },
      ]}),
    ],
  },

  altalanos: {
    id: "altalanos",
    label: "Általános vállalkozás",
    icon: "💼",
    description: "Univerzális váz bármilyen tevékenységhez",
    businessTypeLabel: "vállalkozás",
    palette: "emerald",
    fonts: { heading: "Inter", body: "Inter" },
    aiBrief: `Iparág: a felhasználó által megadott tevékenység — ehhez igazítsd a teljes tartalmat.
- Építs a megadott szolgáltatásokra, és találj ki hihető, iparágba illő részleteket.
- GYIK-témák: árajánlatkérés menete, határidők, garancia/elégedettség, kapcsolatfelvétel.`,
    buildSections: () => [
      sec({ type: "hero", headline: "Üdvözlünk!", subheadline: "Röviden és tömören: ezt kínáljuk, és ezért érdemes minket választani.", ctaText: "Kapcsolatfelvétel", ctaUrl: "#kapcsolat", layout: "center" }),
      sec({ type: "services", title: "Szolgáltatásaink", columns: 3, items: [
        { name: "Szolgáltatás 1", description: "Rövid, lényegre törő leírás arról, mit kap az ügyfél.", price: "", icon: "check-circle" },
        { name: "Szolgáltatás 2", description: "Rövid, lényegre törő leírás arról, mit kap az ügyfél.", price: "", icon: "star" },
        { name: "Szolgáltatás 3", description: "Rövid, lényegre törő leírás arról, mit kap az ügyfél.", price: "", icon: "briefcase" },
      ]}),
      sec({ type: "about", title: "Rólunk", text: "Néhány mondat arról, kik vagyunk, mióta csináljuk, és miért csináljuk jól. A személyes történet bizalmat épít.", layout: "text-left" }),
      sec({ type: "stats", items: [
        { value: "100+", label: "Elégedett ügyfél" },
        { value: "5+ év", label: "Tapasztalat" },
      ]}),
      sec({ type: "testimonials", title: "Ügyfeleink mondták", items: [
        { name: "Elégedett Ügyfél", text: "Rövid, hiteles vélemény arról, milyen volt velünk dolgozni.", rating: 5 },
      ]}),
      sec({ type: "faq", title: "Gyakran ismételt kérdések", items: [
        { question: "Hogyan kérhetek árajánlatot?", answer: "Írj üzenetet az oldal alján található űrlapon, és 24 órán belül válaszolunk." },
        { question: "Milyen gyorsan tudtok kezdeni?", answer: "A pontos időzítést az igényeid felmérése után egyeztetjük." },
      ]}),
      sec({ type: "cta", headline: "Dolgozzunk együtt", text: "Vedd fel velünk a kapcsolatot, és megbeszéljük a részleteket.", buttonText: "Kapcsolatfelvétel", buttonUrl: "#kapcsolat" }),
      sec({ type: "contact", title: "Kapcsolat", text: "Keress minket bizalommal — hamarosan válaszolunk!", showForm: true, formFields: [
        { label: "Név", type: "text", required: true },
        { label: "Email", type: "email", required: true },
        { label: "Üzenet", type: "textarea", required: true },
      ]}),
    ],
  },
};

export const DEFAULT_TEMPLATE_ID = "altalanos";

export function getTemplate(id?: string): IndustryTemplate {
  return INDUSTRY_TEMPLATES[id || DEFAULT_TEMPLATE_ID] || INDUSTRY_TEMPLATES[DEFAULT_TEMPLATE_ID];
}

/** A sablon szekciótípus-sorrendje — az AI-promptban használjuk */
export function templateSectionPlan(template: IndustryTemplate): SectionType[] {
  return template.buildSections().map(s => s.type);
}
