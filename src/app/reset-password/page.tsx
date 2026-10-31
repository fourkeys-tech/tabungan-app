"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";
import { updatePasswordAction } from "@/app/actions/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Tunggu auth listener jika event PASSWORD_RECOVERY sedang diproses
          const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (event === "PASSWORD_RECOVERY" || session) {
                setHasValidSession(true);
                setVerifyingSession(false);
              }
            }
          );

          // Timeout 2 detik jika tetap tidak ada sesi pemulihan
          setTimeout(() => {
            setVerifyingSession(false);
          }, 2000);

          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        setError("Gagal memvalidasi sesi pemulihan.");
      } finally {
        setVerifyingSession(false);
      }
    }

    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError(null);

    if (password.length < 6) {
      setError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    setLoading(true);

    try {
      // 1. Coba update via browser client terlebih dahulu
      const { error: clientError } = await supabase.auth.updateUser({
        password,
      });

      if (clientError) {
        // Fallback ke Server Action
        const res = await updatePasswordAction({ password });
        if (!res.success) {
          setError(res.error || "Gagal memperbarui kata sandi.");
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
      // Auto logout agar user masuk dengan kata sandi baru secara bersih
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan kata sandi baru.");
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">
          progress_activity
        </span>
        <p className="text-sm text-on-surface-variant font-caption-medium">
          Memverifikasi tautan keamanan pemulihan...
        </p>
      </div>
    );
  }

  if (!hasValidSession && !success) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-2xl">link_off</span>
        </div>
        <h3 className="font-headline-h2 text-headline-h2 text-on-surface">
          Tautan Kedaluwarsa atau Tidak Valid
        </h3>
        <p className="font-caption text-caption text-on-surface-variant max-w-sm mx-auto">
          Tautan pemulihan kata sandi ini mungkin sudah pernah digunakan atau batas waktunya telah habis.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-colors"
          >
            Minta Tautan Pemulihan Baru
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
        </div>
        <h3 className="font-headline-h2 text-headline-h2 text-on-surface">
          Kata Sandi Berhasil Diperbarui!
        </h3>
        <p className="font-caption text-caption text-on-surface-variant max-w-sm mx-auto">
          Kata sandi akun Anda telah berhasil diubah. Mengalihkan Anda ke halaman masuk dashboard...
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-colors"
          >
            Masuk Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-space-md" onSubmit={handleSubmit}>
      {error && (
        <div
          role="alert"
          className="p-space-sm rounded-xl bg-error-container text-on-error-container font-caption-medium text-caption-medium flex items-center gap-space-xs"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Password Baru */}
      <div className="space-y-space-2xs">
        <label
          className="block font-caption-medium text-caption-medium text-on-surface"
          htmlFor="newPassword"
        >
          Kata Sandi Baru (Minimal 6 Karakter)
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
            lock
          </span>
          <input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      {/* Konfirmasi Password */}
      <div className="space-y-space-2xs">
        <label
          className="block font-caption-medium text-caption-medium text-on-surface"
          htmlFor="confirmPassword"
        >
          Ulangi Kata Sandi Baru
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-space-sm text-[18px] text-on-surface-variant pointer-events-none">
            verified
          </span>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            minLength={6}
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
            <span>Perbarui Kata Sandi</span>
            <span className="material-symbols-outlined text-[18px]">
              check
            </span>
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <div className="bg-surface font-body-default text-on-surface antialiased min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 px-space-md py-space-sm lg:p-space-lg flex justify-between items-center pointer-events-none bg-transparent">
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

      <main className="min-h-screen flex flex-col justify-center items-center p-space-md sm:p-space-lg lg:p-space-xl relative pt-24 pb-space-xl">
        <div className="absolute top-12 right-12 w-72 h-72 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-12 w-64 h-64 rounded-full bg-surface-container/70 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[460px] bg-surface-container-lowest rounded-[24px] p-space-lg sm:p-space-xl shadow-[0_12px_40px_-8px_rgba(18,28,38,0.08)] relative z-20 transition-all">
          <div className="mb-space-lg">
            <span className="font-label-sm text-label-sm tracking-wider uppercase text-primary font-bold">
              KEAMANAN AKUN
            </span>
            <h2 className="font-headline-h1 text-headline-h1 text-on-surface mt-space-2xs tracking-tight">
              Atur Kata Sandi Baru
            </h2>
            <p className="font-caption text-caption text-on-surface-variant mt-space-2xs">
              Buat kata sandi baru yang kuat dan unik untuk akun TabungKu Anda.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-12 flex justify-center">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                  progress_activity
                </span>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

