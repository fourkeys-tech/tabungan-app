-- ==============================================================================
-- SKEMA DATABASE TABUNGKU V2.1 — UNIFIKASI POS TABUNGAN (SAVINGS POTS)
-- Jalankan skrip ini langsung di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rihpjgakakqmbdlomtwf/sql/new
-- ==============================================================================

-- 1. Bersihkan tabel & relasi lama jika ada
DROP TABLE IF EXISTS public.group_transaction_approvals CASCADE;
DROP TABLE IF EXISTS public.transaction_approvals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.group_invitations CASCADE;
DROP TABLE IF EXISTS public.pot_invitations CASCADE;
DROP TABLE IF EXISTS public.savings_group_members CASCADE;
DROP TABLE IF EXISTS public.pot_members CASCADE;
DROP TABLE IF EXISTS public.personal_ledgers CASCADE;
DROP TABLE IF EXISTS public.savings_groups CASCADE;
DROP TABLE IF EXISTS public.savings_pots CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. Entitas Utama: Pos Tabungan (savings_pots)
CREATE TABLE public.savings_pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('PERSONAL', 'SHARED')),
    name TEXT NOT NULL,
    description TEXT,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    target_amount NUMERIC(18,2) NULL CHECK (target_amount IS NULL OR target_amount > 0),
    target_date DATE NULL,
    approval_quorum INT NULL CHECK (approval_quorum IS NULL OR approval_quorum >= 1),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_quorum_for_shared CHECK (
        (type = 'SHARED' AND approval_quorum IS NOT NULL) OR
        (type = 'PERSONAL' AND approval_quorum IS NULL)
    )
);

-- 3. Entitas Keanggotaan: pot_members
CREATE TABLE public.pot_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES public.savings_pots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pot_id, user_id)
);

-- 4. Entitas Undangan: pot_invitations
CREATE TABLE public.pot_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES public.savings_pots(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    max_uses INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Entitas Transaksi Terpadu: transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES public.savings_pots(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'CONTRIBUTION')),
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    description TEXT,
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'VOIDED')),
    void_reason TEXT NULL,
    receipt_url TEXT NULL,
    payment_method TEXT NULL,
    created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contributor_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Entitas Persetujuan Penarikan: transaction_approvals
CREATE TABLE public.transaction_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVE', 'REJECT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (transaction_id, voter_user_id)
);

-- 7. Entitas Jejak Audit: audit_logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NULL REFERENCES public.savings_pots(id) ON DELETE SET NULL,
    actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NULL,
    action TEXT NOT NULL,
    before_data JSONB NULL,
    after_data JSONB NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Trigger & Constraint: Setiap pos dibuat, otomatis daftarkan Owner ke pot_members
CREATE OR REPLACE FUNCTION public.handle_new_pot_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pot_members (pot_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.created_by, 'OWNER', 'ACTIVE', now())
    ON CONFLICT (pot_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_pot_owner ON public.savings_pots;
CREATE TRIGGER trg_new_pot_owner
    AFTER INSERT ON public.savings_pots
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_pot_owner();

-- 9. Helper Function RLS: Cek apakah user adalah anggota aktif dari suatu pos
CREATE OR REPLACE FUNCTION public.is_active_member(target_pot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.pot_members
        WHERE pot_id = target_pot_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 10. Enable RLS di semua tabel baru
ALTER TABLE public.savings_pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pot_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Policies RLS
-- savings_pots
DROP POLICY IF EXISTS "Anggota aktif dapat melihat pos" ON public.savings_pots;
CREATE POLICY "Anggota aktif dapat melihat pos"
    ON public.savings_pots FOR SELECT
    USING (public.is_active_member(id));

DROP POLICY IF EXISTS "Pengguna terautentikasi dapat membuat pos" ON public.savings_pots;
CREATE POLICY "Pengguna terautentikasi dapat membuat pos"
    ON public.savings_pots FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owner dapat mengupdate pos" ON public.savings_pots;
CREATE POLICY "Owner dapat mengupdate pos"
    ON public.savings_pots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.pot_members
            WHERE pot_id = savings_pots.id AND user_id = auth.uid() AND role = 'OWNER' AND status = 'ACTIVE'
        )
    );

-- pot_members
DROP POLICY IF EXISTS "Anggota dapat melihat member di pos yang sama" ON public.pot_members;
CREATE POLICY "Anggota dapat melihat member di pos yang sama"
    ON public.pot_members FOR SELECT
    USING (public.is_active_member(pot_id));

DROP POLICY IF EXISTS "Owner dapat mengelola member" ON public.pot_members;
CREATE POLICY "Owner dapat mengelola member"
    ON public.pot_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.pot_members pm
            WHERE pm.pot_id = pot_members.pot_id AND pm.user_id = auth.uid() AND pm.role = 'OWNER' AND pm.status = 'ACTIVE'
        )
    );

-- transactions
DROP POLICY IF EXISTS "Anggota aktif dapat melihat transaksi pos" ON public.transactions;
CREATE POLICY "Anggota aktif dapat melihat transaksi pos"
    ON public.transactions FOR SELECT
    USING (public.is_active_member(pot_id));

DROP POLICY IF EXISTS "Anggota aktif dapat menambahkan transaksi" ON public.transactions;
CREATE POLICY "Anggota aktif dapat menambahkan transaksi"
    ON public.transactions FOR INSERT
    WITH CHECK (public.is_active_member(pot_id) AND auth.uid() = created_by_user_id);

DROP POLICY IF EXISTS "Owner atau pembuat dapat mengupdate status transaksi (void/approve)" ON public.transactions;
CREATE POLICY "Owner atau pembuat dapat mengupdate status transaksi (void/approve)"
    ON public.transactions FOR UPDATE
    USING (public.is_active_member(pot_id));

-- transaction_approvals
DROP POLICY IF EXISTS "Anggota aktif dapat melihat persetujuan" ON public.transaction_approvals;
CREATE POLICY "Anggota aktif dapat melihat persetujuan"
    ON public.transaction_approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_approvals.transaction_id AND public.is_active_member(t.pot_id)
        )
    );

DROP POLICY IF EXISTS "Anggota aktif dapat memberikan suara" ON public.transaction_approvals;
CREATE POLICY "Anggota aktif dapat memberikan suara"
    ON public.transaction_approvals FOR INSERT
    WITH CHECK (
        auth.uid() = voter_user_id AND
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_approvals.transaction_id AND public.is_active_member(t.pot_id)
        )
    );

-- audit_logs
DROP POLICY IF EXISTS "Anggota aktif dapat melihat audit log pos" ON public.audit_logs;
CREATE POLICY "Anggota aktif dapat melihat audit log pos"
    ON public.audit_logs FOR SELECT
    USING (pot_id IS NOT NULL AND public.is_active_member(pot_id));

-- Index performa
CREATE INDEX IF NOT EXISTS idx_savings_pots_created_by ON public.savings_pots(created_by);
CREATE INDEX IF NOT EXISTS idx_savings_pots_type ON public.savings_pots(type);
CREATE INDEX IF NOT EXISTS idx_pot_members_user_id ON public.pot_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pot_members_pot_id ON public.pot_members(pot_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pot_id ON public.transactions(pot_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_pot_id ON public.audit_logs(pot_id);
