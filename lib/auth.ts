import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 jam, cukup untuk 1 hari pemilihan

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diset di environment variables");
  }
  return secret;
}

function sign(value: string): string {
  const hmac = createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed: string): boolean {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return false;
  const value = signed.slice(0, lastDot);
  const hmac = signed.slice(lastDot + 1);
  if (!value || !hmac) return false;
  const expected = createHmac("sha256", getSecret()).update(value).digest("hex");
  if (hmac.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function createAdminSessionCookieValue(): string {
  const payload = `admin.${Date.now()}`;
  return sign(payload);
}

export function isValidAdminSessionValue(value: string | undefined): boolean {
  if (!value) return false;
  if (!verify(value)) return false;
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = value.slice(0, lastDot); // "admin.<timestamp>"
  const dotInPayload = payload.indexOf(".");
  if (dotInPayload === -1) return false;
  const timestamp = Number(payload.slice(dotInPayload + 1));
  if (Number.isNaN(timestamp)) return false;
  const ageSeconds = (Date.now() - timestamp) / 1000;
  return ageSeconds >= 0 && ageSeconds <= MAX_AGE_SECONDS;
}

export function isAdminAuthenticated(): boolean {
  const cookieStore = cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSessionValue(session);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
