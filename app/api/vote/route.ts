import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rawNisn = body.nisn ?? body.nis ?? "";
  const nisn = String(rawNisn ?? "").trim();
  const { candidateId } = body;

  if (!nisn || !candidateId) {
    return NextResponse.json(
      { message: "NISN dan pilihan paslon wajib diisi." },
      { status: 400 }
    );
  }
  if (!/^\d{10}$/.test(nisn)) {
    return NextResponse.json({ message: "NISN harus 10 digit (contoh 0100000000)." }, { status: 400 });
  }

  const settings = await prisma.electionSettings.findUnique({ where: { id: 1 } });
  if (!settings?.votingOpen) {
    return NextResponse.json({ message: "Pemungutan suara sedang ditutup." }, { status: 403 });
  }

  const voter = await prisma.voter.findUnique({ where: { nisn } });
  if (!voter) {
    return NextResponse.json({ message: "NISN tidak valid." }, { status: 404 });
  }
  if (voter.hasVoted) {
    return NextResponse.json({ message: "NISN ini sudah digunakan." }, { status: 409 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    return NextResponse.json({ message: "Paslon tidak ditemukan." }, { status: 404 });
  }

  // Optimasi untuk 8 laptop konkuren + Supabase pooler (pgbouncer transaction mode tidak support interactive $transaction)
  // Cukup 2 query sekuensial: update hasVoted dengan filter hasVoted=false (row-level lock), baru insert vote jika update berhasil.
  // Ini tetap aman dari double-vote untuk NISN sama karena PostgreSQL serialize updateMany, dan untuk NISN beda tetap paralel tanpa lock.
  const updated = await prisma.voter.updateMany({
    where: { id: voter.id, hasVoted: false },
    data: { hasVoted: true, votedAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ message: "NISN ini sudah digunakan." }, { status: 409 });
  }

  try {
    await prisma.vote.create({
      data: { candidateId: candidate.id },
    });
  } catch (e: any) {
    // rollback hasVoted jika vote gagal (jarang)
    await prisma.voter.update({ where: { id: voter.id }, data: { hasVoted: false, votedAt: null } });
    throw e;
  }

  return NextResponse.json({ success: true });
}
