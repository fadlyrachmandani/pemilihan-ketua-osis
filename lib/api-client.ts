/**
 * Helper client untuk baca response JSON dengan aman.
 * fetch().json() melempar "Unexpected end of JSON input" kalau server/edge
 * membalas body kosong (mis. 413 payload Vercel, timeout, proxy glitch).
 * Selalu pakai ini agar user dapat pesan ramah, bukan error mentah.
 */
export async function readJsonSafe(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Pesan error ramah berdasarkan status HTTP + body (hasil readJsonSafe).
 */
export function httpErrorMessage(status: number, data: any, fallback: string): string {
  if (data && typeof data.message === "string" && data.message) return data.message;
  if (status === 413)
    return "File kebesaran untuk limit Vercel (maks ~4MB). Kompres/perkecil fotonya lalu coba lagi.";
  if (status === 408 || status === 504) return "Koneksi timeout. Coba lagi.";
  if (status >= 500) return `${fallback} (server ${status}). Coba lagi.`;
  if (status === 0) return "Tidak bisa menghubungi server. Periksa koneksi internet.";
  return fallback;
}

/**
 * Versi sinkron untuk string mentah (mis. hasil res.text() yang sudah dibaca).
 */
export function parseJsonTextSafe(text: string): any {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
