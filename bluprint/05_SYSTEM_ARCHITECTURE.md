# System Architecture

## 1. Arsitektur logis
- **Next.js:** UI, navigasi, form, dashboard, validasi sisi klien untuk kenyamanan.
- **Express.js:** REST API, autentikasi/otorisasi, validasi otoritatif, logika bisnis.
- **PostgreSQL:** data pengguna, grup, keanggotaan, transaksi, undangan, dan audit log.
- **Object storage privat (opsional):** lampiran bukti transaksi; akses via URL bertanda tangan berumur pendek.
- **Email service (opsional MVP):** pengiriman undangan dan notifikasi.

Frontend tidak boleh menjadi sumber kebenaran saldo atau otorisasi. Semua aturan penting harus divalidasi di backend.

## 2. Domain
- Identity & Access
- Personal Ledger
- Shared Savings Groups
- Transactions
- Invitations & Membership
- Reports
- Audit & Notifications

## 3. Prinsip backend
- Pisahkan route, controller, service, repository/data access, dan schema validation.
- Middleware autentikasi memverifikasi identitas.
- Middleware/layanan otorisasi memeriksa kepemilikan data dan keanggotaan grup.
- Perhitungan saldo dilakukan berdasarkan transaksi aktif atau melalui materialisasi yang dijaga konsistensinya.
- Mutasi transaksi dan audit log dilakukan dalam satu database transaction.
- Idempotency key dapat digunakan untuk mencegah duplikasi akibat retry.

## 4. Konsistensi transaksi
Untuk membuat transaksi bersama:
1. Autentikasi pengguna.
2. Pastikan keanggotaan aktif.
3. Validasi jenis transaksi, nominal, kategori, dan tanggal.
4. Mulai transaksi database.
5. Kunci baris saldo/buku atau gunakan strategi isolasi yang tepat.
6. Validasi aturan saldo negatif.
7. Simpan transaksi dan audit log.
8. Commit.
9. Kembalikan saldo baru dan transaksi yang tersimpan.

Jika saldo selalu dihitung dari ledger, hindari menyimpan saldo terpisah tanpa strategi rekonsiliasi. Jika saldo ter-cache/materialized, update ledger dan saldo harus atomik.

## 5. Deployment dan lingkungan
- Pisahkan environment development, staging, dan production.
- Rahasia konfigurasi hanya disimpan pada environment secrets, bukan repository.
- Gunakan HTTPS di production.
- Terapkan migrasi database yang dapat ditinjau dan di-rollback sesuai strategi.
- Atur backup berkala dan uji pemulihan.

## 6. Observability
- Log request ID, status, durasi, dan error teknis tanpa mencatat password/token.
- Pantau error API, latensi, kegagalan login, dan percobaan akses lintas grup.
- Gunakan audit log terpisah dari log operasional.
