'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptGroupInvitation } from '@/app/actions/groups';
import { PrimaryButton } from '@/components/ui';
import { FormAlert } from '@/components/auth';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    const res = await acceptGroupInvitation(token);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.data?.groupId) {
      router.push(`/dashboard/shared?group=${res.data.groupId}`);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      <PrimaryButton onClick={handleAccept} disabled={loading} className="w-full py-3.5 text-base">
        {loading ? 'Bergabung ke Grup...' : 'Terima Undangan & Bergabung'}
      </PrimaryButton>
    </div>
  );
}
