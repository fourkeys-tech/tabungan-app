'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  isHidden: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isHidden: false,
  togglePrivacy: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tabungku_privacy_hidden');
      if (saved === 'true') setIsHidden(true);
    } catch {
      // ignore
    }
  }, []);

  const togglePrivacy = () => {
    setIsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tabungku_privacy_hidden', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <PrivacyContext.Provider value={{ isHidden, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function PrivacyToggleButton() {
  const { isHidden, togglePrivacy } = usePrivacy();

  return (
    <button
      aria-pressed={isHidden}
      onClick={togglePrivacy}
      className="h-10 px-space-sm rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-caption-medium text-caption-medium flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer"
      id="privacy-toggle"
      title="Sembunyikan atau tampilkan nominal saldo"
      type="button"
    >
      <span className="material-symbols-outlined text-base leading-none text-secondary" id="privacy-icon">
        {isHidden ? 'visibility_off' : 'visibility'}
      </span>
      <span id="privacy-label">{isHidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}</span>
    </button>
  );
}

export function MaskableText({
  value,
  className = '',
}: {
  value: string;
  className?: string;
}) {
  const { isHidden } = usePrivacy();
  return (
    <span className={`balance-maskable tabular-nums ${className}`} data-original={value}>
      {isHidden ? '••••••••' : value}
    </span>
  );
}

