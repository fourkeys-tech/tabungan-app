'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { SavingsPot, Tx } from '@/utils/finance';
import { formatRupiah, formatDate, parseValidDate } from '@/utils/format';
import { usePrivacy } from '@/components/PrivacyContext';
import { AddPersonalTransactionModal } from '@/components/AddPersonalTransactionModal';
import { CreatePersonalPotModal } from '@/components/CreatePersonalPotModal';
import { CategoryManager, type CategoryData } from '@/components/CategoryManager';
import { ExportPdfStatementButton } from '@/components/ExportPdfStatementButton';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { SavingsPacingCalculator } from '@/components/SavingsPacingCalculator';
import { HorizontalScroller } from '@/components/HorizontalScroller';
import {
  voidTransaction,
  updatePersonalTransactionAction,
} from '@/app/actions/transactions';

interface Props {
  userId: string;
  accountName: string;
  accountEmail?: string;
  balance: number;
  openingBalance: number;
  personalTxs: Tx[];
  categories: CategoryData[];
  pots?: SavingsPot[];
}

type PeriodKey = '7d' | 'month' | 'quarter' | 'year' | 'all';

const CATEGORY_COLORS = [
  { dot: 'bg-primary', bar: 'bg-primary' },
  { dot: 'bg-secondary', bar: 'bg-secondary' },
  { dot: 'bg-tertiary', bar: 'bg-tertiary' },
  { dot: 'bg-outline', bar: 'bg-outline' },
  { dot: 'bg-primary-container', bar: 'bg-primary-container' },
];

function formatNumberOnly(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Math.abs(Number(n ?? 0))
  );
}

