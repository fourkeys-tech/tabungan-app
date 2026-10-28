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
  // 1. Ambil pos bersama aktif yang diikuti pengguna
  const { data: memberships } = await adminClient
    .from('pot_members')
    .select('pot_id, role, savings_pots(id, name, type, approval_quorum)')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  const sharedPots = (memberships ?? [])
    .filter((m: any) => m.savings_pots?.type === 'SHARED')
    .map((m: any) => m.savings_pots);

  const myGroupIds = sharedPots.map((p: any) => p.id);
  if (myGroupIds.length === 0) return [];

  const filterGroupIds = targetGroupId ? [targetGroupId] : myGroupIds;

  // 2. Query transaksi dengan status PENDING_APPROVAL
  const { data: pendingRows } = await adminClient
    .from('transactions')
    .select(
      'id, pot_id, amount, description, transaction_date, created_at, created_by_user_id, receipt_url, category_name, savings_pots(name, approval_quorum)'
    )
    .eq('status', 'PENDING_APPROVAL')
    .in('pot_id', filterGroupIds)
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
    profileMap[p.id] = { name: p.name || 'Anggota Pos', email: p.email || '' };
  });

  // 4. Hitung jumlah total anggota aktif per pos
  const { data: allPotMembers } = await adminClient
    .from('pot_members')
    .select('pot_id, user_id, role')
    .in('pot_id', filterGroupIds)
    .eq('status', 'ACTIVE');

  const potMemberCountMap: Record<string, number> = {};
  (allPotMembers ?? []).forEach((m: any) => {
    potMemberCountMap[m.pot_id] = (potMemberCountMap[m.pot_id] || 0) + 1;
  });

  // 5. Query persetujuan dari transaction_approvals
  const { data: approvalsData } = await adminClient
    .from('transaction_approvals')
    .select('transaction_id, voter_user_id, decision')
    .in('transaction_id', pendingTxIds);

  const approvalMap: Record<string, string[]> = {};
  (approvalsData ?? []).forEach((row: any) => {
    if (row.decision === 'APPROVE') {
      if (!approvalMap[row.transaction_id]) approvalMap[row.transaction_id] = [];
      approvalMap[row.transaction_id].push(row.voter_user_id);
    }
  });

  // 6. Petakan hasil
  return pendingRows.map((r: any) => {
    const totalMembers = potMemberCountMap[r.pot_id] || 2;
    const potObj = Array.isArray(r.savings_pots) ? r.savings_pots[0] : r.savings_pots;
    
    // Kuorum persetujuan (default to pot approval_quorum, fallback to 2)
    const requiredApprovals = potObj?.approval_quorum || Math.max(1, Math.min(2, totalMembers - 1));

    const approvedUserIds = approvalMap[r.id] || [];
    const approvalsCount = approvedUserIds.length;
    const hasUserApproved = approvedUserIds.includes(userId);
    const isCreator = r.created_by_user_id === userId;
    const canUserApprove = !isCreator && !hasUserApproved;

    const creator = profileMap[r.created_by_user_id] || { name: 'Anggota Pos', email: '' };

    return {
      id: r.id,
      groupId: r.pot_id,
      groupName: potObj?.name || 'Tabungan Bersama',
      amount: Number(r.amount),
      description: r.description,
      transactionDate: r.transaction_date,
      categoryName: r.category_name || 'Pengeluaran Kas',
      createdByUserId: r.created_by_user_id,
      createdByName: creator.name,
      createdByEmail: creator.email,
      receiptUrl: r.receipt_url ?? null,
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
    .select('id, pot_id, amount, created_by_user_id, status, savings_pots(approval_quorum)')
    .eq('id', transactionId)
    .single();

  if (!tx || tx.status !== 'PENDING_APPROVAL') {
    return { error: 'Transaksi tidak ditemukan atau sudah tidak dalam status menunggu persetujuan.' };
  }

  if (tx.created_by_user_id === user.id) {
    return { error: 'Anda tidak dapat menyetujui pengajuan yang Anda buat sendiri.' };
  }

  // 2. Verifikasi keanggotaan aktif dalam pos
  const { data: membership } = await adminClient
    .from('pot_members')
    .select('role, status')
    .eq('pot_id', tx.pot_id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return { error: 'Anda bukan anggota aktif pada pos tabungan ini.' };
  }

  // 3. Simpan voting di transaction_approvals
  const { error: approvalErr } = await adminClient
    .from('transaction_approvals')
    .upsert({
      transaction_id: transactionId,
      voter_user_id: user.id,
      decision: 'APPROVE',
    }, { onConflict: 'transaction_id,voter_user_id' });

  if (approvalErr) {
    return { error: 'Gagal mencatat persetujuan: ' + approvalErr.message };
  }

  // 4. Catat persetujuan di audit_logs
  await adminClient.from('audit_logs').insert({
    pot_id: tx.pot_id,
    actor_user_id: user.id,
    entity_type: 'TRANSACTION_APPROVAL',
    entity_id: transactionId,
    action: 'APPROVE',
    after_data: {
      role: membership.role,
      approved_at: new Date().toISOString(),
    },
    reason: `Menyetujui pengajuan penarikan`,
  });

  // 5. Cek kuorum apakah sudah memenuhi batas persetujuan
  const [{ data: allApprovals }, { count: totalActiveMembers }] = await Promise.all([
    adminClient
      .from('transaction_approvals')
      .select('voter_user_id')
      .eq('transaction_id', transactionId)
      .eq('decision', 'APPROVE'),
    adminClient
      .from('pot_members')
      .select('id', { count: 'exact', head: true })
      .eq('pot_id', tx.pot_id)
      .eq('status', 'ACTIVE'),
  ]);

  const potObj = Array.isArray(tx.savings_pots) ? tx.savings_pots[0] : tx.savings_pots;
  const memberCount = totalActiveMembers || 2;
  const requiredApprovals = potObj?.approval_quorum || Math.max(1, Math.min(2, memberCount - 1));
  const currentApprovalsCount = (allApprovals ?? []).length;

  // Jika owner menyetujui ATAU sudah memenuhi kuorum persetujuan, aktifkan transaksi
  const isOwner = membership.role === 'OWNER';
  if (isOwner || currentApprovalsCount >= requiredApprovals) {
    await adminClient
      .from('transactions')
      .update({ status: 'ACTIVE' })
      .eq('id', transactionId);

    await adminClient.from('audit_logs').insert({
      pot_id: tx.pot_id,
      actor_user_id: user.id,
      entity_type: 'TRANSACTION',
      entity_id: transactionId,
      action: 'APPROVAL_COMPLETED',
      after_data: {
        final_approver: user.id,
        total_approvals: currentApprovalsCount,
        completed_at: new Date().toISOString(),
      },
      reason: `Kuorum persetujuan terpenuhi (${currentApprovalsCount}/${requiredApprovals})`,
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
    .select('id, pot_id, status')
    .eq('id', transactionId)
    .single();

  if (!tx || tx.status !== 'PENDING_APPROVAL') {
    return { error: 'Transaksi tidak ditemukan atau sudah tidak dalam status menunggu persetujuan.' };
  }

  // Verifikasi keanggotaan aktif
  const { data: membership } = await adminClient
    .from('pot_members')
    .select('role')
    .eq('pot_id', tx.pot_id)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!membership) {
    return { error: 'Anda bukan anggota aktif pada pos tabungan ini.' };
  }

  // Simpan penolakan di transaction_approvals
  await adminClient
    .from('transaction_approvals')
    .upsert({
      transaction_id: transactionId,
      voter_user_id: user.id,
      decision: 'REJECT',
    }, { onConflict: 'transaction_id,voter_user_id' });

  // Ubah status transaksi menjadi REJECTED
  await adminClient
    .from('transactions')
    .update({
      status: 'REJECTED',
      void_reason: `Ditolak oleh anggota: ${cleanReason}`,
    })
    .eq('id', transactionId);

  // Catat di audit_logs
  await adminClient.from('audit_logs').insert({
    pot_id: tx.pot_id,
    actor_user_id: user.id,
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
    .select('id, pot_id, created_by_user_id, status')
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
    pot_id: tx.pot_id,
    actor_user_id: user.id,
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
