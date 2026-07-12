import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PlusCircle, ListMusic, Music4, Settings, LayoutDashboard, BarChart3, ClipboardList, DollarSign, Upload, UserPlus, FileText, Library, PieChart, Users, Shield, User, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentUser: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, userRole }) => {
  const location = useLocation();
  const [logo, setLogo] = useState<string | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('Aggregator & Publishing');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: false,
    aggregator: false,
    publishing: false,
    report: false,
    reportUtama: false,
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
    const TOP_SECTIONS = ['dashboard','aggregator','publishing','report','reportUtama','reportUser','system','dataSaya','bantuan'];
    const REPORT_SUBS = ['statistics','reportList','revenue'];
    const REPORT_UTAMA_SUBS = ['importReports','payments'];
    
    setExpandedSections(prev => {
      const next = { ...prev };
      // Accordion for top-level sections
      if (TOP_SECTIONS.includes(section)) {
        TOP_SECTIONS.forEach(s => { next[s] = false; });
        next[section] = !prev[section];
        return next;
      }
      // Accordion for report sub-sections
      if (REPORT_SUBS.includes(section)) {
        REPORT_SUBS.forEach(s => { next[s] = false; });
        next[section] = !prev[section];
        next.report = true;
        return next;
      }
      if (REPORT_UTAMA_SUBS.includes(section)) {
        REPORT_UTAMA_SUBS.forEach(s => { next[s] = false; });
        next[section] = !prev[section];
        next.reportUtama = true;
        return next;
      }
      // Default toggle
      next[section] = !prev[section];
      return next;
    });
  };

  useEffect(() => {
      fetch('/api/settings/branding')
          .then(res => res.json())
          .then(data => {
              const branding = data?.branding || data;
              const nextLogo = branding?.logo || branding?.systemLogo || branding?.logo_url || branding?.logoUrl || branding?.system_logo;
              if (nextLogo) setLogo(nextLogo);
              if (branding?.login_title) setSystemTitle(branding.login_title);
          })
          .catch(err => {
              console.error("Failed to fetch branding:", err);
              // Fallback is already 'Aggregator & Publishing' by default state
          });
  }, []);

  const getLinkClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group font-bold text-[13px] ${
      isActive
        ? 'bg-[#aa91cc] text-white shadow-lg shadow-[#aa91cc]/20'
        : 'text-slate-400 hover:bg-[#aa91cc] hover:text-white'
    }`;

  const getIconClass = (isActive: boolean) =>
    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white';

  const getSubLinkClass = (isActive: boolean) => 
    `w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-[12px] ${
      isActive
        ? 'text-white bg-[#aa91cc] shadow-sm'
        : 'text-slate-500 hover:text-white hover:bg-[#aa91cc]/40'
    }`;

  const isUserRole = userRole === 'User';
  const routeForRole = (path: string) => {
    if (!isUserRole) return path;
    if (path === '/user-status' || path.startsWith('/user/')) return path;
    return `/user${path}`;
  };

  const activeForRole = (path: string) => {
    const target = routeForRole(path);
    return location.pathname === target || location.pathname.startsWith(`${target}/`);
  };

  return (
    <aside className="w-64 bg-brand-card border-r border-brand-border h-screen md:min-h-screen flex flex-col shadow-2xl transition-all duration-300 sticky top-0 overflow-y-auto pb-6 md:pb-0 sidebar-scroll">
      {/* Brand Logo */}
      <div className="min-h-[80px] h-auto py-4 flex flex-col items-center justify-center px-6 border-b border-brand-border flex-shrink-0 bg-black">
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

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto sidebar-scroll">
        
        {/* Dashboard Menu */}
        <div>
          <NavLink to={routeForRole('/dashboard')} className={({ isActive }) => getLinkClass(isActive)}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={20} className={getIconClass(isActive)} />
                Dashboard
              </>
            )}
          </NavLink>
        </div>

        {/* Aggregator Menu */}
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
              <NavLink to={routeForRole('/aggregator')} end className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Aggregator
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to={routeForRole('/my-releases')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <ListMusic size={20} className={getIconClass(isActive)} />
                    Rilis Saya
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to={routeForRole('/aggregator/artists')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Users size={20} className={getIconClass(isActive)} />
                    Artis
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          )}
        </div>

        {/* Publishing Menu */}
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
              <NavLink to={routeForRole('/publishing/writer')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <UserPlus size={20} className={getIconClass(isActive)} />
                    Data Pencipta
                  </>
                )}
              </NavLink>
            </li>
             <li>
              <NavLink to={routeForRole('/publishing/songs')} className={({ isActive }) => getLinkClass(isActive)}>
                 {({ isActive }) => (
                  <>
                    <ListMusic size={20} className={getIconClass(isActive)} />
                    Data Lagu
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          )}
        </div>

        {/* Laporan Section */}
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('reportUser')}
          >
            Laporan
            {expandedSections.reportUser ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.reportUser && (
            <ul className="space-y-2">
            <li>
              <NavLink to={routeForRole('/user/reports/analytics')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <BarChart3 size={20} className={getIconClass(isActive)} />
                    Analitik
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink to={routeForRole('/user/reports/payments')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <DollarSign size={20} className={getIconClass(isActive)} />
                    Pembayaran
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          )}
        </div>

        {/* Data Saya Section */}
        <div>
          <h3 
            className="px-4 text-[14px] font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
            onClick={() => toggleSection('dataSaya')}
          >
            Data Saya
            {expandedSections.dataSaya ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </h3>
          {expandedSections.dataSaya && (
            <ul className="space-y-2">
            <li>
              <NavLink to={routeForRole('/me/profile')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <User size={20} className={getIconClass(isActive)} />
                    Profil
                  </>
                )}
              </NavLink>
            </li>
            <li>
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 border-l-4 ${
                  activeForRole('/me/contracts')
                    ? 'border-[#aa91cc] bg-[#aa91cc] text-white' 
                    : 'border-transparent text-white/70 hover:bg-[#aa91cc] hover:text-white'
                }`}
                onClick={() => toggleSection('kontrak')}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className={activeForRole('/me/contracts') ? 'text-blue-400' : 'text-white/50'} />
                  <span className="font-medium text-[15px]">Kontrak</span>
                </div>
                {expandedSections.kontrak ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>

              {expandedSections.kontrak && (
                <ul className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-2">
                  <li>
                    <NavLink to={routeForRole('/me/contracts/aggregator')} className={({ isActive }) => getSubLinkClass(isActive)}>
                      Aggregator
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to={routeForRole('/me/contracts/publishing')} className={({ isActive }) => getSubLinkClass(isActive)}>
                      Publishing
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
            </ul>
          )}
        </div>

        {/* Bantuan Section */}
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
              <NavLink to={routeForRole('/tickets')} className={({ isActive }) => getLinkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <MessageSquare size={20} className={getIconClass(isActive)} />
                    Tiket Bantuan
                  </>
                )}
              </NavLink>
            </li>
          </ul>
          )}
        </div>
      </nav>
    </aside>
  );
};
