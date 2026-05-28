import type {
  SiteData, Section, SectionStyle, ColorPalette,
  HeroSection, ServicesSection, AboutSection, GallerySection,
  ContactSection, TestimonialsSection, TeamSection, OffersSection,
  FaqSection, CtaSection, StatsSection, PricingSection, LogosSection,
} from "./types";
import { getIcon, getSocialIcon } from "./icons";

export interface RenderOptions {
  editable?: boolean;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function sectionStyleAttr(s?: SectionStyle): string {
  if (!s) return "";
  const parts: string[] = [];
  if (s.backgroundColor) parts.push(`background-color:${s.backgroundColor}`);
  if (s.textColor) parts.push(`color:${s.textColor}`);
  if (s.textAlign) parts.push(`text-align:${s.textAlign}`);
  if (s.paddingTop) parts.push(`padding-top:${s.paddingTop}`);
  if (s.paddingBottom) parts.push(`padding-bottom:${s.paddingBottom}`);
  if (s.marginTop) parts.push(`margin-top:${s.marginTop}`);
  if (s.marginBottom) parts.push(`margin-bottom:${s.marginBottom}`);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

function ea(path: string, editable: boolean): string {
  return editable ? ` data-edit="${path}"` : "";
}

function stars(rating: number): string {
  return "★".repeat(Math.min(rating, 5)) + "☆".repeat(Math.max(0, 5 - rating));
}

// === SECTION RENDERERS ===

function renderHero(s: HeroSection, b: SiteData["business"], e = false): string {
  const align = s.style?.textAlign || (s.layout === "center" ? "center" : s.layout === "right" ? "right" : "left");
  const styleParts: string[] = [];
  if (s.backgroundImageUrl) {
    styleParts.push(`background-image:url('${esc(s.backgroundImageUrl)}');background-size:cover;background-position:center`);
  }
  if (s.style?.backgroundColor) styleParts.push(`background-color:${s.style.backgroundColor}`);
  if (s.style?.textColor) styleParts.push(`color:${s.style.textColor}`);
  if (s.style?.paddingTop) styleParts.push(`padding-top:${s.style.paddingTop}`);
  if (s.style?.paddingBottom) styleParts.push(`padding-bottom:${s.style.paddingBottom}`);
  if (s.style?.marginTop) styleParts.push(`margin-top:${s.style.marginTop}`);
  if (s.style?.marginBottom) styleParts.push(`margin-bottom:${s.style.marginBottom}`);
  const styleAttr = styleParts.length ? ` style="${styleParts.join(";")}"` : "";
  // Ha van háttérkép, overlay gradiens kell; ha nincs, a háttérszín közvetlenül érvényesül
  const hasImage = !!s.backgroundImageUrl;
  return `
  <section class="sec sec-hero${hasImage ? "" : " no-bg-image"}"${styleAttr}>
    <div class="${hasImage ? "hero-overlay" : "hero-content"}">
      <div class="container" style="text-align:${align}">
        ${b.logoUrl ? `<img src="${esc(b.logoUrl)}" alt="${esc(b.name)}" class="logo">` : ""}
        <h1${ea("headline",e)}>${esc(s.headline)}</h1>
        <p class="subtitle"${ea("subheadline",e)}>${esc(s.subheadline)}</p>
        <a href="${esc(s.ctaUrl || "#kapcsolat")}" class="btn"${ea("ctaText",e)}>${esc(s.ctaText)}</a>
      </div>
    </div>
  </section>`;
}

function renderServices(s: ServicesSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="grid cols-${s.columns || 3}">
        ${s.items.map((i,idx) => `
          <div class="card">
            ${i.icon ? `<div class="card-icon">${getIcon(i.icon) || esc(i.icon)}</div>` : ""}
            <h3${ea(`items.${idx}.name`,e)}>${esc(i.name)}</h3>
            <p${ea(`items.${idx}.description`,e)}>${esc(i.description)}</p>
            ${i.price ? `<div class="price"${ea(`items.${idx}.price`,e)}>${esc(i.price)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderAbout(s: AboutSection, e = false): string {
  const cls = s.layout === "text-right" ? "about-layout reverse" : s.layout === "text-only" ? "about-layout text-only" : "about-layout";
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container ${cls}">
      <div class="about-text">
        <h2${ea("title",e)}>${esc(s.title)}</h2>
        <p${ea("text",e)}>${esc(s.text)}</p>
      </div>
      ${s.imageUrl && s.layout !== "text-only" ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.title)}" class="about-img">` : ""}
    </div>
  </section>`;
}

function renderGallery(s: GallerySection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle">${esc(s.subtitle)}</p>` : ""}
      <div class="gallery-grid cols-${s.columns || 3}">
        ${s.images.map(img => `<img src="${esc(img.url)}" alt="${esc(img.alt)}" loading="lazy">`).join("")}
      </div>
    </div>
  </section>`;
}

function renderContact(s: ContactSection, b: SiteData["business"], e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      <p class="sec-subtitle"${ea("text",e)}>${esc(s.text)}</p>
      <div class="contact-grid">
        <div class="contact-info">
          ${b.phone ? `<div class="contact-item"><strong>Telefon:</strong> <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></div>` : ""}
          ${b.email ? `<div class="contact-item"><strong>Email:</strong> <a href="mailto:${esc(b.email)}">${esc(b.email)}</a></div>` : ""}
          ${b.address ? `<div class="contact-item"><strong>Cím:</strong> ${esc(b.address)}</div>` : ""}
          ${b.openingHours ? `<div class="contact-item"><strong>Nyitvatartás:</strong> ${esc(b.openingHours)}</div>` : ""}
        </div>
        ${s.showForm ? `
          <form class="contact-form" ${s.formEndpoint ? `action="${esc(s.formEndpoint)}" method="POST"` : 'onsubmit="event.preventDefault();alert(\'Kapcsolatfelvételi űrlap — állítsd be a Formspree endpoint-ot a szerkesztőben.\')"'}>
            ${s.formFields.map(f => f.type === "textarea"
              ? `<textarea name="${esc(f.label.toLowerCase())}" placeholder="${esc(f.label)}" rows="4" ${f.required ? "required" : ""}></textarea>`
              : `<input type="${f.type}" name="${esc(f.label.toLowerCase())}" placeholder="${esc(f.label)}" ${f.required ? "required" : ""}>`
            ).join("")}
            <button type="submit" class="btn">Küldés</button>
          </form>
          ${!s.formEndpoint ? '<p style="text-align:center;font-size:.75rem;color:var(--c-muted);margin-top:.5rem">Az űrlap Formspree-vel működik — állítsd be a szerkesztőben.</p>' : ""}
        ` : ""}
      </div>
    </div>
  </section>`;
}

function renderTestimonials(s: TestimonialsSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="grid cols-2">
        ${s.items.map((t,idx) => `
          <div class="testimonial-card">
            ${t.rating ? `<div class="stars">${stars(t.rating)}</div>` : ""}
            <blockquote${ea(`items.${idx}.text`,e)}>"${esc(t.text)}"</blockquote>
            <div class="testimonial-author">
              ${t.imageUrl ? `<img src="${esc(t.imageUrl)}" alt="${esc(t.name)}" class="avatar">` : ""}
              <div>
                <strong${ea(`items.${idx}.name`,e)}>${esc(t.name)}</strong>
                ${t.role ? `<span${ea(`items.${idx}.role`,e)}>${esc(t.role)}</span>` : ""}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderTeam(s: TeamSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="grid cols-3">
        ${s.members.map((m,idx) => `
          <div class="team-card">
            ${m.imageUrl ? `<img src="${esc(m.imageUrl)}" alt="${esc(m.name)}" class="team-img">` : `<div class="team-img-placeholder"></div>`}
            <h3${ea(`members.${idx}.name`,e)}>${esc(m.name)}</h3>
            <div class="team-role"${ea(`members.${idx}.role`,e)}>${esc(m.role)}</div>
            ${m.bio ? `<p${ea(`members.${idx}.bio`,e)}>${esc(m.bio)}</p>` : ""}
            <div class="team-contact">
              ${m.phone ? `<a href="tel:${esc(m.phone)}">${esc(m.phone)}</a>` : ""}
              ${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderOffers(s: OffersSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="grid cols-3">
        ${s.items.map((o,idx) => `
          <div class="offer-card">
            ${o.badge ? `<div class="offer-badge"${ea(`items.${idx}.badge`,e)}>${esc(o.badge)}</div>` : ""}
            <h3${ea(`items.${idx}.title`,e)}>${esc(o.title)}</h3>
            <p${ea(`items.${idx}.description`,e)}>${esc(o.description)}</p>
            <div class="offer-pricing">
              ${o.originalPrice ? `<span class="original-price">${esc(o.originalPrice)}</span>` : ""}
              <span class="discount-price"${ea(`items.${idx}.discountPrice`,e)}>${esc(o.discountPrice)}</span>
            </div>
            ${o.ctaText ? `<a href="#kapcsolat" class="btn btn-sm">${esc(o.ctaText)}</a>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderFaq(s: FaqSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="faq-list">
        ${s.items.map((f,idx) => `
          <details class="faq-item">
            <summary${ea(`items.${idx}.question`,e)}>${esc(f.question)}</summary>
            <p${ea(`items.${idx}.answer`,e)}>${esc(f.answer)}</p>
          </details>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderCta(s: CtaSection, contactHref: string, e = false): string {
  const bg = s.backgroundColorOverride ? `background:${s.backgroundColorOverride}` : "background:var(--c-primary)";
  const href = s.buttonUrl && s.buttonUrl !== "#kapcsolat" ? s.buttonUrl : contactHref;
  return `
  <section class="sec sec-cta" style="${bg}"${sectionStyleAttr(s.style)}>
    <div class="container" style="text-align:center">
      <h2 style="color:#fff"${ea("headline",e)}>${esc(s.headline)}</h2>
      <p style="color:rgba(255,255,255,0.8);margin-bottom:2rem"${ea("text",e)}>${esc(s.text)}</p>
      <a href="${esc(href)}" class="btn btn-white"${ea("buttonText",e)}>${esc(s.buttonText)}</a>
    </div>
  </section>`;
}

function renderStats(s: StatsSection, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      ${s.title ? `<h2${ea("title",e)}>${esc(s.title)}</h2>` : ""}
      <div class="stats-grid">
        ${s.items.map((st,idx) => `
          <div class="stat-item">
            <div class="stat-value"${ea(`items.${idx}.value`,e)}>${esc(st.value)}</div>
            <div class="stat-label"${ea(`items.${idx}.label`,e)}>${esc(st.label)}</div>
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderPricing(s: PricingSection, contactHref: string, e = false): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      <h2${ea("title",e)}>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sec-subtitle"${ea("subtitle",e)}>${esc(s.subtitle)}</p>` : ""}
      <div class="pricing-grid">
        ${s.plans.map((p,idx) => `
          <div class="pricing-card ${p.highlighted ? "highlighted" : ""}">
            <h3${ea(`plans.${idx}.name`,e)}>${esc(p.name)}</h3>
            <div class="pricing-price"${ea(`plans.${idx}.price`,e)}>${esc(p.price)}</div>
            ${p.period ? `<div class="pricing-period">${esc(p.period)}</div>` : ""}
            <ul>
              ${p.features.map(f => `<li>${esc(f)}</li>`).join("")}
            </ul>
            <a href="${contactHref}" class="btn ${p.highlighted ? "" : "btn-outline"}">${esc(p.ctaText)}</a>
          </div>
        `).join("")}
      </div>
    </div>
  </section>`;
}

function renderLogos(s: LogosSection): string {
  return `
  <section class="sec"${sectionStyleAttr(s.style)}>
    <div class="container">
      ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
      <div class="logos-grid">
        ${s.logos.map(l => `
          ${l.linkUrl ? `<a href="${esc(l.linkUrl)}" target="_blank" rel="noopener">` : ""}
          <img src="${esc(l.url)}" alt="${esc(l.alt)}" class="partner-logo">
          ${l.linkUrl ? "</a>" : ""}
        `).join("")}
      </div>
    </div>
  </section>`;
}

function findContactId(data: SiteData): string {
  const contact = data.sections.find(s => s.type === "contact");
  return contact ? `#s-${contact.id}` : "#";
}

function renderSection(sec: Section, data: SiteData, e = false): string {
  if (!sec.enabled) return "";
  const contactHref = findContactId(data);
  switch (sec.type) {
    case "hero": return renderHero(sec, data.business, e);
    case "services": return renderServices(sec, e);
    case "about": return renderAbout(sec, e);
    case "gallery": return renderGallery(sec, e);
    case "contact": return renderContact(sec, data.business, e);
    case "testimonials": return renderTestimonials(sec, e);
    case "team": return renderTeam(sec, e);
    case "offers": return renderOffers(sec, e);
    case "faq": return renderFaq(sec, e);
    case "cta": return renderCta(sec, contactHref, e);
    case "stats": return renderStats(sec, e);
    case "pricing": return renderPricing(sec, contactHref, e);
    case "logos": return renderLogos(sec);
  }
}

// === NAV ===

function renderNav(data: SiteData): string {
  const b = data.business;
  const navItems = data.sections
    .filter(s => s.enabled && s.type !== "hero" && s.type !== "cta" && s.type !== "logos" && s.type !== "stats")
    .map(s => {
      const label = "title" in s ? (s as any).title : "";
      return label ? `<li><a href="#s-${s.id}">${esc(label)}</a></li>` : "";
    })
    .filter(Boolean);

  return `
  <nav>
    <div class="container">
      <a href="#" class="brand">${esc(b.name)}</a>
      <button class="nav-toggle" onclick="this.parentElement.parentElement.classList.toggle('open')">☰</button>
      <ul>${navItems.join("")}</ul>
    </div>
  </nav>`;
}

// === MAIN RENDER ===

export function renderSiteHtml(data: SiteData, opts: RenderOptions = {}): string {
  const editable = !!opts.editable;
  const p = data.globalStyles.colors;
  const f = data.globalStyles.fonts;
  const fontImport = [f.heading, f.body].filter(Boolean).map(fn => fn.replace(/ /g, "+")).join("&family=");

  const sectionsHtml = data.sections
    .map(sec => {
      const html = renderSection(sec, data, editable);
      if (!html) return "";
      return html.replace('<section class="sec', `<section id="s-${sec.id}" class="sec`);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(data.meta?.title || `${data.business.name} — ${data.business.tagline}`)}</title>
  <meta name="description" content="${esc(data.meta?.description || data.business.tagline)}">
  <meta property="og:title" content="${esc(data.meta?.title || data.business.name)}">
  <meta property="og:description" content="${esc(data.meta?.description || data.business.tagline)}">
  ${data.meta?.ogImage ? `<meta property="og:image" content="${esc(data.meta.ogImage)}">` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${fontImport}&display=swap" rel="stylesheet">
  <style>
    :root {
      --c-primary:${p.primary}; --c-secondary:${p.secondary}; --c-accent:${p.accent};
      --c-bg:${p.background}; --c-surface:${p.surface}; --c-text:${p.text}; --c-muted:${p.textMuted};
      --f-heading:'${f.heading}',sans-serif; --f-body:'${f.body}',sans-serif;
    }
    html{scroll-behavior:smooth}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:var(--f-body);background:var(--c-bg);color:var(--c-text);line-height:1.6}
    h1,h2,h3,h4{font-family:var(--f-heading)}
    .container{max-width:1100px;margin:0 auto;padding:0 1.5rem}

    /* NAV */
    nav{position:sticky;top:0;z-index:50;background:var(--c-surface);border-bottom:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);padding:1rem 0}
    nav .container{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
    nav .brand{font-weight:700;font-size:1.25rem;color:var(--c-primary);text-decoration:none;font-family:var(--f-heading)}
    nav ul{list-style:none;display:flex;gap:1.5rem;flex-wrap:wrap}
    nav a{color:var(--c-muted);text-decoration:none;font-size:.9rem;transition:color .2s}
    nav a:hover{color:var(--c-primary)}
    .nav-toggle{display:none;background:none;border:none;color:var(--c-text);font-size:1.5rem;cursor:pointer}
    @media(max-width:768px){
      .nav-toggle{display:block}
      nav ul{display:none;width:100%;flex-direction:column;gap:.5rem}
      nav.open ul{display:flex}
    }

    /* SECTIONS */
    .sec{padding:5rem 0}
    .sec h2{font-size:2rem;margin-bottom:1rem;text-align:center}
    .sec-subtitle{text-align:center;color:var(--c-muted);margin-bottom:2.5rem;max-width:600px;margin-left:auto;margin-right:auto}
    .sec:nth-child(even){background:var(--c-surface)}

    /* HERO */
    .sec-hero{min-height:70vh;display:flex;align-items:center;background-size:cover;background-position:center;padding:0}
    .hero-overlay{width:100%;padding:5rem 0;background:linear-gradient(to bottom,color-mix(in srgb,var(--c-bg) 75%,transparent),color-mix(in srgb,var(--c-bg) 92%,transparent))}
    .hero-content{width:100%;padding:5rem 0}
    .sec-hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin-bottom:1rem}
    .sec-hero .subtitle{font-size:1.2rem;color:var(--c-muted);margin-bottom:2rem;max-width:100%}
    .logo{height:60px;margin-bottom:1.5rem}

    /* BUTTONS */
    .btn{display:inline-block;padding:.75rem 2rem;background:var(--c-primary);color:#fff;border:none;border-radius:.5rem;font-size:1rem;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .2s}
    .btn:hover{opacity:.85}
    .btn-sm{padding:.5rem 1.5rem;font-size:.9rem}
    .btn-outline{background:transparent;border:2px solid var(--c-primary);color:var(--c-primary)}
    .btn-outline:hover{background:var(--c-primary);color:#fff}
    .btn-white{background:#fff;color:var(--c-primary)}

    /* GRID */
    .grid{display:grid;gap:1.5rem}
    .cols-2{grid-template-columns:repeat(2,1fr)}
    .cols-3{grid-template-columns:repeat(3,1fr)}
    .cols-4{grid-template-columns:repeat(4,1fr)}
    @media(max-width:768px){.cols-2,.cols-3,.cols-4{grid-template-columns:1fr}}
    .card{background:var(--c-bg);border:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);border-radius:.75rem;padding:2rem}
    .card h3{margin-bottom:.5rem;color:var(--c-primary)}
    .card .price{margin-top:1rem;font-weight:700;color:var(--c-accent);font-size:1.1rem}
    .card-icon{font-size:2rem;margin-bottom:1rem}

    /* ABOUT */
    .about-layout{display:flex;gap:3rem;align-items:center;flex-wrap:wrap}
    .about-layout.reverse{flex-direction:row-reverse}
    .about-text{flex:1;min-width:280px}
    .about-text h2{text-align:inherit}
    .about-img{width:100%;max-width:400px;border-radius:.75rem}
    .text-only .about-text{max-width:700px;margin:0 auto}
    .text-only .about-text h2{text-align:inherit}

    /* GALLERY */
    .gallery-grid{display:grid;gap:1rem}
    .gallery-grid.cols-2{grid-template-columns:repeat(2,1fr)}
    .gallery-grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .gallery-grid.cols-4{grid-template-columns:repeat(4,1fr)}
    @media(max-width:768px){.gallery-grid.cols-2,.gallery-grid.cols-3,.gallery-grid.cols-4{grid-template-columns:repeat(2,1fr)}}
    .gallery-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.5rem}

    /* CONTACT */
    .contact-grid{display:flex;gap:3rem;flex-wrap:wrap;justify-content:center}
    .contact-info{min-width:280px}
    .contact-item{padding:.5rem 0;border-bottom:1px solid color-mix(in srgb,var(--c-text) 10%,transparent)}
    .contact-item a{color:var(--c-primary);text-decoration:none}
    .contact-form{min-width:300px;flex:1;max-width:500px;display:flex;flex-direction:column;gap:1rem}
    .contact-form input,.contact-form textarea{padding:.75rem 1rem;border-radius:.5rem;border:1px solid color-mix(in srgb,var(--c-text) 15%,transparent);background:var(--c-bg);color:var(--c-text);font-size:1rem;font-family:var(--f-body)}

    /* TESTIMONIALS */
    .testimonial-card{background:var(--c-bg);border:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);border-radius:.75rem;padding:2rem}
    .testimonial-card blockquote{font-style:italic;margin-bottom:1rem;line-height:1.7}
    .testimonial-author{display:flex;align-items:center;gap:.75rem}
    .testimonial-author strong{display:block}
    .testimonial-author span{color:var(--c-muted);font-size:.85rem}
    .avatar{width:48px;height:48px;border-radius:50%;object-fit:cover}
    .stars{color:var(--c-accent);margin-bottom:.75rem;letter-spacing:2px}

    /* TEAM */
    .team-card{text-align:center;padding:2rem}
    .team-img{width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 1rem}
    .team-img-placeholder{width:120px;height:120px;border-radius:50%;background:color-mix(in srgb,var(--c-primary) 20%,transparent);margin:0 auto 1rem}
    .team-role{color:var(--c-primary);font-size:.9rem;margin-bottom:.5rem}
    .team-contact{margin-top:.75rem;font-size:.85rem}
    .team-contact a{color:var(--c-primary);text-decoration:none;margin:0 .25rem}

    /* OFFERS */
    .offer-card{background:var(--c-bg);border:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);border-radius:.75rem;padding:2rem;position:relative;overflow:hidden}
    .offer-badge{position:absolute;top:1rem;right:-2rem;background:var(--c-accent);color:#fff;font-size:.75rem;font-weight:700;padding:.25rem 2.5rem;transform:rotate(45deg)}
    .offer-card h3{margin-bottom:.5rem}
    .offer-pricing{margin:1rem 0}
    .original-price{text-decoration:line-through;color:var(--c-muted);margin-right:.5rem}
    .discount-price{font-size:1.5rem;font-weight:700;color:var(--c-accent)}

    /* FAQ */
    .faq-list{max-width:700px;margin:0 auto}
    .faq-item{border-bottom:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);padding:1rem 0}
    .faq-item summary{cursor:pointer;font-weight:600;font-size:1.05rem;list-style:none;display:flex;justify-content:space-between;align-items:center}
    .faq-item summary::after{content:"+";font-size:1.5rem;color:var(--c-primary)}
    .faq-item[open] summary::after{content:"−"}
    .faq-item p{margin-top:.75rem;color:var(--c-muted);line-height:1.7}

    /* CTA */
    .sec-cta{padding:4rem 0}
    .sec-cta h2{font-size:2rem}

    /* STATS */
    .stats-grid{display:flex;justify-content:center;gap:3rem;flex-wrap:wrap;margin-top:2rem}
    .stat-item{text-align:center}
    .stat-value{font-size:2.5rem;font-weight:800;color:var(--c-primary);font-family:var(--f-heading)}
    .stat-label{color:var(--c-muted);font-size:.9rem;margin-top:.25rem}

    /* PRICING */
    .pricing-grid{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap}
    .pricing-card{background:var(--c-bg);border:1px solid color-mix(in srgb,var(--c-text) 10%,transparent);border-radius:.75rem;padding:2.5rem 2rem;min-width:260px;max-width:340px;flex:1;text-align:center}
    .pricing-card.highlighted{border-color:var(--c-primary);transform:scale(1.05);box-shadow:0 0 30px color-mix(in srgb,var(--c-primary) 20%,transparent)}
    .pricing-price{font-size:2.5rem;font-weight:800;color:var(--c-primary);margin:.5rem 0}
    .pricing-period{color:var(--c-muted);font-size:.85rem;margin-bottom:1.5rem}
    .pricing-card ul{list-style:none;margin-bottom:2rem;text-align:left}
    .pricing-card li{padding:.4rem 0;border-bottom:1px solid color-mix(in srgb,var(--c-text) 5%,transparent)}
    .pricing-card li::before{content:"✓ ";color:var(--c-primary)}

    /* LOGOS */
    .logos-grid{display:flex;align-items:center;justify-content:center;gap:3rem;flex-wrap:wrap;margin-top:1rem}
    .partner-logo{height:40px;opacity:.6;transition:opacity .2s;filter:grayscale(100%)}
    .partner-logo:hover{opacity:1;filter:none}

    /* FOOTER */
    footer{padding:2rem 0;text-align:center;color:var(--c-muted);font-size:.85rem;border-top:1px solid color-mix(in srgb,var(--c-text) 10%,transparent)}
    .footer-socials{display:flex;justify-content:center;gap:1rem;margin-bottom:1rem}
    .social-icon{color:var(--c-muted);transition:color .2s;display:inline-flex}
    .social-icon:hover{color:var(--c-primary)}
    .card-icon{color:var(--c-primary)}

    /* RESPONSIVE */
    @media(max-width:768px){
      .sec{padding:3rem 0}
      .about-layout,.about-layout.reverse{flex-direction:column}
      .about-img{max-width:100%}
      .contact-grid{flex-direction:column}
      .pricing-card.highlighted{transform:none}
      .stats-grid{gap:2rem}
    }
  </style>
</head>
<body>
  ${renderNav(data)}
  ${sectionsHtml}
  <footer>
    <div class="container">
      ${data.footer?.socials?.length ? `
        <div class="footer-socials">
          ${data.footer.socials.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="social-icon" title="${esc(s.platform)}">${getSocialIcon(s.platform === "x" ? "x" : s.platform === "facebook" ? "fb" : s.platform === "instagram" ? "ig" : s.platform === "tiktok" ? "tt" : s.platform === "youtube" ? "yt" : s.platform === "linkedin" ? "li" : s.platform === "github" ? "gh" : "web")}</a>`).join("")}
        </div>
      ` : ""}
      ${data.footer?.text ? `<p style="margin-bottom:.5rem">${esc(data.footer.text)}</p>` : ""}
      <p>&copy; ${new Date().getFullYear()} ${esc(data.business.name)}. Minden jog fenntartva.</p>
      <p style="margin-top:.5rem;font-size:.75rem;color:var(--c-muted)">Készítette: <a href="https://nexus.conendigital.hu" style="color:var(--c-primary);text-decoration:none">NEXUS</a></p>
    </div>
  </footer>
${editable ? `
<style>
  [data-edit]{outline:1px dashed transparent;outline-offset:2px;transition:outline-color .15s;cursor:text;min-width:1em;min-height:1em}
  [data-edit]:hover{outline-color:color-mix(in srgb,var(--c-primary) 50%,transparent)}
  [data-edit]:focus{outline:2px solid var(--c-primary);outline-offset:2px;background:color-mix(in srgb,var(--c-primary) 5%,transparent)}
</style>
<script>
(function(){
  var active=null;
  function sid(el){var s=el.closest('[id^="s-"]');return s?s.id.slice(2):null}
  document.addEventListener('click',function(ev){
    var t=ev.target.closest('[data-edit]');
    if(!t)return;
    ev.preventDefault();
    ev.stopPropagation();
    if(active===t)return;
    if(active)commit(active);
    active=t;
    t.contentEditable='true';
    t.focus();
    var r=document.createRange();r.selectNodeContents(t);r.collapse(false);
    var s=window.getSelection();s.removeAllRanges();s.addRange(r);
  });
  function commit(el){
    var id=sid(el),p=el.getAttribute('data-edit'),v=el.innerText.trim();
    el.contentEditable='false';
    if(id&&p)parent.postMessage({source:'nx-inline',type:'EDIT',sectionId:id,path:p,value:v},'*');
    active=null;
  }
  document.addEventListener('blur',function(ev){
    if(ev.target&&ev.target.hasAttribute&&ev.target.hasAttribute('data-edit')&&ev.target.contentEditable==='true')commit(ev.target);
  },true);
  document.addEventListener('keydown',function(ev){
    if(!active)return;
    if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();active.blur()}
    if(ev.key==='Escape'){ev.preventDefault();active.contentEditable='false';active=null;parent.postMessage({source:'nx-inline',type:'CANCEL'},'*')}
  });
  parent.postMessage({source:'nx-inline',type:'READY'},'*');
})();
</script>` : ""}
</body>
</html>`;
}
