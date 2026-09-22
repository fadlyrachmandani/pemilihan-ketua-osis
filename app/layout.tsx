import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pemilihan OSIS SMAN 1 Rambutan",
  description: "Sistem pemilihan Ketua & Wakil Ketua OSIS SMAN 1 Rambutan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-blue-100">{children}</body>
    </html>
  );
}
