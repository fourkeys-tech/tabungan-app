# TabungKu: Evaluasi & Mockup Desain Dashboard

> Dokumen ini berisi (1) evaluasi tampilan saat ini, (2) arah desain baru, (3) design tokens, (4) wireframe tiap layar, (5) spesifikasi komponen, dan (6) panduan implementasi.

---

## 1. Evaluasi Tampilan Saat Ini

**Kesimpulan singkat: fondasinya sudah rapi, tetapi belum terasa profesional dan belum punya identitas.** Tampilannya bersih dan konsisten, namun masih seperti template dashboard generik.

### Yang sudah baik
- Struktur navigasi jelas (Beranda, Tabungan Pribadi, Tabungan Bersama, Transaksi, Laporan, Pengaturan).
- Empty state sudah ada dan punya CTA (*Tambah Transaksi* dan *Isi data contoh*).
- Konsistensi warna hijau sebagai warna utama; ada mode gelap.
- Bahasa Indonesia natural dan ramah ("Halo, Admin").

### Yang masih kurang

| # | Masalah | Dampak | Perbaikan |
|---|---------|--------|-----------|
| 1 | **Ruang kosong terbuang.** Konten berhenti di tengah, kiri-kanan kosong lebar. | Terasa "tidak selesai", sulit dipindai | Gunakan grid 12 kolom, lebar konten 1200 px, rata kiri |
| 2 | **Empty state raksasa** memakan ±330 px di atas lipatan, padahal ada 2 empty state lain di bawah. | Pengguna melihat 3 pesan "belum ada data" sekaligus | Satu onboarding checklist yang ringkas; kartu lain disembunyikan sampai ada data |
| 3 | **Empat kartu statistik identik** (ikon + "Rp 0" + subteks kecil). | Tidak ada hierarki; angka terpenting tidak menonjol | Satu kartu **Total Saldo** besar + metrik pendukung lebih kecil |
| 4 | **Teks terlalu kecil** (±10–11 px) dan kontras rendah pada abu di atas hijau gelap. | Sulit dibaca, gagal standar WCAG AA | Minimal 13 px untuk label, 14–15 px untuk isi; kontras ≥ 4.5:1 |
| 5 | **Item aktif sidebar** memakai border tebal + kotak penuh. | Terlalu berat secara visual | Latar lembut + indikator tipis di kiri |
| 6 | **Topbar kosong** (hanya ikon bulan & lonceng). | Ruang atas tidak berguna | Isi dengan pencarian cepat dan tombol aksi utama *+ Catat transaksi* |
| 7 | **Tidak ada elemen khas "menabung".** | Bisa dikira aplikasi keuangan apa saja | Visual **celengan/toples** untuk target tabungan |
| 8 | **Sapaan + tanggal terpisah jauh**, emoji melambai terasa seperti template. | Header kurang terarah | Tanggal dekat sapaan; sapaan berubah sesuai jam dan kondisi saldo |
| 9 | Badge "N" di pojok kanan bawah. | Itu indikator dev Next.js | Otomatis hilang di build produksi, bukan bagian desain |

**Skor kasar:** Kebersihan 8/10 · Hierarki visual 5/10 · Identitas merek 4/10 · Keterbacaan 5/10 · Kesiapan produksi 5/10

---

## 2. Arah Desain Baru: "Celengan Modern"

**Konsep:** TabungKu terasa seperti buku tabungan yang hangat, bukan aplikasi bank yang dingin. Elemen yang diingat orang adalah **toples koin yang terisi** sebagai penanda progres target. Semua elemen lain dibuat tenang agar toples itu menonjol.

**Pengguna:** Individu dan keluarga/teman yang menabung bersama (arisan, liburan, dana darurat).
**Tugas utama layar Beranda:** Dalam 3 detik, pengguna tahu *berapa saldonya* dan *seberapa dekat target tabungannya*.

