'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { seedUserData } from '@/app/actions/seed';
import { btnSecondary } from '@/components/ui';

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = async () => {
    setLoading(true);
    setError(null);
    const res = await seedUserData();
    setLoading(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-2">
      <button onClick={run} disabled={loading} className={btnSecondary}>
        {loading ? 'Memproses...' : 'Isi data contoh (demo)'}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
