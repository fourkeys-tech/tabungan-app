'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Users, ArrowLeftRight, BarChart3, Settings } from 'lucide-react';

export const navItems = [
  { href: '/dashboard', label: 'Beranda', short: 'Beranda', materialIcon: 'dashboard', icon: Home },
  { href: '/dashboard/personal', label: 'Tabungan Personal', short: 'Personal', materialIcon: 'account_balance_wallet', icon: Wallet },
  { href: '/dashboard/shared', label: 'Tabungan Bersama', short: 'Bersama', materialIcon: 'groups', icon: Users, hasSharedDot: true },
  { href: '/dashboard/transactions', label: 'Transaksi', short: 'Transaksi', materialIcon: 'receipt_long', icon: ArrowLeftRight },
  { href: '/dashboard/reports', label: 'Laporan', short: 'Laporan', materialIcon: 'analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Pengaturan', short: 'Pengaturan', materialIcon: 'settings', icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));
}

export function SidebarNav() {
  const isActive = useActive();
  return (
    <div className="px-space-md py-space-sm">
      <div className="px-space-sm py-space-xs font-label-sm text-label-sm uppercase tracking-wider text-outline">
        Menu Navigasi
      </div>
      <nav aria-label="Navigasi utama" className="flex flex-col gap-space-2xs mt-space-2xs">
        {navItems.map(({ href, label, materialIcon, hasSharedDot }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-colors bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'flex items-center justify-between px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-body-medium text-body-medium'
              }
            >
              <span className="flex items-center gap-space-sm">
                <span
                  className={`material-symbols-outlined text-[20px] leading-none ${
                    active ? 'text-on-primary-container' : 'text-outline'
                  }`}
                >
                  {materialIcon}
                </span>
                <span>{label}</span>
              </span>
              {hasSharedDot && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    active ? 'bg-on-primary-container' : 'bg-secondary'
                  }`}
                  title="Multi-Pemegang Aktif"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileNav() {
  const isActive = useActive();
  const items = navItems.slice(0, 5);

  return (
    <nav
      aria-label="Navigasi bawah"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-highest grid grid-cols-5 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      {items.map(({ href, short, materialIcon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
              active ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div
              className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                active ? 'bg-primary-fixed text-on-primary-fixed-variant' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">{materialIcon}</span>
            </div>
            <span>{short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
