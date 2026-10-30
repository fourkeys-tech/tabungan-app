import Link from 'next/link';
import Image from 'next/image';

export function Logo({
  size = 'md',
  href = '/',
  showSubtitle = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  showSubtitle?: boolean;
}) {
  const imgSize = size === 'lg' ? 40 : size === 'sm' ? 28 : 32;
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'font-headline-h3 text-headline-h3';

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-space-sm text-on-surface group"
      aria-label="TabungKu — beranda"
    >
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/logo-icon.png"
          alt="TabungKu Logo"
          width={imgSize}
          height={imgSize}
          className="object-contain group-hover:scale-105 transition-transform"
          priority
        />
      </div>
      <span className="flex flex-col">
        <span className={`${text} tracking-tight text-primary font-bold leading-none`}>TabungKu</span>
        {showSubtitle && (
          <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-0.5">
            - Aplikasi Tabungan
          </span>
        )}
      </span>
    </Link>
  );
}
