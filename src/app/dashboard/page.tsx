import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  loadFinanceData,
  personalBalance,
  sharedBalance,
  groupBalance,
  monthKey,
} from '@/utils/finance';
import { formatRupiah } from '@/utils/format';
import { SeedButton } from '@/components/SeedButton';
import { TransactionList } from '@/components/finance';
import { AddGeneralTransactionModal } from '@/components/AddGeneralTransactionModal';
import { AddPersonalTransactionModal } from '@/components/AddPersonalTransactionModal';
import { AddSharedTransactionModal } from '@/components/AddSharedTransactionModal';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { ExportPdfStatementButton } from '@/components/ExportPdfStatementButton';
import { PrivacyToggleButton, MaskableText } from '@/components/PrivacyContext';
import { getPendingApprovals } from '@/app/actions/approvals';
import { PendingApprovalsCard } from '@/components/PendingApprovalsCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user.id;
  const adminClient = createAdminClient();

  const [{ data: profile }, d, pendingApprovals] = await Promise.all([
    adminClient.from('profiles').select('name').eq('id', userId).maybeSingle(),
    loadFinanceData(adminClient, userId),
    getPendingApprovals(adminClient, userId),
  ]);

  const fullName =
    profile?.name ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Pengguna';

  // Tentukan bulan aktif (bulan saat ini, atau bulan transaksi terakhir jika bulan ini belum ada mutasi)
  const now = new Date();
  const currentMonthKey = monthKey(now);
  const latestTxDate = d.txs[0]?.transaction_date
    ? new Date(d.txs[0].transaction_date + 'T00:00:00')
    : now;
  const hasCurrentMonthTx = d.txs.some(
    (t) => monthKey(t.transaction_date + 'T00:00:00') === currentMonthKey
  );
  const activeDate = hasCurrentMonthTx ? now : latestTxDate;
  const activeMonthKey = monthKey(activeDate);

  const firstDay = 1;
  const lastDay = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate();
  const shortMonth = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(activeDate);
  const longMonthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(activeDate);
  const periodLabel = `Periode: ${firstDay} ${shortMonth} – ${lastDay} ${shortMonth} ${activeDate.getFullYear()}`;

  // Perhitungan Saldo Personal (terpisah secara ketat dari Saldo Bersama)
  const personalBal = personalBalance(d);
  const personalTxs = d.txs.filter((t) => t.scope_type === 'PERSONAL');
  const personalMonthTxs = personalTxs.filter(
    (t) => monthKey(t.transaction_date + 'T00:00:00') === activeMonthKey
  );
  const personalMonthIncome = personalMonthTxs
    .filter((t) => t.transaction_type === 'INCOME')
    .reduce((s, t) => s + t.amount, 0);
  const personalMonthExpense = personalMonthTxs
    .filter((t) => t.transaction_type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0);

  // Persentase pertumbuhan personal bulan ini
  const priorPersonalBal = Math.max(
    1,
    personalBal - (personalMonthIncome - personalMonthExpense)
  );
  const personalGrowthPct =
    personalMonthIncome > 0 || personalMonthExpense > 0
      ? (((personalMonthIncome - personalMonthExpense) / priorPersonalBal) * 100).toFixed(1).replace('.', ',')
      : '0,0';
  const isPersonalGrowthPositive = personalMonthIncome >= personalMonthExpense;

  // Perhitungan Saldo Bersama & Porsi Kontribusi User
  const sharedBal = sharedBalance(d);
  const userOwnSharedContribution = d.txs
    .filter(
      (t) =>
        t.scope_type === 'SHARED' &&
        t.transaction_type === 'CONTRIBUTION' &&
        (t.contributor_user_id === userId ||
          (!t.contributor_user_id && t.created_by_user_id === userId))
    )
    .reduce((s, t) => s + t.amount, 0);

  // Perhitungan Ringkasan Bulan Ini (Pemasukan vs Pengeluaran)
  const monthAllTxs = d.txs.filter(
    (t) => monthKey(t.transaction_date + 'T00:00:00') === activeMonthKey
  );
  const incomeTxs = monthAllTxs.filter((t) => t.transaction_type === 'INCOME');
  const expenseTxs = monthAllTxs.filter((t) => t.transaction_type === 'EXPENSE');

  const income = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const expense = expenseTxs.reduce((s, t) => s + t.amount, 0);

  const expenseRatio = income > 0 ? Math.round((expense / income) * 100) : 0;
  const isExpenseSafe = expenseRatio <= 50;

  const savingsRatio =
    income > 0 ? Math.max(0, Math.min(100, ((income - expense) / income) * 100)) : 0;
  const savingsRatioDisplay = savingsRatio.toFixed(1).replace('.', ',');

  // Perhitungan Arus Kas Mingguan (Minggu 1 s.d. Minggu 4 pada bulan aktif)
  const weeks = [
    { label: 'Minggu 1', income: 0, expense: 0 },
    { label: 'Minggu 2', income: 0, expense: 0 },
    { label: 'Minggu 3', income: 0, expense: 0 },
    { label: 'Minggu 4', income: 0, expense: 0 },
  ];

  for (const t of monthAllTxs) {
    const day = new Date(t.transaction_date + 'T00:00:00').getDate();
    const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    if (t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION') {
      weeks[weekIdx].income += t.amount;
    } else if (t.transaction_type === 'EXPENSE') {
      weeks[weekIdx].expense += t.amount;
    }
  }

  const maxWeekVal = Math.max(1000000, ...weeks.flatMap((w) => [w.income, w.expense]));
  const niceMaxWeek = Math.ceil(maxWeekVal / 1000000) * 1000000;
  const maxBarHeight = 140;
  const baseLineY = 170;

  const formatCompactAxis = (val: number) => {
    if (val === 0) return 'Rp 0';
    if (val >= 1000000) {
      const m = val / 1000000;
      return `Rp ${Number.isInteger(m) ? m : m.toFixed(1)}M`;
    }
    return `Rp ${Math.round(val / 1000)}K`;
  };

  const isEmpty = d.txs.length === 0 && d.groups.length === 0;

  return (
    <>
      {/* Top Greeting & Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight">
              Halo, {fullName}
            </h1>
            <span aria-label="Melambaikan tangan" className="text-2xl select-none" role="img">
              👋
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1 mt-1 text-on-surface-variant">
            <span className="font-body-medium text-body-medium font-semibold text-primary">
              {periodLabel}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <span className="flex items-center gap-1 font-caption text-caption text-on-surface-variant">
              <span className="material-symbols-outlined text-sm leading-none text-primary">
                sync
              </span>
              <span>Data sinkron &amp; terverifikasi</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <PrivacyToggleButton />
          <div className="hidden sm:flex items-center gap-1 px-space-sm py-2 rounded-lg bg-surface-container text-on-surface-variant font-caption text-caption">
            <span className="material-symbols-outlined text-base leading-none text-secondary">
              verified_user
            </span>
            <span>Data Terverifikasi</span>
          </div>
        </div>
      </header>

      {/* Onboarding Quick Seed Banner if Database is Empty */}
      {isEmpty && (
        <section
          aria-label="Panduan Pengguna Baru"
          className="rounded-2xl bg-surface-container-lowest border border-surface-container-highest p-space-md sm:p-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md shadow-xs"
        >
          <div className="flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl leading-none">auto_awesome</span>
            </div>
            <div>
              <h2 className="font-headline-h3 text-headline-h3 text-on-surface">
                Mulai Buku Kas Anda
              </h2>
              <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                Belum ada transaksi tercatat. Anda dapat langsung mencatat transaksi baru atau mengisi data contoh secara instan.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs shrink-0">
            <SeedButton />
            <CreateGroupModal triggerText="Buat Grup Bersama" variant="secondary" />
          </div>
        </section>
      )}

      {/* Structural Warning / Info Banner (Strict Separation of Funds) */}
      <section
        aria-label="Pemberitahuan Rekonsiliasi Saldo"
        className="rounded-xl bg-surface-container-low p-space-sm px-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs text-on-surface-variant shadow-sm"
      >
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-secondary leading-none text-xl shrink-0">
            account_balance
          </span>
          <p className="font-caption text-caption leading-relaxed">
            <strong className="font-semibold text-on-surface">Pemisahan Portofolio:</strong> Saldo
            personal dan saldo bersama dikelola secara terpisah untuk menjaga akuntabilitas,
            transparansi sosial, dan integritas kepemilikan dana.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm uppercase tracking-wider">
          Kebijakan Finansial v2.0
        </span>
      </section>

      {/* Multi-Approval Alert jika ada penarikan kas bersama yang butuh respon */}
      {pendingApprovals.length > 0 && (
        <PendingApprovalsCard
          items={pendingApprovals}
          title="Persetujuan Penarikan Kas Bersama Perlu Ditinjau"
        />
      )}

      {/* Saldo Utama: Personal vs Bersama */}
      <section
        aria-label="Ikhtisar Saldo Rekening"
        className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch"
      >
        {/* Kartu Saldo Personal (5 cols) */}
        <article className="lg:col-span-5 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-md bg-surface-container-low text-primary font-caption-medium text-caption-medium">
                <span className="material-symbols-outlined text-base leading-none">
                  account_balance_wallet
                </span>
                Tabungan Personal
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-xs leading-none">
                  {isPersonalGrowthPositive ? 'trending_up' : 'trending_down'}
                </span>
                {isPersonalGrowthPositive ? `+${personalGrowthPct}%` : `${personalGrowthPct}%`} bln ini
              </span>
            </div>

            <div className="mt-space-sm">
              <span className="font-caption text-caption text-on-surface-variant block">
                Saldo Terkumpul Pribadi
              </span>
              <div className="flex items-baseline gap-space-2xs mt-1">
                <MaskableText
                  value={formatRupiah(personalBal)}
                  className="font-currency-display text-currency-display text-on-surface tabular-nums tracking-tight"
                />
              </div>
            </div>
            <p className="font-caption text-caption text-on-surface-variant">
              Kepemilikan mandiri tanpa campur tangan pihak ketiga.
            </p>
          </div>

          <div className="mt-space-lg pt-space-md flex items-center justify-between gap-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Alokasi Rekening
              </span>
              <span className="font-body-medium text-body-medium text-on-surface font-semibold">
                Kas Utama •• {personalTxs.length} Mutasi
              </span>
            </div>
            <AddPersonalTransactionModal
              triggerText="+ Catat Tabungan"
              variant="card-action"
              initialCategories={d.categories.filter((c) => c.scope_type === 'PERSONAL').map((c) => c.name)}
            />
          </div>
        </article>

        {/* Kartu Saldo Bersama (7 cols) */}
        <article className="lg:col-span-7 rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Structural Teal Top Accent Indicator (Design System Directive) */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary" />

          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-space-xs">
                <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-md bg-secondary-container text-on-secondary-fixed-variant font-caption-medium text-caption-medium">
                  <span className="material-symbols-outlined text-base leading-none text-secondary">
                    groups
                  </span>
                  Tabungan Bersama ({d.groups.length} Grup)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  Multi-Pemegang
                </span>
              </div>
              <span className="font-caption text-caption text-secondary font-medium">
                Pengawasan Bersama Aktif
              </span>
            </div>

            {/* Strict Disclaimer Box */}
            <div className="rounded-lg bg-surface-container p-space-xs px-space-sm flex items-center gap-space-xs mt-1">
              <span className="material-symbols-outlined text-base leading-none text-secondary shrink-0">
                info
              </span>
              <span className="font-caption-medium text-caption-medium text-on-surface-variant">
                Saldo bersama, bukan milik pribadi Anda. Membutuhkan persetujuan anggota saat
                penarikan.
              </span>
            </div>

            <div className="mt-space-sm flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <span className="font-caption text-caption text-on-surface-variant block">
                  Total Akumulasi Seluruh Kas Grup
                </span>
                <div className="flex items-baseline gap-space-2xs mt-1">
                  <MaskableText
                    value={formatRupiah(sharedBal)}
                    className="font-currency-display text-currency-display text-secondary tabular-nums tracking-tight"
                  />
                </div>
              </div>
              <span className="font-caption text-caption text-on-surface-variant bg-surface-container-low px-space-sm py-1 rounded-md">
                Porsi Anda:{' '}
                <strong className="text-on-surface tabular-nums">
                  <MaskableText value={formatRupiah(userOwnSharedContribution)} />
                </strong>
              </span>
            </div>
          </div>

          {/* 3 Mini Breakdown Groups */}
          <div className="mt-space-md grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            {d.groups.slice(0, 3).map((g, idx) => {
              const bal = groupBalance(g, d.txs);
              const tgt = g.target_amount;
              const pct = tgt && tgt > 0 ? Math.min(100, Math.round((bal / tgt) * 100)) : null;
              const dotColors = ['bg-primary', 'bg-secondary', 'bg-tertiary-container'];
              const valColors = ['text-on-surface', 'text-secondary', 'text-on-surface'];

              return (
                <Link
                  key={g.id}
                  href={`/dashboard/shared?group=${g.id}`}
                  className="rounded-xl bg-surface-container-low hover:bg-surface-container p-space-sm flex flex-col justify-between transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-caption-medium text-caption-medium text-on-surface truncate"
                      title={g.name}
                    >
                      {g.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${dotColors[idx % 3]} shrink-0 ml-1`}
                    />
                  </div>
                  <div className="mt-space-xs">
                    <MaskableText
                      value={formatRupiah(bal)}
                      className={`font-currency-body text-currency-body ${valColors[idx % 3]} tabular-nums block`}
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant block truncate">
                      {pct != null && tgt
                        ? `${pct}% dari target ${formatRupiah(tgt)}`
                        : g.description || 'Kas bersama aktif'}
                    </span>
                  </div>
                </Link>
              );
            })}

            {d.groups.length === 0 && (
              <div className="sm:col-span-3 rounded-xl bg-surface-container-low p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                <div>
                  <span className="font-caption-medium text-caption-medium text-on-surface block">
                    Belum ada grup tabungan bersama
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Buat grup patungan, arisan, atau dana liburan bersama anggota keluarga.
                  </span>
                </div>
                <CreateGroupModal triggerText="+ Buat Grup" variant="secondary" />
              </div>
            )}
          </div>

          {/* Quick Action Footer for Shared Card */}
          <div className="mt-space-lg pt-space-md flex items-center justify-between gap-space-sm bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Tata Kelola Bersama
              </span>
              <span className="font-body-medium text-body-medium text-on-surface font-semibold">
                {d.groups.length} Grup Terdaftar •• Transparan
              </span>
            </div>
            <div className="flex items-center gap-2">
              {d.groups.length > 0 ? (
                <AddSharedTransactionModal
                  groups={d.groups.map((g) => ({ id: g.id, name: g.name }))}
                  triggerText="+ Setor / Tarik Kas"
                  variant="primary"
                  className="!h-10 !py-0 !text-sm cursor-pointer"
                  initialCategories={d.categories.filter((c) => c.scope_type === 'SHARED').map((c) => c.name)}
                />
              ) : (
                <CreateGroupModal triggerText="+ Buat Grup" variant="primary" />
              )}
            </div>
          </div>
        </article>
      </section>

      {/* Ringkasan Periode Bulan Ini (2 Summary Cards) */}
      <section
        aria-label="Ringkasan Arus Kas Masuk dan Keluar"
        className="grid grid-cols-1 md:grid-cols-2 gap-space-lg"
      >
        {/* Total Pemasukan */}
        <article className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex items-center justify-between gap-space-md transition-all hover:shadow-md">
          <div className="flex items-center gap-space-md min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl leading-none">
                arrow_downward
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-caption text-caption text-on-surface-variant">
                Pemasukan (Bulan Ini)
              </span>
              <MaskableText
                value={`+ ${formatRupiah(income)}`}
                className="font-currency-display text-currency-display text-primary tabular-nums tracking-tight truncate"
              />
              <span className="font-caption-medium text-caption-medium text-on-surface-variant mt-0.5">
                {incomeTxs.length} transaksi masuk tervalidasi
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-caption-medium text-caption-medium">
              Stabil
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              100% tercatat
            </span>
          </div>
        </article>

        {/* Total Pengeluaran */}
        <article className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex items-center justify-between gap-space-md transition-all hover:shadow-md">
          <div className="flex items-center gap-space-md min-w-0">
            <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span className="material-symbols-outlined text-2xl leading-none">arrow_upward</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-caption text-caption text-on-surface-variant">
                Pengeluaran (Bulan Ini)
              </span>
              <MaskableText
                value={`− ${formatRupiah(expense)}`}
                className="font-currency-display text-currency-display text-tertiary tabular-nums tracking-tight truncate"
              />
              <span className="font-caption-medium text-caption-medium text-on-surface-variant mt-0.5">
                {expenseRatio}% dari total pemasukan ({isExpenseSafe ? 'Aman' : 'Perlu Evaluasi'})
              </span>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-secondary font-caption-medium text-caption-medium">
              {isExpenseSafe ? 'Batas Aman' : 'Waspada'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              {isExpenseSafe ? 'Di bawah plafon 50%' : 'Melebihi plafon 50%'}
            </span>
          </div>
        </article>
      </section>

      {/* Visualisasi Arus Kas & Analisis Mingguan */}
      <section
        aria-label="Analisis Arus Kas Mingguan"
        className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface capitalize">
              Arus Kas Mingguan ({longMonthYear})
            </h2>
            <p className="font-caption text-caption text-on-surface-variant">
              Perbandingan volume penerimaan dan belanja per siklus 7 hari.
            </p>
          </div>

          {/* Legend (Teks + Simbol Bentuk untuk WCAG AA) */}
          <div className="flex items-center gap-space-md self-start sm:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-primary inline-flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[10px] leading-none">add</span>
              </span>
              <span className="font-caption-medium text-caption-medium text-on-surface">
                Pemasukan
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-tertiary-container inline-flex items-center justify-center text-on-tertiary-container">
                <span className="material-symbols-outlined text-[10px] leading-none">remove</span>
              </span>
              <span className="font-caption-medium text-caption-medium text-on-surface">
                Pengeluaran
              </span>
            </div>
          </div>
        </div>

        {/* Target Sehat Info Pill */}
        <div className="rounded-xl bg-surface-container-low p-space-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-xl leading-none">
              health_and_safety
            </span>
            <span className="font-body-medium text-body-medium text-on-surface font-semibold">
              Indikator Tabungan Sehat:
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              Rasio Tabungan tercapai{' '}
              <strong className="text-primary font-semibold">{savingsRatioDisplay}%</strong> (Target
              minimal: 30%).
            </span>
          </div>
          <div className="w-full sm:w-48 h-2 rounded-full bg-surface-container-highest overflow-hidden shrink-0">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, savingsRatio)}%` }}
            />
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="w-full overflow-x-auto py-space-xs">
          <div className="min-w-[620px] h-56 flex flex-col justify-end">
            <svg
              aria-label="Grafik Batang Komparasi Arus Kas Mingguan"
              className="w-full h-full text-on-surface"
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 700 200"
            >
              {/* Grid Lines */}
              <line
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity="0.08"
                x1="50"
                x2="680"
                y1="20"
                y2="20"
              />
              <line
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity="0.08"
                x1="50"
                x2="680"
                y1="70"
                y2="70"
              />
              <line
                stroke="currentColor"
                strokeDasharray="4 4"
                strokeOpacity="0.08"
                x1="50"
                x2="680"
                y1="120"
                y2="120"
              />
              <line
                stroke="currentColor"
                strokeOpacity="0.15"
                x1="50"
                x2="680"
                y1="170"
                y2="170"
              />

              {/* Y-Axis Labels */}
              <text
                className="text-[11px] fill-current opacity-40 font-mono"
                textAnchor="end"
                x="42"
                y="24"
              >
                {formatCompactAxis(niceMaxWeek)}
              </text>
              <text
                className="text-[11px] fill-current opacity-40 font-mono"
                textAnchor="end"
                x="42"
                y="74"
              >
                {formatCompactAxis(niceMaxWeek * 0.65)}
              </text>
              <text
                className="text-[11px] fill-current opacity-40 font-mono"
                textAnchor="end"
                x="42"
                y="124"
              >
                {formatCompactAxis(niceMaxWeek * 0.3)}
              </text>
              <text
                className="text-[11px] fill-current opacity-40 font-mono"
                textAnchor="end"
                x="42"
                y="174"
              >
                Rp 0
              </text>

              {weeks.map((w, idx) => {
                const xOffset = 100 + idx * 140;
                const incHeight =
                  w.income > 0 ? Math.max(8, Math.round((w.income / niceMaxWeek) * maxBarHeight)) : 2;
                const expHeight =
                  w.expense > 0
                    ? Math.max(8, Math.round((w.expense / niceMaxWeek) * maxBarHeight))
                    : 2;

                return (
                  <g key={w.label} transform={`translate(${xOffset}, 0)`}>
                    <rect
                      className={w.income > 0 ? 'fill-primary' : 'fill-primary opacity-30'}
                      height={incHeight}
                      rx={w.income > 0 ? 4 : 1}
                      width="30"
                      x="0"
                      y={baseLineY - incHeight}
                    >
                      <title>{`${w.label} — Pemasukan: ${formatRupiah(w.income)}`}</title>
                    </rect>
                    <rect
                      className={
                        w.expense > 0
                          ? 'fill-tertiary-container'
                          : 'fill-tertiary-container opacity-30'
                      }
                      height={expHeight}
                      rx={w.expense > 0 ? 4 : 1}
                      width="30"
                      x="36"
                      y={baseLineY - expHeight}
                    >
                      <title>{`${w.label} — Pengeluaran: ${formatRupiah(w.expense)}`}</title>
                    </rect>
                    <text
                      className={`text-[12px] fill-current ${
                        idx === 3 ? 'opacity-90 font-semibold' : 'opacity-70 font-medium'
                      } font-sans`}
                      textAnchor="middle"
                      x="33"
                      y="190"
                    >
                      {w.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Transaksi Terbaru (5 Transaksi Terakhir) */}
      <section
        aria-label="Daftar Transaksi Terbaru"
        className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between pb-space-xs">
          <div>
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface">
              Transaksi Terbaru
            </h2>
            <p className="font-caption text-caption text-on-surface-variant">
              Aktivitas keuangan mutasi personal dan grup paling mutakhir.
            </p>
          </div>
          <Link
            className="font-body-medium text-body-medium text-primary hover:text-primary-container font-semibold flex items-center gap-1 transition-colors"
            href="/dashboard/transactions"
          >
            <span>Lihat semua transaksi</span>
            <span className="material-symbols-outlined text-base leading-none">arrow_forward</span>
          </Link>
        </div>

        <TransactionList
          txs={d.txs.slice(0, 5)}
          emptyAction={
            <AddGeneralTransactionModal
              groups={d.groups.map((g) => ({ id: g.id, name: g.name }))}
              triggerText="Catat Transaksi Pertama"
              variant="primary"
              initialCategories={d.categories.map((c) => c.name)}
            />
          }
        />

        {/* Quick Action Ledger Footer */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md mt-space-2xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-caption text-caption">
            <span className="material-symbols-outlined text-sm leading-none text-primary shrink-0">
              security
            </span>
            <span>
              Semua entri transaksi terikat dengan jejak audit mutasi perbankan Indonesia.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
            <ExportPdfStatementButton
              accountName={fullName}
              accountEmail={user?.email}
              accountType="ALL"
              txs={d.txs}
              openingBalance={d.openingBalance}
              variant="ledger-footer"
              label="Cetak Rekening Koran (PDF)"
              className="w-full md:w-auto"
            />
            <ExportCsvButton
              txs={d.txs}
              accountName={fullName}
              accountEmail={user?.email}
              accountType="ALL"
              openingBalance={d.openingBalance}
              periodLabel={periodLabel}
              filename="laporan-mutasi-tabungku.csv"
              label="Unduh CSV"
              variant="ledger-footer"
              className="w-full md:w-auto"
            />
          </div>
        </div>
      </section>
    </>
  );
}
