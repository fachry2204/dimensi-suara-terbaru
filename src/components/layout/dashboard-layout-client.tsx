"use client";

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('');
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // Client-side fallback check (middleware should handle this, but for redundancy)
    const checkAuth = async () => {
      try {
        const profile = await fetch('/api/auth/me').then(res => {
          if (!res.ok) throw new Error('Unauthenticated');
          return res.json();
        });
        setCurrentUser(profile.username || profile.email || '');
        setUserRole(profile.role || 'User');
        setCurrentUserData(profile);
        setIsImpersonating(document.cookie.split(';').some((cookie) => cookie.trim() === 'dimensi_impersonating=1'));
      } catch (err) {
        console.log('Unauthenticated, redirecting to login');
        window.location.href = '/login';
      } finally {
        setIsAuthLoaded(true);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    window.location.href = '/login';
  };

  const handleStopImpersonating = async () => {
    try {
      const res = await fetch('/api/admin/impersonate/stop', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Gagal kembali ke admin');
      }

      window.location.href = data?.redirectTo || '/admin/users';
    } catch (error: any) {
      alert(error?.message || 'Gagal kembali ke admin');
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-dark text-slate-100 font-sans">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <DashboardSidebar currentUser={currentUser} userRole={userRole} />
        <div 
          className={`absolute inset-0 bg-black/50 -z-10 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:ml-0 overflow-x-hidden min-h-screen flex flex-col relative">
        {/* Only render header after auth is confirmed — prevents admin-profile flicker */}
        {isAuthLoaded ? (
          <DashboardHeader 
            currentUser={currentUser} 
            userRole={userRole}
            currentUserData={currentUserData}
            isImpersonating={isImpersonating}
            onStopImpersonating={handleStopImpersonating}
            onLogout={handleLogout} 
          />
        ) : (
          // Skeleton header while auth is loading
          <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-sm h-[57px]"
            style={{ background: 'rgba(15, 15, 18, 0.8)' }}
          >
            <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
              <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
            </div>
          </header>
        )}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
