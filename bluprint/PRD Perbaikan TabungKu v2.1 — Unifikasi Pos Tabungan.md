# PRD Perbaikan TabungKu v2.1 — Unifikasi Pos Tabungan

**Status:** Draft untuk review | **Basis:** PRD TabungKu v2.0 | **Cakupan:** Penyatuan Tabungan Personal dan Tabungan Bersama

---

## 1. Ringkasan

Pada v2.0, Tabungan Personal dan Kas Bersama dibangun sebagai dua modul terpisah dengan kemampuan yang tidak setara: kas bersama punya target nominal, tenggat, dan progres, sedangkan tabungan personal tidak. Dokumen ini mendefinisikan perbaikan untuk menyatukan keduanya ke dalam satu konsep, yaitu **Pos Tabungan** (*Savings Pot*), sehingga personal dan bersama memiliki kemampuan setara. Perbedaan hanya ada pada lapisan "banyak orang" (keanggotaan, undangan, persetujuan multi-signature).

Dokumen ini **hanya membahas refactor konsep dan penyetaraan fitur yang sudah ada**. Fitur baru (transaksi berulang, status iuran, notifikasi, proyeksi, dan sebagainya) sengaja ditunda ke dokumen terpisah.

## 2. Latar Belakang & Masalah

| No | Masalah di v2.0 | Dampak |
| :-: | :-- | :-- |
| 1 | Target dan tenggat hanya ada di `savings_groups`. | Pengguna personal tidak bisa menetapkan tujuan menabung. Kas bersama tanpa target (misal kas RT) dipaksa punya target. |
| 2 | Pengguna hanya punya satu buku kas personal (`personal_ledgers`). | Tidak bisa memisahkan tujuan seperti Dana Darurat, Laptop, dan Liburan. |
| 3 | Transaksi menunjuk `group_id` atau `personal_ledger_id` yang saling eksklusif. | Rawan inkonsistensi data; kueri, RLS, laporan, dan audit harus bercabang. |
| 4 | Dua modul, dua halaman, logika UI terduplikasi. | Biaya pemeliharaan tinggi; fitur baru harus dibuat dua kali. |
| 5 | Tabel pendukung (`group_transaction_approvals`, `categories`, `group_invitations`) dan kolom `approval_quorum` tidak terdefinisi di skema PRD v2.0. | Spesifikasi tidak lengkap untuk audit dan pengembangan. |

## 3. Tujuan & Non-Tujuan

### 3.1 Tujuan

1. Satu entitas **Pos Tabungan** untuk personal dan bersama, dengan atribut dan kemampuan yang sama.
2. Target nominal dan tanggal target bersifat **opsional** di semua pos.
3. Pengguna dapat memiliki **banyak pos personal**.
4. Satu jalur data, RLS, audit, dan laporan untuk semua pos.
5. Governance multi-signature tetap berlaku, aktif hanya untuk pos bersama.
6. Migrasi data v2.0 ke v2.1 **tanpa selisih saldo**.

### 3.2 Non-Tujuan (Ditunda)

- Transaksi berulang dan setoran terjadwal
- Status iuran anggota dan pengingat
- Modul notifikasi
- Proyeksi target
- Transfer antar pos, budgeting, peran tambahan (Bendahara/Auditor)
- Tutup buku, pembubaran dan pembagian dana, impor mutasi, OCR

Aturan baru yang muncul dari kebutuhan refactor (misalnya konversi pos) dicatat sebagai pertanyaan terbuka, bukan fitur.

## 4. Prinsip Desain

1. **Saldo terisolasi per pos.** Pencampuran dana tetap mustahil karena saldo selalu dihitung per `pot_id`.
2. **Kemampuan setara, governance berbeda.** Target, progres, kategori, filter, void, dan ekspor sama untuk semua pos. Multi-sig hanya untuk pos bersama.
3. **Satu pemilik minimal.** Pos personal diperlakukan sebagai pos dengan satu anggota (owner), sehingga RLS dan laporan memakai satu jalur.
4. **Audit trail tidak berubah.** Tidak ada *hard delete*; pembatalan lewat `VOIDED` dengan alasan wajib.
5. **Komponen UI dipakai ulang.** Satu komponen progres, form transaksi, dan laporan untuk semua tipe pos.

## 5. Model Konsep

```
Pos Tabungan (savings_pots)
 ├─ Atribut umum  : nama, deskripsi, saldo awal, target nominal (opsional),
 │                  tanggal target (opsional), status
 ├─ Tipe PERSONAL : 1 anggota (owner), tanpa multi-sig, tanpa undangan
 └─ Tipe SHARED   : >=1 anggota, undangan token, kuorum persetujuan penarikan
```

