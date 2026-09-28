import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
  const settings = await prisma.electionSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json({ settings });
  } catch (e) {
    return apiError(e, "Gagal memuat pengaturan.", { detail: true });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
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
  } catch (e) {
    return apiError(e, "Gagal menyimpan pengaturan.", { detail: true });
  }
}
