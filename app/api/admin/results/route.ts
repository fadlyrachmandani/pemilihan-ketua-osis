import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { votes: true } } },
  });

  const settings = await prisma.electionSettings.findUnique({ where: { id: 1 } });

  const results = candidates.map((c) => ({
    id: c.id,
    number: c.number,
    chairName: c.chairName,
    viceName: c.viceName,
    voteCount: c._count.votes,
  }));

  const res = NextResponse.json({
    results,
    resultVisible: settings?.resultVisible ?? false,
  });
  res.headers.set("Cache-Control", "private, max-age=2, stale-while-revalidate=4");
  return res;
}
