'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const name = formData.get('name') as string;
  const avatarFile = formData.get('avatar') as File | null;

  if (!name || name.trim().length === 0) {
    return { error: 'Nama tidak boleh kosong.' };
  }

  const adminClient = createAdminClient();
  let avatarUrl = (user.user_metadata?.avatar_url as string) || '';

  // Proses upload foto profil jika ada file yang diunggah
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      return { error: 'Ukuran foto maksimal 5 MB.' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(avatarFile.type)) {
      return { error: 'Format foto harus berupa JPG, PNG, atau WebP.' };
    }

    const fileExt = avatarFile.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const fileBuffer = Buffer.from(await avatarFile.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: `Gagal mengunggah foto profil: ${uploadError.message}` };
    }

    const { data: publicData } = adminClient.storage
      .from('avatars')
      .getPublicUrl(fileName);

    avatarUrl = publicData.publicUrl;
  }

  // Update profil di tabel public.profiles
  await adminClient
    .from('profiles')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', user.id);

  // Update metadata di auth.users
  const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      name: name.trim(),
      avatar_url: avatarUrl,
    },
  });

  if (authError) {
    return { error: `Gagal memperbarui metadata: ${authError.message}` };
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/settings');

  return { success: true, avatarUrl };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!password || password.length < 6) {
    return { error: 'Kata sandi baru minimal 6 karakter.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Konfirmasi kata sandi tidak cocok.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateNotificationSettings(settings: {
  emailNotifications: boolean;
  groupAlerts: boolean;
  budgetWarnings: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      notification_settings: settings,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}
