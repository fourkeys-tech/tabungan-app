"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";

function formatRupiah(num: number): string {
  const rounded = Math.round(num);
  return "Rp " + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function LandingPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Interactive Simulator State (matching business features)
  const [isShared, setIsShared] = useState(false);
  const [targetAmount, setTargetAmount] = useState(20000000);
  const [durationMonths, setDurationMonths] = useState<6 | 12 | 24>(12);
  const [membersCount, setMembersCount] = useState(4);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Check user session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const isDark = !mounted || resolvedTheme === "dark";

  const perMonthTotal = targetAmount / durationMonths;
  const perPersonMonthly = isShared ? perMonthTotal / membersCount : perMonthTotal;
  const perPersonDaily = perPersonMonthly / 30;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] dark:bg-forest-deep text-[#121c26] dark:text-[#f0f4f1] font-sans antialiased selection:bg-emerald-800 selection:text-white transition-colors duration-300">
      {/* ========================================================= */}
      {/* 1. HEADER MINIMALIS & ELEGAN DENGAN HOVER TRANSPARAN      */}
      {/* ========================================================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ease-out ${isScrolled
          ? "bg-[#f8f6f0]/80 hover:bg-[#f8f6f0]/95 dark:bg-[#08150f]/75 dark:hover:bg-[#08150f]/90 backdrop-blur-xl border-b border-[#0a2618]/10 hover:border-emerald-700/25 dark:border-white/10 dark:hover:border-emerald-400/25 shadow-[0_10px_30px_rgba(10,38,24,0.08)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]"
          : "bg-gradient-to-b from-[#f8f6f0]/75 via-[#f8f6f0]/25 to-transparent hover:bg-[#f8f6f0]/75 dark:from-[#08150f]/60 dark:via-[#08150f]/20 dark:to-transparent dark:hover:bg-[#08150f]/65 hover:backdrop-blur-xl border-b border-transparent hover:border-[#0a2618]/10 dark:hover:border-white/15 hover:shadow-[0_12px_40px_rgba(10,38,24,0.08)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          }`}
      >
        <div
          className={`max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-14 flex items-center justify-between transition-all duration-300 ${isScrolled ? "h-20" : "h-24"
            }`}
        >
          {/* Sisi Kiri: Brand Typography Anggun & Bersih dengan Hover Transparan */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 no-underline px-3.5 py-1.5 -ml-3.5 rounded-full border border-transparent hover:border-[#0a2618]/10 dark:hover:border-white/10 hover:bg-[#0a2618]/[0.05] dark:hover:bg-white/[0.06] hover:backdrop-blur-md transition-all duration-300"
          >
            <span className="font-serif-brand font-semibold text-2xl sm:text-[28px] tracking-tight text-[#0a2618] dark:text-white group-hover:text-[#006837] dark:group-hover:text-emerald-200 transition-colors">
              TabungKu
            </span>
          </Link>

          {/* Navigasi Tengah: Kapsul Transparan Halus (Desktop) */}
          <nav
            aria-label="Navigasi bagian halaman"
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full bg-[#0a2618]/[0.04] hover:bg-[#0a2618]/[0.07] dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-[#0a2618]/10 hover:border-[#0a2618]/20 dark:border-white/[0.07] dark:hover:border-white/15 backdrop-blur-md transition-all duration-300"
          >
            <a
              href="#alur-bisnis"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#0a2618]/75 hover:text-[#0a2618] hover:bg-white/80 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
            >
              Alur Bisnis
            </a>
            <a
              href="#tata-kelola"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#0a2618]/75 hover:text-[#0a2618] hover:bg-white/80 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
            >
              Fitur Dashboard
            </a>
            <a
              href="#buku-kas-hidup"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#0a2618]/75 hover:text-[#0a2618] hover:bg-white/80 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
            >
              Kas Bersama &amp; Multi-Sig
            </a>
            <a
              href="#simulator"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#0a2618]/75 hover:text-[#0a2618] hover:bg-white/80 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
            >
              Simulasi
            </a>
            <a
              href="#kata-mereka"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#0a2618]/75 hover:text-[#0a2618] hover:bg-white/80 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-all duration-200"
            >
              Audit Trail
            </a>
          </nav>

          {/* Sisi Kanan: Toggle Tema & Autentikasi Dinamis */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={toggleTheme}
              aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
              title={isDark ? "Mode Terang" : "Mode Gelap"}
              className="w-9 h-9 rounded-full border border-[#0a2618]/20 hover:border-[#006837]/50 dark:border-white/20 dark:hover:border-emerald-300/50 bg-white/70 hover:bg-white dark:bg-white/[0.04] dark:hover:bg-white/15 backdrop-blur-md flex items-center justify-center text-[#0a2618] dark:text-white/80 dark:hover:text-white transition-all duration-300 hover:scale-105 shadow-sm dark:shadow-none hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {/* Jika User Sudah Login: Tombol Dashboard Saja */}
            {mounted && isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium bg-[#0a2618] text-white hover:bg-[#006837] dark:bg-white dark:text-[#0e1c15] dark:hover:bg-emerald-50/95 px-5 py-2.5 rounded-full border border-[#0a2618] dark:border-white/50 transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,104,55,0.25)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-95 group"
              >
                <span>Buka Dashboard</span>
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
                  dashboard
                </span>
              </Link>
            ) : (
              /* Jika User Belum Login: Masuk & Daftar */
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#0a2618]/85 hover:text-[#0a2618] dark:text-white/85 dark:hover:text-white px-4 py-2 rounded-full border border-transparent hover:border-[#0a2618]/15 dark:hover:border-white/15 hover:bg-[#0a2618]/[0.06] dark:hover:bg-white/10 hover:backdrop-blur-md transition-all duration-200"
                >
                  Masuk
                </Link>

                <Link
                  href="/register"
                  className="text-sm font-medium bg-[#0a2618] text-white hover:bg-[#006837] dark:bg-white dark:text-[#0e1c15] dark:hover:bg-emerald-50/95 px-4 sm:px-5 py-2 rounded-full border border-[#0a2618] dark:border-white/50 transition-all duration-200 hover:shadow-[0_6px_20px_rgba(0,104,55,0.25)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] active:scale-95"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* ========================================================= */}
        {/* 2. HERO SECTION ATMOSFERIK & EDITORIAL                     */}
        {/* ========================================================= */}
        <section className="relative min-h-[92vh] lg:min-h-screen flex flex-col justify-end pb-20 sm:pb-24 lg:pb-28 pt-32 px-6 sm:px-10 lg:px-14 overflow-hidden">
          {/* Sinematik Background Mood & Deep Emerald / Warm Cream Atmosphere */}
          <div className="absolute inset-0 z-0">
            <img
              alt="Buku kas terbuka di meja kayu dengan pencahayaan hangat dan tenang"
              className="w-full h-full object-cover object-center filter brightness-[0.9] contrast-[1.02] saturate-[0.85] dark:brightness-[0.45] dark:contrast-[1.1] dark:saturate-[0.85] scale-[1.02] transition-all duration-500"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDC8a6572jF4zXu6En2Wmlp8Ehz_JbBvlkf1et1AKiFNnnGjAGliiNuZgYU_7wiILyDg-44oxvt9Z2hv8ExlOMiwgtiKmzhcZ9lM3sAahvQ4KrUX2cLG9qSvqrSi7uLzYJ3Th3YCC6pD9-b3_mWGf24-s1KOsJy7Gk1yVSMcU0CHZNQcbHyY-PXpxvQvZsIaZMsgxKvvGNQoWEhd7cNxOISakmEz_we79gterv9J13Rl0PKb_ooWY2edg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8f6f0] via-[#f8f6f0]/85 to-[#f8f6f0]/35 dark:from-forest-deep dark:via-forest-deep/80 dark:to-transparent transition-colors duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f8f6f0]/95 via-[#f8f6f0]/80 to-[#f8f6f0]/25 dark:from-forest-deep/95 dark:via-forest-deep/75 dark:to-transparent transition-colors duration-500" />
            <div className="absolute inset-0 bg-emerald-950/5 dark:bg-[#061810]/60 mix-blend-multiply transition-colors duration-500" />
          </div>

          {/* Hero Editorial Content Container */}
          <div className="relative z-10 max-w-[1400px] w-full mx-auto">
            <div className="max-w-2xl lg:max-w-3xl flex flex-col gap-6">
              {/* Brand Big Wordmark Title */}
              <h1 className="font-display-title text-6xl sm:text-7xl lg:text-[90px] text-[#0a2618] dark:text-white font-normal tracking-tight leading-[0.95]">
                TabungKu
              </h1>

              {/* Editorial Subheading */}
              <p className="font-sans text-2xl sm:text-3xl lg:text-[34px] font-semibold text-[#121c26] dark:text-white tracking-tight leading-snug lg:leading-tight">
                Tata kelola tabungan pribadi &amp; kas bersama terverifikasi — persetujuan multi-signature tanpa drama.
              </p>

              {/* Descriptive Subtitle disesuaikan dengan Bisnis Proses Dashboard */}
              <p className="font-sans text-base sm:text-lg text-[#3f4940] dark:text-white/70 max-w-xl font-normal leading-relaxed -mt-1">
                Catat mutasi personal, setoran patungan kas bersama, pembatalan (void) transaksi transparan, serta ekspor Rekening Koran PDF &amp; CSV resmi.
              </p>

              {/* Call To Action Buttons (Dynamic based on login status) */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                {mounted && isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 bg-[#0a2618] hover:bg-[#006837] text-white dark:bg-white dark:hover:bg-emerald-50 dark:text-[#0c1e15] font-medium text-sm sm:text-base px-7 py-3.5 rounded-full transition-all duration-200 shadow-md hover:shadow-xl dark:hover:shadow-white/10 group active:scale-95"
                  >
                    <span>Buka Dashboard TabungKu</span>
                    <span className="transition-transform group-hover:translate-x-1 font-sans">→</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 bg-[#0a2618] hover:bg-[#006837] text-white dark:bg-white dark:hover:bg-emerald-50 dark:text-[#0c1e15] font-medium text-sm sm:text-base px-6 py-3 rounded-full transition-all duration-200 shadow-md hover:shadow-xl dark:hover:shadow-white/10 group active:scale-95"
                    >
                      <span>Mulai sekarang</span>
                      <span className="transition-transform group-hover:translate-x-1 font-sans">→</span>
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center border border-[#0a2618]/25 hover:border-[#0a2618]/60 bg-white/60 hover:bg-white/90 text-[#0a2618] dark:border-white/25 dark:hover:border-white/60 dark:bg-white/5 dark:hover:bg-white/15 backdrop-blur-md dark:text-white font-normal text-sm sm:text-base px-6 py-3 rounded-full transition-all duration-200 active:scale-95"
                    >
                      Masuk ke Dashboard
                    </Link>
                  </>
                )}
              </div>


            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. KONTEN BAWAH: FITUR & ALUR BISNIS RIIL                */}
        {/* ========================================================= */}
        <div className="bg-[#f8f6f0] dark:bg-forest-deep text-[#121c26] dark:text-[#edf3ef] border-t border-[#e5e3dc] dark:border-white/10 transition-colors duration-300">
          {/* Section: Alur Bisnis / The Calm Contrast */}
          <section
            id="alur-bisnis"
            className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 py-20 lg:py-28 scroll-mt-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5 flex flex-col gap-4">
                <span className="text-xs uppercase tracking-widest text-[#006837] dark:text-emerald-400 font-medium">
                  Alur Bisnis Proses
                </span>
                <h2 className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium leading-tight">
                  Pemisahan tegas antara Kas Pribadi dan Tabungan Kas Bersama.
                </h2>
                <p className="text-sm sm:text-base text-[#3f4940] dark:text-white/60 leading-relaxed font-normal">
                  TabungKu memastikan uang pribadi Anda tidak tercampur dengan dana kelompok. Setiap penarikan uang dari kas bersama wajib disetujui bersama secara demokratis melalui sistem persetujuan (approval) berjenjang.
                </p>
              </div>

              {/* Quick Comparison Table/Pillars */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kolom Cara Lama */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-[#e5e3dc] dark:border-white/10 flex flex-col gap-3 shadow-sm dark:shadow-none">
                  <div className="flex items-center justify-between text-xs text-[#3f4940]/70 dark:text-white/40 uppercase tracking-wider">
                    <span>Kas Manual</span>
                    <span className="text-rose-600 dark:text-rose-400/80 font-medium">
                      Rentan Selisih
                    </span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-[#3f4940] dark:text-white/60 pt-2">
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 dark:text-rose-400">✕</span>
                      <span>Satu bendahara memegang kendali tanpa verifikasi anggota lain</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 dark:text-rose-400">✕</span>
                      <span>Transaksi keliru dihapus sembarangan tanpa rekam jejak</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 dark:text-rose-400">✕</span>
                      <span>Bukti transfer tercecer di chat tanpa riwayat terpusat</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 dark:text-rose-400">✕</span>
                      <span>Laporan bulanan butuh waktu berhari-hari untuk dicocokkan</span>
                    </li>
                  </ul>
                </div>

                {/* Kolom Bersama TabungKu */}
                <div className="p-6 rounded-2xl bg-emerald-900/[0.06] dark:bg-emerald-950/40 border border-[#006837]/30 dark:border-emerald-500/30 flex flex-col gap-3 shadow-md dark:shadow-lg dark:shadow-emerald-950/50">
                  <div className="flex items-center justify-between text-xs text-[#006837] dark:text-emerald-400 uppercase tracking-wider font-medium">
                    <span>Sistem TabungKu</span>
                    <span className="text-[#006837] dark:text-emerald-300 font-semibold">
                      100% Transparan
                    </span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-[#0a2618] dark:text-white/90 pt-2">
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#006837] dark:text-emerald-400 font-bold">✓</span>
                      <span>Persetujuan penarikan multi-signature (misal: 2 dari 3 anggota)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#006837] dark:text-emerald-400 font-bold">✓</span>
                      <span>Fitur pembatalan (Void) dengan pencatatan audit log permanen</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#006837] dark:text-emerald-400 font-bold">✓</span>
                      <span>Penyimpanan bukti nota/struk digital terverifikasi di cloud</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#006837] dark:text-emerald-400 font-bold">✓</span>
                      <span>Ekspor laporan PDF Rekening Koran &amp; CSV 15-kolom instan</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section: 4 Pilar Terkurasi Sesuai Dashboard */}
          <section
            id="tata-kelola"
            className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 py-16 border-t border-[#e5e3dc] dark:border-white/10 scroll-mt-20"
          >
            <div className="flex flex-col gap-2 max-w-xl mb-12">
              <span className="text-xs uppercase tracking-widest text-[#006837] dark:text-emerald-400 font-medium">
                Tata Kelola Finansial
              </span>
              <h2 className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium">
                Empat modul utama dalam Dashboard TabungKu.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pilar 1 */}
              <div className="p-7 rounded-2xl bg-white hover:bg-emerald-50/40 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none transition-all duration-300 flex flex-col justify-between group">
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full border border-[#0a2618]/15 dark:border-white/20 flex items-center justify-center text-[#006837] dark:text-emerald-300 group-hover:border-[#006837] dark:group-hover:border-emerald-400 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      account_balance_wallet
                    </span>
                  </div>
                  <h3 className="font-serif-brand text-xl text-[#0a2618] dark:text-white font-medium">
                    Buku Kas Pribadi
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3f4940] dark:text-white/60 leading-relaxed font-normal">
                    Catat pemasukan dan pengeluaran harian, kelola kategori belanja kustom, dan monitor saldo bersih pribadi secara mandiri.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-[#e5e3dc] dark:border-white/5 text-xs text-[#3f4940]/70 dark:text-white/40 flex items-center justify-between">
                  <span>Dompet Mandiri</span>
                  <span className="text-[#3f4940]/40 dark:text-white/20">01</span>
                </div>
              </div>

              {/* Pilar 2 */}
              <div className="p-7 rounded-2xl bg-white hover:bg-emerald-50/40 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none transition-all duration-300 flex flex-col justify-between group">
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full border border-[#0a2618]/15 dark:border-white/20 flex items-center justify-center text-[#006837] dark:text-emerald-300 group-hover:border-[#006837] dark:group-hover:border-emerald-400 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">group</span>
                  </div>
                  <h3 className="font-serif-brand text-xl text-[#0a2618] dark:text-white font-medium">
                    Kas Bersama &amp; Patungan
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3f4940] dark:text-white/60 leading-relaxed font-normal">
                    Buat grup tabungan liburan, kas keluarga, atau arisan. Setiap anggota dapat menyetor dan memantau persentase target grup.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-[#e5e3dc] dark:border-white/5 text-xs text-[#3f4940]/70 dark:text-white/40 flex items-center justify-between">
                  <span>Multi-Signature</span>
                  <span className="text-[#3f4940]/40 dark:text-white/20">02</span>
                </div>
              </div>

              {/* Pilar 3 */}
              <div className="p-7 rounded-2xl bg-white hover:bg-emerald-50/40 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none transition-all duration-300 flex flex-col justify-between group">
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full border border-[#0a2618]/15 dark:border-white/20 flex items-center justify-center text-[#006837] dark:text-emerald-300 group-hover:border-[#006837] dark:group-hover:border-emerald-400 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      rule
                    </span>
                  </div>
                  <h3 className="font-serif-brand text-xl text-[#0a2618] dark:text-white font-medium">
                    Persetujuan &amp; Void Transaksi
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3f4940] dark:text-white/60 leading-relaxed font-normal">
                    Pengajuan penarikan kas bersama harus disetujui anggota berwenang. Pembatalan (void) transaksi salah input tersimpan rapi di log.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-[#e5e3dc] dark:border-white/5 text-xs text-[#3f4940]/70 dark:text-white/40 flex items-center justify-between">
                  <span>Kontrol Ketat</span>
                  <span className="text-[#3f4940]/40 dark:text-white/20">03</span>
                </div>
              </div>

              {/* Pilar 4 */}
              <div className="p-7 rounded-2xl bg-white hover:bg-emerald-50/40 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none transition-all duration-300 flex flex-col justify-between group">
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full border border-[#0a2618]/15 dark:border-white/20 flex items-center justify-center text-[#006837] dark:text-emerald-300 group-hover:border-[#006837] dark:group-hover:border-emerald-400 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  </div>
                  <h3 className="font-serif-brand text-xl text-[#0a2618] dark:text-white font-medium">
                    Ekspor Laporan PDF &amp; CSV
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3f4940] dark:text-white/60 leading-relaxed font-normal">
                    Cetak Rekening Koran resmi berformat PDF lengkap dengan ringkasan mutasi atau unduh data CSV 15-kolom siap olah Excel.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-[#e5e3dc] dark:border-white/5 text-xs text-[#3f4940]/70 dark:text-white/40 flex items-center justify-between">
                  <span>Standar Perbankan</span>
                  <span className="text-[#3f4940]/40 dark:text-white/20">04</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Visual Mockup Showcase / Live Ledger Strip */}
          <section
            id="buku-kas-hidup"
            className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 py-20 border-t border-[#e5e3dc] dark:border-white/10 scroll-mt-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex flex-col gap-5">
                <span className="text-xs uppercase tracking-widest text-[#006837] dark:text-emerald-400 font-medium">
                  Buku Kas Bersama
                </span>
                <h2 className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium leading-snug">
                  Semua anggota memantau saldo yang sama secara real-time.
                </h2>
                <p className="text-sm text-[#3f4940] dark:text-white/60 leading-relaxed">
                  Tidak ada lagi rasa curiga atau saling menunggu bukti transfer di grup obrolan. Setiap setoran langsung terverifikasi ke grup dan penarikan dana wajib mendapat persetujuan multi-signature.
                </p>
                <div className="pt-2">
                  <a
                    href="#simulator"
                    className="inline-flex items-center gap-2 text-sm text-[#006837] hover:text-[#0a2618] dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-4 font-medium transition-colors"
                  >
                    <span>Coba kalkulator simulasi patungan</span>
                    <span>→</span>
                  </a>
                </div>
              </div>

              {/* Visual Live Ledger Card */}
              <div className="lg:col-span-7">
                <div className="rounded-3xl bg-white dark:bg-[#0c1c14] border border-[#e5e3dc] dark:border-white/10 p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-6 border-b border-[#e5e3dc] dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 border border-[#006837]/20 dark:border-emerald-500/30 flex items-center justify-center text-[#006837] dark:text-emerald-300">
                        <span className="material-symbols-outlined text-[20px]">
                          beach_access
                        </span>
                      </div>
                      <div>
                        <h4 className="font-serif-brand text-lg text-[#0a2618] dark:text-white font-medium">
                          Tabungan Liburan ke Bali
                        </h4>
                        <span className="text-xs text-[#3f4940]/70 dark:text-white/50">
                          Grup Kas Bersama • 4 Anggota
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-[#006837] dark:text-emerald-400 border border-[#006837]/20 dark:border-emerald-500/20">
                      Tercapai 80%
                    </span>
                  </div>

                  {/* Main Amount */}
                  <div className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase text-[#3f4940]/60 dark:text-white/40 tracking-wider block">
                        Saldo Kas Bersama Saat Ini
                      </span>
                      <div className="text-3xl sm:text-4xl font-semibold text-[#0a2618] dark:text-white tracking-tight font-serif-brand mt-1">
                        Rp 24.000.000{" "}
                        <span className="text-sm text-[#3f4940]/60 dark:text-white/40 font-sans font-normal">
                          / Rp 30.000.000
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-[#006837] dark:text-emerald-400/90 font-medium">
                      Target Tercapai Bulan Depan
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#e5e3dc] dark:bg-white/10 h-2 rounded-full overflow-hidden mb-6">
                    <div
                      className="bg-[#006837] dark:bg-emerald-400 h-full rounded-full"
                      style={{ width: "80%" }}
                    />
                  </div>

                  {/* Anggota List */}
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-[#f8f6f0] dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-medium flex items-center justify-center text-xs">
                          BS
                        </div>
                        <span className="text-[#121c26] dark:text-white/90">
                          Budi Santoso (Admin Kas)
                        </span>
                      </div>
                      <span className="text-[#006837] dark:text-emerald-400 font-medium">
                        Rp 7.500.000 (Lunas)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#f8f6f0] dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-teal-800 text-white font-medium flex items-center justify-center text-xs">
                          RS
                        </div>
                        <span className="text-[#121c26] dark:text-white/90">Rina Suryani</span>
                      </div>
                      <span className="text-[#006837] dark:text-emerald-400 font-medium">
                        Rp 7.500.000 (Lunas)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#f8f6f0] dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-900 text-amber-200 font-medium flex items-center justify-center text-xs">
                          ST
                        </div>
                        <span className="text-[#121c26] dark:text-white/90">Siti Nurhaliza</span>
                      </div>
                      <span className="text-amber-700 dark:text-amber-300 font-medium">
                        Rp 4.500.000 (Sisa Rp 1,5 jt)
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#e5e3dc] dark:border-white/10 flex items-center justify-between text-xs text-[#3f4940]/70 dark:text-white/50">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#006837] dark:text-emerald-400">
                        gavel
                      </span>
                      Aturan penarikan: Minimal 2 persetujuan dari 3 anggota
                    </span>
                    <span className="text-[#3f4940]/50 dark:text-white/30">Terproteksi RLS</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Interactive Simulator (Clean & Elegant) */}
          <section
            id="simulator"
            className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 py-20 border-t border-[#e5e3dc] dark:border-white/10 scroll-mt-20"
          >
            <div className="max-w-3xl mx-auto rounded-3xl bg-white dark:bg-[#0b1a13] border border-[#e5e3dc] dark:border-white/10 p-8 sm:p-12 shadow-xl">
              <div className="text-center flex flex-col gap-2 mb-10">
                <span className="text-xs uppercase tracking-widest text-[#006837] dark:text-emerald-400 font-medium">
                  Simulasi Tabungan
                </span>
                <h2 className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium">
                  Rencanakan pos simpanan Anda
                </h2>
                <p className="text-xs sm:text-sm text-[#3f4940] dark:text-white/60">
                  Kalkulasikan setoran rutin untuk tabungan mandiri maupun patungan grup.
                </p>
              </div>

              <div className="space-y-6">
                {/* Mode Switcher */}
                <div className="flex p-1 bg-[#f8f6f0] dark:bg-white/5 rounded-full border border-[#e5e3dc] dark:border-white/10 max-w-sm mx-auto">
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setIsShared(false)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer ${!isShared
                      ? "bg-[#0a2618] text-white dark:bg-white dark:text-black shadow-sm"
                      : "text-[#3f4940] hover:text-[#0a2618] dark:text-white/70 dark:hover:text-white"
                      }`}
                  >
                    Tabungan Pribadi
                  </button>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setIsShared(true)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer ${isShared
                      ? "bg-[#0a2618] text-white dark:bg-white dark:text-black shadow-sm"
                      : "text-[#3f4940] hover:text-[#0a2618] dark:text-white/70 dark:hover:text-white"
                      }`}
                  >
                    Kas Bersama / Patungan
                  </button>
                </div>

                {/* Target Slider */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex justify-between items-baseline">
                    <label
                      htmlFor="sim-target-slider"
                      className="text-xs uppercase tracking-wider text-[#3f4940] dark:text-white/60 font-medium"
                    >
                      Target Dana Yang Dituju
                    </label>
                    <span className="font-serif-brand text-2xl text-[#006837] dark:text-emerald-300 font-medium">
                      {formatRupiah(targetAmount)}
                    </span>
                  </div>
                  <input
                    id="sim-target-slider"
                    type="range"
                    suppressHydrationWarning
                    min={3000000}
                    max={100000000}
                    step={1000000}
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Number(e.target.value))}
                    className="w-full accent-[#006837] dark:accent-emerald-400 bg-[#e5e3dc] dark:bg-white/10 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Anggota Group Slider (Hidden on personal) */}
                {isShared && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex justify-between items-baseline">
                      <label
                        htmlFor="sim-members-slider"
                        className="text-xs uppercase tracking-wider text-[#3f4940] dark:text-white/60 font-medium"
                      >
                        Jumlah Anggota Patungan
                      </label>
                      <span className="text-base text-[#006837] dark:text-emerald-300 font-medium">
                        {membersCount} Anggota
                      </span>
                    </div>
                    <input
                      id="sim-members-slider"
                      type="range"
                      suppressHydrationWarning
                      min={2}
                      max={10}
                      step={1}
                      value={membersCount}
                      onChange={(e) => setMembersCount(Number(e.target.value))}
                      className="w-full accent-[#006837] dark:accent-emerald-400 bg-[#e5e3dc] dark:bg-white/10 h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* Durasi Button Row */}
                <div className="flex flex-col gap-2 pt-1">
                  <label className="text-xs uppercase tracking-wider text-[#3f4940] dark:text-white/60 font-medium">
                    Estimasi Periode Capaian
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([6, 12, 24] as const).map((months) => {
                      const active = durationMonths === months;
                      return (
                        <button
                          key={months}
                          type="button"
                          suppressHydrationWarning
                          onClick={() => setDurationMonths(months)}
                          className={`py-2.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer ${active
                            ? "border-[#006837] bg-emerald-50 text-[#006837] dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200 font-medium"
                            : "border-[#e5e3dc] bg-[#f8f6f0] text-[#3f4940] hover:text-[#0a2618] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:text-white"
                            }`}
                        >
                          {months} Bulan
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Result Card */}
                <div className="mt-8 p-6 rounded-2xl bg-[#f8f6f0] dark:bg-white/[0.04] border border-[#e5e3dc] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#3f4940]/70 dark:text-white/50 uppercase tracking-wider block">
                      {isShared
                        ? `Estimasi setoran bulanan per orang (${membersCount} anggota):`
                        : "Estimasi simpanan bulanan personal:"}
                    </span>
                    <div className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium mt-1">
                      {formatRupiah(perPersonMonthly)}
                    </div>
                    <span className="text-xs text-[#006837] dark:text-emerald-400 font-normal mt-1 block">
                      ~ {formatRupiah(perPersonDaily)} / hari
                    </span>
                  </div>
                  <Link
                    href={mounted && isLoggedIn ? "/dashboard" : "/register"}
                    className="inline-flex items-center justify-center gap-2 bg-[#0a2618] hover:bg-[#006837] text-white dark:bg-white dark:hover:bg-emerald-50 dark:text-[#0b1a13] font-medium text-sm px-6 py-3 rounded-full transition-all shrink-0"
                  >
                    <span>{mounted && isLoggedIn ? "Buka Dashboard" : "Mulai Catat Tabungan"}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Testimoni & Audit Trail */}
          <section
            id="kata-mereka"
            className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 py-20 border-t border-[#e5e3dc] dark:border-white/10 scroll-mt-20"
          >
            <div className="max-w-xl mb-12">
              <span className="text-xs uppercase tracking-widest text-[#006837] dark:text-emerald-400 font-medium">
                Audit Trail &amp; Kepercayaan
              </span>
              <h2 className="font-serif-brand text-3xl sm:text-4xl text-[#0a2618] dark:text-white font-medium mt-1">
                Kisah nyata pengguna mengelola kas bersama.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between gap-6">
                <p className="font-serif-brand text-lg text-[#121c26] dark:text-white/90 leading-relaxed italic">
                  “Sistem persetujuan penarikan multi-signature membuat kas arisan keluarga kami sangat aman. Tidak ada lagi kecurigaan karena penarikan butuh konfirmasi bersama.”
                </p>
                <div className="border-t border-[#e5e3dc] dark:border-white/10 pt-4">
                  <span className="block text-sm font-medium text-[#0a2618] dark:text-white">
                    Rina Suryani
                  </span>
                  <span className="text-xs text-[#3f4940]/70 dark:text-white/50">
                    Koordinator Kas Bersama Arisan
                  </span>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between gap-6">
                <p className="font-serif-brand text-lg text-[#121c26] dark:text-white/90 leading-relaxed italic">
                  “Fitur Ekspor Rekening Koran PDF dan file CSV sangat rapi. Kami tinggal mengunduhnya setiap akhir bulan untuk laporan pembukuan kas patungan.”
                </p>
                <div className="border-t border-[#e5e3dc] dark:border-white/10 pt-4">
                  <span className="block text-sm font-medium text-[#0a2618] dark:text-white">
                    Dimas &amp; Anisa
                  </span>
                  <span className="text-xs text-[#3f4940]/70 dark:text-white/50">
                    Tabungan Bersama Target Rumah
                  </span>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-[#e5e3dc] dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between gap-6">
                <p className="font-serif-brand text-lg text-[#121c26] dark:text-white/90 leading-relaxed italic">
                  “Saat ada anggota yang salah memasukkan nominal, fitur Void transaksi dengan alasan audit log memastikan semuanya tercatat transparan tanpa rekayasa.”
                </p>
                <div className="border-t border-[#e5e3dc] dark:border-white/10 pt-4">
                  <span className="block text-sm font-medium text-[#0a2618] dark:text-white">
                    Budi Santoso
                  </span>
                  <span className="text-xs text-[#3f4940]/70 dark:text-white/50">
                    Admin Kas Komunitas Open Trip
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Footer Ringkas, Elegan & Minimalis */}
          <footer className="border-t border-[#e5e3dc] dark:border-white/10 py-16 px-6 sm:px-10 lg:px-14">
            <div className="max-w-[1300px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex flex-col gap-2">
                <span className="font-serif-brand text-2xl text-[#0a2618] dark:text-white font-medium">
                  TabungKu
                </span>
                <p className="text-xs text-[#3f4940]/70 dark:text-white/50 max-w-sm leading-relaxed">
                  Platform manajemen tabungan pribadi dan kas bersama dengan kontrol mutasi, multi-signature, serta ekspor laporan terverifikasi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs text-[#3f4940] dark:text-white/60">
                <a className="hover:text-[#0a2618] dark:hover:text-white transition-colors" href="#alur-bisnis">
                  Alur Bisnis
                </a>
                <a className="hover:text-[#0a2618] dark:hover:text-white transition-colors" href="#tata-kelola">
                  Fitur Dashboard
                </a>
                <a className="hover:text-[#0a2618] dark:hover:text-white transition-colors" href="#buku-kas-hidup">
                  Kas Bersama
                </a>
                <Link className="hover:text-[#0a2618] dark:hover:text-white transition-colors" href={mounted && isLoggedIn ? "/dashboard" : "/login"}>
                  {mounted && isLoggedIn ? "Dashboard" : "Masuk Akun"}
                </Link>
              </div>
            </div>

            <div className="max-w-[1300px] mx-auto pt-10 mt-10 border-t border-[#e5e3dc] dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#3f4940]/60 dark:text-white/40 gap-3">
              <span>
                © 2025 TabungKu Finansial Nusantara. Seluruh hak cipta dilindungi.
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006837] dark:bg-emerald-400" />
                Row-Level Security &amp; Audit Trail Aktif
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
