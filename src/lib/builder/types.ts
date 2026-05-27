// === SITE DATA MODEL ===
// Flexibilis szekció-alapú rendszer — bármilyen sorrendben, bármennyi szekció.

export interface SiteData {
  templateId: string;
  globalStyles: GlobalStyles;
  meta: SiteMeta;
  business: BusinessInfo;
  footer: FooterConfig;
  sections: Section[];
}

export interface SiteMeta {
  title: string;
  description: string;
  ogImage?: string;
}

export interface FooterConfig {
  text?: string;
  socials: SocialLink[];
}

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube" | "linkedin" | "x" | "github" | "website";

// === GLOBAL STYLES ===

export interface GlobalStyles {
  colors: ColorPalette;
  fonts: FontSettings;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface FontSettings {
  heading: string;  // pl. "Inter", "Playfair Display"
  body: string;     // pl. "Inter", "Open Sans"
}

// === BUSINESS INFO ===

export interface BusinessInfo {
  name: string;
  tagline: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: string;
  logoUrl?: string;
}

// === SECTION SYSTEM ===

export type SectionType =
  | "hero"
  | "services"
  | "about"
  | "gallery"
  | "contact"
  | "testimonials"
  | "team"
  | "offers"
  | "faq"
  | "cta"
  | "stats"
  | "pricing"
  | "logos";

export interface SectionStyle {
  backgroundColor?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  paddingTop?: string;    // pl. "4rem"
  paddingBottom?: string;
  marginTop?: string;
  marginBottom?: string;
}

interface SectionBase {
  id: string;
  type: SectionType;
  enabled: boolean;
  style?: SectionStyle;
}

// --- HERO ---
export interface HeroSection extends SectionBase {
  type: "hero";
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  backgroundImageUrl?: string;
  layout: "left" | "center" | "right";
}

// --- SERVICES ---
export interface ServicesSection extends SectionBase {
  type: "services";
  title: string;
  subtitle?: string;
  items: Array<{
    name: string;
    description: string;
    price?: string;
    icon?: string;
  }>;
  columns: 2 | 3 | 4;
}

// --- ABOUT ---
export interface AboutSection extends SectionBase {
  type: "about";
  title: string;
  text: string;
  imageUrl?: string;
  layout: "text-left" | "text-right" | "text-only";
}

// --- GALLERY ---
export interface GallerySection extends SectionBase {
  type: "gallery";
  title: string;
  subtitle?: string;
  images: Array<{ url: string; alt: string }>;
  columns: 2 | 3 | 4;
}

// --- CONTACT ---
export interface ContactSection extends SectionBase {
  type: "contact";
  title: string;
  text: string;
  showForm: boolean;
  formEndpoint?: string; // Formspree endpoint, pl. "https://formspree.io/f/xxxxx"
  formFields: Array<{ label: string; type: "text" | "email" | "tel" | "textarea"; required: boolean }>;
}

// --- TESTIMONIALS ---
export interface TestimonialsSection extends SectionBase {
  type: "testimonials";
  title: string;
  subtitle?: string;
  items: Array<{
    name: string;
    role?: string;
    text: string;
    rating?: number; // 1-5
    imageUrl?: string;
  }>;
}

// --- TEAM ---
export interface TeamSection extends SectionBase {
  type: "team";
  title: string;
  subtitle?: string;
  members: Array<{
    name: string;
    role: string;
    bio?: string;
    imageUrl?: string;
    phone?: string;
    email?: string;
  }>;
}

// --- OFFERS / KIEMELT AJÁNLATOK ---
export interface OffersSection extends SectionBase {
  type: "offers";
  title: string;
  subtitle?: string;
  items: Array<{
    title: string;
    description: string;
    originalPrice?: string;
    discountPrice: string;
    badge?: string; // pl. "-20%", "ÚJ", "AKCIÓ"
    ctaText?: string;
  }>;
}

// --- FAQ ---
export interface FaqSection extends SectionBase {
  type: "faq";
  title: string;
  subtitle?: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

// --- CTA BANNER ---
export interface CtaSection extends SectionBase {
  type: "cta";
  headline: string;
  text: string;
  buttonText: string;
  buttonUrl: string;
  backgroundColorOverride?: string;
}

// --- STATS / SZÁMOK ---
export interface StatsSection extends SectionBase {
  type: "stats";
  title?: string;
  items: Array<{
    value: string;  // pl. "500+", "10 év"
    label: string;  // pl. "Elégedett ügyfél"
  }>;
}

// --- PRICING / ÁRAZÁS ---
export interface PricingSection extends SectionBase {
  type: "pricing";
  title: string;
  subtitle?: string;
  plans: Array<{
    name: string;
    price: string;
    period?: string; // pl. "/hó", "/alkalom"
    features: string[];
    highlighted: boolean;
    ctaText: string;
  }>;
}

// --- PARTNER LOGOS ---
export interface LogosSection extends SectionBase {
  type: "logos";
  title?: string;
  logos: Array<{
    url: string;
    alt: string;
    linkUrl?: string;
  }>;
}

export type Section =
  | HeroSection
  | ServicesSection
  | AboutSection
  | GallerySection
  | ContactSection
  | TestimonialsSection
  | TeamSection
  | OffersSection
  | FaqSection
  | CtaSection
  | StatsSection
  | PricingSection
  | LogosSection;

// === SECTION REGISTRY ===
// UI-hoz: szekciótípus metaadatok

export const SECTION_REGISTRY: Record<SectionType, { label: string; icon: string; description: string }> = {
  hero: { label: "Hero / Főszekció", icon: "🏠", description: "Főcím, alcím, CTA gomb" },
  services: { label: "Szolgáltatások", icon: "⚙️", description: "Szolgáltatások kártyái" },
  about: { label: "Rólunk", icon: "ℹ️", description: "Bemutatkozás szöveggel és képpel" },
  gallery: { label: "Galéria", icon: "🖼️", description: "Képgaléria rács elrendezésben" },
  contact: { label: "Kapcsolat", icon: "📧", description: "Elérhetőségek és kapcsolatfelvételi űrlap" },
  testimonials: { label: "Vélemények", icon: "⭐", description: "Ügyfélvélemények és értékelések" },
  team: { label: "Csapat", icon: "👥", description: "Csapattagok bemutatása" },
  offers: { label: "Kiemelt ajánlatok", icon: "🏷️", description: "Akciók, kedvezmények kiemelése" },
  faq: { label: "GYIK", icon: "❓", description: "Gyakran ismételt kérdések" },
  cta: { label: "CTA Banner", icon: "📢", description: "Figyelemfelkeltő cselekvésre ösztönző sáv" },
  stats: { label: "Statisztikák", icon: "📊", description: "Számok, eredmények kiemelése" },
  pricing: { label: "Árazás", icon: "💰", description: "Árcsomagok összehasonlítása" },
  logos: { label: "Partner logók", icon: "🤝", description: "Referenciák, partnerek logói" },
};

// === DEFAULT SECTION FACTORIES ===

export function createDefaultSection(type: SectionType): Section {
  const base = { id: crypto.randomUUID(), enabled: true, style: {} };

  switch (type) {
    case "hero":
      return { ...base, type: "hero", headline: "Üdvözöljük", subheadline: "Rövid bemutatkozás ide", ctaText: "Kapcsolatfelvétel", ctaUrl: "#kapcsolat", layout: "center" };
    case "services":
      return { ...base, type: "services", title: "Szolgáltatásaink", items: [{ name: "Szolgáltatás", description: "Leírás ide", price: "" }], columns: 3 };
    case "about":
      return { ...base, type: "about", title: "Rólunk", text: "Bemutatkozás szövege ide kerül.", layout: "text-left" };
    case "gallery":
      return { ...base, type: "gallery", title: "Galéria", images: [], columns: 3 };
    case "contact":
      return { ...base, type: "contact", title: "Kapcsolat", text: "Keressen minket bizalommal!", showForm: true, formFields: [{ label: "Név", type: "text", required: true }, { label: "Email", type: "email", required: true }, { label: "Üzenet", type: "textarea", required: true }] };
    case "testimonials":
      return { ...base, type: "testimonials", title: "Ügyfeleink mondták", items: [{ name: "Ügyfél neve", text: "Vélemény szövege ide kerül.", rating: 5 }] };
    case "team":
      return { ...base, type: "team", title: "Csapatunk", members: [{ name: "Név", role: "Pozíció" }] };
    case "offers":
      return { ...base, type: "offers", title: "Aktuális ajánlataink", items: [{ title: "Ajánlat neve", description: "Leírás", discountPrice: "", badge: "AKCIÓ" }] };
    case "faq":
      return { ...base, type: "faq", title: "Gyakran ismételt kérdések", items: [{ question: "Kérdés?", answer: "Válasz." }] };
    case "cta":
      return { ...base, type: "cta", headline: "Készen áll?", text: "Vegye fel velünk a kapcsolatot még ma!", buttonText: "Kapcsolatfelvétel", buttonUrl: "#kapcsolat" };
    case "stats":
      return { ...base, type: "stats", items: [{ value: "100+", label: "Elégedett ügyfél" }, { value: "5 év", label: "Tapasztalat" }] };
    case "pricing":
      return { ...base, type: "pricing", title: "Áraink", plans: [{ name: "Alap", price: "10 000 Ft", features: ["Feature 1"], highlighted: false, ctaText: "Választom" }] };
    case "logos":
      return { ...base, type: "logos", logos: [] };
  }
}

// === COLOR PALETTES ===

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  emerald: {
    primary: "#059669", secondary: "#0d9488", accent: "#f59e0b",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  blue: {
    primary: "#2563eb", secondary: "#3b82f6", accent: "#f97316",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  rose: {
    primary: "#e11d48", secondary: "#f43f5e", accent: "#8b5cf6",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  amber: {
    primary: "#d97706", secondary: "#f59e0b", accent: "#059669",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  light: {
    primary: "#059669", secondary: "#0d9488", accent: "#f59e0b",
    background: "#ffffff", surface: "#f4f4f5", text: "#18181b", textMuted: "#71717a",
  },
  ocean: {
    primary: "#0891b2", secondary: "#06b6d4", accent: "#f43f5e",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  purple: {
    primary: "#7c3aed", secondary: "#8b5cf6", accent: "#f59e0b",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
  forest: {
    primary: "#15803d", secondary: "#22c55e", accent: "#eab308",
    background: "#0a0a0a", surface: "#18181b", text: "#e4e4e7", textMuted: "#a1a1aa",
  },
};

// === FONT OPTIONS ===

export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (modern)" },
  { value: "Open Sans", label: "Open Sans (olvasható)" },
  { value: "Roboto", label: "Roboto (tiszta)" },
  { value: "Playfair Display", label: "Playfair Display (elegáns)" },
  { value: "Montserrat", label: "Montserrat (geometrikus)" },
  { value: "Lora", label: "Lora (serif, klasszikus)" },
  { value: "Poppins", label: "Poppins (kerekded)" },
  { value: "Raleway", label: "Raleway (könnyű)" },
];

// === SOCIAL PLATFORMS ===

export const SOCIAL_PLATFORMS: Record<SocialPlatform, { label: string; icon: string }> = {
  facebook: { label: "Facebook", icon: "fb" },
  instagram: { label: "Instagram", icon: "ig" },
  tiktok: { label: "TikTok", icon: "tt" },
  youtube: { label: "YouTube", icon: "yt" },
  linkedin: { label: "LinkedIn", icon: "li" },
  x: { label: "X (Twitter)", icon: "x" },
  github: { label: "GitHub", icon: "gh" },
  website: { label: "Weboldal", icon: "web" },
};

// === SERVICE ICONS ===

export const SERVICE_ICON_OPTIONS = [
  { value: "", label: "Nincs" },
  { value: "scissors", label: "Olló" },
  { value: "car", label: "Autó" },
  { value: "utensils", label: "Étkezés" },
  { value: "heart", label: "Szív" },
  { value: "hammer", label: "Kalapács" },
  { value: "book", label: "Könyv" },
  { value: "camera", label: "Kamera" },
  { value: "star", label: "Csillag" },
  { value: "clock", label: "Óra" },
  { value: "shield", label: "Pajzs" },
  { value: "zap", label: "Villám" },
  { value: "users", label: "Csapat" },
  { value: "phone", label: "Telefon" },
  { value: "mail", label: "Email" },
  { value: "map-pin", label: "Helyszín" },
  { value: "gift", label: "Ajándék" },
  { value: "truck", label: "Szállítás" },
  { value: "wifi", label: "WiFi" },
  { value: "wrench", label: "Csavarkulcs" },
  { value: "palette", label: "Paletta" },
  { value: "music", label: "Zene" },
  { value: "home", label: "Ház" },
  { value: "briefcase", label: "Aktatáska" },
  { value: "check-circle", label: "Pipa" },
];
