import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { localeRelativePath } from "@/lib/i18n/locale";

interface Props {
  className?: string;
  locale?: string;
}

const btnText: Record<string, { idle: string; loading: string }> = {
  hu: { idle: "Kijelentkezés", loading: "Kijelentkezés..." },
  en: { idle: "Sign Out", loading: "Signing Out..." },
  de: { idle: "Abmelden", loading: "Abmelden..." },
};

export default function SignOutButton({ className, locale }: Props) {
  const [loading, setLoading] = useState(false);
  const t = btnText[locale || "hu"] || btnText.hu;

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);

    try {
      await signOut();
      window.location.href = localeRelativePath("/", locale || "hu");
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
      {loading ? t.loading : t.idle}
    </button>
  );
}
