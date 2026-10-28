'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Group, Tx } from '@/utils/finance';
import { groupBalance } from '@/utils/finance';
import { formatRupiah, formatDate } from '@/utils/format';
import { usePrivacy } from '@/components/PrivacyContext';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { AddSharedTransactionModal } from '@/components/AddSharedTransactionModal';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { LeaveGroupButton } from '@/components/LeaveGroupButton';
import { ExportPdfStatementButton } from '@/components/ExportPdfStatementButton';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PendingApprovalsCard } from '@/components/PendingApprovalsCard';
import { SavingsPacingCalculator } from '@/components/SavingsPacingCalculator';
import { HorizontalScroller } from '@/components/HorizontalScroller';
import { CategoryManager, type CategoryData } from '@/components/CategoryManager';
import { ReceiptViewerButton } from '@/components/ReceiptViewerButton';
import { VoidTransactionButton } from '@/components/VoidTransactionButton';
import type { PendingApprovalItem } from '@/app/actions/approvals';

export interface GroupMemberInfo {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  joined_at?: string;
}

export interface SharedAuditLogItem {
  id: string;
  group_id: string | null;
  action: string;
  title: string;
  description: string;
  timestamp: string;
  dotColor: 'primary' | 'secondary' | 'outline';
}

interface Props {
  userId: string;
  initialSelectedGroupId?: string;
  groups: Group[];
  sharedTxs: (Tx & { actor_name?: string })[];
  membersByGroup: Record<string, GroupMemberInfo[]>;
  auditLogsByGroup: Record<string, SharedAuditLogItem[]>;
  pendingApprovals: PendingApprovalItem[];
  categories: CategoryData[];
}

type GroupTabFilter = 'all' | 'owned' | 'member';

const AVATAR_TONES = [
  'bg-secondary-container text-on-secondary-container',
  'bg-primary-fixed text-on-primary-fixed-variant',
  'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'bg-surface-container-highest text-on-surface-variant',
];

