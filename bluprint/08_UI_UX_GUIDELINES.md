# 08 — UI/UX Guidelines
**Produk:** TabungKu — Tabungan Personal & Tabungan Bersama  
**Versi:** 1.1 — Revisi berdasarkan mockup Light/Dark dan responsive  
**Status:** Spesifikasi UI/UX untuk implementasi MVP

## 1. Tujuan dan prinsip desain

UI harus terasa tenang, jelas, tepercaya, dan mudah dipakai untuk pencatatan keuangan sehari-hari. Tampilan harus konsisten pada seluruh fitur Tabungan Personal dan Tabungan Bersama.

Prinsip:
1. **Clarity first:** saldo, pemasukan, pengeluaran, dan transaksi terbaru mudah dipindai.
2. **Responsive by default:** fitur inti tetap nyaman pada layar ponsel kecil.
3. **Theme parity:** Light Mode dan Dark Mode memiliki kelengkapan fitur dan hierarki visual yang setara.
4. **Accessible:** status tidak boleh dibedakan hanya melalui warna; kontrol dapat diakses melalui keyboard.
5. **Low-friction entry:** tambah transaksi dapat dijangkau dari dashboard dan halaman transaksi.
6. **Data integrity:** konfirmasi tindakan destruktif dan tampilkan hasil simpan secara jelas.

## 2. Arah visual

- Gaya: modern, minimal, dashboard keuangan, dengan ruang kosong yang cukup.
- Warna utama: hijau untuk tindakan utama dan indikator positif.
- Warna sekunder: teal/biru untuk informasi pendukung.
- Aksen: amber/oranye untuk pengeluaran atau perhatian.
- Merah hanya untuk error, tindakan berbahaya, dan nilai negatif.
- Gunakan ikon yang konsisten dan label teks untuk aksi penting; hindari ikon tanpa label pada aksi yang tidak umum.
- Hindari efek dekoratif berlebihan, gradient kuat, dan animasi yang mengganggu fokus.
- Mockup visual menjadi referensi arah desain, bukan spesifikasi piksel final.

## 3. Design tokens

Implementasikan token sebagai CSS variables atau konfigurasi theme Tailwind. Komponen harus menggunakan token, bukan menanam warna berbeda-beda secara langsung.

### 3.1 Color tokens — Light

| Token | Nilai awal | Penggunaan |
|---|---|---|
| `--bg` | `#F7F9FC` | Latar halaman |
| `--surface` | `#FFFFFF` | Kartu, modal, panel |
| `--surface-muted` | `#F0F4F8` | Area sekunder, input |
| `--text` | `#17212B` | Teks utama |
| `--text-muted` | `#617080` | Teks pendukung |
| `--border` | `#DCE4EC` | Border dan pemisah |
| `--primary` | `#16834A` | Tombol utama, link aktif |
| `--primary-hover` | `#116B3C` | Hover tombol utama |
| `--secondary` | `#087F8C` | Informasi sekunder |
| `--accent` | `#F59E0B` | Perhatian/pengeluaran |
| `--danger` | `#DC4444` | Error dan tindakan berbahaya |
| `--success` | `#16834A` | Status berhasil |

### 3.2 Color tokens — Dark

| Token | Nilai awal | Penggunaan |
|---|---|---|
| `--bg` | `#101820` | Latar halaman |
| `--surface` | `#17232D` | Kartu, modal, panel |
| `--surface-muted` | `#202F3A` | Area sekunder, input |
| `--text` | `#EDF3F7` | Teks utama |
| `--text-muted` | `#A8B7C3` | Teks pendukung |
| `--border` | `#334653` | Border dan pemisah |
| `--primary` | `#35B978` | Tombol utama, link aktif |
| `--primary-hover` | `#54CA8D` | Hover tombol utama |
| `--secondary` | `#42B9C3` | Informasi sekunder |
| `--accent` | `#F6B94A` | Perhatian/pengeluaran |
| `--danger` | `#FF7373` | Error dan tindakan berbahaya |
| `--success` | `#35B978` | Status berhasil |

Nilai di atas merupakan titik awal dan wajib divalidasi melalui pengujian kontras. Jangan mengasumsikan pasangan warna otomatis memenuhi WCAG hanya berdasarkan nilai hex.

### 3.3 Typography, spacing, dan bentuk

- Font utama: `Inter` atau font sans-serif sistem yang setara.
- Body: 14–16 px; helper text minimal 12 px dan tetap terbaca.
- H1 halaman: 24–32 px desktop, 22–26 px mobile.
- H2 bagian: 18–22 px; label metrik: 12–14 px.
- Skala spacing dasar: 4, 8, 12, 16, 20, 24, 32, 40, 48 px.
- Radius: 8 px untuk input, 12 px untuk kartu, 14–16 px untuk dialog/area besar.
- Border standar 1 px; gunakan shadow secara hemat, terutama pada Dark Mode.
- Target area interaksi minimal 44 × 44 px untuk kontrol utama pada perangkat sentuh.

