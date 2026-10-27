'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: any;
};

/**
 * Menambahkan kategori baru untuk pengguna
 */
export async function addCategoryAction(formData: FormData): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const scopeType = (formData.get('scope_type') as string)?.trim().toUpperCase() || 'PERSONAL';
  const transactionType = (formData.get('transaction_type') as string)?.trim().toUpperCase() || 'EXPENSE';

  if (!name) {
    return { error: 'Nama kategori wajib diisi.' };
  }

  if (name.length > 50) {
    return { error: 'Nama kategori maksimal 50 karakter.' };
  }

  const adminClient = createAdminClient();

  // Cek duplikasi kategori untuk user ini dengan scope yang sama
  const { data: existing } = await adminClient
    .from('categories')
    .select('id')
    .ilike('name', name)
    .eq('scope_type', scopeType)
    .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)
    .maybeSingle();

  if (existing) {
    return { error: `Kategori "${name}" sudah ada dalam daftar ${scopeType === 'PERSONAL' ? 'Personal' : 'Bersama'}.` };
  }

  const { data: newCat, error: insertErr } = await adminClient
    .from('categories')
    .insert({
      owner_user_id: user.id,
      name,
      scope_type: scopeType,
      transaction_type: transactionType,
    })
    .select('*')
    .single();

  if (insertErr || !newCat) {
    return { error: 'Gagal menambahkan kategori: ' + (insertErr?.message || 'Error') };
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');

  return { success: true, data: newCat };
}

/**
 * Mengubah nama kategori yang dimiliki pengguna
 */
export async function updateCategoryAction(
  categoryId: string,
  newName: string
): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const cleanName = newName.trim();
  if (!cleanName) {
    return { error: 'Nama kategori tidak boleh kosong.' };
  }

  const adminClient = createAdminClient();

  // Validasi kepemilikan
  const { data: cat } = await adminClient
    .from('categories')
    .select('id, owner_user_id')
    .eq('id', categoryId)
    .single();

  if (!cat) {
    return { error: 'Kategori tidak ditemukan.' };
  }

  if (cat.owner_user_id !== user.id) {
    return { error: 'Kategori bawaan sistem tidak dapat diubah.' };
  }

  const { error: updateErr } = await adminClient
    .from('categories')
    .update({ name: cleanName })
    .eq('id', categoryId);

  if (updateErr) {
    return { error: 'Gagal memperbarui kategori: ' + updateErr.message };
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/shared');

  return { success: true };
}

/**
 * Menghapus kategori buatan pengguna
 */
export async function deleteCategoryAction(categoryId: string): Promise<ActionResponse> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const adminClient = createAdminClient();

  // Validasi kepemilikan
  const { data: cat } = await adminClient
    .from('categories')
    .select('id, owner_user_id, name')
    .eq('id', categoryId)
    .single();

  if (!cat) {
    return { error: 'Kategori tidak ditemukan.' };
  }

  if (cat.owner_user_id !== user.id) {
    return { error: 'Kategori bawaan sistem tidak dapat dihapus.' };
  }

  // Lepaskan kategori dari transaksi yang sudah ada (set category_id = null agar transaksi tidak hilang)
  await adminClient
    .from('transactions')
    .update({ category_id: null })
    .eq('category_id', categoryId);

  const { error: delErr } = await adminClient
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (delErr) {
    return { error: 'Gagal menghapus kategori: ' + delErr.message };
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/personal');
  revalidatePath('/dashboard/shared');

  return { success: true };
}

