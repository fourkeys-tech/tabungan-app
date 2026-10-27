import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { SettingsClient } from './SettingsClient';
import { CategoryManager } from '@/components/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user.id;
  const adminClient = createAdminClient();

  const [{ data: profile }, { data: categoriesRaw }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle(),
    adminClient
      .from('categories')
      .select('*')
      .or(`owner_user_id.eq.${userId},owner_user_id.is.null`)
      .order('created_at', { ascending: true }),
  ]);

  const name = profile?.name || (user.user_metadata?.name as string | undefined) || 'Pengguna';
  const email = user.email || '';
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || '';
  const notificationSettings = user.user_metadata?.notification_settings as
    | { emailNotifications?: boolean; groupAlerts?: boolean; budgetWarnings?: boolean }
    | undefined;

  return (
    <div className="flex flex-col gap-space-lg">
      <header>
        <h1 className="font-headline-h1 text-headline-h1-mobile md:text-headline-h1 text-on-surface tracking-tight">
          Pengaturan Akun &amp; Sistem
        </h1>
        <p className="font-caption text-caption text-on-surface-variant mt-0.5">
          Kelola profil personal, atur foto avatar, kelola kategori transaksi, dan sesuaikan preferensi notifikasi Anda.
        </p>
      </header>

      {/* Kelola Kategori Tabungan Terpusat */}
      <CategoryManager
        initialCategories={(categoriesRaw ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          scope_type: c.scope_type,
          transaction_type: c.transaction_type,
          owner_user_id: c.owner_user_id,
        }))}
        currentUserId={userId}
      />

      {/* Pengaturan Akun, Keamanan & Notifikasi */}
      <SettingsClient
        initialName={name}
        email={email}
        initialAvatarUrl={avatarUrl}
        initialNotifications={notificationSettings}
      />
    </div>
  );
}
