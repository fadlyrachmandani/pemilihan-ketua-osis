import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
  const body = await req.json();
  const { number, chairName, viceName, photoUrl, vision, mission } = body;

  const candidate = await prisma.candidate.update({
    where: { id: params.id },
    data: {
      ...(number !== undefined && { number: Number(number) }),
      ...(chairName !== undefined && { chairName }),
      ...(viceName !== undefined && { viceName }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(vision !== undefined && { vision }),
      ...(mission !== undefined && { mission }),
    },
  });

  return NextResponse.json({ candidate });
  } catch (e) {
    return apiError(e, "Gagal mengubah paslon.", { detail: true });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
  await prisma.candidate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e, "Gagal menghapus paslon.", { detail: true });
  }
}
