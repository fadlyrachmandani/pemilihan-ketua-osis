import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.electionSettings.findUnique({ where: { id: 1 } });

  // Jika hasil disembunyikan panitia → jangan bocorkan voteCount
  if (!settings?.resultVisible) {
    return NextResponse.json(
      {
        resultVisible: false,
        message: "Hasil pemilihan masih disembunyikan oleh panitia.",
      },
      { status: 200 }
    );
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
  const totalVoters = await prisma.voter.count();
  const votedCount = await prisma.voter.count({ where: { hasVoted: true } });

  return NextResponse.json({
    resultVisible: true,
    results,
    totalVotes,
    totalVoters,
    votedCount,
    notVotedCount: totalVoters - votedCount,
  });
}
