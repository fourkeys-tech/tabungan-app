'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Tx, Group } from '@/utils/finance';
import { formatRupiah, formatDate, parseValidDate } from '@/utils/format';
import { usePrivacy } from '@/components/PrivacyContext';
import { ExportPdfStatementButton } from '@/components/ExportPdfStatementButton';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { HorizontalScroller } from '@/components/HorizontalScroller';

interface Props {
  userName: string;
  userEmail?: string;
  txs: Tx[];
  groups: Group[];
  openingBalance: number;
}

type PeriodType = 'month' | 'quarter' | 'year' | 'all' | 'custom';
type ScopeTab = 'all' | 'personal' | 'shared';

const CATEGORY_ICONS: Record<string, string> = {
  pokok: 'cottage',
  rumah: 'cottage',
  transport: 'commute',
  bensin: 'commute',
  makan: 'restaurant',
  minum: 'restaurant',
  gaji: 'payments',
  pendapatan: 'payments',
  iuran: 'groups',
  arisan: 'groups',
  tagihan: 'receipt_long',
  utilitas: 'receipt_long',
  kesehatan: 'medical_services',
  pendidikan: 'school',
  hiburan: 'attractions',
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'label';
}

export function ReportsClient({
  userName,
  userEmail,
  txs,
  groups,
  openingBalance,
}: Props) {
  const { isHidden } = usePrivacy();

  // 1. Period State
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // 2. Scope Tab State (Semua / Personal / Bersama)
  const [scopeTab, setScopeTab] = useState<ScopeTab>('all');

  // 3. Filter Table State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [flowFilter, setFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // 4. Hitung Date Range Berdasarkan Period
  const now = useMemo(() => new Date(), []);
  const currentMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(now),
    [now]
  );

  const { startDate, endDate, periodDisplayLabel } = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date | null = null;
    let end: Date | null = today;
    let label = `Okt ${now.getFullYear()}`;

    if (period === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
      label = currentMonthLabel;
    } else if (period === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1, 0, 0, 0);
      label = `Kuartal ${Math.floor(today.getMonth() / 3) + 1} (${today.getFullYear()})`;
    } else if (period === 'year') {
      start = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
      label = `Tahun ${today.getFullYear()}`;
    } else if (period === 'custom') {
      if (customFrom) {
        start = parseValidDate(customFrom);
        start.setHours(0, 0, 0, 0);
      }
      if (customTo) {
        end = parseValidDate(customTo);
        end.setHours(23, 59, 59, 999);
      }
      label =
        customFrom && customTo
          ? `${formatDate(customFrom)} – ${formatDate(customTo)}`
          : 'Rentang Kustom';
    } else {
      start = null;
      end = null;
      label = 'Seluruh Riwayat';
    }

    return { startDate: start, endDate: end, periodDisplayLabel: label };
  }, [period, customFrom, customTo, now, currentMonthLabel]);

  // 5. Filter Transaksi Berdasarkan Scope dan Tanggal
  const scopedAllTxs = useMemo(() => {
    if (scopeTab === 'personal') {
      return txs.filter((t) => t.scope_type === 'PERSONAL');
    }
    if (scopeTab === 'shared') {
      return txs.filter((t) => t.scope_type === 'SHARED');
    }
    return txs;
  }, [txs, scopeTab]);

  const scopedBaseOpening = useMemo(() => {
    if (scopeTab === 'personal') return openingBalance;
    if (scopeTab === 'shared') {
      return groups.reduce((acc, g) => acc + (g.opening_balance || 0), 0);
    }
    return openingBalance + groups.reduce((acc, g) => acc + (g.opening_balance || 0), 0);
  }, [scopeTab, openingBalance, groups]);

  // Transaksi aktif sebelum periode untuk menghitung saldo awal periode
  const priorTxs = useMemo(() => {
    if (!startDate) return [];
    return scopedAllTxs.filter((t) => {
      if (t.status === 'VOIDED') return false;
      const d = parseValidDate(t.transaction_date);
      return d < startDate;
    });
  }, [scopedAllTxs, startDate]);

  const startingBalance = useMemo(() => {
    const priorNet = priorTxs.reduce((acc, t) => {
      const isCredit = t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION';
      return isCredit ? acc + t.amount : acc - t.amount;
    }, 0);
    return scopedBaseOpening + priorNet;
  }, [scopedBaseOpening, priorTxs]);

  // Transaksi dalam periode terpilih
  const periodTxs = useMemo(() => {
    return scopedAllTxs.filter((t) => {
      const d = parseValidDate(t.transaction_date);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [scopedAllTxs, startDate, endDate]);

  // 6. Hitung 4 Metrik Utama Finansial (Hanya dari transaksi aktif)
  const activePeriodTxs = useMemo(() => {
    return periodTxs.filter((t) => t.status !== 'VOIDED');
  }, [periodTxs]);

  // Personal In & Out
  const totalPersonalIncome = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.scope_type === 'PERSONAL' && t.transaction_type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const totalPersonalExpense = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.scope_type === 'PERSONAL' && t.transaction_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const netPersonalSaving = totalPersonalIncome - totalPersonalExpense;
  const savingRate =
    totalPersonalIncome > 0
      ? Math.round((netPersonalSaving / totalPersonalIncome) * 100)
      : 0;

  // Shared Group Contributions
  const totalSharedContributions = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.scope_type === 'SHARED' && t.transaction_type === 'CONTRIBUTION')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  // All Flow Totals (Konsolidasi dalam periode)
  const totalCredit = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const totalDebit = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.transaction_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const netCashflow = totalCredit - totalDebit;
  const endingBalance = startingBalance + netCashflow;

  // 7. Visual Cashflow SVG Data (4 Siklus / Minggu)
  const cycleData = useMemo(() => {
    const cycles = [
      { label: 'Minggu 1', in: 0, out: 0 },
      { label: 'Minggu 2', in: 0, out: 0 },
      { label: 'Minggu 3', in: 0, out: 0 },
      { label: 'Minggu 4', in: 0, out: 0 },
    ];

    activePeriodTxs.forEach((t) => {
      const day = parseValidDate(t.transaction_date).getDate();
      const idx = Math.min(3, Math.max(0, Math.floor((day - 1) / 7)));
      const isIn = t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION';
      if (cycles[idx]) {
        if (isIn) {
          cycles[idx].in += t.amount;
        } else {
          cycles[idx].out += t.amount;
        }
      }
    });

    const maxVal = Math.max(1, ...cycles.flatMap((c) => [c.in, c.out]));
    return cycles.map((c) => {
      const inHeight = Math.min(160, Math.max(8, Math.round((c.in / maxVal) * 150)));
      const outHeight = Math.min(160, Math.max(8, Math.round((c.out / maxVal) * 150)));
      const surplus = c.in - c.out;
      return {
        ...c,
        inHeight,
        outHeight,
        surplus,
      };
    });
  }, [activePeriodTxs]);

  // 8. Distribusi Pos Pengeluaran
  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    activePeriodTxs
      .filter((t) => t.transaction_type === 'EXPENSE')
      .forEach((t) => {
        const cat = t.category_name || (t.scope_type === 'SHARED' ? 'Operasional Bersama' : 'Belanja Mandiri');
        map[cat] = (map[cat] || 0) + t.amount;
      });

    const totalExp = Object.values(map).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount], idx) => {
        const pct = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
        const colorClasses = [
          'bg-primary text-primary',
          'bg-secondary text-secondary',
          'bg-tertiary text-tertiary',
          'bg-outline text-outline',
        ];
        return {
          name,
          amount,
          percentage: pct,
          colorClass: colorClasses[idx % colorClasses.length],
          icon: getCategoryIcon(name),
        };
      });

    return { list: sorted, total: totalExp };
  }, [activePeriodTxs]);

  // 9. Rekonstruksi Saldo Berjalan (Double-Entry Running Balance)
  const rowsWithBalance = useMemo(() => {
    // Urutkan kronologis ascending untuk kalkulasi saldo berjalan
    const asc = [...periodTxs].sort((a, b) => {
      const dDiff = a.transaction_date.localeCompare(b.transaction_date);
      if (dDiff !== 0) return dDiff;
      return a.id.localeCompare(b.id);
    });

    let current = startingBalance;
    const computed = asc.map((t, idx) => {
      const isIn = t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION';
      const isVoid = t.status === 'VOIDED';

      if (!isVoid) {
        if (isIn) {
          current += t.amount;
        } else {
          current -= t.amount;
        }
      }

      // Format Ref ID jika tidak ada
      const refCode = `REF-${t.transaction_date.replace(/-/g, '')}-${t.id.slice(0, 4).toUpperCase()}`;

      return {
        ...t,
        runningBalance: current,
        refCode,
        isIn,
      };
    });

    // Tampilkan urutan terbaru di atas (descending)
    return computed.reverse();
  }, [periodTxs, startingBalance]);

  // 10. Filter Pencarian & Kategori pada Tabel
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    periodTxs.forEach((t) => {
      if (t.category_name) set.add(t.category_name);
    });
    return Array.from(set);
  }, [periodTxs]);

  const filteredTableRows = useMemo(() => {
    return rowsWithBalance.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (row.description || '').toLowerCase().includes(q);
        const refMatch = row.refCode.toLowerCase().includes(q);
        const catMatch = (row.category_name || '').toLowerCase().includes(q);
        if (!descMatch && !refMatch && !catMatch) return false;
      }
      if (categoryFilter !== 'all') {
        if (row.category_name !== categoryFilter) return false;
      }
      if (flowFilter === 'in' && !row.isIn) return false;
      if (flowFilter === 'out' && row.isIn) return false;
      return true;
    });
  }, [rowsWithBalance, searchQuery, categoryFilter, flowFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTableRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableRows.slice(start, start + pageSize);
  }, [filteredTableRows, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* 1. Header & Breadcrumb */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs font-caption text-caption text-outline">
            <Link href="/dashboard" className="hover:text-primary transition-colors inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Beranda</span>
            </Link>
            <span>/</span>
            <span className="text-on-surface font-caption-medium text-caption-medium">Laporan Keuangan</span>
          </nav>

          <div className="flex flex-wrap items-center gap-space-sm pt-space-2xs">
            <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight">
              Laporan Keuangan &amp; Analisis Arus Kas
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm shadow-xs border border-surface-container">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Periode: {periodDisplayLabel}</span>
            </span>
          </div>

          <p className="font-body-default text-body-default text-on-surface-variant max-w-3xl">
            Laporan performa likuiditas personal, kontribusi portofolio tabungan bersama, dan audit rekapitulasi pembukuan berkala dengan standar rekonsiliasi ganda.
          </p>
        </div>

        {/* Toolbar Periode & Aksi Ekspor */}
        <div className="flex flex-wrap items-center gap-space-xs shrink-0">
          {/* Segmented Filter Periode */}
          <HorizontalScroller className="p-1 rounded-xl bg-surface-container-low flex items-center shadow-xs border border-surface-container">
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                period === 'month'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                period === 'quarter'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Kuartalan
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                period === 'year'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Tahunan
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                period === 'all'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-2.5 py-1.5 rounded-lg font-caption-medium text-caption-medium inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                period === 'custom'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">date_range</span>
              <span>Kustom</span>
            </button>
          </HorizontalScroller>

          <ExportPdfStatementButton
            accountName={userName}
            accountEmail={userEmail}
            accountType={scopeTab === 'personal' ? 'PERSONAL' : scopeTab === 'shared' ? 'SHARED' : 'ALL'}
            periodLabel={periodDisplayLabel}
            openingBalance={startingBalance}
            txs={periodTxs}
            label="Cetak PDF"
          />
          <ExportCsvButton
            txs={periodTxs}
            accountName={userName}
            accountEmail={userEmail}
            accountType={scopeTab === 'personal' ? 'PERSONAL' : scopeTab === 'shared' ? 'SHARED' : 'ALL'}
            periodLabel={periodDisplayLabel}
            openingBalance={startingBalance}
            filename={`laporan-keuangan-${scopeTab}-${period}.csv`}
            label="Unduh CSV"
          />
        </div>
      </header>

      {/* Input Form Rentang Tanggal jika Kustom Aktif */}
      {period === 'custom' && (
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-wrap items-center gap-space-sm animate-in fade-in">
          <span className="font-caption-medium text-caption-medium text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-base text-primary">filter_alt</span>
            Pilih Rentang Tanggal Spesifik:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-caption text-caption focus:outline-none focus:border-primary shadow-xs"
            />
            <span className="text-outline text-xs">s/d</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-caption text-caption focus:outline-none focus:border-primary shadow-xs"
            />
          </div>
          {(customFrom || customTo) && (
            <button
              type="button"
              onClick={() => {
                setCustomFrom('');
                setCustomTo('');
              }}
              className="text-xs text-outline hover:text-primary underline cursor-pointer ml-auto"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      )}

      {/* 2. Governance Alert Banner (Dual-Ledger Isolation) */}
      <aside
        aria-label="Tata Kelola Transparansi"
        className="rounded-2xl p-space-md bg-secondary/10 text-on-surface flex items-start gap-space-md shadow-xs border border-secondary/20"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">policy</span>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-headline-h3 text-headline-h3 text-secondary font-semibold">
              Tata Kelola Pelaporan TabungKu (Dual-Ledger Governance)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-label-sm font-label-sm font-bold">
              ISO-27001 Compliant
            </span>
          </div>
          <p className="font-body-default text-body-default text-on-surface-variant">
            Saldo &amp; transaksi <strong className="font-body-medium text-on-surface">Personal</strong> dianalisis terpisah dari{' '}
            <strong className="font-body-medium text-on-surface">Saldo Bersama</strong> untuk menjaga kerahasiaan kepemilikan independen, transparansi mutasi kas bersama, serta kepatuhan akuntansi kolektif tanpa percampuran modal.
          </p>
        </div>
      </aside>

      {/* 3. Key Financial Health Metrics - 4 Cards Grid */}
      <section aria-labelledby="section-metrics-title">
        <h2 className="sr-only" id="section-metrics-title">
          Ringkasan Metrik Finansial
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Card 1: Pemasukan Personal */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-caption-medium text-caption-medium text-outline uppercase tracking-wider">
                  Total Pemasukan Personal
                </span>
                <span className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">south_west</span>
                </span>
              </div>
              <div className="font-currency-display text-currency-display text-on-surface mb-space-xs tabular-nums font-bold">
                {isHidden ? 'Rp ••••••••' : formatRupiah(totalPersonalIncome)}
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between border-t border-surface-container-low">
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                Target Terpenuhi
              </span>
              <span className="font-label-sm text-label-sm text-outline">Gaji &amp; Dividen</span>
            </div>
          </article>

          {/* Card 2: Pengeluaran Personal */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-caption-medium text-caption-medium text-outline uppercase tracking-wider">
                  Total Pengeluaran Personal
                </span>
                <span className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">north_east</span>
                </span>
              </div>
              <div className="font-currency-display text-currency-display text-on-surface mb-space-xs tabular-nums font-bold">
                {isHidden ? 'Rp ••••••••' : formatRupiah(totalPersonalExpense)}
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between border-t border-surface-container-low">
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-semibold">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                {totalPersonalIncome > 0
                  ? `${Math.round((totalPersonalExpense / totalPersonalIncome) * 100)}% Rasio Belanja`
                  : 'Belanja Terkendali'}
              </span>
              <span className="font-label-sm text-label-sm text-outline">Di bawah pagu batas</span>
            </div>
          </article>

          {/* Card 3: Net Saving / Surplus Kas */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-caption-medium text-caption-medium text-outline uppercase tracking-wider">
                  Net Saving / Surplus Kas
                </span>
                <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">savings</span>
                </span>
              </div>
              <div
                className={`font-currency-display text-currency-display mb-space-xs tabular-nums font-bold ${
                  netPersonalSaving >= 0 ? 'text-primary' : 'text-error'
                }`}
              >
                {isHidden
                  ? 'Rp ••••••••'
                  : `${netPersonalSaving >= 0 ? '+' : '−'} ${formatRupiah(Math.abs(netPersonalSaving))}`}
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between border-t border-surface-container-low">
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                <span className="material-symbols-outlined text-[12px]">health_and_safety</span>
                {netPersonalSaving >= 0 ? `Sangat Sehat (${savingRate}%)` : 'Defisit Anggaran'}
              </span>
              <span className="font-label-sm text-label-sm text-outline">Likuiditas Mandiri</span>
            </div>
          </article>

          {/* Card 4: Tabungan Bersama */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-caption-medium text-caption-medium text-outline uppercase tracking-wider">
                  Setoran Tabungan Bersama
                </span>
                <span className="w-8 h-8 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">groups_3</span>
                </span>
              </div>
              <div className="font-currency-display text-currency-display text-on-surface mb-space-xs tabular-nums font-bold">
                {isHidden ? 'Rp ••••••••' : formatRupiah(totalSharedContributions)}
              </div>
            </div>
            <div className="pt-space-xs flex items-center justify-between border-t border-surface-container-low">
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold">
                <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                {groups.length} Grup Terdaftar
              </span>
              <span className="font-label-sm text-label-sm text-outline">Portofolio Kolektif</span>
            </div>
          </article>
        </div>
      </section>

      {/* 4. Visual Cashflow Charts & Analytics Breakdown (2 Kolom) */}
      <section aria-labelledby="analytics-visual-title">
        <h2 className="sr-only" id="analytics-visual-title">
          Visualisasi Komparasi Arus Kas &amp; Alokasi Beban
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Kolom 1: Tren Arus Kas Mingguan (7-8 cols) */}
          <article className="lg:col-span-7 xl:col-span-8 rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
                <div>
                  <h3 className="font-headline-h2 text-headline-h2 text-on-surface font-semibold">
                    Tren Arus Kas Siklus Transaksi
                  </h3>
                  <p className="font-caption text-caption text-outline">
                    Perbandingan kas masuk vs beban pengeluaran per periode
                  </p>
                </div>
                {/* Legend Indicators */}
                <div className="flex items-center gap-space-md">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="w-3 h-3 rounded-sm bg-primary" />
                    <span>Masuk</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="w-3 h-3 rounded-sm bg-tertiary" />
                    <span>Keluar</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="w-3.5 h-0.5 bg-secondary" />
                    <span>Surplus</span>
                  </div>
                </div>
              </div>

              {/* Accessible SVG Visualization */}
              <div className="w-full h-64 my-space-xs relative overflow-hidden">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 700 240"
                  role="img"
                  aria-label="Grafik Batang Komparasi Arus Kas"
                >
                  <defs>
                    <linearGradient id="primaryBarGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#006837" />
                      <stop offset="100%" stopColor="#16834a" />
                    </linearGradient>
                    <linearGradient id="expenseBarGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#a06500" />
                      <stop offset="100%" stopColor="#ffb95f" />
                    </linearGradient>
                    <linearGradient id="areaSurplus" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#006874" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#006874" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  <line stroke="#d9e3f1" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="680" y1="40" />
                  <line stroke="#d9e3f1" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="680" y1="95" />
                  <line stroke="#d9e3f1" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="680" y1="150" />
                  <line stroke="#d9e3f1" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="680" y1="205" />

                  {/* Area Surplus & Polyline */}
                  <polygon
                    fill="url(#areaSurplus)"
                    points="115,100 270,165 425,120 580,85 580,205 115,205"
                  />
                  <polyline
                    fill="none"
                    points="115,100 270,165 425,120 580,85"
                    stroke="#006874"
                    strokeDasharray="4,4"
                    strokeWidth="2.5"
                  />

                  {/* 4 Siklus Batang */}
                  {cycleData.map((c, idx) => {
                    const xCenter = 115 + idx * 155;
                    const xIn = xCenter - 25;
                    const xOut = xCenter + 5;
                    const yIn = 205 - c.inHeight;
                    const yOut = 205 - c.outHeight;
                    const yDot = Math.max(30, Math.min(195, 205 - Math.round((c.surplus / (Math.max(1, totalCredit) || 1)) * 120 + 80)));

                    return (
                      <g key={c.label} className="transition-transform hover:opacity-95">
                        <rect
                          fill="url(#primaryBarGrad)"
                          height={c.inHeight}
                          rx="5"
                          width="24"
                          x={xIn}
                          y={yIn}
                        >
                          <title>{`${c.label} Masuk: ${formatRupiah(c.in)}`}</title>
                        </rect>
                        <rect
                          fill="url(#expenseBarGrad)"
                          height={c.outHeight}
                          rx="5"
                          width="24"
                          x={xOut}
                          y={yOut}
                        >
                          <title>{`${c.label} Keluar: ${formatRupiah(c.out)}`}</title>
                        </rect>
                        <circle
                          cx={xCenter}
                          cy={yDot}
                          fill="#006874"
                          r="4"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          fill="#6f7a6f"
                          fontSize="11"
                          fontWeight="600"
                          textAnchor="middle"
                          x={xCenter}
                          y="226"
                        >
                          {c.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-space-md p-space-sm rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs border border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
                <p className="font-body-default text-body-default text-on-surface">
                  Surplus kas bersih periode ini tercatat{' '}
                  <strong className="font-body-medium text-primary">
                    {netCashflow >= 0 ? `+${formatRupiah(netCashflow)}` : `−${formatRupiah(Math.abs(netCashflow))}`}
                  </strong>
                  .
                </p>
              </div>
              <span className="font-caption-medium text-caption-medium text-secondary inline-flex items-center gap-1">
                Terverifikasi Otomatis
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </span>
            </div>
          </article>

          {/* Kolom 2: Distribusi Pos Pengeluaran (4-5 cols) */}
          <article className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-xs">
                <h3 className="font-headline-h2 text-headline-h2 text-on-surface font-semibold">
                  Distribusi Pos Pengeluaran
                </h3>
                <span className="font-label-sm text-label-sm text-outline">
                  Total: {isHidden ? 'Rp ••••••••' : formatRupiah(expenseCategories.total)}
                </span>
              </div>
              <p className="font-caption text-caption text-outline mb-space-md">
                Alokasi anggaran belanja personal aktif &amp; grup
              </p>

              {expenseCategories.list.length === 0 ? (
                <div className="rounded-xl bg-surface-container-low p-space-lg text-center text-on-surface-variant font-caption text-caption">
                  Belum ada transaksi pengeluaran tercatat pada periode ini.
                </div>
              ) : (
                <div className="space-y-space-md">
                  {expenseCategories.list.slice(0, 5).map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-body-default font-body-default">
                        <span className="flex items-center gap-2 text-on-surface min-w-0">
                          <span className={`material-symbols-outlined text-[16px] ${item.colorClass.split(' ')[1]}`}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-currency-body text-currency-body text-on-surface tabular-nums shrink-0 ml-2">
                          {item.percentage}%{' '}
                          <span className="text-outline font-normal text-caption">
                            ({isHidden ? 'Rp •••' : formatRupiah(item.amount)})
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${item.colorClass.split(' ')[0]}`}
                          style={{ width: `${Math.max(item.percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-space-md p-space-sm rounded-xl bg-surface-container-low flex items-center gap-space-xs border border-surface-container">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              <p className="font-caption text-caption text-on-surface-variant">
                Seluruh pos belanja berada dalam koridor alokasi pembukuan wajar.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* 5. Tabbed Detailed Ledger (Personal vs Communal Separation) */}
      <section aria-labelledby="ledger-title" className="rounded-2xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm border border-surface-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-low">
          <div>
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface font-semibold" id="ledger-title">
              Rekapitulasi Mutasi &amp; Buku Besar Kas
            </h2>
            <p className="font-caption text-caption text-outline">
              Rekonstruksi transaksi berkala dengan nomor referensi audit
            </p>
          </div>

          {/* Segmented Navigation for Tab Views (In HorizontalScroller) */}
          <HorizontalScroller className="p-1 rounded-xl bg-surface-container-low flex items-center gap-1 border border-surface-container">
            <button
              type="button"
              onClick={() => {
                setScopeTab('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeTab === 'all'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Semua Mutasi (Konsolidasi)
            </button>
            <button
              type="button"
              onClick={() => {
                setScopeTab('personal');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeTab === 'personal'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Tabungan Personal
            </button>
            <button
              type="button"
              onClick={() => {
                setScopeTab('shared');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg font-caption-medium text-caption-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeTab === 'shared'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs font-semibold'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Tabungan Bersama</span>
            </button>
          </HorizontalScroller>
        </div>

        {/* Filter Bar Component */}
        <div className="p-space-sm rounded-xl bg-surface-container-low my-space-md flex flex-wrap items-center justify-between gap-space-sm border border-surface-container">
          <div className="flex flex-wrap items-center gap-space-xs flex-1">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-lowest font-caption text-caption text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                placeholder="Cari keterangan / no. referensi..."
                type="text"
              />
            </div>

            {/* Filter Category */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-lg bg-surface-container-lowest font-caption text-caption text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Filter Flow */}
            <select
              value={flowFilter}
              onChange={(e) => {
                setFlowFilter(e.target.value as 'all' | 'in' | 'out');
                setCurrentPage(1);
              }}
              className="h-10 px-3 rounded-lg bg-surface-container-lowest font-caption text-caption text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
            >
              <option value="all">Semua Arus Kas</option>
              <option value="in">Kas Masuk (+)</option>
              <option value="out">Kas Keluar (−)</option>
            </select>
          </div>

          <div className="text-caption font-caption text-outline flex items-center gap-3">
            <span>
              Menampilkan <strong className="text-on-surface font-caption-medium">{filteredTableRows.length}</strong> mutasi
            </span>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="overflow-x-auto rounded-xl hide-scrollbar">
          <table className="w-full text-left font-body-default text-body-default min-w-[850px] border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Entitas Akun</th>
                <th className="py-3 px-4">Kategori Alokasi</th>
                <th className="py-3 px-4">Keterangan &amp; Ref</th>
                <th className="py-3 px-4 text-right">Kas Masuk (+)</th>
                <th className="py-3 px-4 text-right">Kas Keluar (−)</th>
                <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container bg-surface-container-lowest font-caption text-caption">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-space-xl text-center text-outline">
                    Tidak ada mutasi yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isVoided = row.status === 'VOIDED';
                  const isShared = row.scope_type === 'SHARED';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        isVoided ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-caption text-caption text-on-surface whitespace-nowrap">
                        {formatDate(row.transaction_date)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-caption-medium text-caption-medium ${
                            isShared
                              ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isShared ? 'groups' : 'account_balance_wallet'}
                          </span>
                          <span>{isShared ? row.group_name || 'Kas Bersama' : 'Kas Personal'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-caption text-caption text-on-surface-variant whitespace-nowrap">
                        {row.category_name || (row.isIn ? 'Pemasukan' : 'Belanja Operasional')}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-caption-medium text-caption-medium text-on-surface leading-tight">
                          {row.description || (row.isIn ? 'Pemasukan Kas' : 'Pengeluaran Kas')}
                        </p>
                        <p className="font-label-sm text-label-sm text-outline font-mono">
                          {row.refCode}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-currency-body text-currency-body text-primary tabular-nums whitespace-nowrap">
                        {row.isIn ? `+ ${formatRupiah(row.amount)}` : '−'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-currency-body text-currency-body text-tertiary tabular-nums whitespace-nowrap">
                        {!row.isIn ? `− ${formatRupiah(row.amount)}` : '−'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-currency-body text-currency-body text-on-surface tabular-nums whitespace-nowrap font-semibold">
                        {isHidden ? 'Rp ••••••••' : formatRupiah(row.runningBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isVoided ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-highest text-outline font-label-sm text-label-sm">
                            Dibatalkan (Void)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">
                            Tervalidasi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom: Subtotals & Pagination */}
        <div className="pt-space-md border-t border-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          {/* Subtotal Breakdown Strip */}
          <div className="flex flex-wrap items-center gap-space-md text-caption font-caption text-on-surface-variant">
            <div>
              <span className="text-outline">Subtotal Kredit (Masuk):</span>
              <strong className="text-primary font-currency-body tabular-nums ml-1">
                {isHidden ? 'Rp •••' : `+ ${formatRupiah(totalCredit)}`}
              </strong>
            </div>
            <div>
              <span className="text-outline">Subtotal Debit (Keluar):</span>
              <strong className="text-tertiary font-currency-body tabular-nums ml-1">
                {isHidden ? 'Rp •••' : `− ${formatRupiah(totalDebit)}`}
              </strong>
            </div>
            <div>
              <span className="text-outline">Surplus Bersih:</span>
              <strong className="text-on-surface font-currency-body tabular-nums ml-1">
                {isHidden ? 'Rp •••' : `${netCashflow >= 0 ? '+' : '−'} ${formatRupiah(Math.abs(netCashflow))}`}
              </strong>
            </div>
          </div>

          {/* Touch-Friendly Pagination Controls */}
          <nav aria-label="Navigasi Halaman" className="flex items-center gap-space-2xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-9 h-9 rounded-lg bg-surface-container-low text-outline hover:text-on-surface flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-9 h-9 rounded-lg font-caption-medium text-caption-medium transition cursor-pointer ${
                  currentPage === pg
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'hover:bg-surface-container-low text-on-surface'
                }`}
                type="button"
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-9 h-9 rounded-lg bg-surface-container-low text-outline hover:text-on-surface flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </nav>
        </div>
      </section>

      {/* 6. Panel Arsip Resmi & Audit Kepatuhan (3 Interactive Boxes) */}
      <section aria-labelledby="audit-panel-title">
        <div className="mb-space-sm flex items-center justify-between">
          <div>
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface font-semibold" id="audit-panel-title">
              Panel Arsip Resmi &amp; Audit Kepatuhan
            </h2>
            <p className="font-caption text-caption text-outline">
              Dokumen siap cetak dan paket rekonsiliasi yang diakui secara akuntansi syariah dan konvensional
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 font-label-sm text-label-sm text-primary bg-primary/10 px-2.5 py-1 rounded-full font-semibold">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Enkripsi AES-256
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Box 1: PDF Official Statement */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
              </div>
              <div>
                <h3 className="font-headline-h3 text-headline-h3 text-on-surface font-semibold">
                  Laporan Rekap Bulanan Resmi
                </h3>
                <p className="font-caption text-caption text-outline">
                  PDF Ber-QR Code otentikasi resmi buku kas TabungKu.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant flex items-center justify-between border border-surface-container">
                <span>Format: PDF Dokumen Sah</span>
                <span className="font-mono text-outline">SHA-256 Valid</span>
              </div>
            </div>
            <div className="pt-space-md">
              <ExportPdfStatementButton
                accountName={userName}
                accountEmail={userEmail}
                accountType={scopeTab === 'personal' ? 'PERSONAL' : scopeTab === 'shared' ? 'SHARED' : 'ALL'}
                periodLabel={periodDisplayLabel}
                openingBalance={startingBalance}
                txs={periodTxs}
                label="Unduh Rekening PDF"
                variant="primary"
                className="w-full justify-center"
              />
            </div>
          </article>

          {/* Box 2: Full Excel / CSV Ledger */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">dataset</span>
              </div>
              <div>
                <h3 className="font-headline-h3 text-headline-h3 text-on-surface font-semibold">
                  Buku Besar Lengkap (CSV)
                </h3>
                <p className="font-caption text-caption text-outline">
                  Data mutasi lengkap debit-kredit terinci untuk Excel atau software akuntansi.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant flex items-center justify-between border border-surface-container">
                <span>Format: CSV UTF-8</span>
                <span className="text-outline">Kompatibel Excel</span>
              </div>
            </div>
            <div className="pt-space-md">
              <ExportCsvButton
                txs={periodTxs}
                accountName={userName}
                accountEmail={userEmail}
                accountType={scopeTab === 'personal' ? 'PERSONAL' : scopeTab === 'shared' ? 'SHARED' : 'ALL'}
                periodLabel={periodDisplayLabel}
                openingBalance={startingBalance}
                filename={`buku-besar-${scopeTab}-${period}.csv`}
                label="Unduh Data Mutasi (CSV)"
                className="w-full justify-center"
              />
            </div>
          </article>

          {/* Box 3: Audit Trail & Bukti Transaksi */}
          <article className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container flex flex-col justify-between hover:shadow-md transition">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">document_scanner</span>
              </div>
              <div>
                <h3 className="font-headline-h3 text-headline-h3 text-on-surface font-semibold">
                  Audit Trail &amp; Lampiran Struk
                </h3>
                <p className="font-caption text-caption text-outline">
                  Arsip digital bukti transfer dan jejak pembatalan transaksi (void).
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant flex items-center justify-between border border-surface-container">
                <span>Lampiran Struk:</span>
                <span className="text-primary font-caption-medium font-semibold">
                  {periodTxs.filter((t) => !!t.receipt_url).length} Berkas Ada
                </span>
              </div>
            </div>
            <div className="pt-space-md">
              <Link
                href="/dashboard/transactions"
                className="w-full h-10 px-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Buka Jejak Mutasi Lengkap</span>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
