'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { voidTransaction } from '@/app/actions/transactions';
import { Ban, AlertTriangle, X } from 'lucide-react';

interface Props {
  txId: string;
  description: string;
}

export function VoidTransactionButton({ txId, description }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);

    const res = await voidTransaction(txId, reason);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setReason('');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
    setReason('');
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`void-dialog-title-${txId}`}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 text-left whitespace-normal font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-surface-container-lowest border border-surface-container-highest rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left whitespace-normal max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-4" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="text-left min-w-0">
            <h3
              id={`void-dialog-title-${txId}`}
              className="font-headline-h3 text-lg font-bold text-on-surface leading-snug"
            >
              Batalkan Transaksi?
            </h3>
            <span className="inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant mt-0.5">
              Jejak Audit Void
            </span>
          </div>
        </div>

        {/* Description Text with proper text wrap */}
        <p className="font-caption text-sm text-on-surface-variant mb-4 text-left whitespace-normal leading-relaxed break-words">
          Transaksi <strong className="text-on-surface">&ldquo;{description}&rdquo;</strong> akan diubah statusnya menjadi{' '}
          <span className="font-semibold text-tertiary">VOIDED</span> dan dikeluarkan dari perhitungan saldo.
        </p>

        {error && (
          <div className="text-xs text-tertiary bg-tertiary-fixed/30 p-3 rounded-xl mb-4 border border-tertiary-fixed-dim text-left whitespace-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleVoid} className="space-y-4 text-left whitespace-normal">
          <div className="text-left">
            <label
              htmlFor={`void_reason_${txId}`}
              className="block text-xs font-semibold text-on-surface mb-1.5 text-left"
            >
              Alasan Pembatalan <span className="text-tertiary">*</span>
            </label>
            <input
              type="text"
              id={`void_reason_${txId}`}
              required
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Salah nominal / duplikat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface text-sm focus:outline-none focus:border-primary text-left placeholder:text-on-surface-variant/50 transition-all whitespace-normal"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container-low text-left">
            <button
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Memproses...' : 'Ya, Batalkan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="opacity-70 hover:opacity-100 p-1.5 text-on-surface-variant hover:text-tertiary hover:bg-tertiary-fixed/40 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
        title="Batalkan transaksi (Void)"
        aria-label="Batalkan transaksi"
      >
        <Ban size={14} />
        <span className="hidden sm:inline font-caption-medium">Batalkan</span>
      </button>

      {open && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
