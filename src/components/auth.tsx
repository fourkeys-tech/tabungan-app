'use client';

import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { inputCls } from '@/components/ui';

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-xl border border-border-main">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Logo size="lg" />
          <h1 className="text-lg font-semibold text-text-main">{title}</h1>
        </div>
        {children}
        <p className="text-center text-sm text-text-muted mt-6">{footer}</p>
      </div>
    </div>
  );
}

const icons = { email: Mail, password: Lock, text: User };

export function AuthField({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, minLength,
}: {
  id: string; label: string; type?: 'text' | 'email' | 'password'; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  const Icon = icons[type === 'email' ? 'email' : type === 'password' ? 'password' : 'text'];
  const isPw = type === 'password';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-main">{label}</label>
      <div className="relative">
        <Icon size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          id={id} required value={value} minLength={minLength} autoComplete={autoComplete}
          type={isPw && show ? 'text' : type}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pl-10 ${isPw ? 'pr-11' : ''}`}
        />
        {isPw && (
          <button
            type="button" onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-main"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function FormAlert({ kind = 'error', children }: { kind?: 'error' | 'info'; children: ReactNode }) {
  const cls = kind === 'error' ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-primary-soft border-primary/30 text-primary';
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`mb-4 p-3 border rounded-lg text-sm ${cls}`}>{children}</div>;
}
