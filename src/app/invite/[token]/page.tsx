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

  // Ambil detail undangan
  const { data: inv } = await adminClient
    .from('invitations')
    .select(`
      id,
      group_id,
      status,
      expires_at,
      created_by_user_id,
      savings_groups (
        id,
        name,
        description,
        target_amount
      )
    `)
    .eq('token_hash', token)
    .maybeSingle();

  // Undangan tidak ditemukan atau sudah tidak valid
  const isExpired = inv?.expires_at ? new Date(inv.expires_at) < new Date() : false;
  const isInvalid = !inv || inv.status !== 'PENDING' || isExpired;

  if (isInvalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4">
        <div className="mb-6"><Logo /></div>
        <Card className="max-w-md w-full text-center py-8 px-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main">Undangan Tidak Valid</h1>
            <p className="text-sm text-text-muted mt-2">
              Tautan undangan ini sudah kedaluwarsa, dicabut, atau sudah pernah digunakan sebelumnya.
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

  const group = Array.isArray(inv.savings_groups) ? inv.savings_groups[0] : inv.savings_groups;

  // Cek apakah user yang sedang login sudah menjadi anggota
  let isAlreadyMember = false;
  if (user) {
    const { data: member } = await adminClient
      .from('savings_group_members')
      .select('id, status')
      .eq('group_id', inv.group_id)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (member) isAlreadyMember = true;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4">
      <div className="mb-8"><Logo /></div>

      <Card className="max-w-md w-full p-8 space-y-6 shadow-xl border-border-main">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Users size={32} />
          </div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Undangan Tabungan Bersama</p>
          <h1 className="text-2xl font-bold text-text-main">{group?.name}</h1>
          {group?.description && (
            <p className="text-sm text-text-muted">{group.description}</p>
          )}
        </div>

        {group?.target_amount && (
          <div className="bg-surface-muted/60 p-4 rounded-xl border border-border-main flex items-center justify-between text-sm">
            <span className="text-text-muted">Target Tabungan:</span>
            <span className="font-bold text-text-main">{formatRupiah(Number(group.target_amount))}</span>
          </div>
        )}

        <div className="pt-2">
          {isAlreadyMember ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-success font-medium">
                <CheckCircle2 size={18} /> Kamu sudah bergabung di tabungan ini
              </div>
              <LinkButton href={`/dashboard/shared?group=${inv.group_id}`} className="w-full py-3">
                Buka Tabungan Bersama
              </LinkButton>
            </div>
          ) : user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-center text-text-muted mb-2">
                Masuk atau daftar terlebih dahulu untuk menerima undangan ini:
              </p>
              <LinkButton href={`/login?redirect=/invite/${token}`} className="w-full py-3">
                Masuk ke Akun
              </LinkButton>
              <LinkButton href={`/register?redirect=/invite/${token}`} variant="secondary" className="w-full py-3">
                Daftar Akun Baru
              </LinkButton>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-text-muted pt-2 border-t border-border-main">
          <ShieldCheck size={14} /> Pencatatan aman & terverifikasi sistem TabungKu
        </div>
      </Card>
    </div>
  );
}
