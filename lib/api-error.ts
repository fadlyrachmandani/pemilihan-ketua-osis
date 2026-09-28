import { NextResponse } from "next/server";

/**
 * Balasan error JSON standar untuk API route.
 * Error yang dilempar tanpa catch di route handler Next.js menghasilkan
 * 500 BODY KOSONG di production (user lihat "Unexpected end of JSON input").
 * Selalu bungkus handler DB dengan try/catch + helper ini.
 *
 * - Rute publik (voting/hasil): pesan generik, detail hanya di server log.
 * - Rute admin (detail: true): sertakan pesan error asli biar gampang debug.
 */
export function apiError(
  e: any,
  fallback: string,
  opts: { status?: number; detail?: boolean } = {}
): NextResponse {
  const status = opts.status ?? 500;
  const raw = String(e?.message || e || "unknown").slice(0, 300);
  console.error(`[api] ${fallback} | status=${status} code=${e?.code || "-"} :: ${raw}`);
  const message =
    opts.detail && e?.message ? `${fallback}: ${raw}` : fallback;
  return NextResponse.json({ message }, { status });
}
