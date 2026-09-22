import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    { nisn: "0103150447", name: "Budi Santoso" },
    { nisn: "0103150448", name: "Siti Aminah" },
    { nisn: "0103150449", name: "Rudi Hartono" },
  ];
  const ws = XLSX.utils.json_to_sheet(data, { header: ["nisn", "name"] });
  // set kolom nisn sebagai text agar leading zero aman
  ws["!cols"] = [{ wch: 15 }, { wch: 30 }];
  // set format text untuk kolom A
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell) cell.z = "@";
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-nisn.xlsx"',
    },
  });
}
