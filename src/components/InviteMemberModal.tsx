'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createGroupInvitation } from '@/app/actions/groups';
import { UserPlus, Copy, Check, X, Link as LinkIcon } from 'lucide-react';

interface Props {
  groupId: string;
  groupName: string;
  variant?: 'default' | 'text-link' | 'card-button';
  triggerText?: string;
}

export function InviteMemberModal({
  groupId,
  groupName,
  variant = 'default',
  triggerText = 'Undang',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createGroupInvitation(groupId, email);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.data?.token) {
      const origin = window.location.origin;
      setInviteLink(`${origin}/invite/${res.data.token}`);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInviteLink(null);
    setEmail('');
    setError(null);
    setCopied(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          variant === 'text-link'
            ? 'text-secondary hover:text-primary font-caption-medium text-caption-medium flex items-center gap-0.5 cursor-pointer transition-colors'
            : variant === 'card-button'
            ? 'h-9 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium flex items-center justify-center gap-1 transition-colors cursor-pointer'
            : 'text-sm font-medium text-on-surface hover:text-primary flex items-center gap-1.5 bg-surface-container hover:bg-surface-variant px-3 py-1.5 rounded-lg transition-colors cursor-pointer'
        }
      >
        {variant === 'text-link' ? (
          <span className="material-symbols-outlined text-sm leading-none">
            person_add
          </span>
        ) : variant === 'card-button' ? (
          <span className="material-symbols-outlined text-sm leading-none">
            manage_accounts
          </span>
        ) : (
          <UserPlus size={16} />
        )}
        <span>{triggerText}</span>
      </button>

      {isOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 text-left whitespace-normal font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="bg-surface-container-lowest border border-surface-container-highest rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left whitespace-normal max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-9 h-1 rounded-full bg-surface-container-highest mx-auto -mt-1 mb-4" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1 text-left">
              <div className="w-9 h-9 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <h3 className="font-headline-h3 text-lg font-bold text-on-surface">
                Undang Anggota
              </h3>
            </div>
            <p className="font-caption text-xs text-on-surface-variant mb-5 text-left">
              Bagikan tautan ini kepada teman atau keluarga untuk bergabung ke tabungan <strong>&ldquo;{groupName}&rdquo;</strong>.
            </p>

            {error && (
              <div className="text-xs text-tertiary bg-tertiary-fixed/30 p-3 rounded-xl mb-4 border border-tertiary-fixed-dim text-left">
                {error}
              </div>
            )}

            {!inviteLink ? (
              <form onSubmit={handleGenerate} className="space-y-4 text-left">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-on-surface mb-1.5 text-left">
                    Email Pengguna (Opsional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface text-sm focus:outline-none focus:border-primary text-left placeholder:text-on-surface-variant/50 transition-all"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1.5 text-left">
                    Bila dikosongkan, tautan dapat digunakan oleh siapa saja yang menerima link.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-low text-left">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? 'Membuat Tautan...' : 'Buat Tautan Undangan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-left">
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-high space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-medium text-on-surface-variant text-left">
                    <span className="flex items-center gap-1 text-left">
                      <LinkIcon size={12} /> Tautan Undangan (Berlaku 7 hari):
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="w-full bg-surface-container-lowest border border-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface font-mono select-all focus:outline-none text-left"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors cursor-pointer shadow-xs"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-surface-container-low text-left">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2 text-sm bg-surface-container hover:bg-surface-variant text-on-surface font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
