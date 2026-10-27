'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveSharedExpenseAction,
  rejectSharedExpenseAction,
  cancelSharedExpenseAction,
  type PendingApprovalItem,
} from '@/app/actions/approvals';
import { formatRupiah, formatDate } from '@/utils/format';
import { MaskableText } from '@/components/PrivacyContext';
import { ReceiptViewerButton } from '@/components/ReceiptViewerButton';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  items: PendingApprovalItem[];
  title?: string;
  className?: string;
}

export function PendingApprovalsCard({
  items,
  title = 'Persetujuan Penarikan Kas Bersama',
  className = '',
}: Props) {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<PendingApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleApprove = async (item: PendingApprovalItem) => {
    setLoadingId(item.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await approveSharedExpenseAction(item.id);
    setLoadingId(null);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Pengeluaran sebesar ${formatRupiah(item.amount)} berhasil disetujui.`);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem || !rejectReason.trim()) return;

    setLoadingId(rejectingItem.id);
    setErrorMsg(null);

    const res = await rejectSharedExpenseAction(rejectingItem.id, rejectReason.trim());
    setLoadingId(null);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Pengajuan penarikan berhasil ditolak.`);
      setRejectingItem(null);
      setRejectReason('');
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleCancelRequest = async (item: PendingApprovalItem) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan penarikan kas ini?')) {
      return;
    }

    setLoadingId(item.id);
    setErrorMsg(null);

    const res = await cancelSharedExpenseAction(item.id);
    setLoadingId(null);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Pengajuan penarikan kas berhasil dibatalkan.');
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  return (
    <>
      <section
        aria-label="Persetujuan Penarikan Kas Bersama"
        className={`rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-secondary/30 relative overflow-hidden flex flex-col gap-space-md ${className}`}
      >
        {/* Accent top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs border-b border-surface-container-low pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl leading-none">
                verified_user
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-h2 text-lg text-on-surface font-semibold">
                  {title}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed-variant text-[11px] font-bold">
                  {items.length} Menunggu
                </span>
              </div>
              <p className="font-caption text-caption text-on-surface-variant">
                Dana kas grup tidak akan dipotong sebelum memperoleh persetujuan anggota.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim text-xs text-tertiary font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-primary-fixed/30 border border-primary/20 text-xs text-primary font-medium">
            {successMsg}
          </div>
        )}

        {/* List of Pending Withdrawals */}
        <div className="flex flex-col gap-space-sm">
          {items.map((item) => {
            const isLoading = loadingId === item.id;
            const progressPct = Math.min(
              100,
              Math.round((item.approvalsCount / item.requiredApprovals) * 100)
            );

            return (
              <div
                key={item.id}
                className="p-space-md rounded-xl bg-surface-container-low/70 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:border-secondary/40 transition-colors"
              >
                {/* Left Information */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-secondary-container text-secondary text-xs font-semibold">
                      {item.groupName}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      • {item.categoryName}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      • {formatDate(item.transactionDate + 'T00:00:00')}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-currency-display text-xl sm:text-2xl font-bold text-tertiary tabular-nums tracking-tight">
                      − <MaskableText value={formatRupiah(item.amount)} />
                    </span>
                    {item.receiptUrl && (
                      <ReceiptViewerButton
                        receiptUrl={item.receiptUrl}
                        title={item.description || 'Penarikan Kas Bersama'}
                        amount={item.amount}
                        date={item.transactionDate}
                        type="EXPENSE"
                      />
                    )}
                  </div>

                  <p className="font-body-medium text-sm text-on-surface font-medium truncate">
                    {item.description || 'Pengeluaran dana bersama'}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                    <span className="inline-flex items-center gap-1 font-medium text-on-surface">
                      <User size={13} className="text-secondary" />
                      Diajukan oleh: {item.createdByName} {item.isCreator && '(Anda)'}
                    </span>
                  </div>

                  {/* Kuorum meter */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-28 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="font-caption text-[11px] text-on-surface-variant">
                      Persetujuan: <strong className="text-on-surface">{item.approvalsCount}</strong> dari{' '}
                      {item.requiredApprovals} anggota lain
                    </span>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-surface-container-high">
                  {item.canUserApprove ? (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleApprove(item)}
                        className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={16} />
                        <span>{isLoading ? 'Memproses...' : 'Setujui Penarikan'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setRejectingItem(item);
                          setRejectReason('');
                        }}
                        className="h-10 px-3 rounded-xl border border-tertiary-fixed-dim hover:bg-tertiary-fixed/30 text-tertiary text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle size={15} />
                        <span>Tolak</span>
                      </button>
                    </>
                  ) : item.hasUserApproved ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-fixed text-primary text-xs font-semibold">
                      <CheckCircle2 size={16} />
                      <span>Anda Telah Menyetujui</span>
                    </span>
                  ) : item.isCreator ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-medium">
                        <Clock size={15} className="text-secondary" />
                        <span>Menunggu Anggota Lain</span>
                      </span>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleCancelRequest(item)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold text-tertiary hover:bg-tertiary-fixed/30 transition-colors cursor-pointer"
                      >
                        Batalkan
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reject Modal Dialog */}
      {rejectingItem &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 text-left whitespace-normal font-sans"
            onClick={() => setRejectingItem(null)}
          >
            <div
              className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left whitespace-normal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-2 text-left">
                <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="text-left min-w-0">
                  <h3 className="font-headline-h3 text-lg font-bold text-on-surface">
                    Tolak Pengajuan Penarikan
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    Nominal: {formatRupiah(rejectingItem.amount)}
                  </span>
                </div>
              </div>

              <p className="font-caption text-xs text-on-surface-variant mb-4 text-left">
                Pengajuan dari <strong>{rejectingItem.createdByName}</strong> akan dibatalkan dan alasan penolakan akan dicatat pada riwayat audit grup.
              </p>

              <form onSubmit={handleRejectSubmit} className="space-y-4 text-left">
                <div>
                  <label
                    htmlFor="reject_reason"
                    className="block text-xs font-semibold text-on-surface mb-1.5"
                  >
                    Alasan Penolakan <span className="text-tertiary">*</span>
                  </label>
                  <input
                    type="text"
                    id="reject_reason"
                    required
                    autoFocus
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Belum ada kesepakatan bersama / nominal terlalu besar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface text-sm focus:outline-none focus:border-tertiary placeholder:text-on-surface-variant/50 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container-low">
                  <button
                    type="button"
                    onClick={() => setRejectingItem(null)}
                    className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectReason.trim()}
                    className="px-4 py-2 text-sm bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Tolak Pengajuan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

