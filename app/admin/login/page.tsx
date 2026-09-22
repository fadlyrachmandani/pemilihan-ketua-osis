"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal login.");
        setLoading(false);
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan koneksi.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#1d4ed8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-2xl border border-white/20">🔐</div>
          <h1 className="text-white font-extrabold text-xl mt-3">Login Panitia</h1>
          <p className="text-blue-200 text-sm">Pemilihan OSIS SMAN 1 Rambutan</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-2xl rounded-2xl p-6 md:p-7 space-y-4 border border-white/50"
        >
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Password Admin</label>
            <div className="relative mt-1.5">
              <input
                type={show ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs border border-slate-200 bg-white rounded-full px-2.5 py-1 text-slate-600">
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40"
          >
            {loading ? "Memeriksa..." : "Masuk ke Dashboard →"}
          </button>
          <p className="text-[11px] text-slate-400 text-center">Hanya panitia yang memiliki password dapat mengakses dashboard.</p>
        </form>
        <p className="text-center text-blue-200/70 text-xs mt-4">© SMAN 1 Rambutan • Satu NISN satu suara</p>
      </div>
    </main>
  );
}
