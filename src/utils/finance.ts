import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

export type Tx = {
  id: string;
  scope_type: 'PERSONAL' | 'SHARED';
  transaction_type: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION';
  amount: number;
  transaction_date: string;
  description: string | null;
  group_id: string | null;
  personal_ledger_id: string | null;
  created_by_user_id: string | null;
  contributor_user_id?: string | null;
  group_name: string | null;
  category_name: string | null;
  status?: 'ACTIVE' | 'VOIDED' | 'PENDING_APPROVAL' | 'REJECTED';
  void_reason?: string | null;
  receipt_url?: string | null;
  payment_method?: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  opening_balance: number;
  target_amount: number | null;
  target_date: string | null;
  role: string;
};

export type CategoryItem = {
  id: string;
  name: string;
  scope_type: 'PERSONAL' | 'SHARED' | 'BOTH';
  transaction_type: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION' | null;
  owner_user_id?: string | null;
};

export type FinanceData = {
  ledgerId: string | null;
  openingBalance: number;
  groups: Group[];
  txs: Tx[];
  categories: CategoryItem[];
};

export const BASELINE_CATEGORIES = {
  personal_in: ['Gaji', 'Bonus', 'Investasi', 'Penjualan', 'Hadiah', 'Lainnya'],
  personal_out: [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Tagihan & Utilitas',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
    'Lainnya',
  ],
  shared_in: ['Setoran Rutin', 'Patungan', 'Modal Awal', 'Tabungan Ekstra', 'Lainnya'],
  shared_out: [
    'Konsumsi Bersama',
    'Akomodasi',
    'Transportasi Tim',
    'Perlengkapan',
    'Tiket & Masuk',
    'Lainnya',
  ],
};

/** Memuat semua data keuangan milik user dengan isolasi data terverifikasi. */
export async function loadFinanceData(
  supabase: SupabaseClient | null,
  userId: string
): Promise<FinanceData> {
  const db = createAdminClient();

  const [{ data: ledger }, { data: memberships }, { data: dbCategories }] = await Promise.all([
    db.from('personal_ledgers').select('id, opening_balance').eq('user_id', userId).maybeSingle(),
    db
      .from('savings_group_members')
      .select('role, savings_groups(id, name, description, opening_balance, target_amount, target_date)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE'),
    db
      .from('categories')
      .select('id, name, scope_type, transaction_type, owner_user_id')
      .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
      .order('name', { ascending: true }),
  ]);

  const groups: Group[] = (memberships ?? []).flatMap((m: any) => {
    const g = Array.isArray(m.savings_groups) ? m.savings_groups[0] : m.savings_groups;
    return g
      ? [
          {
            id: g.id,
            name: g.name,
            description: g.description,
            opening_balance: Number(g.opening_balance ?? 0),
            target_amount: g.target_amount != null ? Number(g.target_amount) : null,
            target_date: g.target_date,
            role: m.role,
          },
        ]
      : [];
  });

  const groupIds = groups.map((g) => g.id);

  const { data: rows } = await db
    .from('transactions')
    .select(
      'id, scope_type, transaction_type, amount, transaction_date, description, group_id, personal_ledger_id, created_by_user_id, contributor_user_id, status, void_reason, savings_groups(name), categories(name)'
    )
    .in('status', ['ACTIVE', 'VOIDED', 'PENDING_APPROVAL'])
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2000);

  const validRows = (rows ?? []).filter((r: any) => {
    if (r.scope_type === 'PERSONAL') {
      return r.personal_ledger_id === ledger?.id || r.created_by_user_id === userId;
    }
    if (r.scope_type === 'SHARED') {
      return groupIds.includes(r.group_id);
    }
    return false;
  });

  // Query audit_logs untuk receipt_url jika ada
  const txIds = validRows.map((r: any) => r.id);
  const receiptMap: Record<string, string> = {};

  if (txIds.length > 0) {
    const { data: auditRows } = await db
      .from('audit_logs')
      .select('entity_id, after_data')
      .eq('entity_type', 'TRANSACTION')
      .in('entity_id', txIds);

    (auditRows ?? []).forEach((a: any) => {
      if (a.after_data?.receipt_url) {
        receiptMap[a.entity_id] = a.after_data.receipt_url;
      }
    });
  }

  const txs: Tx[] = validRows.map((r: any) => ({
    id: r.id,
    scope_type: r.scope_type,
    transaction_type: r.transaction_type,
    amount: Number(r.amount),
    transaction_date: r.transaction_date,
    description: r.description,
    group_id: r.group_id,
    personal_ledger_id: r.personal_ledger_id,
    created_by_user_id: r.created_by_user_id,
    contributor_user_id: r.contributor_user_id ?? null,
    status: r.status ?? 'ACTIVE',
    void_reason: r.void_reason ?? null,
    receipt_url: receiptMap[r.id] ?? null,
    payment_method: r.payment_method ?? null,
    group_name: (Array.isArray(r.savings_groups) ? r.savings_groups[0] : r.savings_groups)?.name ?? null,
    category_name: (Array.isArray(r.categories) ? r.categories[0] : r.categories)?.name ?? null,
  }));

  const categories: CategoryItem[] = (dbCategories ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    scope_type: c.scope_type,
    transaction_type: c.transaction_type ?? null,
    owner_user_id: c.owner_user_id ?? null,
  }));

  return {
    ledgerId: ledger?.id ?? null,
    openingBalance: Number(ledger?.opening_balance ?? 0),
    groups,
    txs,
    categories,
  };
}

export function personalBalance(d: FinanceData): number {
  return d.txs
    .filter((t) => t.scope_type === 'PERSONAL' && t.status !== 'VOIDED' && t.status !== 'PENDING_APPROVAL')
    .reduce((s, t) => s + (t.transaction_type === 'INCOME' ? t.amount : -t.amount), d.openingBalance);
}

export function groupBalance(g: Group, txs: Tx[]): number {
  return txs
    .filter((t) => t.group_id === g.id && t.status !== 'VOIDED' && t.status !== 'PENDING_APPROVAL')
    .reduce((s, t) => s + (t.transaction_type === 'EXPENSE' ? -t.amount : t.amount), g.opening_balance);
}

export function sharedBalance(d: FinanceData): number {
  return d.groups.reduce((s, g) => s + groupBalance(g, d.txs), 0);
}

export function monthKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Pemasukan & pengeluaran per bulan untuk n bulan terakhir dengan dukungan filter scope. */
export function monthlySeries(txs: Tx[], months = 6, scope: 'ALL' | 'PERSONAL' | 'SHARED' = 'ALL') {
  const now = new Date();
  const out: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
      income: 0,
      expense: 0,
    });
  }
  for (const t of txs) {
    if (t.status === 'VOIDED' || t.status === 'PENDING_APPROVAL') continue;
    if (scope === 'PERSONAL' && t.scope_type !== 'PERSONAL') continue;
    if (scope === 'SHARED' && t.scope_type !== 'SHARED') continue;
    const row = out.find((o) => o.key === monthKey(t.transaction_date + 'T00:00:00'));
    if (!row) continue;
    if (t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION') {
      row.income += t.amount;
    } else if (t.transaction_type === 'EXPENSE') {
      row.expense += t.amount;
    }
  }
  return out;
}
