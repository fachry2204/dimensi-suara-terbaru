"use client";

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState('User');
  const [userRole, setUserRole] = useState('Admin'); // Placeholder

  useEffect(() => {
    // Client-side fallback check (middleware should handle this, but for redundancy)
    const checkAuth = async () => {
      try {
        const profile = await fetch('/api/auth/me').then(res => {
          if (!res.ok) throw new Error('Unauthenticated');
          return res.json();
        });
        setCurrentUser(profile.username || profile.email || 'User');
        setUserRole(profile.role || 'Admin');
      } catch (err) {
        console.log('Unauthenticated, redirecting to login');
        window.location.href = '/login';
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
        <DashboardHeader 
          currentUser={currentUser} 
          userRole={userRole} 
          onLogout={handleLogout} 
        />
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
