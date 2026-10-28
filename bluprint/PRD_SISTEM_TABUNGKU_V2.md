# Product Requirement Document (PRD) — TabungKu v2.0
**Platform Pengelolaan Tabungan Personal & Kas Bersama Terverifikasi**

---

## 1. Executive Summary & Ringkasan Dokumen
Dokumen ini merangkum seluruh spesifikasi fungsional, aturan bisnis, arsitektur data, alur kerja (*business processes*), serta standar antarmuka yang **telah berhasil diimplementasikan dan berjalan aktif (*production-ready*)** pada aplikasi **TabungKu**.

PRD ini berfungsi sebagai acuan resmi bagi *stakeholder*, auditor sistem, pengembang, dan pemilik produk untuk mereview, memvalidasi kepatuhan bisnis, dan mengawal iterasi selanjutnya.

---

## 2. Latar Belakang & Pernyataan Masalah
Pengelolaan keuangan personal sering kali tercampur dengan dana kelompok (seperti kas arisan, patungan liburan, dana darurat keluarga, atau kas organisasi). Praktik manual menggunakan spreadsheet atau aplikasi perpesanan WhatsApp menimbulkan berbagai risiko fatal:
1. **Pencampuran Portofolio (*Portfolio Commingling*)**: Rekening pribadi bercampur aduk dengan dana titipan bersama.
2. **Ketiadaan Kontrol Otorisasi Kolektif**: Pengeluaran dana bersama sering dilakukan sepihak tanpa konfirmasi atau izin anggota lain.
3. **Pencatatan Rentan Manipulasi**: Transaksi salah input dihapus diam-diam tanpa riwayat jejak audit (*audit trail*).
4. **Kesulitan Rekonsiliasi**: Ketiadaan laporan berkala formal standar perbankan (Rekening Koran / CSV terstruktur).

---

## 3. Pilar Arsitektur Bisnis & Prinsip Desain
TabungKu dibangun dengan 4 pilar arsitektur utama:
1. **Strict Portfolio Isolation**: Pemisahan tegas antara saldo personal (`personal_ledgers`) dan saldo kas kelompok (`savings_groups`).
2. **Multi-Signature Governance**: Mekanisme voting/persetujuan berjenjang sebelum transaksi penarikan kas bersama dieksekusi.
3. **Immutable Audit Trail & Void Integrity**: Transaksi tidak dihapus secara fisik (*hard delete*), melainkan dibatalkan melalui status `VOIDED` dengan alasan yang dicatat permanen.
4. **Bank-Grade Export & Reporting**: Ekspor Rekening Koran PDF resmi dan tabel CSV berstandar 15-kolom perbankan internasional.

```mermaid
flowchart TD
    User([Pengguna / Nasabah]) --> Auth[Sistem Autentikasi Supabase]
    Auth --> Dashboard[Portal Dashboard TabungKu]
    
    Dashboard --> ModulPersonal[1. Tabungan Personal]
    Dashboard --> ModulShared[2. Kas Bersama & Patungan]
    Dashboard --> ModulTx[3. Riwayat Transaksi]
    Dashboard --> ModulLaporan[4. Laporan & Ekspor]
    Dashboard --> ModulSetting[5. Pengaturan & Kategori]

    ModulPersonal --> TxPersonal[(Tabel: transactions - Scope: PERSONAL)]
    ModulShared --> MultiSig{Apakah Penarikan Kas?}
    MultiSig -- Ya --> PendingState[Status: PENDING_APPROVAL]
    PendingState --> ApprovalFlow[Voting Anggota / Multi-Sig]
    ApprovalFlow -- Disetujui --> ExecuteTx[Status: ACTIVE]
    MultiSig -- Tidak / Setoran --> ExecuteTx
    ExecuteTx --> TxShared[(Tabel: transactions - Scope: SHARED)]

    TxPersonal --> AuditLog[(Tabel: audit_logs)]
    TxShared --> AuditLog
    ExecuteTx --> VoidAction{Opsi Pembatalan / Void}
    VoidAction --> VoidRecord[Status: VOIDED + Catat Alasan di Audit Log]

    ModulLaporan --> ExportPDF[File Rekening Koran PDF]
    ModulLaporan --> ExportCSV[File CSV Standar 15-Kolom]
```

