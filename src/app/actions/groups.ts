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
 * Membuat tabungan bersama baru
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

  if (!name || name.length < 3) {
    return { error: 'Nama tabungan bersama minimal 3 karakter.' };
  }

  const target_amount = targetAmountRaw ? Number(targetAmountRaw.replace(/[^0-9]/g, '')) : null;
  const target_date = targetDateRaw || null;

  const adminClient = createAdminClient();

  // 1. Insert Grup via Admin Client
  const { data: group, error: groupErr } = await adminClient
    .from('savings_groups')
    .insert({
      name,
      description,
      owner_user_id: user.id,
      target_amount: target_amount && target_amount > 0 ? target_amount : null,
      target_date,
      currency: 'IDR',
      status: 'ACTIVE',
    })
    .select('id, name')
    .single();

  if (groupErr || !group) {
    return { error: 'Gagal membuat grup: ' + (groupErr?.message || 'Unknown error') };
  }

  // 2. Tambahkan user sebagai OWNER di savings_group_members
  const { error: memberErr } = await adminClient
    .from('savings_group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
    });

  if (memberErr) {
    return { error: 'Gagal menambahkan anggota owner: ' + memberErr.message };
  }

  // 3. Catat ke Audit Log
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: group.id,
    entity_type: 'SAVINGS_GROUP',
    entity_id: group.id,
    action: 'CREATE',
    after_data: { name, description, target_amount, target_date },
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true, data: { groupId: group.id } };
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
    .from('savings_group_members')
    .select('role, status')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.status !== 'ACTIVE') {
    return { error: 'Anda bukan anggota aktif dari tabungan bersama ini.' };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari

  const { data: inv, error: invErr } = await adminClient
    .from('invitations')
    .insert({
      group_id: groupId,
      invited_email: invitedEmail?.trim() || null,
      token_hash: token,
      created_by_user_id: user.id,
      status: 'PENDING',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (invErr || !inv) {
    return { error: 'Gagal membuat tautan undangan: ' + (invErr?.message || 'Error') };
  }

  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: groupId,
    entity_type: 'INVITATION',
    entity_id: inv.id,
    action: 'INVITE',
    after_data: { invited_email: invitedEmail, expires_at: expiresAt },
  });

  return { success: true, data: { token, expiresAt } };
}

/**
 * Menerima undangan dan bergabung ke tabungan bersama
 */
export async function acceptGroupInvitation(token: string): Promise<ActionResponse> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Silakan login terlebih dahulu untuk menerima undangan.' };
  }

  const adminClient = createAdminClient();

  // 1. Cari undangan
  const { data: inv, error: findErr } = await adminClient
    .from('invitations')
    .select('id, group_id, status, expires_at, savings_groups(name)')
    .eq('token_hash', token)
    .single();

  if (findErr || !inv) {
    return { error: 'Tautan undangan tidak valid atau tidak ditemukan.' };
  }

  if (inv.status !== 'PENDING') {
    return { error: `Undangan ini sudah tidak berlaku (status: ${inv.status}).` };
  }

  if (new Date(inv.expires_at) < new Date()) {
    await adminClient.from('invitations').update({ status: 'EXPIRED' }).eq('id', inv.id);
    return { error: 'Tautan undangan sudah kedaluwarsa.' };
  }

  // 2. Cek apakah user sudah menjadi anggota
  const { data: existingMember } = await adminClient
    .from('savings_group_members')
    .select('id, status')
    .eq('group_id', inv.group_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    if (existingMember.status === 'ACTIVE') {
      return { error: 'Kamu sudah menjadi anggota aktif tabungan ini.' };
    }
    // Jika sebelumnya LEFT/REMOVED, aktifkan kembali
    await adminClient
      .from('savings_group_members')
      .update({ status: 'ACTIVE', joined_at: new Date().toISOString() })
      .eq('id', existingMember.id);
  } else {
    // Tambah anggota baru
    const { error: joinErr } = await adminClient
      .from('savings_group_members')
      .insert({
        group_id: inv.group_id,
        user_id: user.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      });

    if (joinErr) {
      return { error: 'Gagal bergabung ke tabungan bersama: ' + joinErr.message };
    }
  }

  // 3. Update status undangan menjadi ACCEPTED
  await adminClient
    .from('invitations')
    .update({
      status: 'ACCEPTED',
      accepted_by_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', inv.id);

  // 4. Catat Audit Log
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: inv.group_id,
    entity_type: 'INVITATION',
    entity_id: inv.id,
    action: 'INVITE_ACCEPTED',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true, data: { groupId: inv.group_id } };
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
    .from('savings_group_members')
    .select('id, role, status')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.status !== 'ACTIVE') {
    return { error: 'Kamu bukan anggota aktif grup ini.' };
  }

  // Jika owner, pastikan masih ada owner lain
  if (membership.role === 'OWNER') {
    const { data: otherOwners } = await adminClient
      .from('savings_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('role', 'OWNER')
      .eq('status', 'ACTIVE')
      .neq('user_id', user.id);

    if (!otherOwners || otherOwners.length === 0) {
      return { error: 'Sebagai satu-satunya pemilik grup, Anda harus menunjuk pemilik baru sebelum keluar.' };
    }
  }

  await adminClient
    .from('savings_group_members')
    .update({ status: 'LEFT' })
    .eq('id', membership.id);

  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: groupId,
    entity_type: 'SAVINGS_GROUP_MEMBER',
    entity_id: membership.id,
    action: 'LEAVE',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  return { success: true };
}
