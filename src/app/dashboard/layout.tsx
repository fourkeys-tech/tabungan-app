import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { SidebarNav, MobileNav } from '@/components/DashboardNav';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NotificationCenter } from '@/components/NotificationCenter';
import { getUserNotifications } from '@/utils/notifications';
import { PrivacyProvider } from '@/components/PrivacyContext';
import { logoutAction } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminClient = createAdminClient();
  const [{ data: profile }, notifications] = await Promise.all([
    adminClient.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    getUserNotifications(adminClient, user.id),
  ]);

  const name =
    profile?.name ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Pengguna';

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || '';

  const currentMonthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <PrivacyProvider>
      <div className="min-h-screen bg-background text-on-surface antialiased">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex-col justify-between">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="h-16 px-space-lg flex items-center gap-space-sm bg-surface-container-lowest">
              <Logo href="/dashboard" showSubtitle />
            </div>
            <SidebarNav />
          </div>

          <div className="p-space-md bg-surface-container-low">
            <div className="p-space-sm rounded-xl bg-surface-container-lowest flex items-center justify-between gap-2 shadow-2xs">
              <Link href="/dashboard/settings" className="flex items-center gap-space-sm min-w-0 flex-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-surface-container-highest"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-caption-medium text-caption-medium font-bold shrink-0">
                    {initials(name)}
                  </span>
                )}
                <span className="flex flex-col min-w-0">
                  <span className="font-body-medium text-body-medium text-on-surface truncate">
                    {name}
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant truncate">
                    Pengelola Utama
                  </span>
                </span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="p-space-2xs text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors cursor-pointer"
                  title="Keluar dari sistem"
                >
                  <span className="material-symbols-outlined text-lg leading-none">logout</span>
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <div className="lg:pl-72">
          <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 px-space-md sm:px-space-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-space-md">
              <div className="lg:hidden">
                <Logo href="/dashboard" size="sm" />
              </div>
              <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container text-on-surface-variant font-caption-medium text-caption-medium">
                <span className="material-symbols-outlined text-sm leading-none text-secondary">
                  calendar_today
                </span>
                <span className="capitalize">{currentMonthYear}</span>
              </div>
            </div>

            <div className="flex items-center gap-space-xs sm:gap-space-md">
              <div className="flex items-center">
                <ThemeToggle />
              </div>

              <NotificationCenter initialNotifications={notifications} />

              <Link
                href="/dashboard/settings"
                aria-label="Profil Pengguna"
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity overflow-hidden"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-8 h-8 rounded-full object-cover border border-surface-container-highest"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-caption-medium text-caption-medium font-bold">
                    {initials(name)}
                  </span>
                )}
              </Link>
            </div>
          </header>

          <main className="w-full pt-16 bg-background min-h-screen pb-24 lg:pb-8">
            <div className="flex flex-col w-full">
              <div className="w-full max-w-[1240px] mx-auto px-space-md sm:px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg">
                {children}
              </div>
            </div>
          </main>
        </div>

        <MobileNav />
      </div>
    </PrivacyProvider>
  );
}
