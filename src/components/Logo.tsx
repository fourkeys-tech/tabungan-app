import Link from 'next/link';
import { PiggyBank } from 'lucide-react';

export function Logo({
  size = 'md',
  href = '/',
  showSubtitle = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  showSubtitle?: boolean;
}) {
  const box = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const icon = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'font-headline-h3 text-headline-h3';

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-space-sm text-on-surface"
      aria-label="TabungKu — beranda"
    >
      <span className={`${box} rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs`}>
        <PiggyBank size={icon} aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className={`${text} tracking-tight text-primary font-bold leading-none`}>TabungKu</span>
        {showSubtitle && (
          <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-0.5">
            v2.0 Keuangan Bersama
          </span>
        )}
      </span>
    </Link>
  );
}