---

## 4. Analisis Persona & Peran Pengguna (*User Roles*)

| Peran (*Role*) | Lingkup Otoritas | Tanggung Jawab & Hak Akses |
| :--- | :--- | :--- |
| **Pengguna Individu** | Portofolio Personal | Mengelola pemasukan & pengeluaran pribadi, membuat kategori mandiri, mengatur privasi masker saldo, mengunduh laporan mutasi pribadi. |
| **Group Owner (Pembuat Kas)** | Grup Kas Bersama | Membuat grup, menentukan target nominal & batas waktu, mengundang anggota via token invite, menyetujui penarikan, mengatur pembubaran grup. |
| **Group Member (Anggota Kas)** | Grup Kas Bersama | Menyetor dana kontribusi, mengajukan penarikan dana bersama, memberikan voting persetujuan (*approval/rejection*), melihat audit log grup. |
| **System Administrator** | Platform & Database | Mengelola skema PostgreSQL, memantau integritas Row-Level Security (RLS), bypass rate-limit email autentikasi, mengelola seed data. |

---

## 5. Rincian Modul & Alur Bisnis yang Berjalan

### 5.1. Modul Autentikasi & Registrasi Cepat
- **URL**: `/login`, `/register`, `/auth/logout`
- **Fitur & Alur Bisnis**:
  - Pendaftaran mandiri via Server Action (`registerAction`) dengan bypass email rate limit menggunakan `email_confirm: true` dari Admin API.
  - Akun langsung aktif seketika tanpa tertahan limitasi kuota email.
  - Sesi otomatis terbuat dan langsung diarahkan ke `/dashboard`.
  - Halaman login bersih tanpa ketergantungan OAuth Google eksternal, mendukung input email & kata sandi dengan toggle show/hide.
  - Header halaman depan dan login bersifat responsif adaptif terhadap status autentikasi: saat pengguna sudah login, tombol *Masuk/Daftar* otomatis berubah menjadi tombol **Buka Dashboard**.

---

### 5.2. Modul Tabungan Personal (Buku Kas Mandiri)
- **URL**: `/dashboard/personal`
- **Fitur & Alur Bisnis**:
  - **Saldo Bersih**: `Total Pemasukan (ACTIVE) - Total Pengeluaran (ACTIVE) + Saldo Awal`.
  - **Pencatatan Transaksi**:
    - **Pemasukan (`INCOME`)**: Gaji, bonus, investasi, penjualan, hadiah, dsb.
    - **Pengeluaran (`EXPENSE`)**: Belanja, transportasi, makanan, utilitas, kesehatan, dsb.
  - **Manajemen Kategori Kustom**: Pengguna dapat menambah kategori baru khusus kebutuhan personalnya.
  - **Fitur Privasi (Mode Sensor)**: Dukungan *Privacy Masking* untuk menyembunyikan nominal saldo di ruang publik.
  - **Filter Waktu & Kategori**: Filter instan berdasarkan bulan aktif, rentang tanggal kustom, dan jenis kategori.

---

### 5.3. Modul Tabungan Bersama & Multi-Signature Governance
- **URL**: `/dashboard/shared`, `/dashboard/shared/new`, `/invite/[token]`
- **Fitur & Alur Bisnis**:
  - **Pembuatan Grup**: Pemilik menentukan Nama Grup, Deskripsi, Saldo Awal, Target Nominal, Target Tanggal Jatuh Tempo, dan Ambang Batas Persetujuan (*Approval Quorum*).
  - **Sistem Undangan Anggota**:
    - Pembuatan tautan undangan berbasis token unik `/invite/[token]`.
    - Calon anggota yang membuka tautan dapat langsung bergabung ke grup kas.
  - **Kontribusi / Setoran (`CONTRIBUTION`)**:
    - Setiap anggota dapat mencatatkan setoran ke dalam kas bersama.
    - Menghitung persentase progres ketercapaian target grup secara real-time.
  - **Pengajuan Penarikan Kas Bersama**:
    - Penarikan dana bersama **tidak langsung memotong saldo kas**.
    - Transaksi berstatus `PENDING_APPROVAL`.
    - Kartu notifikasi persetujuan muncul pada dashboard anggota yang berwenang.
  - **Multi-Signature Approval Workflow**:
    - Anggota dapat memilih **Setujui (*Approve*)** atau **Tolak (*Reject*)**.
    - Jika kuorum persetujuan tercapai (misal: 2 dari 3 anggota), status berubah menjadi `ACTIVE` dan saldo grup resmi terpotong.
    - Jika ditolak, status berubah menjadi `REJECTED` dan saldo tidak bergerak.