function getInitials(name: string): string {
  const parts = (name || 'Anggota').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function SharedLedgerClient({
  userId,
  initialSelectedGroupId,
  groups,
  sharedTxs,
  membersByGroup,
  auditLogsByGroup,
  pendingApprovals,
  categories,
}: Props) {
  const { isHidden } = usePrivacy();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. State Filter Tab Grup (Semua Grup | Saya Kelola | Sebagai Anggota)
  const [tabFilter, setTabFilter] = useState<GroupTabFilter>('all');

  // 2. State Grup yang Sedang Dipilih di Panel Detail
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    initialSelectedGroupId || groups[0]?.id || ''
  );

  // 3. State Filter Buku Kas di Panel Detail (Bulan Ini vs Semua)
  const [ledgerPeriod, setLedgerPeriod] = useState<'month' | 'all'>('all');

  // 4. State Tampilkan Semua Anggota
  const [showAllMembers, setShowAllMembers] = useState(false);

  // 5. State Modal Aturan & Kategori Grup
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const ownedGroupsCount = useMemo(
    () => groups.filter((g) => g.role === 'OWNER').length,
    [groups]
  );
  const memberGroupsCount = useMemo(
    () => groups.filter((g) => g.role !== 'OWNER').length,
    [groups]
  );

  const filteredGroups = useMemo(() => {
    if (tabFilter === 'owned') {
      return groups.filter((g) => g.role === 'OWNER');
    }
    if (tabFilter === 'member') {
      return groups.filter((g) => g.role !== 'OWNER');
    }
    return groups;
  }, [groups, tabFilter]);

  // Pastikan selectedGroup selalu valid
  const selectedGroup = useMemo(
    () =>
      groups.find((g) => g.id === selectedGroupId) ||
      filteredGroups[0] ||
      groups[0] ||
      null,
    [groups, filteredGroups, selectedGroupId]
  );

  const sharedCategoryNames = useMemo(
    () =>
      Array.from(
        new Set(
          categories
            .filter((c) => c.scope_type === 'SHARED')
            .map((c) => c.name)
        )
      ),
    [categories]
  );

  // Transaksi untuk grup yang sedang dipilih
  const selectedGroupTxs = useMemo(() => {
    if (!selectedGroup) return [];
    return sharedTxs.filter((t) => t.group_id === selectedGroup.id);
  }, [sharedTxs, selectedGroup]);

  // Filter Bulan Ini vs Semua pada tabel Buku Kas Grup
  const displayedLedgerTxs = useMemo(() => {
    if (ledgerPeriod === 'all') return selectedGroupTxs;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    return selectedGroupTxs.filter((t) =>
      (t.transaction_date || '').startsWith(ym)
    );
  }, [selectedGroupTxs, ledgerPeriod]);

  // Anggota grup yang sedang dipilih
  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return membersByGroup[selectedGroup.id] || [];
  }, [membersByGroup, selectedGroup]);

  // Kontribusi per anggota di grup terpilih
  const memberContributions = useMemo(() => {
    const map: Record<string, number> = {};
    selectedGroupTxs
      .filter(
        (t) => t.status !== 'VOIDED' && t.transaction_type === 'CONTRIBUTION'
      )
      .forEach((t) => {
        const uid = t.contributor_user_id || t.created_by_user_id || 'unknown';
        map[uid] = (map[uid] || 0) + t.amount;
      });
    return map;
  }, [selectedGroupTxs]);

  // Grafik 4 Bulan Terakhir (Arus Kas Masuk vs Pengeluaran)
  const { fourMonthBars, healthRatio } = useMemo(() => {
    const now = new Date();
    const months: {
      key: string;
      label: string;
      inflow: number;
      outflow: number;
      isCurrent: boolean;
    }[] = [];

    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const label = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(
        d
      );
      months.push({
        key: ym,
        label,
        inflow: 0,
        outflow: 0,
        isCurrent: i === 0,
      });
    }

    let totalIn = 0;
    let totalOut = 0;

    selectedGroupTxs
      .filter((t) => t.status !== 'VOIDED')
      .forEach((t) => {
        const ym = (t.transaction_date || '').slice(0, 7);
        const isIn = t.transaction_type === 'CONTRIBUTION';
        if (isIn) totalIn += t.amount;
        else totalOut += t.amount;

        const bucket = months.find((m) => m.key === ym);
        if (bucket) {
          if (isIn) bucket.inflow += t.amount;
          else bucket.outflow += t.amount;
        }
      });

    const maxVal = Math.max(
      1,
      ...months.map((m) => Math.max(m.inflow, m.outflow))
    );

    const bars = months.map((m) => ({
      ...m,
      inHeightPct:
        m.inflow > 0 ? Math.max(12, Math.round((m.inflow / maxVal) * 100)) : 4,
      outHeightPct:
        m.outflow > 0
          ? Math.max(8, Math.round((m.outflow / maxVal) * 100))
          : 4,
    }));

    const ratio =
      totalIn > 0
        ? Math.max(0, Math.min(100, Math.round(((totalIn - totalOut) / totalIn) * 100)))
        : 100;

    return { fourMonthBars: bars, healthRatio: ratio };
  }, [selectedGroupTxs]);

  // Log Audit untuk grup terpilih
  const selectedAuditLogs = useMemo(() => {
    if (!selectedGroup) return [];
    const logs = auditLogsByGroup[selectedGroup.id] || [];
    if (logs.length > 0) return logs.slice(0, 5);

    // Fallback dari transaksi terbaru grup jika belum ada log spesifik
    return selectedGroupTxs.slice(0, 4).map((t) => {
      const isIn = t.transaction_type === 'CONTRIBUTION';
      return {
        id: `tx-log-${t.id}`,
        group_id: selectedGroup.id,
        action: isIn ? 'CONTRIBUTION' : 'EXPENSE',
        title: isIn
          ? 'Setoran Terverifikasi Otomatis'
          : 'Pengeluaran Kas Tercatat',
        description: `${isIn ? 'Setoran' : 'Pengeluaran'} ${formatRupiah(
          t.amount
        )} oleh ${t.actor_name || 'Anggota Grup'} (${
          t.description || 'Mutasi Kas'
        }).`,
        timestamp: formatDate(t.transaction_date),
        dotColor: (isIn ? 'primary' : 'secondary') as
          | 'primary'
          | 'secondary'
          | 'outline',
      };
    });
  }, [auditLogsByGroup, selectedGroup, selectedGroupTxs]);

  const handleSelectGroup = (groupId: string, scroll = false) => {
    setSelectedGroupId(groupId);
    setShowAllMembers(false);
    if (scroll && typeof window !== 'undefined') {
      const el = document.getElementById('panel-detail-grup');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="flex flex-col gap-space-xl w-full">
      {/* TOP CONTEXT & HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-secondary">
            <span className="material-symbols-outlined text-sm">groups</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              Kolaborasi Finansial Terbuka
            </span>
          </div>
          <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight">
            Tabungan Bersama
          </h1>
          <p className="font-body-default text-body-default text-on-surface-variant max-w-2xl">
            Transparansi pencatatan tabungan grup, arisan keluarga, dan dana patungan proyek.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm self-start md:self-auto shrink-0">
          <CreateGroupModal
            variant="primary"
            triggerText="+ Buat Tabungan Bersama"
          />
        </div>
      </div>

      {/* FILTER & NOTICE BANNER */}
      <div className="flex flex-col gap-space-md">
        {/* Tabs Segmented Filter */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <HorizontalScroller
            className="flex items-center p-1 bg-surface-container rounded-lg gap-1"
            wrapperClassName="w-full sm:w-auto"
          >
            <button
              onClick={() => setTabFilter('all')}
              className={
                tabFilter === 'all'
                  ? 'px-space-md py-space-2xs rounded-md bg-surface-container-lowest text-primary font-caption-medium text-caption-medium shadow-sm transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
                  : 'px-space-md py-space-2xs rounded-md text-on-surface-variant hover:text-on-surface font-caption-medium text-caption-medium transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
              }
              type="button"
            >
              <span>Semua Grup</span>
              <span className="px-space-2xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                {groups.length}
              </span>
            </button>

            <button
              onClick={() => setTabFilter('owned')}
              className={
                tabFilter === 'owned'
                  ? 'px-space-md py-space-2xs rounded-md bg-surface-container-lowest text-primary font-caption-medium text-caption-medium shadow-sm transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
                  : 'px-space-md py-space-2xs rounded-md text-on-surface-variant hover:text-on-surface font-caption-medium text-caption-medium transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
              }
              type="button"
            >
              <span>Saya Kelola</span>
              <span className="px-space-2xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                {ownedGroupsCount}
              </span>
            </button>

            <button
              onClick={() => setTabFilter('member')}
              className={
                tabFilter === 'member'
                  ? 'px-space-md py-space-2xs rounded-md bg-surface-container-lowest text-primary font-caption-medium text-caption-medium shadow-sm transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
                  : 'px-space-md py-space-2xs rounded-md text-on-surface-variant hover:text-on-surface font-caption-medium text-caption-medium transition-all flex items-center gap-space-xs cursor-pointer whitespace-nowrap shrink-0'
              }
              type="button"
            >
              <span>Sebagai Anggota</span>
              <span className="px-space-2xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                {memberGroupsCount}
              </span>
            </button>
          </HorizontalScroller>

          <div className="flex items-center gap-space-xs font-caption text-caption text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>Semua catatan terenkripsi &amp; tercatat waktu riil</span>
          </div>
        </div>

        {/* Regulatory & Transparency Callout */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex items-start gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-xl">
              shield_person
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-body-medium text-body-medium text-on-surface">
              Transparansi dan Pemisahan Saldo Otomatis
            </span>
            <p className="font-body-default text-body-default text-on-surface-variant">
              Saldo di tabungan bersama dicatat langsung dan transparan bagi semua anggota grup. Saldo ini terpisah dari saldo pribadi Anda demi menjaga kepemilikan independen dan ketertiban pembukuan bersama.
            </p>
          </div>
        </div>
      </div>

      {/* MULTI-APPROVAL PENARIKAN KAS BERSAMA (Jika ada yang menunggu persetujuan) */}
      {pendingApprovals.length > 0 && (
        <PendingApprovalsCard
          items={pendingApprovals}
          title="Persetujuan Penarikan Kas Bersama (Multi-Approval)"
        />
      )}

      {/* ACTIVE GROUPS CARDS BENTO-GRID */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-xl bg-surface-container-lowest p-space-xl text-center shadow-sm flex flex-col items-center gap-space-sm">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <h3 className="font-headline-h3 text-headline-h3 text-on-surface">
            Belum ada grup pada kategori filter ini
          </h3>
          <p className="font-body-default text-body-default text-on-surface-variant max-w-md">
            Mulai kolaborasi tabungan bersama keluarga, teman, atau rekan proyek dengan pembukuan yang transparan.
          </p>
          <div className="pt-space-xs">
            <CreateGroupModal
              variant="primary"
              triggerText="+ Buat Tabungan Bersama"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {filteredGroups.map((g) => {
            const isSelected = selectedGroup?.id === g.id;
            const isOwner = g.role === 'OWNER';
            const bal = groupBalance(g, sharedTxs);
            const target = g.target_amount || 0;
            const pct =
              target > 0
                ? Math.min(100, Math.round((bal / target) * 100))
                : 0;
            const members = membersByGroup[g.id] || [];
            const ownerMember = members.find((m) => m.role === 'OWNER');
            const latestTx = sharedTxs.find(
              (t) => t.group_id === g.id && t.status !== 'VOIDED'
            );

            return (
              <div
                key={g.id}
                onClick={() => handleSelectGroup(g.id, false)}
                className={`group relative rounded-xl bg-surface-container-lowest p-space-lg flex flex-col justify-between shadow-sm transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-secondary/40'
                    : 'hover:ring-1 hover:ring-outline-variant'
                }`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                    isSelected
                      ? 'bg-secondary'
                      : isOwner
                      ? 'bg-primary'
                      : 'bg-outline-variant'
                  }`}
                />

                <div className="flex flex-col gap-space-md pt-space-2xs">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-space-xs">
                    {isOwner ? (
                      <span className="px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Pemilik
                      </span>
                    ) : (
                      <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Anggota
                      </span>
                    )}

                    {isSelected ? (
                      <div className="flex items-center gap-1 font-caption text-caption text-secondary font-medium">
                        <span className="material-symbols-outlined text-sm">
                          verified_user
                        </span>
                        <span>Terpilih</span>
                      </div>
                    ) : g.target_date ? (
                      <span className="font-caption text-caption text-outline">
                        Target: {formatDate(g.target_date)}
                      </span>
                    ) : (
                      <span className="font-caption text-caption text-outline">
                        Kas Kolektif
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex flex-col gap-1">
                    <h2 className="font-headline-h2 text-headline-h2 text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {g.name}
                    </h2>
                    <div className="flex items-center gap-space-xs text-on-surface-variant font-caption text-caption">
                      <span className="material-symbols-outlined text-sm shrink-0">
                        {target > 0 ? 'flag' : 'event_repeat'}
                      </span>
                      <span className="truncate">
                        {target > 0
                          ? `Target Bersama ${formatRupiah(target)}`
                          : g.description || 'Periode Fleksibel • Kas Terbuka'}
                      </span>
                    </div>
                  </div>

                  {/* Balance Well */}
                  {target > 0 ? (
                    <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                          Terkumpul
                        </span>
                        <span className="font-label-sm text-label-sm text-primary font-semibold">
                          {pct}% tercapai
                        </span>
                      </div>
                      <span className="font-currency-display text-currency-display text-on-surface tabular-nums">
                        {isHidden ? 'Rp ••••••••' : formatRupiah(bal)}
                      </span>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-0.5">
                      <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                        Total Kas Bersama
                      </span>
                      <span className="font-currency-display text-currency-display text-on-surface tabular-nums">
                        {isHidden ? 'Rp ••••••••' : formatRupiah(bal)}
                      </span>
                    </div>
                  )}

                  {/* Members Stack & Admin */}
                  <div className="flex items-center justify-between py-space-2xs">
                    <div className="flex items-center gap-space-xs">
                      <div className="flex -space-x-2 overflow-hidden">
                        {members.slice(0, 3).map((m, idx) => (
                          <div
                            key={m.id}
                            title={m.name}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-surface-container-lowest font-label-sm text-label-sm font-bold ${
                              AVATAR_TONES[idx % AVATAR_TONES.length]
                            }`}
                          >
                            {getInitials(m.name)}
                          </div>
                        ))}
                        {members.length > 3 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-highest font-label-sm text-label-sm text-on-surface-variant ring-2 ring-surface-container-lowest">
                            +{members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="font-caption-medium text-caption-medium text-on-surface-variant">
                        {members.length} Anggota
                      </span>
                    </div>
                    <span className="font-caption text-caption text-outline truncate max-w-[130px]">
                      {isOwner
                        ? 'Anda Penggagas'
                        : `Pengelola: ${ownerMember?.name?.split(' ')[0] || 'Admin'}`}
                    </span>
                  </div>

                  {/* Last Activity */}
                  {latestTx ? (
                    <div
                      className={`flex items-center gap-space-xs font-caption text-caption p-space-xs rounded-lg ${
                        latestTx.transaction_type === 'CONTRIBUTION'
                          ? 'text-on-surface-variant bg-surface-container/60'
                          : 'text-error bg-error-container/30'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          latestTx.transaction_type === 'CONTRIBUTION'
                            ? 'text-primary'
                            : 'text-error'
                        }`}
                      >
                        {latestTx.transaction_type === 'CONTRIBUTION'
                          ? 'arrow_downward'
                          : 'arrow_upward'}
                      </span>
                      <span className="truncate">
                        {latestTx.transaction_type === 'CONTRIBUTION'
                          ? `Setoran oleh ${
                              latestTx.actor_name || 'Anggota'
                            } (${formatDate(
                              latestTx.transaction_date
                            )})`
                          : `${
                              latestTx.description || 'Pengeluaran kas'
                            } (${formatDate(
                              latestTx.transaction_date
                            )})`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-space-xs font-caption text-caption text-outline bg-surface-container/40 p-space-xs rounded-lg">
                      <span className="material-symbols-outlined text-base">
                        schedule
                      </span>
                      <span className="truncate">
                        Belum ada mutasi transaksi tercatat
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons on Card */}
                <div
                  className="flex flex-col gap-space-xs mt-space-md pt-space-sm bg-surface-container-lowest"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-space-xs">
                    <AddSharedTransactionModal
                      groupId={g.id}
                      groupName={g.name}
                      triggerText="Setor"
                      variant="card-in"
                      defaultType="in"
                      lockType={true}
                      initialCategories={sharedCategoryNames}
                    />
                    <AddSharedTransactionModal
                      groupId={g.id}
                      groupName={g.name}
                      triggerText="Catat Keluar"
                      variant="card-out"
                      defaultType="out"
                      lockType={true}
                      initialCategories={sharedCategoryNames}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(g.id, true)}
                    className="w-full h-9 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-secondary font-caption-medium text-caption-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Buka Detail Lengkap</span>
                    <span className="material-symbols-outlined text-sm leading-none">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVE DETAIL WORKSPACE */}
      {selectedGroup && (
        <div
          id="panel-detail-grup"
          className="flex flex-col gap-space-lg pt-space-sm scroll-mt-20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <h2 className="font-headline-h2 text-headline-h2 text-on-surface">
                Panel Detail: {selectedGroup.name}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-space-xs">
              <ExportPdfStatementButton
                accountName={selectedGroup.name}
                groupName={selectedGroup.name}
                accountType="SHARED"
                txs={selectedGroupTxs}
                openingBalance={selectedGroup.opening_balance}
                label="Unduh Rekap PDF"
              />
              <ExportCsvButton
                accountName={selectedGroup.name}
                groupName={selectedGroup.name}
                accountType="SHARED"
                txs={selectedGroupTxs}
                openingBalance={selectedGroup.opening_balance}
                periodLabel="Seluruh Mutasi Kas Kolektif"
                filename={`laporan-kas-${selectedGroup.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`}
                label="Unduh CSV"
              />
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="h-9 px-space-sm rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-caption-medium text-caption-medium flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">
                  rule
                </span>
                <span>Aturan Grup</span>
              </button>
            </div>
          </div>

          {/* Bento Workspace: 12 Columns (8 Left, 4 Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* LEFT: Mutasi Keuangan Transparan & Aturan (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* Quick Status & Policy Box */}
              <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col md:flex-row justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs max-w-md">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                    Mekanisme &amp; Ketentuan Grup
                  </span>
                  <p className="font-body-default text-body-default text-on-surface">
                    {selectedGroup.description ||
                      'Seluruh setoran anggota tercatat secara terbuka. Pengeluaran kas bersama pada grup beranggota aktif wajib melalui mekanisme persetujuan bersama (Multi-Approval).'}
                  </p>
                </div>

                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-center min-w-[220px]">
                  <span className="font-caption text-caption text-on-surface-variant">
                    {selectedGroup.target_amount
                      ? 'Target Akumulasi Grup:'
                      : 'Status Pembukuan Grup:'}
                  </span>
                  <span className="font-body-medium text-body-medium text-primary flex items-center gap-1 mt-0.5 tabular-nums">
                    <span className="material-symbols-outlined text-base">
                      emoji_events
                    </span>
                    {selectedGroup.target_amount
                      ? isHidden
                        ? 'Rp ••••••••'
                        : formatRupiah(selectedGroup.target_amount)
                      : 'Aktif & Terverifikasi'}
                  </span>
                  <span className="font-caption text-caption text-outline mt-1">
                    {selectedGroup.target_date
                      ? `Target Tanggal: ${formatDate(
                          selectedGroup.target_date
                        )}`
                      : `Saldo Awal: ${formatRupiah(
                          selectedGroup.opening_balance
                        )}`}
                  </span>
                </div>
              </div>

              {/* Transaction Ledger Stream */}
              <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-headline-h3 text-headline-h3 text-on-surface">
                      Buku Kas &amp; Riwayat Transaksi Grup
                    </span>
                    <span className="font-caption text-caption text-on-surface-variant">
                      Setiap pengeluaran wajib disertai catatan peruntukan resmi
                    </span>
                  </div>

                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => setLedgerPeriod('month')}
                      className={
                        ledgerPeriod === 'month'
                          ? 'px-space-xs py-1 rounded bg-surface-container text-on-surface font-caption-medium text-caption-medium cursor-pointer'
                          : 'px-space-xs py-1 rounded hover:bg-surface-container text-outline font-caption text-caption cursor-pointer'
                      }
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerPeriod('all')}
                      className={
                        ledgerPeriod === 'all'
                          ? 'px-space-xs py-1 rounded bg-surface-container text-on-surface font-caption-medium text-caption-medium cursor-pointer'
                          : 'px-space-xs py-1 rounded hover:bg-surface-container text-outline font-caption text-caption cursor-pointer'
                      }
                    >
                      Semua
                    </button>
                  </div>
                </div>

                {/* Ledger Table Container */}
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full min-w-[600px] text-left font-body-default text-body-default">
                    <thead>
                      <tr className="text-caption font-caption text-outline uppercase tracking-wider border-b border-surface-container">
                        <th className="py-space-xs font-medium">Tanggal</th>
                        <th className="py-space-xs font-medium">
                          Keterangan &amp; Anggota
                        </th>
                        <th className="py-space-xs font-medium">Kategori</th>
                        <th className="py-space-xs font-medium text-right">
                          Nominal
                        </th>
                        <th className="py-space-xs font-medium text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container/60">
                      {displayedLedgerTxs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-space-lg text-center text-on-surface-variant font-caption text-caption"
                          >
                            Belum ada transaksi tercatat pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        displayedLedgerTxs.slice(0, 15).map((tx) => {
                          const isIn = tx.transaction_type === 'CONTRIBUTION';
                          const isPending = tx.status === 'PENDING_APPROVAL';
                          return (
                            <tr
                              key={tx.id}
                              className="hover:bg-surface-container-low/60 transition-colors"
                            >
                              <td className="py-space-sm pr-2 font-caption text-caption text-on-surface-variant whitespace-nowrap">
                                {formatDate(tx.transaction_date)}
                              </td>
                              <td className="py-space-sm pr-2">
                                <div className="flex items-center gap-space-xs">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      isIn
                                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                                        : 'bg-error-container text-on-error-container'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-base">
                                      {isIn ? 'arrow_downward' : 'arrow_upward'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-body-medium text-body-medium text-on-surface truncate">
                                      {tx.description ||
                                        (isIn
                                          ? 'Setoran Kas Bersama'
                                          : 'Pengeluaran Kas Grup')}
                                    </span>
                                    <span className="font-caption text-caption text-on-surface-variant truncate">
                                      {isIn
                                        ? tx.actor_name || 'Anggota Grup'
                                        : `Dicatat oleh ${
                                            tx.actor_name || 'Pengelola'
                                          }`}
                                      {isPending && ' • Menunggu Persetujuan'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-space-sm pr-2 whitespace-nowrap">
                                <span
                                  className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm ${
                                    isIn
                                      ? 'bg-primary-fixed/40 text-on-primary-fixed-variant'
                                      : 'bg-error-container/50 text-on-error-container'
                                  }`}
                                >
                                  {tx.category_name ||
                                    (isIn ? 'Iuran Wajib' : 'Operasional')}
                                </span>
                              </td>
                              <td
                                className={`py-space-sm text-right font-currency-body text-currency-body whitespace-nowrap tabular-nums ${
                                  isIn ? 'text-primary' : 'text-error'
                                }`}
                              >
                                {isHidden
                                  ? 'Rp ••••••••'
                                  : `${isIn ? '+' : '-'} ${formatRupiah(
                                      tx.amount
                                    )}`}
                              </td>
                              <td className="py-space-sm pl-2 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1">
                                  {tx.receipt_url && (
                                    <ReceiptViewerButton
                                      receiptUrl={tx.receipt_url}
                                      title={tx.description || 'Transaksi Grup'}
                                      amount={tx.amount}
                                      date={tx.transaction_date}
                                      type={tx.transaction_type}
                                    />
                                  )}
                                  {tx.status === 'ACTIVE' && (
                                    <VoidTransactionButton
                                      txId={tx.id}
                                      description={
                                        tx.description ||
                                        (isIn
                                          ? 'Setoran Grup'
                                          : 'Pengeluaran Grup')
                                      }
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

                {/* Visual Bar Chart for Mutual Inflow / Outflow (4 Bulan Terakhir) */}
                <div className="mt-space-sm p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-caption-medium text-caption-medium text-on-surface">
                      Arus Kas Masuk vs Pengeluaran (4 Bulan Terakhir)
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      Rasio Sehat {healthRatio}%
                    </span>
                  </div>

                  <div className="h-28 w-full flex items-end gap-space-md pt-space-xs">
                    {fourMonthBars.map((m) => (
                      <div
                        key={m.key}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                      >
                        <div className="w-full flex items-end justify-center gap-1.5 h-20">
                          <div
                            className={`w-3 rounded-t transition-all duration-500 ${
                              m.isCurrent ? 'bg-secondary' : 'bg-primary'
                            }`}
                            style={{ height: `${m.inHeightPct}%` }}
                            title={`Masuk (${m.label}): ${formatRupiah(
                              m.inflow
                            )}`}
                          />
                          <div
                            className={`w-3 rounded-t transition-all duration-500 ${
                              m.isCurrent && m.outflow > 0
                                ? 'bg-error'
                                : 'bg-outline-variant'
                            }`}
                            style={{ height: `${m.outHeightPct}%` }}
                            title={`Keluar (${m.label}): ${formatRupiah(
                              m.outflow
                            )}`}
                          />
                        </div>
                        <span
                          className={`font-caption text-caption ${
                            m.isCurrent
                              ? 'text-on-surface font-semibold'
                              : 'text-outline'
                          }`}
                        >
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kalkulator Target & Ritme Menabung Otomatis */}
              <SavingsPacingCalculator
                mode="group"
                groupName={selectedGroup.name}
                currentBalance={groupBalance(selectedGroup, sharedTxs)}
                targetAmount={selectedGroup.target_amount}
                targetDate={selectedGroup.target_date}
                memberCount={selectedGroupMembers.length}
              />
            </div>

            {/* RIGHT: Anggota Terdaftar & Audit Feed (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Members List Box */}
              <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-headline-h3 text-headline-h3 text-on-surface">
                      Anggota Grup
                    </span>
                    <span className="font-caption text-caption text-outline">
                      Data pribadi disamarkan (Bab 17)
                    </span>
                  </div>
                  <InviteMemberModal
                    groupId={selectedGroup.id}
                    groupName={selectedGroup.name}
                    variant="text-link"
                    triggerText="Undang"
                  />
                </div>

                <div className="flex flex-col divide-y divide-surface-container">
                  {(showAllMembers
                    ? selectedGroupMembers
                    : selectedGroupMembers.slice(0, 4)
                  ).map((m, idx) => {
                    const isOwner = m.role === 'OWNER';
                    const isSelf = m.user_id === userId;
                    const memberIdCode = `TB-${m.user_id
                      .replace(/[^a-zA-Z0-9]/g, '')
                      .slice(0, 5)
                      .toUpperCase()}`;
                    const totalContr = memberContributions[m.user_id] || 0;

                    return (
                      <div
                        key={m.id}
                        className="py-space-xs flex items-center justify-between gap-space-xs"
                      >
                        <div className="flex items-center gap-space-xs min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-caption-medium text-caption-medium font-bold shrink-0 ${
                              AVATAR_TONES[idx % AVATAR_TONES.length]
                            }`}
                          >
                            {getInitials(m.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-body-medium text-body-medium text-on-surface truncate">
                              {m.name}
                              {isSelf ? ' (Anda)' : ''}
                            </span>
                            <span className="font-caption text-caption text-outline truncate">
                              ID: {memberIdCode} •{' '}
                              {totalContr > 0
                                ? isHidden
                                  ? 'Terverifikasi'
                                  : formatRupiah(totalContr)
                                : 'Terverifikasi'}
                            </span>
                          </div>
                        </div>

                        {isOwner ? (
                          <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shrink-0">
                            Pengelola
                          </span>
                        ) : isSelf ? (
                          <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm shrink-0">
                            Editor
                          </span>
                        ) : (
                          <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm shrink-0">
                            Anggota
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedGroupMembers.length > 4 && (
                  <div className="pt-space-2xs text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllMembers((v) => !v)}
                      className="font-caption-medium text-caption-medium text-secondary hover:underline cursor-pointer"
                    >
                      {showAllMembers
                        ? 'Sembunyikan Sebagian'
                        : `Lihat Semua ${selectedGroupMembers.length} Anggota`}
                    </button>
                  </div>
                )}

                {selectedGroup.role !== 'OWNER' && (
                  <div className="pt-space-xs border-t border-surface-container flex justify-end">
                    <LeaveGroupButton
                      groupId={selectedGroup.id}
                      groupName={selectedGroup.name}
                    />
                  </div>
                )}
              </div>

              {/* Real-Time Audit Log Feed */}
              <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-headline-h3 text-headline-h3 text-on-surface">
                    Log Audit Aktivitas
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                  </span>
                </div>

                {selectedAuditLogs.length === 0 ? (
                  <p className="font-caption text-caption text-outline">
                    Belum ada jejak aktivitas terbaru pada grup ini.
                  </p>
                ) : (
                  <div className="relative pl-4 space-y-space-md before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                    {selectedAuditLogs.map((log) => {
                      const dotClass =
                        log.dotColor === 'primary'
                          ? 'bg-primary'
                          : log.dotColor === 'secondary'
                          ? 'bg-secondary'
                          : 'bg-outline';
                      return (
                        <div
                          key={log.id}
                          className="relative flex flex-col gap-0.5"
                        >
                          <div
                            className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${dotClass} ring-4 ring-surface-container-lowest`}
                          />
                          <span className="font-caption-medium text-caption-medium text-on-surface">
                            {log.title}
                          </span>
                          <p className="font-caption text-caption text-on-surface-variant">
                            {log.description}
                          </p>
                          <span className="font-label-sm text-label-sm text-outline">
                            {log.timestamp}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ATURAN GRUP & KATEGORI BERSAMA (React Portal) */}
      {mounted &&
        isRulesModalOpen &&
        selectedGroup &&
        createPortal(
          <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-on-surface/50 backdrop-blur-sm whitespace-normal break-words text-left"
            onClick={() => setIsRulesModalOpen(false)}
          >
            <div
              className="rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest max-w-3xl w-full p-5 sm:p-space-lg shadow-xl flex flex-col gap-space-md max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden w-10 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">
                    rule
                  </span>
                  <h3 className="font-headline-h3 text-headline-h3 text-on-surface">
                    Aturan Tata Kelola &amp; Kategori: {selectedGroup.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="text-outline hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low space-y-2 font-caption text-caption text-on-surface-variant">
                <p className="font-body-medium text-body-medium text-on-surface">
                  Ketentuan Tata Kelola Kas Bersama (Multi-Approval &amp; Audit)
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Setoran Kas (Contribution):</strong> Langsung tercatat aktif dan menambah saldo kolektif grup secara real-time.
                  </li>
                  <li>
                    <strong>Penarikan / Pengeluaran (Expense):</strong> Pada grup dengan lebih dari 1 anggota aktif, setiap pencatatan pengeluaran berstatus <em>Menunggu Persetujuan (PENDING_APPROVAL)</em> hingga disetujui oleh anggota lain atau Pengelola.
                  </li>
                  <li>
                    <strong>Jejak Audit (Void):</strong> Transaksi yang salah catat tidak dihapus permanen melainkan di-<em>void</em> disertai alasan demi menjaga akuntabilitas buku kas.
                  </li>
                </ul>
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
