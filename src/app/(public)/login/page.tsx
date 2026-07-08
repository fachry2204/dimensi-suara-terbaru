"use client";


import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Music4, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react';

import { api } from '@/utils/api';
import { assetUrl } from '@/utils/url';

// register mode removed


const ADMIN_DASHBOARD_PATH = '/dashboard-aggregator';


export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoSrc, setLogoSrc] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Use relative path to leverage Vite proxy
        const res = await fetch('/api/health');
        if (res.ok) {
            const data = await res.json();
            setServerStatus(data.status === 'online' ? 'online' : 'offline');
            setDbStatus(data.database);
        } else {
            setServerStatus('offline');
            setDbStatus('unknown');
        }
      } catch (e) {
        setServerStatus('offline');
        setDbStatus('unknown');
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const [statusModalStatus, setStatusModalStatus] = useState<string | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<string | null>(null);

  // Branding State
  const [branding, setBranding] = useState<{
      logo: string | null, 
      login_background: string | null,
      login_title: string,
      login_footer: string,
      login_button_color: string,
      login_form_bg_color: string,
      enable_registration: string,
      login_title_color: string,
      login_footer_color: string,
      login_form_bg_opacity: number,
      login_bg_opacity: number,
      login_glass_effect: string,
      login_form_text_color: string
  }>({
      logo: null,
      login_background: null,
      login_title: 'Agregator & Publishing Musik',
      login_footer: 'Area CMS Terlindungi. Hanya untuk personel yang berwenang.',
      login_button_color: 'linear-gradient(to right, #2563eb, #0891b2)',
      login_form_bg_color: '#ffffff',
      enable_registration: 'true',
      login_title_color: '#1e293b',
      login_footer_color: '#94a3b8',
      login_form_bg_opacity: 90,
      login_bg_opacity: 100,
      login_glass_effect: 'false',
      login_form_text_color: '#000000'
  });

  useEffect(() => {
      // Fetch branding
      fetch('/api/settings/branding', { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            setLogoFailed(false);
            setBranding(data?.branding || data);
          })
          .catch(err => console.error("Failed to fetch branding:", err));
  }, []);

  useEffect(() => {
      const rawLogo =
        (branding as any).logo ||
        (branding as any).systemLogo ||
        (branding as any).logo_url ||
        (branding as any).logoUrl ||
        (branding as any).system_logo ||
        '';
      setLogoFailed(false);
      setLogoSrc(rawLogo ? assetUrl(rawLogo) : '');
  }, [branding]);

  // register mode removed

  // register mode removed

  // register mode removed

  useEffect(() => {}, []);

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.login(username, password);
      const user = data.user;
      const status = ((user.status as string) || '').toLowerCase();
      if (user.role === 'User' && status && !['approved', 'active'].includes(status)) {
        setStatusModalUser(user.username || username);
        setStatusModalStatus(user.status || 'Pending');
        setIsLoading(false);
        return;
      }
      
      const role = String(user.role || '').toLowerCase();
      const targetPath = role === 'admin' ? ADMIN_DASHBOARD_PATH : '/';

      if (role === 'admin' && typeof window !== 'undefined') {
        window.location.replace(targetPath);
        return;
      }

      router.replace(targetPath);

      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (window.location.pathname !== targetPath) {
            window.location.replace(targetPath);
          }
        }, 500);

        window.setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }
    } catch (err: any) {
      // Prevent red overlay in Next.js
      setError(err.message || 'Login gagal. Pastikan server berjalan.');
      setIsLoading(false);
    }
  };

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  const renderLogin = () => (
    <>
      <form onSubmit={handleLogin} className="space-y-4 mt-6">
        {error && (
          <div className="bg-[#fff1f0] text-[#ff5c5c] text-sm p-2.5 rounded-xl flex items-center gap-2 border border-[#ffd7d7]">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#374557]">Alamat Email</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a5afbd] group-focus-within:text-[#8b5cf6] transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-[#f8f8fb] border border-[#edf0f5] rounded-xl focus:outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all text-sm font-medium text-[#1f2937] placeholder:text-[#a5afbd]"
              placeholder="hello@example.com"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#374557]">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#a5afbd] group-focus-within:text-[#8b5cf6] transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-12 pr-12 bg-[#f8f8fb] border border-[#edf0f5] rounded-xl focus:outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/10 transition-all text-sm font-medium text-[#1f2937] placeholder:text-[#a5afbd]"
              placeholder="Masukkan password"
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-[#667085] font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border-[#d9dee8] text-[#8b5cf6] focus:ring-[#8b5cf6]" />
            Ingat saya
          </label>
          <span className="font-semibold text-[#7c3aed]">Lupa Password?</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full h-12 rounded-xl font-bold text-white shadow-lg shadow-[#8b5cf6]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-sm
            ${isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#8b5cf6] hover:bg-[#7c3aed]'}`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sedang Masuk...
            </>
          ) : (
            <>
              Masuk
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {branding.enable_registration === 'true' && (
            <>
                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-[#edf0f5]"></div>
                    <span className="flex-shrink-0 mx-4 text-[#a5afbd] text-xs font-semibold">ATAU</span>
                    <div className="flex-grow border-t border-[#edf0f5]"></div>
                </div>

                <button
                    type="button"
                    onClick={() => router.push('/register')}
                    className="w-full h-11 rounded-xl font-bold text-[#374557] bg-white border border-[#edf0f5] hover:bg-[#f5f3ff] hover:text-[#7c3aed] hover:border-[#ddd6fe] flex items-center justify-center gap-2 transition-all active:scale-[0.99] text-sm"
                >
                    Belum punya akun? Daftar di sini
                </button>
            </>
        )}
      </form>

      <div className="mt-5 text-center space-y-2">
        <p className="text-xs text-[#98a2b3]">
          {branding.login_footer}
        </p>
      </div>
    </>
  );

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  // register mode removed

  return (
    <div 
        className="h-screen grid grid-cols-1 lg:grid-cols-[minmax(400px,48%)_1fr] bg-[#f7f8fc] relative overflow-hidden"
    >
      {/* Server Status Top Right */}
      <div className="absolute top-6 right-6 z-20 animate-fade-in-down hidden sm:block">
         <div className="flex justify-center gap-3 text-[11px] font-semibold bg-white/90 backdrop-blur-sm border border-white shadow-sm px-4 py-2 rounded-2xl text-[#667085]">
            <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : serverStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className={`${serverStatus === 'online' ? 'text-green-700' : 'text-slate-500'}`}>
                    {serverStatus === 'checking' ? 'Memeriksa...' : serverStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                </span>
            </div>
            {serverStatus === 'online' && (
                 <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`${dbStatus === 'connected' ? 'text-green-700' : 'text-red-500'}`}>
                        DB {dbStatus === 'connected' ? 'TERHUBUNG' : 'TERPUTUS'}
                    </span>
                </div>
            )}
         </div>
      </div>

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
              Masuk ke akun Anda
            </h1>
            <p className="mt-2 text-sm text-[#667085] leading-6">
              Kelola distribusi musik, publishing, dan data rilis dari satu dashboard.
            </p>
          </div>
          {renderLogin()}
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
        {logoSrc && !logoFailed && (
          <div className="absolute left-12 top-8 z-20 flex min-h-[64px] min-w-[280px] items-center">
            <img
              src={logoSrc}
              alt="Logo"
              className="max-h-[72px] max-w-[360px] w-auto object-contain drop-shadow-xl"
              onError={() => setLogoFailed(true)}
            />
          </div>
        )}
        <div className="relative z-10 w-full max-w-[560px] text-white">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            <ShieldCheck size={18} />
            Area CMS Terlindungi
          </div>
          <h2 className="mt-6 text-[44px] font-extrabold leading-tight tracking-[-0.02em] text-white">
            CMS Distribusi Musik & Publishing
          </h2>
          <p className="mt-4 max-w-[460px] text-base leading-7 text-white/80">
            Pantau release, artist, metadata, dan approval workflow dengan tampilan yang bersih dan cepat digunakan.
          </p>

          <div className="mt-9 grid grid-cols-3 gap-4">
            {[
              ['Rilis', 'CMS'],
              ['Artis', 'Data'],
              ['Royalti', 'Laporan']
            ].map(([title, caption]) => (
              <div key={title} className="rounded-2xl bg-white/14 p-4 backdrop-blur-md border border-white/15">
                <div className="text-xl font-extrabold">{title}</div>
                <div className="mt-1 text-sm text-white/75">{caption}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {statusModalStatus && statusModalUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Status Akun Belum Disetujui</p>
                <p className="text-xs text-slate-500 mt-1">
                  Hi {statusModalUser}, saat ini status akun kamu adalah{' '}
                  <span className="font-semibold">{statusModalStatus}</span>. Kamu belum bisa login ke CMS
                  sampai status berubah menjadi Disetujui.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setStatusModalStatus(null);
                  setStatusModalUser(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};
