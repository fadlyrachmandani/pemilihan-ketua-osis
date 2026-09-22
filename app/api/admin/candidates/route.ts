import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
import { randomUUID } from "crypto";

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
      // validasi & simpan file langsung di POST ini
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ message: "Ukuran foto maksimal 5MB." }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      let ext = path.extname(file.name || "").toLowerCase();
      if (!ext) {
        const map: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/jpg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/gif": ".gif",
        };
        ext = map[file.type] || ".jpg";
      }
      if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) ext = ".jpg";
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);
        photoUrl = `/uploads/${filename}`;
      } catch (e: any) {
        if (e.code === "EROFS" || e.message?.includes("read-only")) {
          return NextResponse.json(
            { message: "Upload gagal di Vercel (read-only). Gunakan URL foto manual atau Vercel Blob." },
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
