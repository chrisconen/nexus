import { useState } from "react";
import { signUp } from "@/lib/auth-client";

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signUp.email({
      name,
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message || "Ismeretlen hiba történt");
      setLoading(false);
    } else {
      window.location.href = "/fiok";
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
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
          placeholder="Példa Béla"
        />
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
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
          placeholder="bela@pelda.hu"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Jelszó
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition-colors"
          placeholder="Legalább 8 karakter"
        />
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
        {loading ? "Folyamatban..." : "Regisztrálok →"}
      </button>
    </form>
  );
}
