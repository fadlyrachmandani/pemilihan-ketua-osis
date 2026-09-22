import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeNisn(raw: any): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  s = s.replace(/\s+/g, "");
  if (s.includes(".")) s = s.split(".")[0];
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 10) {
    // pad untuk kasus 100000000 -> 0100000000 (kehilangan leading 0 di Excel numeric)
    return digits.padStart(10, "0");
  }
  // jika lebih dari 10 digit ambil 10 terakhir? tidak, biarkan validasi yang tangkap
  return digits;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  let parsedRows: { nisnRaw: any; nameRaw: any; excelRow: number }[] = [];
  let totalRowsInSheet = 0;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ message: "File Excel wajib diupload. Field name: file" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ message: "File Excel kosong / tidak ada sheet." }, { status: 400 });
      }
      const ws = wb.Sheets[sheetName];

      // Baca sebagai array-of-arrays untuk deteksi header robust (Dapodik punya 4 baris meta di atas)
      const aoa = XLSX.utils.sheet_to_json<any[]>(ws, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      }) as any[][];

      totalRowsInSheet = aoa.length;

      // Cari baris header yang mengandung NISN + NAMA/NAME
      let headerIdx = -1;
      let nisnIdx = -1;
      let namaIdx = -1;

      for (let r = 0; r < aoa.length; r++) {
        const row = aoa[r] || [];
        const norm = row.map((c) => normalizeHeader(String(c ?? "")));
        const hasNisn = norm.includes("nisn") || norm.includes("nis");
        const hasNama = norm.includes("nama") || norm.includes("name") || norm.some((h) => h === "namasiswa" || h === "nama_siswa");
        // untuk file kamu: ["no","nama","nipd","jk","nisn"] -> hasNisn && hasNama true di r=4
        if (hasNisn && hasNama) {
          headerIdx = r;
          nisnIdx = norm.indexOf("nisn");
          if (nisnIdx === -1) nisnIdx = norm.indexOf("nis");
          namaIdx = norm.indexOf("nama");
          if (namaIdx === -1) namaIdx = norm.indexOf("name");
          if (namaIdx === -1) namaIdx = norm.findIndex((h) => h.includes("nama"));
          break;
        }
      }

      if (headerIdx === -1) {
        // Fallback: coba parsing normal dengan header baris pertama (untuk template nisn,name)
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
          defval: "",
          raw: false,
          blankrows: false,
        });
        // convert json rows to parsedRows via getRowValue fallback
        for (let i = 0; i < json.length; i++) {
          const row = json[i] as Record<string, any>;
          const keys = Object.keys(row).map((k) => normalizeHeader(k));
          // cari nisn & nama via keys
          let nisnRaw: any = "";
          let nameRaw: any = "";
          for (const k of Object.keys(row)) {
            const nk = normalizeHeader(k);
            if (nk === "nisn" || nk === "nis") nisnRaw = row[k];
            if (nk === "nama" || nk === "name" || nk === "namasiswa") nameRaw = row[k];
          }
          // jika tidak ketemu via header, coba fallback kolom pertama/terakhir
          parsedRows.push({ nisnRaw, nameRaw, excelRow: i + 2 });
        }
      } else {
        // Header ditemukan (Dapodik atau template), ambil data di bawahnya
        for (let r = headerIdx + 1; r < aoa.length; r++) {
          const row = aoa[r] || [];
          // skip baris kosong total
          const isEmpty = row.every((c) => String(c ?? "").trim() === "");
          if (isEmpty) continue;
          // untuk baris No | Nama | NIPD | JK | NISN → row[1]=Nama, row[4]=NISN
          // tapi jaga jika kolom bergeser, pakai idx yang terdeteksi
          const rawNisn = nisnIdx >= 0 && nisnIdx < row.length ? row[nisnIdx] : "";
          const rawNama = namaIdx >= 0 && namaIdx < row.length ? row[namaIdx] : "";
          // skip baris yang terlihat seperti sub-header lagi atau baris kosong
          if (String(rawNisn).trim() === "" && String(rawNama).trim() === "") continue;
          // skip jika Nama == "Nama" lagi (header duplikat)
          if (normalizeHeader(String(rawNama)) === "nama" && normalizeHeader(String(rawNisn)) === "nisn") continue;
          parsedRows.push({ nisnRaw: rawNisn, nameRaw: rawNama, excelRow: r + 1 });
        }
      }
    } else {
      // fallback JSON (CSV legacy atau {rows})
      const body = await req.json().catch(() => ({}));
      if (body.csv && typeof body.csv === "string") {
        const lines = body.csv.split(/\r?\n/).filter((l: string) => l.trim());
        if (lines.length < 2) {
          return NextResponse.json({ message: "CSV minimal header + 1 baris." }, { status: 400 });
        }
        const headers = lines[0].split(",").map((h: string) => normalizeHeader(h));
        const nisnCol = headers.indexOf("nisn") !== -1 ? headers.indexOf("nisn") : headers.indexOf("nis");
        const namaCol = headers.indexOf("nama") !== -1 ? headers.indexOf("nama") : headers.indexOf("name");
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          parsedRows.push({
            nisnRaw: nisnCol >= 0 ? cols[nisnCol] : "",
            nameRaw: namaCol >= 0 ? cols[namaCol] : "",
            excelRow: i + 1,
          });
        }
      } else if (Array.isArray(body.rows)) {
        for (let i = 0; i < body.rows.length; i++) {
          const r = body.rows[i];
          parsedRows.push({ nisnRaw: r.nisn ?? r.nis ?? "", nameRaw: r.name ?? r.nama ?? "", excelRow: i + 2 });
        }
      } else if (Array.isArray(body)) {
        for (let i = 0; i < body.length; i++) {
          const r = body[i];
          parsedRows.push({ nisnRaw: r.nisn ?? r.nis ?? "", nameRaw: r.name ?? r.nama ?? "", excelRow: i + 2 });
        }
      } else {
        return NextResponse.json(
          { message: "Upload file Excel (.xlsx/.xls) via FormData field 'file', atau kirim JSON {rows}." },
          { status: 400 }
        );
      }
    }
  } catch (e: any) {
    return NextResponse.json({ message: "Gagal membaca file: " + (e.message || String(e)) }, { status: 400 });
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      {
        message:
          "Tidak ada baris data terdeteksi. Pastikan file punya header Nama & NISN (contoh No | Nama | NIPD | JK | NISN atau nisn,name). Baris meta di atas akan otomatis di-skip.",
        totalRowsInSheet,
      },
      { status: 400 }
    );
  }

  // Validasi & kumpulkan
  const toCreate: { nisn: string; name: string }[] = [];
  const invalid: { row: number; reason: string; nisnRaw?: string; nameRaw?: string }[] = [];
  const seenInFile = new Set<string>();

  for (const { nisnRaw, nameRaw, excelRow } of parsedRows) {
    const nisn = normalizeNisn(nisnRaw);
    const name = String(nameRaw ?? "").trim();

    if (!nisn && !name) continue;

    if (!nisn || !name) {
      invalid.push({ row: excelRow, reason: `Baris ${excelRow}: nisn/nama kosong (nisn="${String(nisnRaw).trim()}", nama="${String(nameRaw).trim()}")`, nisnRaw: String(nisnRaw), nameRaw: String(nameRaw) });
      continue;
    }
    if (!/^\d{10}$/.test(nisn)) {
      invalid.push({ row: excelRow, reason: `Baris ${excelRow}: NISN "${String(nisnRaw).trim()}" → "${nisn}" harus 10 digit angka (contoh 0100000000)`, nisnRaw: String(nisnRaw), nameRaw: String(nameRaw) });
      continue;
    }
    if (!name || name.length < 2) {
      invalid.push({ row: excelRow, reason: `Baris ${excelRow}: nama terlalu pendek`, nisnRaw: String(nisnRaw), nameRaw: String(nameRaw) });
      continue;
    }
    if (seenInFile.has(nisn)) {
      invalid.push({ row: excelRow, reason: `Baris ${excelRow}: NISN ${nisn} duplikat di file`, nisnRaw: String(nisnRaw), nameRaw: String(nameRaw) });
      continue;
    }
    seenInFile.add(nisn);
    toCreate.push({ nisn, name });
  }

  if (toCreate.length === 0) {
    return NextResponse.json(
      {
        message: "Tidak ada data valid untuk diimpor.",
        invalidCount: invalid.length,
        invalid: invalid.slice(0, 20),
        totalRowsInSheet,
        parsedRows: parsedRows.length,
      },
      { status: 400 }
    );
  }

  // Insert batch — gunakan createMany skipDuplicates untuk performa 661 rows
  let createdCount = 0;
  let skippedCount = 0;
  try {
    // createMany dengan skipDuplicates didukung Postgres
    const result = await prisma.voter.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    createdCount = result.count;
    skippedCount = toCreate.length - createdCount;
  } catch (e: any) {
    // Fallback loop per-row jika createMany gagal (mis. pgbouncer prepared statement issue)
    // Coba per-row tapi dengan cara yang aman untuk pgbouncer (gunakan $executeRaw atau create individual dengan try)
    createdCount = 0;
    skippedCount = 0;
    for (const item of toCreate) {
      try {
        await prisma.voter.create({ data: item });
        createdCount++;
      } catch (err: any) {
        if (err.code === "P2002") skippedCount++;
        else invalid.push({ row: 0, reason: `Gagal simpan ${item.nisn}: ${err.message}`, nisnRaw: item.nisn, nameRaw: item.name });
      }
    }
  }

  // Ambil sample duplikat dari DB jika skipped >0 (opsional)
  return NextResponse.json({
    createdCount,
    skippedCount,
    invalidCount: invalid.length,
    invalid: invalid.slice(0, 30),
    totalRowsInSheet,
    parsedRows: parsedRows.length,
    toCreateCount: toCreate.length,
    message:
      createdCount > 0
        ? `Berhasil ${createdCount} dari ${parsedRows.length} baris (duplikat ${skippedCount}, invalid ${invalid.length}). File Dapodik No/Nama/NIPD/JK/NISN otomatis terdeteksi.`
        : `Tidak ada data baru. Duplikat ${skippedCount}, invalid ${invalid.length}.`,
  });
}
