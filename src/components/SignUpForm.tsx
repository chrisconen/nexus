import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { localeRelativePath } from "@/lib/i18n/locale";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpForm({ locale }: { locale?: "hu" | "en" | "de" }) {
  const strings = {
    hu: {
      name: "Név",
      email: "Email",
      password: "Jelszó",
      show: "Mutat",
      hide: "Rejtés",
      submit: "Regisztrálok →",
      loading: "Folyamatban...",
      invalidForm: "Töltsd ki a formot",
      namePlaceholder: "Példa Béla",
      emailPlaceholder: "bela@pelda.hu",
      passwordPlaceholder: "Min. 8 karakter, kis+nagybetű, szám",
      nameError: "Min. 2 karakter",
      emailError: "Érvénytelen email cím",
      check1: "Min. 8 karakter",
      check2: "Kis és nagybetű",
      check3: "Legalább 1 szám",
      acceptTerms: "Elfogadom az ",
      termsLink1: "ÁSZF",
      acceptTermsAnd: "-et és az ",
      termsLink2: "Adatkezelési tájékoztatót",
      acceptTermsEnd: ".",
      exists: "Ezzel az email címmel már létezik fiók. Lépj be vagy használj másikat.",
      passwordShort: "A jelszó túl rövid. Legalább 8 karakter szükséges.",
      passwordLong: "A jelszó túl hosszú (max. 128 karakter).",
      invalidEmail: "Érvénytelen email cím.",
      network: "Hálózati hiba. Próbáld újra.",
      default: "Ismeretlen hiba történt",
    },
    en: {
      name: "Name",
      email: "Email",
      password: "Password",
      show: "Show",
      hide: "Hide",
      submit: "Register →",
      loading: "Processing...",
      invalidForm: "Fill out the form",
      namePlaceholder: "John Doe",
      emailPlaceholder: "john@example.com",
      passwordPlaceholder: "Min. 8 chars, upper+lower+number",
      nameError: "Min. 2 characters",
      emailError: "Invalid email address",
      check1: "Min. 8 characters",
      check2: "Uppercase & lowercase",
      check3: "At least 1 number",
      acceptTerms: "I accept the ",
      termsLink1: "Terms of Service",
      acceptTermsAnd: " and the ",
      termsLink2: "Privacy Policy",
      acceptTermsEnd: ".",
      exists: "An account with this email already exists. Sign in instead.",
      passwordShort: "Password too short. At least 8 characters required.",
      passwordLong: "Password too long (max. 128 characters).",
      invalidEmail: "Invalid email address.",
      network: "Network error. Please try again.",
      default: "An unknown error occurred",
    },
    de: {
      name: "Name",
      email: "E-Mail",
      password: "Passwort",
      show: "Zeigen",
      hide: "Verstecken",
      submit: "Registrieren →",
      loading: "Verarbeitung läuft...",
      invalidForm: "Formular ausfüllen",
      namePlaceholder: "Max Mustermann",
      emailPlaceholder: "max@beispiel.de",
      passwordPlaceholder: "Min. 8 Zeichen, Groß+Klein, Zahl",
      nameError: "Min. 2 Zeichen",
      emailError: "Ungültige E-Mail-Adresse",
      check1: "Min. 8 Zeichen",
      check2: "Groß- und Kleinbuchstaben",
      check3: "Mindestens 1 Zahl",
      acceptTerms: "Ich akzeptiere die ",
      termsLink1: "AGB",
      acceptTermsAnd: " und die ",
      termsLink2: "Datenschutzerklärung",
      acceptTermsEnd: ".",
      exists: "Ein Konto mit dieser E-Mail existiert bereits. Melde dich stattdessen an.",
      passwordShort: "Passwort zu kurz. Mindestens 8 Zeichen erforderlich.",
      passwordLong: "Passwort zu lang (max. 128 Zeichen).",
      invalidEmail: "Ungültige E-Mail-Adresse.",
      network: "Netzwerkfehler. Bitte versuche es erneut.",
      default: "Ein unbekannter Fehler ist aufgetreten",
    }
  };
  const loc = (locale || "hu") as keyof typeof strings;
  const s = strings[loc];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const passwordChecks = [
    { ok: password.length >= 8, label: s.check1 },
    { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: s.check2 },
    { ok: /[0-9]/.test(password), label: s.check3 },
  ];
  const allPasswordOK = passwordChecks.every((c) => c.ok);
  const emailOK = isValidEmail(email);
  const nameOK = name.trim().length >= 2;
  const formValid = nameOK && emailOK && allPasswordOK && acceptTerms;

  function translateError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("already") || m.includes("exists")) {
      return s.exists;
    }
    if (m.includes("password") && m.includes("short")) {
      return s.passwordShort;
    }
    if (m.includes("password") && m.includes("long")) {
      return s.passwordLong;
    }
    if (m.includes("invalid") && m.includes("email")) {
      return s.invalidEmail;
    }
    if (m.includes("network") || m.includes("fetch")) {
      return s.network;
    }
    return s.default;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setError(null);

    if (!formValid) {
      setError(s.invalidForm);
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
  setError(translateError(result.error.message || s.default));
  setLoading(false);
} else {
  // Sikeres regisztráció — email küldve, irány a megerősítő-szükséges oldal
  window.location.href = localeRelativePath("/megerosites-szukseges", locale || "hu");
}
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : s.default));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          {s.name}
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          className={`w-full bg-zinc-900 border rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            touched.name && !nameOK
              ? "border-red-700 focus:border-red-500"
              : "border-zinc-800 focus:border-emerald-500"
          }`}
          placeholder={s.namePlaceholder}
        />
        {touched.name && !nameOK && (
          <div className="text-xs text-red-400 mt-1">{s.nameError}</div>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          {s.email}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          className={`w-full bg-zinc-900 border rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            touched.email && !emailOK
              ? "border-red-700 focus:border-red-500"
              : "border-zinc-800 focus:border-emerald-500"
          }`}
          placeholder={s.emailPlaceholder}
        />
        {touched.email && !emailOK && (
          <div className="text-xs text-red-400 mt-1">{s.emailError}</div>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          {s.password}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            className={`w-full bg-zinc-900 border rounded px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
              touched.password && !allPasswordOK
                ? "border-red-700 focus:border-red-500"
                : "border-zinc-800 focus:border-emerald-500"
            }`}
            placeholder={s.passwordPlaceholder}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider text-zinc-500 hover:text-emerald-400 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? s.hide : s.show}
          </button>
        </div>
        {password.length > 0 && (
          <ul className="mt-2 space-y-1">
            {passwordChecks.map((check, idx) => (
              <li
                key={idx}
                className={`text-xs flex items-center gap-2 ${
                  check.ok ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                <span>{check.ok ? "✓" : "·"}</span>
                <span>{check.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="accent-emerald-600 w-4 h-4 mt-0.5 flex-shrink-0"
        />
        <span className="text-xs text-zinc-400 leading-relaxed">
          {s.acceptTerms}
          <a href="/aszf" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{s.termsLink1}</a>
          {s.acceptTermsAnd}
          <a href="/adatvedelem" target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{s.termsLink2}</a>
          {s.acceptTermsEnd}
        </span>
      </label>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-4 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !formValid}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium py-3 rounded transition-colors"
      >
        {loading ? s.loading : formValid ? s.submit : s.invalidForm}
      </button>
    </form>
  );
}
