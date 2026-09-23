"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Result = {
  id: string;
  number: number;
  chairName: string;
  viceName: string;
  photoUrl: string | null;
  voteCount: number;
};

export default function HasilPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [notVotedCount, setNotVotedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/results", { cache: "no-store" });
      const data = await res.json();
      // API selalu kirim totalVoters/votedCount bahkan saat belum reveal
      setTotalVoters(data.totalVoters ?? 0);
      setVotedCount(data.votedCount ?? 0);
      setNotVotedCount(data.notVotedCount ?? 0);
      setIsComplete(!!data.isComplete);
      if (data.resultVisible) {
        setVisible(true);
        setResults(data.results || []);
        setTotalVotes(data.totalVotes ?? 0);
      } else if (data.isComplete) {
        // auto-reveal saat 100% — meski resultVisible false, tetap tampilkan hasil
        setVisible(true);
        setResults(data.results || []);
        setTotalVotes(data.totalVotes ?? 0);
      } else {
        setVisible(false);
        setResults([]);
        setTotalVotes(0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [load, autoRefresh]);

  const sorted = [...results].sort((a, b) => b.voteCount - a.voteCount);
  const winner = sorted[0];
  const maxVotes = winner?.voteCount ?? 0;
  const isRevealed = visible === true;

  const title =
    process.env.NEXT_PUBLIC_ELECTION_TITLE ||
    "Pemilihan Ketua OSIS dan Wakil Ketua OSIS SMAN 1 Rambutan Periode 2026-2027";

  const pctPartisipasi = totalVoters ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50">
      <header className="bg-white/80 backdrop-blur border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
            ← Kembali ke Voting
          </Link>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1.5 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-[#1d4ed8]" />
              Auto-refresh
            </label>
            <button onClick={load} className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 font-semibold hover:bg-slate-50">
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-blue-100 rounded-full px-4 py-1.5 shadow-sm mb-3">
            <span className={`h-2 w-2 rounded-full ${isRevealed ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-xs font-bold tracking-widest uppercase text-slate-600">
              {isRevealed ? (isComplete ? "Hasil Resmi • 100% Selesai" : "Hasil Resmi • Transparan") : "Pemungutan Suara Berlangsung"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {isRevealed
              ? isComplete
                ? "Semua pemilih sudah menggunakan hak pilih — hasil otomatis ditampilkan."
                : "Hasil diperbarui otomatis tiap 5 detik."
              : "Hasil perolehan suara akan tampil otomatis saat semua pemilih selesai atau panitia klik “Tampilkan Hasil”."}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 bg-white border border-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !isRevealed ? (
          <>
            {/* Fase voting: tampilkan progres partisipasi, jangan bocorkan voteCount */}
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">🗳️</div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-4">Pemungutan Suara Berlangsung</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Pantau progres kehadiran pemilih secara live. Perolehan suara tiap paslon <span className="font-semibold text-slate-700">disembunyikan</span> sampai semua selesai.
                </p>

                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                  <div className="flex justify-between items-end gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Sudah Memilih</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">
                        {votedCount} <span className="text-lg font-semibold text-slate-500">/ {totalVoters}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {notVotedCount > 0 ? `${notVotedCount} belum memilih` : totalVoters === 0 ? "Belum ada data pemilih" : "Semua sudah memilih!"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#1d4ed8]">{pctPartisipasi}%</p>
                      <p className="text-xs font-semibold text-slate-500">partisipasi</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 mt-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-[#1d4ed8] h-3 rounded-full transition-all duration-700" style={{ width: `${pctPartisipasi}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Update otomatis tiap 5 detik • {votedCount} dari {totalVoters} pemilih
                  </p>
                </div>

                {totalVoters > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-3">
                      <p className="text-lg font-black text-emerald-700">{votedCount}</p>
                      <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-600">Sudah</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl py-3">
                      <p className="text-lg font-black text-amber-700">{notVotedCount}</p>
                      <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600">Belum</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl py-3">
                      <p className="text-lg font-black text-slate-700">{totalVoters}</p>
                      <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Total</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={load} className="bg-[#1d4ed8] text-white rounded-full px-5 py-2 text-sm font-bold">
                    🔄 Refresh Progres
                  </button>
                  <Link href="/" className="bg-white border border-slate-200 rounded-full px-5 py-2 text-sm font-semibold">
                    Ke Halaman Voting
                  </Link>
                </div>
                <p className="text-[11px] text-slate-400 mt-4">Hasil 3 paslon dengan foto & persentase akan muncul otomatis saat {totalVoters ? `${totalVoters - votedCount} pemilih lagi` : "100%"} selesai.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-xl">🔒</span>
                <div>
                  <p className="text-sm font-bold text-amber-900">Hasil Per Paslon Disembunyikan</p>
                  <p className="text-xs text-amber-800/80 mt-1">Demi kerahasiaan, foto dan persentase 3 paslon baru tampil ketika partisipasi 100% atau panitia mengumumkan hasil.</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Auto-reveal banner jika karena 100% */}
            {isComplete && (
              <div className="max-w-3xl mx-auto mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-emerald-800">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-semibold">Semua {totalVoters} pemilih sudah memilih — hasil otomatis ditampilkan</span>
              </div>
            )}

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">🗳️</div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Total Suara Masuk</p>
                  <p className="text-2xl font-extrabold text-slate-900">{totalVotes}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">✅</div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Partisipasi</p>
                  <p className="text-2xl font-extrabold text-slate-900">{votedCount} <span className="text-sm font-normal text-slate-500">/ {totalVoters}</span></p>
                  <p className="text-xs text-slate-500">{pctPartisipasi}% {isComplete && <span className="text-emerald-600 font-bold">• 100% Selesai</span>}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">👥</div>
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Paslon</p>
                  <p className="text-2xl font-extrabold text-slate-900">{results.length}</p>
                </div>
              </div>
            </div>

            {/* Podium */}
            {sorted.length >= 2 && totalVotes > 0 && (
              <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] rounded-2xl p-6 md:p-8 text-white mb-6 shadow-lg">
                <p className="text-center text-xs font-bold tracking-[0.2em] uppercase text-blue-200">Pemenang Sementara</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-4">
                  {sorted.slice(0, 3).map((r, idx) => {
                    const pct = totalVotes ? Math.round((r.voteCount / totalVotes) * 100) : 0;
                    const isWinner = idx === 0;
                    const height = isWinner ? "h-32 md:h-40" : idx === 1 ? "h-24 md:h-32" : "h-20 md:h-28";
                    const bg = isWinner ? "bg-amber-400 text-amber-900" : idx === 1 ? "bg-slate-200 text-slate-700" : "bg-amber-700 text-white";
                    return (
                      <div key={r.id} className={`flex flex-col items-center gap-2 ${isWinner ? "order-2 md:order-2" : idx === 1 ? "order-1 md:order-1" : "order-3"}`}>
                        {r.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.photoUrl} alt={`Paslon ${r.number}`} className={`w-20 h-20 md:w-24 md:h-24 object-cover rounded-2xl border-4 ${isWinner ? "border-amber-300" : "border-white/30"} shadow`} />
                        ) : (
                          <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${isWinner ? "bg-amber-300" : "bg-white/20"} flex items-center justify-center text-xl`}>👤</div>
                        )}
                        <span className={`text-[10px] font-extrabold tracking-widest uppercase rounded-full px-2.5 py-1 ${bg}`}>
                          {idx === 0 ? "🥇 Juara 1" : idx === 1 ? "🥈 Juara 2" : "🥉 Juara 3"}
                        </span>
                        <p className="font-extrabold text-center leading-tight">
                          No. {r.number}
                          <br />
                          <span className="text-sm font-semibold">{r.chairName} & {r.viceName}</span>
                        </p>
                        <p className="text-2xl font-black">{r.voteCount} <span className="text-sm font-normal opacity-80">({pct}%)</span></p>
                        <div className={`w-24 rounded-t-xl ${bg} ${height} flex items-end justify-center pb-2 text-xs font-bold`}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detail list */}
            <div className="bg-white border border-slate-100 rounded-2xl divide-y shadow-sm">
              {sorted.map((r, idx) => {
                const pct = totalVotes ? Math.round((r.voteCount / totalVotes) * 100) : 0;
                const isWinner = r.voteCount === maxVotes && maxVotes > 0;
                return (
                  <div key={r.id} className={`p-5 flex gap-4 items-center ${isWinner ? "bg-amber-50/50" : ""}`}>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isWinner ? "bg-amber-400 text-amber-900" : "bg-slate-100 text-slate-700"}`}>
                      {idx + 1}
                    </div>
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photoUrl} alt={`Paslon ${r.number}`} className="h-14 w-14 object-cover rounded-xl border shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">🖼️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        No. {r.number} — {r.chairName} & {r.viceName} {isWinner && totalVotes > 0 && <span className="ml-2 text-xs bg-amber-400 text-amber-900 rounded-full px-2 py-0.5">Unggul</span>}
                      </p>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
                        <div className={`h-2.5 rounded-full transition-all ${isWinner ? "bg-amber-400" : "bg-[#1d4ed8]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-slate-900">{r.voteCount}</p>
                      <p className="text-xs font-semibold text-slate-500">{pct}%</p>
                    </div>
                  </div>
                );
              })}
              {results.length === 0 && <p className="p-8 text-center text-slate-500">Belum ada paslon.</p>}
            </div>

            <div className="text-center mt-6 flex justify-center gap-2">
              <Link href="/" className="bg-white border border-slate-200 rounded-full px-5 py-2 text-sm font-semibold hover:bg-slate-50">
                ← Ke Voting
              </Link>
              <button onClick={() => window.print()} className="bg-slate-900 text-white rounded-full px-5 py-2 text-sm font-bold">
                🖨️ Cetak
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-4">Hasil resmi diumumkan panitia. Suara anonim — tidak ada kaitan NISN dengan pilihan.</p>
          </>
        )}
      </div>
    </main>
  );
}
