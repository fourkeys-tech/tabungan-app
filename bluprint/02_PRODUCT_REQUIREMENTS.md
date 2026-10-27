# Product Requirements Document (PRD)

## 1. Ruang lingkup
Aplikasi web dengan dua modul keuangan:
1. **Tabungan Pribadi** — buku kas pribadi pengguna.
2. **Tabungan Bersama** — buku kas kelompok yang dapat diakses anggota grup.

Aplikasi pada MVP merupakan sistem pencatatan. Saldo adalah hasil perhitungan catatan transaksi, bukan konfirmasi saldo bank.

## 2. Modul tabungan pribadi
### Fitur
- Membuat pemasukan dan pengeluaran.
- Memilih kategori, tanggal, nominal, dan deskripsi.
- Mengubah atau membatalkan transaksi milik sendiri.
- Melihat saldo, saldo awal periode, pemasukan, pengeluaran, dan selisih bersih.
- Filter berdasarkan rentang tanggal, kategori, dan jenis transaksi.
- Melihat daftar transaksi dengan pagination.

### Perilaku saldo
Saldo tercatat = saldo awal (jika digunakan) + total pemasukan aktif - total pengeluaran aktif.
Untuk MVP, transaksi pribadi tidak memindahkan uang dan tidak memengaruhi tabungan bersama.

## 3. Modul tabungan bersama
### Pembuatan dan keanggotaan
- Pengguna terautentikasi dapat membuat grup.
- Pembuat grup menjadi anggota dengan status aktif dan role `owner`.
- Anggota dapat mengundang pengguna melalui tautan/token undangan.
- Pengguna yang diundang dapat menerima undangan setelah login/registrasi.
- Pemilik grup dapat mencabut undangan yang belum digunakan dan mengelola keanggotaan.
- Anggota dapat keluar dari grup dengan syarat tidak ada proses penutupan grup yang belum selesai; riwayat transaksi tidak dihapus.

### Transaksi
Jenis transaksi:
- `CONTRIBUTION`: setoran ke tabungan bersama.
- `EXPENSE`: pengeluaran dari tabungan bersama.
- `ADJUSTMENT`: koreksi saldo khusus, dibatasi ke pemilik grup dan wajib alasan serta audit trail. Direkomendasikan tidak ditampilkan sebagai transaksi biasa pada MVP; dapat ditunda jika ingin ruang lingkup lebih kecil.

Semua anggota aktif dapat:
- Mencatat setoran.
- Mencatat pengeluaran.
- Melihat saldo dan seluruh riwayat transaksi.
- Melihat jumlah setoran yang tercatat atas nama tiap anggota.

Tidak ada approval transaksi oleh admin, bendahara, atau anggota lain.

### Data transaksi bersama
- Grup.
- Jenis transaksi.
- Nominal positif.
- Tanggal transaksi.
- Pencatat.
- Kontributor/pihak yang melakukan setoran (untuk kontribusi).
- Kategori.
- Deskripsi.
- Waktu pencatatan.
- Status transaksi (aktif/dibatalkan).
- Referensi audit perubahan.

### Pengeluaran
Setiap pengeluaran harus memiliki nominal, tanggal, kategori, dan deskripsi. Anggota yang mencatat pengeluaran tercatat sebagai pembuat catatan, bukan bukti bahwa ia satu-satunya pihak yang mengeluarkan uang secara fisik.

## 4. Dashboard
### Dashboard pribadi
- Saldo tercatat pribadi.
- Total pemasukan dan pengeluaran pada periode aktif.
- Grafik arus kas sederhana.
- Transaksi terbaru.
- Akses cepat menambah transaksi.

### Dashboard tabungan bersama
- Nama grup dan daftar anggota aktif.
- Saldo bersama tercatat.
- Total setoran dan total pengeluaran.
- Riwayat terbaru.
- Ringkasan kontribusi anggota.
- Target tabungan (jika diaktifkan).

## 5. Laporan
- Filter rentang tanggal.
- Total pemasukan/setoran dan pengeluaran.
- Ringkasan per kategori.
- Ringkasan kontribusi per anggota.
- Ekspor CSV dapat dipertimbangkan sebagai prioritas Should.

## 6. Notifikasi
MVP minimum:
- Notifikasi dalam aplikasi atau email saat undangan dibuat/diterima.
- Notifikasi saat anggota baru bergabung.
- Notifikasi transaksi baru dalam grup dapat ditambahkan jika tidak memperbesar scope.
Tidak diperlukan notifikasi untuk meminta approval karena tidak ada alur approval.

## 7. Status utama
- Grup: `ACTIVE`, `ARCHIVED`.
- Keanggotaan: `INVITED`, `ACTIVE`, `LEFT`, `REMOVED`.
- Undangan: `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`.
- Transaksi: `ACTIVE`, `VOIDED`.

## 8. Non-functional requirements
- Antarmuka responsif desktop dan mobile.
- API tervalidasi di server.
- Konsistensi perhitungan saldo.
- Isolasi data antar pengguna dan grup.
- Log audit untuk tindakan penting.
- Waktu respons target: p95 < 500 ms untuk endpoint baca biasa pada beban awal yang disepakati, tidak termasuk laporan berat.
- Backup dan prosedur pemulihan database ditetapkan sebelum produksi.


## UI/UX Requirements (Revisi v1.1)

- Aplikasi menyediakan tema Light, Dark, dan System.
- Tema diterapkan konsisten pada dashboard, transaksi, grafik, form, modal, dropdown, toast, loading, empty, dan error state.
- Preferensi tema pengguna login disimpan pada pengaturan akun; pengguna anonim dapat menyimpan pilihan di browser.
- Layout wajib responsif mulai viewport 320 px dan tidak menimbulkan horizontal overflow yang tidak disengaja.
- Pada mobile, daftar transaksi menggunakan pola list/card; aksi tambah transaksi mudah dijangkau.
- Semua halaman penting harus memiliki loading, empty, error, dan permission state yang sesuai.
- Target aksesibilitas adalah WCAG 2.2 AA sejauh relevan, termasuk kontras, keyboard navigation, focus state, dan label input.
- Rincian visual dan kriteria QA mengikuti `08_UI_UX_GUIDELINES.md`.

