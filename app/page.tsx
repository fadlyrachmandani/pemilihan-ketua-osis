"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Candidate = {
  id: string;
  number: number;
  chairName: string;
  viceName: string;
  photoUrl: string | null;
  vision: string;
  mission: string;
};

type Stage = "nisn" | "confirm" | "vote" | "done" | "closed";

export default function VoterPage() {
  const [stage, setStage] = useState<Stage>("nisn");
  const [nisn, setNisn] = useState("");
  const [voterName, setVoterName] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkResults() {
      try {
        const res = await fetch("/api/results", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setResultVisible(!!data.resultVisible);
      } catch {}
    }
    checkResults();
    const id = setInterval(checkResults, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const title =
    process.env.NEXT_PUBLIC_ELECTION_TITLE ||
    "Pemilihan Ketua OSIS dan Wakil Ketua OSIS SMAN 1 Rambutan Periode 2026-2027";

  const isNisnValid = /^\d{10}$/.test(nisn.trim());

  async function handleVerifyNisn(e: React.FormEvent) {
    e.preventDefault();
    const val = nisn.trim();
    if (!/^\d{10}$/.test(val)) {
      setError("NISN harus 10 digit angka (contoh 0103150447).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // coba endpoint baru dulu, fallback ke lama jika 404
      let res = await fetch("/api/nisn/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nisn: val }),
      });
      if (res.status === 404) {
        const text = await res.text();
        // jika endpoint belum ada, coba legacy
        try {
          const legacy = await fetch("/api/nis/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nis: val }),
          });
          // jika legacy sukses, pakai itu
          if (legacy.ok || legacy.status !== 404) {
            res = legacy;
            const d = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(d.message || "NISN tidak valid.");
              setLoading(false);
              return;
            }
            if (!d.votingOpen) { setStage("closed"); setLoading(false); return; }
            setVoterName(d.voterName);
            setCandidates(d.candidates);
            setStage("confirm");
            setLoading(false);
            return;
          }
        } catch {}
        // tampilkan error asli
        setError(JSON.parse(text).message || "NISN tidak valid.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "NISN tidak valid.");
        setLoading(false);
        return;
      }
      if (!data.votingOpen) {
        setStage("closed");
        setLoading(false);
        return;
      }
      setVoterName(data.voterName);
      setCandidates(data.candidates);
      setStage("confirm");
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitVote() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nisn: nisn.trim(),
          nis: nisn.trim(),
          candidateId: selected.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal mengirim suara.");
        setLoading(false);
        return;
      }
      setStage("done");
    } catch {
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function resetForNextVoter() {
    setNisn("");
    setVoterName("");
    setCandidates([]);
    setSelected(null);
    setConfirming(false);
    setError(null);
    setStage("nisn");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white flex flex-col items-center px-4 py-8 md:py-12">
      {/* Header */}
      <div className="w-full max-w-5xl mb-6 md:mb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-blue-100 rounded-full px-4 py-1.5 shadow-sm mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-widest text-slate-600 uppercase">SMAN 1 Rambutan • TPS Digital</span>
        </div>
        <h1 className="text-[1.7rem] md:text-3xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          {title}
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-3 max-w-2xl mx-auto">
          Masukkan NISN 10 digit untuk memverifikasi identitas, lalu pilih pasangan calon pilihanmu. Satu NISN hanya dapat digunakan satu kali.
        </p>
        {resultVisible && (
          <div className="mx-auto mt-4 max-w-xl bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <p className="text-emerald-800 font-medium flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" /> Hasil sudah diumumkan!
            </p>
            <Link href="/hasil" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-1.5 font-bold text-xs whitespace-nowrap shadow">
              Lihat Hasil →
            </Link>
          </div>
        )}
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[
            { k: "nisn", label: "Verifikasi" },
            { k: "confirm", label: "Konfirmasi" },
            { k: "vote", label: "Pilih" },
            { k: "done", label: "Selesai" },
          ].map((s, i) => {
            const active = stage === s.k || (stage === "closed" && s.k === "nisn");
            const done = ["nisn", "confirm", "vote"].indexOf(stage) > ["nisn", "confirm", "vote"].indexOf(s.k);
            return (
              <div key={s.k} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${active ? "bg-primary text-white border-primary shadow" : done ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-400 border-slate-200"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`hidden sm:inline text-xs font-semibold ${active ? "text-primary" : "text-slate-400"}`}>{s.label}</span>
                {i < 3 && <div className={`hidden sm:block h-px w-10 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {stage === "nisn" && (
        <form
          onSubmit={handleVerifyNisn}
          className="bg-white/90 backdrop-blur shadow-[0_8px_40px_-12px_rgba(30,58,138,0.25)] border border-white rounded-2xl p-6 md:p-8 w-full max-w-md space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Masukkan NISN
            </label>
            <div className="relative">
              <input
                autoFocus
                value={nisn}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setNisn(v);
                  if (error) setError(null);
                }}
                placeholder="0103150447"
                inputMode="numeric"
                className={`w-full border rounded-xl px-4 py-3.5 text-center text-xl tracking-[0.25em] font-mono bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 placeholder:tracking-normal placeholder:text-base ${error ? "border-red-300 focus:ring-red-200" : isNisnValid ? "border-emerald-300 focus:ring-emerald-200" : "border-slate-200 focus:ring-blue-200"}`}
                maxLength={10}
              />
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                {nisn.length}/10 digit • Contoh: <span className="font-mono text-slate-600">0103150447</span>
              </p>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex gap-2">
              <span className="mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}
          {!error && isNisnValid && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3 py-2 text-center">✓ Format NISN valid</div>
          )}
          <button
            type="submit"
            disabled={loading || !isNisnValid}
            className="w-full bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] hover:from-[#1e40af] hover:to-[#1e3a8a] text-white rounded-xl py-3.5 font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:shadow-none transition"
          >
            {loading ? "Memeriksa..." : "Lanjutkan →"}
          </button>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            NISN hanya bisa dipakai <span className="font-semibold text-slate-700">satu kali</span>. Pastikan kamu sudah terdaftar oleh panitia.
          </p>
        </form>
      )}

      {stage === "confirm" && (
        <div className="bg-white shadow-[0_8px_40px_-12px_rgba(30,58,138,0.25)] border border-white rounded-2xl p-6 md:p-8 w-full max-w-md text-center space-y-5 animate-[fadeIn_0.3s]">
          <div className="mx-auto h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-xs tracking-widest font-semibold text-slate-400 uppercase">Konfirmasi Identitas</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{voterName}</p>
            <div className="inline-flex items-center gap-2 mt-2 bg-slate-100 rounded-full px-3 py-1">
              <span className="text-xs font-medium text-slate-500">NISN</span>
              <span className="font-mono font-bold text-slate-800 tracking-widest">{nisn}</span>
            </div>
          </div>
          <p className="text-sm text-slate-600">Apakah data di atas sudah benar?</p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForNextVoter}
              className="flex-1 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl py-3 font-semibold text-slate-700"
            >
              Bukan Saya
            </button>
            <button
              onClick={() => setStage("vote")}
              className="flex-1 bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] text-white rounded-xl py-3 font-bold shadow"
            >
              Ya, Benar ✓
            </button>
          </div>
        </div>
      )}

      {stage === "closed" && (
        <div className="bg-white shadow rounded-2xl p-8 w-full max-w-md text-center space-y-4">
          <p className="text-3xl">🔒</p>
          <p className="text-lg font-bold text-slate-800">Pemungutan suara belum/tidak dibuka</p>
          <p className="text-sm text-slate-500">Silakan hubungi panitia di lokasi TPS.</p>
          <button
            onClick={resetForNextVoter}
            className="text-primary underline text-sm font-semibold"
          >
            ← Kembali
          </button>
        </div>
      )}

      {stage === "vote" && (
        <div className="w-full max-w-5xl space-y-6">
          <div className="bg-white/80 backdrop-blur border border-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <p className="text-slate-700">
              Halo <strong className="text-slate-900">{voterName}</strong> <span className="font-mono text-slate-500">({nisn})</span> — pilih satu paslon:
            </p>
            <button onClick={resetForNextVoter} className="text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-full px-4 py-1.5 bg-white">Ganti NISN</button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {candidates
              .sort((a, b) => a.number - b.number)
              .map((c) => (
                <div
                  key={c.id}
                  className="group bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden flex flex-col border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition"
                >
                  <div className="bg-gradient-to-r from-[#1d4ed8] to-[#1e3a8a] text-white text-center py-2.5 font-extrabold tracking-wide">
                    PASLON No. {c.number}
                  </div>
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photoUrl}
                      alt={`Foto paslon ${c.number}`}
                      className="w-full h-56 object-cover"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <span className="text-3xl">🖼️</span>
                      <span className="text-xs">Foto belum tersedia</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <p className="font-bold text-slate-900 leading-tight">
                      {c.chairName} <span className="text-slate-400 font-normal">&</span> {c.viceName}
                    </p>
                    <div className="text-sm text-slate-600 space-y-2 bg-slate-50 rounded-xl p-3">
                      <div>
                        <p className="font-bold text-xs tracking-widest text-slate-500 uppercase">Visi</p>
                        <p className="whitespace-pre-line leading-relaxed">{c.vision || "-"}</p>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div>
                        <p className="font-bold text-xs tracking-widest text-slate-500 uppercase">Misi</p>
                        <p className="whitespace-pre-line leading-relaxed">{c.mission || "-"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelected(c);
                        setConfirming(true);
                      }}
                      className="mt-auto bg-slate-900 text-white group-hover:bg-primary rounded-xl py-3 font-bold transition"
                    >
                      Pilih Paslon Ini
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {error && <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-xl py-2">{error}</p>}
        </div>
      )}

      {confirming && selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-xl mb-3">⚠️</div>
              <p className="text-lg font-extrabold text-slate-900">
                Yakin memilih Paslon No. {selected.number}
                <br /><span className="text-primary">{selected.chairName} & {selected.viceName}</span>?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Pilihan tidak dapat diubah setelah dikonfirmasi.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 border border-slate-300 rounded-xl py-3 font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={loading}
                className="flex-1 bg-primary text-white rounded-xl py-3 font-bold disabled:opacity-50"
              >
                {loading ? "Mengirim..." : "Ya, Kirim Suara"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="bg-white shadow-[0_8px_40px_-12px_rgba(30,58,138,0.25)] rounded-2xl p-8 w-full max-w-md text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
          <div>
            <p className="text-xl font-extrabold text-slate-900">Suara berhasil dicatat!</p>
            <p className="text-sm text-slate-500 mt-1">Terima kasih <span className="font-semibold text-slate-700">{voterName}</span> sudah berpartisipasi.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            NISN <span className="font-mono font-bold">{nisn}</span> telah terkunci dan tidak dapat digunakan kembali.
          </div>
          <button
            onClick={resetForNextVoter}
            className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-bold hover:bg-slate-800"
          >
            Selesai — siap pemilih berikutnya →
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mt-10 text-[11px] text-slate-400">
        <span>© SMAN 1 Rambutan • Sistem TPS Digital • Satu NISN satu suara</span>
        <span>•</span>
        <Link href="/hasil" className="hover:text-slate-600 underline">Lihat Hasil</Link>
      </div>
    </main>
  );
}
