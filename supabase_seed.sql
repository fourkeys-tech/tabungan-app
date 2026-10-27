-- Pastikan ekstensi pgcrypto aktif (digunakan untuk membuat password hash seed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Insert ke auth.users (Tabel Sistem Supabase)
-- Password untuk semua akun seed adalah: password123
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
(
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'andi.prm@gmail.com', 
  crypt('password123', gen_salt('bf')), now(), 
  '{"provider":"email","providers":["email"]}', '{"name":"Andi Pratama"}', now(), now()
),
(
  'b27e8a3a-18b2-48f1-8d2a-442a8b387e22', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'budi.santoso@gmail.com', 
  crypt('password123', gen_salt('bf')), now(), 
  '{"provider":"email","providers":["email"]}', '{"name":"Budi Santoso"}', now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- Catatan: Setelah insert di atas, Trigger yang kita buat sebelumnya akan otomatis 
-- mengisi data di tabel public.profiles dan public.personal_ledgers!


-- 2. Insert Grup Tabungan Bersama
INSERT INTO public.savings_groups (id, name, description, owner_user_id, target_amount, target_date)
VALUES (
  'c38f9b4b-29c3-4902-9e3b-553b9c498f33', 
  'Tabungan Liburan', 
  'Untuk liburan ke Bali akhir tahun', 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', -- Andi
  3000000, 
  '2026-12-31'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Anggota Grup Tabungan Bersama
INSERT INTO public.savings_group_members (group_id, user_id, role)
VALUES 
  ('c38f9b4b-29c3-4902-9e3b-553b9c498f33', 'd85e7a93-57a5-485f-8c7c-47db6a72e811', 'OWNER'), -- Andi
  ('c38f9b4b-29c3-4902-9e3b-553b9c498f33', 'b27e8a3a-18b2-48f1-8d2a-442a8b387e22', 'MEMBER') -- Budi
ON CONFLICT DO NOTHING;

-- 4. Kategori Transaksi
INSERT INTO public.categories (id, owner_user_id, name, scope_type, transaction_type)
VALUES
  ('e49f9b4b-29c3-4902-9e3b-553b9c498f44', 'd85e7a93-57a5-485f-8c7c-47db6a72e811', 'Pemasukan Utama', 'PERSONAL', 'INCOME'),
  ('f59f9b4b-29c3-4902-9e3b-553b9c498f55', 'd85e7a93-57a5-485f-8c7c-47db6a72e811', 'Makanan & Minuman', 'PERSONAL', 'EXPENSE'),
  ('a69f9b4b-29c3-4902-9e3b-553b9c498f66', 'd85e7a93-57a5-485f-8c7c-47db6a72e811', 'Transportasi', 'PERSONAL', 'EXPENSE')
ON CONFLICT (id) DO NOTHING;

-- 5. Transaksi Pribadi (Andi)
INSERT INTO public.transactions (scope_type, personal_ledger_id, created_by_user_id, transaction_type, amount, category_id, transaction_date, description)
SELECT 
  'PERSONAL', 
  l.id, 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', 
  'INCOME', 
  2500000, 
  'e49f9b4b-29c3-4902-9e3b-553b9c498f44', 
  '2026-05-24', 
  'Gaji Bulan Mei'
FROM public.personal_ledgers l WHERE l.user_id = 'd85e7a93-57a5-485f-8c7c-47db6a72e811';

INSERT INTO public.transactions (scope_type, personal_ledger_id, created_by_user_id, transaction_type, amount, category_id, transaction_date, description)
SELECT 
  'PERSONAL', 
  l.id, 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', 
  'EXPENSE', 
  50000, 
  'f59f9b4b-29c3-4902-9e3b-553b9c498f55', 
  '2026-05-25', 
  'Makan Siang'
FROM public.personal_ledgers l WHERE l.user_id = 'd85e7a93-57a5-485f-8c7c-47db6a72e811';

INSERT INTO public.transactions (scope_type, personal_ledger_id, created_by_user_id, transaction_type, amount, category_id, transaction_date, description)
SELECT 
  'PERSONAL', 
  l.id, 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', 
  'EXPENSE', 
  150000, 
  'a69f9b4b-29c3-4902-9e3b-553b9c498f66', 
  '2026-05-24', 
  'Isi Bensin'
FROM public.personal_ledgers l WHERE l.user_id = 'd85e7a93-57a5-485f-8c7c-47db6a72e811';


-- 6. Transaksi Tabungan Bersama (Grup Liburan)
-- Setoran Budi
INSERT INTO public.transactions (scope_type, group_id, created_by_user_id, contributor_user_id, transaction_type, amount, transaction_date, description)
VALUES (
  'SHARED', 
  'c38f9b4b-29c3-4902-9e3b-553b9c498f33', 
  'b27e8a3a-18b2-48f1-8d2a-442a8b387e22', -- Dibuat oleh Budi
  'b27e8a3a-18b2-48f1-8d2a-442a8b387e22', -- Kontributor Budi
  'CONTRIBUTION', 
  300000, 
  '2026-05-25', 
  'Setoran awal Budi'
);

-- Setoran Andi
INSERT INTO public.transactions (scope_type, group_id, created_by_user_id, contributor_user_id, transaction_type, amount, transaction_date, description)
VALUES (
  'SHARED', 
  'c38f9b4b-29c3-4902-9e3b-553b9c498f33', 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', -- Dibuat oleh Andi
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', -- Kontributor Andi
  'CONTRIBUTION', 
  200000, 
  '2026-05-26', 
  'Setoran Andi'
);

-- Pengeluaran Bersama (Dicatat Andi)
INSERT INTO public.transactions (scope_type, group_id, created_by_user_id, transaction_type, amount, transaction_date, description)
VALUES (
  'SHARED', 
  'c38f9b4b-29c3-4902-9e3b-553b9c498f33', 
  'd85e7a93-57a5-485f-8c7c-47db6a72e811', -- Dibuat oleh Andi
  'EXPENSE', 
  150000, 
  '2026-05-25', 
  'Makan Siang (Tabungan Bersama)'
);
