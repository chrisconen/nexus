import { useState, useRef, useEffect, useCallback } from "react";
import type { SiteData, Section, SectionType, SectionStyle } from "@/lib/builder/types";
import { COLOR_PALETTES, FONT_OPTIONS, SECTION_REGISTRY, SERVICE_ICON_OPTIONS, createDefaultSection } from "@/lib/builder/types";

interface Props { userTier: string; userName: string; }
type Step = "onboarding" | "editor";

// === TOAST SYSTEM ===
interface Toast { id: string; message: string; type: "success" | "error" | "info"; }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-2 rounded-lg text-sm shadow-lg animate-fade-in ${
          t.type === "success" ? "bg-emerald-900/90 text-emerald-200 border border-emerald-700" :
          t.type === "error" ? "bg-red-900/90 text-red-200 border border-red-700" :
          "bg-zinc-800/90 text-zinc-200 border border-zinc-700"
        }`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// === UNDO/REDO ===
function useHistory(initial: SiteData | null) {
  const [past, setPast] = useState<SiteData[]>([]);
  const [present, setPresent] = useState<SiteData | null>(initial);
  const [future, setFuture] = useState<SiteData[]>([]);

  const set = useCallback((data: SiteData) => {
    setPresent(prev => {
      if (prev) setPast(p => [...p.slice(-30), prev]);
      setFuture([]);
      return data;
    });
  }, []);

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setPresent(curr => {
        if (curr) setFuture(f => [curr, ...f]);
        return prev;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setPresent(curr => {
        if (curr) setPast(p => [...p, curr]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const init = useCallback((data: SiteData) => {
    setPresent(data);
    setPast([]);
    setFuture([]);
  }, []);

  return { data: present, set, undo, redo, init, canUndo: past.length > 0, canRedo: future.length > 0 };
}

export default function SiteBuilder({ userTier, userName }: Props) {
  const [step, setStep] = useState<Step>("onboarding");
  const history = useHistory(null);
  const siteData = history.data;
  const [siteId, setSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"sections" | "global">("sections");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>("");

  // Onboarding state
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [services, setServices] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [tone, setTone] = useState("friendly");
  const [palette, setPalette] = useState("emerald");

  // Toast helper
  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  // Load existing site
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site");
        if (res.ok) {
          const data = await res.json();
          if (data.sites?.length > 0) {
            const loaded = data.sites[0].data;
            if (!Array.isArray(loaded.sections)) return;
            history.init(loaded);
            setSiteId(data.sites[0].id);
            setStep("editor");
          }
        }
      } catch {}
    })();
  }, []);

  // Live preview — frissül minden siteData változáskor
  useEffect(() => {
    if (!siteData) return;
    (async () => {
      try {
        const res = await fetch("/api/site-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteData),
        });
        if (res.ok) setPreviewHtml(await res.text());
      } catch {}
    })();
  }, [siteData]);

  // Auto-save — 2 sec debounce
  useEffect(() => {
    if (!siteData || !siteId) return;
    const json = JSON.stringify(siteData);
    if (json === lastSavedRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch("/api/site", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: siteId, data: siteData }),
        });
        lastSavedRef.current = json;
        toast("Mentve", "success");
      } catch {
        toast("Mentési hiba", "error");
      } finally {
        setSaving(false);
      }
    }, 2000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [siteData, siteId]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        history.redo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [history.undo, history.redo]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/site-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, businessType, services, contactInfo, tone, palette }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      history.init(data.data);
      const saveRes = await fetch("/api/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data.data }) });
      const saveData = await saveRes.json();
      if (saveRes.ok) {
        setSiteId(saveData.id);
        lastSavedRef.current = JSON.stringify(data.data);
      }
      setStep("editor");
      toast("Weboldal generálva!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!businessName || !businessType) {
      toast("Először generálj egy oldalt az onboarding-gal", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/site-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, businessType, services, contactInfo, tone, palette }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      history.set(data.data);
      toast("Újragenerálva!", "success");
    } catch {
      toast("Újragenerálási hiba", "error");
    } finally {
      setLoading(false);
    }
  }

  function updateSiteData(updater: (d: SiteData) => SiteData) {
    if (!siteData) return;
    history.set(updater(JSON.parse(JSON.stringify(siteData))));
  }

  function updateSection(id: string, updater: (s: any) => any) {
    updateSiteData(d => ({
      ...d,
      sections: d.sections.map(s => s.id === id ? updater({ ...s }) : s),
    }));
  }

  function moveSection(id: string, dir: -1 | 1) {
    updateSiteData(d => {
      const idx = d.sections.findIndex(s => s.id === id);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= d.sections.length) return d;
      const arr = [...d.sections];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...d, sections: arr };
    });
  }

  function duplicateSection(id: string) {
    updateSiteData(d => {
      const idx = d.sections.findIndex(s => s.id === id);
      if (idx < 0) return d;
      const clone = JSON.parse(JSON.stringify(d.sections[idx]));
      clone.id = crypto.randomUUID();
      const arr = [...d.sections];
      arr.splice(idx + 1, 0, clone);
      return { ...d, sections: arr };
    });
    toast("Szekció duplikálva", "info");
  }

  async function deleteImage(url: string) {
    if (!url || !url.startsWith("http")) return;
    try {
      await fetch("/api/builder-upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {}
  }

  function deleteSection(id: string) {
    updateSiteData(d => ({ ...d, sections: d.sections.filter(s => s.id !== id) }));
    if (activeSection === id) setActiveSection(null);
    toast("Szekció törölve", "info");
  }

  function addSection(type: SectionType) {
    const newSec = createDefaultSection(type);
    updateSiteData(d => ({ ...d, sections: [...d.sections, newSec] }));
    setShowAddSection(false);
    setActiveSection(newSec.id);
    toast(`${SECTION_REGISTRY[type].label} hozzáadva`, "success");
  }

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // === ONBOARDING ===
  if (step === "onboarding") {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-4">NEXUS // Site Builder</div>
          <h1 className="text-2xl text-zinc-200 mb-2">Készítsük el a weboldalad</h1>
          <p className="text-sm text-zinc-500 mb-8">Válaszolj pár kérdésre, és az AI generál egy kész weboldalt.</p>

          <form onSubmit={handleGenerate} className="space-y-6">
            <Field label="Vállalkozás neve *" value={businessName} onChange={setBusinessName} required placeholder="pl. Kovács Fodrászat" />
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Milyen típusú vállalkozás? *</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none">
                <option value="">Válassz...</option>
                <option value="fodraszat">Fodrászat / Szépségszalon</option>
                <option value="autoszerelo">Autószerelő / Autómosó</option>
                <option value="etterem">Étterem / Kávézó</option>
                <option value="egeszsegugy">Egészségügy / Rendelő</option>
                <option value="epitkezes">Építkezés / Felújítás</option>
                <option value="oktatas">Oktatás / Tanfolyam</option>
                <option value="bolt">Bolt / Üzlet</option>
                <option value="egyeb">Egyéb</option>
              </select>
            </div>
            <FieldTextarea label="Szolgáltatások / termékek" value={services} onChange={setServices} placeholder="pl. Női hajvágás, Férfi hajvágás, Festés..." />
            <FieldTextarea label="Elérhetőségek" value={contactInfo} onChange={setContactInfo} placeholder="pl. Tel: +36 30 123 4567, Cím: Budapest, Fő utca 1." rows={2} />
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Hangnem</label>
              <div className="flex gap-3">
                {[{ value: "formal", label: "Hivatalos" }, { value: "friendly", label: "Barátságos" }, { value: "playful", label: "Játékos" }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setTone(opt.value)} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${tone === opt.value ? "border-emerald-500 bg-emerald-950/40 text-emerald-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Színpaletta</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                  <button key={key} type="button" onClick={() => setPalette(key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${palette === key ? "border-emerald-500 bg-emerald-950/40" : "border-zinc-800 hover:border-zinc-700"}`}>
                    <span className="w-4 h-4 rounded-full" style={{ background: p.primary }} />
                    <span className="text-zinc-400 capitalize">{key}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-4 py-3">{error}</div>}
            <button type="submit" disabled={loading || businessName === "" || businessType === ""} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium py-3 rounded-lg transition-colors text-sm">
              {loading ? "Generálás folyamatban..." : "Weboldal generálása"}
            </button>
          </form>
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  // === SPLIT-VIEW EDITOR ===
  if (!siteData) return null;
  const activeSec = siteData.sections.find(s => s.id === activeSection);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">NEXUS Builder</span>

        <div className="flex gap-1 ml-3">
          <button onClick={history.undo} disabled={!history.canUndo} className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-1.5 py-1 text-xs rounded" title="Visszavonás (Ctrl+Z)">↩</button>
          <button onClick={history.redo} disabled={!history.canRedo} className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 px-1.5 py-1 text-xs rounded" title="Újra (Ctrl+Y)">↪</button>
        </div>

        <div className="flex gap-1 ml-2 border-l border-zinc-800 pl-2">
          {(["desktop", "mobile"] as const).map(m => (
            <button key={m} onClick={() => setPreviewMode(m)} className={`px-2 py-1 rounded text-xs ${previewMode === m ? "bg-zinc-800 text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
              {m === "desktop" ? "Desktop" : "Mobil"}
            </button>
          ))}
        </div>

        <div className="flex-1 flex justify-center">
          <span className="text-xs text-zinc-600">
            {saving ? "Mentés..." : "Automatikusan mentve"}
          </span>
        </div>

        <button onClick={handleRegenerate} disabled={loading} className="text-zinc-500 hover:text-emerald-400 text-xs px-2 py-1 border border-zinc-800 rounded transition-colors disabled:opacity-50" title="Újragenerálás">
          {loading ? "..." : "Újragenerálás"}
        </button>
        {siteId && (
          <a href={`/api/site-download?id=${siteId}`} className="text-zinc-500 hover:text-emerald-400 text-xs px-2 py-1 border border-zinc-800 rounded transition-colors">
            Letöltés
          </a>
        )}
        <a href="/utmutato" target="_blank" className="text-zinc-500 hover:text-zinc-300 text-xs px-2" title="Útmutató">?</a>
        <a href="/chat" className="text-zinc-500 hover:text-zinc-300 text-xs px-2">Chat</a>
      </div>

      {/* Split view: sidebar + editor + preview */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar — section list */}
        <div className="w-60 border-r border-zinc-800 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-2 border-b border-zinc-800 flex gap-1">
            <button onClick={() => setEditorPanel("sections")} className={`flex-1 text-xs py-1 rounded ${editorPanel === "sections" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500"}`}>Szekciók</button>
            <button onClick={() => setEditorPanel("global")} className={`flex-1 text-xs py-1 rounded ${editorPanel === "global" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500"}`}>Stílusok</button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {editorPanel === "sections" ? (
              <>
                {siteData.sections.map((sec) => {
                  const reg = SECTION_REGISTRY[sec.type];
                  const isActive = activeSection === sec.id;
                  return (
                    <div key={sec.id} className={`rounded text-sm transition-colors ${isActive ? "bg-zinc-800" : "hover:bg-zinc-900"}`}>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer" onClick={() => { setActiveSection(sec.id); setShowAddSection(false); }}>
                        <span className="text-sm">{reg.icon}</span>
                        <span className={`flex-1 truncate text-xs ${isActive ? "text-zinc-200" : "text-zinc-400"}`}>{reg.label}</span>
                        {isActive && (
                          <div className="flex gap-0.5">
                            <button onClick={e => { e.stopPropagation(); moveSection(sec.id, -1); }} className="text-zinc-600 hover:text-zinc-300 text-[10px] px-0.5" title="Fel">▲</button>
                            <button onClick={e => { e.stopPropagation(); moveSection(sec.id, 1); }} className="text-zinc-600 hover:text-zinc-300 text-[10px] px-0.5" title="Le">▼</button>
                            <button onClick={e => { e.stopPropagation(); duplicateSection(sec.id); }} className="text-zinc-600 hover:text-emerald-400 text-[10px] px-0.5" title="Duplikálás">⧉</button>
                            <button onClick={e => { e.stopPropagation(); updateSection(sec.id, s => ({ ...s, enabled: !s.enabled })); }} className={`text-[10px] px-0.5 ${sec.enabled ? "text-emerald-500" : "text-zinc-600"}`} title="Ki/Be">●</button>
                            <button onClick={e => { e.stopPropagation(); deleteSection(sec.id); }} className="text-zinc-600 hover:text-red-400 text-[10px] px-0.5" title="Törlés">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowAddSection(true)} className="w-full border border-dashed border-zinc-700 rounded py-1.5 text-xs text-zinc-500 hover:text-emerald-400 hover:border-emerald-700 transition-colors mt-1">
                  + Szekció
                </button>
              </>
            ) : (
              <div className="space-y-3 p-1">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Színpaletta</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                      <button key={key} onClick={() => updateSiteData(d => ({ ...d, globalStyles: { ...d.globalStyles, colors: p } }))} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border ${siteData.globalStyles.colors.primary === p.primary ? "border-emerald-500 bg-emerald-950/40" : "border-zinc-800"}`}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.primary }} />
                        <span className="text-zinc-400 capitalize">{key}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Címsor betűtípus</label>
                  <select value={siteData.globalStyles.fonts.heading} onChange={e => updateSiteData(d => ({ ...d, globalStyles: { ...d.globalStyles, fonts: { ...d.globalStyles.fonts, heading: e.target.value } } }))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200">
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Szövegtörzs</label>
                  <select value={siteData.globalStyles.fonts.body} onChange={e => updateSiteData(d => ({ ...d, globalStyles: { ...d.globalStyles, fonts: { ...d.globalStyles.fonts, body: e.target.value } } }))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200">
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Egyéni színek</label>
                  {(["primary", "secondary", "accent", "background", "surface", "text", "textMuted"] as const).map(key => (
                    <div key={key} className="flex items-center gap-2 mb-1">
                      <input type="color" value={siteData.globalStyles.colors[key]} onChange={e => updateSiteData(d => ({ ...d, globalStyles: { ...d.globalStyles, colors: { ...d.globalStyles.colors, [key]: e.target.value } } }))} className="w-5 h-5 rounded border-0 cursor-pointer" />
                      <span className="text-[10px] text-zinc-500 capitalize">{key}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Vállalkozás</label>
                  <div className="space-y-1.5">
                    <ImageUpload label="Logó" value={siteData.business.logoUrl || ""} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, logoUrl: v } }))} onDelete={deleteImage} />
                    <SmallField label="Név" value={siteData.business.name} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, name: v } }))} />
                    <SmallField label="Szlogen" value={siteData.business.tagline} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, tagline: v } }))} />
                    <SmallField label="Telefon" value={siteData.business.phone || ""} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, phone: v } }))} />
                    <SmallField label="Email" value={siteData.business.email || ""} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, email: v } }))} />
                    <SmallField label="Cím" value={siteData.business.address || ""} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, address: v } }))} />
                    <SmallField label="Nyitvatartás" value={siteData.business.openingHours || ""} onChange={v => updateSiteData(d => ({ ...d, business: { ...d.business, openingHours: v } }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">SEO / Meta</label>
                  <div className="space-y-1.5">
                    <SmallField label="Oldal címe" value={siteData.meta?.title || ""} onChange={v => updateSiteData(d => ({ ...d, meta: { ...d.meta, title: v } }))} />
                    <SmallField label="Meta leírás" value={siteData.meta?.description || ""} onChange={v => updateSiteData(d => ({ ...d, meta: { ...d.meta, description: v } }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wider">Footer / Social</label>
                  <div className="space-y-1.5">
                    <SmallField label="Footer szöveg" value={siteData.footer?.text || ""} onChange={v => updateSiteData(d => ({ ...d, footer: { ...d.footer, socials: d.footer?.socials || [], text: v } }))} />
                    {(siteData.footer?.socials || []).map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <select value={s.platform} onChange={e => updateSiteData(d => { const socials = [...(d.footer?.socials || [])]; socials[i] = { ...socials[i], platform: e.target.value as any }; return { ...d, footer: { ...d.footer, socials } }; })} className="bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-[10px] text-zinc-200 w-20">
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                          <option value="youtube">YouTube</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="x">X</option>
                          <option value="github">GitHub</option>
                          <option value="website">Web</option>
                        </select>
                        <input type="text" value={s.url} onChange={e => updateSiteData(d => { const socials = [...(d.footer?.socials || [])]; socials[i] = { ...socials[i], url: e.target.value }; return { ...d, footer: { ...d.footer, socials } }; })} placeholder="https://..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-[10px] text-zinc-200" />
                        <button onClick={() => updateSiteData(d => ({ ...d, footer: { ...d.footer, socials: (d.footer?.socials || []).filter((_, j) => j !== i) } }))} className="text-[10px] text-zinc-600 hover:text-red-400 px-1">✕</button>
                      </div>
                    ))}
                    <button onClick={() => updateSiteData(d => ({ ...d, footer: { ...d.footer, socials: [...(d.footer?.socials || []), { platform: "facebook" as const, url: "" }] } }))} className="w-full border border-dashed border-zinc-700 rounded py-1 text-[10px] text-zinc-500 hover:text-emerald-400 hover:border-emerald-700">+ Social link</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle — section editor */}
        <div className="w-80 border-r border-zinc-800 flex-shrink-0 overflow-y-auto p-4">
          {showAddSection ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs text-zinc-300 uppercase tracking-wider">Szekció hozzáadása</h3>
                <button onClick={() => setShowAddSection(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">Vissza</button>
              </div>
              <div className="space-y-2">
                {(Object.entries(SECTION_REGISTRY) as [SectionType, typeof SECTION_REGISTRY[SectionType]][]).map(([type, reg]) => (
                  <button key={type} onClick={() => addSection(type)} className="w-full text-left border border-zinc-800 hover:border-emerald-700 rounded-lg p-3 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{reg.icon}</span>
                      <span className="text-xs text-zinc-200">{reg.label}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 ml-7">{reg.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : activeSec ? (
            <div className="space-y-4">
              <h3 className="text-xs text-zinc-300 uppercase tracking-wider">{SECTION_REGISTRY[activeSec.type].icon} {SECTION_REGISTRY[activeSec.type].label}</h3>
              <SectionEditor section={activeSec} onUpdate={(s) => updateSection(activeSec.id, () => s)} onDeleteImage={deleteImage} />
              <SectionStyleEditor style={activeSec.style || {}} onUpdate={(style) => updateSection(activeSec.id, s => ({ ...s, style }))} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-xs text-center px-4">
              Válassz egy szekciót a bal oldali listából a szerkesztéshez
            </div>
          )}
        </div>

        {/* Right — live preview */}
        <div className="flex-1 bg-zinc-900 flex items-center justify-center p-3 min-h-0">
          <iframe
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className={`bg-white rounded-lg shadow-2xl border border-zinc-700 h-full transition-all ${previewMode === "mobile" ? "w-[375px]" : "w-full"}`}
            title="Előnézet"
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// === SECTION EDITOR ===

function SectionEditor({ section, onUpdate, onDeleteImage }: { section: Section; onUpdate: (s: Section) => void; onDeleteImage: (url: string) => void }) {
  const s = section;
  const set = (patch: Partial<any>) => onUpdate({ ...s, ...patch } as Section);

  switch (s.type) {
    case "hero":
      return <div className="space-y-3">
        <Field label="Főcím" value={s.headline} onChange={v => set({ headline: v })} />
        <Field label="Alcím" value={s.subheadline} onChange={v => set({ subheadline: v })} />
        <Field label="Gomb szöveg" value={s.ctaText} onChange={v => set({ ctaText: v })} />
        <Field label="Gomb link" value={s.ctaUrl} onChange={v => set({ ctaUrl: v })} />
        <SelectField label="Elrendezés" value={s.layout} options={[["left","Bal"],["center","Közép"],["right","Jobb"]]} onChange={v => set({ layout: v })} />
        <ImageUpload label="Háttérkép" value={s.backgroundImageUrl || ""} onChange={v => set({ backgroundImageUrl: v })} onDelete={onDeleteImage} />
      </div>;
    case "services":
      return <div className="space-y-3">
        <Field label="Szekció cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        <SelectField label="Oszlopok" value={String(s.columns)} options={[["2","2"],["3","3"],["4","4"]]} onChange={v => set({ columns: Number(v) })} />
        {s.items.map((item, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ items: s.items.filter((_, j) => j !== i) })}>
            <Field label="Név" value={item.name} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], name: v }; set({ items }); }} />
            <Field label="Leírás" value={item.description} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], description: v }; set({ items }); }} />
            <Field label="Ár" value={item.price || ""} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], price: v }; set({ items }); }} />
            <SelectField label="Ikon" value={item.icon || ""} options={SERVICE_ICON_OPTIONS.map(o => [o.value, o.label] as [string, string])} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], icon: v }; set({ items }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ items: [...s.items, { name: "", description: "", price: "" }] })} label="Szolgáltatás" />
      </div>;
    case "about":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <FieldTextarea label="Szöveg" value={s.text} onChange={v => set({ text: v })} />
        <SelectField label="Elrendezés" value={s.layout} options={[["text-left","Szöveg bal"],["text-right","Szöveg jobb"],["text-only","Csak szöveg"]]} onChange={v => set({ layout: v })} />
        <ImageUpload label="Kép" value={s.imageUrl || ""} onChange={v => set({ imageUrl: v })} onDelete={onDeleteImage} />
      </div>;
    case "gallery":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        <SelectField label="Oszlopok" value={String(s.columns)} options={[["2","2"],["3","3"],["4","4"]]} onChange={v => set({ columns: Number(v) })} />
        {s.images.map((img, i) => (
          <ItemCard key={i} index={i} onDelete={() => { if (img.url) onDeleteImage(img.url); set({ images: s.images.filter((_, j) => j !== i) }); }}>
            <ImageUpload label="Kép" value={img.url} onChange={v => { const images = [...s.images]; images[i] = { ...images[i], url: v }; set({ images }); }} onDelete={onDeleteImage} />
            <Field label="Alt szöveg" value={img.alt} onChange={v => { const images = [...s.images]; images[i] = { ...images[i], alt: v }; set({ images }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ images: [...s.images, { url: "", alt: "" }] })} label="Kép" />
      </div>;
    case "contact":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <FieldTextarea label="Szöveg" value={s.text} onChange={v => set({ text: v })} />
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" checked={s.showForm} onChange={e => set({ showForm: e.target.checked })} className="accent-emerald-600" /> Űrlap megjelenítése
        </label>
        {s.showForm && (
          <div>
            <Field label="Formspree endpoint" value={s.formEndpoint || ""} onChange={v => set({ formEndpoint: v })} placeholder="https://formspree.io/f/xxxxx" />
            <p className="text-[10px] text-zinc-600 mt-1">Regisztrálj a <a href="https://formspree.io" target="_blank" rel="noopener" className="text-emerald-500 hover:underline">formspree.io</a>-n, hozz létre egy form-ot, és másold be az endpoint URL-t.</p>
          </div>
        )}
      </div>;
    case "testimonials":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        {s.items.map((item, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ items: s.items.filter((_, j) => j !== i) })}>
            <Field label="Név" value={item.name} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], name: v }; set({ items }); }} />
            <Field label="Pozíció" value={item.role || ""} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], role: v }; set({ items }); }} />
            <FieldTextarea label="Vélemény" value={item.text} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], text: v }; set({ items }); }} />
            <SelectField label="Értékelés" value={String(item.rating || 5)} options={[["1","1"],["2","2"],["3","3"],["4","4"],["5","5"]]} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], rating: Number(v) }; set({ items }); }} />
            <ImageUpload label="Profilkép" value={item.imageUrl || ""} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], imageUrl: v }; set({ items }); }} onDelete={onDeleteImage} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ items: [...s.items, { name: "", text: "", rating: 5 }] })} label="Vélemény" />
      </div>;
    case "team":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        {s.members.map((m, i) => (
          <ItemCard key={i} index={i} onDelete={() => { if (m.imageUrl) onDeleteImage(m.imageUrl); set({ members: s.members.filter((_, j) => j !== i) }); }}>
            <ImageUpload label="Profilkép" value={m.imageUrl || ""} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], imageUrl: v }; set({ members }); }} onDelete={onDeleteImage} />
            <Field label="Név" value={m.name} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], name: v }; set({ members }); }} />
            <Field label="Pozíció" value={m.role} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], role: v }; set({ members }); }} />
            <FieldTextarea label="Bio" value={m.bio || ""} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], bio: v }; set({ members }); }} />
            <Field label="Telefon" value={m.phone || ""} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], phone: v }; set({ members }); }} />
            <Field label="Email" value={m.email || ""} onChange={v => { const members = [...s.members]; members[i] = { ...members[i], email: v }; set({ members }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ members: [...s.members, { name: "", role: "" }] })} label="Tag" />
      </div>;
    case "offers":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        {s.items.map((item, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ items: s.items.filter((_, j) => j !== i) })}>
            <Field label="Ajánlat neve" value={item.title} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], title: v }; set({ items }); }} />
            <FieldTextarea label="Leírás" value={item.description} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], description: v }; set({ items }); }} />
            <Field label="Eredeti ár" value={item.originalPrice || ""} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], originalPrice: v }; set({ items }); }} />
            <Field label="Akciós ár" value={item.discountPrice} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], discountPrice: v }; set({ items }); }} />
            <Field label="Badge" value={item.badge || ""} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], badge: v }; set({ items }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ items: [...s.items, { title: "", description: "", discountPrice: "", badge: "AKCIÓ" }] })} label="Ajánlat" />
      </div>;
    case "faq":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        {s.items.map((item, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ items: s.items.filter((_, j) => j !== i) })}>
            <Field label="Kérdés" value={item.question} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], question: v }; set({ items }); }} />
            <FieldTextarea label="Válasz" value={item.answer} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], answer: v }; set({ items }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ items: [...s.items, { question: "", answer: "" }] })} label="Kérdés" />
      </div>;
    case "cta":
      return <div className="space-y-3">
        <Field label="Főcím" value={s.headline} onChange={v => set({ headline: v })} />
        <FieldTextarea label="Szöveg" value={s.text} onChange={v => set({ text: v })} />
        <Field label="Gomb szöveg" value={s.buttonText} onChange={v => set({ buttonText: v })} />
        <Field label="Gomb link" value={s.buttonUrl} onChange={v => set({ buttonUrl: v })} />
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Háttérszín</label>
          <input type="color" value={s.backgroundColorOverride || "#059669"} onChange={e => set({ backgroundColorOverride: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
        </div>
      </div>;
    case "stats":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title || ""} onChange={v => set({ title: v })} />
        {s.items.map((item, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ items: s.items.filter((_, j) => j !== i) })}>
            <Field label="Érték" value={item.value} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], value: v }; set({ items }); }} />
            <Field label="Címke" value={item.label} onChange={v => { const items = [...s.items]; items[i] = { ...items[i], label: v }; set({ items }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ items: [...s.items, { value: "", label: "" }] })} label="Statisztika" />
      </div>;
    case "pricing":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title} onChange={v => set({ title: v })} />
        <Field label="Alcím" value={s.subtitle || ""} onChange={v => set({ subtitle: v })} />
        {s.plans.map((plan, i) => (
          <ItemCard key={i} index={i} onDelete={() => set({ plans: s.plans.filter((_, j) => j !== i) })}>
            <Field label="Csomag neve" value={plan.name} onChange={v => { const plans = [...s.plans]; plans[i] = { ...plans[i], name: v }; set({ plans }); }} />
            <Field label="Ár" value={plan.price} onChange={v => { const plans = [...s.plans]; plans[i] = { ...plans[i], price: v }; set({ plans }); }} />
            <Field label="Időszak" value={plan.period || ""} onChange={v => { const plans = [...s.plans]; plans[i] = { ...plans[i], period: v }; set({ plans }); }} />
            <Field label="Gomb szöveg" value={plan.ctaText} onChange={v => { const plans = [...s.plans]; plans[i] = { ...plans[i], ctaText: v }; set({ plans }); }} />
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={plan.highlighted} onChange={e => { const plans = [...s.plans]; plans[i] = { ...plans[i], highlighted: e.target.checked }; set({ plans }); }} className="accent-emerald-600" /> Kiemelt
            </label>
            <FieldTextarea label="Funkciók (soronként)" value={plan.features.join("\n")} onChange={v => { const plans = [...s.plans]; plans[i] = { ...plans[i], features: v.split("\n").filter(Boolean) }; set({ plans }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ plans: [...s.plans, { name: "", price: "", features: [], highlighted: false, ctaText: "Választom" }] })} label="Csomag" />
      </div>;
    case "logos":
      return <div className="space-y-3">
        <Field label="Cím" value={s.title || ""} onChange={v => set({ title: v })} />
        {s.logos.map((logo, i) => (
          <ItemCard key={i} index={i} onDelete={() => { if (logo.url) onDeleteImage(logo.url); set({ logos: s.logos.filter((_, j) => j !== i) }); }}>
            <ImageUpload label="Logo" value={logo.url} onChange={v => { const logos = [...s.logos]; logos[i] = { ...logos[i], url: v }; set({ logos }); }} onDelete={onDeleteImage} />
            <Field label="Alt szöveg" value={logo.alt} onChange={v => { const logos = [...s.logos]; logos[i] = { ...logos[i], alt: v }; set({ logos }); }} />
            <Field label="Link URL" value={logo.linkUrl || ""} onChange={v => { const logos = [...s.logos]; logos[i] = { ...logos[i], linkUrl: v }; set({ logos }); }} />
          </ItemCard>
        ))}
        <AddButton onClick={() => set({ logos: [...s.logos, { url: "", alt: "" }] })} label="Logo" />
      </div>;
  }
}

// === SECTION STYLE EDITOR ===

function SectionStyleEditor({ style, onUpdate }: { style: SectionStyle; onUpdate: (s: SectionStyle) => void }) {
  return (
    <div className="border-t border-zinc-800 pt-3 mt-3">
      <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Szekció stílus</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-zinc-600 mb-0.5">Háttérszín</label>
          <div className="flex items-center gap-1.5">
            <input type="color" value={style.backgroundColor || "#18181b"} onChange={e => onUpdate({ ...style, backgroundColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer" />
            <button onClick={() => onUpdate({ ...style, backgroundColor: undefined })} className="text-[10px] text-zinc-600 hover:text-zinc-400">X</button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-600 mb-0.5">Szövegszín</label>
          <div className="flex items-center gap-1.5">
            <input type="color" value={style.textColor || "#e4e4e7"} onChange={e => onUpdate({ ...style, textColor: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer" />
            <button onClick={() => onUpdate({ ...style, textColor: undefined })} className="text-[10px] text-zinc-600 hover:text-zinc-400">X</button>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] text-zinc-600 mb-0.5">Szöveg igazítás</label>
          <div className="flex gap-1.5">
            {([["left", "Bal"], ["center", "Közép"], ["right", "Jobb"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => onUpdate({ ...style, textAlign: style.textAlign === val ? undefined : val })} className={`flex-1 py-1 rounded text-[10px] border transition-colors ${style.textAlign === val ? "border-emerald-500 bg-emerald-950/40 text-emerald-400" : "border-zinc-800 text-zinc-500"}`}>{label}</button>
            ))}
          </div>
        </div>
        <Field label="Padding felül" value={style.paddingTop || ""} onChange={v => onUpdate({ ...style, paddingTop: v || undefined })} placeholder="4rem" />
        <Field label="Padding alul" value={style.paddingBottom || ""} onChange={v => onUpdate({ ...style, paddingBottom: v || undefined })} placeholder="4rem" />
        <Field label="Margin felül" value={style.marginTop || ""} onChange={v => onUpdate({ ...style, marginTop: v || undefined })} placeholder="2rem" />
        <Field label="Margin alul" value={style.marginBottom || ""} onChange={v => onUpdate({ ...style, marginBottom: v || undefined })} placeholder="2rem" />
      </div>
    </div>
  );
}

// === UI PRIMITIVES ===

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none" />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows || 3} placeholder={placeholder} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none resize-none" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function SmallField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-zinc-600 mb-0.5">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:border-emerald-500 focus:outline-none" />
    </div>
  );
}

function ItemCard({ index, onDelete, children }: { index: number; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-2.5 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-zinc-600">#{index + 1}</span>
        <button onClick={onDelete} className="text-[10px] text-zinc-600 hover:text-red-400">Törlés</button>
      </div>
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full border border-dashed border-zinc-700 rounded-lg py-1.5 text-xs text-zinc-500 hover:text-emerald-400 hover:border-emerald-700 transition-colors">
      + {label} hozzáadása
    </button>
  );
}

function ImageUpload({ label, value, onChange, onDelete }: { label: string; value: string; onChange: (url: string) => void; onDelete: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/builder-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hiba a feltöltés közben");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="block text-[10px] text-zinc-500 mb-0.5">{label}</label>
      {value ? (
        <div className="flex items-center gap-2">
          <img src={value} alt="" className="w-12 h-12 object-cover rounded border border-zinc-700" />
          <button onClick={() => { onDelete(value); onChange(""); }} className="text-[10px] text-red-400 hover:text-red-300">Törlés</button>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept=".webp,.avif,.png,.jpg,.jpeg,image/webp,image/avif,image/png,image/jpeg" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 hover:border-emerald-600 text-zinc-400 hover:text-emerald-400 px-2 py-1 rounded text-[10px] transition-colors disabled:opacity-50">
            {uploading ? "Feltöltés..." : "Kép feltöltése"}
          </button>
        </>
      )}
    </div>
  );
}