### Prinsip
1. **Satu hal besar per layar.** Saldo total adalah bintangnya; sisanya sekunder.
2. **Angka bicara lebih dulu.** Angka rupiah memakai font display dengan tabular figures agar rata.
3. **Emas hanya untuk tabungan.** Warna emas dipakai khusus untuk koin dan progres target. Jangan dipakai untuk dekorasi.
4. **Kosong = ajakan bertindak.** Empty state menjelaskan langkah berikutnya, bukan hanya "belum ada data".
5. **Terang sebagai default, gelap sebagai pilihan.** Aplikasi keuangan dibuka siang hari di ponsel; mode terang lebih mudah dibaca di bawah matahari.

---

## 3. Design Tokens

### 3.1 Warna

| Nama | Hex (Terang) | Hex (Gelap) | Fungsi |
|------|--------------|-------------|--------|
| **Kertas** | `#F6F7F3` | `#0C1A1D` | Latar halaman |
| **Permukaan** | `#FFFFFF` | `#132A2E` | Kartu, panel |
| **Tinta** | `#0F2A2E` | `#EAF2EE` | Teks utama |
| **Tinta Redup** | `#5B6F70` | `#9DB3B0` | Teks sekunder (kontras ≥ 4.5:1) |
| **Garis** | `#E2E8E3` | `#1F3A3F` | Border, pemisah |
| **Hijau Daun** | `#1F9D6B` | `#3DC38C` | Aksi utama, pemasukan |
| **Hijau Muda** | `#E3F4EC` | `#163A33` | Latar item aktif, badge |
| **Emas Koin** | `#F2B544` | `#F5C25E` | Progres target, koin |
| **Karang** | `#E5604D` | `#F07F6E` | Pengeluaran, peringatan |
| **Biru Kolam** | `#3B82C4` | `#6AA7DE` | Tabungan bersama |

**Aturan penggunaan:** pemasukan = hijau, pengeluaran = karang, bersama = biru, target/koin = emas. Jangan mengandalkan warna saja; selalu sertakan ikon panah ↑ / ↓ atau tanda +/−.

### 3.2 Tipografi

| Peran | Font | Ukuran / Berat |
|-------|------|----------------|
| **Angka & judul besar** | Bricolage Grotesque | 40 / 700 (saldo), 28 / 700 (judul halaman) |
| **UI & isi** | Plus Jakarta Sans | 15 / 400 (isi), 13 / 500 (label), 16 / 600 (judul kartu) |

- Aktifkan `font-variant-numeric: tabular-nums` untuk semua angka rupiah.
- Format rupiah: `Rp 1.250.000` (titik pemisah ribuan, spasi setelah "Rp").
- Panjang baris teks maksimal 70 karakter.

### 3.3 Spasi, Radius, Bayangan
- **Skala spasi:** 4 · 8 · 12 · 16 · 24 · 32 · 48
- **Radius bertingkat:** 8 px (input, tombol kecil) · 12 px (tombol, item daftar) · 20 px (kartu besar) · 999 px (badge, avatar). Jangan satu radius untuk semuanya.
- **Bayangan:** hanya kartu utama (`0 1px 2px rgba(15,42,46,.06), 0 8px 24px rgba(15,42,46,.06)`); kartu sekunder cukup border 1 px.

### 3.4 Ikon
Lucide, stroke 1.75 px, ukuran 20 px di navigasi dan 18 px di dalam kartu.

---

## 4. Wireframe Layar

### 4.1 Beranda: Pengguna Baru (data kosong)

