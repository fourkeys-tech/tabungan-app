import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Card, LinkButton } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { formatRupiah } from '@/utils/format';
import { AcceptInviteButton } from './AcceptInviteButton';
import { Users, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const userClient = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await userClient.auth.getUser();

  // Ambil detail undangan dari pot_invitations
  const { data: inv } = await adminClient
    .from('pot_invitations')
    .select(`
      id,
      pot_id,
      expires_at,
      revoked_at,
      created_by,
      savings_pots (
        id,
        name,
        description,
        target_amount
      )
    `)
    .eq('token', token)
    .maybeSingle();

  const isExpired = inv?.expires_at ? new Date(inv.expires_at) < new Date() : false;
  const isRevoked = Boolean(inv?.revoked_at);
  const isInvalid = !inv || isExpired || isRevoked;

  if (isInvalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="mb-6"><Logo /></div>
        <Card className="max-w-md w-full text-center py-8 px-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">Undangan Tidak Valid</h1>
            <p className="text-sm text-on-surface-variant mt-2">
              Tautan undangan ini sudah kedaluwarsa, dicabut, atau sudah tidak berlaku.
            </p>
          </div>
          <div className="pt-4">
            <LinkButton href="/dashboard" className="w-full">
              Masuk ke Dashboard
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  const pot = Array.isArray(inv.savings_pots) ? inv.savings_pots[0] : inv.savings_pots;

  // Cek apakah user yang sedang login sudah menjadi anggota aktif
  let isAlreadyMember = false;
  if (user) {
    const { data: member } = await adminClient
      .from('pot_members')
      .select('id, status')
      .eq('pot_id', inv.pot_id)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (member) isAlreadyMember = true;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8"><Logo /></div>

      <Card className="max-w-md w-full p-8 space-y-6 shadow-xl border-surface-container-highest">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-3">
            <Users size={32} />
          </div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Undangan Tabungan Bersama</p>
          <h1 className="text-2xl font-bold text-on-surface">{pot?.name}</h1>
          {pot?.description && (
            <p className="text-sm text-on-surface-variant">{pot.description}</p>
          )}
        </div>

        {pot?.target_amount && (
          <div className="bg-surface-container-low rounded-xl p-4 text-center">
            <span className="text-xs text-on-surface-variant block">Target Tabungan</span>
            <span className="text-lg font-bold text-secondary">
              {formatRupiah(Number(pot.target_amount))}
            </span>
          </div>
        )}

        <div className="space-y-3">
          {isAlreadyMember ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-xl text-sm font-medium">
                <CheckCircle2 size={18} />
                <span>Anda sudah menjadi anggota tabungan ini.</span>
              </div>
              <LinkButton href={`/dashboard/shared?group=${inv.pot_id}`} className="w-full">
                Buka Tabungan Bersama
              </LinkButton>
            </div>
          ) : user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-on-surface-variant">
                Silakan masuk atau daftar akun TabungKu untuk bergabung ke tabungan bersama ini.
              </p>
              <LinkButton href={`/login?redirect=/invite/${token}`} className="w-full">
                Masuk untuk Bergabung
              </LinkButton>
              <LinkButton href={`/register?redirect=/invite/${token}`} variant="secondary" className="w-full">
                Daftar Akun Baru
              </LinkButton>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-surface-container-highest flex items-center justify-center gap-2 text-xs text-on-surface-variant">
          <ShieldCheck size={14} className="text-primary" />
          <span>Pengelolaan Transparan &amp; Tata Kelola Aman</span>
        </div>
      </Card>
    </div>
  );
}