| Kemampuan | PERSONAL | SHARED |
| :-- | :-: | :-: |
| Nama, deskripsi, saldo awal | ✅ | ✅ |
| Target nominal & tanggal (opsional) | ✅ | ✅ |
| Progres target | ✅ | ✅ |
| Kategori kustom | ✅ | ✅ |
| Filter waktu & kategori | ✅ | ✅ |
| Void + audit log | ✅ | ✅ |
| Bukti nota digital | ✅ | ✅ |
| Ekspor PDF & CSV | ✅ | ✅ |
| Mode sensor saldo | ✅ | ✅ |
| Undangan anggota | ❌ | ✅ |
| Multi-signature penarikan | ❌ | ✅ |
| Atribusi kontributor | ❌ (otomatis owner) | ✅ |

## 6. Peran Pengguna

| Peran | Lingkup | Hak Akses |
| :-- | :-- | :-- |
| **Pengguna** | Semua pos miliknya | Membuat, mengubah, dan menutup pos personal; mencatat transaksi; mengunduh laporan. |
| **Owner Pos Bersama** | Pos SHARED | Semua hak pengguna, plus mengelola undangan, mengatur kuorum, dan menetapkan target. |
| **Member Pos Bersama** | Pos SHARED | Menyetor, mengajukan penarikan, memberi suara, melihat audit log pos. |
| **System Administrator** | Platform | Mengelola skema, RLS, dan migrasi. |

## 7. Kebutuhan Fungsional

### 7.1 Manajemen Pos

| ID | Kebutuhan | Prioritas |
| :-: | :-- | :-: |
| FR-01 | Pengguna dapat membuat pos dengan memilih tipe PERSONAL atau SHARED. | Wajib |
| FR-02 | Field pos: nama (wajib), deskripsi, saldo awal (default 0), target nominal (opsional), tanggal target (opsional). | Wajib |
| FR-03 | Target nominal harus > 0 jika diisi. Tanggal target tidak boleh di masa lalu saat pembuatan. | Wajib |
| FR-04 | Pengguna dapat memiliki jumlah pos personal tanpa batas keras (batas teknis dapat ditetapkan kemudian). | Wajib |
| FR-05 | Halaman daftar pos menampilkan seluruh pos pengguna dengan tab filter: Semua, Personal, Bersama. Setiap kartu menampilkan nama, saldo, dan progres jika target ada. | Wajib |
| FR-06 | Pos tanpa target tidak menampilkan progress bar; yang tampil hanya saldo dan arus bulan berjalan. | Wajib |
| FR-07 | Owner dapat mengubah nama, deskripsi, target, dan tanggal target. Perubahan dicatat di audit log. | Wajib |
| FR-08 | Pos dapat diarsipkan (status `ARCHIVED`) jika saldo = 0. Pos terarsip bersifat baca-saja dan tetap bisa diekspor. Tidak ada penghapusan fisik. | Wajib |

### 7.2 Transaksi

| ID | Kebutuhan | Prioritas |
| :-: | :-- | :-: |
| FR-09 | Setiap transaksi wajib menunjuk tepat satu `pot_id`. | Wajib |
| FR-10 | Jenis transaksi: `INCOME`, `EXPENSE` untuk semua pos; `CONTRIBUTION` untuk pos SHARED. Pada pos PERSONAL, setoran dicatat sebagai `INCOME`. | Wajib |
| FR-11 | Pada pos PERSONAL, transaksi langsung berstatus `ACTIVE` tanpa persetujuan. | Wajib |
| FR-12 | Pada pos SHARED, setoran langsung `ACTIVE`; penarikan (`EXPENSE`) berstatus `PENDING_APPROVAL`. | Wajib |
| FR-13 | Void tersedia untuk semua pos dengan alasan wajib; saldo dihitung ulang dan audit log tercatat. | Wajib |
| FR-14 | Halaman riwayat transaksi memakai filter: Semua, per pos, tipe pos (Personal/Bersama), dan Menunggu Persetujuan. | Wajib |
| FR-15 | Unggah dan pratinjau bukti nota tersedia di semua pos. | Wajib |

### 7.3 Pos Bersama (Governance)