Satu langkah yang jelas, bukan tiga pesan kosong.

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ 🐷 TabungKu  │  🔍 Cari transaksi, target…              🌙  🔔   [+ Catat]  │
│              ├──────────────────────────────────────────────────────────────┤
│ ▌ Beranda    │                                                              │
│   Tabungan   │  Selamat siang, Admin                      Jumat, 9 Okt 2026 │
│   Pribadi    │  Mulai dari satu langkah kecil hari ini.                     │
│   Tabungan   │                                                              │
│   Bersama    │  ┌──────────────────────────────────────────┐ ┌────────────┐ │
│   Transaksi  │  │ Total saldo                              │ │ Mulai 1/3  │ │
│   Laporan    │  │ Rp 0                                     │ │            │ │
│              │  │ ─────────────────────────────            │ │ ☑ Buat akun│ │
│   Pengaturan │  │ Pribadi Rp 0   Bersama Rp 0              │ │ ☐ Buat     │ │
│              │  └──────────────────────────────────────────┘ │   target   │ │
│              │                                               │ ☐ Catat    │ │
│              │  ┌──────────────────────────────────────────┐ │   transaksi│ │
│              │  │      🫙  Buat target tabungan pertamamu  │ │            │ │
│              │  │  Contoh: Liburan Bali, Dana darurat      │ │ [Isi data  │ │
│              │  │  [ Buat target ]   [ Lihat contoh ]      │ │  contoh]   │ │
│              │  └──────────────────────────────────────────┘ └────────────┘ │
│ ──────────── │                                                              │
│ (AT) Admin   │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 4.2 Beranda: Pengguna Aktif (ada data)

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ Sidebar      │  Selamat siang, Admin                      Jumat, 9 Okt 2026 │
│ (sama)       │  Bulan ini kamu menabung 18% lebih banyak dari bulan lalu.   │
│              │                                                              │
│              │  ┌───────────────────────────────┐ ┌───────────┐ ┌─────────┐ │
│              │  │ Total saldo                   │ │ Pemasukan │ │ Pengel. │ │
│              │  │ Rp 12.450.000    ▲ 8,2%       │ │ ↓         │ │ ↑       │ │
│              │  │ ▁▂▃▃▄▅▅▆▇  (sparkline 30 hr)  │ │ Rp 6,2 jt │ │ Rp 3,1jt│ │
│              │  │ Pribadi 7,9 jt │ Bersama 4,5jt│ │ bulan ini │ │ bln ini │ │
│              │  └───────────────────────────────┘ └───────────┘ └─────────┘ │
│              │                                                              │
│              │  Target tabungan                              [Lihat semua]  │
│              │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│              │  │    ╭──╮      │ │    ╭──╮      │ │    ╭──╮      │          │
│              │  │    │██│      │ │    │▒▒│      │ │    │░░│      │          │
│              │  │    ╰──╯ 72%  │ │    ╰──╯ 40%  │ │    ╰──╯ 15%  │          │
│              │  │ Liburan Bali │ │ Dana darurat │ │ Laptop baru  │          │
│              │  │ Rp 7,2/10 jt │ │ Rp 4/10 jt   │ │ Rp 1,5/10 jt │          │
│              │  │ 🔵 Bersama·4 │ │ Pribadi      │ │ Pribadi      │          │
│              │  └──────────────┘ └──────────────┘ └──────────────┘          │
│              │                                                              │
│              │  Arus kas 6 bulan                  │ Transaksi terakhir      │
│              │  ┌───────────────────────────────┐ │ ┌─────────────────────┐ │
│              │  │  ▇ ▇   ▇   ▇ ▇  ▇             │ │ │ ↓ Gaji     +5,0 jt  │ │
│              │  │  ▃ ▅   ▄   ▅ ▃  ▄             │ │ │ ↑ Makan    −45 rb   │ │
│              │  │  Mei Jun Jul Agu Sep Okt      │ │ │ ↑ Listrik  −320 rb  │ │
│              │  └───────────────────────────────┘ │ │ [Lihat semua]       │ │
│              │                                    │ └─────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

**Hierarki baca:** Saldo → Target (toples) → Arus kas → Transaksi terakhir.

### 4.3 Tampilan Mobile (≤ 640 px)

Aplikasi keuangan paling sering dibuka dari ponsel, jadi mobile dirancang sungguh-sungguh.

```
┌────────────────────────┐
│ TabungKu         🔔 (AT)│
├────────────────────────┤
│ Selamat siang, Admin   │
│                        │
│ ┌────────────────────┐ │
│ │ Total saldo        │ │
│ │ Rp 12.450.000      │ │
│ │ ▲ 8,2% bulan ini   │ │
│ │ ▁▂▃▃▄▅▅▆▇          │ │
│ └────────────────────┘ │
│                        │
│ [↓ Pemasukan][↑ Pengel]│
│                        │
│ Target tabungan        │
│ ◄ [🫙72%][🫙40%][🫙15%] ► │  ← geser horizontal
│                        │
│ Transaksi terakhir     │
│ ↓ Gaji        +5,0 jt  │
│ ↑ Makan       −45 rb   │
│                        │
│            (＋)        │  ← FAB catat transaksi
├────────────────────────┤
│ 🏠   🐷   👥   ⇄   ⋯  │  ← bottom nav 5 item
└────────────────────────┘
```

