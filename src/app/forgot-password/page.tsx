"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { directResetPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    setLoading(true);

    try {
      const res = await directResetPasswordAction({
        email,
        newPassword,
      });

      if (!res.success) {
        setError(res.error || "Gagal memperbarui kata sandi.");
      } else {
        setSuccessMessage(
          res.message || "Kata sandi berhasil diperbarui! Mengalihkan ke halaman masuk..."
        );
        setTimeout(() => {
          router.push("/login?reset=success");
        }, 2200);
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan sistem yang tidak terduga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body-default text-on-surface antialiased min-h-screen">
      {/* ========================================================= */}
      {/* HEADER BERSIH                                             */}
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

        {/* Sisi Kanan: Pengubah Tema */}
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
          {/* Sisi Kiri: Brand Showcase & Keamanan Akun                 */}
          {/* ========================================================= */}
          <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-space-xl overflow-hidden bg-[#0d2019]">
            {/* Background Texture & Gradient */}
            <div className="absolute inset-0 bg-radial from-[#123126] via-[#0d2019] to-[#07130f] opacity-90" />
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />

            {/* Konten Atas */}
            <div className="relative z-10 pt-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-fixed font-caption text-caption">
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                <span>Pemulihan Kata Sandi Akun Mandiri</span>
              </div>
              <h1 className="font-headline-h1 text-white text-3xl xl:text-4xl font-bold mt-4 tracking-tight leading-tight">
                Atur ulang kata sandi <br />
                <span className="text-primary-fixed">langsung &amp; aman.</span>
              </h1>
              <p className="font-body-default text-[#a1baab] mt-3 max-w-md text-sm leading-relaxed">
                Cukup masukkan alamat email akun Anda dan tentukan kata sandi baru untuk segera melanjutkan pengelolaan tabungan Anda.
              </p>
            </div>

            {/* Kartu Petunjuk Keamanan */}
            <div className="relative z-10 my-8 p-space-md rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-white font-caption-medium text-caption-medium">
                <span className="material-symbols-outlined text-secondary-fixed text-[18px]">verified_user</span>
                <span>Petunjuk Pembaruan Sandi</span>
              </div>
              <ul className="text-xs text-[#a1baab] space-y-2 list-disc list-inside">
                <li>Gunakan kata sandi unik minimal 6 karakter.</li>
                <li>Setelah kata sandi diperbarui, Anda dapat langsung masuk dengan kata sandi baru.</li>
                <li>Jaga kerahasiaan kata sandi Anda dan jangan berikan kepada pihak lain.</li>
              </ul>
            </div>

            {/* Footer Sisi Kiri */}
            <div className="relative z-10 text-xs text-[#8ea797]">
              TabungKu v2.1 • Solusi Finansial Amanah &amp; Terbuka
            </div>
          </div>

          {/* ========================================================= */}
          {/* Sisi Kanan: Form Reset Kata Sandi Langsung                */}
          {/* ========================================================= */}
          <div className="w-full min-h-screen lg:min-h-0 lg:w-[52%] xl:w-[55%] bg-surface flex flex-col justify-center items-center p-space-md sm:p-space-lg lg:p-space-xl relative pt-24 pb-space-xl lg:pt-space-xl">
            {/* Ambient Lighting */}
            <div className="absolute top-12 right-12 w-72 h-72 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 left-12 w-64 h-64 rounded-full bg-surface-container/70 blur-3xl pointer-events-none" />

            {/* Card Form */}
            <div className="w-full max-w-[460px] bg-surface-container-lowest rounded-[24px] p-space-lg sm:p-space-xl shadow-[0_12px_40px_-8px_rgba(18,28,38,0.08)] relative z-20 transition-all">
              {/* Back to Login link */}
              <div className="mb-space-md">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-caption-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Kembali ke Halaman Masuk</span>
                </Link>
              </div>

              {/* Title Header */}
              <div className="mb-space-lg">
                <span className="font-label-sm text-label-sm tracking-wider uppercase text-primary font-bold">
                  BANTUAN MASUK AKUN
                </span>
                <h2 className="font-headline-h1 text-headline-h1 text-on-surface mt-space-2xs tracking-tight">
                  Atur Ulang Kata Sandi
                </h2>
                <p className="font-caption text-caption text-on-surface-variant mt-space-2xs">
                  Masukkan email akun yang terdaftar dan tentukan kata sandi baru Anda.
                </p>
              </div>

              {/* Error Alert */}
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

              {/* Success Alert */}
              {successMessage ? (
                <div className="space-y-space-md">
                  <div className="p-space-md rounded-xl bg-primary-container text-on-primary-container flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-caption-medium text-caption-medium">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                      <span>Kata Sandi Berhasil Diperbarui</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-95">
                      {successMessage}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="w-full h-11 rounded-xl bg-primary text-on-primary text-sm font-medium flex items-center justify-center transition-all hover:bg-primary-container"
                    >
                      Masuk ke Dashboard Sekarang
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="space-y-space-md" onSubmit={handleSubmit}>
                  {/* Email Input */}
                  <div className="space-y-space-2xs">
                    <label
                      className="block font-caption-medium text-caption-medium text-on-surface"
                      htmlFor="forgotEmailInput"
                    >
                      Alamat Email Terdaftar
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
                        alternate_email
                      </span>
                      <input
                        id="forgotEmailInput"
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

                  {/* Kata Sandi Baru */}
                  <div className="space-y-space-2xs">
                    <label
                      className="block font-caption-medium text-caption-medium text-on-surface"
                      htmlFor="newPasswordInput"
                    >
                      Kata Sandi Baru (Minimal 6 Karakter)
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
                        lock
                      </span>
                      <input
                        id="newPasswordInput"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        suppressHydrationWarning
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ketik kata sandi baru"
                        autoComplete="new-password"
                        className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                      />
                      <button
                        type="button"
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

                  {/* Konfirmasi Kata Sandi Baru */}
                  <div className="space-y-space-2xs">
                    <label
                      className="block font-caption-medium text-caption-medium text-on-surface"
                      htmlFor="confirmPasswordInput"
                    >
                      Ulangi Kata Sandi Baru
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
                        verified
                      </span>
                      <input
                        id="confirmPasswordInput"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        suppressHydrationWarning
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru"
                        autoComplete="new-password"
                        className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-low text-on-surface font-body-default text-body-default placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label="Tampilkan atau sembunyikan kata sandi"
                        className="absolute right-space-sm p-1 rounded text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-container hover:from-primary-container hover:to-primary text-on-primary font-headline-h3 text-headline-h3 flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">
                          progress_activity
                        </span>
                        <span>Menyimpan Kata Sandi...</span>
                      </>
                    ) : (
                      <>
                        <span>Simpan Kata Sandi Baru</span>
                        <span className="material-symbols-outlined text-[18px]">
                          check
                        </span>
                      </>
                    )}
                  </button>

                  {/* Footnote Link */}
                  <div className="pt-space-xs text-center">
                    <p className="font-caption text-caption text-on-surface-variant">
                      Sudah ingat kata sandi Anda?{" "}
                      <Link
                        href="/login"
                        className="text-primary hover:text-primary-container font-caption-medium text-caption-medium underline underline-offset-4 transition-colors"
                      >
                        Masuk ke akun Anda
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
