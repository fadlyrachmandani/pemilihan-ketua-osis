import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { isBlobConfigured, saveCandidatePhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const candidates = await prisma.candidate.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json({ candidates });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let number: any;
  let chairName: any;
  let viceName: any;
  let photoUrl: any;
  let vision: any;
  let mission: any;

  // Dukung 2 mode: JSON (lama) dan FormData dengan file (baru)
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    number = form.get("number");
    chairName = form.get("chairName");
    viceName = form.get("viceName");
    vision = form.get("vision");
    mission = form.get("mission");
    const file = form.get("file") as File | null;
    const photoUrlField = form.get("photoUrl") as string | null;
    if (file && file.size > 0) {
      // Upload beneran: ke Vercel Blob kalau token ada, fallback ke public/uploads saat lokal
      try {
        const saved = await saveCandidatePhoto(file);
        photoUrl = saved.url;
      } catch (e: any) {
        if (e.message?.includes("read-only") || e.code === "EROFS" || e.message?.includes("EROFS")) {
          return NextResponse.json(
            {
              message:
                "Upload gagal: filesystem Vercel read-only dan Blob belum dikonfigurasi. Buat Blob Store di Vercel lalu isi BLOB_READ_WRITE_TOKEN, atau pakai URL foto manual untuk sementara.",
              blobConfigured: isBlobConfigured(),
            },
            { status: 500 }
          );
        }
        return NextResponse.json({ message: "Gagal simpan foto: " + e.message }, { status: 500 });
      }
    } else {
      photoUrl = photoUrlField;
    }
  } else {
    const body = await req.json();
    ({ number, chairName, viceName, photoUrl, vision, mission } = body);
  }

  if (!number || !chairName || !viceName) {
    return NextResponse.json(
      { message: "Nomor urut, nama ketua, dan nama wakil wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const candidate = await prisma.candidate.create({
      data: {
        number: Number(number),
        chairName: String(chairName).trim(),
        viceName: String(viceName).trim(),
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        vision: vision ? String(vision).trim() : "",
        mission: mission ? String(mission).trim() : "",
      },
    });
    return NextResponse.json({ candidate }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { message: "Nomor urut paslon sudah dipakai." },
        { status: 409 }
      );
    }
    throw e;
  }
}
