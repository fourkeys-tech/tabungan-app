import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadFinanceData } from '@/utils/finance';
import { getPendingApprovals } from '@/app/actions/approvals';
import { formatRupiah, formatDate } from '@/utils/format';
import {
  SharedLedgerClient,
  type GroupMemberInfo,
  type SharedAuditLogItem,
} from './SharedLedgerClient';
import type { CategoryData } from '@/components/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function SharedLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user.id;
  const adminClient = createAdminClient();

  const resolvedSearchParams = await searchParams;
  const targetGroupParam = resolvedSearchParams?.group;

  const [d, pendingApprovals] = await Promise.all([
    loadFinanceData(adminClient, userId),
    getPendingApprovals(adminClient, userId),
  ]);

  const groupIds = d.groups.map((g) => g.id);

  const membersByGroup: Record<string, GroupMemberInfo[]> = {};
  const userNamesById: Record<string, string> = {};
  const auditLogsByGroup: Record<string, SharedAuditLogItem[]> = {};

  if (groupIds.length > 0) {
    const [{ data: membersRaw }, { data: auditRaw }] = await Promise.all([
      adminClient
        .from('savings_group_members')
        .select('id, group_id, user_id, role, status, joined_at, profiles(name, email)')
        .in('group_id', groupIds)
        .eq('status', 'ACTIVE'),
      adminClient
        .from('audit_logs')
        .select('id, actor_user_id, group_id, entity_type, action, after_data, reason, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    (membersRaw ?? []).forEach((m: any) => {
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const name = prof?.name || 'Anggota Grup';
      userNamesById[m.user_id] = name;

      const item: GroupMemberInfo = {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role,
        name,
        email: prof?.email || '',
        joined_at: m.joined_at,
      };

      if (!membersByGroup[m.group_id]) {
        membersByGroup[m.group_id] = [];
      }
      membersByGroup[m.group_id].push(item);
    });

    (auditRaw ?? []).forEach((a: any) => {
      if (!a.group_id) return;
      const actorName = userNamesById[a.actor_user_id] || 'Anggota';
      let title = 'Aktivitas Buku Kas Tercatat';
      let description = a.reason || `Tindakan ${a.action} oleh ${actorName}.`;
      let dotColor: 'primary' | 'secondary' | 'outline' = 'secondary';

      if (a.action === 'CREATE' && a.entity_type === 'TRANSACTION') {
        const amt = a.after_data?.amount
          ? formatRupiah(Number(a.after_data.amount))
          : '';
        if (a.after_data?.receipt_url) {
          title = 'Catatan & Bukti Pembayaran Diunggah';
          description = `Transaksi ${amt} oleh ${actorName} beserta lampiran bukti transfer.`;
          dotColor = 'outline';
        } else {
          title = 'Setoran / Mutasi Terverifikasi Otomatis';
          description = `Transaksi ${amt} dari ${actorName} tercatat ke buku kas bersama.`;
          dotColor = 'primary';
        }
      } else if (a.action === 'APPROVE') {
        title = 'Persetujuan Penarikan Kas';
        description = `${actorName} menyetujui pengajuan penarikan dana bersama.`;
        dotColor = 'secondary';
      } else if (a.action === 'VOID') {
        title = 'Pembatalan Transaksi (Void)';
        description = `Transaksi dibatalkan oleh ${actorName}: ${
          a.reason || 'Koreksi buku kas'
        }.`;
        dotColor = 'outline';
      } else if (a.action === 'INVITE') {
        title = 'Undangan Anggota Baru';
        description = `${actorName} membuat tautan undangan anggota grup.`;
        dotColor = 'secondary';
      }

      const logItem: SharedAuditLogItem = {
        id: a.id,
        group_id: a.group_id,
        action: a.action,
        title,
        description,
        timestamp: a.created_at ? formatDate(a.created_at) : 'Baru saja',
        dotColor,
      };

      if (!auditLogsByGroup[a.group_id]) {
        auditLogsByGroup[a.group_id] = [];
      }
      auditLogsByGroup[a.group_id].push(logItem);
    });
  }

  const sharedTxs = d.txs
    .filter((t) => t.scope_type === 'SHARED')
    .map((t) => {
      const uid = t.contributor_user_id || t.created_by_user_id || '';
      return {
        ...t,
        actor_name: userNamesById[uid] || 'Anggota Grup',
      };
    });

  const mappedCategories: CategoryData[] = d.categories.map((c) => ({
    id: c.id,
    name: c.name,
    scope_type: c.scope_type === 'SHARED' ? 'SHARED' : 'PERSONAL',
    transaction_type: c.transaction_type,
    owner_user_id: c.owner_user_id,
  }));

  return (
    <SharedLedgerClient
      userId={userId}
      initialSelectedGroupId={targetGroupParam || d.groups[0]?.id}
      groups={d.groups}
      sharedTxs={sharedTxs}
      membersByGroup={membersByGroup}
      auditLogsByGroup={auditLogsByGroup}
      pendingApprovals={pendingApprovals}
      categories={mappedCategories}
    />
  );
}
