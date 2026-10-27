# User Stories dan Acceptance Criteria

## US-01 — Registrasi dan login
**Sebagai** pengguna, **saya ingin** membuat akun dan login agar data keuangan saya terlindungi.

Acceptance criteria:
- Pengguna dapat mendaftar dengan data wajib yang valid.
- Email unik bila email digunakan sebagai identitas.
- Password disimpan menggunakan hash password yang aman.
- Pengguna yang belum login tidak dapat mengakses endpoint keuangan.
- Pesan kesalahan tidak membocorkan apakah kredensial rahasia benar.

## US-02 — Mencatat pemasukan pribadi
**Sebagai** pengguna, saya ingin mencatat pemasukan agar saldo pribadi tercermin.

Acceptance criteria:
- Nominal harus lebih besar dari nol.
- Jenis transaksi tersimpan sebagai pemasukan.
- Transaksi hanya muncul di ruang pribadi pemilik.
- Saldo pribadi bertambah sesuai nominal transaksi aktif.
- Permintaan invalid ditolak server dengan pesan validasi.

## US-03 — Mencatat pengeluaran pribadi
Acceptance criteria:
- Pengguna dapat memasukkan nominal, tanggal, kategori, dan deskripsi.
- Saldo tercatat berkurang sebesar nominal pengeluaran aktif.
- Transaksi pribadi tidak mengubah saldo grup mana pun.
- Pengguna tidak dapat membuat transaksi atas nama pengguna lain.

## US-04 — Membuat tabungan bersama
**Sebagai** pengguna, saya ingin membuat grup agar dapat mencatat tabungan bersama.

Acceptance criteria:
- Pengguna yang login dapat membuat grup dengan nama valid.
- Pembuat menjadi owner dan anggota aktif grup tersebut.
- Grup memiliki identitas unik.
- Hanya anggota grup yang dapat melihat detail grup setelah grup dibuat.

## US-05 — Mengundang anggota
Acceptance criteria:
- Anggota yang berwenang dapat membuat undangan.
- Token undangan acak, sulit ditebak, dapat dicabut, dan memiliki masa berlaku.
- Token yang expired atau revoked tidak dapat diterima.
- Penerimaan undangan membuat keanggotaan aktif secara atomik.
- Penggunaan token berulang tidak membuat keanggotaan duplikat.

## US-06 — Mencatat setoran bersama
**Sebagai** anggota aktif, saya ingin mencatat setoran tanpa menunggu persetujuan.

Acceptance criteria:
- Semua anggota aktif dapat membuat transaksi setoran.
- Tidak ada status menunggu approval.
- Saldo bersama bertambah sesuai nominal setoran aktif.
- Sistem menyimpan pencatat dan anggota kontributor.
- Anggota nonaktif atau non-anggota ditolak.

## US-07 — Mencatat pengeluaran bersama
Acceptance criteria:
- Semua anggota aktif dapat mencatat pengeluaran tanpa approval.
- Saldo bersama berkurang sesuai nominal pengeluaran aktif.
- Sistem menyimpan pencatat, waktu, nominal, kategori, dan deskripsi.
- Tidak ada workflow approval.
- Jika aplikasi menerapkan batas saldo minimum, transaksi yang membuat saldo negatif ditolak; kebijakan default MVP adalah saldo tercatat tidak boleh negatif.

## US-08 — Melihat transaksi grup
Acceptance criteria:
- Semua anggota aktif dapat melihat seluruh transaksi aktif grup.
- Transaksi menampilkan tanggal, jenis, nominal, deskripsi, dan pencatat.
- Transaksi voided tidak dihitung dalam saldo dan ditampilkan sebagai dibatalkan bila riwayat audit ditampilkan.
- Pengguna dari grup lain tidak dapat mengakses data grup tersebut.

## US-09 — Mengubah atau membatalkan transaksi
Acceptance criteria:
- Anggota dapat mengubah/membatalkan transaksi sesuai kebijakan akses yang ditetapkan.
- Semua perubahan menyimpan nilai sebelum/sesudah, aktor, waktu, dan alasan.
- Transaksi yang dibatalkan tidak dihapus permanen dan tidak dihitung dalam saldo.
- Perubahan saldo dan audit log disimpan dalam satu transaksi database.

## US-10 — Laporan
Acceptance criteria:
- Pengguna dapat memilih rentang tanggal.
- Total dihitung hanya dari transaksi aktif dalam rentang tersebut.
- Total laporan konsisten dengan daftar transaksi.
- Filter tidak dapat digunakan untuk membaca data yang tidak berhak diakses.

## US-11 — Keluar dari grup
Acceptance criteria:
- Anggota dapat keluar sesuai aturan produk.
- Keanggotaan berubah menjadi `LEFT`; riwayat transaksi tetap dipertahankan.
- Pengguna yang keluar tidak lagi dapat membuat atau melihat transaksi privat grup.
- Jika owner satu-satunya, sistem meminta transfer kepemilikan atau proses penutupan sebelum keluar.

## US-12 — Batas saldo dan validasi
Acceptance criteria:
- Nominal disimpan sebagai tipe decimal/numeric yang tepat, bukan floating point.
- Semua operasi saldo konsisten pada transaksi database.
- Permintaan bersamaan tidak menghasilkan saldo atau laporan yang inkonsisten.
