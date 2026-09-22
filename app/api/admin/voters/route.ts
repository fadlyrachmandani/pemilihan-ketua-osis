import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const voters = await prisma.voter.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ voters });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const rawNisn = body.nisn ?? body.nis ?? "";
  const nisn = String(rawNisn ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!nisn || !name) {
    return NextResponse.json(
      { message: "NISN dan nama wajib diisi." },
      { status: 400 }
    );
  }
  if (!/^\d{10}$/.test(nisn)) {
    return NextResponse.json({ message: "NISN harus 10 digit angka (contoh 0103150447)." }, { status: 400 });
  }

  try {
    const voter = await prisma.voter.create({
      data: { nisn, name },
    });
    return NextResponse.json({ voter }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ message: "NISN sudah terdaftar." }, { status: 409 });
    }
    throw e;
  }
}
