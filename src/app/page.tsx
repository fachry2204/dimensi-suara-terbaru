"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Music4, FileText, ArrowRight, LogOut, ArrowRightCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { assetUrl } from '@/utils/url';

const ADMIN_DASHBOARD_PATH = '/admin';

export default function PortalPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    fetch('/api/settings/branding', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setBranding(data);
        if (data.favicon_url) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
                link.href = assetUrl(data.favicon_url);
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.href = assetUrl(data.favicon_url);
                document.head.appendChild(newLink);
            }
        }
      })
      .catch(err => console.error("Failed to load branding:", err));
  }, []);

  useEffect(() => {
    const redirectAdminToDashboard = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.replace('/login');
          return;
        }

        const data = await res.json();
        const role = String(data?.user?.role || '').toLowerCase();
        if (role === 'admin') {
          router.replace(ADMIN_DASHBOARD_PATH);
          return;
        }
      } catch (err) {
        console.error('Failed to check session:', err);
        router.replace('/login');
        return;
      }

      setIsCheckingSession(false);
    };

    redirectAdminToDashboard();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#090D16] relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-955/20 to-transparent z-0"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl z-0"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl z-0"></div>

      {/* Logout Button (Floating) */}
      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm border border-white/5 hover:border-red-500/20 shadow-sm"
      >
        <LogOut size={16} />
        <span>Keluar</span>
      </button>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto px-4 mt-8">
          
          {/* Aggregator Card */}
          <Link href="/aggregator" className="group block">
            <div className="bg-[#131926]/70 backdrop-blur-md p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-blue-500/20 border border-white/5 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
                <Music4 size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3 relative z-10">
                Dashboard Agregator
              </h2>
              
              <p className="text-slate-400 flex-1 relative z-10 text-sm leading-relaxed">
                Kelola distribusi musik, rilis lagu, laporan pendapatan agregator, dan analitik streaming dari berbagai DSP dengan mudah dan cepat.
              </p>
              
              <div className="mt-10 flex items-center text-blue-400 font-bold group-hover:text-blue-300 transition-colors relative z-10">
                <span>Masuk ke Aggregator</span>
                <ArrowRightCircle size={20} className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </Link>

          {/* Publishing Card */}
          <Link href="/publishing" className="group block">
            <div className="bg-[#131926]/70 backdrop-blur-md p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-rose-500/20 border border-white/5 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
                <FileText size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3 relative z-10">
                Dashboard Publishing
              </h2>
              
              <p className="text-slate-400 flex-1 relative z-10 text-sm leading-relaxed">
                Kelola hak cipta, data pencipta lagu (komposer/penulis), kontrak, dan royalti publishing secara terpusat dalam satu tempat.
              </p>
              
              <div className="mt-10 flex items-center text-rose-400 font-bold group-hover:text-rose-300 transition-colors relative z-10">
                <span>Masuk ke Publishing</span>
                <ArrowRightCircle size={20} className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </Link>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center text-slate-500 text-xs font-medium">
        {branding?.login_footer || 'Dimensi Suara CMS © Hanya untuk personel yang berwenang.'}
      </footer>
    </div>
  );
}
