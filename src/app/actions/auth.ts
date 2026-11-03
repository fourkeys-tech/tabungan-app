'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/utils/mailer';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Server action untuk login dengan pengelolaan session lifetime & login timestamp
 */
export async function loginAction({
  email,
  password,
  rememberMe,
}: {
  email: string;
  password: string;
  rememberMe: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: 'Email atau kata sandi yang Anda masukkan tidak sesuai.',
      };
    }

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Catat waktu login saat ini (Unix ms)
    const nowMs = Date.now();
    // 10 jam dalam detik
    const maxAgeSeconds = 10 * 60 * 60;

    const cookieOptions: any = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    };

    if (rememberMe) {
      // Jika dicentang, batas waktu mutlak 10 jam
      cookieOptions.maxAge = maxAgeSeconds;
    } else {
      // Jika tidak dicentang: Session cookie murni (otomatis terhapus saat browser ditutup)
      delete cookieOptions.maxAge;
    }

    cookieStore.set('tabungku_auth_time', nowMs.toString(), cookieOptions);
    cookieStore.set('tabungku_remember', rememberMe ? 'true' : 'false', cookieOptions);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat masuk.',
    };
  }
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
 * Mereset kata sandi akun secara langsung menggunakan validasi email terdaftar
 */
export async function directResetPasswordAction({
  email,
  newPassword,
}: {
  email: string;
  newPassword: string;
}) {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return { success: false, error: 'Alamat email wajib diisi.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal harus 6 karakter.' };
    }

    const adminClient = createAdminClient();

    // 1. Cari user di profiles atau auth.users
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, name')
      .eq('email', cleanEmail)
      .maybeSingle();

    let targetUserId = profile?.id;

    if (!targetUserId) {
      // Coba periksa di auth.users via listUsers jika profil belum ada
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const user = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (user) {
        targetUserId = user.id;
      }
    }

    if (!targetUserId) {
      return {
        success: false,
        error: 'Alamat email ini belum terdaftar di TabungKu. Silakan periksa kembali atau buat akun baru.',
      };
    }

    // 2. Perbarui kata sandi langsung menggunakan Supabase Admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.',
    };
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
      .select('id, email, name')
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

    // 1. Generate link pemulihan aman via Supabase Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo,
      },
    });

    const recoveryLink = linkData?.properties?.action_link;

    // 2. Jika link berhasil dibuat dan SendCoreX terkonfigurasi, kirimkan via SendCoreX
    if (recoveryLink) {
      const emailResult = await sendEmail({
        to: cleanEmail,
        subject: 'Permintaan Pemulihan Kata Sandi Akun TabungKu',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0d2019; margin: 0; font-size: 24px;">TabungKu</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Platform Pengelolaan Kas Personal & Bersama</p>
            </div>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">Halo <strong>${profile.name || 'Pengguna'}</strong>,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Kami menerima permintaan untuk mengatur ulang kata sandi akun TabungKu Anda. Silakan klik tombol di bawah ini untuk membuat kata sandi baru:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${recoveryLink}" style="display: inline-block; background: #00875a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px;">
                Atur Ulang Kata Sandi
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              Tautan ini hanya berlaku selama 1 jam dan hanya dapat digunakan 1 kali. Jika Anda tidak pernah meminta pemulihan kata sandi ini, Anda dapat mengabaikan email ini dengan aman.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} TabungKu. Seluruh hak cipta dilindungi.
            </p>
          </div>
        `,
        text: `Halo ${profile.name || 'Pengguna'},\n\nSilakan gunakan tautan berikut untuk mengatur ulang kata sandi akun TabungKu Anda:\n${recoveryLink}\n\nTautan ini hanya berlaku selama 1 jam.`,
      });

      if (emailResult.success) {
        return {
          success: true,
          message: 'Tautan pemulihan kata sandi telah dikirim ke email Anda melalui SendCoreX. Silakan periksa kotak masuk atau spam.',
        };
      }
    }

    // 3. Fallback: kirim via Supabase Auth jika link generator atau pengiriman custom perlu fallback
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error && !recoveryLink) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Tautan pemulihan kata sandi telah diproses dan dikirim ke email Anda. Silakan periksa kotak masuk atau spam.',
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
