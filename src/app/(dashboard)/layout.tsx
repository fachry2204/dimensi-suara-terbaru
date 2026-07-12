"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/layout/apps-layout';
import { LayoutDashboard, LogOut, Settings, Music2, ChevronDown } from 'lucide-react';

// ─── Admin Header ─────────────────────────────────────────────────────────────
function AdminHeader() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const u = data.user || data;
          setUserInfo({ name: u.full_name || u.username || u.name || 'Admin', role: u.role || 'Admin' });
        }
      })
      .catch(() => {});
  }, []);

  const initials = userInfo?.name?.slice(0, 2).toUpperCase() || 'AD';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-2 font-black text-slate-900 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center">
              <Music2 size={14} className="text-white" />
            </div>
            <span className="hidden sm:block">Dimensi Suara</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 rounded px-1.5 py-0.5 ml-1">Admin</span>
          </Link>

          {/* Nav Links — hidden on mobile */}
          {/* Right: User avatar + menu */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-white shadow-sm transition hover:bg-emerald-600"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-[10px] font-black">
                {initials}
              </div>
              <span className="hidden sm:block text-xs font-bold text-white">{userInfo?.name || 'Admin'}</span>
              <ChevronDown size={13} className="text-emerald-50" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden py-1">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-800">{userInfo?.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{userInfo?.role}</p>
                </div>
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  <LayoutDashboard size={13} /> Dashboard
                </Link>
                <Link href="/admin/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                  <Settings size={13} /> Pengaturan
                </Link>
                <div className="border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={13} /> Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Admin Footer ─────────────────────────────────────────────────────────────
function AdminFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white py-5">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium">
        <span>© {new Date().getFullYear()} <strong className="text-slate-600">Dimensi Suara</strong>. Hak cipta dilindungi.</span>
        <span className="flex items-center gap-1">
          Panel Admin &bull; Versi 2.0
        </span>
      </div>
    </footer>
  );
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const isAdminPath = pathname === '/admin' || pathname?.startsWith('/admin/');

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        const role = String(data?.user?.role || data?.role || '').toLowerCase();
        
        if (isAdminPath) {
          if (role !== 'admin' && role !== 'operator') {
            router.push('/login?error=unauthorized');
            return;
          }
        } else if (role === 'admin' || role === 'operator') {
          router.push('/admin');
          return;
        }
        
        setIsAuthorized(true);
      } catch (err) {
        console.error('Authorization check failed:', err);
        router.push('/login');
      }
    };
    
    checkRole();
  }, [isAdminPath, router]);

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdminPath) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AdminHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6">
            {children}
          </div>
        </main>
        <AdminFooter />
      </div>
    );
  }

  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}
