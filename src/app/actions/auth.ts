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

    // 3. Login user pada session server agar cookie auth otomatis aktif
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
