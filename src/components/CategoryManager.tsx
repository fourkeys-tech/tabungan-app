'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/app/actions/categories';
import { BASELINE_CATEGORIES } from '@/utils/finance';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Wallet,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface CategoryData {
  id: string;
  name: string;
  scope_type: 'PERSONAL' | 'SHARED';
  transaction_type: 'INCOME' | 'EXPENSE' | 'CONTRIBUTION' | null;
  owner_user_id?: string | null;
}

interface Props {
  initialCategories: CategoryData[];
  currentUserId: string;
}

export function CategoryManager({ initialCategories, currentUserId }: Props) {
  const router = useRouter();

  const [scope, setScope] = useState<'PERSONAL' | 'SHARED'>('PERSONAL');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Form states untuk tambah kategori baru
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'IN' | 'OUT'>('OUT');
  const [addLoading, setAddLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Susun daftar gabungan baseline dan kategori dari database
  const baselineList: CategoryData[] =
    scope === 'PERSONAL'
      ? [
          ...BASELINE_CATEGORIES.personal_in.map((name) => ({
            id: `baseline_p_in_${name}`,
            name,
            scope_type: 'PERSONAL' as const,
            transaction_type: 'INCOME' as const,
            owner_user_id: null,
          })),
          ...BASELINE_CATEGORIES.personal_out.map((name) => ({
            id: `baseline_p_out_${name}`,
            name,
            scope_type: 'PERSONAL' as const,
            transaction_type: 'EXPENSE' as const,
            owner_user_id: null,
          })),
        ]
      : [
          ...BASELINE_CATEGORIES.shared_in.map((name) => ({
            id: `baseline_s_in_${name}`,
            name,
            scope_type: 'SHARED' as const,
            transaction_type: 'CONTRIBUTION' as const,
            owner_user_id: null,
          })),
          ...BASELINE_CATEGORIES.shared_out.map((name) => ({
            id: `baseline_s_out_${name}`,
            name,
            scope_type: 'SHARED' as const,
            transaction_type: 'EXPENSE' as const,
            owner_user_id: null,
          })),
        ];

  // Kategori kustom dari database untuk scope aktif
  const dbCustomList = initialCategories.filter((c) => c.scope_type === scope);

  // Hindari duplikasi jika nama di database sama dengan baseline
  const baselineNames = new Set(baselineList.map((b) => b.name.toLowerCase()));
  const filteredDbList = dbCustomList.filter(
    (c) => !baselineNames.has(c.name.toLowerCase())
  );

  const allDisplayCategories = [...baselineList, ...filteredDbList];

  // Filter berdasarkan jenis mutasi (IN / OUT)
  const filteredCategories = allDisplayCategories.filter((c) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'IN') {
      return c.transaction_type === 'INCOME' || c.transaction_type === 'CONTRIBUTION';
    }
    if (filterType === 'OUT') {
      return c.transaction_type === 'EXPENSE';
    }
    return true;
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || addLoading) return;

    setAddLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('name', newName.trim());
    formData.append('scope_type', scope);
    formData.append(
      'transaction_type',
      newType === 'IN' ? (scope === 'PERSONAL' ? 'INCOME' : 'CONTRIBUTION') : 'EXPENSE'
    );

    const res = await addCategoryAction(formData);
    setAddLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Kategori "${newName.trim()}" berhasil ditambahkan.`);
      setNewName('');
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleStartEdit = (cat: CategoryData) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editingName.trim()) return;
    setActionLoadingId(catId);
    setErrorMsg(null);

    const res = await updateCategoryAction(catId, editingName.trim());
    setActionLoadingId(null);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg('Kategori berhasil diperbarui.');
      setEditingId(null);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDeleteCategory = async (cat: CategoryData) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
      return;
    }
    setActionLoadingId(cat.id);
    setErrorMsg(null);

    const res = await deleteCategoryAction(cat.id);
    setActionLoadingId(null);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Kategori "${cat.name}" berhasil dihapus.`);
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <article className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest flex flex-col gap-space-md">
      {/* Header Kartu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-surface-container-low pb-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl leading-none">label</span>
          </div>
          <div>
            <h2 className="font-headline-h2 text-lg text-on-surface font-semibold">
              Kelola Kategori Tabungan
            </h2>
            <p className="font-caption text-caption text-on-surface-variant">
              Atur pos pengeluaran dan pemasukan mutasi Anda untuk klasifikasi laporan yang akurat.
            </p>
          </div>
        </div>

        {/* Scope Selector Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-surface-container-low border border-surface-container-highest">
          <button
            type="button"
            onClick={() => {
              setScope('PERSONAL');
              setFilterType('ALL');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'PERSONAL'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Wallet size={14} />
            <span>Tabungan Personal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('SHARED');
              setFilterType('ALL');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              scope === 'SHARED'
                ? 'bg-surface-container-lowest text-secondary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users size={14} />
            <span>Tabungan Bersama</span>
          </button>
        </div>
      </div>

      {/* Alert Notifikasi */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim flex items-center gap-2 text-xs text-tertiary font-medium animate-in fade-in">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-primary-fixed/30 border border-primary/20 flex items-center gap-2 text-xs text-primary font-medium animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Tambah Kategori Baru */}
      <form
        onSubmit={handleAddCategory}
        className="p-space-md rounded-xl bg-surface-container-low/60 border border-surface-container-high flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm"
      >
        <div className="flex-1 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <Tag size={16} />
          </span>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Tambah kategori ${scope === 'PERSONAL' ? 'pribadi' : 'bersama'} baru...`}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50 transition-all"
          />
        </div>

        {/* Toggle Pemasukan / Pengeluaran */}
        <div className="flex p-1 bg-surface-container rounded-xl border border-surface-container-highest shrink-0 h-11 items-center">
          <button
            type="button"
            onClick={() => setNewType('IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              newType === 'IN'
                ? 'bg-primary-fixed text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {scope === 'PERSONAL' ? 'Pemasukan (+)' : 'Setoran (+)'}
          </button>
          <button
            type="button"
            onClick={() => setNewType('OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              newType === 'OUT'
                ? 'bg-tertiary-fixed text-tertiary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pengeluaran (−)
          </button>
        </div>

        <button
          type="submit"
          disabled={addLoading || !newName.trim()}
          className="h-11 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>{addLoading ? 'Menyimpan...' : 'Tambah Kategori'}</span>
        </button>
      </form>

      {/* Sub-Filter Type Pills & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-on-surface text-surface-container-lowest shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Semua ({allDisplayCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('IN')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'IN'
                ? 'bg-primary-fixed text-on-primary-fixed-variant'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {scope === 'PERSONAL' ? 'Pemasukan' : 'Setoran Kas'}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('OUT')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'OUT'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pengeluaran
          </button>
        </div>

        <span className="font-caption text-caption text-on-surface-variant">
          Menampilkan <strong className="text-on-surface">{filteredCategories.length}</strong> kategori
        </span>
      </div>

      {/* Grid Kartu Kategori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm pt-space-2xs">
        {filteredCategories.map((cat) => {
          const isSystem = !cat.owner_user_id || cat.id.startsWith('baseline_');
          const isIncome = cat.transaction_type === 'INCOME' || cat.transaction_type === 'CONTRIBUTION';
          const isEditing = editingId === cat.id;
          const isActionLoading = actionLoadingId === cat.id;

          const badgeBg = isIncome
            ? 'bg-primary-fixed text-on-primary-fixed-variant'
            : 'bg-tertiary-fixed text-on-tertiary-fixed-variant';

          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high hover:border-surface-container-highest transition-all flex items-center justify-between gap-2 group"
            >
              {isEditing ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    className="w-full h-8 px-2.5 rounded-lg border border-primary bg-surface-container-lowest text-on-surface text-xs font-semibold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(cat.id)}
                    disabled={isActionLoading}
                    className="p-1.5 rounded-md bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                    title="Simpan"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1.5 rounded-md bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    title="Batal"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isIncome ? 'bg-primary' : 'bg-tertiary'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-body-medium text-body-medium font-semibold text-on-surface truncate">
                        {cat.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none ${badgeBg}`}>
                          {isIncome
                            ? scope === 'PERSONAL'
                              ? 'Pemasukan'
                              : 'Setoran'
                            : 'Pengeluaran'}
                        </span>
                        {isSystem ? (
                          <span className="text-[10px] text-on-surface-variant/70 font-medium">
                            Sistem
                          </span>
                        ) : (
                          <span className="text-[10px] text-secondary font-medium">
                            Kustom Anda
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions untuk kategori buatan pengguna */}
                  {!isSystem && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        title="Ubah nama kategori"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-tertiary transition-colors cursor-pointer"
                        title="Hapus kategori"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

