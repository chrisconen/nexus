import { useState } from "react";
import { signOut } from "@/lib/auth-client";

interface Props {
  className?: string;
}

export default function SignOutButton({ className }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);

    try {
      await signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Sign-out error:", err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={className || "text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider disabled:opacity-50"}
    >
      {loading ? "Kijelentkezés..." : "Kijelentkezés"}
    </button>
  );
}
