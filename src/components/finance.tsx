import Link from 'next/link';
import { PiggyBank } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, EmptyState } from '@/components/ui';
import { formatRupiah, formatDate } from '@/utils/format';
import type { Tx } from '@/utils/finance';
import { VoidTransactionButton } from '@/components/VoidTransactionButton';
import { MaskableText } from '@/components/PrivacyContext';
import { ReceiptViewerButton } from '@/components/ReceiptViewerButton';

export function SummaryCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  tone: 'primary' | 'secondary' | 'accent';
  label: string;
  value: string;
  hint?: string;
}) {
  const toneCls = {
    primary: 'bg-primary-fixed text-primary',
    secondary: 'bg-secondary-container text-on-secondary-fixed-variant',
    accent: 'bg-tertiary-fixed text-tertiary',
  }[tone];
  return (
    <Card className="flex items-start gap-3.5">
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${toneCls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-caption text-caption text-on-surface-variant">{label}</p>
        <p className="font-currency-body text-xl font-bold text-on-surface mt-0.5 truncate tabular-nums">
          <MaskableText value={value} />
        </p>
        {hint && <p className="font-caption text-caption text-on-surface-variant mt-1">{hint}</p>}
      </div>
    </Card>
  );
}

function getCategoryMaterialIcon(tx: Tx): string {
  const cat = (tx.category_name || '').toLowerCase();
  const desc = (tx.description || '').toLowerCase();

  if (tx.scope_type === 'SHARED' && tx.transaction_type === 'CONTRIBUTION') {
    return 'group_work';
  }
  if (tx.transaction_type === 'INCOME') {
    if (cat.includes('bonus') || desc.includes('bonus')) return 'military_tech';
    if (cat.includes('gaji') || desc.includes('gaji')) return 'work';
    if (cat.includes('investasi')) return 'trending_up';
    return 'payments';
  }
  // Expense icons
  if (cat.includes('tagihan') || cat.includes('utilitas') || desc.includes('listrik') || desc.includes('internet')) {
    return 'bolt';
  }
  if (cat.includes('belanja') || cat.includes('makanan') || desc.includes('supermarket') || desc.includes('belanja')) {
    return 'shopping_cart';
  }
  if (cat.includes('transportasi')) return 'directions_car';
  if (cat.includes('hiburan') || cat.includes('tiket')) return 'confirmation_number';
  if (cat.includes('akomodasi')) return 'hotel';
  return 'receipt_long';
}

export function TransactionTypeBadge({ tx }: { tx: Tx }) {
  if (tx.status === 'PENDING_APPROVAL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-secondary font-caption-medium text-caption-medium border border-secondary/30">
        <span className="material-symbols-outlined text-xs leading-none">hourglass_empty</span>
        <span>Perlu Persetujuan</span>
      </span>
    );
  }
  if (tx.scope_type === 'SHARED' && tx.transaction_type === 'CONTRIBUTION') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant font-caption-medium text-caption-medium">
        <span className="material-symbols-outlined text-xs leading-none">sync_alt</span>
        <span>Setoran Grup</span>
      </span>
    );
  }
  if (tx.transaction_type === 'INCOME') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-caption-medium text-caption-medium">
        <span className="material-symbols-outlined text-xs leading-none">south_west</span>
        <span>Pemasukan</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-caption-medium text-caption-medium">
      <span className="material-symbols-outlined text-xs leading-none">north_east</span>
      <span>Pengeluaran</span>
    </span>
  );
}

