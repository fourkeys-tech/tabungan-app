'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatRupiah, formatDate } from '@/utils/format';
import { X, ExternalLink } from 'lucide-react';

interface Props {
  receiptUrl: string;
  title: string;
  amount: number;
  date: string;
  type?: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION';
}

export function ReceiptViewerButton({
  receiptUrl,
  title,
  amount,
  date,
  type = 'EXPENSE',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isIn = type === 'INCOME' || type === 'CONTRIBUTION';
  const amountColor = isIn ? 'text-primary' : 'text-tertiary';
  const formattedAmount = `${isIn ? '+' : '−'}${formatRupiah(amount)}`;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-dialog-title"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 text-left whitespace-normal font-sans"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 text-left whitespace-normal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-surface-container-highest mx-auto mt-3 mb-1" />
        {/* Modal Header */}
        <div className="flex items-center justify-between p-space-md border-b border-surface-container-low bg-surface-container-lowest text-left">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-secondary shrink-0">
              <span className="material-symbols-outlined text-base leading-none">
                receipt_long
              </span>
            </div>
            <div className="text-left">
              <h3
                id="receipt-dialog-title"
                className="font-headline-h2 text-base text-on-surface font-semibold"
              >
                Bukti Transaksi
              </h3>
              <p className="font-caption text-caption text-on-surface-variant">
                {formatDate(date)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup dialog bukti"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transaction Brief Info */}
        <div className="px-space-md py-space-sm bg-surface-container-low/70 flex items-center justify-between border-b border-surface-container-low text-left">
          <span className="font-body-medium text-body-medium text-on-surface font-medium truncate max-w-[240px]">
            {title}
          </span>
          <span className={`font-currency-body text-currency-body tabular-nums font-bold ${amountColor}`}>
            {formattedAmount}
          </span>
        </div>

        {/* Receipt Image Container */}
        <div className="p-space-md overflow-y-auto flex-1 flex items-center justify-center bg-surface-container-lowest min-h-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receiptUrl}
            alt={`Bukti transaksi: ${title}`}
            className="max-h-[55vh] w-auto max-w-full rounded-xl object-contain border border-surface-container-high shadow-sm"
          />
        </div>

        {/* Modal Footer */}
        <div className="p-space-md border-t border-surface-container-low bg-surface-container-lowest flex items-center justify-between gap-space-sm text-left">
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-secondary hover:bg-secondary-container/50 font-caption-medium text-caption-medium transition-colors"
          >
            <ExternalLink size={14} />
            <span>Buka Ukuran Asli</span>
          </a>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-body-medium text-body-medium font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-caption-medium transition-colors cursor-pointer border border-surface-container-highest/60 group whitespace-nowrap"
        title="Lihat Bukti Transfer / Struk"
      >
        <span className="material-symbols-outlined text-[13px] leading-none text-secondary group-hover:scale-110 transition-transform">
          receipt_long
        </span>
        <span className="group-hover:underline">Struk</span>
      </button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