| ID | Kebutuhan | Prioritas |
| :-: | :-- | :-: |
| FR-16 | Pos SHARED memiliki `approval_quorum` (jumlah suara setuju minimum, bilangan bulat >= 1 dan <= jumlah anggota aktif). | Wajib |
| FR-17 | Tautan undangan berbasis token unik; token memiliki masa berlaku dan dapat dicabut oleh owner. | Wajib |
| FR-18 | Anggota dapat Approve atau Reject penarikan; setiap anggota hanya satu suara per transaksi. | Wajib |
| FR-19 | Jika suara setuju >= kuorum, status menjadi `ACTIVE`. Jika suara tidak mungkin lagi mencapai kuorum, status menjadi `REJECTED`. | Wajib |
| FR-20 | Pos SHARED dengan hanya satu anggota aktif diperlakukan tanpa multi-sig (penarikan langsung `ACTIVE`) sampai anggota kedua bergabung. Perilaku ini harus eksplisit di UI. | Wajib |
| FR-21 | Perubahan kuorum tidak berlaku surut pada transaksi yang sedang `PENDING_APPROVAL`. | Wajib |

### 7.4 Laporan & Ekspor

| ID | Kebutuhan | Prioritas |
| :-: | :-- | :-: |
| FR-22 | Ekspor Rekening Koran PDF dapat dibuat per pos, atau gabungan semua pos dengan ringkasan per pos. | Wajib |
| FR-23 | CSV tetap 15 kolom dengan `sep=,` dan BOM UTF-8. Kolom "Ruang Lingkup" diisi `PERSONAL` atau `SHARED`; kolom "Nama Grup" diganti **"Nama Pos"** dan selalu terisi. | Wajib |
| FR-24 | Pada ekspor pos PERSONAL, kolom "Anggota Kontributor" diisi nama owner. | Wajib |
| FR-25 | Laporan pos bertarget menampilkan ringkasan progres (terkumpul, sisa, persentase) pada periode cut-off. | Disarankan |

## 8. Aturan Bisnis

| ID | Aturan |
| :-: | :-- |
| BR-01 | Saldo pos = saldo awal + total `INCOME`/`CONTRIBUTION` berstatus `ACTIVE` − total `EXPENSE` berstatus `ACTIVE`. Status `PENDING_APPROVAL`, `REJECTED`, `VOIDED` tidak dihitung. |
| BR-02 | Progres = saldo ÷ target nominal, ditampilkan maksimum 100% pada bar dan dapat melebihi 100% pada teks. Hanya dihitung jika target ada. |
| BR-03 | Pengeluaran yang membuat saldo pos menjadi negatif ditolak. Pada pos SHARED, validasi dilakukan saat pengajuan dan diulang saat eksekusi. |
| BR-04 | Tipe pos (PERSONAL/SHARED) tidak dapat diubah setelah transaksi pertama dicatat, sampai aturan konversi disepakati (lihat pertanyaan terbuka). |
| BR-05 | Void pada pos SHARED hanya boleh dilakukan owner atau pembuat transaksi. Void atas penarikan yang sudah `ACTIVE` mencatat alasan dan mengembalikan saldo. |
| BR-06 | Pembuat pengajuan penarikan tidak boleh memberi suara untuk pengajuannya sendiri, kecuali pos hanya punya satu anggota aktif. |
| BR-07 | Setiap perubahan atribut pos, keanggotaan, kuorum, transaksi, dan void menghasilkan baris `audit_logs` dengan `pot_id`. |
| BR-08 | Kategori bersifat milik pengguna untuk pos personal; untuk pos SHARED, kategori terikat pada pos dan dikelola owner. |

## 9. Spesifikasi Data

### 9.1 Skema Baru

