import { Resend } from "resend";
import { logData } from "@/lib/log";

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.RESEND_FROM_EMAIL || "noreply@conendigital.hu";
const FROM_NAME = import.meta.env.RESEND_FROM_NAME || "NEXUS AI";

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set - emails will not be sent");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface EmailVerificationProps {
  to: string;
  userName: string;
  verificationUrl: string;
}

export async function sendVerificationEmail({
  to,
  userName,
  verificationUrl,
}: EmailVerificationProps): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("Cannot send email - Resend not configured");
    return { success: false, error: "Email szolgáltatás nincs konfigurálva" };
  }

  const subject = "Erősítsd meg a NEXUS AI fiókodat";

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #18181b; color: #e4e4e7; margin: 0; padding: 40px 20px; }
  .container { max-width: 560px; margin: 0 auto; background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 40px; }
  .logo { font-family: monospace; font-size: 14px; letter-spacing: 0.3em; color: #a1a1aa; text-transform: uppercase; margin-bottom: 24px; }
  .logo .accent { color: #10b981; }
  h1 { font-size: 24px; font-weight: 300; margin: 0 0 16px 0; color: #f4f4f5; }
  p { font-size: 15px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0; }
  .button { display: inline-block; background: #10b981; color: #f4f4f5; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 24px 0; }
  .button:hover { background: #059669; }
  .url-box { background: #18181b; border: 1px solid #3f3f46; border-radius: 4px; padding: 12px; font-family: monospace; font-size: 12px; color: #a1a1aa; word-break: break-all; margin: 16px 0; }
  .footer { font-size: 12px; color: #71717a; margin-top: 32px; padding-top: 24px; border-top: 1px solid #3f3f46; }
  .footer a { color: #10b981; text-decoration: none; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">● NEXUS <span class="accent">AI</span></div>
    <h1>Szia ${userName}!</h1>
    <p>Köszönjük hogy regisztráltál a NEXUS AI-ra. Ahhoz hogy be tudj lépni, kérjük erősítsd meg az email címedet az alábbi gombra kattintva:</p>
    <a href="${verificationUrl}" class="button">Email megerősítése →</a>
    <p style="font-size: 13px; color: #a1a1aa;">Ha a gomb nem működik, másold be ezt a linket a böngészőbe:</p>
    <div class="url-box">${verificationUrl}</div>
    <div class="footer">
      <p>Ez az email automatikusan került kiküldésre. Ha nem te regisztráltál, nyugodtan figyelmen kívül hagyhatod.</p>
      <p>NEXUS AI · <a href="https://conendigital.hu">Conen Digital</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `Szia ${userName}!

Köszönjük hogy regisztráltál a NEXUS AI-ra. Ahhoz hogy be tudj lépni, kérjük erősítsd meg az email címedet az alábbi linkre kattintva:

${verificationUrl}

Ha nem te regisztráltál, nyugodtan figyelmen kívül hagyhatod ezt az emailt.

---
NEXUS AI · Conen Digital
https://conendigital.hu`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    logData("Verification email sent, id:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("Email send exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Ismeretlen hiba" };
  }
}
