-- Skema Database untuk Supabase
-- Menghubungkan Auth bawaan Supabase (auth.users) ke tabel publik

-- 1. Tabel Profil (menggantikan tabel users manual sebelumnya)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(120),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger untuk otomatis membuat profil setelah user mendaftar di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Buku Tabungan Pribadi
CREATE TABLE IF NOT EXISTS public.personal_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    currency CHAR(3) DEFAULT 'IDR',
    opening_balance NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger untuk otomatis membuat Personal Ledger setelah user mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_personal_ledger()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.personal_ledgers (user_id, name)
  VALUES (new.id, 'Keuangan ' || COALESCE(new.name, 'Pribadi'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_personal_ledger();


-- 3. Grup Tabungan Bersama
CREATE TABLE IF NOT EXISTS public.savings_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    owner_user_id UUID REFERENCES public.profiles(id),
    currency CHAR(3) DEFAULT 'IDR',
    opening_balance NUMERIC(18,2) DEFAULT 0,
    target_amount NUMERIC(18,2),
    target_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Anggota Grup
CREATE TABLE IF NOT EXISTS public.savings_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER', -- OWNER/MEMBER
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE/LEFT/REMOVED
    joined_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- 5. Kategori
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES public.profiles(id),
    group_id UUID REFERENCES public.savings_groups(id),
    name VARCHAR(80) NOT NULL,
    scope_type VARCHAR(20) NOT NULL, -- PERSONAL/SHARED/BOTH
    transaction_type VARCHAR(20), -- INCOME/EXPENSE/CONTRIBUTION
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Transaksi (Digabung Pribadi & Bersama sesuai PRD)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type VARCHAR(20) NOT NULL, -- PERSONAL/SHARED
    personal_ledger_id UUID REFERENCES public.personal_ledgers(id),
    group_id UUID REFERENCES public.savings_groups(id),
    created_by_user_id UUID REFERENCES public.profiles(id),
    contributor_user_id UUID REFERENCES public.profiles(id),
    transaction_type VARCHAR(20) NOT NULL, -- INCOME/EXPENSE/CONTRIBUTION
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id),
    transaction_date DATE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE/VOIDED
    void_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_group_date ON public.transactions(group_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_personal_date ON public.transactions(personal_ledger_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by_user_id, created_at);

-- 7. Undangan Grup
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.savings_groups(id) ON DELETE CASCADE,
    invited_email VARCHAR(255),
    token_hash TEXT NOT NULL,
    created_by_user_id UUID REFERENCES public.profiles(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING/ACCEPTED/REVOKED/EXPIRED
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_by_user_id UUID REFERENCES public.profiles(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(id),
    group_id UUID REFERENCES public.savings_groups(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE/UPDATE/VOID/INVITE/REMOVE_MEMBER
    before_data JSONB,
    after_data JSONB,
    reason TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);
