import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { isBlobConfigured, saveCandidatePhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

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

  try {
    const saved = await saveCandidatePhoto(file);
    return NextResponse.json({
      photoUrl: saved.url,
      filename: saved.url.split("/").pop(),
      size: file.size,
      storage: saved.storage,
      blobConfigured: isBlobConfigured(),
    });
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
    const status = e.message?.includes("maksimal 5MB") || e.message?.includes("gambar") ? 400 : 500;
    return NextResponse.json({ message: "Gagal menyimpan file: " + e.message }, { status });
  }
}