## 4. Theme system

### 4.1 Pilihan tema
Sediakan tiga pilihan di Pengaturan:
- **Terang (Light)**
- **Gelap (Dark)**
- **Ikuti sistem (System)** — mengikuti preferensi OS.

### 4.2 Perilaku
- Default pengguna baru: `System`.
- Pengguna yang sudah login: simpan preferensi tema pada profil/pengaturan akun agar konsisten lintas perangkat.
- Sebelum login: simpan pilihan lokal di browser.
- Saat mode `System` aktif, perubahan preferensi OS harus diikuti.
- Terapkan tema sebelum konten utama dirender untuk mengurangi flash tema yang salah.
- Jangan menyimpan data keuangan sensitif di local storage; penyimpanan lokal hanya untuk preferensi UI non-sensitif seperti tema.
- Semua komponen, grafik, tooltip, dropdown, modal, toast, skeleton, empty state, dan kalender harus mendukung kedua tema.
- Pastikan logo dan ikon tetap memiliki kontras yang memadai pada kedua tema.

### 4.3 Toggle tema
- Tampilkan pilihan tema di Pengaturan dan menu profil.
- Gunakan segmented control atau pilihan radio dengan label teks.
- Perubahan tema langsung diterapkan dan menampilkan pilihan aktif secara jelas.
- Jangan hanya menggunakan ikon matahari/bulan tanpa nama pilihan atau accessible label.

## 5. Responsive layout

Gunakan breakpoint sebagai panduan awal; penyesuaian akhir dilakukan berdasarkan konten dan pengujian perangkat.

| Breakpoint | Rentang | Pola layout |
|---|---|---|
| Mobile kecil | 320–639 px | Satu kolom, navigasi ringkas, kartu bertumpuk |
| Tablet | 640–1023 px | Satu/dua kolom sesuai konten, sidebar dapat menjadi drawer |
| Desktop | 1024–1439 px | Sidebar dan area konten utama, grid dashboard |
| Desktop lebar | ≥1440 px | Konten diberi batas lebar agar tidak terlalu melebar |

### 5.1 Navigasi
- Desktop: sidebar yang dapat diciutkan, logo, menu utama, status menu aktif, dan profil di bagian bawah.
- Tablet: sidebar ringkas atau drawer; konten tidak boleh tertutup.
- Mobile: gunakan bottom navigation untuk 4–5 tujuan utama atau menu drawer jika item terlalu banyak. Jangan menampilkan dua navigasi utama yang bersaing.
- Aksi **Tambah transaksi** harus mudah ditemukan pada mobile, tetapi tidak boleh menutupi tombol, konten, atau safe area perangkat.
- Navigasi harus mempertahankan konteks ketika pengguna membuka detail lalu kembali.

### 5.2 Dashboard
- Desktop: grid metrik 3–4 kartu per baris; grafik dan ringkasan tabungan dapat berada dalam dua kolom.
- Tablet: grid 2 kolom bila ruang cukup.
- Mobile: kartu metrik satu kolom atau dua kolom hanya bila angka dan label tetap terbaca; grafik dan transaksi ditumpuk vertikal.
- Jangan memaksakan tabel lebar atau grafik yang memerlukan scroll horizontal pada viewport kecil.

### 5.3 Tabel dan daftar transaksi
- Desktop: tabel dengan kolom tanggal, deskripsi, kategori, jenis, nominal, dan aksi sesuai izin.
- Mobile: ubah baris menjadi transaction card/list yang menampilkan tanggal, deskripsi, label jenis, dan nominal. Detail tambahan dapat dibuka melalui detail transaksi.
- Jangan mengecilkan font tabel sampai sulit dibaca.
- Jika tabel horizontal memang diperlukan untuk data administratif, sediakan indikator scroll yang jelas dan pertahankan kolom identitas/nominal yang paling penting.
- Filter mobile masuk ke panel/drawer; tampilkan filter aktif dan tombol reset.
- Pagination harus tetap mudah digunakan dengan sentuhan.

## 6. Struktur informasi dan halaman

### 6.1 Landing page
- Header: logo, Beranda, Fitur, Tentang, Masuk, Daftar.
- Hero: headline singkat tentang pengelolaan uang personal dan bersama, penjelasan satu paragraf, CTA utama “Mulai Sekarang” dan CTA sekunder “Pelajari Fitur”.
- Bagian fitur: Tabungan Personal, Tabungan Bersama, Transaksi, Privasi.
- Mobile: header ringkas, CTA tidak terpotong, ilustrasi tidak menggeser konten penting ke bawah secara berlebihan.

