'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface PendingApprovalItem {
  id: string;
  groupId: string;
  groupName: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  categoryName: string | null;
  createdByUserId: string;
  createdByName: string;
  createdByEmail: string;
  receiptUrl: string | null;
  createdAt: string;
  approvalsCount: number;
  requiredApprovals: number;
  hasUserApproved: boolean;
  canUserApprove: boolean;
  isCreator: boolean;
  totalMembers: number;
}

/**
 * Mengambil daftar pengajuan penarikan kas bersama yang membutuhkan persetujuan
 */
export async function getPendingApprovals(
  adminClient: any,
  userId: string,
  targetGroupId?: string
): Promise<PendingApprovalItem[]> {
  // 1. Ambil grup aktif yang diikuti pengguna
  const { data: memberships } = await adminClient
    .from('savings_group_members')
    .select('group_id, role, savings_groups(id, name)')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  const myGroupIds = (memberships ?? []).map((m: any) => m.group_id);
  if (myGroupIds.length === 0) return [];

  const filterGroupIds = targetGroupId ? [targetGroupId] : myGroupIds;

  // 2. Query transaksi dengan status PENDING_APPROVAL
  const { data: pendingRows } = await adminClient
    .from('transactions')
    .select(
      'id, group_id, amount, description, transaction_date, created_at, created_by_user_id, savings_groups(name), categories(name)'
    )
    .eq('scope_type', 'SHARED')
    .eq('transaction_type', 'EXPENSE')
    .eq('status', 'PENDING_APPROVAL')
    .in('group_id', filterGroupIds)
    .order('created_at', { ascending: false });

  if (!pendingRows || pendingRows.length === 0) return [];

  const pendingTxIds = pendingRows.map((r: any) => r.id);
  const creatorIds = Array.from(new Set(pendingRows.map((r: any) => r.created_by_user_id)));

  // 3. Ambil data profil pembuat pengajuan
  const { data: creatorProfiles } = await adminClient
    .from('profiles')
    .select('id, name, email')
    .in('id', creatorIds);

  const profileMap: Record<string, { name: string; email: string }> = {};
  (creatorProfiles ?? []).forEach((p: any) => {
    profileMap[p.id] = { name: p.name || 'Anggota Grup', email: p.email || '' };
  });

  // 4. Hitung jumlah total anggota aktif per grup untuk menentukan kuorum approval
  const { data: allGroupMembers } = await adminClient
    .from('savings_group_members')
    .select('group_id, user_id, role')
    .in('group_id', filterGroupIds)
    .eq('status', 'ACTIVE');

  const groupMemberCountMap: Record<string, number> = {};
  (allGroupMembers ?? []).forEach((m: any) => {
    groupMemberCountMap[m.group_id] = (groupMemberCountMap[m.group_id] || 0) + 1;
  });

  // 5. Query riwayat approval dari audit_logs
  const { data: approvalLogs } = await adminClient
    .from('audit_logs')
    .select('entity_id, actor_user_id, action, after_data')
    .eq('entity_type', 'TRANSACTION_APPROVAL')
    .in('entity_id', pendingTxIds);

  // Query audit_logs untuk receipt_url saat CREATE
  const { data: creationLogs } = await adminClient
    .from('audit_logs')
    .select('entity_id, after_data')
    .eq('entity_type', 'TRANSACTION')
    .in('entity_id', pendingTxIds);

  const receiptMap: Record<string, string> = {};
  (creationLogs ?? []).forEach((c: any) => {
    if (c.after_data?.receipt_url) {
      receiptMap[c.entity_id] = c.after_data.receipt_url;
    }
  });

  const approvalMap: Record<string, string[]> = {};
  (approvalLogs ?? []).forEach((log: any) => {
    if (log.action === 'APPROVE') {
      if (!approvalMap[log.entity_id]) approvalMap[log.entity_id] = [];
      approvalMap[log.entity_id].push(log.actor_user_id);
    }
  });

  // 6. Petakan hasil
  return pendingRows.map((r: any) => {
    const totalMembers = groupMemberCountMap[r.group_id] || 2;
    // Kuorum persetujuan: jika grup 2 orang butuh 1 anggota lain; jika > 2 orang butuh minimal 50% anggota lain
    const otherMembers = Math.max(1, totalMembers - 1);
    const requiredApprovals = Math.max(1, Math.ceil(otherMembers / 2));

    const approvedUserIds = approvalMap[r.id] || [];
    const approvalsCount = approvedUserIds.length;
    const hasUserApproved = approvedUserIds.includes(userId);
    const isCreator = r.created_by_user_id === userId;
    const canUserApprove = !isCreator && !hasUserApproved;

    const groupObj = Array.isArray(r.savings_groups) ? r.savings_groups[0] : r.savings_groups;
    const catObj = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    const creator = profileMap[r.created_by_user_id] || { name: 'Anggota Grup', email: '' };

    return {
      id: r.id,
      groupId: r.group_id,
      groupName: groupObj?.name || 'Tabungan Bersama',
      amount: Number(r.amount),
      description: r.description,
      transactionDate: r.transaction_date,
      categoryName: catObj?.name || 'Pengeluaran Kas',
      createdByUserId: r.created_by_user_id,
      createdByName: creator.name,
      createdByEmail: creator.email,
      receiptUrl: receiptMap[r.id] ?? null,
      createdAt: r.created_at,
      approvalsCount,
      requiredApprovals,
      hasUserApproved,
      canUserApprove,
      isCreator,
      totalMembers,
    };
  });
}

