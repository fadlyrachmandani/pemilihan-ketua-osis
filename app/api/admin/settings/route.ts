import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const settings = await prisma.electionSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { resultVisible, votingOpen } = await req.json();

  const settings = await prisma.electionSettings.upsert({
    where: { id: 1 },
    update: {
      ...(resultVisible !== undefined && { resultVisible }),
      ...(votingOpen !== undefined && { votingOpen }),
    },
    create: {
      id: 1,
      resultVisible: resultVisible ?? false,
      votingOpen: votingOpen ?? true,
    },
  });

  return NextResponse.json({ settings });
}
