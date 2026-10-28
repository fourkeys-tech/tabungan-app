import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

export type PotType = 'PERSONAL' | 'SHARED';
export type PotStatus = 'ACTIVE' | 'ARCHIVED';

export type SavingsPot = {
  id: string;
  type: PotType;
  name: string;
  description: string | null;
  opening_balance: number;
  target_amount: number | null;
  target_date: string | null;
  approval_quorum: number | null;
  status: PotStatus;
  created_by: string;
  role: 'OWNER' | 'MEMBER';
  balance: number;
  total_income: number;
  total_expense: number;
  total_contribution: number;
  progress_pct: number | null;
};

// Alias Group kompatibel dengan v2.0
export type Group = {
  id: string;
  name: string;
  description: string | null;
  opening_balance: number;
  target_amount: number | null;
  target_date: string | null;
  role: string;
  approval_quorum?: number | null;
};

export type Tx = {
  id: string;
  pot_id: string;
  pot_name?: string | null;
  pot_type?: PotType | null;
  // Backward compatibility alias:
  group_id?: string | null;
  personal_ledger_id?: string | null;
  scope_type?: 'PERSONAL' | 'SHARED';
  group_name?: string | null;
  
  transaction_type: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION';
  amount: number;
  transaction_date: string;
  description: string | null;
  category_id?: string | null;
  category_name: string | null;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'VOIDED';
  void_reason?: string | null;
  receipt_url?: string | null;
  payment_method?: string | null;
  created_by_user_id: string;
  contributor_user_id?: string | null;
  actor_name?: string;
};

export type CategoryItem = {
  id: string;
  name: string;
  scope_type?: 'PERSONAL' | 'SHARED' | 'BOTH';
  transaction_type: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION' | null;
  owner_user_id?: string | null;
  pot_id?: string | null;
};