export function PersonalLedgerClient({
  userId,
  accountName,
  accountEmail,
  balance,
  openingBalance,
  personalTxs,
  categories,
  pots = [],
}: Props) {
  const router = useRouter();
  const { isHidden, togglePrivacy } = usePrivacy();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedPotId, setSelectedPotId] = useState<string>('ALL');
  const potsList = pots ?? [];
  const activePot = selectedPotId !== 'ALL' ? potsList.find((p) => p.id === selectedPotId) : null;

  const potFilteredTxs = useMemo(() => {
    if (!activePot) return personalTxs;
    return personalTxs.filter((t) => t.pot_id === activePot.id);
  }, [personalTxs, activePot]);

  const effectiveBalance = activePot ? activePot.balance : balance;
  const effectiveOpening = activePot ? activePot.opening_balance : openingBalance;

  // 1. State Filter Periode di Hero Card
  const [period, setPeriod] = useState<PeriodKey>(() => {
    const today = new Date();
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const hasThisMonth = personalTxs.some((t) =>
      (t.transaction_date || '').startsWith(ym)
    );
    return hasThisMonth || personalTxs.length === 0 ? 'month' : 'all';
  });

  // 2. State Toolbar Filter Tabel Transaksi
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'INCOME' | 'EXPENSE'>('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // 3. State Modal Detail / Edit / Void Transaksi
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'void'>('view');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states untuk Edit Transaksi
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');

  // Form state untuk Void / Hapus Transaksi
  const [voidReason, setVoidReason] = useState('');

  // 4. State Modal Atur Kategori
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Informasi tanggal saat ini
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(now);

  // Filter transaksi berdasarkan Periode yang dipilih
  const { periodTxs, periodDateRangeLabel, periodSubtitle } = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate: Date | null = null;
    let subtitle = 'bulan ini';
    let rangeLabel = `Bulan Ini (${currentMonthLabel})`;

    if (period === '7d') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      subtitle = '7 hari terakhir';
      rangeLabel = `${formatDate(startDate)} - ${formatDate(today)}`;
    } else if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
      subtitle = 'bulan ini';
      rangeLabel = `${formatDate(startDate)} - ${formatDate(today)}`;
    } else if (period === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      startDate = new Date(today.getFullYear(), qMonth, 1, 0, 0, 0);
      subtitle = 'kuartal ini';
      rangeLabel = `${formatDate(startDate)} - ${formatDate(today)}`;
    } else if (period === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
      subtitle = `tahun ${currentYear}`;
      rangeLabel = `01 Jan ${currentYear} - ${formatDate(today)}`;
    } else {
      startDate = null;
      subtitle = 'seluruh periode';
      rangeLabel = 'Semua Periode';
    }

    const filtered = potFilteredTxs.filter((tx) => {
      if (!startDate) return true;
      const txD = parseValidDate(tx.transaction_date);
      return txD >= startDate;
    });

    return {
      periodTxs: filtered,
      periodDateRangeLabel: rangeLabel,
      periodSubtitle: subtitle,
    };
  }, [potFilteredTxs, period, now, currentMonthLabel, currentYear]);

  // 3 Metrik Utama berdasarkan transaksi ACTIVE pada periode terpilih
  const { periodIncome, periodExpense, netCashflow, categoryBreakdown } = useMemo(() => {
    const activePeriodTxs = periodTxs.filter((t) => t.status !== 'VOIDED');

    const inc = activePeriodTxs
      .filter((t) => t.transaction_type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expTxs = activePeriodTxs.filter((t) => t.transaction_type === 'EXPENSE');
    const exp = expTxs.reduce((sum, t) => sum + t.amount, 0);

    // Breakdown Kategori Pengeluaran
    const byCat: Record<string, number> = {};
    for (const t of expTxs) {
      const catName = t.category_name || 'Pengeluaran Lainnya';
      byCat[catName] = (byCat[catName] || 0) + t.amount;
    }

    const breakdown = Object.entries(byCat)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: exp > 0 ? Math.round((amount / exp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      periodIncome: inc,
      periodExpense: exp,
      netCashflow: inc - exp,
      categoryBreakdown: breakdown,
    };
  }, [periodTxs]);

  // Daftar kategori unik untuk filter dropdown & form
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categories
      .filter((c) => c.scope_type === 'PERSONAL')
      .forEach((c) => set.add(c.name));
    personalTxs.forEach((t) => {
      if (t.category_name) set.add(t.category_name);
    });
    return Array.from(set);
  }, [categories, personalTxs]);

  // Filter & Sort untuk Tabel Daftar Transaksi Personal
  const filteredTableTxs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = periodTxs.filter((tx) => {
      const desc = (tx.description || '').toLowerCase();
      const cat = tx.category_name || 'Lainnya';
      const matchSearch =
        !q || desc.includes(q) || cat.toLowerCase().includes(q);
      const matchCat = !categoryFilter || cat === categoryFilter;
      const matchType = !typeFilter || tx.transaction_type === typeFilter;
      return matchSearch && matchCat && matchType;
    });

    list.sort((a, b) => {
      if (sortField === 'date') {
        const dA = new Date(a.transaction_date).getTime();
        const dB = new Date(b.transaction_date).getTime();
        return sortOrder === 'desc' ? dB - dA : dA - dB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return list;
  }, [periodTxs, searchQuery, categoryFilter, typeFilter, sortField, sortOrder]);

  // Reset halaman ke 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [period, searchQuery, categoryFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTableTxs.length / pageSize));
  const paginatedTxs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableTxs.slice(start, start + pageSize);
  }, [filteredTableTxs, currentPage]);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handler Buka Modal Detail
  const openDetailModal = (tx: Tx) => {
    setSelectedTx(tx);
    setModalMode('view');
    setActionError(null);
    setEditType(tx.transaction_type === 'INCOME' ? 'INCOME' : 'EXPENSE');
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category_name || 'Lainnya');
    setEditDescription(tx.description || '');
    setEditDate(tx.transaction_date);
    setEditPaymentMethod(tx.payment_method || 'Transfer Bank');
    setVoidReason('');
  };

  const closeDetailModal = () => {
    if (actionLoading) return;
    setSelectedTx(null);
    setModalMode('view');
    setActionError(null);
  };

  // Handler Simpan Perubahan (Edit Transaksi)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setActionLoading(true);
    setActionError(null);

    const cleanAmount = Number(editAmount.replace(/[^0-9]/g, ''));
    const res = await updatePersonalTransactionAction(selectedTx.id, {
      type: editType,
      amount: cleanAmount,
      categoryName: editCategory,
      description: editDescription,
      transactionDate: editDate,
      paymentMethod: editPaymentMethod,
    });

    setActionLoading(false);
    if (res.error) {
      setActionError(res.error);
    } else {
      setSelectedTx(null);
      router.refresh();
    }
  };

  // Handler Hapus / Void Transaksi
  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    const reasonToUse =
      voidReason.trim().length >= 3
        ? voidReason.trim()
        : 'Dihapus dari pos pembukuan personal oleh pemilik akun';

    setActionLoading(true);
    setActionError(null);

    const res = await voidTransaction(selectedTx.id, reasonToUse);
    setActionLoading(false);

    if (res.error) {
      setActionError(res.error);
    } else {
      setSelectedTx(null);
      router.refresh();
    }
  };

  // Helper warna dot kategori di tabel
  const getCategoryDotClass = (catName?: string | null, isIncome?: boolean) => {
    if (isIncome) return 'bg-primary-container';
    if (!catName) return 'bg-outline';
    const idx =
      Math.abs(
        catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % CATEGORY_COLORS.length;
    return CATEGORY_COLORS[idx].dot;
  };

  return (
    <div className="flex flex-col gap-space-xl w-full">
      {/* PAGE HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-caption-medium text-caption-medium tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>Portofolio Mandiri</span>
          </div>
          <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight">
            Tabungan Personal
          </h1>
          <p className="font-body-default text-body-default text-on-surface-variant max-w-xl">
            Kelola saldo mandiri, pemasukan, dan alokasi pos belanja pribadi Anda secara terukur dan disiplin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm shrink-0">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-11 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-medium text-body-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-outline text-[20px]">
              tune
            </span>
            <span>Atur Kategori</span>
          </button>

          <CreatePersonalPotModal
            triggerText="+ Buat Pos Baru"
            variant="secondary"
          />

          <AddPersonalTransactionModal
            pots={potsList.map((p) => ({ id: p.id, name: p.name }))}
            defaultPotId={activePot?.id}
            triggerText="+ Tambah Transaksi"
            initialCategories={availableCategories}
          />
        </div>
      </header>

      {/* SECTION DAFTAR KANTONG / POS TABUNGAN PERSONAL */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">
              account_balance_wallet
            </span>
            <h2 className="font-headline-h3 text-headline-h3 text-on-surface">
              Pos &amp; Alokasi Tabungan ({potsList.length} Pos)
            </h2>
          </div>
          <span className="font-caption text-caption text-on-surface-variant">
            Pilih pos untuk melihat rincian &amp; mutasi spesifik
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {/* Card: Semua Pos Personal (Total) */}
          <button
            type="button"
            onClick={() => setSelectedPotId('ALL')}
            className={`p-space-md rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
              selectedPotId === 'ALL'
                ? 'bg-primary-container/20 border-primary shadow-sm ring-1 ring-primary'
                : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-caption-medium text-caption-medium text-on-surface uppercase tracking-wider">
                  Semua Pos Personal
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedPotId === 'ALL'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {selectedPotId === 'ALL' ? 'Aktif Dipilih' : 'Semua'}
                </span>
              </div>
              <div className="mt-2">
                <span className="font-currency-body text-headline-h3 text-on-surface font-bold tabular-nums block">
                  {isHidden ? '••••••••' : formatRupiah(balance)}
                </span>
                <span className="font-caption text-caption text-on-surface-variant block mt-1">
                  Akumulasi saldo seluruh pos personal Anda
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{personalTxs.length} Transaksi Tercatat</span>
              <span className="text-primary font-medium">Tampilkan Semua &rarr;</span>
            </div>
          </button>

          {/* Cards: Masing-masing Pos Personal */}
          {potsList.map((pot) => {
            const isSelected = selectedPotId === pot.id;
            const progress =
              pot.target_amount && pot.target_amount > 0
                ? Math.min(100, Math.round((pot.balance / pot.target_amount) * 100))
                : null;

            return (
              <div
                key={pot.id}
                onClick={() => setSelectedPotId(pot.id)}
                className={`p-space-md rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary-container/20 border-primary shadow-sm ring-1 ring-primary'
                    : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-caption-medium text-caption-medium text-on-surface font-semibold truncate max-w-[180px]">
                      {pot.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {isSelected ? 'Aktif Dipilih' : 'Pos Personal'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-currency-body text-headline-h3 text-on-surface font-bold tabular-nums block">
                      {isHidden ? '••••••••' : formatRupiah(pot.balance)}
                    </span>
                    <p className="font-caption text-caption text-on-surface-variant line-clamp-1 mt-0.5">
                      {pot.description || 'Pos tabungan mandiri aktif'}
                    </p>
                  </div>
                </div>

                {/* Progress bar jika memiliki target */}
                {pot.target_amount && pot.target_amount > 0 && (
                  <div className="mt-3 pt-2 border-t border-outline-variant/20">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-on-surface-variant">
                        Target: {formatRupiah(pot.target_amount)}
                      </span>
                      <span className="font-semibold text-primary">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Create Card */}
          <div className="p-space-md rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 hover:bg-surface-container-low flex flex-col items-center justify-center text-center gap-2 min-h-[120px] transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <div>
              <span className="font-caption-medium text-caption-medium text-on-surface block font-semibold">
                Tambah Pos Tabungan Lain
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Pisahkan dana darurat, belanja, laptop, dll.
              </span>
            </div>
            <CreatePersonalPotModal triggerText="+ Buat Pos Baru" variant="inline" />
          </div>
        </div>
      </section>

      {/* HERO BALANCE CARD */}
      <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <div className="flex items-center gap-space-xs">
              <span className="font-caption-medium text-caption-medium uppercase tracking-wider text-outline">
                {activePot ? `Saldo Pos: ${activePot.name}` : 'Saldo Seluruh Pos Personal'}
              </span>
              <button
                onClick={togglePrivacy}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
                title="Sembunyikan/Tampilkan Nominal"
                type="button"
              >
                <span className="material-symbols-outlined text-base leading-none">
                  {isHidden ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-baseline gap-space-xs">
              <span className="font-body-lg text-body-lg text-on-surface-variant font-medium">
                Rp
              </span>
              <span className="font-currency-display text-currency-display text-on-surface tracking-tight tabular-nums">
                {isHidden ? '••••••••' : formatNumberOnly(effectiveBalance)}
              </span>
              <span className="font-caption-medium text-caption-medium text-primary px-space-xs py-0.5 rounded-full bg-primary-fixed/30 ml-space-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  trending_up
                </span>{' '}
                Aktif
              </span>
            </div>
          </div>

          {/* Filter Periode Segmented Control */}
          <HorizontalScroller
            className="bg-surface-container-high p-1 rounded-lg flex items-center gap-1 shadow-inner"
            wrapperClassName="self-stretch sm:self-start lg:self-auto max-w-full"
          >
            {(
              [
                { id: '7d', label: '7 Hari Terakhir' },
                { id: 'month', label: `Bulan Ini (${currentMonthLabel})` },
                { id: 'quarter', label: 'Kuartal Ini' },
                { id: 'year', label: `Tahun ${currentYear}` },
                { id: 'all', label: 'Semua' },
              ] as { id: PeriodKey; label: string }[]
            ).map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPeriod(tab.id)}
                  type="button"
                  className={
                    active
                      ? 'px-space-sm py-1.5 rounded font-caption-medium text-caption-medium bg-surface-container-lowest text-on-surface shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0'
                      : 'px-space-sm py-1.5 rounded font-caption text-caption text-on-surface-variant hover:text-on-surface transition-all cursor-pointer whitespace-nowrap shrink-0'
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </HorizontalScroller>
        </div>

        {/* 3 Metrik Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
          {/* Pemasukan */}
          <div className="rounded-lg bg-surface-container-low p-space-md flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-lg bg-primary-fixed/40 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                arrow_downward_alt
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-caption text-caption text-on-surface-variant">
                  Pemasukan
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-container-highest text-primary leading-none">
                  Masuk
                </span>
              </div>
              <span className="font-currency-body text-currency-body text-primary truncate tabular-nums">
                {isHidden ? 'Rp ••••••••' : `+ ${formatRupiah(periodIncome)}`}
              </span>
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="rounded-lg bg-surface-container-low p-space-md flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-lg bg-tertiary-fixed/50 text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                arrow_upward_alt
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-caption text-caption text-on-surface-variant">
                  Pengeluaran
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-container-highest text-tertiary leading-none">
                  Keluar
                </span>
              </div>
              <span className="font-currency-body text-currency-body text-tertiary truncate tabular-nums">
                {isHidden ? 'Rp ••••••••' : `− ${formatRupiah(periodExpense)}`}
              </span>
            </div>
          </div>

          {/* Arus Kas Bersih */}
          <div className="rounded-lg bg-surface-container-low p-space-md flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-lg bg-secondary-fixed/50 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                account_balance
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-caption text-caption text-on-surface-variant">
                  Arus Kas Bersih
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary leading-none">
                  Sisa Alokasi
                </span>
              </div>
              <span className="font-currency-body text-currency-body text-secondary truncate tabular-nums">
                {isHidden
                  ? 'Rp ••••••••'
                  : `${netCashflow >= 0 ? '+' : '−'} ${formatRupiah(
                      Math.abs(netCashflow)
                    )}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* BREAKDOWN & VISUALISASI PENGELUARAN */}
      <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col">
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface tracking-tight">
              Breakdown Kategori Pengeluaran
            </h2>
            <span className="font-caption text-caption text-on-surface-variant">
              Distribusi pemakaian dana operasional pribadi {periodSubtitle}
            </span>
          </div>
          <div className="flex items-center gap-space-xs font-caption-medium text-caption-medium text-on-surface-variant bg-surface-container-low px-space-sm py-1 rounded-md tabular-nums">
            <span>
              Total: {isHidden ? 'Rp ••••••••' : formatRupiah(periodExpense)}
            </span>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="rounded-lg bg-surface-container-low/60 p-space-md text-center text-on-surface-variant font-caption text-caption">
            Belum ada catatan pengeluaran aktif pada periode {periodSubtitle}.
          </div>
        ) : (
          <div className="flex flex-col gap-space-md pt-space-xs">
            {categoryBreakdown.map((item, idx) => {
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              return (
                <div key={item.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-caption font-caption">
                    <div className="flex items-center gap-space-xs min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${color.dot} inline-block shrink-0`}
                      />
                      <span className="font-body-medium text-body-medium text-on-surface truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-space-md shrink-0 tabular-nums">
                      <span className="text-on-surface-variant font-caption">
                        {item.percentage}%
                      </span>
                      <span className="font-currency-body text-currency-body text-on-surface">
                        {isHidden ? 'Rp ••••••••' : formatRupiah(item.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TABEL TRANSAKSI PERSONAL */}
      <section className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <h2 className="font-headline-h2 text-headline-h2 text-on-surface tracking-tight">
              Daftar Transaksi Personal
            </h2>
            <p className="font-caption text-caption text-on-surface-variant">
              Seluruh riwayat aliran kas mandiri yang terverifikasi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-caption-medium text-caption-medium text-outline mr-1">
              {period === 'month' ? 'Bulan Berjalan' : periodDateRangeLabel}
            </span>
            <ExportPdfStatementButton
              accountName={accountName}
              accountEmail={accountEmail}
              accountType="PERSONAL"
              txs={filteredTableTxs}
              openingBalance={openingBalance}
              label="Cetak PDF"
            />
            <ExportCsvButton
              txs={filteredTableTxs}
              accountName={accountName}
              accountEmail={accountEmail}
              accountType="PERSONAL"
              openingBalance={openingBalance}
              periodLabel={periodDateRangeLabel}
              filename={`mutasi-tabungan-personal-${period}.csv`}
              label="Unduh CSV"
            />
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm pt-space-xs">
          <div className="md:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[20px] pointer-events-none">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary transition-colors shadow-inner"
              placeholder="Cari keterangan..."
              type="text"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary transition-colors shadow-inner cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={() =>
                setPeriod((prev) => (prev === 'all' ? 'month' : 'all'))
              }
              title="Klik untuk beralih antara Bulan Ini dan Semua Periode"
              className="w-full h-11 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-between text-on-surface-variant font-caption text-caption shadow-inner transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-outline text-[18px] shrink-0">
                  calendar_month
                </span>
                <span className="truncate">{periodDateRangeLabel}</span>
              </div>
              <span className="material-symbols-outlined text-outline text-[16px] shrink-0">
                expand_more
              </span>
            </button>
          </div>

          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as '' | 'INCOME' | 'EXPENSE')
              }
              className="w-full h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary transition-colors shadow-inner cursor-pointer"
            >
              <option value="">Semua Jenis</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
            </select>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto rounded-lg hide-scrollbar">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high text-on-surface-variant font-caption-medium text-caption-medium">
                <th
                  onClick={() => toggleSort('date')}
                  className="py-space-sm px-space-md cursor-pointer hover:text-on-surface select-none whitespace-nowrap"
                  scope="col"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="py-space-sm px-space-md" scope="col">
                  Keterangan
                </th>
                <th className="py-space-sm px-space-md" scope="col">
                  Kategori
                </th>
                <th className="py-space-sm px-space-md" scope="col">
                  Jenis
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="py-space-sm px-space-md text-right cursor-pointer hover:text-on-surface select-none whitespace-nowrap"
                  scope="col"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Nominal</span>
                    <span className="material-symbols-outlined text-[14px]">
                      unfold_more
                    </span>
                  </div>
                </th>
                <th className="py-space-sm px-space-md text-center" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-default text-body-default text-on-surface">
              {paginatedTxs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-space-xl px-space-md text-center text-on-surface-variant font-caption text-caption"
                  >
                    Tidak ada transaksi yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedTxs.map((tx) => {
                  const isIncome = tx.transaction_type === 'INCOME';
                  const isVoided = tx.status === 'VOIDED';
                  const catLabel =
                    tx.category_name ||
                    (isIncome ? 'Gaji & Pendapatan' : 'Kebutuhan Pokok');
                  const dotClass = getCategoryDotClass(catLabel, isIncome);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        isVoided ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-space-sm px-space-md whitespace-nowrap text-on-surface-variant font-caption text-caption">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="py-space-sm px-space-md font-body-medium text-body-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={isVoided ? 'line-through' : ''}>
                            {tx.description ||
                              (isIncome
                                ? 'Pemasukan Pribadi'
                                : 'Pengeluaran Pribadi')}
                          </span>
                          {tx.receipt_url && (
                            <span
                              title="Memiliki lampiran bukti transfer"
                              className="inline-flex items-center text-secondary"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                receipt
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-caption text-caption">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                          />
                          {catLabel}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap">
                        {isVoided ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-highest text-outline font-caption-medium text-caption-medium">
                            Dibatalkan (VOID)
                          </span>
                        ) : isIncome ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-caption-medium text-caption-medium">
                            Pemasukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-caption-medium text-caption-medium">
                            Pengeluaran
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-space-sm px-space-md whitespace-nowrap text-right font-currency-body text-currency-body tabular-nums ${
                          isVoided
                            ? 'text-outline line-through'
                            : isIncome
                            ? 'text-primary'
                            : 'text-error'
                        }`}
                      >
                        {isHidden
                          ? 'Rp ••••••••'
                          : `${isIncome ? '+' : '−'} ${formatRupiah(tx.amount)}`}
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap text-center">
                        <button
                          onClick={() => openDetailModal(tx)}
                          className="px-space-sm py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium transition-colors cursor-pointer"
                          type="button"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs text-on-surface-variant font-caption text-caption">
          <span>
            {filteredTableTxs.length === 0
              ? 'Menampilkan 0 transaksi'
              : `Menampilkan ${(currentPage - 1) * pageSize + 1}–${Math.min(
                  currentPage * pageSize,
                  filteredTableTxs.length
                )} dari ${filteredTableTxs.length} transaksi`}
          </span>

          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                chevron_left
              </span>
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                )
                .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                    acc.push('ellipsis');
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`el-${idx}`} className="px-1 text-outline">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      type="button"
                      className={
                        currentPage === item
                          ? 'h-9 w-9 rounded-lg bg-primary text-on-primary font-caption-medium text-caption-medium flex items-center justify-center cursor-pointer'
                          : 'h-9 w-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-caption text-caption flex items-center justify-center transition-colors cursor-pointer'
                      }
                    >
                      {item}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              type="button"
            >
              <span>Selanjutnya</span>
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* KALKULATOR TARGET & SIMULASI MENABUNG MANDIRI */}
      <SavingsPacingCalculator
        mode="personal"
        currentBalance={balance}
        targetAmount={
          balance > 0 ? Math.ceil((balance * 1.5) / 1000000) * 1000000 : 5000000
        }
        targetDate={null}
        memberCount={1}
      />

      {/* MODAL DETAIL / UBAH / HAPUS TRANSAKSI (React Portal) */}
      {mounted &&
        selectedTx &&
        createPortal(
          <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-on-surface/50 backdrop-blur-sm whitespace-normal break-words text-left"
            onClick={closeDetailModal}
          >
            <div
              className="rounded-t-2xl sm:rounded-xl bg-surface-container-lowest max-w-lg w-full p-5 sm:p-space-lg shadow-xl flex flex-col gap-space-md animate-in fade-in max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-10 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[24px]">
                    receipt_long
                  </span>
                  <h3 className="font-headline-h3 text-headline-h3 text-on-surface">
                    {modalMode === 'edit'
                      ? 'Ubah Transaksi Personal'
                      : modalMode === 'void'
                      ? 'Batalkan / Hapus Transaksi'
                      : 'Detail Transaksi Personal'}
                  </h3>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-outline hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container font-caption text-caption">
                  {actionError}
                </div>
              )}

              {modalMode === 'view' && (
                <>
                  <div className="rounded-lg bg-surface-container-low p-space-md flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between text-caption font-caption text-on-surface-variant">
                      <span>Keterangan</span>
                      <span className="font-caption-medium text-caption-medium text-on-surface">
                        {formatDate(selectedTx.transaction_date)}
                      </span>
                    </div>
                    <span className="font-headline-h2 text-headline-h2 text-on-surface">
                      {selectedTx.description ||
                        (selectedTx.transaction_type === 'INCOME'
                          ? 'Pemasukan Pribadi'
                          : 'Pengeluaran Pribadi')}
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-space-2xs">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-caption text-caption">
                        {selectedTx.category_name || 'Kebutuhan Pribadi'}
                      </span>
                      <span
                        className={`font-currency-display text-currency-display tabular-nums ${
                          selectedTx.status === 'VOIDED'
                            ? 'text-outline line-through'
                            : selectedTx.transaction_type === 'INCOME'
                            ? 'text-primary'
                            : 'text-error'
                        }`}
                      >
                        {selectedTx.transaction_type === 'INCOME' ? '+' : '−'}{' '}
                        {formatRupiah(selectedTx.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-body-default font-body-default">
                    <span className="font-caption text-caption text-outline uppercase tracking-wider">
                      Catatan &amp; Rincian Tambahan
                    </span>
                    <div className="text-on-surface-variant bg-surface-container p-3 rounded-lg font-caption text-caption space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-outline">Metode Pembayaran:</span>
                        <strong className="text-on-surface">
                          {selectedTx.payment_method || 'Transfer Bank / Kas Mandiri'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-outline">Status Pembukuan:</span>
                        <strong
                          className={
                            selectedTx.status === 'VOIDED'
                              ? 'text-error'
                              : 'text-primary'
                          }
                        >
                          {selectedTx.status === 'VOIDED'
                            ? `DIBATALKAN (${selectedTx.void_reason || 'Void'})`
                            : 'TERVERIFIKASI (AKTIF)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {selectedTx.receipt_url && (
                    <div className="flex flex-col gap-1.5">
                      <span className="font-caption text-caption text-outline uppercase tracking-wider">
                        Lampiran Bukti Transaksi
                      </span>
                      <div className="rounded-lg border border-surface-container-highest overflow-hidden bg-surface-container-low p-2 flex flex-col items-center gap-2">
                        <img
                          src={selectedTx.receipt_url}
                          alt="Bukti Transaksi"
                          className="max-h-56 w-auto object-contain rounded"
                        />
                        <a
                          href={selectedTx.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-secondary hover:underline font-medium"
                        >
                          Buka Gambar Ukuran Penuh ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action Panel: Edit & Destructive Delete */}
                  <div className="flex items-center justify-between pt-space-xs">
                    {selectedTx.status !== 'VOIDED' ? (
                      <button
                        onClick={() => setModalMode('void')}
                        className="h-10 px-space-md rounded-lg bg-error-container hover:bg-error/20 text-error font-body-medium text-body-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                        <span>Hapus</span>
                      </button>
                    ) : (
                      <span className="font-caption text-caption text-outline italic">
                        Transaksi telah di-void
                      </span>
                    )}

                    <div className="flex items-center gap-space-sm">
                      <button
                        onClick={closeDetailModal}
                        className="h-10 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-medium text-body-medium transition-colors cursor-pointer"
                        type="button"
                      >
                        Tutup
                      </button>
                      {selectedTx.status !== 'VOIDED' && (
                        <button
                          onClick={() => setModalMode('edit')}
                          className="h-10 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                          <span>Ubah</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {modalMode === 'edit' && (
                <form
                  onSubmit={handleSaveEdit}
                  className="flex flex-col gap-space-sm"
                >
                  <div className="flex flex-col gap-1">
                    <label className="font-caption-medium text-caption-medium text-on-surface">
                      Jenis Transaksi
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-surface-container-high p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setEditType('INCOME')}
                        className={
                          editType === 'INCOME'
                            ? 'flex items-center justify-center py-2 rounded-md bg-surface-container-lowest text-primary font-body-medium text-body-medium shadow-sm cursor-pointer'
                            : 'flex items-center justify-center py-2 rounded-md text-on-surface-variant font-body-medium text-body-medium cursor-pointer'
                        }
                      >
                        + Pemasukan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('EXPENSE')}
                        className={
                          editType === 'EXPENSE'
                            ? 'flex items-center justify-center py-2 rounded-md bg-surface-container-lowest text-tertiary font-body-medium text-body-medium shadow-sm cursor-pointer'
                            : 'flex items-center justify-center py-2 rounded-md text-on-surface-variant font-body-medium text-body-medium cursor-pointer'
                        }
                      >
                        − Pengeluaran
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-caption-medium text-caption-medium text-on-surface">
                      Nominal (IDR)
                    </label>
                    <div className="flex items-center h-11 rounded-lg bg-surface-container-low px-3 shadow-inner">
                      <span className="text-outline font-body-medium text-body-medium mr-2">
                        Rp
                      </span>
                      <input
                        type="text"
                        required
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-transparent text-on-surface font-currency-body text-currency-body focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="font-caption-medium text-caption-medium text-on-surface">
                        Kategori
                      </label>
                      <input
                        type="text"
                        list="personal-edit-categories"
                        required
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none shadow-inner"
                      />
                      <datalist id="personal-edit-categories">
                        {availableCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-caption-medium text-caption-medium text-on-surface">
                        Tanggal Transaksi
                      </label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-caption-medium text-caption-medium text-on-surface">
                      Keterangan
                    </label>
                    <input
                      type="text"
                      required
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none shadow-inner"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                    <button
                      type="button"
                      onClick={() => setModalMode('view')}
                      disabled={actionLoading}
                      className="h-10 px-space-md rounded-lg bg-surface-container text-on-surface font-body-medium text-body-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="h-10 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              )}

              {modalMode === 'void' && (
                <form
                  onSubmit={handleConfirmVoid}
                  className="flex flex-col gap-space-sm"
                >
                  <p className="font-caption text-caption text-on-surface-variant">
                    Transaksi{' '}
                    <strong className="text-on-surface">
                      &ldquo;{selectedTx.description || 'Transaksi Pribadi'}&rdquo;
                    </strong>{' '}
                    akan diubah statusnya menjadi{' '}
                    <strong className="text-tertiary">VOIDED</strong> dan
                    dikeluarkan dari perhitungan saldo personal.
                  </p>
                  <div className="flex flex-col gap-1">
                    <label className="font-caption-medium text-caption-medium text-on-surface">
                      Alasan Penghapusan / Pembatalan
                    </label>
                    <input
                      type="text"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Contoh: Salah input nominal / duplikat"
                      className="h-11 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-default text-body-default focus:outline-none shadow-inner"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                    <button
                      type="button"
                      onClick={() => setModalMode('view')}
                      disabled={actionLoading}
                      className="h-10 px-space-md rounded-lg bg-surface-container text-on-surface font-body-medium text-body-medium cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="h-10 px-space-md rounded-lg bg-error text-on-error font-body-medium text-body-medium shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading
                        ? 'Memproses...'
                        : 'Ya, Hapus dari Pos Personal'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* MODAL ATUR KATEGORI (React Portal) */}
      {mounted &&
        isCategoryModalOpen &&
        createPortal(
          <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-on-surface/50 backdrop-blur-sm whitespace-normal break-words text-left"
            onClick={() => setIsCategoryModalOpen(false)}
          >
            <div
              className="rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest max-w-3xl w-full p-5 sm:p-space-lg shadow-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-10 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    tune
                  </span>
                  <h3 className="font-headline-h3 text-headline-h3 text-on-surface">
                    Pengaturan Kategori Tabungan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="text-outline hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <CategoryManager
                initialCategories={categories}
                currentUserId={userId}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

