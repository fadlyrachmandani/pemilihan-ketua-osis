import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.electionSettings.findUnique({ where: { id: 1 } });

  // Selalu hitung partisipasi — dipakai publik saat voting berlangsung
  const [totalVoters, votedCount] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { hasVoted: true } }),
  ]);
  const notVotedCount = totalVoters - votedCount;
  const isComplete = totalVoters > 0 && votedCount >= totalVoters;
  const isRevealed = !!settings?.resultVisible || isComplete;

  // Jika belum reveal & belum 100% → jangan bocorkan voteCount, cuma kirim progres
  if (!isRevealed) {
    const res = NextResponse.json(
      {
        resultVisible: false,
        isComplete: false,
        message: "Pemungutan suara masih berlangsung. Hasil akan tampil otomatis saat semua pemilih sudah memilih atau panitia klik Tampilkan Hasil.",
        totalVoters,
        votedCount,
        notVotedCount,
        totalVotes: 0,
        results: [],
        votingOpen: settings?.votingOpen ?? true,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "public, max-age=3, s-maxage=3, stale-while-revalidate=5");
    return res;
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { votes: true } } },
  });

  const results = candidates.map((c) => ({
    id: c.id,
    number: c.number,
    chairName: c.chairName,
    viceName: c.viceName,
    photoUrl: c.photoUrl,
    voteCount: c._count.votes,
  }));

  const totalVotes = results.reduce((s, r) => s + r.voteCount, 0);

  const res = NextResponse.json({
    resultVisible: true,
    isComplete,
    results,
    totalVotes,
    totalVoters,
    votedCount,
    notVotedCount,
    votingOpen: settings?.votingOpen ?? true,
  });
  res.headers.set("Cache-Control", "public, max-age=3, s-maxage=3, stale-while-revalidate=5");
  return res;
}
