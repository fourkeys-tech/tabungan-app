'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createPotAction } from '@/app/actions/pots';
import { btnSecondary, PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';
import { Plus, X, Wallet, Target, Calendar, FileText, Coins } from 'lucide-react';

interface Props {
  triggerText?: string;
  variant?: 'primary' | 'secondary' | 'inline';
  className?: string;
  icon?: boolean;
}

export function CreatePersonalPotModal({
  triggerText = 'Buat Pos Tabungan',
  variant = 'primary',
  className = '',
  icon = true,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openingBalanceDisplay, setOpeningBalanceDisplay] = useState('');
  const [targetDisplay, setTargetDisplay] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setName('');
    setDescription('');
    setOpeningBalanceDisplay('');
    setTargetDisplay('');
    setTargetDate('');
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
  };

  const handleOpeningBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setOpeningBalanceDisplay('');
      return;
    }
    const num = Number(raw);
    setOpeningBalanceDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setTargetDisplay('');
      return;
    }
    const num = Number(raw);
    setTargetDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim()) {
      setError('Nama pos tabungan wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanOpening = openingBalanceDisplay ? Number(openingBalanceDisplay.replace(/[^0-9]/g, '')) : 0;
    const cleanTarget = targetDisplay ? Number(targetDisplay.replace(/[^0-9]/g, '')) : null;

    const result = await createPotAction({
      type: 'PERSONAL',
      name: name.trim(),
      description: description.trim() || undefined,
      opening_balance: cleanOpening,
      target_amount: cleanTarget && cleanTarget > 0 ? cleanTarget : null,
      target_date: targetDate || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsOpen(false);
      router.refresh();
    }
  };

  const triggerBtnClass =
    variant === 'primary'
      ? 'h-11 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer'
      : variant === 'inline'
      ? 'text-xs text-primary hover:underline font-semibold cursor-pointer'
      : btnSecondary;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`${triggerBtnClass} ${className}`}
      >
        {icon && (
          <span className="material-symbols-outlined leading-none text-[20px]">
            add_circle
          </span>
        )}
        <span>{triggerText}</span>
      </button>

      {isOpen && mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-highest flex flex-col overflow-hidden max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="px-space-lg py-space-md border-b border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="font-headline-h2 text-headline-h2 text-on-surface">
                      Buat Pos Tabungan Personal
                    </h2>
                    <p className="font-caption text-caption text-on-surface-variant">
                      Pisahkan alokasi dana mandiri untuk tujuan spesifik Anda
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-space-lg overflow-y-auto space-y-space-md">
                {error && <FormAlert kind="error">{error}</FormAlert>}

                {/* Nama Pos */}
                <div className="space-y-1.5">
                  <label className="block font-caption-medium text-caption-medium text-on-surface">
                    Nama Pos Tabungan <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface-variant">
                      <Wallet size={18} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kebutuhan Sehari-hari, Dana Darurat, Laptop"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="space-y-1.5">
                  <label className="block font-caption-medium text-caption-medium text-on-surface">
                    Deskripsi / Keterangan (Opsional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface-variant">
                      <FileText size={18} />
                    </span>
                    <input
                      type="text"
                      placeholder="Contoh: Alokasi uang bulanan makan, bensin, dan belanja harian"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Saldo Awal */}
                <div className="space-y-1.5">
                  <label className="block font-caption-medium text-caption-medium text-on-surface">
                    Saldo Awal (Opsional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface-variant">
                      <Coins size={18} />
                    </span>
                    <span className="absolute left-9 text-xs font-semibold text-on-surface-variant">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={openingBalanceDisplay}
                      onChange={handleOpeningBalanceChange}
                      className="w-full pl-16 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors font-medium tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Isi jika Anda sudah memiliki simpanan awal untuk kantong ini.
                  </p>
                </div>

                {/* Target Nominal & Tanggal Target (Opsional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-1 border-t border-surface-container">
                  <div className="space-y-1.5">
                    <label className="block font-caption-medium text-caption-medium text-on-surface">
                      Target Nominal (Opsional)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-on-surface-variant">
                        <Target size={18} />
                      </span>
                      <span className="absolute left-9 text-xs font-semibold text-on-surface-variant">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Contoh: 5.000.000"
                        value={targetDisplay}
                        onChange={handleTargetChange}
                        className="w-full pl-16 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-caption-medium text-caption-medium text-on-surface">
                      Tenggat Target (Opsional)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-on-surface-variant">
                        <Calendar size={18} />
                      </span>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="rounded-xl bg-surface-container p-3 flex items-start gap-2.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">
                    info
                  </span>
                  <span>
                    Pos personal ini bersifat mandiri dan terisolasi secara aman. Anda dapat mencatat mutasi pengeluaran dan pemasukan langsung ke pos ini.
                  </span>
                </div>

                {/* Actions */}
                <div className="pt-space-sm flex items-center justify-end gap-space-sm">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <PrimaryButton
                    type="submit"
                    disabled={loading}
                    className="px-space-lg py-2.5"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Pos Baru'}
                  </PrimaryButton>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
