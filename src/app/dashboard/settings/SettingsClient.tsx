'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, updatePassword, updateNotificationSettings } from '@/app/actions/settings';
import { logoutAction } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Camera,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  LogOut,
  Mail,
  User,
  Sliders,
  Check,
} from 'lucide-react';

interface Props {
  initialName: string;
  email: string;
  initialAvatarUrl: string;
  initialNotifications?: {
    emailNotifications?: boolean;
    groupAlerts?: boolean;
    budgetWarnings?: boolean;
  };
}

export function SettingsClient({
  initialName,
  email,
  initialAvatarUrl,
  initialNotifications,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notification States
  const [groupAlerts, setGroupAlerts] = useState(initialNotifications?.groupAlerts ?? true);
  const [targetReminders, setTargetReminders] = useState(initialNotifications?.emailNotifications ?? true);
  const [budgetWarnings, setBudgetWarnings] = useState(initialNotifications?.budgetWarnings ?? true);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setAvatarFile(file);
    setProfileError(null);
    setProfileSuccess(null);

    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    const formData = new FormData();
    formData.append('name', name);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const res = await updateProfile(formData);
    setProfileLoading(false);

    if (res.error) {
      setProfileError(res.error);
    } else {
      setProfileSuccess('Profil dan foto berhasil diperbarui.');
      setAvatarFile(null);
      if (res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
      }
      router.refresh();
      setTimeout(() => setProfileSuccess(null), 4000);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const formData = new FormData();
    formData.append('password', password);
    formData.append('confirm_password', confirmPassword);

    const res = await updatePassword(formData);
    setPasswordLoading(false);

    if (res.error) {
      setPasswordError(res.error);
    } else {
      setPasswordSuccess('Kata sandi berhasil diperbarui.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    }
  };

  const handleSaveNotifications = async (newSettings: {
    emailNotifications: boolean;
    groupAlerts: boolean;
    budgetWarnings: boolean;
  }) => {
    setNotifSuccess(false);
    const res = await updateNotificationSettings(newSettings);
    if (res.success) {
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 2500);
    }
  };

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start w-full">
      {/* Kolom Kiri: Profil & Keamanan (7 Kolom) */}
      <div className="lg:col-span-7 flex flex-col gap-space-lg">
        {/* 1. Profil & Upload Foto Profil */}
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest relative overflow-hidden">
          <div className="flex items-center justify-between pb-space-md border-b border-surface-container-low mb-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-2xl leading-none">
                account_circle
              </span>
              <div>
                <h2 className="font-headline-h2 text-headline-h2 text-on-surface">
                  Profil Akun
                </h2>
                <p className="font-caption text-caption text-on-surface-variant">
                  Informasi identitas personal dan avatar publik Anda.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm">
              Pengelola Utama
            </span>
          </div>

          {profileSuccess && (
            <div className="mb-space-md p-space-sm rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-caption-medium text-caption-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-space-md p-space-sm rounded-xl bg-error-container text-on-error-container font-caption-medium text-caption-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-error shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-space-md">
            {/* Avatar Upload Banner */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center sm:items-start gap-space-md">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-surface-container-highest shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center text-2xl font-bold border-2 border-surface-container-highest shadow-sm">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Ganti Foto Profil"
                >
                  <Camera size={20} />
                  <span className="font-label-sm text-[10px] mt-0.5">Ubah</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1 flex-1">
                <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                  Foto Avatar Anda
                </span>
                <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
                  Format JPG, PNG, atau WebP (maksimal 5 MB). Foto langsung ditampilkan di sidebar dan header.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-highest text-on-surface font-caption-medium text-caption-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Camera size={14} className="text-secondary" />
                    <span>Pilih Foto Baru</span>
                  </button>
                  {avatarFile && (
                    <span className="font-caption text-caption text-primary font-semibold flex items-center gap-1">
                      <Check size={14} /> {avatarFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="space-y-1.5">
                <label
                  htmlFor="user_name"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    id="user_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nama Anda"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="user_email"
                  className="block font-caption-medium text-caption-medium text-on-surface flex items-center justify-between"
                >
                  <span>Alamat Email</span>
                  <span className="font-label-sm text-[10px] text-primary bg-primary-fixed px-1.5 py-0.2 rounded">
                    Terverifikasi
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    id="user_email"
                    value={email}
                    disabled
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-surface-container-highest bg-surface-container-high/40 text-on-surface-variant cursor-not-allowed text-caption-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-space-xs">
              <button
                type="submit"
                disabled={profileLoading}
                className="h-10 px-space-lg rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-medium text-body-medium flex items-center gap-2 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {profileLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>{profileLoading ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* 2. Keamanan & Ganti Kata Sandi */}
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest relative overflow-hidden">
          <div className="flex items-center gap-space-xs pb-space-md border-b border-surface-container-low mb-space-md">
            <span className="material-symbols-outlined text-secondary text-2xl leading-none">
              lock
            </span>
            <div>
              <h2 className="font-headline-h2 text-headline-h2 text-on-surface">
                Keamanan &amp; Kata Sandi
              </h2>
              <p className="font-caption text-caption text-on-surface-variant">
                Perbarui kata sandi untuk melindungi akses portofolio tabungan.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="mb-space-md p-space-sm rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-caption-medium text-caption-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-space-md p-space-sm rounded-xl bg-error-container text-on-error-container font-caption-medium text-caption-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-error shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="space-y-1.5">
                <label
                  htmlFor="new_password"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Lock size={15} />
                  </span>
                  <input
                    type="password"
                    id="new_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm_password"
                  className="block font-caption-medium text-caption-medium text-on-surface"
                >
                  Ulangi Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Shield size={15} />
                  </span>
                  <input
                    type="password"
                    id="confirm_password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Konfirmasi kata sandi"
                    className="w-full h-11 pl-9 pr-3.5 rounded-lg border border-surface-container-highest bg-surface-container-low text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest text-caption-medium transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-space-xs">
              <button
                type="submit"
                disabled={passwordLoading}
                className="h-10 px-space-lg rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface font-body-medium text-body-medium flex items-center gap-2 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                {passwordLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-base leading-none">vpn_key</span>
                )}
                <span>{passwordLoading ? 'Memperbarui...' : 'Perbarui Kata Sandi'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Kolom Kanan: Tampilan, Notifikasi & Logout (5 Kolom) */}
      <div className="lg:col-span-5 flex flex-col gap-space-lg">
        {/* 3. Tampilan Antarmuka */}
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-xs pb-space-xs border-b border-surface-container-low">
            <span className="material-symbols-outlined text-secondary text-2xl leading-none">
              palette
            </span>
            <div>
              <h2 className="font-headline-h3 text-headline-h3 text-on-surface">
                Tema Antarmuka
              </h2>
              <p className="font-caption text-caption text-on-surface-variant">
                Sesuaikan kenyamanan visual layar Anda.
              </p>
            </div>
          </div>
          <div className="pt-space-xs flex justify-between items-center">
            <span className="font-body-medium text-body-medium text-on-surface">Mode Tampilan</span>
            <ThemeToggle />
          </div>
        </section>

        {/* 4. Preferensi Notifikasi */}
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-surface-container-highest flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-low">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-tertiary text-2xl leading-none">
                notifications_active
              </span>
              <div>
                <h2 className="font-headline-h3 text-headline-h3 text-on-surface">
                  Pemberitahuan
                </h2>
                <p className="font-caption text-caption text-on-surface-variant">
                  Atur alert dan pengingat finansial Anda.
                </p>
              </div>
            </div>
            {notifSuccess && (
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm flex items-center gap-1">
                <Check size={11} /> Tersimpan
              </span>
            )}
          </div>

          <div className="flex flex-col divide-y divide-surface-container-low pt-space-2xs">
            {/* Toggle 1 */}
            <div className="py-space-sm flex items-center justify-between gap-space-sm">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                  Setoran Kas Bersama
                </span>
                <span className="font-caption text-caption text-on-surface-variant leading-tight">
                  Alert saat anggota mencatat setoran baru.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={groupAlerts}
                onClick={() => {
                  const next = !groupAlerts;
                  setGroupAlerts(next);
                  handleSaveNotifications({
                    emailNotifications: targetReminders,
                    groupAlerts: next,
                    budgetWarnings,
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                  groupAlerts ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    groupAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="py-space-sm flex items-center justify-between gap-space-sm">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                  Pengingat Target Tabungan
                </span>
                <span className="font-caption text-caption text-on-surface-variant leading-tight">
                  Pengingat berkala sebelum tanggal target.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={targetReminders}
                onClick={() => {
                  const next = !targetReminders;
                  setTargetReminders(next);
                  handleSaveNotifications({
                    emailNotifications: next,
                    groupAlerts,
                    budgetWarnings,
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                  targetReminders ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    targetReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="py-space-sm flex items-center justify-between gap-space-sm">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-body-medium text-body-medium font-semibold text-on-surface">
                  Peringatan Plafon 50%
                </span>
                <span className="font-caption text-caption text-on-surface-variant leading-tight">
                  Peringatan dini saat pengeluaran melebihi 50%.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={budgetWarnings}
                onClick={() => {
                  const next = !budgetWarnings;
                  setBudgetWarnings(next);
                  handleSaveNotifications({
                    emailNotifications: targetReminders,
                    groupAlerts,
                    budgetWarnings: next,
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary ${
                  budgetWarnings ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    budgetWarnings ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 5. Keluar Akun */}
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div>
            <span className="font-headline-h3 text-headline-h3 text-error block">
              Sesi Akun
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              Keluar dan akhiri sesi login Anda pada perangkat ini.
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="h-10 px-space-md rounded-lg border border-error text-error hover:bg-error-container/40 font-body-medium text-body-medium flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={16} />
              <span>Keluar Akun</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
