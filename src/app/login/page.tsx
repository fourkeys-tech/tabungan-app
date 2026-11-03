"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";
import { loginAction } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";
  const isResetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(
    isExpired
      ? "Sesi Anda telah berakhir demi keamanan. Silakan masuk kembali."
      : null
  );
  const [info, setInfo] = useState<string | null>(
    isResetSuccess
      ? "Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || loginSuccess) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    // 1. Eksekusi Login via Server Action untuk kontrol cookie & session time
    const res = await loginAction({
      email,
      password,
      rememberMe,
    });

    if (!res.success) {
      setError(res.error || "Email atau kata sandi yang Anda masukkan tidak sesuai.");
      setLoading(false);
      return;
    }

    // 2. Sinkronkan sesi di browser client
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoginSuccess(true);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      {/* Alert Banner Notifikasi */}
      {info && (
        <div
          role="status"
          className="mb-space-md p-space-sm rounded-xl bg-primary-container text-on-primary-container font-caption-medium text-caption-medium flex items-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0 text-primary">
            info
          </span>
          <span>{info}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-space-md p-space-sm rounded-xl bg-error-container text-on-error-container font-caption-medium text-caption-medium flex items-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Direct Form Elements */}
      <form className="space-y-space-md" onSubmit={handleLogin}>
        {/* Email Input */}
        <div className="space-y-space-2xs">
          <label
            className="block font-caption-medium text-caption-medium text-on-surface"
            htmlFor="emailInput"
          >
            Alamat Email
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
              alternate_email
            </span>
            <input
              id="emailInput"
              type="email"
              required
              suppressHydrationWarning
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh: nama@domain.com"
              autoComplete="email"
              className="w-full h-11 pl-10 pr-space-md rounded-xl bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-space-2xs">
          <div className="flex items-center justify-between">
            <label
              className="block font-caption-medium text-caption-medium text-on-surface"
              htmlFor="passwordInput"
            >
              Kata Sandi
            </label>
            <Link
              href="/forgot-password"
              className="font-caption text-caption text-primary hover:text-primary-container font-medium transition-colors"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
              lock
            </span>
            <input
              id="passwordInput"
              type={showPassword ? "text" : "password"}
              required
              suppressHydrationWarning
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi akun"
              autoComplete="current-password"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label="Tampilkan atau sembunyikan kata sandi"
              className="absolute right-space-sm p-1 rounded text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Remember Device Checkbox */}
        <div className="flex items-center justify-between pt-space-2xs">
          <label className="flex items-center gap-space-xs cursor-pointer select-none">
            <input
              type="checkbox"
              suppressHydrationWarning
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary focus:ring-offset-0 bg-surface-container-low accent-primary cursor-pointer"
            />
            <span className="font-caption text-caption text-on-surface">
              Ingat sesi di perangkat ini (Maks. 10 jam)
            </span>
          </label>
        </div>

        {/* Primary Submit CTA */}
        <button
          id="submitBtn"
          type="submit"
          suppressHydrationWarning
          disabled={loading || loginSuccess}
          className="group w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container hover:from-primary-container hover:to-primary text-on-primary font-headline-h3 text-headline-h3 flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
        >
          {loginSuccess ? (
            <>
              <span className="material-symbols-outlined text-[20px]">
                check_circle
              </span>
              <span>Berhasil Masuk...</span>
            </>
          ) : loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
              <span>Memverifikasi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </>
          )}
        </button>

        {/* Daftar Akun Baru CTA */}
        <div className="mt-space-md pt-space-sm text-center border-t border-surface-container">
          <p className="font-caption text-caption text-on-surface-variant">
            Belum memiliki akun TabungKu?{" "}
            <Link
              href="/register"
              className="font-caption-medium text-caption-medium text-primary hover:underline ml-1 font-semibold"
            >
              Daftar akun baru
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="bg-surface font-body-default text-on-surface antialiased min-h-screen">
      {/* ========================================================= */}
      {/* HEADER BERSIH TANPA HOVER EFEK                            */}
      {/* ========================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 px-space-md py-space-sm lg:p-space-lg flex justify-between items-center pointer-events-none bg-transparent">
        {/* Sisi Kiri: Brand Logo */}
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-space-xs text-primary group focus:outline-none"
        >
          <div className="w-8 h-8 relative flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo-icon.png"
              alt="TabungKu Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <span className="font-headline-h2 text-headline-h2 text-on-surface lg:text-white tracking-tight group-hover:text-primary lg:group-hover:text-primary-fixed transition-colors">
            TabungKu
          </span>
        </Link>

        {/* Sisi Kanan: Hanya Pengubah Tema Sederhana */}
        <div className="pointer-events-auto flex items-center bg-surface-container-lowest/80 dark:bg-surface-container-lowest/70 backdrop-blur-md p-1 rounded-full border border-outline-variant/30 shadow-sm">
          <button
            type="button"
            suppressHydrationWarning
            onClick={toggleTheme}
            aria-label="Toggle Appearance Mode"
            title={isDark ? "Mode Terang" : "Mode Gelap"}
            className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER LAYOUT DUA KOLOM                           */}
      {/* ========================================================= */}
      <main className="min-h-screen flex flex-col justify-center">
        <div className="w-full flex-1 flex flex-col lg:flex-row">
          {/* ========================================================= */}
          {/* Left Column: Atmospheric Financial Ledger Showcase       */}
          {/* ========================================================= */}
          <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-space-xl overflow-hidden bg-[#0d2019]">
            {/* Background Texture & Gradient */}
            <div className="absolute inset-0 bg-radial from-[#123126] via-[#0d2019] to-[#07130f] opacity-90" />
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />

            {/* Decorative Top Subtitle */}
            <div className="relative z-10 pt-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-fixed font-caption text-caption">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Tata Kelola Kas Mandiri &amp; Komunal Terpadu</span>
              </div>
              <h1 className="font-headline-h1 text-white text-3xl xl:text-4xl font-bold mt-4 tracking-tight leading-tight">
                Pencatatan kas berprinsip amanah, <br />
                <span className="text-primary-fixed">tertib, dan akuntabel.</span>
              </h1>
              <p className="font-body-default text-[#a1baab] mt-3 max-w-md text-sm leading-relaxed">
                Kelola mutasi pribadi atau kolaborasikan pos tabungan bersama keluarga &amp; komunitas dengan verifikasi persetujuan multi-anggota yang transparan.
              </p>
            </div>

            {/* Live Interactive Ledger Mockup Card */}
            <div className="relative z-10 my-8 p-space-md rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-2xl space-y-space-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary-fixed text-[20px]">
                    group
                  </span>
                  <span className="font-caption-medium text-caption-medium text-white">
                    Kas Bersama: Tabungan Liburan ke Bali
                  </span>
                </div>
                <span className="font-label-sm text-label-sm uppercase px-2 py-0.5 rounded-full bg-primary/40 text-primary-fixed">
                  Target: 80%
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-space-xs">
                <div>
                  <span className="font-caption text-caption text-[#8ea797]">
                    Total Saldo Grup
                  </span>
                  <div className="font-currency-body text-headline-h2 text-white tracking-tight">
                    Rp 24.000.000{" "}
                    <span className="font-caption text-caption text-[#8ea797]">
                      / 30 Jt
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-caption text-caption text-[#8ea797]">
                    Aturan Penarikan
                  </span>
                  <div className="font-currency-body text-currency-body text-primary-fixed-dim">
                    Multi-Sig (2 dari 3 Persetujuan)
                  </div>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full mt-space-sm pt-space-xs">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-primary-fixed transition-all duration-1000 ease-out"
                    style={{ width: "80%" }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-[11px] font-caption text-[#8ea797]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-fixed" />{" "}
                    Budi Santoso, Rina Suryani &amp; Anggota
                  </span>
                  <span>Void &amp; Audit Trail Tersimpan</span>
                </div>
              </div>
            </div>

            {/* Feature Capabilities Highlight Modules */}
            <div className="relative z-10 space-y-space-xs pb-space-md">
              <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                <div className="w-2.5 h-2.5 rounded-full bg-[#94f7b2] shadow-[0_0_10px_#94f7b2]" />
                <span className="font-caption-medium text-caption-medium text-white">
                  Pemisahan mutasi Pribadi (Pemasukan/Pengeluaran) dan Kas Bersama (Setoran/Tarik)
                </span>
              </div>
              <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                <div className="w-2.5 h-2.5 rounded-full bg-[#95f1ff] shadow-[0_0_10px_#95f1ff]" />
                <span className="font-caption-medium text-caption-medium text-white">
                  Persetujuan penarikan berjenjang &amp; pembatalan (void) transaksi transparan
                </span>
              </div>
              <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffb95f] shadow-[0_0_10px_#ffb95f]" />
                <span className="font-caption-medium text-caption-medium text-white">
                  Ekspor laporan Rekening Koran PDF &amp; CSV kompatibel perbankan
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* Right Column: Direct Email & Password Form                */}
          {/* ========================================================= */}
          <div className="w-full min-h-screen lg:min-h-0 lg:w-[52%] xl:w-[55%] bg-surface flex flex-col justify-center items-center p-space-md sm:p-space-lg lg:p-space-xl relative pt-24 pb-space-xl lg:pt-space-xl">
            {/* Ambient Background Lighting (Subtle) */}
            <div className="absolute top-12 right-12 w-72 h-72 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-12 w-64 h-64 rounded-full bg-surface-container/70 blur-3xl pointer-events-none" />

            {/* Main Login Portal Card */}
            <div className="w-full max-w-[460px] bg-surface-container-lowest rounded-[24px] p-space-lg sm:p-space-xl shadow-[0_12px_40px_-8px_rgba(18,28,38,0.08)] relative z-20 transition-all">
              {/* Header Subtitle / Overline */}
              <div className="mb-space-lg">
                <span className="font-label-sm text-label-sm tracking-wider uppercase text-primary font-bold">
                  AKSES PORTAL TABUNGKU
                </span>
                <h2 className="font-headline-h1 text-headline-h1 text-on-surface mt-space-2xs tracking-tight">
                  Masuk ke Dashboard
                </h2>
                <p className="font-caption text-caption text-on-surface-variant mt-space-2xs">
                  Kelola saldo personal, tabungan bersama, dan verifikasi persetujuan transaksi Anda.
                </p>
              </div>

              {/* Login Form wrapped in Suspense for useSearchParams */}
              <Suspense
                fallback={
                  <div className="py-12 flex justify-center">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                      progress_activity
                    </span>
                  </div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
