'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Tx, Group } from '@/utils/finance';
import { formatRupiah, formatDate } from '@/utils/format';
import { usePrivacy } from '@/components/PrivacyContext';
import { ExportPdfStatementButton } from '@/components/ExportPdfStatementButton';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { HorizontalScroller } from '@/components/HorizontalScroller';
import { AddGeneralTransactionModal } from '@/components/AddGeneralTransactionModal';
import { ReceiptViewerButton } from '@/components/ReceiptViewerButton';
import { VoidTransactionButton } from '@/components/VoidTransactionButton';
import type { PendingApprovalItem } from '@/app/actions/approvals';

interface Props {
  userId: string;
  userName: string;
  userEmail?: string;
  txs: (Tx & { actor_name?: string })[];
  groups: Group[];
  categories: { id: string; name: string }[];
  pendingApprovals: PendingApprovalItem[];
  initialFilterType?: string;
}

type ScopeFilterType = 'all' | 'personal' | 'shared' | 'pending';
type PeriodType = 'month' | 'quarter' | 'year' | 'all' | 'custom';

export function TransactionsClient({
  userId,
  userName,
  userEmail,
  txs,
  groups,
  categories,
  pendingApprovals,
  initialFilterType = 'all',
}: Props) {
  const { isHidden } = usePrivacy();

  // 1. Filter Wadah / Scope
  const [scopeFilter, setScopeFilter] = useState<ScopeFilterType>(
    initialFilterType === 'personal'
      ? 'personal'
      : initialFilterType === 'shared'
      ? 'shared'
      : initialFilterType === 'pending'
      ? 'pending'
      : 'all'
  );

  // 2. Filter Periode
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // 3. Search & Filter Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [flowType, setFlowType] = useState<'all' | 'in' | 'out' | 'shared_in'>('all');

  // 4. Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // 5. Selected Transaction for Modal Inspector
  const [inspectTx, setInspectTx] = useState<(Tx & { refCode: string; actor_name?: string }) | null>(null);

  // Perhitungan Tanggal Periode
  const now = useMemo(() => new Date(), []);
  const currentMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(now),
    [now]
  );

  const { startDate, endDate, periodLabel } = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date | null = null;
    let end: Date | null = today;
    let label = currentMonthLabel;

    if (period === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
      label = `Bulan Ini (${currentMonthLabel})`;
    } else if (period === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1, 0, 0, 0);
      label = `Kuartal ${Math.floor(today.getMonth() / 3) + 1} (${today.getFullYear()})`;
    } else if (period === 'year') {
      start = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
      label = `Tahun ${today.getFullYear()}`;
    } else if (period === 'custom') {
      if (customFrom) start = new Date(customFrom + 'T00:00:00');
      if (customTo) end = new Date(customTo + 'T23:59:59');
      label =
        customFrom && customTo
          ? `${formatDate(customFrom + 'T00:00:00')} – ${formatDate(customTo + 'T00:00:00')}`
          : 'Rentang Kustom';
    } else {
      start = null;
      end = null;
      label = 'Semua Periode';
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [period, customFrom, customTo, now, currentMonthLabel]);

  // Transaksi dengan Ref Code
  const enrichedTxs = useMemo(() => {
    return txs.map((t) => {
      const refCode = `#TRX-${t.transaction_date.replace(/-/g, '')}-${t.id.slice(0, 3).toUpperCase()}`;
      return { ...t, refCode };
    });
  }, [txs]);

  // Filter Berdasarkan Periode
  const periodFilteredTxs = useMemo(() => {
    return enrichedTxs.filter((t) => {
      const d = new Date(t.transaction_date + 'T00:00:00');
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [enrichedTxs, startDate, endDate]);

  // 4 Kartu Metrik Finansial
  const activePeriodTxs = useMemo(() => {
    return periodFilteredTxs.filter((t) => t.status !== 'VOIDED');
  }, [periodFilteredTxs]);

  const totalIncome = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const totalIncomeCount = useMemo(() => {
    return activePeriodTxs.filter(
      (t) => t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION'
    ).length;
  }, [activePeriodTxs]);

  const totalExpense = useMemo(() => {
    return activePeriodTxs
      .filter((t) => t.transaction_type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [activePeriodTxs]);

  const totalExpenseCount = useMemo(() => {
    return activePeriodTxs.filter((t) => t.transaction_type === 'EXPENSE').length;
  }, [activePeriodTxs]);

  const netCashflow = totalIncome - totalExpense;

  // Filter Wadah / Scope
  const scopeFilteredTxs = useMemo(() => {
    if (scopeFilter === 'personal') {
      return periodFilteredTxs.filter((t) => t.scope_type === 'PERSONAL');
    }
    if (scopeFilter === 'shared') {
      return periodFilteredTxs.filter((t) => t.scope_type === 'SHARED');
    }
    if (scopeFilter === 'pending') {
      return periodFilteredTxs.filter((t) => t.status === 'PENDING_APPROVAL');
    }
    return periodFilteredTxs;
  }, [periodFilteredTxs, scopeFilter]);

  // Filter Kategori, Arah Arus, dan Pencarian
  const finalFilteredTxs = useMemo(() => {
    return scopeFilteredTxs.filter((t) => {
      // 1. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const refMatch = t.refCode.toLowerCase().includes(q);
        const groupMatch = (t.group_name || '').toLowerCase().includes(q);
        const actorMatch = (t.actor_name || '').toLowerCase().includes(q);
        const catMatch = (t.category_name || '').toLowerCase().includes(q);
        if (!descMatch && !refMatch && !groupMatch && !actorMatch && !catMatch) return false;
      }
      // 2. Kategori
      if (selectedCategory !== 'all') {
        if (t.category_name !== selectedCategory) return false;
      }
      // 3. Flow Type
      if (flowType === 'in') {
        if (t.transaction_type !== 'INCOME') return false;
      } else if (flowType === 'out') {
        if (t.transaction_type !== 'EXPENSE') return false;
      } else if (flowType === 'shared_in') {
        if (t.transaction_type !== 'CONTRIBUTION') return false;
      }
      return true;
    });
  }, [scopeFilteredTxs, searchQuery, selectedCategory, flowType]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(finalFilteredTxs.length / pageSize));
  const paginatedTxs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return finalFilteredTxs.slice(start, start + pageSize);
  }, [finalFilteredTxs, currentPage, pageSize]);

  // Counts for tabs
  const countAll = periodFilteredTxs.length;
  const countPersonal = periodFilteredTxs.filter((t) => t.scope_type === 'PERSONAL').length;
  const countShared = periodFilteredTxs.filter((t) => t.scope_type === 'SHARED').length;
  const countPending = periodFilteredTxs.filter((t) => t.status === 'PENDING_APPROVAL').length;

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategory !== 'all' || flowType !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFlowType('all');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* 1. Header Section & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs min-w-0">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Dual-Ledger Audit
            </span>
            <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-primary-fixed/50 text-on-primary-fixed-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[13px] leading-none text-primary">
                sync
              </span>
              Sinkronisasi Real-Time
            </span>
          </div>
          <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight mt-1">
            Histori Transaksi
          </h1>
          <p className="font-body-default text-body-default text-on-surface-variant max-w-2xl">
            Daftar riwayat mutasi dan pencatatan kas secara menyeluruh lintas rekening personal dan tabungan bersama.
          </p>
        </div>

        <div className="flex items-center gap-space-xs flex-wrap">
          <ExportPdfStatementButton
            accountName={userName}
            accountEmail={userEmail}
            accountType={scopeFilter === 'personal' ? 'PERSONAL' : scopeFilter === 'shared' ? 'SHARED' : 'ALL'}
            periodLabel={periodLabel}
            txs={finalFilteredTxs}
            label="Cetak PDF"
          />
          <ExportCsvButton
            txs={finalFilteredTxs}
            accountName={userName}
            accountEmail={userEmail}
            accountType={scopeFilter === 'personal' ? 'PERSONAL' : scopeFilter === 'shared' ? 'SHARED' : 'ALL'}
            periodLabel={periodLabel}
            filename={`transaksi-${scopeFilter}-${period}.csv`}
            label="Ekspor CSV"
          />
          <AddGeneralTransactionModal
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            initialCategories={categories.map((c) => c.name)}
            triggerText="+ Tambah Transaksi"
            variant="header-cta"
          />
        </div>
      </div>

      {/* 2. 4 Metric Cards (Cashflow Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Total Pemasukan */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between gap-space-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant">
                Total Pemasukan
              </span>
              <span className="font-currency-display text-currency-display text-primary tracking-tight mt-1 tabular-nums font-bold">
                {isHidden ? 'Rp ••••••••' : `+${formatRupiah(totalIncome)}`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-fixed/40 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">arrow_downward_alt</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant pt-space-xs border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 font-caption-medium text-caption-medium text-primary">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Personal &amp; Setoran Grup</span>
            </div>
            <span className="font-caption text-caption text-outline">{totalIncomeCount} Transaksi</span>
          </div>
        </div>

        {/* Card 2: Total Pengeluaran */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between gap-space-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant">
                Total Pengeluaran
              </span>
              <span className="font-currency-display text-currency-display text-error tracking-tight mt-1 tabular-nums font-bold">
                {isHidden ? 'Rp ••••••••' : `−${formatRupiah(totalExpense)}`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-error-container/60 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">arrow_upward_alt</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant pt-space-xs border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 font-caption-medium text-caption-medium text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>
                {totalIncome > 0
                  ? `${Math.round((totalExpense / totalIncome) * 100)}% dari pagu belanja`
                  : 'Pengeluaran Terpantau'}
              </span>
            </div>
            <span className="font-caption text-caption text-outline">{totalExpenseCount} Transaksi</span>
          </div>
        </div>

        {/* Card 3: Net Saldo Mutasi */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between gap-space-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant">
                Net Saldo Mutasi
              </span>
              <span
                className={`font-currency-display text-currency-display tracking-tight mt-1 tabular-nums font-bold ${
                  netCashflow >= 0 ? 'text-secondary' : 'text-error'
                }`}
              >
                {isHidden
                  ? 'Rp ••••••••'
                  : `${netCashflow >= 0 ? '+' : '−'}${formatRupiah(Math.abs(netCashflow))}`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant pt-space-xs border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 font-caption-medium text-caption-medium text-secondary">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>{netCashflow >= 0 ? 'Surplus Kas Periode Ini' : 'Defisit Periode Ini'}</span>
            </div>
            <span className="font-caption text-caption text-outline">
              {netCashflow >= 0 ? 'Positif' : 'Perlu Evaluasi'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Mutasi Periode Ini */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col justify-between gap-space-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant">
                Total Mutasi Periode Ini
              </span>
              <span className="font-currency-display text-currency-display text-on-surface tracking-tight mt-1 tabular-nums font-bold">
                {periodFilteredTxs.length} Transaksi
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant pt-space-xs border-t border-surface-container-low">
            <div className="flex items-center gap-1.5 font-caption-medium text-caption-medium text-primary">
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Terverifikasi Digital</span>
            </div>
            {countPending > 0 ? (
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-error-container text-on-error-container font-semibold">
                {countPending} Pending
              </span>
            ) : (
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-semibold">
                Lengkap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter & Dual-Ledger Bar */}
      <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-md">
        {/* Row 1: Tabs Wadah & Date Range Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          {/* Segmented Scope Tabs with HorizontalScroller */}
          <HorizontalScroller
            className="p-1 rounded-lg bg-surface-container-high flex items-center gap-1"
            wrapperClassName="self-stretch md:self-auto"
          >
            <button
              type="button"
              onClick={() => {
                setScopeFilter('all');
                setCurrentPage(1);
              }}
              className={`px-space-md py-2 rounded-md font-body-medium text-body-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                scopeFilter === 'all'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Semua Transaksi</span>
              <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeFilter('personal');
                setCurrentPage(1);
              }}
              className={`px-space-md py-2 rounded-md font-body-medium text-body-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                scopeFilter === 'personal'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Personal</span>
              <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                {countPersonal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeFilter('shared');
                setCurrentPage(1);
              }}
              className={`px-space-md py-2 rounded-md font-body-medium text-body-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                scopeFilter === 'shared'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Tabungan Bersama</span>
              <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                {countShared}
              </span>
            </button>

            {countPending > 0 && (
              <button
                type="button"
                onClick={() => {
                  setScopeFilter('pending');
                  setCurrentPage(1);
                }}
                className={`px-space-md py-2 rounded-md font-body-medium text-body-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  scopeFilter === 'pending'
                    ? 'bg-surface-container-lowest text-error shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>Perlu Konfirmasi</span>
                <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                  {countPending}
                </span>
              </button>
            )}
          </HorizontalScroller>

          {/* Date Range Quick Filter */}
          <HorizontalScroller
            className="p-1 rounded-lg bg-surface-container-high flex items-center gap-1"
            wrapperClassName="self-stretch md:self-auto"
          >
            {(
              [
                { id: 'month', label: `Bulan Ini (${currentMonthLabel})` },
                { id: 'quarter', label: 'Kuartal Ini' },
                { id: 'year', label: `Tahun ${now.getFullYear()}` },
                { id: 'all', label: 'Semua' },
                { id: 'custom', label: 'Kustom' },
              ] as { id: PeriodType; label: string }[]
            ).map((pTab) => (
              <button
                key={pTab.id}
                type="button"
                onClick={() => setPeriod(pTab.id)}
                className={`px-3 py-1.5 rounded-md font-caption-medium text-caption-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  period === pTab.id
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {pTab.label}
              </button>
            ))}
          </HorizontalScroller>
        </div>

        {/* Input Kustom Tanggal (Muncul hanya jika Kustom dipilih) */}
        {period === 'custom' && (
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex flex-wrap items-center gap-space-sm animate-in fade-in">
            <span className="font-caption-medium text-caption-medium text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-primary">date_range</span>
              Rentang Tanggal:
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-caption text-caption focus:outline-none focus:border-primary shadow-xs"
            />
            <span className="text-outline text-xs">s/d</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 px-3 rounded-lg bg-surface-container-lowest border border-surface-container-highest text-on-surface font-caption text-caption focus:outline-none focus:border-primary shadow-xs"
            />
          </div>
        )}

        {/* Row 2: Search & Filter Dropdown Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
          {/* Search Input (5 Cols) */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-10 pr-space-md rounded-lg bg-surface-container text-on-surface placeholder:text-outline font-body-default text-body-default outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/40 transition-all border border-transparent focus:border-primary"
              placeholder="Cari keterangan, penyetor, no. referensi..."
              type="text"
            />
          </div>

          {/* Filter Dropdown 1: Kategori (3 Cols) */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 px-space-md rounded-lg bg-surface-container text-on-surface font-body-default text-body-default outline-none cursor-pointer focus:bg-surface-container-lowest border border-transparent focus:border-primary transition-all appearance-none"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Filter Dropdown 2: Jenis Mutasi / Arus (3 Cols) */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={flowType}
                onChange={(e) => {
                  setFlowType(e.target.value as 'all' | 'in' | 'out' | 'shared_in');
                  setCurrentPage(1);
                }}
                className="w-full h-11 px-space-md rounded-lg bg-surface-container text-on-surface font-body-default text-body-default outline-none cursor-pointer focus:bg-surface-container-lowest border border-transparent focus:border-primary transition-all appearance-none"
              >
                <option value="all">Semua Jenis Arus</option>
                <option value="in">Pemasukan Mandiri (+)</option>
                <option value="out">Pengeluaran (−)</option>
                <option value="shared_in">Setoran Kolektif Bersama (+)</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Reset Button (1 Col) */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={resetAllFilters}
              disabled={!hasActiveFilters}
              className="h-11 w-full flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Reset Semua Filter"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
            </button>
          </div>
        </div>

        {/* Row 3: Active Filters Chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-space-xs flex-wrap pt-space-2xs border-t border-surface-container-low">
            <span className="font-caption text-caption text-outline">Filter Aktif:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-caption text-caption">
                Pencarian: <strong>&ldquo;{searchQuery}&rdquo;</strong>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-error ml-0.5 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                </button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-caption text-caption">
                Kategori: <strong>{selectedCategory}</strong>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-error ml-0.5 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                </button>
              </span>
            )}
            {flowType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-caption text-caption">
                Arus:{' '}
                <strong>
                  {flowType === 'in'
                    ? 'Pemasukan (+)'
                    : flowType === 'out'
                    ? 'Pengeluaran (−)'
                    : 'Setoran Grup (+)'}
                </strong>
                <button
                  onClick={() => setFlowType('all')}
                  className="hover:text-error ml-0.5 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                </button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="font-caption-medium text-caption-medium text-secondary hover:underline ml-1 cursor-pointer"
              type="button"
            >
              Hapus Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Split View / Data Table */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container overflow-hidden flex flex-col">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="py-space-sm px-space-md whitespace-nowrap">Tanggal &amp; Waktu</th>
                <th className="py-space-sm px-space-md whitespace-nowrap">Wadah / Akun</th>
                <th className="py-space-sm px-space-md">Keterangan &amp; Catatan</th>
                <th className="py-space-sm px-space-md whitespace-nowrap">No. Referensi</th>
                <th className="py-space-sm px-space-md whitespace-nowrap">Kategori</th>
                <th className="py-space-sm px-space-md text-center whitespace-nowrap">Arah Arus</th>
                <th className="py-space-sm px-space-md text-right whitespace-nowrap">Nominal (IDR)</th>
                <th className="py-space-sm px-space-md text-center whitespace-nowrap">Status &amp; Bukti</th>
                <th className="py-space-sm px-space-md text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-default font-body-default">
              {paginatedTxs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-space-xl px-space-md text-center text-outline font-caption text-caption">
                    Tidak ada mutasi yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedTxs.map((t) => {
                  const isIn = t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION';
                  const isShared = t.scope_type === 'SHARED';
                  const isVoided = t.status === 'VOIDED';
                  const isPending = t.status === 'PENDING_APPROVAL';

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-surface-container-low/70 transition-colors ${
                        isVoided ? 'opacity-40 line-through bg-surface-container-low/30' : ''
                      } ${isPending ? 'bg-error-container/10' : ''}`}
                    >
                      {/* Tanggal & Waktu */}
                      <td className="py-space-md px-space-md whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-body-medium text-body-medium text-on-surface">
                            {formatDate(t.transaction_date + 'T00:00:00')}
                          </span>
                          <span className="font-caption text-caption text-outline">
                            {t.created_by_user_id === userId ? 'Oleh Anda' : t.actor_name || 'Anggota'}
                          </span>
                        </div>
                      </td>

                      {/* Wadah / Akun */}
                      <td className="py-space-md px-space-md whitespace-nowrap">
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isShared
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isShared ? 'groups' : 'account_balance_wallet'}
                            </span>
                          </span>
                          <div className="flex flex-col">
                            <span
                              className={`font-body-medium text-body-medium ${
                                isShared ? 'text-secondary font-semibold' : 'text-on-surface'
                              }`}
                            >
                              {isShared ? 'Tabungan Bersama' : 'Personal'}
                            </span>
                            <span className="font-caption text-caption text-outline truncate max-w-[140px]">
                              {isShared ? t.group_name || 'Grup' : 'Kas Mandiri'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col min-w-[200px]">
                          <span className="font-body-medium text-body-medium text-on-surface">
                            {t.description || (isIn ? 'Setoran / Pemasukan Kas' : 'Pengeluaran')}
                          </span>
                          {t.receipt_url && (
                            <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[14px]">receipt</span>
                              Ada Lampiran Bukti
                            </span>
                          )}
                        </div>
                      </td>

                      {/* No. Referensi */}
                      <td className="py-space-md px-space-md whitespace-nowrap">
                        <span className="font-caption text-caption text-outline font-mono">
                          {t.refCode}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-space-md px-space-md whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                          {t.category_name || (isIn ? 'Pemasukan' : 'Operasional')}
                        </span>
                      </td>

                      {/* Arah Arus */}
                      <td className="py-space-md px-space-md text-center whitespace-nowrap">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed/50 text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              arrow_downward
                            </span>
                            Pemasukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container/50 text-error font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              arrow_upward
                            </span>
                            Pengeluaran
                          </span>
                        )}
                      </td>

                      {/* Nominal */}
                      <td className="py-space-md px-space-md text-right whitespace-nowrap">
                        <span
                          className={`font-currency-body text-currency-body font-semibold tabular-nums ${
                            isVoided ? 'text-outline line-through' : isIn ? 'text-primary' : 'text-error'
                          }`}
                        >
                          {isHidden ? 'Rp ••••••••' : `${isIn ? '+' : '−'} ${formatRupiah(t.amount)}`}
                        </span>
                      </td>

                      {/* Status & Bukti */}
                      <td className="py-space-md px-space-md text-center whitespace-nowrap">
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-outline font-label-sm text-label-sm">
                            Dibatalkan (Void)
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              schedule
                            </span>
                            Perlu Persetujuan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[13px] leading-none">
                              verified
                            </span>
                            Tervalidasi
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-space-md px-space-md text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectTx(t)}
                            className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                            title="Buka Lembar Rincian"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {t.receipt_url && (
                            <ReceiptViewerButton
                              receiptUrl={t.receipt_url}
                              title={t.description || 'Transaksi'}
                              amount={t.amount}
                              date={t.transaction_date}
                              type={t.transaction_type}
                            />
                          )}

                          {t.status === 'ACTIVE' && (
                            <VoidTransactionButton
                              txId={t.id}
                              description={t.description || (isIn ? 'Setoran / Pemasukan' : 'Pengeluaran')}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom: Subtotals & Pagination */}
        <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container">
          <span className="font-caption text-caption text-on-surface-variant">
            {finalFilteredTxs.length === 0
              ? 'Menampilkan 0 mutasi transaksi'
              : `Menampilkan ${(currentPage - 1) * pageSize + 1} – ${Math.min(
                  currentPage * pageSize,
                  finalFilteredTxs.length
                )} dari ${finalFilteredTxs.length} mutasi transaksi`}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-on-surface flex items-center justify-center shadow-xs transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-8 h-8 rounded-lg font-caption-medium text-caption-medium flex items-center justify-center shadow-xs transition cursor-pointer ${
                  currentPage === pg
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                }`}
                type="button"
              >
                {pg}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-on-surface flex items-center justify-center shadow-xs transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

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
              accountName={userName}
              accountEmail={userEmail}
              accountType={scopeFilter === 'personal' ? 'PERSONAL' : scopeFilter === 'shared' ? 'SHARED' : 'ALL'}
              periodLabel={periodLabel}
              txs={finalFilteredTxs}
              variant="ledger-footer"
              label="Cetak Rekening Koran (PDF)"
              className="w-full md:w-auto"
            />
            <ExportCsvButton
              txs={finalFilteredTxs}
              accountName={userName}
              accountEmail={userEmail}
              accountType={scopeFilter === 'personal' ? 'PERSONAL' : scopeFilter === 'shared' ? 'SHARED' : 'ALL'}
              periodLabel={periodLabel}
              filename={`laporan-mutasi-${scopeFilter}-${period}.csv`}
              label="Unduh CSV"
              variant="ledger-footer"
              className="w-full md:w-auto"
            />
          </div>
        </div>
      </div>

      {/* 5. Modal Rincian Transaksi (Inspector Dialog) */}
      {inspectTx &&
        createPortal(
          <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-on-surface/50 backdrop-blur-sm whitespace-normal break-words text-left animate-in fade-in"
            onClick={() => setInspectTx(null)}
          >
            <div
              className="rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest max-w-lg w-full p-5 sm:p-space-lg shadow-2xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-10 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-2" />

              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-2xl">
                    receipt_long
                  </span>
                  <div>
                    <h3 className="font-headline-h3 text-headline-h3 text-on-surface font-semibold">
                      Lembar Rincian Transaksi
                    </h3>
                    <p className="font-caption text-caption text-outline font-mono">
                      {inspectTx.refCode}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectTx(null)}
                  className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Rincian Finansial */}
              <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-xs border border-surface-container">
                <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant">
                  <span>Waktu Pencatatan:</span>
                  <span className="font-caption-medium text-caption-medium text-on-surface">
                    {formatDate(inspectTx.transaction_date + 'T00:00:00')}
                  </span>
                </div>
                <span className="font-headline-h2 text-headline-h2 text-on-surface font-semibold">
                  {inspectTx.description || 'Transaksi Buku Kas'}
                </span>
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                    {inspectTx.category_name || 'Operasional'}
                  </span>
                  <span
                    className={`font-currency-display text-currency-display tabular-nums font-bold ${
                      inspectTx.status === 'VOIDED'
                        ? 'text-outline line-through'
                        : inspectTx.transaction_type === 'INCOME' || inspectTx.transaction_type === 'CONTRIBUTION'
                        ? 'text-primary'
                        : 'text-error'
                    }`}
                  >
                    {inspectTx.transaction_type === 'INCOME' || inspectTx.transaction_type === 'CONTRIBUTION'
                      ? '+'
                      : '−'}{' '}
                    {formatRupiah(inspectTx.amount)}
                  </span>
                </div>
              </div>

              {/* Metadata Informasi */}
              <div className="rounded-xl bg-surface-container-low/60 p-space-md space-y-2 font-caption text-caption text-on-surface-variant border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="text-outline">Wadah Pembukuan:</span>
                  <strong className="text-on-surface">
                    {inspectTx.scope_type === 'SHARED'
                      ? `Tabungan Bersama (${inspectTx.group_name || 'Grup'})`
                      : 'Tabungan Personal (Mandiri)'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Status Pembukuan:</span>
                  <strong
                    className={
                      inspectTx.status === 'VOIDED'
                        ? 'text-error'
                        : inspectTx.status === 'PENDING_APPROVAL'
                        ? 'text-secondary'
                        : 'text-primary'
                    }
                  >
                    {inspectTx.status === 'VOIDED'
                      ? `Dibatalkan (${inspectTx.void_reason || 'Void'})`
                      : inspectTx.status === 'PENDING_APPROVAL'
                      ? 'Menunggu Persetujuan'
                      : 'Tervalidasi (Aktif)'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Dicatat Oleh:</span>
                  <strong className="text-on-surface">
                    {inspectTx.created_by_user_id === userId ? `${userName} (Anda)` : inspectTx.actor_name || 'Anggota'}
                  </strong>
                </div>
              </div>

              {/* Lampiran Struk jika Ada */}
              {inspectTx.receipt_url && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-caption text-caption text-outline uppercase tracking-wider font-semibold">
                    Lampiran Bukti Transaksi
                  </span>
                  <div className="rounded-xl border border-surface-container-highest overflow-hidden bg-surface-container-low p-2 flex flex-col items-center gap-2">
                    <img
                      src={inspectTx.receipt_url}
                      alt="Bukti Transaksi"
                      className="max-h-56 w-auto object-contain rounded-lg"
                    />
                    <a
                      href={inspectTx.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      Buka Gambar Ukuran Penuh ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-space-xs border-t border-surface-container">
                {inspectTx.status === 'ACTIVE' ? (
                  <VoidTransactionButton
                    txId={inspectTx.id}
                    description={inspectTx.description || 'Transaksi'}
                  />
                ) : (
                  <span className="text-xs text-outline italic">Status audit final</span>
                )}

                <button
                  type="button"
                  onClick={() => setInspectTx(null)}
                  className="h-10 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-medium text-body-medium transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

