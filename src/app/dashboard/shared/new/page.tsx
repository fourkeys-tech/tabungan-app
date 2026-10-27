'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSavingsGroup } from '@/app/actions/groups';
import { Card, PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';
import { ArrowLeft, Users, Target, Calendar } from 'lucide-react';

export default function NewSharedLedgerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createSavingsGroup(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard/shared');
      router.refresh();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/shared"
          className="w-10 h-10 rounded-full bg-surface-muted hover:bg-border-main flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-main">Buat Tabungan Bersama</h1>
          <p className="text-sm text-text-muted mt-0.5">Mulai menabung untuk target bersama teman atau keluarga.</p>
        </div>
      </div>

      <Card>
        {error && <div className="mb-5"><FormAlert>{error}</FormAlert></div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-semibold text-text-main">
              Nama Tabungan <span className="text-accent">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                <Users size={16} />
              </span>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="Contoh: Liburan Akhir Tahun ke Bali"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-main bg-surface-muted/50 text-text-main focus:outline-none focus:border-primary focus:bg-surface text-sm transition-all placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-semibold text-text-main">
              Deskripsi (Opsional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Jelaskan tujuan atau aturan tabungan bersama ini..."
              className="w-full px-4 py-2.5 rounded-xl border border-border-main bg-surface-muted/50 text-text-main focus:outline-none focus:border-primary focus:bg-surface text-sm transition-all placeholder:text-text-muted resize-none"
            ></textarea>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="target_amount" className="block text-sm font-semibold text-text-main">
              Target Tabungan (Opsional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                Rp
              </span>
              <input
                type="number"
                id="target_amount"
                name="target_amount"
                min="0"
                step="1000"
                placeholder="5.000.000"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-border-main bg-surface-muted/50 text-text-main focus:outline-none focus:border-primary focus:bg-surface text-sm font-semibold transition-all placeholder:text-text-muted"
              />
            </div>
            <p className="text-xs text-text-muted">Target akan digunakan untuk menghitung persentase progres toples tabungan.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="target_date" className="block text-sm font-semibold text-text-main">
              Tanggal Target Selesai (Opsional)
            </label>
            <div className="relative">
              <input
                type="date"
                id="target_date"
                name="target_date"
                className="w-full px-4 py-2.5 rounded-xl border border-border-main bg-surface-muted/50 text-text-main focus:outline-none focus:border-primary focus:bg-surface text-sm transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border-main flex gap-3">
            <Link
              href="/dashboard/shared"
              className="flex-1 text-center bg-surface-muted hover:bg-border-main text-text-main font-medium py-3 px-4 rounded-xl transition-colors text-sm"
            >
              Batal
            </Link>
            <PrimaryButton type="submit" disabled={loading} className="flex-1 py-3">
              {loading ? 'Menyimpan...' : 'Buat Tabungan'}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
