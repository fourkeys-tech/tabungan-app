# MVP Roadmap and Testing

## 1. Prioritas MVP

### P0 — Wajib untuk rilis awal
- Registrasi, login, logout, dan profil.
- Buku tabungan pribadi.
- Pemasukan dan pengeluaran pribadi.
- Pembuatan grup tabungan bersama.
- Undangan dan penerimaan anggota.
- Setoran dan pengeluaran bersama tanpa approval.
- Saldo tercatat dan riwayat transaksi.
- Hak akses berdasarkan pemilik/keanggotaan.
- Audit log perubahan/void transaksi.
- Validasi nominal dan pencegahan saldo negatif.
- Pengujian akses lintas pengguna/grup.
- Backup dan konfigurasi production dasar.

### P1 — Setelah alur inti stabil
- Laporan rentang tanggal.
- Ringkasan kontribusi anggota.
- Ekspor CSV.
- Target tabungan dan tanggal target.
- Notifikasi transaksi grup.
- Kategori khusus grup.

### P2 — Pengembangan lanjutan
- Integrasi payment gateway/bank/e-wallet.
- Impor transaksi otomatis.
- Bukti transaksi dan verifikasi opsional.
- Multi-currency.
- Pengaturan saldo negatif per grup.
- Fitur penyelesaian/pembagian saldo kelompok.

## 2. Rencana implementasi bertahap
1. **Fondasi:** repository, konfigurasi, database, migrasi, autentikasi.
2. **Personal ledger:** transaksi pribadi, saldo, filter, validasi.
3. **Shared groups:** grup, anggota, undangan, otorisasi.
4. **Shared ledger:** setoran, pengeluaran, saldo, histori.
5. **Integritas:** audit log, void, concurrency control, rate limiting.
6. **UX dan laporan:** dashboard, ringkasan, laporan.
7. **QA dan rilis:** uji keamanan, backup/restore, staging, monitoring.

## 3. Skenario pengujian wajib
- Pemasukan pribadi meningkatkan saldo pribadi.
- Pengeluaran pribadi menurunkan saldo pribadi.
- Transaksi pribadi tidak mengubah saldo grup.
- Setoran grup meningkatkan saldo grup tanpa approval.
- Pengeluaran grup menurunkan saldo grup tanpa approval.
- Pengeluaran yang membuat saldo negatif ditolak secara atomik.
- Dua permintaan pengeluaran bersamaan tidak dapat melewati batas saldo.
- Non-anggota tidak dapat membaca atau menulis data grup.
- Anggota yang keluar tidak dapat mengakses grup.
- Token undangan kedaluwarsa/dicabut ditolak.
- Token undangan tidak dapat dipakai berulang untuk membuat keanggotaan ganda.
- Void mengeluarkan transaksi dari perhitungan saldo dan membuat audit log.
- Pengubahan transaksi menyimpan nilai sebelum/sesudah.
- Laporan sama dengan penjumlahan transaksi aktif.
- Input nominal sangat besar, pecahan, nol, negatif, dan karakter invalid divalidasi dengan benar.
- Request tidak mengizinkan klien menentukan aktor atau saldo akhir.
- Data pribadi satu pengguna tidak dapat diakses pengguna lain.

## 4. Kriteria siap rilis
- Semua test P0 lulus.
- Tidak ada celah otorisasi lintas pengguna/grup yang diketahui.
- Perhitungan saldo dan laporan telah diuji dengan data uji.
- Backup berhasil dan proses restore telah diuji.
- Error logging dan audit log berfungsi.
- Disclaimer saldo tercatat tampil di UI.
- Kebijakan edit/void transaksi telah diputuskan dan dijelaskan ke pengguna.

## 5. Keputusan produk yang masih terbuka
1. Edit/void transaksi bersama: rekomendasi pembuat dapat mengedit/void miliknya; owner dapat void administratif dengan alasan.
2. Saldo negatif: rekomendasi tidak diizinkan pada MVP.
3. Target tabungan: P1, kecuali target adalah kebutuhan inti.
4. Lampiran bukti transaksi: P1 atau P2.
5. Akun yang dihapus: tetapkan anonimisasi/retensi yang menjaga integritas laporan dan memenuhi kebijakan privasi.


## UI/UX QA tambahan (v1.1)

- Verifikasi Light, Dark, dan System pada semua halaman inti.
- Verifikasi viewport 320, 360, 390, 768, 1024, 1280, dan 1440 px serta zoom 200%.
- Pastikan transaksi berubah menjadi list/card pada layar sempit dan filter tetap dapat digunakan.
- Uji loading, empty, error, forbidden, validation, saving, dan success state.
- Uji keyboard-only navigation, visible focus, label form, kontras, dan reduced motion.
- Uji bahwa perubahan tema tidak mengubah data/otorisasi dan tidak menimbulkan flash tema yang salah.
