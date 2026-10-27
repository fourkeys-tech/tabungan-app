'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/app/actions/transactions';
import { Card, PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';
import { BASELINE_CATEGORIES } from '@/utils/finance';
import {
  ArrowLeft,
  Wallet,
  Users,
  Calendar,
  Tag,
  FileText,
  Paperclip,
  X,
  ImageIcon,
} from 'lucide-react';

interface GroupOption {
  id: string;
  name: string;
}

interface Props {
  groups: GroupOption[];
  defaultGroupId?: string;
  initialCategories?: string[];
}

export function TransactionForm({ groups, defaultGroupId, initialCategories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [destination, setDestination] = useState<string>(defaultGroupId || 'personal');
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

  const isShared = destination !== 'personal';

  // Opsi kategori baseline & dinamis
  const baselineOptions = isShared
    ? type === 'in'
      ? BASELINE_CATEGORIES.shared_in
      : BASELINE_CATEGORIES.shared_out
    : type === 'in'
    ? BASELINE_CATEGORIES.personal_in
    : BASELINE_CATEGORIES.personal_out;

  const availableCategories = Array.from(
    new Set([...(initialCategories || []), ...baselineOptions])
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setAmountDisplay('');
      return;
    }
    const num = Number(raw);
    setAmountDisplay(new Intl.NumberFormat('id-ID').format(num));
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
    formData.append('destination', destination);
    formData.append('type', type);
    formData.append('amount', amountDisplay.replace(/\./g, ''));
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
      router.push(isShared ? `/dashboard/shared?group=${destination}` : '/dashboard/personal');
      router.refresh();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-headline-h1 text-2xl text-on-surface tracking-tight font-bold">
            Tambah Transaksi
          </h1>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">
            Catat aktivitas mutasi pemasukan, setoran grup, atau pengeluaran lengkap dengan bukti transfer.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest">
        {error && (
          <div className="mb-5">
            <FormAlert>{error}</FormAlert>
          </div>
        )}

        {/* Toggle Type */}
        <div className="flex p-1 bg-surface-container-low rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setType('in');
              setIsCustomCategory(false);
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              type === 'in'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {isShared ? 'Setoran Bersama (+)' : 'Pemasukan (+)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setType('out');
              setIsCustomCategory(false);
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              type === 'out'
                ? 'bg-tertiary-container text-on-tertiary-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pengeluaran (−)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Destination */}
          <div className="space-y-1.5">
            <label htmlFor="destination" className="block text-sm font-semibold text-on-surface">
              Tujuan Tabungan
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                {isShared ? <Users size={16} /> : <Wallet size={16} />}
              </span>
              <select
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-sm transition-all"
              >
                <option value="personal">💼 Tabungan Pribadi</option>
                {groups.length > 0 && (
                  <optgroup label="👥 Tabungan Bersama">
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label htmlFor="amount" className="block text-sm font-semibold text-on-surface">
              Nominal Transaksi <span className="text-tertiary">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-base">
                Rp
              </span>
              <input
                type="text"
                id="amount"
                required
                value={amountDisplay}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-xl font-bold tracking-tight transition-all placeholder:text-on-surface-variant/50 tabular-nums"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="category" className="block text-sm font-semibold text-on-surface">
                Kategori
              </label>
              {isCustomCategory && (
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Pilih dari daftar
                </button>
              )}
            </div>

            {isCustomCategory ? (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">
                  <Tag size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Ketik nama kategori baru..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-primary bg-surface-container-low text-on-surface focus:outline-none text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Tag size={16} />
                </span>
                <select
                  id="category"
                  value={category || availableCategories[0]}
                  onChange={handleCategorySelect}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-sm transition-all"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Kategori Baru...</option>
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-semibold text-on-surface">
              Keterangan / Catatan
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-on-surface-variant">
                <FileText size={16} />
              </span>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'in' ? 'Contoh: Gaji bulan ini' : 'Contoh: Makan siang bersama tim'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-sm transition-all placeholder:text-on-surface-variant/50"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="transaction_date" className="block text-sm font-semibold text-on-surface">
              Tanggal Transaksi
            </label>
            <div className="relative">
              <input
                type="date"
                id="transaction_date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-sm transition-all"
              />
            </div>
          </div>

          {/* Upload Bukti Struk / Transfer */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-sm font-semibold text-on-surface">
              Lampirkan Bukti Transfer / Struk (Opsional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {receiptFile ? (
              <div className="p-3 rounded-xl border border-secondary/40 bg-secondary-container/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {receiptPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptPreview}
                      alt="Pratinjau Struk"
                      className="w-12 h-12 rounded-lg object-cover border border-secondary/30 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {receiptFile.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {(receiptFile.size / 1024).toFixed(0)} KB • Siap diunggah
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-tertiary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Hapus lampiran"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-surface-container-high hover:border-secondary bg-surface-container-low/50 hover:bg-surface-container-low flex items-center justify-center gap-2 text-xs font-semibold text-on-surface-variant hover:text-secondary transition-all cursor-pointer"
              >
                <Paperclip size={16} />
                <span>Pilih Foto Bukti Transfer (JPG, PNG, maks 5 MB)</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-surface-container-low flex gap-3">
            <Link
              href="/dashboard/transactions"
              className="flex-1 text-center bg-surface-container-high hover:bg-surface-variant text-on-surface font-medium py-3 px-4 rounded-xl transition-colors text-sm"
            >
              Batal
            </Link>
            <PrimaryButton type="submit" disabled={loading} className="flex-1 py-3">
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
