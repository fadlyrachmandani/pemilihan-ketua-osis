"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Tab = "ringkasan" | "kandidat" | "hasil" | "pemilih";

type Candidate = {
  id: string;
  number: number;
  chairName: string;
  viceName: string;
  photoUrl: string | null;
  vision: string;
  mission: string;
};

type Voter = {
  id: string;
  nisn: string;
  name: string;
  hasVoted: boolean;
};

type Summary = {
  totalVoters: number;
  votedCount: number;
  notVotedCount: number;
  totalVotes: number;
  totalCandidates: number;
};

type ResultRow = {
  id: string;
  number: number;
  chairName: string;
  viceName: string;
  voteCount: number;
};

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("ringkasan");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: [Tab, string, string][] = [
    ["ringkasan", "Ringkasan", "📊"],
    ["kandidat", "Kandidat", "👥"],
    ["hasil", "Hasil Suara", "📈"],
    ["pemilih", "Data Pemilih", "🎓"],
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#1e3a8a] to-[#1d4ed8] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-lg">🏫</div>
            <div>
              <h1 className="font-extrabold leading-tight">Dashboard Panitia</h1>
              <p className="text-xs text-blue-100 -mt-0.5">Pemilihan OSIS SMAN 1 Rambutan 2026/2027</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-4 py-1.5 transition">
            Keluar
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <nav className="flex gap-2 px-4 sm:px-6 pt-5 pb-2 overflow-x-auto">
          {tabs.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition shadow-sm ${tab === key ? "bg-[#1d4ed8] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>

        <div className="p-4 sm:p-6">
          {tab === "ringkasan" && <RingkasanTab />}
          {tab === "kandidat" && <KandidatTab />}
          {tab === "hasil" && <HasilTab />}
          {tab === "pemilih" && <PemilihTab />}
        </div>
      </div>
    </main>
  );
}

function Card({ label, value, icon, sub }: { label: string; value: number | string; icon: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex gap-4">
      <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function RingkasanTab() {
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/summary");
    if (res.ok) setSummary(await res.json());
  }, []);

  useEffect(() => {
    load();
    // kurangi polling 5→10 detik + pause saat tab tidak terlihat (hemat DB & kurangi delay terasa)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  if (!summary) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="h-28 bg-white rounded-2xl animate-pulse border" /><div className="h-28 bg-white rounded-2xl animate-pulse border" /><div className="h-28 bg-white rounded-2xl animate-pulse border" /><div className="h-28 bg-white rounded-2xl animate-pulse border" /></div>;

  const pct = summary.totalVoters > 0 ? Math.round((summary.votedCount / summary.totalVoters) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total Pemilih" value={summary.totalVoters} icon="🎓" sub="NISN terdaftar" />
        <Card label="Sudah Memilih" value={summary.votedCount} icon="✅" sub={`${pct}% partisipasi`} />
        <Card label="Belum Memilih" value={summary.notVotedCount} icon="⏳" sub="Menunggu giliran" />
        <Card label="Total Suara" value={summary.totalVotes} icon="🗳️" sub={`${summary.totalCandidates} paslon`} />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-slate-800">Progress Partisipasi</p>
          <span className="text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{summary.votedCount} dari {summary.totalVoters} pemilih sudah menggunakan hak pilihnya.</p>
      </div>
    </div>
  );
}

function KandidatTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({
    number: "",
    chairName: "",
    viceName: "",
    photoUrl: "",
    vision: "",
    mission: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/candidates");
    if (res.ok) {
      const data = await res.json();
      setCandidates(data.candidates);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handleFileSelect(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("File harus berupa gambar (jpg, png, webp).");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5MB.");
      return;
    }
    setError(null);
    setPhotoFile(f);
    // kosongkan URL manual jika pakai upload
    setForm((p) => ({ ...p, photoUrl: "" }));
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res: Response;
      if (photoFile) {
        const fd = new FormData();
        fd.append("number", form.number);
        fd.append("chairName", form.chairName);
        fd.append("viceName", form.viceName);
        fd.append("vision", form.vision);
        fd.append("mission", form.mission);
        fd.append("file", photoFile);
        // jika ada photoUrl manual juga kirim tapi file diutamakan di server
        if (form.photoUrl) fd.append("photoUrl", form.photoUrl);
        res = await fetch("/api/admin/candidates", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/admin/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal menambah paslon.");
      } else {
        setForm({ number: "", chairName: "", viceName: "", photoUrl: "", vision: "", mission: "" });
        clearPhoto();
        await load();
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus paslon ini?")) return;
    await fetch(`/api/admin/candidates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center text-sm">➕</span> Tambah Paslon</h2>
        <form onSubmit={handleAdd} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-3">
          <input
            placeholder="No. urut *"
            type="number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            placeholder="Nama calon ketua *"
            value={form.chairName}
            onChange={(e) => setForm({ ...form, chairName: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <input
            placeholder="Nama calon wakil ketua *"
            value={form.viceName}
            onChange={(e) => setForm({ ...form, viceName: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />

          {/* Upload Foto Area */}
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Foto Paslon</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
              className={`mt-1.5 border-2 border-dashed rounded-xl p-4 text-center transition ${dragOver ? "border-blue-400 bg-blue-50" : photoPreview ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50/50"}`}
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
              {photoPreview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="mx-auto h-28 w-28 object-cover rounded-xl border-2 border-white shadow" />
                  <p className="text-xs font-medium text-slate-700 truncate">{photoFile?.name}</p>
                  <p className="text-[11px] text-slate-500">{photoFile ? (photoFile.size / 1024).toFixed(0) + " KB" : ""} • akan disimpan ke /uploads</p>
                  <div className="flex gap-2 justify-center">
                    <button type="button" onClick={clearPhoto} className="text-xs border border-slate-200 bg-white rounded-full px-3 py-1">Hapus</button>
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="text-xs border border-slate-200 bg-white rounded-full px-3 py-1">Ganti</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xl mb-1">📸</div>
                  <p className="text-sm font-medium text-slate-700">Upload foto paslon</p>
                  <p className="text-xs text-slate-500">Drag & drop atau klik pilih file</p>
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm">Pilih Foto</button>
                  <p className="text-[11px] text-slate-400 mt-2">JPG/PNG/WEBP, maks 5MB, rasio 1:1 atau 4:5 bagus</p>
                </>
              )}
            </div>
            {/* Fallback URL input - collapsed */}
            <details className="mt-2">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">atau tempel URL foto manual</summary>
              <input
                placeholder="https:// atau /uploads/paslon1.jpg"
                value={form.photoUrl}
                onChange={(e) => {
                  setForm({ ...form, photoUrl: e.target.value });
                  if (e.target.value) {
                    // jika isi URL manual, kosongkan file
                    clearPhoto();
                  }
                }}
                className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {form.photoUrl && !photoFile && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.photoUrl} alt="preview url" className="h-20 w-full object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </details>
          </div>

          <textarea
            placeholder="Visi"
            value={form.vision}
            onChange={(e) => setForm({ ...form, vision: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            rows={3}
          />
          <textarea
            placeholder="Misi"
            value={form.mission}
            onChange={(e) => setForm({ ...form, mission: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            rows={3}
          />
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-xl py-2.5 font-bold disabled:opacity-50 shadow"
          >
            {loading ? "Menyimpan..." : photoFile ? "Upload & Tambah Paslon" : "Tambah Paslon"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-bold text-slate-800 mb-3">Daftar Paslon ({candidates.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {candidates.map((c) => (
            <div key={c.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden group">
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt={`Paslon ${c.number}`} className="w-full h-44 object-cover group-hover:scale-[1.02] transition" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1">
                  <span className="text-2xl">🖼️</span><span className="text-xs">No Foto</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 truncate">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1d4ed8] text-white text-xs mr-1.5">{c.number}</span>
                      {c.chairName} <span className="text-slate-400 font-normal">&</span> {c.viceName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.vision || "—"}</p>
                    {c.photoUrl && <p className="text-[11px] text-slate-400 truncate mt-1">{c.photoUrl}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600 text-xs hover:bg-red-50 border border-transparent hover:border-red-200 rounded-full px-3 py-1 shrink-0"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="col-span-2 bg-white border border-dashed rounded-2xl p-8 text-center text-slate-500">Belum ada paslon. Tambahkan di sebelah kiri.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function HasilTab() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/results");
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
      setVisible(data.resultVisible);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  async function toggleVisible() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultVisible: !visible }),
    });
    if (res.ok) setVisible(!visible);
    setSaving(false);
  }

  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
  const sortedPreview = [...results].sort((a,b)=>b.voteCount-a.voteCount);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${visible ? "bg-emerald-100" : "bg-amber-100"}`}>{visible ? "👁️" : "🙈"}</div>
          <div>
            <p className="font-bold text-slate-800">Status hasil untuk publik</p>
            <p className={`text-sm ${visible ? "text-emerald-600" : "text-amber-600"}`}>{visible ? "Ditampilkan — semua orang bisa melihat di /hasil + pop-up di /" : "Disembunyikan — hanya panitia"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleVisible}
            disabled={saving}
            className={`rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${visible ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
          >
            {visible ? "Sembunyikan Hasil" : "Tampilkan Hasil"}
          </button>
          {visible && (
            <a href="/hasil" target="_blank" className="bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap">
              Buka /hasil →
            </a>
          )}
        </div>
      </div>
      {visible && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg">✅</span>
          <div className="text-sm">
            <p className="font-bold text-emerald-900">Hasil sekarang publik</p>
            <p className="text-emerald-800/80 text-xs mt-1">
              Publik di <code className="bg-white border px-1 rounded">/hasil</code> lihat 3 paslon + foto + <code className="bg-white border px-1 rounded">voteCount</code> + <code className="bg-white border px-1 rounded">pct%</code> + podium. Di halaman voting <code className="bg-white border px-1 rounded">/</code> muncul <b>pop-up otomatis</b> dengan ringkasan yang sama — ada tombol <b>Buka Halaman Lengkap /hasil →</b>.
            </p>
            <div className="flex gap-2 mt-2">
              <a href="/hasil" target="_blank" className="text-xs bg-white border border-emerald-300 text-emerald-700 rounded-full px-3 py-1 font-semibold">Buka /hasil (tab baru)</a>
              <a href="/" target="_blank" className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1 font-semibold">Cek pop-up di /</a>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl divide-y">
        {sortedPreview
          .map((r, idx) => {
            const pct = totalVotes > 0 ? Math.round((r.voteCount / totalVotes) * 100) : 0;
            const rank = idx === 0 && totalVotes > 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
            return (
              <div key={r.id} className="p-5">
                <div className="flex justify-between mb-2">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-lg">{rank}</span> No. {r.number} — {r.chairName} & {r.viceName}
                  </p>
                  <p className="font-extrabold text-slate-900">{r.voteCount} <span className="text-sm font-normal text-slate-500">suara ({pct}%)</span></p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#1d4ed8] to-indigo-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        {results.length === 0 && (
          <p className="p-8 text-center text-slate-500">Belum ada paslon atau belum ada suara masuk.</p>
        )}
        {totalVotes > 0 && <div className="p-4 text-center text-xs text-slate-500">Total {totalVotes} suara • Preview sama seperti di /hasil & pop-up / • <a href="/hasil" target="_blank" className="underline text-[#1d4ed8]">Buka /hasil</a></div>}
      </div>
    </div>
  );
}

function PemilihTab() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importDetail, setImportDetail] = useState<any>(null);
  const [form, setForm] = useState({ nisn: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/voters");
    if (res.ok) {
      const data = await res.json();
      setVoters(data.voters);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function isValidNisn(v: string) { return /^\d{10}$/.test(v.trim()); }

  async function handleAddOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nisn = form.nisn.trim();
    if (!isValidNisn(nisn)) {
      setError("NISN harus 10 digit angka (contoh 0100000000). Leading zero akan dijaga.");
      return;
    }
    const res = await fetch("/api/admin/voters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nisn, name: form.name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
    } else {
      setForm({ nisn: "", name: "" });
      await load();
    }
  }

  async function handleImport() {
    if (!file) { setImportMsg("Pilih file Excel dulu."); return; }
    setImportMsg(null);
    setImportDetail(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/voters/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg(data.message || "Gagal impor.");
        setImportDetail(data);
      } else {
        setImportMsg(`Berhasil ${data.createdCount} • Duplikat ${data.skippedCount} • Invalid ${data.invalidCount ?? 0}`);
        setImportDetail(data);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        await load();
      }
    } catch (e: any) {
      setImportMsg("Gagal koneksi: " + e.message);
    } finally { setUploading(false); }
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/admin/voters/template");
    if (!res.ok) { setImportMsg("Gagal download template."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-nisn.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = voters.filter(v => {
    if (!search) return true;
    const s = search.toLowerCase();
    return v.nisn.includes(s) || v.name.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">👤 Tambah 1 Pemilih</h2>
            <p className="text-xs text-slate-500">NISN 10 digit, leading zero aman (contoh 0100000000)</p>
          </div>
          <form onSubmit={handleAddOne} className="space-y-3">
            <div>
              <input
                placeholder="NISN (10 digit)"
                value={form.nisn}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, nisn: v });
                  if (error) setError(null);
                }}
                className={`w-full border rounded-xl px-3 py-2.5 font-mono tracking-widest text-center text-lg ${form.nisn && !isValidNisn(form.nisn) ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
                maxLength={10}
                inputMode="numeric"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">{form.nisn.length}/10 {form.nisn && isValidNisn(form.nisn) ? "✓ valid" : form.nisn ? "harus 10 digit" : ""}</p>
            </div>
            <input
              placeholder="Nama lengkap"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
            <button className="w-full bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-xl py-2.5 font-bold shadow">
              Tambah Pemilih
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">📄 Impor Excel</h2>
              <p className="text-xs text-slate-500">
                Dukung <span className="font-semibold text-emerald-700">file Dapodik</span> langsung (No | Nama | NIPD | JK | NISN) &amp; template <code className="bg-slate-100 px-1 rounded">nisn</code> , <code className="bg-slate-100 px-1 rounded">name</code>. Baris meta di atas otomatis di-skip. Leading zero dijaga.
              </p>
            </div>
            <button onClick={handleDownloadTemplate} className="shrink-0 text-xs font-semibold border border-slate-200 hover:bg-slate-50 rounded-full px-3 py-1.5">⬇ Template</button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50/50"}`}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {!file ? (
              <>
                <div className="text-2xl mb-2">📂</div>
                <p className="text-sm font-medium text-slate-700">Drag & drop Excel kesini</p>
                <p className="text-xs text-slate-500 my-1">atau</p>
                <button onClick={() => fileRef.current?.click()} className="bg-white border border-slate-200 hover:bg-slate-50 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm">Pilih File</button>
                <p className="text-[11px] text-slate-400 mt-3">Maks 5MB • Dapodik 661 baris OK • 1 sheet pertama</p>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">📎 {file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white">Hapus</button>
                  <button onClick={() => fileRef.current?.click()} className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white">Ganti</button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={!file || uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-bold shadow"
          >
            {uploading ? "Mengimpor..." : `Impor ${file ? `(${file.name})` : ""}`}
          </button>
          {importMsg && (
            <div className={`text-sm rounded-xl px-3 py-2 border ${importDetail?.createdCount > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
              <p className="font-semibold">{importMsg}</p>
              {importDetail?.invalid?.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">Lihat {importDetail.invalid.length} baris invalid</summary>
                  <ul className="list-disc pl-4 mt-1 space-y-1 max-h-32 overflow-auto">
                    {importDetail.invalid.slice(0, 20).map((x: any, i: number) => <li key={i}>{x.reason}</li>)}
                  </ul>
                </details>
              )}
              {importDetail?.skipped?.length > 0 && (
                <p className="text-xs mt-1">Duplikat: {importDetail.skipped.slice(0, 5).join(", ")}{importDetail.skipped.length > 5 ? " ..." : ""}</p>
              )}
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-700">Format Excel (2 opsi):</p>
            <div className="grid gap-2 text-xs font-mono mt-2">
              <div className="bg-white border rounded px-2 py-1.5">
                <span className="font-bold text-emerald-700">Dapodik (langsung):</span> No | Nama | NIPD | JK | NISN <br />
                <span className="text-slate-500">Contoh: 1 | ABIL PRIO PRADENSYAH | 3797 | L | 100000000 → jadi 0100000000</span>
              </div>
              <div className="bg-white border rounded px-2 py-1.5">Template: nisn | name → 0100000000 | Budi</div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Baris 1-4 (Peserta Didik, SMAN 1 RAMBUTAN, Tanggal Unduh) otomatis di-skip. NIPD/JK diabaikan. Duplikat &amp; 9-digit auto pad ke 10.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Daftar Pemilih <span className="text-slate-500 font-normal">({filtered.length}/{voters.length})</span></h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input placeholder="Cari NISN atau nama..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 sm:w-64 border border-slate-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <span className="hidden sm:inline-flex items-center text-xs text-slate-500 whitespace-nowrap">{voters.filter(v=>v.hasVoted).length} sudah • {voters.filter(v=>!v.hasVoted).length} belum</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-white sticky top-0 border-b text-left">
              <tr>
                <th className="p-3 font-bold text-slate-600 whitespace-nowrap">NISN</th>
                <th className="p-3 font-bold text-slate-600">Nama</th>
                <th className="p-3 font-bold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono tracking-widest font-semibold">{v.nisn}</td>
                  <td className="p-3">{v.name}</td>
                  <td className="p-3">
                    {v.hasVoted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 text-xs font-semibold">✅ Sudah memilih</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 text-xs">⏳ Belum memilih</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    {voters.length === 0 ? "Belum ada data pemilih. Tambah manual atau impor Excel di atas." : "Tidak ada hasil untuk pencarian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t text-xs text-slate-500 text-center">
          Siswa memilih dengan memasukkan NISN-nya langsung di halaman voting — satu NISN satu suara, anonim. Total {voters.length} terdaftar.
        </div>
      </div>
    </div>
  );
}
