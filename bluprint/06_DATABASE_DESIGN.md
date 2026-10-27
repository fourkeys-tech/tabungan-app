# Database Design

Rancangan konseptual untuk PostgreSQL. Nama kolom dapat disesuaikan saat implementasi.

## 1. `users`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(120) | Nama tampilan |
| email | VARCHAR(255) | Unique, bila email menjadi identitas |
| password_hash | TEXT | Hash password |
| created_at | TIMESTAMPTZ | Waktu dibuat |
| updated_at | TIMESTAMPTZ | Waktu diubah |
| deleted_at | TIMESTAMPTZ nullable | Soft delete opsional |

## 2. `personal_ledgers`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users, unique untuk satu buku utama |
| name | VARCHAR(120) | Mis. Keuangan Pribadi |
| currency | CHAR(3) | Default IDR |
| opening_balance | NUMERIC(18,2) | Default 0 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## 3. `savings_groups`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(120) | Nama grup |
| description | TEXT nullable | Keterangan |
| owner_user_id | UUID | FK users |
| currency | CHAR(3) | Default IDR |
| opening_balance | NUMERIC(18,2) | Default 0 |
| target_amount | NUMERIC(18,2) nullable | Opsional |
| target_date | DATE nullable | Opsional |
| status | VARCHAR(20) | ACTIVE/ARCHIVED |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## 4. `savings_group_members`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| group_id | UUID | FK savings_groups |
| user_id | UUID | FK users |
| role | VARCHAR(20) | OWNER/MEMBER |
| status | VARCHAR(20) | ACTIVE/LEFT/REMOVED |
| joined_at | TIMESTAMPTZ nullable | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Constraint: unique (`group_id`, `user_id`). Status invited sebaiknya direpresentasikan oleh tabel invitations sampai undangan diterima.

## 5. `transactions`
Satu tabel ledger dapat menampung transaksi pribadi dan bersama, dengan batasan agar hanya satu konteks yang terisi.

| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| scope_type | VARCHAR(20) | PERSONAL/SHARED |
| personal_ledger_id | UUID nullable | FK personal_ledgers |
| group_id | UUID nullable | FK savings_groups |
| created_by_user_id | UUID | FK users |
| contributor_user_id | UUID nullable | Anggota yang diatribusikan sebagai penyetor |
| transaction_type | VARCHAR(20) | INCOME/EXPENSE/CONTRIBUTION |
| amount | NUMERIC(18,2) | Selalu > 0 |
| category_id | UUID nullable | FK categories |
| transaction_date | DATE | Tanggal transaksi |
| description | TEXT nullable | |
| status | VARCHAR(20) | ACTIVE/VOIDED |
| void_reason | TEXT nullable | Wajib bila VOIDED |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Constraint yang disarankan:
- Untuk `PERSONAL`, `personal_ledger_id` wajib dan `group_id` harus null.
- Untuk `SHARED`, `group_id` wajib dan `personal_ledger_id` harus null.
- `amount > 0`.
- Tipe transaksi valid sesuai scope.
- Indeks pada (`group_id`, `transaction_date`), (`personal_ledger_id`, `transaction_date`), (`created_by_user_id`, `created_at`).

## 6. `categories`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| owner_user_id | UUID nullable | Null untuk kategori sistem |
| group_id | UUID nullable | Kategori khusus grup opsional |
| name | VARCHAR(80) | |
| scope_type | VARCHAR(20) | PERSONAL/SHARED/BOTH |
| transaction_type | VARCHAR(20) nullable | Pembatas kategori opsional |
| created_at | TIMESTAMPTZ | |

## 7. `invitations`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| group_id | UUID | FK savings_groups |
| invited_email | VARCHAR(255) nullable | Bila undangan berbasis email |
| token_hash | TEXT | Simpan hash token, bukan token mentah |
| created_by_user_id | UUID | FK users |
| status | VARCHAR(20) | PENDING/ACCEPTED/REVOKED/EXPIRED |
| expires_at | TIMESTAMPTZ | |
| accepted_by_user_id | UUID nullable | FK users |
| accepted_at | TIMESTAMPTZ nullable | |
| created_at | TIMESTAMPTZ | |

## 8. `audit_logs`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | UUID | PK |
| actor_user_id | UUID nullable | FK users |
| group_id | UUID nullable | Grup terkait |
| entity_type | VARCHAR(50) | |
| entity_id | UUID | ID entitas |
| action | VARCHAR(50) | CREATE/UPDATE/VOID/INVITE/REMOVE_MEMBER |
| before_data | JSONB nullable | Hindari data sensitif |
| after_data | JSONB nullable | Hindari data sensitif |
| reason | TEXT nullable | Alasan koreksi/void |
| request_id | VARCHAR(100) nullable | Korelasi request |
| created_at | TIMESTAMPTZ | |

## 9. Relasi utama
- User 1:1 Personal Ledger.
- User M:N Savings Group melalui Savings Group Members.
- Savings Group 1:N Transactions.
- Personal Ledger 1:N Transactions.
- Savings Group 1:N Invitations.
- Transaksi 1:N Audit Logs secara konseptual melalui entity type/id.

## 10. Keputusan yang perlu dikonfirmasi sebelum implementasi
- Apakah transaksi pribadi boleh dihapus atau hanya dibatalkan.
- Apakah semua anggota dapat mengedit transaksi anggota lain (rekomendasi: tidak).
- Apakah saldo negatif diperbolehkan (rekomendasi: tidak pada MVP).
- Apakah target tabungan termasuk MVP atau fase berikutnya.