Sidebar berubah menjadi **bottom navigation** (Beranda, Pribadi, Bersama, Transaksi, Lainnya).

### 4.4 Modal "Catat Transaksi"

```
┌────────────────────────────────────────┐
│ Catat transaksi                      ✕ │
├────────────────────────────────────────┤
│  ( ↓ Pemasukan )  ( ↑ Pengeluaran )    │  ← segmented control
│                                        │
│  Jumlah                                │
│  Rp  [ 0                         ]     │  ← font display 32 px, fokus otomatis
│                                        │
│  Kategori    [ Pilih kategori      ▾ ] │
│  Tabungan    [ Pribadi             ▾ ] │
│  Tanggal     [ 9 Okt 2026          📅] │
│  Catatan     [ Opsional…             ] │
│                                        │
│            [ Batal ]  [ Simpan ]       │
└────────────────────────────────────────┘
```

---

## 5. Spesifikasi Komponen

### Sidebar
- Lebar 248 px; latar Permukaan; border kanan 1 px Garis.
- Item: tinggi 40 px, radius 12 px, ikon 20 px + label 14 / 500.
- **Aktif:** latar Hijau Muda, teks Hijau Daun, batang 3 px di tepi kiri (bukan kotak border penuh).
- Footer: avatar + nama + email; klik membuka menu profil.

### Topbar
- Tinggi 64 px, `position: sticky`, latar transparan dengan `backdrop-filter: blur(12px)`.
- Isi: pencarian (⌘K / Ctrl+K), toggle tema, notifikasi, tombol utama **+ Catat transaksi**.

### Kartu Total Saldo (hero)
- Lebar 2 kolom dari 3; radius 20 px; latar gradien halus Tinta → hijau tua (hanya kartu ini yang gelap pada mode terang).
- Angka 40 px Bricolage Grotesque, putih; delta persen dalam badge pil Hijau Muda.
- Sparkline 30 hari di bawah angka, stroke Emas Koin 2 px, tanpa sumbu.
- Pecahan Pribadi / Bersama di baris bawah dengan pemisah vertikal.

### Kartu Target (toples)
- SVG toples; tinggi isi koin = persentase progres, animasi naik 600 ms saat pertama dimuat (satu-satunya animasi otomatis di halaman).
- Warna isi: Emas Koin. Badge kecil Biru Kolam untuk target bersama (dengan jumlah anggota).
- Teks: nama target (16 / 600), `Rp 7,2 jt dari Rp 10 jt` (13 / 400 Tinta Redup), sisa hari bila ada tenggat.
- Hover: naik 2 px + bayangan; fokus keyboard: ring 2 px Hijau Daun.

### Metrik Pemasukan / Pengeluaran
- Kartu kecil bergaris (tanpa bayangan), ikon panah dalam lingkaran 36 px berwarna sesuai jenis.
- Angka 22 / 700; subteks "dibanding bulan lalu" dengan panah naik/turun.

### Daftar Transaksi
- Baris 56 px: ikon kategori dalam lingkaran · nama + kategori · jumlah rata kanan (hijau `+`, karang `−`) · tanggal.
- Pemisah tipis, tanpa kartu per baris.

### Empty State (pola baku)
- Ilustrasi sederhana 96 px → judul 16 / 600 → satu kalimat langkah berikutnya → satu tombol utama.
- Contoh: **"Belum ada transaksi"** · "Catat pemasukan atau pengeluaran pertamamu untuk melihat grafik di sini." · `[ Catat transaksi ]`

---

## 6. Panduan Teks (Copywriting)

