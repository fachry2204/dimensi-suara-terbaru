"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { Music4, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { assetUrl } from '@/utils/url';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Token reset password tidak ditemukan di URL. Silakan minta link reset password yang baru.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah password');
      }

      setSuccess(data.message || 'Password berhasil diubah.');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 mt-6">
        <div className="bg-[#f0fdf4] text-[#16a34a] text-sm p-4 rounded-xl flex flex-col items-center text-center gap-2.5 border border-[#bbf7d0]">
          <CheckCircle2 size={36} className="text-[#16a34a]" />
          <p className="font-semibold text-base">Berhasil!</p>
          <p className="text-sm font-medium leading-relaxed">{success}</p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full h-12 rounded-xl font-bold text-white bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-lg shadow-[#8b5cf6]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-sm"
        >
          Kembali ke Login
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      {error && (
        <div className="bg-[#fff1f0] text-[#ff5c5c] text-sm p-3 rounded-xl flex items-start gap-2 border border-[#ffd7d7]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="font-medium text-xs leading-relaxed">{error}</span>
        </div>
      )}

      {!token ? (
        <div className="bg-[#fff1f0] text-[#ff5c5c] text-sm p-4 rounded-xl flex flex-col items-center text-center gap-2 border border-[#ffd7d7]">
          <AlertCircle size={32} />
          <p className="font-semibold">Token Tidak Valid</p>
          <p className="text-xs">Link reset password tidak valid atau telah kedaluwarsa. Silakan ajukan permintaan reset password kembali dari halaman login.</p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-2 text-xs font-semibold text-[#8b5cf6] hover:underline"
          >
            Kembali ke Login
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#374557]">Password Baru</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a5afbd] group-focus-within:text-[#8b5cf6] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-12 bg-[#f8f8fb] border border-[#edf0f5] rounded-xl focus:outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all text-sm font-medium text-[#1f2937] placeholder:text-[#a5afbd]"
                placeholder="Masukkan password baru"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#a5afbd] hover:text-[#374557] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#374557]">Konfirmasi Password Baru</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a5afbd] group-focus-within:text-[#8b5cf6] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 pl-12 pr-12 bg-[#f8f8fb] border border-[#edf0f5] rounded-xl focus:outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all text-sm font-medium text-[#1f2937] placeholder:text-[#a5afbd]"
                placeholder="Ulangi password baru"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#a5afbd] hover:text-[#374557] transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl font-bold text-white shadow-lg shadow-[#8b5cf6]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-sm mt-2
              ${isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#8b5cf6] hover:bg-[#7c3aed]'}`}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                Simpan Password Baru
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full h-11 mt-1 rounded-xl font-bold text-[#374557] bg-white border border-[#edf0f5] hover:bg-[#f5f3ff] hover:text-[#7c3aed] hover:border-[#ddd6fe] flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-sm"
          >
            Kembali ke Login
          </button>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordScreen() {
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoSrc, setLogoSrc] = useState('');
  const [branding, setBranding] = useState<{
      logo: string | null, 
      login_background: string | null,
      login_footer: string,
  }>({
      logo: null,
      login_background: null,
      login_footer: 'Area CMS Terlindungi. Hanya untuk personel yang berwenang.',
  });

  useEffect(() => {
      fetch('/api/settings/branding', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            setBranding(data?.branding || data);
          })
          .catch(err => console.error("Failed to fetch branding:", err));
  }, []);

  useEffect(() => {
      const rawLogo = branding?.logo || '';
      setLogoFailed(false);
      setLogoSrc(rawLogo ? assetUrl(rawLogo) : '');
  }, [branding]);

  return (
    <div 
        className="h-screen grid grid-cols-1 lg:grid-cols-[minmax(400px,48%)_1fr] bg-[#f7f8fc] relative overflow-hidden"
    >
      <section className="relative z-10 flex h-screen items-center justify-center overflow-hidden bg-white px-6 py-6 lg:px-12 xl:px-16">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          <div className="flex flex-col items-start mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#8b5cf6]/25">
                  <Music4 size={22} />
              </div>
              <span className="text-xl font-extrabold text-[#1f2937]">Dimensi Suara</span>
            </div>
            <h1 className="text-[30px] leading-tight font-extrabold text-[#1f2937] tracking-[-0.01em]">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-[#667085] leading-6">
              Silakan masukkan password baru untuk mengamankan akun Anda kembali.
            </p>
          </div>
          
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
              <span className="text-sm font-semibold text-slate-500">Memuat halaman...</span>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-5 text-center">
            <p className="text-xs text-[#98a2b3]">
              {branding.login_footer}
            </p>
          </div>
        </div>
      </section>

      <section
        className="relative hidden lg:flex h-screen items-center justify-center overflow-hidden bg-[#6418c3] px-12 py-8"
        style={{
          backgroundImage: branding.login_background
            ? `linear-gradient(135deg, rgba(100, 24, 195, 0.88), rgba(255, 107, 107, 0.78)), url(${assetUrl(branding.login_background)})`
            : 'linear-gradient(135deg, #3b0764 0%, #7c3aed 48%, #a855f7 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-white/10" />
        <div className="absolute inset-y-0 left-0 w-28 bg-white/10 skew-x-[-12deg] origin-top-left" />
        <div className="relative z-10 w-full max-w-[560px] text-white">
          {logoSrc && !logoFailed && (
            <div className="mb-6 flex min-h-[64px] items-center">
              <img
                src={logoSrc}
                alt="Logo"
                className="max-h-[72px] max-w-[360px] w-auto object-contain drop-shadow-xl"
                onError={() => setLogoFailed(true)}
              />
            </div>
          )}
          <h2 className="text-[44px] font-extrabold leading-tight tracking-[-0.02em] text-white">
            CMS Distribusi Musik & Publishing
          </h2>
          <p className="mt-4 max-w-[460px] text-base leading-7 text-white/80">
            Kembali amankan akun Anda untuk dapat memantau rilis, royalti, dan data statistik musik Anda.
          </p>
        </div>
      </section>
    </div>
  );
}
