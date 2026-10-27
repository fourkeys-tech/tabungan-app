'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/app/actions/transactions';
import { btnPrimary, btnSecondary, PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';
import { BASELINE_CATEGORIES } from '@/utils/finance';
import {
  Plus,
  X,
  Wallet,
  Tag,
  FileText,
  Calendar,
  Paperclip,
  Check,
  ImageIcon,
} from 'lucide-react';

interface Props {
  triggerText?: string;
  variant?: 'primary' | 'secondary' | 'card-action';
  className?: string;
  icon?: boolean;
  initialCategories?: string[];
}

const QUICK_CHIPS = [50000, 100000, 500000];

export function AddPersonalTransactionModal({
  triggerText = 'Tambah Transaksi',
  variant = 'primary',
  className = '',
  icon = true,
  initialCategories,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'in' | 'out'>('in');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [category, setCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baselineOptions =
    type === 'in' ? BASELINE_CATEGORIES.personal_in : BASELINE_CATEGORIES.personal_out;
  const oppositeBaseline =
    type === 'in' ? BASELINE_CATEGORIES.personal_out : BASELINE_CATEGORIES.personal_in;
  const filteredCustom = (initialCategories || []).filter(
    (c) => !oppositeBaseline.includes(c)
  );
  const availableCategories = Array.from(
    new Set([...baselineOptions, ...filteredCustom])
  );

  const handleOpen = () => {
    setIsOpen(true);
    setType('in');
    setAmountDisplay('');
    setCategory(BASELINE_CATEGORIES.personal_in[0]);
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setDescription('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setReceiptFile(null);
    setReceiptPreview(null);
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
      setAmountDisplay('');
      return;
    }
    const num = Number(raw);
    setAmountDisplay(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleQuickAdd = (addValue: number) => {
    const currentRaw = Number(amountDisplay.replace(/[^0-9]/g, '') || '0');
    const next = currentRaw + addValue;
    setAmountDisplay(new Intl.NumberFormat('id-ID').format(next));
  };

  const handleTypeChange = (newType: 'in' | 'out') => {
    setType(newType);
    const newOptions =
      newType === 'in' ? BASELINE_CATEGORIES.personal_in : BASELINE_CATEGORIES.personal_out;
    setCategory(newOptions[0]);
    setIsCustomCategory(false);
    setCustomCategoryName('');
  };

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCategory(true);
      setCategory('');
    } else {
      setIsCustomCategory(false);
      setCategory(val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran bukti transfer maksimal 5 MB.');
      return;
    }

    setReceiptFile(file);
    setError(null);

    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setReceiptPreview(preview);
    } else {
      setReceiptPreview(null);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const resolvedCategory = isCustomCategory ? customCategoryName.trim() : category;
    if (isCustomCategory && !resolvedCategory) {
      setError('Silakan ketik nama kategori baru.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('destination', 'personal');
    formData.append('type', type);
    formData.append('amount', amountDisplay.replace(/[^0-9]/g, ''));
    formData.append('category', resolvedCategory || availableCategories[0]);
    formData.append('description', description);
    formData.append('transaction_date', transactionDate);

    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    const result = await createTransaction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      {variant === 'card-action' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`h-10 px-space-md rounded-lg bg-surface-container-highest hover:bg-surface-variant text-primary font-body-medium text-body-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer ${className}`}
        >
          <span className="material-symbols-outlined text-base leading-none">add</span>
          <span>{triggerText}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className={
            variant === 'primary'
              ? `h-11 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium flex items-center gap-space-xs transition-transform active:scale-95 shadow-sm cursor-pointer ${className}`
              : `${btnSecondary} ${className}`
          }
        >
          {icon && (
            <span className="material-symbols-outlined text-[20px] leading-none">
              add_circle
            </span>
          )}
          <span>{triggerText}</span>
        </button>
      )}

      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-[#101820]/60 backdrop-blur-[4px] p-0 sm:p-4 animate-in fade-in duration-150 overflow-y-auto text-left whitespace-normal font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface-container-lowest border border-surface-container-highest rounded-t-2xl sm:rounded-2xl p-6 max-w-[480px] w-full shadow-[0_12px_32px_-4px_rgba(23,33,43,0.16)] relative sm:my-8 max-h-[92vh] overflow-y-auto text-left whitespace-normal">
            <div className="sm:hidden w-9 h-1 rounded-full bg-surface-container-highest mx-auto mb-4" />

            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="font-headline-h3 text-headline-h3 text-on-surface">
                  Catat Transaksi Personal
                </h3>
                <span className="inline-block font-label-sm text-label-sm uppercase px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                  Portofolio: Tabungan Personal
                </span>
              </div>
            </div>
            <p className="font-caption text-caption text-on-surface-variant mt-1 mb-4">
              Catatan transaksi ini tersimpan dan berdampak eksklusif pada saldo buku kas pribadimu.
            </p>

            {error && (
              <div className="mb-4">
                <FormAlert>{error}</FormAlert>
              </div>
            )}

            {/* Toggle Type */}
            <div className="flex p-1 bg-surface-container-low rounded-lg border border-surface-container-highest mb-4">
              <button
                type="button"
                onClick={() => handleTypeChange('in')}
                className={`flex-1 py-2 text-caption-medium font-semibold rounded-md transition-all cursor-pointer ${
                  type === 'in'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pemasukan (+)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('out')}
                className={`flex-1 py-2 text-caption-medium font-semibold rounded-md transition-all cursor-pointer ${
                  type === 'out'
                    ? 'bg-tertiary-container text-on-tertiary-container shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pengeluaran (−)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Amount */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_amount"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Nominal Transaksi (IDR) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium text-body-medium">
                    Rp
                  </span>
                  <input
                    type="text"
                    id="personal_amount"
                    required
                    autoFocus
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full h-11 pl-11 pr-4 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-lg font-bold tabular-nums tracking-tight transition-all placeholder:text-on-surface-variant/60"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleQuickAdd(chip)}
                      className="px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest text-on-surface font-caption-medium text-caption-medium tabular-nums transition-colors cursor-pointer"
                    >
                      + Rp {new Intl.NumberFormat('id-ID').format(chip)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Category */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_category"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Kategori Transaksi
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Tag size={15} />
                  </span>
                  <select
                    id="personal_category"
                    value={isCustomCategory ? '__custom__' : category}
                    onChange={handleCategorySelect}
                    className="w-full h-11 pl-9 pr-4 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Kategori Baru...</option>
                  </select>
                </div>

                {isCustomCategory && (
                  <div className="mt-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Ketik nama kategori kustom baru..."
                      required
                      autoFocus
                      className="w-full h-10 px-3.5 rounded-lg border border-primary bg-surface-container-lowest text-on-surface focus:outline-none text-caption-medium transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_desc"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Keterangan / Entitas
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <FileText size={15} />
                  </span>
                  <input
                    type="text"
                    id="personal_desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      type === 'in'
                        ? 'Contoh: Gaji Bulanan PT Maju Terus'
                        : 'Contoh: Belanja Bulanan Supermarket'
                    }
                    className="w-full h-11 pl-9 pr-4 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all placeholder:text-on-surface-variant/60"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_date"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Tanggal Transaksi
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Calendar size={15} />
                  </span>
                  <input
                    type="date"
                    id="personal_date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full h-11 pl-9 pr-4 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all"
                  />
                </div>
              </div>

              {/* Feature: Upload Bukti Transfer / Struk */}
              <div className="space-y-1.5 pt-1 border-t border-surface-container-low">
                <label className="block font-caption-medium text-caption-medium text-on-surface">
                  Bukti Transfer / Struk (Opsional)
                </label>

                {!receiptFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 border border-dashed border-surface-container-highest hover:border-primary bg-surface-container-low hover:bg-surface-container rounded-lg px-3.5 flex items-center justify-center gap-2 text-on-surface-variant font-caption text-caption transition-colors cursor-pointer"
                  >
                    <Paperclip size={15} className="text-secondary" />
                    <span>Pilih Foto Bukti Transfer (JPG, PNG, WebP &le; 5 MB)</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {receiptPreview ? (
                        <img
                          src={receiptPreview}
                          alt="Preview struk"
                          className="w-10 h-10 rounded-md object-cover border border-surface-container-highest shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-secondary-container text-on-secondary-fixed-variant flex items-center justify-center shrink-0">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-caption-medium text-caption-medium text-on-surface truncate">
                          {receiptFile.name}
                        </p>
                        <p className="font-label-sm text-label-sm text-primary flex items-center gap-1">
                          <Check size={11} /> Siap diunggah
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-md transition-colors"
                      title="Hapus lampiran"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-surface-container-highest flex gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 h-11 px-4 text-caption-medium font-semibold text-on-surface bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container-highest rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <PrimaryButton
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 text-caption-medium cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
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