/**
 * Menyetujui (Approve) pengajuan penarikan kas bersama
 */
export async function approveSharedExpenseAction(transactionId: string): Promise<{ success?: boolean; error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const adminClient = createAdminClient();

  // 1. Ambil transaksi yang sedang PENDING_APPROVAL
  const { data: tx } = await adminClient
    .from('transactions')
    .select('id, group_id, amount, created_by_user_id, status')
    .eq('id', transactionId)
    .single();

  if (!tx || tx.status !== 'PENDING_APPROVAL') {
    return { error: 'Transaksi tidak ditemukan atau sudah tidak dalam status menunggu persetujuan.' };
  }

  if (tx.created_by_user_id === user.id) {
    return { error: 'Anda tidak dapat menyetujui pengajuan yang Anda buat sendiri.' };
  }

  // 2. Verifikasi keanggotaan aktif dalam grup
  const { data: membership } = await adminClient
    .from('savings_group_members')
    .select('role, status')
    .eq('group_id', tx.group_id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return { error: 'Anda bukan anggota aktif pada tabungan bersama ini.' };
  }

  // 3. Cek apakah user sudah pernah approve
  const { data: existingApproval } = await adminClient
    .from('audit_logs')
    .select('id')
    .eq('entity_type', 'TRANSACTION_APPROVAL')
    .eq('entity_id', transactionId)
    .eq('actor_user_id', user.id)
    .eq('action', 'APPROVE')
    .maybeSingle();

  if (existingApproval) {
    return { error: 'Anda sudah menyetujui pengajuan ini sebelumnya.' };
  }

  // 4. Catat persetujuan di audit_logs
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: tx.group_id,
    entity_type: 'TRANSACTION_APPROVAL',
    entity_id: transactionId,
    action: 'APPROVE',
    after_data: {
      role: membership.role,
      approved_at: new Date().toISOString(),
    },
  });

  // 5. Cek kuorum apakah sudah memenuhi batas persetujuan
  const [{ count: totalActiveMembers }, { data: allApprovals }] = await Promise.all([
    adminClient
      .from('savings_group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', tx.group_id)
      .eq('status', 'ACTIVE'),
    adminClient
      .from('audit_logs')
      .select('actor_user_id')
      .eq('entity_type', 'TRANSACTION_APPROVAL')
      .eq('entity_id', transactionId)
      .eq('action', 'APPROVE'),
  ]);

  const memberCount = totalActiveMembers || 2;
  const otherMembers = Math.max(1, memberCount - 1);
  const requiredApprovals = Math.max(1, Math.ceil(otherMembers / 2));
  const currentApprovalsCount = (allApprovals ?? []).length;

  // Jika owner menyetujui ATAU sudah memenuhi kuorum persetujuan, aktifkan transaksi
  const isOwner = membership.role === 'OWNER';
  if (isOwner || currentApprovalsCount >= requiredApprovals) {
    await adminClient
      .from('transactions')
      .update({ status: 'ACTIVE' })
      .eq('id', transactionId);

    await adminClient.from('audit_logs').insert({
      actor_user_id: user.id,
      group_id: tx.group_id,
      entity_type: 'TRANSACTION',
      entity_id: transactionId,
      action: 'APPROVAL_COMPLETED',
      after_data: {
        final_approver: user.id,
        total_approvals: currentApprovalsCount,
        completed_at: new Date().toISOString(),
      },
    });
  }

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');

  return { success: true };
}

