import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

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

  return NextResponse.json({
    totalVoters,
    votedCount,
    notVotedCount: totalVoters - votedCount,
    totalVotes,
    totalCandidates,
  });
}
