import { useState } from "react";
import { signIn } from "@/lib/auth-client";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid") && (m.includes("credential") || m.includes("password"))) {
    return "Hibás email vagy jelszó.";
  }
  if (m.includes("user") && m.includes("not found")) {
    return "Nincs ilyen email című felhasználó.";
  }
  if (m.includes("not verified") || m.includes("verify")) {
    return "Az email címed még nincs megerősítve. Ellenőrizd a postafiókodat.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Hálózati hiba. Próbáld újra.";
  }
  if (m.includes("too many")) {
    return "Túl sok próbálkozás. Várj pár percet, és próbáld újra.";
  }
  return "Hibás email vagy jelszó.";
}

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        window.location.href = "/chat";
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
          Email
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
          Jelszó
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
            {showPassword ? "Rejtés" : "Mutat"}
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
        {loading ? "Folyamatban..." : "Belépek →"}
      </button>
    </form>
  );
}
