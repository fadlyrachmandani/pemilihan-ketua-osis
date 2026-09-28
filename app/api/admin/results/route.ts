import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
  const [candidates, settings, totalVoters, votedCount] = await Promise.all([
    prisma.candidate.findMany({
      orderBy: { number: "asc" },
      include: { _count: { select: { votes: true } } },
    }),
    prisma.electionSettings.findUnique({ where: { id: 1 } }),
    prisma.voter.count(),
    prisma.voter.count({ where: { hasVoted: true } }),
  ]);

  const results = candidates.map((c) => ({
    id: c.id,
    number: c.number,
    chairName: c.chairName,
    viceName: c.viceName,
    voteCount: c._count.votes,
  }));

  const totalVotes = results.reduce((s, r) => s + r.voteCount, 0);

  const res = NextResponse.json({
    results,
    resultVisible: settings?.resultVisible ?? false,
    totalVotes,
    totalVoters,
    votedCount,
    notVotedCount: totalVoters - votedCount,
  });
  res.headers.set("Cache-Control", "private, max-age=2, stale-while-revalidate=4");
  return res;
  } catch (e) {
    return apiError(e, "Gagal memuat hasil.", { detail: true });
  }
}
