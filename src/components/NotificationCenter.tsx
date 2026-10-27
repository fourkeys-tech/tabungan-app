'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, Users, AlertTriangle, CheckCircle, ArrowDownLeft, X, Sparkles } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'CONTRIBUTION' | 'VOID' | 'TARGET_REACHED' | 'SYSTEM' | 'INVITATION';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  link?: string;
}

interface Props {
  initialNotifications?: NotificationItem[];
}

export function NotificationCenter({ initialNotifications = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync dengan localStorage untuk status read
  useEffect(() => {
    try {
      const readIds = JSON.parse(localStorage.getItem('tabungku_read_notifications') || '[]');
      if (Array.isArray(readIds) && readIds.length > 0) {
        setNotifications((prev) =>
          prev.map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // Klik di luar untuk menutup popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const allIds = notifications.map((n) => n.id);
      localStorage.setItem('tabungku_read_notifications', JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const readIds = JSON.parse(localStorage.getItem('tabungku_read_notifications') || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('tabungku_read_notifications', JSON.stringify(readIds));
      }
    } catch {
      // ignore
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'CONTRIBUTION':
        return <ArrowDownLeft size={16} className="text-success" />;
      case 'VOID':
        return <AlertTriangle size={16} className="text-accent" />;
      case 'TARGET_REACHED':
        return <CheckCircle size={16} className="text-primary" />;
      case 'INVITATION':
        return <Users size={16} className="text-blue-500" />;
      default:
        return <Sparkles size={16} className="text-amber-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Pemberitahuan & Notifikasi"
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted hover:text-text-main transition-colors focus:outline-none"
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border-main rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border-main flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-main text-sm">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
              >
                <Check size={14} /> Tandai dibaca
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex p-1 bg-surface-muted/50 border-b border-border-main text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-surface text-text-main shadow-xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-surface text-text-main shadow-xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border-main/50">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-muted text-text-muted flex items-center justify-center mx-auto mb-2">
                  <CheckCircle size={20} />
                </div>
                <p className="text-xs font-semibold text-text-main">
                  {filter === 'unread' ? 'Semua notifikasi sudah dibaca' : 'Tidak ada notifikasi'}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Aktivitas mutasi, target, dan grup akan muncul di sini.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3.5 hover:bg-surface-muted/60 transition-colors flex gap-3 cursor-pointer ${
                    !notif.read ? 'bg-primary-soft/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-surface-muted border border-border-main flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!notif.read ? 'font-bold text-text-main' : 'font-medium text-text-main'} truncate`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-block text-[11px] font-semibold text-primary hover:underline mt-1.5"
                      >
                        Lihat Detail →
                      </Link>
                    )}
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-surface-muted/30 border-t border-border-main text-center">
            <Link
              href="/dashboard/transactions"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-text-muted hover:text-text-main transition-colors"
            >
              Lihat Riwayat Transaksi Lengkap
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
