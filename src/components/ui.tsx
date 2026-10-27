import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes, ComponentProps } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-11';

export const btnPrimary = `${base} bg-primary text-on-primary hover:bg-primary-hover`;
export const btnSecondary = `${base} border border-primary text-primary bg-transparent hover:bg-primary-soft`;
export const btnGhost = `${base} text-text-muted hover:bg-surface-muted hover:text-text-main`;
export const inputCls =
  'w-full rounded-lg border border-border-main bg-surface-muted text-text-main placeholder:text-text-muted/70 px-3.5 py-2.5 min-h-11 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${btnPrimary} ${props.className ?? ''}`} />;
}
export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${btnSecondary} ${props.className ?? ''}`} />;
}
export function LinkButton({ variant = 'primary', className = '', ...rest }: ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' }) {
  return <Link {...rest} className={`${variant === 'primary' ? btnPrimary : btnSecondary} ${className}`} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border-main rounded-xl p-4 md:p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-text-main">{title}</h1>
        {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4 gap-2">
      <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-1">
        <Inbox size={22} aria-hidden="true" />
      </div>
      <p className="font-semibold text-text-main">{title}</p>
      {description && <p className="text-sm text-text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Terjadi kesalahan saat memuat data.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center text-center py-10 px-4 gap-2">
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-1">
        <AlertTriangle size={22} aria-hidden="true" />
      </div>
      <p className="font-semibold text-text-main">Gagal memuat</p>
      <p className="text-sm text-text-muted max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={`${btnSecondary} mt-3`}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