```mermaid
sequenceDiagram
    autonumber
    actor Member as Anggota Pengaju
    participant Sys as Sistem TabungKu
    actor Approver as Anggota Lain (Approver)
    participant DB as Database Supabase

    Member->>Sys: Ajukan Penarikan Dana Kas Bersama
    Sys->>DB: Simpan Transaksi (Status: PENDING_APPROVAL)
    Sys-->>Approver: Munculkan Kartu Pending Approval di Dashboard
    Approver->>Sys: Berikan Konfirmasi (Approve / Reject)
    Sys->>DB: Catat Suara di group_transaction_approvals
    Sys->>DB: Evaluasi Ambang Batas Persetujuan (Quorum)
    alt Kuorum Tercapai (Setuju)
        Sys->>DB: Update Status Transaksi -> ACTIVE
        Sys->>DB: Potong Saldo Kas Bersama & Catat Audit Log
        Sys-->>Member: Notifikasi Penarikan Berhasil Dicairkan
    else Ditolak
        Sys->>DB: Update Status Transaksi -> REJECTED
        Sys-->>Member: Notifikasi Pengajuan Ditolak
    end
```

---

### 5.4. Modul Riwayat Transaksi & Pembatalan (Void Transaction)
- **URL**: `/dashboard/transactions`, `/dashboard/transactions/new`
- **Fitur & Alur Bisnis**:
  - **Tampilan Terpadu Multi-Scope**: Tab filter `Semua Transaksi`, `Tabungan Pribadi`, `Kas Bersama`, dan `Menunggu Persetujuan`.
  - **Aturan Pembatalan Transaksi (*Void Business Rule*)**:
    - Transaksi yang sudah masuk tidak boleh di-*hard delete* dari database demi integritas akuntansi.
    - Tombol **Batalkan (Void)** membuka modal konfirmasi wajib isi alasan pembatalan (*mandatory void reason*).
    - Status transaksi diperbarui menjadi `VOIDED`.
    - Saldo kas otomatis dikembalikan (*recalculated*) seolah transaksi tersebut tidak ada.
    - Riwayat pembatalan, aktor pengubah, dan waktu kejadian dicatat ke tabel `audit_logs`.
  - **Penyimpanan Bukti Nota/Struk Digital**: Opsi unggah dan pratinjau bukti nota (*receipt viewer*) langsung dari tabel transaksi.

---

### 5.5. Modul Laporan & Ekspor Berkas Perbankan
- **URL**: `/dashboard/reports`
- **Fitur & Alur Bisnis**:
  - **1. Ekspor Rekening Koran PDF (`ExportPdfStatementButton`)**:
    - Dokumen berstandar perbankan formal lengkap dengan *header*, nomor dokumen unik, periode cut-off, ringkasan saldo awal, mutasi kredit/debit, saldo akhir, dan tabel mutasi lengkap.
    - Mendukung cetak langsung atau *Save as PDF* dengan CSS `@media print` terisolasi rapi.
  - **2. Ekspor File CSV Standar 15-Kolom (`ExportCsvButton`)**:
    - Dilengkapi deklarasi `sep=,` di baris pertama dan *UTF-8 Byte Order Mark (BOM)* `\uFEFF` sehingga langsung rapi saat dibuka di Microsoft Excel tanpa masalah kolom berantakan.
    - Struktur 15 Kolom Resmi:
      `No, ID Transaksi, Tanggal, Jam, Ruang Lingkup, Nama Grup, Jenis Mutasi, Aliran Dana, Kategori, Nominal (IDR), Status Transaksi, Alasan Void, Dicatat Oleh, Anggota Kontributor, Keterangan`.

---

## 6. Spesifikasi Skema Database PostgreSQL

