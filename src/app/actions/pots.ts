'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createPotAction({
  type,
  name,
  description,
  opening_balance = 0,
  target_amount = null,
  target_date = null,
  approval_quorum = null,
}: {
  type: 'PERSONAL' | 'SHARED';
  name: string;
  description?: string;
  opening_balance?: number;
  target_amount?: number | null;
  target_date?: string | null;
  approval_quorum?: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesi berakhir, silakan login kembali.' };

  if (!name.trim()) return { success: false, error: 'Nama pos wajib diisi.' };
  if (type === 'SHARED' && (!approval_quorum || approval_quorum < 1)) {
    return { success: false, error: 'Kuorum persetujuan pos bersama wajib diisi minimal 1.' };
  }

  const db = createAdminClient();

  // 1. Simpan pos baru
  const { data: pot, error: errPot } = await db
    .from('savings_pots')
    .insert({
      type,
      name: name.trim(),
      description: description?.trim() || null,
      opening_balance: opening_balance || 0,
      target_amount: target_amount && target_amount > 0 ? target_amount : null,
      target_date: target_date || null,
      approval_quorum: type === 'SHARED' ? approval_quorum : null,
      created_by: user.id,
      status: 'ACTIVE',
    })
    .select()
    .single();

  if (errPot) return { success: false, error: errPot.message };

  // 2. Pastikan trigger mendaftarkan owner di pot_members
  await db
    .from('pot_members')
    .upsert({
      pot_id: pot.id,
      user_id: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'pot_id,user_id' });

  // 3. Catat audit log
  await db.from('audit_logs').insert({
    pot_id: pot.id,
    actor_user_id: user.id,
    entity_type: 'SAVINGS_POT',
    entity_id: pot.id,
    action: 'CREATE_POT',
    after_data: pot,
    reason: `Membuat pos tabungan baru (${type}): ${pot.name}`,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/pots');
  return { success: true, potId: pot.id };
}

export async function archivePotAction(potId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesi berakhir.' };

  const db = createAdminClient();

  // Validasi peran owner
  const { data: member } = await db
    .from('pot_members')
    .select('role')
    .eq('pot_id', potId)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single();

  if (member?.role !== 'OWNER') {
    return { success: false, error: 'Hanya pemilik (owner) yang dapat mengarsipkan pos.' };
  }

  const { error } = await db
    .from('savings_pots')
    .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
    .eq('id', potId);

  if (error) return { success: false, error: error.message };

  await db.from('audit_logs').insert({
    pot_id: potId,
    actor_user_id: user.id,
    entity_type: 'SAVINGS_POT',
    entity_id: potId,
    action: 'ARCHIVE_POT',
    reason: 'Mengarsipkan pos tabungan.',
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/pots');
  return { success: true };
}

