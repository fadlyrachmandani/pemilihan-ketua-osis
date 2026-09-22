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
    return NextResponse.json({ message: "NISN harus 10 digit (contoh 0103150447)." }, { status: 400 });
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

  // Transaksi: tandai voter sudah memilih HANYA jika masih hasVoted=false
  // (mencegah double-vote kalau ada 2 request nyaris bersamaan dari NIS sama),
  // lalu catat suara secara anonim (tanpa relasi ke voter).
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.voter.updateMany({
      where: { id: voter.id, hasVoted: false },
      data: { hasVoted: true, votedAt: new Date() },
    });

    if (updated.count === 0) {
      // Race condition: NISN sudah keburu dipakai request lain
      return null;
    }

    const vote = await tx.vote.create({
      data: { candidateId: candidate.id },
    });

    return vote;
  });

  if (!result) {
    return NextResponse.json({ message: "NISN ini sudah digunakan." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
