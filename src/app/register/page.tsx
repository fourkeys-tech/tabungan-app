"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || registerSuccess) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      setError(signUpError.message || "Gagal mendaftar. Silakan periksa kembali data Anda.");
      setLoading(false);
    } else if (data.session) {
      setRegisterSuccess(true);
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi atau langsung coba masuk.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body-default text-on-surface antialiased min-h-screen">
      {/* ========================================================= */}
      {/* HEADER BERSIH TANPA HOVER EFEK                            */}
      {/* ========================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 px-space-md py-space-sm lg:p-space-lg flex justify-between items-center pointer-events-none bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 lg:bg-transparent lg:backdrop-blur-none lg:border-transparent">
        {/* Sisi Kiri: Brand Logo */}
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-space-xs text-primary group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-[0_1px_8px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined text-[20px]">
              account_balance_wallet
            </span>
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

      <main className="w-full min-h-screen bg-surface">
        <div className="flex flex-col w-full">
          <div className="w-full min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-surface">
            {/* ========================================================= */}
            {/* Left Column: Ruang Informasi Portofolio Finansial         */}
            {/* ========================================================= */}
            <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative bg-[#092215] text-[#ecfbf2] p-space-lg md:p-space-xl lg:p-space-2xl flex-col justify-between overflow-hidden shadow-2xl z-10">
              {/* Ambient Lighting Blobs */}
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#16834a]/30 blur-3xl pointer-events-none" />
              <div className="absolute bottom-16 right-[-10%] w-[32rem] h-[32rem] rounded-full bg-[#006874]/25 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-[#004f57]/20 blur-3xl pointer-events-none" />

              {/* Top Section */}
              <div className="relative z-10 pt-space-xl lg:pt-space-2xl space-y-space-lg">
                {/* Floating Pill Tag */}
                <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-white/10 backdrop-blur-md text-primary-fixed shadow-sm">
                  <span
                    className="material-symbols-outlined text-[16px] text-primary-fixed-dim"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  <span className="font-label-sm text-label-sm tracking-wider uppercase font-semibold">
                    Registrasi Portofolio Tabungan Terverifikasi
                  </span>
                </div>

                {/* Brand Identity & Typography */}
                <div className="space-y-space-sm max-w-lg">
                  <h1 className="font-display-lg text-display-lg text-white tracking-tight leading-[1.15]">
                    Mulai Bersama TabungKu
                  </h1>
                  <p className="font-body-lg text-body-lg text-[#b8d6c3] leading-relaxed font-normal">
                    Buka akun mandiri Anda dalam 1 menit. Kelola keuangan harian, bentuk grup tabungan bersama, dan nikmati sistem persetujuan multi-sig yang aman.
                  </p>
                </div>

                {/* Status Sistem Operasional */}
                <div className="inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-xl bg-white/5 backdrop-blur-lg shadow-inner">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-fixed-dim" />
                  </span>
                  <span className="font-caption-medium text-caption-medium text-white">
                    Pemisahan data personal aman dengan Row-Level Security
                  </span>
                </div>
              </div>

              {/* Center Data Visualization / Live Benefits Card */}
              <div className="relative z-10 my-space-xl p-space-md rounded-2xl bg-white/[0.04] backdrop-blur-md shadow-lg hidden sm:block">
                <div className="flex items-center justify-between pb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary-fixed text-[20px]">
                      shield_with_heart
                    </span>
                    <span className="font-caption-medium text-caption-medium text-white">
                      Fasilitas Lengkap Setelah Pendaftaran
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase px-2 py-0.5 rounded-full bg-primary/40 text-primary-fixed">
                    Gratis
                  </span>
                </div>

                <div className="space-y-3 pt-space-xs">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-[#8ea797]">Buku Kas Pribadi</span>
                    <span className="text-white font-medium">Tanpa Biaya Admin</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-[#8ea797]">Grup Kas Bersama</span>
                    <span className="text-primary-fixed-dim font-medium">Multi-Signature Aktif</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-[#8ea797]">Ekspor Laporan Bulanan</span>
                    <span className="text-white font-medium">Rekening Koran PDF &amp; CSV</span>
                  </div>
                </div>

                <div className="w-full mt-space-sm pt-space-xs border-t border-white/10 text-[11px] font-caption text-[#8ea797] flex justify-between">
                  <span>Data terenkripsi 256-bit</span>
                  <span>Siap pakai seketika</span>
                </div>
              </div>

              {/* Feature Capabilities Highlight Modules */}
              <div className="relative z-10 space-y-space-xs pb-space-md">
                <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#94f7b2] shadow-[0_0_10px_#94f7b2]" />
                  <span className="font-caption-medium text-caption-medium text-white">
                    Pencatatan mutasi Pemasukan, Pengeluaran, dan Setoran Kas
                  </span>
                </div>
                <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#95f1ff] shadow-[0_0_10px_#95f1ff]" />
                  <span className="font-caption-medium text-caption-medium text-white">
                    Persetujuan bersama untuk penarikan dana kas patungan
                  </span>
                </div>
                <div className="group flex items-center gap-space-sm p-space-sm rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffb95f] shadow-[0_0_10px_#ffb95f]" />
                  <span className="font-caption-medium text-caption-medium text-white">
                    Fitur Void Transaksi dengan audit trail yang transparan
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* Right Column: Form Pendaftaran Akun Baru                  */}
            {/* ========================================================= */}
            <div className="w-full min-h-screen lg:min-h-0 lg:w-[52%] xl:w-[55%] bg-surface flex flex-col justify-center items-center p-space-md sm:p-space-lg lg:p-space-xl relative pt-24 pb-space-xl lg:pt-space-xl">
              {/* Ambient Background Lighting (Subtle) */}
              <div className="absolute top-12 right-12 w-72 h-72 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />
              <div className="absolute bottom-10 left-12 w-64 h-64 rounded-full bg-surface-container/70 blur-3xl pointer-events-none" />

              {/* Main Registration Card */}
              <div className="w-full max-w-[460px] bg-surface-container-lowest rounded-[24px] p-space-lg sm:p-space-xl shadow-[0_12px_40px_-8px_rgba(18,28,38,0.08)] relative z-20 transition-all">
                {/* Header Subtitle / Overline */}
                <div className="mb-space-lg">
                  <span className="font-label-sm text-label-sm tracking-wider uppercase text-primary font-bold">
                    PENDAFTARAN ANGGOTA BARU
                  </span>
                  <h2 className="font-headline-h1 text-headline-h1 text-on-surface mt-space-2xs tracking-tight">
                    Buat Akun TabungKu
                  </h2>
                  <p className="font-caption text-caption text-on-surface-variant mt-space-2xs">
                    Mulai kelola tabungan pribadi dan kas bersama Anda secara tertib dan transparan.
                  </p>
                </div>

                {/* Error Alert Banner */}
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

                {/* Info Alert Banner */}
                {info && (
                  <div
                    role="status"
                    className="mb-space-md p-space-sm rounded-xl bg-surface-container-high text-primary font-caption-medium text-caption-medium flex items-center gap-space-xs"
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      info
                    </span>
                    <span>{info}</span>
                  </div>
                )}

                {/* Direct Form Elements */}
                <form className="space-y-space-md" onSubmit={handleRegister}>
                  {/* Name Input */}
                  <div className="space-y-space-2xs">
                    <label
                      className="block font-caption-medium text-caption-medium text-on-surface"
                      htmlFor="nameInput"
                    >
                      Nama Lengkap
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
                        person
                      </span>
                      <input
                        id="nameInput"
                        type="text"
                        required
                        suppressHydrationWarning
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap Anda"
                        autoComplete="name"
                        className="w-full h-11 pl-10 pr-space-md rounded-xl bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                      />
                    </div>
                  </div>

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
                    <label
                      className="block font-caption-medium text-caption-medium text-on-surface"
                      htmlFor="passwordInput"
                    >
                      Kata Sandi (Minimal 6 Karakter)
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
                        lock
                      </span>
                      <input
                        id="passwordInput"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        suppressHydrationWarning
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter sandi"
                        autoComplete="new-password"
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

                  {/* Agreement Checkbox */}
                  <div className="flex items-start gap-space-xs pt-space-2xs">
                    <input
                      id="termsCheckbox"
                      type="checkbox"
                      required
                      suppressHydrationWarning
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary focus:ring-offset-0 bg-surface-container-low accent-primary cursor-pointer"
                    />
                    <label
                      htmlFor="termsCheckbox"
                      className="font-caption text-caption text-on-surface-variant cursor-pointer select-none leading-tight"
                    >
                      Saya menyetujui ketentuan privasi serta tata kelola pencatatan kas bersama TabungKu.
                    </label>
                  </div>

                  {/* Primary Submit CTA */}
                  <button
                    id="submitBtn"
                    type="submit"
                    suppressHydrationWarning
                    disabled={loading || registerSuccess}
                    className="group w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container hover:from-primary-container hover:to-primary text-on-primary font-headline-h3 text-headline-h3 flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
                  >
                    {registerSuccess ? (
                      <>
                        <span className="material-symbols-outlined text-[20px]">
                          check_circle
                        </span>
                        <span>Berhasil Terdaftar...</span>
                      </>
                    ) : loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">
                          progress_activity
                        </span>
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftar Akun Sekarang</span>
                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {/* Card Footer */}
                <div className="mt-space-md pt-space-sm text-center border-t border-surface-container">
                  <p className="font-caption text-caption text-on-surface-variant">
                    Sudah memiliki akun TabungKu?
                    <Link
                      href="/login"
                      className="font-caption-medium text-caption-medium text-primary hover:underline ml-1 font-semibold"
                    >
                      Masuk ke akun Anda
                    </Link>
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
