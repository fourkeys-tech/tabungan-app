'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveSavingsGroup } from '@/app/actions/groups';
import { LogOut } from 'lucide-react';

export function LeaveGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    if (!confirm(`Apakah Anda yakin ingin keluar dari grup "${groupName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await leaveSavingsGroup(groupId);
    if (res.error) {
      setError(res.error);
      alert(res.error);
      setLoading(false);
    } else {
      router.push('/dashboard/shared');
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLeave}
      disabled={loading}
      className="text-xs text-text-muted hover:text-accent flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-accent/10 transition-colors"
      title="Keluar dari grup tabungan"
    >
      <LogOut size={13} />
      <span>{loading ? 'Keluar...' : 'Keluar Grup'}</span>
    </button>
  );
}
