import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { validateUpload, extractText } from "@/lib/document";

export const prerender = false;

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user } = session;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Nincs fájl csatolva" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Képfeltöltés (Premium-only)
  if (IMAGE_TYPES.has(file.type)) {
    if (user.tier !== "premium") {
      return new Response(
        JSON.stringify({ error: "A képértés Premium funkció. Frissítsd az előfizetésed a képelemzéshez." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "A kép túl nagy (maximum 5 MB)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return new Response(
      JSON.stringify({
        type: "image",
        fileName: file.name,
        mediaType: file.type,
        base64,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Dokumentumfeldolgozás (Pro + Premium)
  const validation = validateUpload(file.size, file.type, user.tier);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: validation.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const buffer = await file.arrayBuffer();
    const result = await extractText(buffer, file.type, user.tier);

    return new Response(
      JSON.stringify({
        type: "document",
        text: result.text,
        fileName: file.name,
        truncated: result.truncated,
        originalLength: result.originalLength,
        extractedLength: result.text.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hiba a fájl feldolgozása közben";
    return new Response(JSON.stringify({ error: message }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }
};
