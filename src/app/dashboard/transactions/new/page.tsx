import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { TransactionForm } from './TransactionForm';

interface Props {
  searchParams: Promise<{ group_id?: string }>;
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
      .from('savings_group_members')
      .select('savings_groups(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE'),
    adminClient
      .from('categories')
      .select('name')
      .order('name'),
  ]);

  const groups = (memberships ?? []).flatMap((m: any) => {
    const g = Array.isArray(m.savings_groups) ? m.savings_groups[0] : m.savings_groups;
    return g ? [{ id: g.id, name: g.name }] : [];
  });

  const initialCategories = (dbCategories ?? []).map((c: any) => c.name);

  return (
    <TransactionForm
      groups={groups}
      defaultGroupId={resolvedParams?.group_id}
      initialCategories={initialCategories}
    />
  );
}
