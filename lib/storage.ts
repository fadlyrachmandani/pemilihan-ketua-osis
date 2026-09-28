import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function validatePhotoFile(file: File): string | null {
  if (file.size > MAX_PHOTO_SIZE) return "Ukuran foto maksimal 5MB.";
  if (file.type && file.type !== "" && !file.type.startsWith("image/")) {
    return "Hanya file gambar yang diperbolehkan (jpg, png, webp, gif).";
  }
  return null;
}

export function resolvePhotoExt(fileName: string, mimeType: string): string {
  let ext = path.extname(fileName || "").toLowerCase();
  if (!ext) {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    ext = map[mimeType] || ".jpg";
  }
  if (!ALLOWED_EXTS.includes(ext)) ext = ".jpg";
  return ext;
}

export function buildPhotoFilename(ext: string): string {
  return `paslon-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
}

/**
 * Simpan foto paslon.
 * - Kalau BLOB_READ_WRITE_TOKEN ada -> upload ke Vercel Blob (permanen, works di Vercel).
 * - Kalau tidak ada (lokal/dev) -> simpan ke public/uploads seperti dulu.
 */
export async function saveCandidatePhoto(file: File): Promise<{ url: string; storage: "blob" | "local" }> {
  const validationError = validatePhotoFile(file);
  if (validationError) throw new Error(validationError);

  const ext = resolvePhotoExt(file.name || "upload", file.type);
  const filename = buildPhotoFilename(ext);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (isBlobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`paslon/${filename}`, buffer, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false,
    });
    return { url: blob.url, storage: "blob" };
  }

  // Fallback lokal (npm run dev / VPS dengan disk writable)
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/${filename}`, storage: "local" };
}
