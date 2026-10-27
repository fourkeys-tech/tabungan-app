import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadFinanceData } from '@/utils/finance';
import { ReportsClient } from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user.id;
  const adminClient = createAdminClient();

  const [{ data: profile }, d] = await Promise.all([
    adminClient.from('profiles').select('name').eq('id', userId).maybeSingle(),
    loadFinanceData(adminClient, userId),
  ]);

  const fullName =
    profile?.name ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Nasabah TabungKu';

  return (
    <ReportsClient
      userName={fullName}
      userEmail={user.email}
      txs={d.txs}
      groups={d.groups}
      openingBalance={d.openingBalance}
    />
  );
}
