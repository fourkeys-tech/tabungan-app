import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { TransactionForm } from './TransactionForm';

interface Props {
  searchParams: Promise<{ group_id?: string; pot_id?: string }>;
}

export default async function NewTransactionPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const adminClient = createAdminClient();

  const [{ data: memberships }, { data: dbCategories }] = await Promise.all([
    adminClient
      .from('pot_members')
      .select('savings_pots(id, name, type)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE'),
    adminClient
      .from('categories')
      .select('name')
      .order('name'),
  ]);

  const groups = (memberships ?? []).flatMap((m: any) => {
    const p = Array.isArray(m.savings_pots) ? m.savings_pots[0] : m.savings_pots;
    return p && p.type === 'SHARED' ? [{ id: p.id, name: p.name }] : [];
  });

  const personalPots = (memberships ?? []).flatMap((m: any) => {
    const p = Array.isArray(m.savings_pots) ? m.savings_pots[0] : m.savings_pots;
    return p && p.type === 'PERSONAL' ? [{ id: p.id, name: p.name }] : [];
  });

  const initialCategories = (dbCategories ?? []).map((c: any) => c.name);

  return (
    <TransactionForm
      groups={groups}
      personalPots={personalPots}
      defaultGroupId={resolvedParams?.group_id}
      defaultPotId={resolvedParams?.pot_id}
      initialCategories={initialCategories}
    />
  );
}
