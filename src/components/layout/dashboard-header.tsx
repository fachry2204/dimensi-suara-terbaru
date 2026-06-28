"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Shield, User, LogOut, X, CheckCircle, Info } from 'lucide-react';

interface DashboardHeaderProps {
  currentUser: string;
  userRole?: string;
  currentUserData?: any;
  isImpersonating?: boolean;
  onLogout: () => void;
  onStopImpersonating?: () => void;
  unreadCount?: number;
  notifications?: any[];
}

export function DashboardHeader({
  currentUser,
  userRole = "Admin",
  currentUserData,
  isImpersonating,
  onLogout,
  onStopImpersonating,
  unreadCount = 0,
  notifications = []
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const headerBgColor = "rgba(15, 15, 18, 0.8)";
  const headerTitleColor = "#f8fafc"; // slate-50

  const getPageTitle = () => {
    if (pathname === '/dashboard') return "Overview";
    if (pathname === '/aggregator') return "Aggregator Overview";
    if (pathname === '/new-release') return "Music Distribution";
    if (pathname === '/releases') return "All Releases";
    if (pathname === '/settings') return "Settings";
    if (pathname === '/users') return "User Management";
    if (pathname === '/reports') return "Laporan";
    if (pathname === '/import-reports') return "Import Laporan";
    if (pathname === '/revenue') return "Pendapatan";
    if (pathname.startsWith('/reports/payments')) return "Menu Pembayaran";
    if (pathname === '/statistics') return "Analytics & Reports";
    if (pathname.startsWith('/publishing')) return "Publishing";
    return "Dashboard";
  };

  const getProfileImageUrl = (path: string) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `/api/uploads/${path}`;
  };

  return (
    <header 
      className="sticky top-0 z-30 backdrop-blur-xl border-b border-brand-border px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-300"
      style={{ background: headerBgColor }}
    >
      <div className="hidden md:flex flex-col leading-tight">
        <span className="text-sm tracking-tight" style={{ color: headerTitleColor }}>
          {getPageTitle()}
        </span>
      </div>

      <div className="flex-1 md:flex-none flex justify-end items-center gap-6">
        {/* Notifications */}
        <div className="relative">
          <button 
            className="relative p-2 rounded-full transition-colors group hover:bg-black/5"
            style={{ color: headerTitleColor }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border border-white text-[10px] flex items-center justify-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div 
                      key={notif.id}
                      className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className={`mt-1 flex-shrink-0 ${!notif.is_read ? 'text-blue-500' : 'text-slate-400'}`}>
                        {notif.type === 'RELEASE_STATUS' ? <CheckCircle size={16} /> : <Info size={16} />}
                      </div>
                      <div>
                        <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                          {notif.message}
                        </p>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Impersonation Button */}
        {isImpersonating && (
          <button 
            onClick={onStopImpersonating}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl font-bold text-xs transition-all shadow-lg animate-pulse"
          >
            <Shield size={14} />
            Back to Admin
          </button>
        )}

        {/* Profile */}
        <div 
          className="flex items-center gap-3 pl-6 border-l cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderColor: headerTitleColor ? headerTitleColor + '40' : 'rgba(226, 232, 240, 0.5)' }}
          onClick={() => setShowProfileModal(true)}
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold capitalize text-slate-50">
              {currentUserData?.full_name || currentUserData?.name || currentUser}
            </div>
            <div className="text-xs font-medium opacity-70" style={{ color: headerTitleColor }}>
              {userRole === 'Admin' 
                ? 'Super Administrator' 
                : userRole === 'Operator' 
                  ? 'Content Manager' 
                  : (currentUserData?.account_type?.toLowerCase() === 'company' ? 'PT/LABEL' : 'ARTIS')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 overflow-hidden relative">
            {currentUserData?.profile_picture ? (
              <img 
                src={getProfileImageUrl(currentUserData.profile_picture) || ''} 
                alt={currentUser} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <User size={20} />
            )}
            {currentUserData?.profile_picture && (
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                <User size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium text-xs transition-colors ml-2"
          title="Sign Out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
