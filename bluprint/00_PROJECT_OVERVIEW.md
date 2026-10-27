# PRD — Website Tabungan Pribadi dan Tabungan Bersama

## 1. Ringkasan
Produk ini adalah aplikasi pencatatan keuangan yang menyediakan dua ruang terpisah: **Tabungan Pribadi** untuk mencatat pemasukan/pengeluaran personal dan **Tabungan Bersama** untuk mencatat transaksi kelompok secara transparan.

Pengguna dapat membuat tabungan bersama atau bergabung melalui undangan. Anggota yang sudah menjadi bagian dari suatu tabungan bersama dapat mencatat setoran dan pengeluaran serta melihat saldo dan riwayat transaksi tanpa persetujuan bendahara atau admin.

## 2. Tujuan produk
- Membantu pengguna memahami arus kas pribadi.
- Memungkinkan dua orang atau lebih mencatat tabungan bersama.
- Menjaga transaksi bersama transparan bagi anggota.
- Memisahkan saldo pribadi dari saldo catatan kelompok.
- Menyediakan fondasi yang dapat dikembangkan ke integrasi pembayaran pada fase berikutnya.

## 3. Prinsip produk
1. **Pencatatan, bukan kustodi dana:** MVP mencatat transaksi; tidak menyimpan, memindahkan, atau menjamin keberadaan uang secara fisik.
2. **Pemisahan ruang keuangan:** transaksi pribadi tidak mengubah saldo bersama dan sebaliknya.
3. **Tanpa approval transaksi:** transaksi setoran/pengeluaran bersama tidak memerlukan persetujuan admin atau bendahara.
4. **Transparansi kelompok:** anggota aktif dapat melihat saldo, transaksi, dan ringkasan kontribusi bersama.
5. **Jejak audit:** perubahan atau pembatalan transaksi harus meninggalkan jejak audit.
6. **Akses berbasis keanggotaan:** pengguna hanya dapat mengakses ruang pribadi miliknya dan grup yang diikutinya.

## 4. Pengguna sasaran
- Individu yang ingin mencatat pemasukan dan pengeluaran.
- Pasangan, teman, keluarga, atau rekan yang ingin mencatat dana bersama.
- Pengguna yang membutuhkan transparansi kontribusi dan pengeluaran kelompok.

## 5. Batas MVP
Termasuk:
- Registrasi/login.
- Dashboard pribadi.
- CRUD transaksi pribadi.
- Pembuatan tabungan bersama dan undangan anggota.
- Pencatatan setoran dan pengeluaran bersama tanpa approval.
- Riwayat transaksi, saldo, ringkasan kontribusi, dan laporan dasar.
- Audit log untuk perubahan transaksi.

Belum termasuk:
- Integrasi bank, e-wallet, payment gateway, atau open banking.
- Transfer uang nyata antar pengguna.
- Verifikasi otomatis bukti transfer.
- Persetujuan transaksi bertingkat.
- Akuntansi, pajak, atau laporan keuangan formal.
- Fitur investasi, bunga, pinjaman, atau pengelolaan dana pihak ketiga.

## 6. Stack teknologi
- Frontend: Next.js.
- Backend API: Express.js.
- Database relasional: PostgreSQL direkomendasikan.
- Autentikasi: sesi aman atau token dengan strategi refresh yang dirancang secara eksplisit.
- Penyimpanan bukti transaksi (opsional fase MVP): object storage privat dengan akses terbatas.

## 7. Dokumen terkait
- `01_BUSINESS_REQUIREMENTS.md`
- `02_PRODUCT_REQUIREMENTS.md`
- `03_USER_STORIES_ACCEPTANCE_CRITERIA.md`
- `04_BUSINESS_RULES.md`
- `05_SYSTEM_ARCHITECTURE.md`
- `06_DATABASE_DESIGN.md`
- `07_API_SPECIFICATION.md`
- `08_UI_UX_GUIDELINES.md`
- `09_SECURITY_AND_PRIVACY.md`
- `10_MVP_ROADMAP_AND_TESTING.md`
