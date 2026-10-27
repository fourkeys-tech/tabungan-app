-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) UNTUK TABUNGKU
-- Jalankan skrip ini di SQL Editor Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Enable RLS di semua tabel
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personal_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.savings_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.savings_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Kebijakan Tabel: PROFILES
-- ==============================================================================
DROP POLICY IF EXISTS "Profiles dapat dilihat oleh user terautentikasi" ON public.profiles;
CREATE POLICY "Profiles dapat dilihat oleh user terautentikasi"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "User dapat mengubah profil miliknya sendiri" ON public.profiles;
CREATE POLICY "User dapat mengubah profil miliknya sendiri"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ==============================================================================
-- 3. Kebijakan Tabel: PERSONAL_LEDGERS
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat mengelola buku tabungan pribadi miliknya" ON public.personal_ledgers;
CREATE POLICY "User dapat mengelola buku tabungan pribadi miliknya"
  ON public.personal_ledgers FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 4. Kebijakan Tabel: SAVINGS_GROUPS
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat melihat grup yang diikutinya atau dimilikinya" ON public.savings_groups;
CREATE POLICY "User dapat melihat grup yang diikutinya atau dimilikinya"
  ON public.savings_groups FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.savings_group_members
      WHERE group_id = public.savings_groups.id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "User terautentikasi dapat membuat tabungan bersama baru" ON public.savings_groups;
CREATE POLICY "User terautentikasi dapat membuat tabungan bersama baru"
  ON public.savings_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owner dapat mengubah tabungan bersama" ON public.savings_groups;
CREATE POLICY "Owner dapat mengubah tabungan bersama"
  ON public.savings_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- ==============================================================================
-- 5. Kebijakan Tabel: SAVINGS_GROUP_MEMBERS
-- ==============================================================================
DROP POLICY IF EXISTS "Anggota grup dapat melihat daftar anggota sesama grup" ON public.savings_group_members;
CREATE POLICY "Anggota grup dapat melihat daftar anggota sesama grup"
  ON public.savings_group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.savings_group_members sgm
      WHERE sgm.group_id = public.savings_group_members.group_id
      AND sgm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "User dapat bergabung atau didaftarkan sebagai anggota" ON public.savings_group_members;
CREATE POLICY "User dapat bergabung atau didaftarkan sebagai anggota"
  ON public.savings_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.savings_groups sg
      WHERE sg.id = public.savings_group_members.group_id
      AND sg.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "User dapat memperbarui status keanggotaannya atau owner" ON public.savings_group_members;
CREATE POLICY "User dapat memperbarui status keanggotaannya atau owner"
  ON public.savings_group_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.savings_groups sg
      WHERE sg.id = public.savings_group_members.group_id
      AND sg.owner_user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 6. Kebijakan Tabel: CATEGORIES
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat melihat kategori pribadi dan sistem" ON public.categories;
CREATE POLICY "User dapat melihat kategori pribadi dan sistem"
  ON public.categories FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() OR owner_user_id IS NULL);

DROP POLICY IF EXISTS "User dapat membuat kategori" ON public.categories;
CREATE POLICY "User dapat membuat kategori"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- ==============================================================================
-- 7. Kebijakan Tabel: TRANSACTIONS
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat melihat transaksi pribadinya dan grup yang diikutinya" ON public.transactions;
CREATE POLICY "User dapat melihat transaksi pribadinya dan grup yang diikutinya"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    (scope_type = 'PERSONAL' AND created_by_user_id = auth.uid()) OR
    (scope_type = 'SHARED' AND EXISTS (
      SELECT 1 FROM public.savings_group_members
      WHERE group_id = public.transactions.group_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
    ))
  );

DROP POLICY IF EXISTS "User dapat mencatat transaksi pribadi atau bersama" ON public.transactions;
CREATE POLICY "User dapat mencatat transaksi pribadi atau bersama"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid() AND (
      scope_type = 'PERSONAL' OR
      (scope_type = 'SHARED' AND EXISTS (
        SELECT 1 FROM public.savings_group_members
        WHERE group_id = public.transactions.group_id
        AND user_id = auth.uid()
        AND status = 'ACTIVE'
      ))
    )
  );

DROP POLICY IF EXISTS "Pembuat transaksi atau owner grup dapat membatalkan (void)" ON public.transactions;
CREATE POLICY "Pembuat transaksi atau owner grup dapat membatalkan (void)"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid() OR
    (scope_type = 'SHARED' AND EXISTS (
      SELECT 1 FROM public.savings_group_members
      WHERE group_id = public.transactions.group_id
      AND user_id = auth.uid()
      AND role = 'OWNER'
    ))
  );

-- ==============================================================================
-- 8. Kebijakan Tabel: INVITATIONS
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat melihat undangan grup" ON public.invitations;
CREATE POLICY "User dapat melihat undangan grup"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anggota grup dapat membuat undangan" ON public.invitations;
CREATE POLICY "Anggota grup dapat membuat undangan"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.savings_group_members
      WHERE group_id = public.invitations.group_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "User dapat menerima atau owner dapat memperbarui undangan" ON public.invitations;
CREATE POLICY "User dapat menerima atau owner dapat memperbarui undangan"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (true);

-- ==============================================================================
-- 9. Kebijakan Tabel: AUDIT_LOGS
-- ==============================================================================
DROP POLICY IF EXISTS "User dapat melihat audit log yang relevan" ON public.audit_logs;
CREATE POLICY "User dapat melihat audit log yang relevan"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    actor_user_id = auth.uid() OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.savings_group_members
      WHERE group_id = public.audit_logs.group_id
      AND user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "User dapat mencatat audit log atas aksinya sendiri" ON public.audit_logs;
CREATE POLICY "User dapat mencatat audit log atas aksinya sendiri"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
