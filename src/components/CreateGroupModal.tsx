'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createSavingsGroup } from '@/app/actions/groups';
import { btnPrimary, btnSecondary, PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';
import { Plus, X, Users, Target, Calendar, FileText } from 'lucide-react';

interface Props {
  triggerText?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  icon?: boolean;
}

export function CreateGroupModal({
  triggerText = 'Buat Tabungan Bersama',
  variant = 'primary',
  className = '',
  icon = true,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    setTargetDisplay('');
    setTargetDate('');
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('target_amount', targetDisplay.replace(/[^0-9]/g, ''));
    formData.append('target_date', targetDate);

    const result = await createSavingsGroup(formData);

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
            group_add
          </span>
        )}
        <span>{triggerText}</span>
      </button>

      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 overflow-y-auto text-left whitespace-normal font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface-container-lowest border border-surface-container-highest rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full shadow-2xl relative sm:my-8 max-h-[92vh] overflow-y-auto text-left whitespace-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-9 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-4" />

            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-1 text-left">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-headline-h3 text-lg font-bold text-on-surface">
                  Buat Tabungan Bersama
                </h3>
                <span className="inline-block text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed-variant">
                  Grup Baru
                </span>
              </div>
            </div>
            <p className="font-caption text-xs text-on-surface-variant mt-1 mb-5 text-left">
              Mulai menabung untuk target bersama teman, pasangan, atau keluarga dengan tata kelola transparan.
            </p>

            {error && (
              <div className="mb-4 text-left">
                <FormAlert>{error}</FormAlert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Nama Tabungan */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="modal_group_name" className="block text-xs font-semibold text-on-surface text-left">
                  Nama Tabungan Bersama <span className="text-tertiary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Users size={15} />
                  </span>
                  <input
                    type="text"
                    id="modal_group_name"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Liburan Akhir Tahun ke Bali"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-sm transition-all text-left placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="modal_group_desc" className="block text-xs font-semibold text-on-surface text-left">
                  Deskripsi / Aturan (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-on-surface-variant">
                    <FileText size={15} />
                  </span>
                  <textarea
                    id="modal_group_desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Patungan rutin bulanan untuk sewa villa..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-xs transition-all text-left placeholder:text-on-surface-variant/50 resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Target Tabungan */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="modal_group_target" className="block text-xs font-semibold text-on-surface text-left">
                  Target Nominal Tabungan (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    id="modal_group_target"
                    value={targetDisplay}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-base font-bold tracking-tight transition-all text-left placeholder:text-on-surface-variant/50 tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant text-left">
                  Digunakan untuk indikator progres toples persentase tabungan.
                </p>
              </div>

              {/* Tanggal Target */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="modal_group_date" className="block text-xs font-semibold text-on-surface text-left">
                  Tenggat Waktu Target (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-on-surface-variant">
                    <Calendar size={15} />
                  </span>
                  <input
                    type="date"
                    id="modal_group_date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-xs transition-all text-left"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-surface-container-low flex gap-2.5 text-left">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl bg-surface-container hover:bg-surface-variant transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <PrimaryButton type="submit" disabled={loading} className="flex-1 py-2.5 text-xs cursor-pointer">
                  {loading ? 'Menyimpan...' : 'Buat Tabungan'}
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
