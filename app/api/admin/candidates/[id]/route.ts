import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
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
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await prisma.candidate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
