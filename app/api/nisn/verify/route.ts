import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeNisn(v: any): string {
  if (!v || typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const raw = body.nisn ?? body.nis ?? "";
  const nisn = normalizeNisn(raw);

  if (!nisn) {
    return NextResponse.json({ message: "NISN wajib diisi." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(nisn)) {
    return NextResponse.json({ message: "NISN harus 10 digit angka (contoh 0100000000)." }, { status: 400 });
  }

  const voter = await prisma.voter.findUnique({ where: { nisn } });

  if (!voter) {
    return NextResponse.json({ message: "NISN tidak ditemukan. Hubungi panitia." }, { status: 404 });
  }

  if (voter.hasVoted) {
    return NextResponse.json(
      { message: "NISN ini sudah digunakan untuk memilih." },
      { status: 409 }
    );
  }

  const settings = await prisma.electionSettings.findUnique({ where: { id: 1 } });

  if (!settings?.votingOpen) {
    return NextResponse.json({ votingOpen: false });
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      chairName: true,
      viceName: true,
      photoUrl: true,
      vision: true,
      mission: true,
    },
  });

  return NextResponse.json({
    votingOpen: true,
    voterName: voter.name,
    candidates,
  });
}