```mermaid
erDiagram
    profiles ||--o{ personal_ledgers : owns
    profiles ||--o{ savings_group_members : joins
    profiles ||--o{ transactions : creates
    profiles ||--o{ categories : owns
    profiles ||--o{ audit_logs : triggers

    savings_groups ||--o{ savings_group_members : contains
    savings_groups ||--o{ transactions : logs
    savings_groups ||--o{ audit_logs : tracks
    savings_groups ||--o{ group_invitations : generates

    transactions ||--o{ group_transaction_approvals : requires
    personal_ledgers ||--o{ transactions : records

    profiles {
        uuid id PK
        string email
        string name
        timestamp created_at
        timestamp updated_at
    }

    savings_groups {
        uuid id PK
        string name
        string description
        numeric opening_balance
        numeric target_amount
        date target_date
        uuid created_by
        timestamp created_at
    }

    savings_group_members {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        string role
        string status
        timestamp joined_at
    }

    transactions {
        uuid id PK
        string scope_type
        string transaction_type
        numeric amount
        timestamp transaction_date
        string description
        uuid group_id FK
        uuid personal_ledger_id FK
        uuid created_by_user_id FK
        uuid contributor_user_id FK
        string category_name
        string status
        string void_reason
        string receipt_url
        string payment_method
    }

    audit_logs {
        uuid id PK
        uuid group_id FK
        uuid actor_user_id FK
        string entity_type
        string action
        jsonb before_data
        jsonb after_data
        string reason
        timestamp created_at
    }
```

---

## 7. Keamanan & Kepatuhan (*Security & Compliance*)
1. **Row-Level Security (RLS)**:
   - Setiap baris transaksi pribadi diisolasi penuh: *User A* tidak dapat membaca baris *User B*.
   - Transaksi kas bersama hanya dapat dibaca oleh pengguna yang terdaftar di `savings_group_members` dengan status `ACTIVE`.
2. **Sanitisasi & Anti-Injection**:
   - Seluruh mutasi divalidasi tipe data numeriknya sebelum dieksekusi.
   - Menggunakan Supabase parameterized queries & Postgres constraint triggers.
3. **Penyensoran Privasi di Sisi Klien**:
   - Fitur sensor angka (`MaskableText`) menggunakan enkapsulasi React Context, memastikan saldo tidak tertangkap kamera saat berada di tempat umum.

---

## 8. Ringkasan Status Rilis Fitur (*Feature Delivery Matrix*)

| ID Fitur | Modul Sistem | Status Implementasi | Verifikasi Teknis |
| :---: | :--- | :---: | :--- |
| **F-01** | Landing Page Editorial Catetrek | ✅ Selesai | Responsif, Dark/Light mode adaptif, glassmorphic header |
| **F-02** | Autentikasi Mandiri & Auto-Confirm | ✅ Selesai | Bypass rate limit email Supabase, auto login session |
| **F-03** | Isolasi Buku Kas Personal | ✅ Selesai | Form modal pemasukan/pengeluaran, kategori kustom |
| **F-04** | Grup Kas Bersama & Progres Bar | ✅ Selesai | Perhitungan persentase target, status siklus bulanan |
| **F-05** | Multi-Signature Approval Workflow | ✅ Selesai | Status `PENDING_APPROVAL`, kartu konfirmasi persetujuan |
| **F-06** | Pembatalan Transaksi (Void) & Audit Log | ✅ Selesai | Status `VOIDED`, pencatatan alasan, audit_logs sinkron |
| **F-07** | Ekspor Rekening Koran PDF | ✅ Selesai | Format resmi cetak perbankan |
| **F-08** | Ekspor Laporan CSV 15-Kolom | ✅ Selesai | Header `sep=,`, UTF-8 BOM, kompatibel Microsoft Excel |
| **F-09** | Navigasi Bawah Mobile (*Safe Area*) | ✅ Selesai | `max(0.5rem, safe-area-inset-bottom)`, posisi rapat bawah |
| **F-10** | Toggle Tema Gelap/Terang Kompak | ✅ Selesai | Tombol ikon melingkar serasi di desktop & mobile |

---
*Dokumen ini diperbarui secara otomatis sesuai dengan kode sumber aktif di cabang `main` repository TabungKu.*

