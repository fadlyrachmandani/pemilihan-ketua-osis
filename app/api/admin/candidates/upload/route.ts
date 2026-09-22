import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "Gagal membaca FormData." }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ message: "File foto wajib diupload. Field: file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ message: "Ukuran foto maksimal 5MB." }, { status: 400 });
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    // tetap izinkan tapi warning, jangan strict block jika type kosong di beberapa browser
    if (file.type !== "" && !file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Hanya file gambar yang diperbolehkan (jpg, png, webp, gif)." }, { status: 400 });
    }
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // tentukan ekstensi
  const originalName = file.name || "upload";
  let ext = path.extname(originalName).toLowerCase();
  if (!ext) {
    // fallback dari mime
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    ext = map[file.type] || ".jpg";
  }
  // whitelist ext
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) ext = ".jpg";

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
  } catch (e: any) {
    // Vercel filesystem read-only → beri instruksi
    if (e.code === "EROFS" || e.message?.includes("read-only")) {
      return NextResponse.json(
        {
          message:
            "Upload gagal di Vercel (filesystem read-only). Gunakan hosting dengan storage persisten atau hubungkan Vercel Blob. Untuk TPS lokal (npm run dev) upload ke public/uploads tetap works.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: "Gagal menyimpan file: " + e.message }, { status: 500 });
  }

  const photoUrl = `/uploads/${filename}`;
  return NextResponse.json({ photoUrl, filename, size: file.size });
}
