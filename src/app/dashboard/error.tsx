'use client';

import { ErrorState } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Data tidak dapat dimuat saat ini. Periksa koneksi lalu coba lagi." onRetry={reset} />;
}
