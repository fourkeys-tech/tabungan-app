'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function registerAction({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const adminClient = createAdminClient();

    // 1. Buat user via Admin API (email_confirm: true bypasses Supabase rate limit email)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        return { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.' };
      }
      return { success: false, error: createError.message };
    }

    const userId = userData.user.id;

    // 2. Buat atau pastikan profile terisi
    await adminClient.from('profiles').upsert({
      id: userId,
      name,
      email,
      updated_at: new Date().toISOString(),
    });

    // 3. Pastikan pos personal default terbuat
    const { data: existingPot } = await adminClient
      .from('savings_pots')
      .select('id')
      .eq('created_by', userId)
      .eq('type', 'PERSONAL')
      .maybeSingle();

    if (!existingPot) {
      await adminClient.from('savings_pots').insert({
        type: 'PERSONAL',
        name: 'Tabungan Utama',
        description: 'Pos tabungan personal utama',
        opening_balance: 0,
        created_by: userId,
        status: 'ACTIVE',
      });
    }

    // 4. Login user pada session server agar cookie auth otomatis aktif
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Jika session gagal di-set via server, klien dapat melakukan login
      return { success: true, requireClientLogin: true };
    }

    return { success: true, requireClientLogin: false };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem saat mendaftar.' };
  }
}

/**
 * Mengirim tautan pemulihan kata sandi (Password Reset) ke email pengguna
 */
export async function forgotPasswordAction({
  email,
  origin,
}: {
  email: string;
  origin?: string;
}) {
  try {
    const supabase = await createClient();
    const cleanEmail = email.trim().toLowerCase();

    // Pastikan user terdaftar di profiles terlebih dahulu
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'Email ini belum terdaftar di TabungKu. Silakan periksa kembali atau buat akun baru.',
      };
    }

    const redirectTo = origin
      ? `${origin}/auth/callback?next=/reset-password`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Tautan pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem saat memproses pemulihan kata sandi.',
    };
  }
}

/**
 * Memperbarui kata sandi baru untuk pengguna yang telah terverifikasi sesi pemulihannya
 */
export async function updatePasswordAction({
  password,
}: {
  password: string;
}) {
  try {
    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Kata sandi baru minimal harus 6 karakter.',
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Sesi pemulihan tidak valid atau telah kedaluwarsa. Silakan ajukan ulang tautan lupa kata sandi.',
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.',
    };
  }
}