| Konteks | Sebelum | Sesudah |
|---------|---------|---------|
| Sapaan | Halo, Admin 👋 | Selamat siang, Admin (berubah pagi/siang/sore/malam) |
| Subjudul | Semoga hari ini menyenangkan dan produktif! | Bulan ini kamu menabung 18% lebih banyak dari bulan lalu. |
| Tombol | Tambah Transaksi | Catat transaksi |
| Tombol demo | Isi data contoh (demo) | Coba dengan data contoh |
| Empty grafik | Belum ada transaksi pada periode ini | Belum ada transaksi bulan ini. Catat satu untuk melihat grafiknya. |
| Empty bersama | Belum ada tabungan bersama | Menabung bareng keluarga atau teman? Buat tabungan bersama dan undang mereka. |
| Sukses | Berhasil | Transaksi tersimpan |

**Aturan:** kalimat aktif, huruf kapital hanya di awal kalimat, satu aksi = satu nama di seluruh alur (tombol "Catat transaksi" → toast "Transaksi tercatat").

---

## 7. Interaksi & Gerak

- **Satu momen gerak otomatis:** toples terisi saat Beranda pertama dimuat. Selain itu, gerak hanya sebagai respons aksi pengguna (buka modal, simpan, hapus).
- **Setelah menyimpan transaksi:** toast 3 detik + angka saldo berubah dengan hitung naik singkat (300 ms).
- **Target tercapai (100%):** toples penuh + konfeti koin sekali, lalu badge "Tercapai".
- Hormati `prefers-reduced-motion`: matikan animasi isi dan konfeti.

---

## 8. Aksesibilitas (batas minimum)

- Kontras teks ≥ 4.5:1, komponen UI ≥ 3:1 (periksa kedua mode).
- Ukuran teks minimum 13 px; area sentuh minimum 44 × 44 px di mobile.
- Fokus keyboard selalu terlihat (ring 2 px, offset 2 px).
- Grafik punya ringkasan teks (`aria-label`) dan tabel alternatif.
- Jenis transaksi tidak hanya dibedakan warna: pakai ikon dan tanda +/−.

---

## 9. Implementasi (Tailwind / CSS Variables)

```css
:root {
  --kertas: #F6F7F3;
  --permukaan: #FFFFFF;
  --tinta: #0F2A2E;
  --tinta-redup: #5B6F70;
  --garis: #E2E8E3;
  --hijau: #1F9D6B;
  --hijau-muda: #E3F4EC;
  --emas: #F2B544;
  --karang: #E5604D;
  --biru: #3B82C4;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
}

:root[data-theme="dark"] {
  --kertas: #0C1A1D;
  --permukaan: #132A2E;
  --tinta: #EAF2EE;
  --tinta-redup: #9DB3B0;
  --garis: #1F3A3F;
  --hijau: #3DC38C;
  --hijau-muda: #163A33;
  --emas: #F5C25E;
  --karang: #F07F6E;
  --biru: #6AA7DE;
}

body {
  font-family: "Plus Jakarta Sans", system-ui, sans-serif;
  background: var(--kertas);
  color: var(--tinta);
}

.angka {
  font-family: "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif;
  font-variant-numeric: tabular-nums;
}
```

**Grid halaman:** `max-width: 1200px; margin-inline: auto; padding: 32px;` dengan `grid-template-columns: repeat(12, 1fr); gap: 24px;`. Hero saldo = 6 kolom, dua metrik = masing-masing 3 kolom, kartu target = 4 kolom × 3.

---

## 10. Prioritas Pengerjaan

| Prioritas | Pekerjaan | Perkiraan |
|-----------|-----------|-----------|
| 1 | Perbaiki lebar konten & grid, ukuran font minimum, kontras | 0,5 hari |
| 2 | Kartu **Total Saldo** + ganti 4 kartu identik | 0,5 hari |
| 3 | Gabungkan 3 empty state menjadi satu onboarding checklist | 0,5 hari |
| 4 | Restyle sidebar & isi topbar (pencarian + tombol utama) | 0,5 hari |
| 5 | Kartu target bergambar toples + animasi | 1 hari |
| 6 | Bottom navigation & layout mobile | 1 hari |
| 7 | Mode terang sebagai default + audit aksesibilitas | 0,5 hari |

---

*Versi dokumen 1.0 · 9 Oktober 2026*
