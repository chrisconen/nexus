import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { put, del } from "@vercel/blob";

const BLOB_TOKEN = import.meta.env.BLOB_READ_WRITE_TOKEN;

// Hitelesítés: élesben BLOB_READ_WRITE_TOKEN; lokális dev-ben Vercel OIDC token + store ID
// (a `vercel env pull` adja — az RW token "sensitive", ezért CLI-vel nem letölthető).
const blobAuth = BLOB_TOKEN
  ? { token: BLOB_TOKEN }
  : { oidcToken: import.meta.env.VERCEL_OIDC_TOKEN, storeId: import.meta.env.BLOB_STORE_ID };

export const prerender = false;

const ALLOWED_TYPES = new Set([
  "image/webp",
  "image/avif",
  "image/png",
  "image/jpeg",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// POST — kép feltöltése
export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Nincs fájl csatolva" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(
      JSON.stringify({ error: "Csak WebP, AVIF, PNG és JPEG formátum támogatott." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (file.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: "A kép túl nagy (maximum 5 MB)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const blob = await put(`sites/${session.user.id}/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
      ...blobAuth,
    });

    return new Response(
      JSON.stringify({ url: blob.url, fileName: file.name }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Blob upload error:", err);
    return new Response(
      JSON.stringify({ error: "Hiba a kép feltöltése közben." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// DELETE — kép törlése
export const DELETE: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return new Response(JSON.stringify({ error: "Nem vagy bejelentkezve" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "Hiányzó URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await del(url, blobAuth);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Blob delete error:", err);
    return new Response(
      JSON.stringify({ error: "Hiba a kép törlése közben." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