```
savings_pots
  id uuid PK
  type text CHECK (PERSONAL | SHARED)
  name text NOT NULL
  description text
  opening_balance numeric(18,2) NOT NULL DEFAULT 0
  target_amount numeric(18,2) NULL CHECK (target_amount > 0)
  target_date date NULL
  approval_quorum int NULL        -- wajib untuk SHARED, NULL untuk PERSONAL
  status text DEFAULT 'ACTIVE'    -- ACTIVE | ARCHIVED
  created_by uuid FK profiles
  created_at, updated_at timestamptz

pot_members
  id uuid PK
  pot_id FK, user_id FK
  role text      -- OWNER | MEMBER
  status text    -- ACTIVE | INVITED | LEFT | REMOVED
  joined_at timestamptz
  UNIQUE (pot_id, user_id)

pot_invitations
  id uuid PK, pot_id FK, token text UNIQUE,
  created_by FK, expires_at, revoked_at, max_uses (opsional)

transactions
  id uuid PK
  pot_id uuid FK NOT NULL
  transaction_type text   -- INCOME | EXPENSE | CONTRIBUTION
  amount numeric(18,2) CHECK (amount > 0)
  transaction_date timestamptz
  description text
  category_id FK / category_name
  status text  -- ACTIVE | PENDING_APPROVAL | REJECTED | VOIDED
  void_reason text, receipt_url text, payment_method text
  created_by_user_id FK, contributor_user_id FK

transaction_approvals
  id uuid PK, transaction_id FK, voter_user_id FK,
  decision text (APPROVE | REJECT), created_at
  UNIQUE (transaction_id, voter_user_id)

categories
  id uuid PK, owner_user_id FK NULL, pot_id FK NULL,
  name text, kind (INCOME | EXPENSE)

audit_logs
  id uuid PK, pot_id FK, actor_user_id FK,
  entity_type, entity_id, action,
  before_data jsonb, after_data jsonb, reason, created_at
```

**Constraint penting:**

- `approval_quorum` NOT NULL jika `type = 'SHARED'`.
- Setiap pos PERSONAL harus memiliki tepat satu `pot_members` berperan OWNER (dijaga trigger).
- Tabel lama `personal_ledgers`, `savings_groups`, `savings_group_members`, `group_invitations`, `group_transaction_approvals` dipertahankan **read-only** selama masa transisi, lalu dihapus setelah verifikasi.

### 9.2 Kebijakan RLS

| Tabel | Baca | Tulis |
| :-- | :-- | :-- |
| `savings_pots` | Anggota dengan status `ACTIVE` | Owner (ubah atribut); pembuatan oleh pengguna terautentikasi |
| `pot_members` | Anggota aktif pos yang sama | Owner (kelola anggota); pengguna sendiri (keluar/bergabung via token valid) |
| `transactions` | Anggota aktif pos | Anggota aktif; status akhir hanya diubah lewat fungsi server (bukan klien langsung) |
| `transaction_approvals` | Anggota aktif pos | Anggota aktif, bukan pengaju, satu suara |
| `audit_logs` | Anggota aktif pos | Hanya fungsi server; tidak ada UPDATE/DELETE |

Satu helper `is_active_member(pot_id)` dipakai di semua kebijakan agar tidak ada percabangan logika personal vs bersama.

## 10. Navigasi & Antarmuka

| v2.0 | v2.1 |
| :-- | :-- |
| `/dashboard/personal` | `/dashboard/pots?type=personal` |
| `/dashboard/shared` | `/dashboard/pots?type=shared` |
| `/dashboard/shared/new` | `/dashboard/pots/new` (pilihan tipe di langkah pertama) |
| — | `/dashboard/pots/[id]` (detail pos: saldo, progres, transaksi, anggota jika SHARED) |
| `/invite/[token]` | Tetap |
| `/dashboard/transactions`, `/dashboard/reports` | Tetap, dengan filter per pos |

URL lama dialihkan (redirect 301) ke URL baru. Komponen yang dipakai ulang: kartu pos, progress bar, form transaksi, tabel riwayat, tombol ekspor. Bagian anggota dan kartu persetujuan hanya dirender untuk pos SHARED.

## 11. Migrasi Data

1. **Pemetaan:**
   - Setiap `personal_ledgers` → satu `savings_pots` (PERSONAL) + satu `pot_members` OWNER.
   - Setiap `savings_groups` → satu `savings_pots` (SHARED); target, tanggal, saldo awal, dan kuorum dibawa apa adanya.
   - `savings_group_members` → `pot_members`; `group_invitations` → `pot_invitations`; `group_transaction_approvals` → `transaction_approvals`.
2. **Transaksi:** isi `pot_id` dari `group_id` atau `personal_ledger_id` lama. Status, alasan void, dan jejak audit dibawa utuh.
3. **Audit log:** isi `pot_id`; tidak ada baris yang dihapus atau diubah isinya.
4. **Verifikasi (gerbang rilis):**
   - Saldo per pengguna dan per grup sebelum = sesudah (selisih harus 0).
   - Jumlah transaksi per status sebelum = sesudah.
   - Tidak ada transaksi dengan `pot_id` NULL.
   - Uji RLS: pengguna A tidak bisa membaca pos pengguna B.
5. **Eksekusi:** jalankan di staging dengan salinan data produksi, simpan laporan rekonsiliasi, baru lakukan di produksi pada jendela pemeliharaan dengan cadangan penuh dan rencana rollback.

