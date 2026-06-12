import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { localeRelativePath } from "@/lib/i18n/locale";

export default function SignInForm({ locale }: { locale?: "hu" | "en" | "de" }) {
  const strings = {
    hu: {
      email: "Email", password: "Jelszó", show: "Mutat", hide: "Rejtés",
      submit: "Belépek →", loading: "Folyamatban...",
      errors: {
        invalid: "Hibás email vagy jelszó.",
        notFound: "Nincs ilyen email című felhasználó.",
        notVerified: "Az email címed még nincs megerősítve. Ellenőrizd a postafiókodat.",
        network: "Hálózati hiba. Próbáld újra.",
        tooMany: "Túl sok próbálkozás. Várj pár percet, és próbáld újra.",
        default: "Hibás email vagy jelszó.",
      }
    },
    en: {
      email: "Email", password: "Password", show: "Show", hide: "Hide",
      submit: "Sign In →", loading: "Signing in...",
      errors: {
        invalid: "Invalid email or password.",
        notFound: "No user found with this email.",
        notVerified: "Your email is not verified yet. Check your inbox.",
        network: "Network error. Please try again.",
        tooMany: "Too many attempts. Please wait a few minutes.",
        default: "Invalid email or password.",
      }
    },
    de: {
      email: "E-Mail", password: "Passwort", show: "Zeigen", hide: "Verstecken",
      submit: "Anmelden →", loading: "Anmeldung läuft...",
      errors: {
        invalid: "Ungültige E-Mail oder Passwort.",
        notFound: "Kein Benutzer mit dieser E-Mail gefunden.",
        notVerified: "Ihre E-Mail wurde noch nicht bestätigt. Überprüfen Sie Ihren Posteingang.",
        network: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
        tooMany: "Zu viele Versuche. Bitte warten Sie einige Minuten.",
        default: "Ungültige E-Mail oder Passwort.",
      }
    }
  };
  const loc = (locale || "hu") as keyof typeof strings;
  const s = strings[loc];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function translateError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid") && (m.includes("credential") || m.includes("password"))) {
      return s.errors.invalid;
    }
    if (m.includes("user") && m.includes("not found")) {
      return s.errors.notFound;
    }
    if (m.includes("not verified") || m.includes("verify")) {
      return s.errors.notVerified;
    }
    if (m.includes("network") || m.includes("fetch")) {
      return s.errors.network;
    }
    if (m.includes("too many")) {
      return s.errors.tooMany;
    }
    return s.errors.default;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(translateError(result.error.message || ""));
        setLoading(false);
      } else {
        window.location.href = localeRelativePath("/chat", locale || "hu");
      }
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : ""));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
          placeholder="bela@pelda.hu"
        />
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
            placeholder="••••••••"
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
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-4 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-medium py-3 rounded transition-colors"
      >
        {loading ? s.loading : s.submit}
      </button>
    </form>
  );
}
