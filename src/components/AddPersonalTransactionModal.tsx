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

interface PotOption {
  id: string;
  name: string;
}

interface Props {
  pots?: PotOption[];
  defaultPotId?: string;
  triggerText?: string;
  variant?: 'primary' | 'secondary' | 'card-action';
  className?: string;
  icon?: boolean;
  initialCategories?: string[];
}

const QUICK_CHIPS = [50000, 100000, 500000];

export function AddPersonalTransactionModal({
  pots,
  defaultPotId,
  triggerText = 'Tambah Transaksi',
  variant = 'primary',
  className = '',
  icon = true,
  initialCategories,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPotId, setSelectedPotId] = useState<string>(
    defaultPotId || pots?.[0]?.id || 'personal'
  );
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

  useEffect(() => {
    if (defaultPotId) {
      setSelectedPotId(defaultPotId);
    } else if (pots && pots.length > 0) {
      setSelectedPotId(pots[0].id);
    }
  }, [defaultPotId, pots]);

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
    if (defaultPotId) {
      setSelectedPotId(defaultPotId);
    } else if (pots && pots.length > 0) {
      setSelectedPotId(pots[0].id);
    }
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
    formData.append('destination', selectedPotId || 'personal');
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
              {/* Pilihan Pos jika user memiliki lebih dari 1 pos personal */}
              {pots && pots.length > 1 && (
                <div className="space-y-1.5">
                  <label className="block font-caption-medium text-caption-medium text-on-surface">
                    Pos Tabungan Tujuan <span className="text-error">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-on-surface-variant">
                      <Wallet size={18} />
                    </span>
                    <select
                      value={selectedPotId}
                      onChange={(e) => setSelectedPotId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      {pots.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_amount"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Nominal Transaksi (IDR) <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-headline-h3 text-headline-h3 text-on-surface-variant font-semibold">
                    Rp
                  </span>
                  <input
                    id="personal_amount"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    className="w-full pl-12 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg font-headline-h3 text-headline-h3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors tabular-nums"
                  />
                </div>
                {/* Quick Add Chips */}
                <div className="flex gap-2 pt-1">
                  {QUICK_CHIPS.map((chipVal) => (
                    <button
                      key={chipVal}
                      type="button"
                      onClick={() => handleQuickAdd(chipVal)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
                    >
                      + Rp {new Intl.NumberFormat('id-ID').format(chipVal)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_category"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Kategori Transaksi
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant">
                    <Tag size={18} />
                  </span>
                  <select
                    id="personal_category"
                    value={isCustomCategory ? '__custom__' : category}
                    onChange={handleCategorySelect}
                    className="w-full pl-10 pr-8 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-medium text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Tambah Kategori Baru...</option>
                  </select>
                </div>
                {isCustomCategory && (
                  <div className="mt-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Ketik nama kategori baru..."
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-low border border-primary/50 rounded-lg text-body-medium text-on-surface focus:outline-none focus:border-primary transition-colors"
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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant">
                    <FileText size={18} />
                  </span>
                  <input
                    id="personal_desc"
                    type="text"
                    placeholder="Contoh: Gaji Bulanan PT Maju Terus / Belanja Supermarket"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-medium text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Transaction Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="personal_date"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Tanggal Transaksi
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant">
                    <Calendar size={18} />
                  </span>
                  <input
                    id="personal_date"
                    type="date"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-medium text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* File Upload (Receipt / Bukti Transfer) */}
              <div className="space-y-1.5">
                <label className="block font-caption-medium text-caption-medium text-on-surface">
                  Bukti Transfer / Struk (Opsional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!receiptFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-outline-variant/60 hover:border-primary rounded-lg bg-surface-container-low hover:bg-surface-container text-body-medium text-on-surface-variant flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Paperclip size={16} />
                    <span>Pilih Foto Bukti Transfer (JPG, PNG, WebP ≤ 5 MB)</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-surface-container rounded-lg border border-surface-container-highest">
                    <div className="flex items-center gap-2 min-w-0">
                      {receiptPreview ? (
                        <img
                          src={receiptPreview}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded shrink-0 border border-surface-container-highest"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-caption-medium text-caption-medium text-on-surface block truncate max-w-[200px]">
                          {receiptFile.name}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {(receiptFile.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="p-1 text-on-surface-variant hover:text-error rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
                      title="Hapus file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-body-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <PrimaryButton
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 font-medium"
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
