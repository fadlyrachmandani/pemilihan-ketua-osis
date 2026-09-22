import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

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

  return NextResponse.json({
    results,
    resultVisible: settings?.resultVisible ?? false,
  });
}