export type FinanceData = {
  pots: SavingsPot[];
  groups: Group[];
  txs: Tx[];
  categories: CategoryItem[];
  ledgerId: string | null;
  openingBalance: number;
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

/** Memuat semua data pos tabungan dan transaksi terpadu milik pengguna */
export async function loadFinanceData(
  supabase: SupabaseClient | null,
  userId: string
): Promise<FinanceData> {
  const db = createAdminClient();

  const [{ data: memberships }, { data: dbCategories }] = await Promise.all([
    db
      .from('pot_members')
      .select('role, savings_pots(*)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE'),
    db
      .from('categories')
      .select('id, name, scope_type, transaction_type, owner_user_id')
      .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
      .order('name', { ascending: true }),
  ]);

  const rawPots: (SavingsPot & { rawPot: any })[] = (memberships ?? []).flatMap((m: any) => {
    const p = Array.isArray(m.savings_pots) ? m.savings_pots[0] : m.savings_pots;
    if (!p) return [];
    return [
      {
        id: p.id,
        type: p.type,
        name: p.name,
        description: p.description,
        opening_balance: Number(p.opening_balance || 0),
        target_amount: p.target_amount ? Number(p.target_amount) : null,
        target_date: p.target_date,
        approval_quorum: p.approval_quorum,
        status: p.status,
        created_by: p.created_by,
        role: m.role || 'MEMBER',
        balance: Number(p.opening_balance || 0),
        total_income: 0,
        total_expense: 0,
        total_contribution: 0,
        progress_pct: null,
        rawPot: p,
      },
    ];
  });

  const potIds = rawPots.map((p) => p.id);
  let allTxs: Tx[] = [];

  if (potIds.length > 0) {
    const { data: txRows } = await db
      .from('transactions')
      .select('*, profiles!transactions_created_by_user_id_fkey(name, email)')
      .in('pot_id', potIds)
      .order('transaction_date', { ascending: false });

    const potMap = new Map(rawPots.map((p) => [p.id, p]));

    allTxs = (txRows ?? []).map((r: any) => {
      const pot = potMap.get(r.pot_id);
      const actorName = r.profiles?.name || r.profiles?.email?.split('@')[0] || 'Pengguna';
      return {
        id: r.id,
        pot_id: r.pot_id,
        pot_name: pot ? pot.name : 'Pos',
        pot_type: pot ? pot.type : 'PERSONAL',
        group_id: pot?.type === 'SHARED' ? r.pot_id : null,
        personal_ledger_id: pot?.type === 'PERSONAL' ? r.pot_id : null,
        scope_type: pot ? pot.type : 'PERSONAL',
        group_name: pot ? pot.name : null,
        transaction_type: r.transaction_type,
        amount: Number(r.amount || 0),
        transaction_date: r.transaction_date,
        description: r.description,
        category_id: r.category_id,
        category_name: r.category_name,
        status: r.status,
        void_reason: r.void_reason,
        receipt_url: r.receipt_url,
        payment_method: r.payment_method,
        created_by_user_id: r.created_by_user_id,
        contributor_user_id: r.contributor_user_id,
        actor_name: actorName,
      };
    });

    for (const t of allTxs) {
      if (t.status !== 'ACTIVE') continue;
      const pot = potMap.get(t.pot_id);
      if (!pot) continue;

      if (t.transaction_type === 'INCOME') {
        pot.balance += t.amount;
        pot.total_income += t.amount;
      } else if (t.transaction_type === 'CONTRIBUTION') {
        pot.balance += t.amount;
        pot.total_contribution += t.amount;
      } else if (t.transaction_type === 'EXPENSE') {
        pot.balance -= t.amount;
        pot.total_expense += t.amount;
      }
    }

    for (const pot of rawPots) {
      if (pot.target_amount && pot.target_amount > 0) {
        pot.progress_pct = Math.round((pot.balance / pot.target_amount) * 100);
      }
    }
  }

  const groups: Group[] = rawPots
    .filter((p) => p.type === 'SHARED')
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      opening_balance: p.opening_balance,
      target_amount: p.target_amount,
      target_date: p.target_date,
      role: p.role,
      approval_quorum: p.approval_quorum,
    }));

  const personalPot = rawPots.find((p) => p.type === 'PERSONAL');

  return {
    pots: rawPots,
    groups,
    txs: allTxs,
    categories: (dbCategories ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      scope_type: c.scope_type,
      transaction_type: c.transaction_type ?? null,
      owner_user_id: c.owner_user_id,
    })),
    ledgerId: personalPot ? personalPot.id : null,
    openingBalance: personalPot ? personalPot.opening_balance : 0,
  };
}

/** Menghitung total saldo seluruh pos personal aktif milik pengguna */
export function totalPersonalBalance(pots: SavingsPot[]): number {
  return pots
    .filter((p) => p.type === 'PERSONAL' && p.status === 'ACTIVE')
    .reduce((sum, p) => sum + p.balance, 0);
}

/** Menghitung total saldo seluruh pos bersama aktif yang diikuti pengguna */
export function totalSharedBalance(pots: SavingsPot[]): number {
  return pots
    .filter((p) => p.type === 'SHARED' && p.status === 'ACTIVE')
    .reduce((sum, p) => sum + p.balance, 0);
}

/** Backward-compatibility aliases for v2.0 pages */
export function personalBalance(data: FinanceData): number {
  return totalPersonalBalance(data.pots);
}

export function sharedBalance(data: FinanceData): number {
  return totalSharedBalance(data.pots);
}

export function groupBalance(groupOrId: string | Group, dataOrTxs: FinanceData | Tx[]): number {
  const targetId = typeof groupOrId === 'string' ? groupOrId : groupOrId?.id;
  if (Array.isArray(dataOrTxs)) {
    return dataOrTxs
      .filter((t) => (t.pot_id === targetId || t.group_id === targetId) && t.status === 'ACTIVE')
      .reduce((sum, t) => {
        if (t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION') return sum + t.amount;
        if (t.transaction_type === 'EXPENSE') return sum - t.amount;
        return sum;
      }, 0);
  }
  const pot = dataOrTxs?.pots?.find((p) => p.id === targetId);
  return pot ? pot.balance : 0;
}

export function monthKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
