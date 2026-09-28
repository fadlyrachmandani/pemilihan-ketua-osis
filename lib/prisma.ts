import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Supabase pooler (port 6543, PgBouncer transaction mode) TIDAK mendukung
 * prepared statement. Tanpa ?pgbouncer=true, Prisma kena error acak
 * `prepared statement "s0" already exists` (42P05) — makin sering saat
 * koneksi pool dipakai ulang (production, banyak laptop).
 * Paksa param ini di kode agar production sembuh tanpa harus edit env manual.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || /[?&]pgbouncer=/.test(raw)) return raw;
  return raw + (raw.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true");
}

function createClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (url) process.env.DATABASE_URL = url;
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
