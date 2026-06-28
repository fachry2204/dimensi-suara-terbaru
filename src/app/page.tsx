"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Music4, FileText, ArrowRight, LogOut, ArrowRightCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PortalPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(res => res.json())
      .then(data => {
        setBranding(data);
        if (data.favicon_url) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
                link.href = data.favicon_url;
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.href = data.favicon_url;
                document.head.appendChild(newLink);
            }
        }
      })
      .catch(err => console.error("Failed to load branding:", err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-100/50 to-transparent z-0"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl z-0"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl z-0"></div>

      {/* Logout Button (Floating) */}
      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 text-slate-500 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm border border-transparent hover:border-red-100 shadow-sm"
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto px-4 mt-8">
          
          {/* Aggregator Card */}
          <Link href="/dashboard-aggregator" className="group block">
            <div className="bg-white p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/20 border border-slate-100 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
                <Music4 size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-3 relative z-10">
                Dashboard Aggregator
              </h2>
              
              <p className="text-slate-500 flex-1 relative z-10 text-sm leading-relaxed">
                Kelola distribusi musik, rilis lagu, laporan pendapatan agregator, dan analitik streaming dari berbagai DSP dengan mudah dan cepat.
              </p>
              
              <div className="mt-10 flex items-center text-blue-600 font-bold group-hover:text-blue-700 transition-colors relative z-10">
                <span>Masuk ke Aggregator</span>
                <ArrowRightCircle size={20} className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </Link>

          {/* Publishing Card */}
          <Link href="/publishing" className="group block">
            <div className="bg-white p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-rose-500/20 border border-slate-100 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-8 relative z-10 group-hover:scale-110 transition-transform duration-300">
                <FileText size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-3 relative z-10">
                Dashboard Publishing
              </h2>
              
              <p className="text-slate-500 flex-1 relative z-10 text-sm leading-relaxed">
                Kelola hak cipta, data pencipta lagu (komposer/penulis), kontrak, dan royalti publishing secara terpusat dalam satu tempat.
              </p>
              
              <div className="mt-10 flex items-center text-rose-600 font-bold group-hover:text-rose-700 transition-colors relative z-10">
                <span>Masuk ke Publishing</span>
                <ArrowRightCircle size={20} className="ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          </Link>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center text-slate-400 text-xs font-medium">
        {branding?.login_footer || 'Dimensi Suara CMS © Authorized personnel only.'}
      </footer>
    </div>
  );
}