### 6.2 Login dan registrasi
- Form berisi email/nomor identitas login sesuai keputusan autentikasi produk, password, tampil/sembunyikan password, dan tautan pemulihan akun bila didukung.
- Validasi ditampilkan dekat field terkait.
- Sediakan loading pada tombol submit dan cegah submit ganda.
- Jangan menjanjikan login sosial sebelum provider dan kebutuhannya diputuskan.
- Form harus nyaman digunakan di layar sempit dan saat keyboard mobile terbuka.

### 6.3 Dashboard utama
Prioritas informasi:
1. Sapaan dan rentang tanggal bila relevan.
2. Ringkasan saldo tabungan personal.
3. Saldo tabungan bersama yang diikuti.
4. Total pemasukan dan pengeluaran pada rentang periode yang jelas.
5. Grafik arus kas.
6. Transaksi terbaru.
7. CTA tambah transaksi atau buat tabungan bersama.

**Penting:** saldo personal dan saldo bersama harus dibedakan secara visual dan tidak dijumlahkan sebagai satu saldo milik pengguna tanpa penjelasan.

### 6.4 Tabungan Personal
- Kartu saldo dan CTA tambah transaksi.
- Ringkasan pemasukan/pengeluaran dan tren periode.
- Daftar transaksi dengan filter tanggal, kategori, dan jenis.
- Detail transaksi memperlihatkan nominal, tanggal, kategori, catatan, dan waktu pencatatan jika tersedia.
- Data personal hanya dapat dilihat pemilik dan peran yang secara eksplisit berwenang berdasarkan kebijakan produk.

### 6.5 Tabungan Bersama
- Daftar grup dengan nama, saldo, jumlah anggota, target (jika ada), dan peran pengguna.
- Detail grup: saldo bersama, daftar transaksi, anggota, dan target.
- Tombol **Setor** dan **Catat Pengeluaran** ditampilkan hanya jika pengguna memiliki izin yang sesuai.
- Hak `lihat` hanya memberi akses membaca saldo dan riwayat; tidak menampilkan tombol tulis.
- Tampilkan identitas pencatat pada transaksi jika tersedia.
- Jelaskan bahwa pencatatan setoran/pengeluaran oleh anggota berizin berlangsung langsung tanpa approval. Aktivitas tetap tercatat dalam riwayat/audit log sesuai desain sistem.
- Jangan menyamakan saldo grup dengan saldo personal anggota.

### 6.6 Buat tabungan bersama
Gunakan alur sederhana:
1. Informasi dasar: nama dan deskripsi opsional.
2. Anggota: undang anggota atau lewati untuk nanti.
3. Pengaturan awal: privasi/akses dan target opsional jika fitur target termasuk MVP.
4. Ringkasan dan konfirmasi.
Jangan mewajibkan target tabungan jika target bersifat opsional.

### 6.7 Form tambah transaksi
- Bedakan tipe transaksi dengan label eksplisit: Pemasukan, Pengeluaran, Setoran, atau Pengeluaran Bersama sesuai konteks.
- Field minimum: jenis, nominal, tanggal, dan keterangan; kategori sesuai jenis transaksi.
- Pada tabungan bersama, pilih grup hanya bila pengguna mengelola lebih dari satu grup dan form tidak dibuka dari konteks grup tertentu.
- Validasi nominal positif dan field wajib sebelum submit.
- Tombol simpan menunjukkan status loading; setelah berhasil, tampilkan konfirmasi dan perbarui ringkasan/list tanpa memaksa reload halaman penuh.
- Tindakan batal tidak boleh menghapus transaksi yang telah tersimpan.

## 7. Komponen UI dan state

Bangun komponen reusable setidaknya untuk:
- `AppShell`, `Sidebar`, `MobileNavigation`, `PageHeader`
- `ThemeSelector`
- `SummaryCard`, `BalanceCard`, `TransactionList`, `TransactionCard`
- `TransactionTypeBadge`, `CategoryBadge`
- `DateRangeFilter`, `CategoryFilter`, `SearchInput`
- `FormField`, `CurrencyInput`, `DateInput`, `Select`
- `PrimaryButton`, `SecondaryButton`, `IconButton`
- `Modal/Dialog`, `Toast/Notification`, `ConfirmDialog`
- `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PermissionState`
- `ChartContainer` dengan tooltip dan legend yang theme-aware

Setiap halaman/data widget perlu memiliki state:
- Loading/skeleton
- Loaded dengan data
- Empty state dengan CTA yang sesuai
- Error state dengan pesan dan aksi coba lagi
- Forbidden/permission state bila pengguna tidak memiliki akses
- Saving state untuk form
- Validation state untuk field invalid

Hindari penggunaan alert browser standar sebagai satu-satunya feedback untuk alur utama.

## 8. Grafik dan representasi angka

