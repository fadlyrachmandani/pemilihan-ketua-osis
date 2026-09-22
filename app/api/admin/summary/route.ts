import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [totalVoters, votedCount, totalVotes, totalCandidates] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { hasVoted: true } }),
    prisma.vote.count(),
    prisma.candidate.count(),
  ]);

  const res = NextResponse.json({
    totalVoters,
    votedCount,
    notVotedCount: totalVoters - votedCount,
    totalVotes,
    totalCandidates,
  });
  // cache 3 detik biar polling tidak hantam DB tiap detik
  res.headers.set("Cache-Control", "private, max-age=3, stale-while-revalidate=5");
  return res;
}
