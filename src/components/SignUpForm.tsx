import { useState } from "react";
import { signUp } from "@/lib/auth-client";

interface PasswordCheck {
  ok: boolean;
  label: string;
}

function evaluatePassword(pw: string): PasswordCheck[] {
  return [
    { ok: pw.length >= 8, label: "Min. 8 karakter" },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: "Kis és nagybetű" },
    { ok: /[0-9]/.test(pw), label: "Legalább 1 szám" },
  ];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("exists")) {
    return "Ezzel az email címmel már létezik fiók. Lépj be vagy használj másikat.";
  }
  if (m.includes("password") && m.includes("short")) {
    return "A jelszó túl rövid. Legalább 8 karakter szükséges.";
  }
  if (m.includes("password") && m.includes("long")) {
    return "A jelszó túl hosszú (max. 128 karakter).";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "Érvénytelen email cím.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Hálózati hiba. Próbáld újra.";
  }
  return message;
}

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const passwordChecks = evaluatePassword(password);
  const allPasswordOK = passwordChecks.every((c) => c.ok);
  const emailOK = isValidEmail(email);
  const nameOK = name.trim().length >= 2;
  const formValid = nameOK && emailOK && allPasswordOK;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setError(null);

    if (!formValid) {
      setError("Kérlek töltsd ki a formot helyesen.");
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
        setError(translateError(result.error.message || "Ismeretlen hiba történt"));
        setLoading(false);
      } else {
        window.location.href = "/fiok";
      }
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : "Hálózati hiba"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Név
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
          placeholder="Példa Béla"
        />
        {touched.name && !nameOK && (
          <div className="text-xs text-red-400 mt-1">Min. 2 karakter</div>
        )}
      </div>

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
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          className={`w-full bg-zinc-900 border rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            touched.email && !emailOK
              ? "border-red-700 focus:border-red-500"
              : "border-zinc-800 focus:border-emerald-500"
          }`}
          placeholder="bela@pelda.hu"
        />
        {touched.email && !emailOK && (
          <div className="text-xs text-red-400 mt-1">Érvénytelen email cím</div>
        )}
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            className={`w-full bg-zinc-900 border rounded px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
              touched.password && !allPasswordOK
                ? "border-red-700 focus:border-red-500"
                : "border-zinc-800 focus:border-emerald-500"
            }`}
            placeholder="Min. 8 karakter, kis+nagybetű, szám"
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
        {loading ? "Folyamatban..." : formValid ? "Regisztrálok →" : "Töltsd ki a formot"}
      </button>
    </form>
  );
}
