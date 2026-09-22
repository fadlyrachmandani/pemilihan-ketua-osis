# Sistem Pemilihan OSIS SMAN 1 Rambutan (2026-2027)

Sistem pemilihan Ketua & Wakil Ketua OSIS berbasis web (Next.js + Prisma + PostgreSQL),
dipakai seperti "TPS digital": pemilih memasukkan **NISN 10 digit** di salah satu laptop yang disediakan
panitia, konfirmasi nama, memilih paslon, lalu laptop otomatis kembali ke halaman awal untuk
pemilih berikutnya.

## Fitur

**Halaman Pemilih `/`**
- Judul resmi pemilihan
- Input **NISN 10 digit** (contoh `0103150447`, leading zero dijaga) — sekali pakai, dicocokkan ke data impor admin
- Layar konfirmasi identitas ("Kamu [Nama] — benar?") sebelum masuk ke halaman voting
- Tampilan foto + visi misi tiap paslon
- Tombol pilih dengan konfirmasi, otomatis reset untuk pemilih berikutnya
- Banner `Lihat Hasil` muncul otomatis setelah panitia klik Tampilkan Hasil
- Halaman publik `/hasil` — podium juara + live chart (hanya tampil jika `resultVisible=true`)

**Dashboard Admin/Panitia** (`/admin/login`)
- Kelola paslon (**upload foto langsung** drag&drop, tidak perlu URL manual, simpan ke `/public/uploads` / Vercel Blob)
- Rekap hasil suara per paslon + tombol tampilkan/sembunyikan ke publik
- Data pemilih (tambah manual NISN 10 digit atau **impor Excel** — dukung file Dapodik `No|Nama|NIPD|JK|NISN` & template `nisn,name`, 661 baris langsung kebaca, 9-digit auto pad ke 10)
- Ringkasan total suara, sudah memilih, belum memilih + progress bar

## 1. Setup Awal (Lokal)

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — pooling (port 6543, `?pgbouncer=true`) — dipakai aplikasi
- `DIRECT_URL` — direct (port 5432) — dipakai khusus `prisma migrate`
- `ADMIN_PASSWORD` — password untuk login dashboard panitia
- `SESSION_SECRET` — string acak panjang (boleh generate dengan `openssl rand -hex 32`)
- `NEXT_PUBLIC_ELECTION_TITLE` — judul pemilihan di halaman voting

### Opsi database PostgreSQL gratis
- **Neon** (https://neon.tech) — paling mudah dipasangkan dengan Vercel
- **Vercel Postgres** — langsung terintegrasi kalau project sudah di-deploy ke Vercel
- PostgreSQL lokal (kalau sudah install Postgres di komputer)

## 2. Migrasi & Seed Database

```bash
npx prisma migrate deploy  # jika DB baru, atau migrate dev saat development
npm run seed
```

`seed.ts` akan membuat 3 paslon contoh dan 3 pemilih contoh (NISN: `0103150447`, `0103150448`, `0103150449`) —
edit/hapus datanya nanti lewat dashboard admin. Migrasi `20260923_rename_nis_to_nisn` sudah handle rename kolom `nis`→`nisn`.

## 3. Jalankan di Lokal

```bash
npm run dev
```

- Halaman pemilih: http://localhost:3000
- Login admin: http://localhost:3000/admin/login

## 4. Alur Sebelum Hari-H

1. Login ke dashboard admin
2. Tab **Kandidat** — masukkan paslon, **upload foto langsung** (drag & drop, JPG/PNG/WEBP max 5MB). Atau tempel URL manual jika pakai link eksternal.
3. Tab **Data Pemilih** — **impor Excel** langsung: upload file Dapodik `No | Nama | NIPD | JK | NISN` (661 baris) tanpa edit — baris meta otomatis di-skip, NISN 9-digit auto jadi 10-digit. Atau pakai template `nisn,name`. Bisa juga tambah satu-satu (NISN 10 digit).

## 5. Alur Hari-H

1. Buka halaman utama (`/`) di 8 laptop yang jadi "bilik suara"
2. Siswa datang bergantian, masukkan **NISN 10 digit**-nya sendiri (contoh `0103150447`)
3. Sistem tampilkan konfirmasi nama ("Kamu [Nama] — benar?") — siswa konfirmasi
4. Pilih paslon → konfirmasi → suara tercatat, NISN tersebut otomatis terkunci (tidak bisa dipakai vote lagi)
5. Layar otomatis kembali ke halaman input NISN untuk siswa berikutnya
6. Panitia pantau progres real-time dari tab **Ringkasan** & **Hasil Suara** di laptop/HP terpisah (halaman pemilih tidak tampil hasil sampai diumumkan)
7. Setelah pemungutan selesai, di tab **Hasil Suara** klik "Tampilkan Hasil" → halaman publik `/hasil` otomatis tampil podium + chart, dan banner `Lihat Hasil` muncul di halaman voting

## 6. Deploy ke Vercel

1. Push project ini ke GitHub
2. Buat project baru di https://vercel.com, import dari repo GitHub tersebut
3. Di Vercel, buat database Postgres (Storage → Create Database → Postgres, atau pakai Supabase/Neon lalu tempel connection string-nya)
4. Set **Environment Variables** di Vercel (Settings → Environment Variables — **wajib 5 var**):
   - `DATABASE_URL` (pooling, port 6543, `?pgbouncer=true`)
   - `DIRECT_URL` (direct, port 5432)
   - `ADMIN_PASSWORD` (contoh kuat, jangan `ganti-password-ini`)
   - `SESSION_SECRET` (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_ELECTION_TITLE`
5. Build Command otomatis `prisma generate && next build` (sudah di `package.json:6` + `postinstall`). Jika pakai Supabase, pastikan `DATABASE_URL` & `DIRECT_URL` benar region (contoh `aws-0-ap-south-1`).
6. Deploy. Setelah live, jalankan migrasi ke database production (sekali):
   ```bash
   npx prisma migrate deploy
   npm run seed   # opsional, hapus paslon contoh dan isi paslon asli lewat dashboard
   ```
7. Pas hari-H, buka domain Vercel-nya di 8 laptop yang connect ke wifi sekolah. **Catatan upload foto**: di Vercel `/public/uploads` ephemeral (hilang saat redeploy) — untuk produksi permanen ganti ke Vercel Blob / Cloudinary.

## Catatan Keamanan

- Satu **NISN 10 digit** = satu suara, divalidasi di server (bukan cuma di tampilan), jadi tidak bisa vote dobel meski NISN yang sama dicoba di 2 laptop bersamaan. `normalizeNisn` pad ke 10 digit jaga leading zero.
- Suara disimpan **tanpa** dikaitkan ke identitas pemilih (tabel `Vote` terpisah dari `Voter`) — status "sudah memilih" dicatat, tapi pilihannya tetap rahasia
- Ganti `ADMIN_PASSWORD` dan `SESSION_SECRET` di `.env` sebelum deploy, jangan pakai nilai contoh. Cookie admin httpOnly 8 jam, HMAC `timingSafeEqual`.
- Pastikan NISN di data sekolah memang unik per siswa — kalau ada duplikat, impor Excel akan skip (duplikat di-file & di-DB) + laporan `invalid` untuk 9-digit/ kosong
- Upload foto & Excel max 5MB, hanya `image/*` & `.xlsx/.xls`, validasi server side