- Grafik wajib mengikuti theme token, termasuk grid, axis, tooltip, legend, dan empty state.
- Gunakan label/legend dan simbol; jangan membedakan pemasukan/pengeluaran hanya berdasarkan warna.
- Format rupiah konsisten dengan locale Indonesia, misalnya `Rp 1.500.000`.
- Gunakan pemisah ribuan yang konsisten; hindari angka terpotong tanpa tooltip atau akses detail.
- Periode grafik harus jelas (minggu/bulan/tahun).
- Grafik harus tetap terbaca pada mobile; kurangi tick/label bila diperlukan tanpa menghilangkan konteks.

## 9. Aksesibilitas

Target: **WCAG 2.2 AA** sejauh relevan untuk antarmuka web.

- Kontras teks normal minimal 4.5:1 dan teks besar minimal 3:1; komponen visual penting dan indikator fokus harus memiliki kontras yang memadai.
- Semua kontrol dapat dioperasikan menggunakan keyboard dan memiliki visible focus state.
- Setiap input memiliki label programatis; placeholder bukan pengganti label.
- Gunakan semantic heading, landmark, label, dan nama aksesibel.
- Ikon dekoratif disembunyikan dari screen reader; tombol ikon memiliki accessible name.
- Error field dihubungkan ke input terkait dan dijelaskan dengan teks, bukan warna saja.
- Status berhasil/gagal diumumkan secara aksesibel bila memungkinkan.
- Hormati `prefers-reduced-motion`; hindari animasi yang tidak perlu.
- Jangan mengandalkan warna merah/hijau saja untuk menyampaikan tipe atau status transaksi.

## 10. Interaksi, feedback, dan motion

- Hover, focus, pressed, disabled, loading, dan selected memiliki gaya yang konsisten.
- Durasi transisi sederhana sekitar 120–200 ms; hormati reduced motion.
- Gunakan toast untuk feedback ringan; dialog konfirmasi untuk aksi destruktif atau berdampak besar.
- Hindari konfirmasi berulang untuk pencatatan normal yang berhasil.
- Setelah transaksi tersimpan, perbarui saldo dan riwayat secara konsisten dengan respons API.
- Jika permintaan gagal, pertahankan input agar pengguna tidak perlu mengetik ulang.
- Cegah double submit dan tampilkan pesan error yang dapat ditindaklanjuti tanpa membocorkan detail teknis.

## 11. Keamanan visual dan privasi

- Jangan tampilkan informasi finansial personal pada halaman grup.
- Jangan membocorkan email/nomor kontak anggota kepada anggota lain jika tidak diperlukan.
- Sembunyikan atau batasi aksi berdasarkan izin, tetapi backend tetap wajib memvalidasi izin; menyembunyikan tombol bukan kontrol keamanan.
- Pertimbangkan opsi menyamarkan nominal pada dashboard jika disepakati sebagai fitur produk.
- Jangan tampilkan token undangan lengkap di log UI setelah proses undangan selesai.

## 12. Responsiveness dan quality assurance checklist

Sebelum rilis, verifikasi setidaknya pada viewport 320, 360, 390, 768, 1024, 1280, dan 1440 px serta zoom browser 200%.

- [ ] Tidak ada horizontal overflow yang tidak disengaja.
- [ ] Navigasi, modal, dropdown, date picker, dan form dapat digunakan pada mobile.
- [ ] Tombol utama tidak tertutup bottom navigation atau safe area.
- [ ] Tabel transaksi menjadi daftar kartu pada layar sempit.
- [ ] Grafik dan tooltip dapat dibaca pada kedua tema.
- [ ] Semua halaman diuji pada Light, Dark, dan System.
- [ ] Tema tidak berkedip salah saat halaman pertama dimuat.
- [ ] Preferensi tema pengguna login konsisten lintas sesi/perangkat sesuai desain penyimpanan.
- [ ] Loading, empty, error, forbidden, dan success states diuji.
- [ ] Kontras, keyboard navigation, focus indicator, dan label screen reader diuji.
- [ ] Format mata uang/tanggal konsisten dengan locale Indonesia.
- [ ] Hak akses menentukan aksi yang tersedia di UI dan divalidasi kembali oleh API.

## 13. Catatan implementasi

- Frontend: Next.js dan Tailwind CSS; implementasi komponen dapat memakai React client components seperlunya untuk interaksi.
- Backend: Express.js menyediakan autentikasi, otorisasi, data transaksi, dan preferensi tema akun bila disimpan di server.
- Jangan menambahkan Vue, Inertia, atau Livewire.
- Detail warna, breakpoint, dan komponen dapat disesuaikan selama prinsip, aksesibilitas, serta konsistensi lintas tema tetap dipenuhi.
- Desain visual tidak menggantikan kontrak API, aturan bisnis, atau validasi keamanan di backend.
