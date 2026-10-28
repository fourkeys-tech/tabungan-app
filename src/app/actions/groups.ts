'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import crypto from 'node:crypto';

export type ActionResponse = {
  success?: boolean;
  error?: string;
  data?: any;
};

/**
 * Membuat tabungan bersama baru (Pos Bersama)
 */
export async function createSavingsGroup(formData: FormData): Promise<ActionResponse> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const targetAmountRaw = formData.get('target_amount') as string;
  const targetDateRaw = formData.get('target_date') as string;
  const quorumRaw = formData.get('approval_quorum') as string;

  if (!name || name.length < 3) {
    return { error: 'Nama tabungan bersama minimal 3 karakter.' };
  }

  const target_amount = targetAmountRaw ? Number(targetAmountRaw.replace(/[^0-9]/g, '')) : null;
  const target_date = targetDateRaw || null;
  const approval_quorum = quorumRaw ? Math.max(1, Number(quorumRaw)) : 2;

  const adminClient = createAdminClient();

  // 1. Simpan pos bersama di tabel savings_pots
  const { data: pot, error: potErr } = await adminClient
    .from('savings_pots')
    .insert({
      type: 'SHARED',
      name,
      description,
      opening_balance: 0,
      target_amount: target_amount && target_amount > 0 ? target_amount : null,
      target_date,
      approval_quorum,
      created_by: user.id,
      status: 'ACTIVE',
    })
    .select('id, name')
    .single();

  if (potErr || !pot) {
    return { error: 'Gagal membuat pos bersama: ' + (potErr?.message || 'Unknown error') };
  }

  // 2. Tambahkan user sebagai OWNER di pot_members
  const { error: memberErr } = await adminClient
    .from('pot_members')
    .upsert({
      pot_id: pot.id,
      user_id: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joined_at: new Date().toISOString(),
    }, { onConflict: 'pot_id,user_id' });

  if (memberErr) {
    return { error: 'Gagal menambahkan anggota owner: ' + memberErr.message };
  }

  // 3. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    pot_id: pot.id,
    actor_user_id: user.id,
    entity_type: 'SAVINGS_POT',
    entity_id: pot.id,
    action: 'CREATE',
    after_data: { name, description, target_amount, target_date, approval_quorum },
    reason: `Membuat pos tabungan bersama: ${name}`,
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true, data: { groupId: pot.id } };
}

/**
 * Membuat token undangan grup tabungan bersama
 */
export async function createGroupInvitation(groupId: string, invitedEmail?: string): Promise<ActionResponse> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi tidak valid.' };
  }

  const adminClient = createAdminClient();

  // Cek keanggotaan aktif
  const { data: membership } = await adminClient
    .from('pot_members')
    .select('role, status')
    .eq('pot_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.status !== 'ACTIVE') {
    return { error: 'Anda bukan anggota aktif dari tabungan bersama ini.' };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

  const { data: inv, error: invErr } = await adminClient
    .from('pot_invitations')
    .insert({
      pot_id: groupId,
      token,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (invErr || !inv) {
    return { error: 'Gagal membuat tautan undangan: ' + (invErr?.message || 'Error') };
  }

  await adminClient.from('audit_logs').insert({
    pot_id: groupId,
    actor_user_id: user.id,
    entity_type: 'INVITATION',
    entity_id: inv.id,
    action: 'INVITE',
    after_data: { invited_email: invitedEmail, expires_at: expiresAt },
    reason: `Membuat tautan undangan token`,
  });

  return { success: true, data: { token, expiresAt } };
}

/**
 * Menerima undangan dan bergabung ke pos tabungan bersama
 */
export async function acceptGroupInvitation(token: string): Promise<ActionResponse> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Silakan login terlebih dahulu untuk menerima undangan.' };
  }

  const adminClient = createAdminClient();

  // 1. Cari undangan di pot_invitations
  const { data: inv, error: findErr } = await adminClient
    .from('pot_invitations')
    .select('id, pot_id, expires_at, revoked_at, savings_pots(name, type)')
    .eq('token', token)
    .single();

  if (findErr || !inv) {
    return { error: 'Tautan undangan tidak valid atau tidak ditemukan.' };
  }

  if (inv.revoked_at) {
    return { error: 'Tautan undangan ini telah dicabut oleh pemilik tabungan.' };
  }

  if (new Date(inv.expires_at) < new Date()) {
    return { error: 'Tautan undangan sudah kedaluwarsa.' };
  }

  // 2. Cek apakah user sudah menjadi anggota
  const { data: existingMember } = await adminClient
    .from('pot_members')
    .select('id, status')
    .eq('pot_id', inv.pot_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    if (existingMember.status === 'ACTIVE') {
      return { error: 'Kamu sudah menjadi anggota aktif tabungan ini.' };
    }
    // Jika sebelumnya LEFT/REMOVED, aktifkan kembali
    await adminClient
      .from('pot_members')
      .update({ status: 'ACTIVE', joined_at: new Date().toISOString() })
      .eq('id', existingMember.id);
  } else {
    // Tambah anggota baru
    const { error: joinErr } = await adminClient
      .from('pot_members')
      .insert({
        pot_id: inv.pot_id,
        user_id: user.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
      });

    if (joinErr) {
      return { error: 'Gagal bergabung ke tabungan bersama: ' + joinErr.message };
    }
  }

  // 3. Catat Audit Log
  await adminClient.from('audit_logs').insert({
    pot_id: inv.pot_id,
    actor_user_id: user.id,
    entity_type: 'INVITATION',
    entity_id: inv.id,
    action: 'INVITE_ACCEPTED',
    reason: 'Anggota bergabung melalui tautan undangan',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true, data: { groupId: inv.pot_id } };
}

/**
 * Anggota keluar dari tabungan bersama
 */
export async function leaveSavingsGroup(groupId: string): Promise<ActionResponse> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) return { error: 'Sesi berakhir.' };

  const adminClient = createAdminClient();

  const { data: membership } = await adminClient
    .from('pot_members')
    .select('id, role, status')
    .eq('pot_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.status !== 'ACTIVE') {
    return { error: 'Kamu bukan anggota aktif pos ini.' };
  }

  // Jika owner, pastikan masih ada owner lain
  if (membership.role === 'OWNER') {
    const { data: otherOwners } = await adminClient
      .from('pot_members')
      .select('id')
      .eq('pot_id', groupId)
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE')
      .neq('user_id', user.id);

    if (!otherOwners || otherOwners.length === 0) {
      return { error: 'Sebagai satu-satunya pemilik tabungan, Anda harus menunjuk pemilik baru sebelum keluar.' };
    }
  }

  await adminClient
    .from('pot_members')
    .update({ status: 'LEFT' })
    .eq('id', membership.id);

  await adminClient.from('audit_logs').insert({
    pot_id: groupId,
    actor_user_id: user.id,
    entity_type: 'POT_MEMBER',
    entity_id: membership.id,
    action: 'LEAVE',
    reason: 'Anggota keluar dari pos tabungan bersama',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true };
}
