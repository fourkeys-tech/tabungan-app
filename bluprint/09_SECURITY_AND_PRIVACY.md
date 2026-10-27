# Security and Privacy Requirements

## 1. Autentikasi
- Password harus di-hash dengan algoritma modern yang sesuai (misalnya Argon2id atau bcrypt dengan parameter yang layak).
- Terapkan pembatasan percobaan login dan pemulihan akun yang aman.
- Token/session tidak boleh dimasukkan ke log.
- Untuk web, utamakan cookie `HttpOnly`, `Secure`, `SameSite` jika arsitektur mendukung.

## 2. Otorisasi
- Semua endpoint keuangan memerlukan autentikasi.
- Semua akses data pribadi memverifikasi pemilik ledger.
- Semua akses grup memverifikasi keanggotaan aktif dan izin tindakan.
- Uji IDOR/BOLA: mengganti ID di URL tidak boleh membuka data pengguna/grup lain.
- Status anggota yang `LEFT` atau `REMOVED` tidak boleh membuat transaksi atau membaca data grup privat.

## 3. Validasi data
- Validasi server-side untuk nominal, tanggal, jenis transaksi, kategori, ID, dan panjang teks.
- Tolak nominal nol/negatif dan angka yang tidak valid.
- Gunakan query parameterized/ORM yang aman.
- Cegah mass assignment; field aktor, saldo, role, dan status sistem ditetapkan server.
- Batasi ukuran request dan tipe/ukuran file bila lampiran tersedia.

## 4. Integritas keuangan
- Gunakan decimal/numeric, bukan float/double untuk uang.
- Mutasi transaksi dan audit log harus atomik.
- Cegah race condition ketika beberapa pengeluaran dibuat bersamaan.
- Jangan hard-delete transaksi finansial yang sudah digunakan; gunakan void/cancel dengan audit.
- Sediakan rekonsiliasi berkala jika saldo dimaterialisasi.

## 5. Undangan
- Token berentropi tinggi, disimpan sebagai hash, berumur terbatas dan dapat dicabut.
- Jangan menaruh data sensitif di URL undangan.
- Rate limit endpoint accept.
- Hindari token tampil di analytics, referer, atau log.

## 6. Privasi
- Kumpulkan data seminimal mungkin.
- Jelaskan data apa yang terlihat oleh anggota grup.
- Pengguna grup dapat melihat transaksi grup; mereka tidak dapat melihat transaksi pribadi anggota.
- Jangan menyertakan data pribadi yang tidak diperlukan dalam laporan grup.
- Tetapkan kebijakan retensi, ekspor, dan penghapusan akun sesuai kebutuhan hukum yang berlaku.

## 7. Audit dan operasional
- Audit log bersifat append-only bagi pengguna aplikasi biasa.
- Log tidak menyimpan password, token sesi, token undangan mentah, atau data rahasia.
- HTTPS wajib di production.
- Secrets dikelola melalui environment/secret manager.
- Backup dienkripsi dan prosedur restore diuji.
- Lakukan dependency updates, code review, dan pengujian keamanan sebelum rilis.

## 8. Disclaimer produk
Aplikasi MVP hanya mencatat data yang dimasukkan pengguna. Sistem tidak memverifikasi uang tunai, rekening, transfer, atau saldo pihak ketiga. Integrasi keuangan di masa depan memerlukan desain keamanan, kepatuhan, dan persetujuan pengguna yang terpisah.