## 12. Kebutuhan Non-Fungsional

| Aspek | Target |
| :-- | :-- |
| Integritas | Semua mutasi saldo dan perubahan status dalam satu transaksi database (atomik). |
| Keamanan | Perubahan status transaksi hanya lewat fungsi server tervalidasi; validasi nominal numerik tetap berlaku. |
| Performa | Halaman daftar pos < 2 detik untuk pengguna dengan 50 pos dan 10.000 transaksi. |
| Kompatibilitas | CSV tetap terbuka rapi di Microsoft Excel; PDF tetap berformat cetak perbankan. |
| Aksesibilitas | Mode sensor, mode gelap/terang, dan navigasi mobile (safe area) berlaku di semua halaman pos. |
| Observabilitas | Kegagalan migrasi dan penolakan RLS tercatat di log. |

## 13. Kriteria Penerimaan

1. Pengguna membuat pos personal "Dana Darurat" dengan target Rp30.000.000 dan melihat progress bar berubah setelah setoran.
2. Pengguna membuat pos personal tanpa target; progress bar tidak tampil dan tidak ada error.
3. Pengguna membuat pos bersama tanpa target dan kuorum 2; penarikan tetap melalui `PENDING_APPROVAL`.
4. Pengguna memiliki lebih dari satu pos personal dengan saldo yang saling independen.
5. Void pada pos personal dan bersama menghasilkan status `VOIDED`, saldo terkoreksi, dan baris audit log lengkap dengan alasan.
6. Pengaju tidak dapat menyetujui penarikannya sendiri pada pos dengan lebih dari satu anggota.
7. CSV dari pos personal dan bersama sama-sama 15 kolom; kolom "Nama Pos" terisi.
8. Setelah migrasi, selisih saldo seluruh pos = 0 dan tidak ada `pot_id` NULL.
9. Pengguna A tidak dapat membaca atau menulis pos pengguna B melalui API langsung.
10. URL lama (`/dashboard/personal`, `/dashboard/shared`) mengalihkan ke halaman baru.

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| :-- | :-- | :-- |
| Selisih saldo saat migrasi | Tinggi | Rekonsiliasi otomatis di staging, gerbang rilis, cadangan, rollback |
| Kebocoran data akibat RLS baru | Tinggi | Uji RLS lintas pengguna otomatis sebelum rilis |
| Pengguna bingung dengan istilah baru | Sedang | Label "Pos Personal" dan "Pos Bersama", teks bantuan singkat saat onboarding |
| Regresi ekspor laporan | Sedang | Uji snapshot PDF dan CSV sebelum vs sesudah migrasi |
| Tabel lama masih diakses kode lama | Sedang | Jadikan read-only, cari referensi tersisa, hapus setelah satu siklus rilis |

## 15. Rencana Pengerjaan

| Tahap | Isi | Keluaran |
| :-: | :-- | :-- |
| 1 | Finalisasi PRD dan keputusan pertanyaan terbuka | PRD v2.1 disetujui |
| 2 | Skema baru, fungsi server, RLS, skrip migrasi | Migrasi lulus di staging |
| 3 | Refactor UI ke komponen pos tunggal dan redirect URL | Halaman `/dashboard/pots` berfungsi |
| 4 | Penyesuaian laporan PDF/CSV | Uji paritas ekspor lulus |
| 5 | Uji menyeluruh, migrasi produksi, pemantauan | Rilis v2.1 |

## 16. Pertanyaan Terbuka (Perlu Keputusan)

1. **Konversi pos:** bolehkah pos personal diubah menjadi bersama? Jika ya, saldo yang ada dianggap kontribusi owner?
2. **Kuorum:** apakah dihitung dari jumlah anggota aktif saat pengajuan atau saat voting? Bagaimana jika anggota keluar saat transaksi pending?
3. **Kedaluwarsa pengajuan:** apakah `PENDING_APPROVAL` perlu masa berlaku di rilis ini, atau ditunda bersama fitur baru?
4. **Void di pos bersama:** apakah void atas penarikan yang sudah disetujui perlu persetujuan multi-sig juga?
5. **Batas jumlah pos personal** per pengguna, jika ada.
6. **Pos terarsip:** bolehkah dibuka kembali (unarchive)?
7. **Penyimpanan bukti nota:** bucket privat dengan URL bertanda tangan atau publik?

---

*Dokumen ini adalah draft perbaikan atas PRD TabungKu v2.0 dan belum mencakup fitur baru yang masih dalam pertimbangan.*
