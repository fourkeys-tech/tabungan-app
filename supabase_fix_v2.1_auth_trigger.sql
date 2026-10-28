-- ==============================================================================
-- FIX REGISTRATION & USER CREATION TRIGGER UNTUK TABUNGKU V2.1
-- Jalankan skrip ini langsung di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rihpjgakakqmbdlomtwf/sql/new
-- ==============================================================================

-- 1. Hapus trigger lama yang mencoba mengakses tabel personal_ledgers yang sudah dihapus
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_personal_ledger() CASCADE;

-- 2. Pastikan tabel profiles memiliki kolom yang dibutuhkan
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pastikan kolom role ada di profiles jika sebelumnya belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'USER';
    END IF;
END $$;

-- 3. Perbaiki fungsi handle_new_user untuk v2.1
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_name TEXT;
BEGIN
    new_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Buat profil pengguna
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        new_name,
        'USER'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = now();

    -- Buat pos tabungan personal utama default (jika belum ada)
    IF NOT EXISTS (
        SELECT 1 FROM public.savings_pots 
        WHERE created_by = NEW.id AND type = 'PERSONAL'
    ) THEN
        INSERT INTO public.savings_pots (
            type,
            name,
            description,
            opening_balance,
            created_by,
            status
        )
        VALUES (
            'PERSONAL',
            'Tabungan Utama',
            'Pos tabungan personal utama',
            0,
            NEW.id,
            'ACTIVE'
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Proteksi fail-safe agar pendaftaran user auth tidak terblokir
        RAISE WARNING 'handle_new_user error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Pasang trigger on_auth_user_created di auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
