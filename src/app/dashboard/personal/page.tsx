import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadFinanceData, personalBalance } from '@/utils/finance';
import { PersonalLedgerClient } from './PersonalLedgerClient';
import type { CategoryData } from '@/components/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function PersonalLedgerPage() {
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

  const balance = personalBalance(d);
  const personalTxs = d.txs.filter((t) => t.scope_type === 'PERSONAL');

  const accountName =
    profile?.name ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Nasabah TabungKu';

  const mappedCategories: CategoryData[] = d.categories.map((c) => ({
    id: c.id,
    name: c.name,
    scope_type: c.scope_type === 'SHARED' ? 'SHARED' : 'PERSONAL',
    transaction_type: c.transaction_type,
    owner_user_id: c.owner_user_id,
  }));

  return (
    <PersonalLedgerClient
      userId={userId}
      accountName={accountName}
      accountEmail={user?.email}
      balance={balance}
      openingBalance={d.openingBalance}
      personalTxs={personalTxs}
      categories={mappedCategories}
    />
  );
}
