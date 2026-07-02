import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface ExtractResult {
  text: string;
  truncated: boolean;
  originalLength: number;
}

const TIER_CHAR_LIMITS: Record<string, number> = {
  pro: 50_000,
  premium: 200_000,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export function validateUpload(
  fileSize: number,
  mimeType: string,
  tier: string
): { ok: true } | { ok: false; error: string; status: number } {
  if (tier === "free") {
    return { ok: false, error: "A dokumentum-feldolgozás Pro vagy Premium előfizetéssel érhető el.", status: 403 };
  }

  if (!SUPPORTED_TYPES[mimeType]) {
    return { ok: false, error: "Nem támogatott fájlformátum. Támogatott: PDF, DOCX, TXT.", status: 400 };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { ok: false, error: "A fájl túl nagy (maximum 10 MB).", status: 400 };
  }

  return { ok: true };
}

export async function extractText(
  buffer: ArrayBuffer,
  mimeType: string,
  tier: string
): Promise<ExtractResult> {
  const type = SUPPORTED_TYPES[mimeType];
  let raw = "";

  if (type === "pdf") {
    // pdf-parse 2.x: osztály-alapú API (a v1-es `pdf(buffer)` hívás már nem létezik)
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      raw = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (type === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    raw = result.value;
  } else {
    raw = new TextDecoder("utf-8").decode(buffer);
  }

  raw = raw.trim();

  if (!raw) {
    throw new Error("A fájlból nem sikerült szöveget kinyerni.");
  }

  const limit = TIER_CHAR_LIMITS[tier] ?? TIER_CHAR_LIMITS.pro;
  const truncated = raw.length > limit;

  return {
    text: truncated ? raw.slice(0, limit) : raw,
    truncated,
    originalLength: raw.length,
  };
}