export function TransactionList({
  txs,
  emptyAction,
  showVoid = true,
}: {
  txs: Tx[];
  emptyAction?: ReactNode;
  showVoid?: boolean;
}) {
  if (txs.length === 0) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Transaksi mutasi personal maupun bersama yang Anda catat akan muncul di sini."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            <th className="py-space-sm px-space-md rounded-l-lg" scope="col">
              Tanggal
            </th>
            <th className="py-space-sm px-space-md" scope="col">
              Keterangan / Entitas
            </th>
            <th className="py-space-sm px-space-md" scope="col">
              Kategori / Status
            </th>
            <th className="py-space-sm px-space-md text-right rounded-r-lg" scope="col">
              Nominal (IDR)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-low">
          {txs.map((t) => {
            const isSharedContrib = t.scope_type === 'SHARED' && t.transaction_type === 'CONTRIBUTION';
            const isIn = t.transaction_type !== 'EXPENSE';
            const iconName = getCategoryMaterialIcon(t);

            const iconBoxCls = isSharedContrib
              ? 'bg-secondary-container text-on-secondary-fixed-variant'
              : isIn
              ? 'bg-primary-fixed text-primary'
              : 'bg-tertiary-fixed text-tertiary';

            const amountTextCls = isSharedContrib
              ? 'text-secondary'
              : isIn
              ? 'text-primary'
              : 'text-tertiary';

            const scopeSubtitle =
              t.scope_type === 'SHARED'
                ? `${t.category_name || 'Kas Bersama'} • ${t.group_name || 'Tabungan Bersama'}`
                : `${t.category_name || 'Mutasi Kas'} • Saldo Pribadi`;

            const formattedAmount = `${isIn ? '+' : '−'}${formatRupiah(t.amount).replace(/\s+/g, ' ')}`;

            return (
              <tr key={t.id} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="py-space-md px-space-md font-caption-medium text-caption-medium text-on-surface-variant whitespace-nowrap">
                  {formatDate(t.transaction_date + 'T00:00:00')}
                </td>
                <td className="py-space-md px-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBoxCls}`}
                    >
                      <span className="material-symbols-outlined text-base leading-none">
                        {iconName}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body-medium text-body-medium text-on-surface font-semibold truncate">
                          {t.description || (isSharedContrib ? 'Setoran Grup' : isIn ? 'Pemasukan' : 'Pengeluaran')}
                        </span>
                        {t.receipt_url && (
                          <ReceiptViewerButton
                            receiptUrl={t.receipt_url}
                            title={t.description || (isIn ? 'Pemasukan' : 'Pengeluaran')}
                            amount={t.amount}
                            date={t.transaction_date}
                            type={t.transaction_type}
                          />
                        )}
                      </div>
                      <span className="font-caption text-caption text-on-surface-variant truncate">
                        {scopeSubtitle}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-space-md px-space-md whitespace-nowrap">
                  <TransactionTypeBadge tx={t} />
                </td>
                <td className="py-space-md px-space-md text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-2">
                    <MaskableText
                      value={formattedAmount}
                      className={`font-currency-body text-currency-body tabular-nums ${amountTextCls}`}
                    />
                    {showVoid && (
                      <VoidTransactionButton
                        txId={t.id}
                        description={t.description || (isIn ? 'Setoran/Pemasukan' : 'Pengeluaran')}
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LineChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const W = 700, H = 200;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const niceMax = Math.ceil(max / 4 / 100000) * 100000 * 4 || max;
  const compact = (v: number) =>
    v === 0
      ? 'Rp 0'
      : `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}`;

  const maxBarH = 148;
  const baseY = 170;

  return (
    <div className="w-full overflow-x-auto py-space-xs">
      <div className="min-w-[580px] h-56 flex flex-col justify-end">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full text-on-surface"
          preserveAspectRatio="none"
          role="img"
          aria-label="Grafik Batang Komparasi Arus Kas"
        >
          <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.08" x1="56" x2="680" y1="20" y2="20" />
          <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.08" x1="56" x2="680" y1="70" y2="70" />
          <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.08" x1="56" x2="680" y1="120" y2="120" />
          <line stroke="currentColor" strokeOpacity="0.15" x1="56" x2="680" y1="170" y2="170" />

          <text className="text-[11px] fill-current opacity-40 font-mono" textAnchor="end" x="48" y="24">
            {compact(niceMax)}
          </text>
          <text className="text-[11px] fill-current opacity-40 font-mono" textAnchor="end" x="48" y="74">
            {compact(niceMax * 0.66)}
          </text>
          <text className="text-[11px] fill-current opacity-40 font-mono" textAnchor="end" x="48" y="124">
            {compact(niceMax * 0.33)}
          </text>
          <text className="text-[11px] fill-current opacity-40 font-mono" textAnchor="end" x="48" y="174">
            Rp 0
          </text>

          {data.map((d, i) => {
            const step = (680 - 80) / Math.max(1, data.length);
            const groupX = 85 + i * step;
            const incH = d.income > 0 ? Math.max(6, Math.round((d.income / niceMax) * maxBarH)) : 2;
            const expH = d.expense > 0 ? Math.max(6, Math.round((d.expense / niceMax) * maxBarH)) : 2;
            return (
              <g key={d.label + i} transform={`translate(${groupX}, 0)`}>
                <rect
                  className={d.income > 0 ? 'fill-primary' : 'fill-primary opacity-30'}
                  height={incH}
                  rx={d.income > 0 ? 4 : 1}
                  width="24"
                  x="0"
                  y={baseY - incH}
                >
                  <title>{`${d.label} — Pemasukan ${formatRupiah(d.income)}`}</title>
                </rect>
                <rect
                  className={d.expense > 0 ? 'fill-tertiary-container' : 'fill-tertiary-container opacity-30'}
                  height={expH}
                  rx={d.expense > 0 ? 4 : 1}
                  width="24"
                  x="30"
                  y={baseY - expH}
                >
                  <title>{`${d.label} — Pengeluaran ${formatRupiah(d.expense)}`}</title>
                </rect>
                <text
                  className="text-[12px] fill-current opacity-75 font-sans font-medium"
                  textAnchor="middle"
                  x="27"
                  y="190"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function GroupSummaryCard({
  id,
  name,
  balance,
  target,
  members,
}: {
  id: string;
  name: string;
  balance: number;
  target: number | null;
  members?: number;
}) {
  const pct = target ? (balance / target) * 100 : null;
  return (
    <Link
      href={`/dashboard/shared?group=${id}`}
      className="block bg-surface-container-lowest border border-surface-container-highest rounded-xl p-4 hover:bg-surface-container-low transition-colors relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-fixed-variant flex items-center justify-center shrink-0">
            <PiggyBank size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-body-medium text-body-medium font-semibold text-on-surface truncate">{name}</p>
            {members != null && (
              <p className="font-caption text-caption text-on-surface-variant">{members} anggota aktif</p>
            )}
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
      </div>
      <p className="font-currency-body text-lg font-bold text-secondary mt-3 tabular-nums">
        <MaskableText value={formatRupiah(balance)} />
      </p>
      {pct != null && target ? (
        <div className="mt-2 space-y-1.5">
          <ProgressBar value={pct} />
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {Math.round(pct)}% dari target {formatRupiah(target)}
          </p>
        </div>
      ) : (
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">Target operasional aktif</p>
      )}
    </Link>
  );
}
