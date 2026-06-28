"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3,
  ClipboardList, DollarSign, Upload, UserPlus, FileText, Library,
  PieChart, Users, Shield, User, MessageSquare, ChevronDown, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentUser: string;
  userRole?: string;
}

export function DashboardSidebar({ currentUser, userRole = "Admin" }: SidebarProps) {
  const pathname = usePathname();
  const [logo, setLogo] = useState<string | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('Aggregator & Publishing');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: false,
    aggregator: false,
    publishing: false,
    report: false,
    reportUser: false,
    system: false,
    dataSaya: false,
    bantuan: false,
    statistics: false,
    payments: false,
    reportList: false,
    revenue: false,
    importReports: false,
    kontrak: false
  });

  const toggleSection = (section: string) => {
    const TOP_SECTIONS = ['dashboard','aggregator','publishing','report','reportUser','system','dataSaya','bantuan'];
    const REPORT_SUBS = ['statistics','reportList','importReports','payments','revenue'];
    setExpandedSections(prev => {
      const next = { ...prev };
      if (TOP_SECTIONS.includes(section)) {
        TOP_SECTIONS.forEach(s => { next[s] = false; });
        next[section] = !prev[section];
        return next;
      }
      if (REPORT_SUBS.includes(section)) {
        REPORT_SUBS.forEach(s => { next[s] = false; });
        next[section] = !prev[section];
        next.report = true;
        return next;
      }
      next[section] = !prev[section];
      return next;
    });
  };

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(res => res.json())
      .then(data => {
        if (data.logo) setLogo(data.logo);
        if (data.login_title) setSystemTitle(data.login_title);
      })
      .catch(err => {
        console.warn("Failed to fetch branding:", err);
      });
  }, []);

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-sm ${
      isActive
        ? 'bg-[#aa91cc] text-white shadow-lg shadow-[#aa91cc]/20'
        : 'text-slate-400 hover:bg-[#aa91cc] hover:text-white'
    }`;
  };

  const getIconClass = (href: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return isActive ? 'text-white' : 'text-slate-400 group-hover:text-white';
  };

  const getSubLinkClass = (href: string) => {
    const isActive = pathname === href;
    return `w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-[13px] ${
      isActive
        ? 'text-white bg-[#aa91cc] shadow-sm'
        : 'text-slate-500 hover:text-white hover:bg-[#aa91cc]/40'
    }`;
  };

  return (
    <aside className="w-64 bg-brand-card border-r border-brand-border h-screen md:min-h-screen flex flex-col shadow-2xl transition-all duration-300 sticky top-0 overflow-y-auto pb-6 md:pb-0 sidebar-scroll">
      <div className="min-h-[80px] h-auto py-4 flex flex-col items-center justify-center px-6 border-b border-brand-border flex-shrink-0">
        {logo ? (
          <img src={logo} alt="Logo" className="w-auto h-auto max-h-[150px] object-contain mb-2" />
        ) : (
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-2">
            <Music4 size={24} />
          </div>
        )}
        <div className="text-center">
          <span className="text-xs font-bold text-white block tracking-wide">{systemTitle}</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto sidebar-scroll">
        
        <div>
          <Link href="/dashboard" className={getLinkClass('/dashboard')}>
            <LayoutDashboard size={20} className={getIconClass('/dashboard')} />
            Dashboard
          </Link>
        </div>

        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('aggregator')}
          >
            Aggregator
            {expandedSections.aggregator ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.aggregator && (
            <ul className="space-y-2">
              <li>
                <Link href="/aggregator" className={getLinkClass('/aggregator')}>
                  <BarChart3 size={20} className={getIconClass('/aggregator')} />
                  Aggregator
                </Link>
              </li>
              <li>
                <Link href={userRole === 'User' ? "/my-releases" : "/releases"} className={getLinkClass(userRole === 'User' ? '/my-releases' : '/releases')}>
                  <ListMusic size={20} className={getIconClass(userRole === 'User' ? '/my-releases' : '/releases')} />
                  {userRole === 'User' ? 'My Releases' : 'All Release'}
                </Link>
              </li>
              <li>
                <Link href="/aggregator/artists" className={getLinkClass('/aggregator/artists')}>
                  <Users size={20} className={getIconClass('/aggregator/artists')} />
                  Artist
                </Link>
              </li>
            </ul>
          )}
        </div>

        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('publishing')}
          >
            Publishing
            {expandedSections.publishing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.publishing && (
            <ul className="space-y-2">
              <li>
                <Link href="/publishing/writer" className={getLinkClass('/publishing/writer')}>
                  <UserPlus size={20} className={getIconClass('/publishing/writer')} />
                  Data Pencipta
                </Link>
              </li>
               <li>
                <Link href="/publishing/songs" className={getLinkClass('/publishing/songs')}>
                  <ListMusic size={20} className={getIconClass('/publishing/songs')} />
                  Data Lagu
                </Link>
              </li>
            </ul>
          )}
        </div>

        {userRole !== 'User' && (
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('report')}
          >
            Report
            {expandedSections.report ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.report && (
            <ul className="space-y-2">
              <li>
                  <div 
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-sm text-slate-400 hover:bg-[#aa91cc] hover:text-white cursor-pointer"
                      onClick={() => toggleSection('statistics')}
                  >
                      <div className="flex items-center gap-3">
                          <BarChart3 size={20} className="text-white/70 group-hover:text-white" />
                          Statistik
                      </div>
                      {expandedSections.statistics ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  {expandedSections.statistics && (
                      <ul className="pl-4 mt-1 space-y-1 border-l border-brand-border ml-6">
                          <li>
                              <Link href="/statistics/aggregator" className={getSubLinkClass('/statistics/aggregator')}>
                                  Aggregator
                              </Link>
                          </li>
                          <li>
                              <Link href="/statistics/publishing" className={getSubLinkClass('/statistics/publishing')}>
                                  Publishing
                              </Link>
                          </li>
                      </ul>
                  )}
              </li>

              <li>
                  <div 
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-sm text-white/80 hover:bg-[#aa91cc] hover:text-white cursor-pointer"
                      onClick={() => toggleSection('reportList')}
                  >
                      <div className="flex items-center gap-3">
                          <ClipboardList size={20} className="text-white/70 group-hover:text-white" />
                          Laporan
                      </div>
                      {expandedSections.reportList ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  {expandedSections.reportList && (
                      <ul className="pl-4 mt-1 space-y-1 border-l border-white/10 ml-6">
                          <li>
                              <Link href="/reports/aggregator" className={getSubLinkClass('/reports/aggregator')}>
                                  Aggregator
                              </Link>
                          </li>
                          <li>
                              <Link href="/reports/publishing" className={getSubLinkClass('/reports/publishing')}>
                                  Publishing
                              </Link>
                          </li>
                      </ul>
                  )}
              </li>

              <li>
                  <div 
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-[13px] text-white/80 hover:bg-[#aa91cc] hover:text-white cursor-pointer"
                      onClick={() => toggleSection('importReports')}
                  >
                      <div className="flex items-center gap-3">
                          <Upload size={20} className="text-white/70 group-hover:text-white" />
                          Import Laporan
                      </div>
                      {expandedSections.importReports ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  {expandedSections.importReports && (
                      <ul className="pl-4 mt-1 space-y-1 border-l border-white/10 ml-6">
                          <li>
                              <Link href="/import-reports/aggregator" className={getSubLinkClass('/import-reports/aggregator')}>
                                  Aggregator
                              </Link>
                          </li>
                          <li>
                              <Link href="/import-reports/publishing" className={getSubLinkClass('/import-reports/publishing')}>
                                  Publishing
                              </Link>
                          </li>
                      </ul>
                  )}
              </li>
              
              <li>
                  <div 
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-[13px] text-white/80 hover:bg-[#aa91cc] hover:text-white cursor-pointer"
                      onClick={() => toggleSection('payments')}
                  >
                      <div className="flex items-center gap-3">
                          <DollarSign size={20} className="text-white/70 group-hover:text-white" />
                          Pembayaran
                      </div>
                      {expandedSections.payments ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  {expandedSections.payments && (
                      <ul className="pl-4 mt-1 space-y-1 border-l border-white/10 ml-6">
                          <li>
                              <Link href="/reports/payments/aggregator" className={getSubLinkClass('/reports/payments/aggregator')}>
                                  Aggregator
                              </Link>
                          </li>
                          <li>
                              <Link href="/reports/payments/publishing" className={getSubLinkClass('/reports/payments/publishing')}>
                                  Publishing
                              </Link>
                          </li>
                      </ul>
                  )}
              </li>
            </ul>
          )}
        </div>
        )}

        {userRole === 'Admin' && (
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('kontrak')}
          >
            Kontrak
            {expandedSections.kontrak ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.kontrak && (
            <ul className="space-y-2">
              <li>
                <Link href="/contracts/aggregator" className={getLinkClass('/contracts/aggregator')}>
                  <FileText size={20} className={getIconClass('/contracts/aggregator')} />
                  Aggregator
                </Link>
              </li>
              <li>
                <Link href="/contracts/publishing" className={getLinkClass('/contracts/publishing')}>
                  <FileText size={20} className={getIconClass('/contracts/publishing')} />
                  Publishing
                </Link>
              </li>
            </ul>
          )}
        </div>
        )}

        {userRole !== 'User' && (
        <div>
            <h3 
              className="px-4 text-[14px] font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
              onClick={() => toggleSection('system')}
            >
              System
              {expandedSections.system ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </h3>
            {expandedSections.system && (
              <ul className="space-y-2">
                <li>
                  <Link href="/settings" className={getLinkClass('/settings')}>
                    <Settings size={20} className={getIconClass('/settings')} />
                    Settings
                  </Link>
                </li>
                {(userRole === 'Admin' || userRole === 'Operator') && (
                <li>
                  <Link href="/users" className={getLinkClass('/users')}>
                    <Users size={20} className={getIconClass('/users')} />
                    User Management
                  </Link>
                </li>
                )}
              </ul>
            )}
        </div>
        )}

        <div>
          <h3 
            className="px-4 text-[14px] font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('bantuan')}
          >
            Bantuan
            {expandedSections.bantuan ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.bantuan && (
            <ul className="space-y-2">
              <li>
                <Link href="/tickets" className={getLinkClass('/tickets')}>
                  <MessageSquare size={20} className={getIconClass('/tickets')} />
                  Tiket Bantuan
                </Link>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </aside>
  );
}
