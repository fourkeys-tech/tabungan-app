import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadFinanceData } from '@/utils/finance';
import { getPendingApprovals } from '@/app/actions/approvals';
import { TransactionsClient } from './TransactionsClient';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
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

  const [resolvedSearchParams, { data: profile }, d, pendingApprovals] = await Promise.all([
    searchParams,
    adminClient.from('profiles').select('name').eq('id', userId).maybeSingle(),
    loadFinanceData(adminClient, userId),
    getPendingApprovals(adminClient, userId),
  ]);

  const fullName =
    profile?.name ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Nasabah TabungKu';

  // Ambil nama profil untuk user-user yang berinteraksi di transaksi bersama
  const actorUserIds = Array.from(
    new Set(
      d.txs
        .map((t) => t.contributor_user_id || t.created_by_user_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const profileMap: Record<string, string> = { [userId]: fullName };
  if (actorUserIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, name')
      .in('id', actorUserIds);
    (profiles ?? []).forEach((p: { id: string; name: string }) => {
      if (p.id && p.name) profileMap[p.id] = p.name;
    });
  }

  const enrichedTxs = d.txs.map((t) => {
    const actorId = t.contributor_user_id || t.created_by_user_id;
    return {
      ...t,
      actor_name: actorId ? profileMap[actorId] || (actorId === userId ? fullName : 'Anggota') : undefined,
    };
  });

  return (
    <TransactionsClient
      userId={userId}
      userName={fullName}
      userEmail={user.email}
      txs={enrichedTxs}
      groups={d.groups}
      categories={d.categories}
      pendingApprovals={pendingApprovals}
      initialFilterType={resolvedSearchParams?.type || 'all'}
    />
  );
}