/**
 * Menolak (Reject) pengajuan penarikan kas bersama
 */
export async function rejectSharedExpenseAction(
  transactionId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { error: 'Alasan penolakan pengajuan wajib diisi.' };
  }

  const adminClient = createAdminClient();

  const { data: tx } = await adminClient
    .from('transactions')
    .select('id, group_id, status')
    .eq('id', transactionId)
    .single();

  if (!tx || tx.status !== 'PENDING_APPROVAL') {
    return { error: 'Transaksi tidak ditemukan atau sudah tidak dalam status menunggu persetujuan.' };
  }

  // Verifikasi keanggotaan aktif
  const { data: membership } = await adminClient
    .from('savings_group_members')
    .select('role')
    .eq('group_id', tx.group_id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return { error: 'Anda bukan anggota aktif pada tabungan bersama ini.' };
  }

  // Ubah status transaksi menjadi VOIDED dengan alasan penolakan
  await adminClient
    .from('transactions')
    .update({
      status: 'VOIDED',
      void_reason: `Ditolak oleh anggota: ${cleanReason}`,
    })
    .eq('id', transactionId);

  // Catat di audit_logs
  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: tx.group_id,
    entity_type: 'TRANSACTION_APPROVAL',
    entity_id: transactionId,
    action: 'REJECT',
    reason: cleanReason,
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/reports');

  return { success: true };
}

/**
 * Membatalkan pengajuan penarikan oleh pembuatnya sendiri
 */
export async function cancelSharedExpenseAction(transactionId: string): Promise<{ success?: boolean; error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { error: 'Sesi telah berakhir. Silakan login kembali.' };
  }

  const adminClient = createAdminClient();

  const { data: tx } = await adminClient
    .from('transactions')
    .select('id, group_id, created_by_user_id, status')
    .eq('id', transactionId)
    .single();

  if (!tx || tx.status !== 'PENDING_APPROVAL') {
    return { error: 'Transaksi tidak ditemukan atau sudah tidak dalam status menunggu persetujuan.' };
  }

  if (tx.created_by_user_id !== user.id) {
    return { error: 'Hanya pembuat pengajuan yang dapat membatalkan pengajuan ini.' };
  }

  await adminClient
    .from('transactions')
    .update({
      status: 'VOIDED',
      void_reason: 'Dibatalkan oleh pembuat pengajuan',
    })
    .eq('id', transactionId);

  await adminClient.from('audit_logs').insert({
    actor_user_id: user.id,
    group_id: tx.group_id,
    entity_type: 'TRANSACTION',
    entity_id: transactionId,
    action: 'CANCEL_REQUEST',
    reason: 'Dibatalkan sendiri oleh pembuat',
  });

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/shared');
  revalidatePath('/dashboard/transactions');

  return { success: true };
}

