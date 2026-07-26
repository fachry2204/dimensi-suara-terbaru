"use client";


import React, { useState, useEffect } from 'react';
import { Disc, Music, Calendar, Eye, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Globe, ChevronLeft, ChevronRight, List, Plus, Users, RefreshCw, AlertCircle, CheckCircle2, X, Edit3, LogIn } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReleaseData } from '@/types';
import { formatDMY } from '@/utils/date';
import { assetUrl } from '@/utils/url';
import { useBranding } from '@/contexts/BrandingContext';
import { api } from '@/utils/api';



type SortKey = 'title' | 'artist' | 'type' | 'date' | 'aggregator' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function ReleasesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routePrefix = pathname?.startsWith('/user') ? '/user' : pathname?.startsWith('/admin') ? '/admin' : '';
  const isAdminRoute = routePrefix === '/admin';
  const { getButtonColor } = useBranding();
  const [activeStatusTab, setActiveStatusTab] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [releases, setReleases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('Admin'); // Placeholder
  const [selectedRelease, setSelectedRelease] = useState<any | null>(null);
  const [soundOnUserIdOn, setSoundOnUserIdOn] = useState(false);
  const [soundOnLoggedIn, setSoundOnLoggedIn] = useState(false);
  const [isLoggingInSoundOn, setIsLoggingInSoundOn] = useState(false);
  const [soundOnAutoLoginAttempted, setSoundOnAutoLoginAttempted] = useState(false);
  const [soundOnLoginMessage, setSoundOnLoginMessage] = useState('');
  const [aggregatorDraft, setAggregatorDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('Pending');
  const [upcDraft, setUpcDraft] = useState('');
  const [isrcDraft, setIsrcDraft] = useState('');
  const [trackIsrcDrafts, setTrackIsrcDrafts] = useState<Record<string | number, string>>({});
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [soundOnChecks, setSoundOnChecks] = useState<Record<string | number, {
    status: 'idle' | 'checking' | 'found' | 'not_found' | 'error';
    message?: string;
    releaseStatus?: string;
    upc?: string;
    isrc?: string;
  }>>({});
  const selectedSoundOn = selectedRelease ? soundOnChecks[selectedRelease.id || selectedRelease.title] : null;

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const [releaseData, soundOnData] = await Promise.all([
          api.getReleases(''),
          fetch('/api/settings/soundon', { credentials: 'include', cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
        ]);
        setReleases(Array.isArray(releaseData) ? releaseData : []);
        setSoundOnUserIdOn(Boolean(soundOnData?.userIdOn));
      } catch (err: any) {
        console.error('Failed to fetch releases', err);
        setError(err.message || 'Gagal memuat data');
        setSoundOnUserIdOn(false);
        setSoundOnLoggedIn(false);
      }
    };
    fetchReleases();
  }, []);

  useEffect(() => {
    if (!selectedRelease) return;

    const tracks = Array.isArray(selectedRelease.tracks) ? selectedRelease.tracks : [];
    setAggregatorDraft(selectedRelease.aggregator || '');
    setStatusDraft(selectedRelease.status || 'Pending');
    setUpcDraft(selectedSoundOn?.upc || selectedRelease.upc || '');
    setIsrcDraft(selectedSoundOn?.isrc || tracks[0]?.isrc || '');
    setTrackIsrcDrafts(
      tracks.reduce((acc: Record<string | number, string>, track: any, index: number) => {
        acc[track.id || index] = track.isrc || '';
        return acc;
      }, {})
    );
    setWorkflowMessage('');
  }, [selectedRelease, selectedSoundOn?.upc, selectedSoundOn?.isrc]);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewAll, setIsViewAll] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, searchQuery, isViewAll]);

  // Define Tabs
  const tabs = [
    { id: 'PENDING', label: 'Menunggu', statusMap: 'Pending' },
    { id: 'ALL', label: 'Semua Rilis', statusMap: null },
    { id: 'REQUEST_EDIT', label: 'Minta Revisi', statusMap: 'Request Edit' },
    { id: 'PROCESSING', label: 'Proses', statusMap: 'Processing' },
    { id: 'RELEASED', label: 'Rilis', statusMap: 'Live' },
    { id: 'REJECTED', label: 'Ditolak', statusMap: 'Rejected' },
  ];

  const getStatusLabel = (status?: string | null) => {
    const normalized = status || 'Pending';
    if (normalized === 'Live' || normalized === 'Released') return 'Rilis';
    if (normalized === 'Processing') return 'Diproses';
    if (normalized === 'Pending') return 'Menunggu';
    if (normalized === 'Request Edit') return 'Minta Revisi';
    if (normalized === 'Rejected') return 'Ditolak';
    return normalized;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'Single') return 'Single';
    if (type === 'Album/EP') return 'Album/EP';
    return type;
  };

  const getCount = (statusMap: string | null) => {
    if (statusMap === null) return releases.length;
    if (statusMap === 'Live') {
        return releases.filter(r => r.status === 'Live' || r.status === 'Released').length;
    }
    return releases.filter(r => (r.status || 'Pending') === statusMap).length;
  };

  // 1. Filter Logic
  const filteredReleases = releases.filter(release => {
    // Status Filter
    const currentTab = tabs.find(t => t.id === activeStatusTab);
    const releaseStatus = release.status || 'Pending';
    let statusMatch = true;
    
    if (currentTab?.statusMap) {
        if (currentTab.statusMap === 'Live') {
            statusMatch = releaseStatus === 'Live' || releaseStatus === 'Released';
        } else {
            statusMatch = releaseStatus === currentTab.statusMap;
        }
    }
    
    // Search Filter (Expanded to include Aggregator)
    const searchLower = searchQuery.toLowerCase();
    
    // Safely handle potential undefined/null fields
    const title = release.title || '';
    const artists = Array.isArray(release.primaryArtists) ? release.primaryArtists : (typeof release.primaryArtists === 'string' ? [release.primaryArtists] : []);
    const upc = release.upc || '';
    const aggregator = release.aggregator || '';

    const searchMatch = 
        title.toLowerCase().includes(searchLower) || 
        artists.some(a => (typeof a === 'string' ? a : (a?.name || '')).toLowerCase().includes(searchLower)) ||
        upc.includes(searchLower) ||
        aggregator.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  // 2. Sorting Logic
  const sortedReleases = [...filteredReleases].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.key) {
        case 'title':
            return a.title.localeCompare(b.title) * direction;
        case 'artist':
            const getFirstArtist = (r: ReleaseData) => {
                const list = r.primaryArtists || [];
                const first = list[0];
                return typeof first === 'string' ? first : (first?.name || '');
            };
            return getFirstArtist(a).localeCompare(getFirstArtist(b)) * direction;
        case 'aggregator':
            return (a.aggregator || '').localeCompare(b.aggregator || '') * direction;
        case 'status':
            return (a.status || '').localeCompare(b.status || '') * direction;
        case 'type':
            const typeA = (a.tracks || []).length > 1 ? "Album" : "Single";
            const typeB = (b.tracks || []).length > 1 ? "Album" : "Single";
            return typeA.localeCompare(typeB) * direction;
        case 'date':
        default:
            const dateA = a.plannedReleaseDate || a.submissionDate || '';
            const dateB = b.plannedReleaseDate || b.submissionDate || '';
            return dateA.localeCompare(dateB) * direction;
    }
  });

  // 3. Pagination Logic
  const totalItems = sortedReleases.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const displayedReleases = isViewAll 
    ? sortedReleases 
    : sortedReleases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const isSoundOnAggregator = (aggregator?: string) =>
    String(aggregator || '').trim().toLowerCase() === 'soundon';

  const normalizeFinalStatus = (value?: string | null) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const isFinalSoundOnStatus = (value?: string | null) => {
    const status = normalizeFinalStatus(value);
    return [
      'delivered',
      'delivery',
      'deliveri',
      'rilis',
      'live',
      'released',
      'rejected',
      'ditolak',
      'not approved',
    ].includes(status);
  };

  const isFinalReleaseCheck = (release: any) => {
    const result = soundOnChecks[release.id || release.title];
    return Boolean(result) && isFinalSoundOnStatus(result.releaseStatus);
  };

  const checkSoundOnRelease = async (release: any) => {
    if (!isSoundOnAggregator(release.aggregator)) return;
    if (!soundOnLoggedIn) return;

    const id = release.id || release.title;
    if (isFinalReleaseCheck(release)) {
      setSoundOnChecks((prev) => ({
        ...prev,
        [id]: {
          status: 'found',
          message: 'Status final, tidak perlu dicek ulang.',
          releaseStatus: prev[id]?.releaseStatus,
          upc: prev[id]?.upc,
          isrc: prev[id]?.isrc,
        },
      }));
      return;
    }

    setSoundOnChecks((prev) => ({
      ...prev,
      [id]: { status: 'checking', message: 'Cek rilis di SoundOn...' },
    }));

    let timeoutId: number | undefined;

    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 90000);
      const checkResponse = await fetch('/api/admin/soundon/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          title: release.title,
          upc: release.upc,
        }),
      });
      const checkData = await checkResponse.json().catch(() => ({}));

      if (!checkResponse.ok) {
        throw new Error(checkData.error || 'Cek SoundOn gagal');
      }

      setSoundOnChecks((prev) => ({
        ...prev,
        [id]: {
          status: checkData.status === 'found' ? 'found' : 'not_found',
          message: checkData.message,
          releaseStatus: checkData.releaseStatus,
          upc: checkData.upc,
          isrc: checkData.isrc,
        },
      }));
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'Cek SoundOn terlalu lama. Session SoundOn mungkin perlu login ulang.'
        : error.message || 'Cek SoundOn gagal';
      setSoundOnChecks((prev) => ({
        ...prev,
        [id]: {
          status: 'error',
          message,
        },
      }));
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const loginSoundOn = async () => {
    if (isLoggingInSoundOn || soundOnLoggedIn || !soundOnUserIdOn) return;

    setIsLoggingInSoundOn(true);
    setSoundOnLoginMessage('');

    try {
      const response = await fetch('/api/settings/soundon/test', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Login SoundOn gagal');
      }

      setSoundOnLoggedIn(true);
      setSoundOnLoginMessage(data.message || 'Login SoundOn berhasil.');
    } catch (error: any) {
      setSoundOnLoggedIn(false);
      setSoundOnLoginMessage(error.message || 'Login SoundOn gagal.');
    } finally {
      setIsLoggingInSoundOn(false);
    }
  };

  useEffect(() => {
    if (!isAdminRoute || !soundOnUserIdOn || soundOnLoggedIn || isLoggingInSoundOn || soundOnAutoLoginAttempted) return;
    setSoundOnAutoLoginAttempted(true);
    loginSoundOn();
  }, [isAdminRoute, soundOnUserIdOn, soundOnLoggedIn, isLoggingInSoundOn, soundOnAutoLoginAttempted]);

  const SoundOnInfo = ({ release }: { release: any }) => {
    const result = soundOnChecks[release.id || release.title];

    if (!isSoundOnAggregator(release.aggregator)) return null;

    if (!result || result.status === 'idle') {
      return (
        <div className="mt-1 text-[10px] font-semibold text-slate-400">
          Klik SoundOn untuk cek SO
        </div>
      );
    }

    if (result.status === 'checking') {
      return (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-600">
          <RefreshCw size={10} className="animate-spin" />
          Memeriksa SoundOn...
        </div>
      );
    }

    if (result.status === 'error') {
      return (
        <div className="mt-1 max-w-[180px] text-[10px] font-semibold text-red-600">
          <span className="inline-flex items-center gap-1"><AlertCircle size={10} /> Error SO</span>
          <div className="font-normal text-red-500">{result.message}</div>
        </div>
      );
    }

    return (
      <div className="mt-1 space-y-0.5 text-[10px] leading-4">
        <div className="font-bold text-slate-600">
          Status SO: <span className={result.status === 'found' ? 'text-emerald-700' : 'text-amber-700'}>{result.releaseStatus || (result.status === 'found' ? 'Ditemukan' : 'Tidak ditemukan')}</span>
        </div>
        <div className="font-mono text-slate-500">UPC SO: {result.upc || '-'}</div>
        <div className="font-mono text-slate-500">ISRC SO: {result.isrc || '-'}</div>
      </div>
    );
  };

  const getReleaseArtists = (release: any) =>
    (release.primaryArtists || []).map((artist: any) => typeof artist === 'string' ? artist : artist?.name).filter(Boolean).join(', ') || 'Artis Tidak Dikenal';

  const getReleaseCover = (release: any) => {
    if (!release?.coverArt) return '';
    if (typeof release.coverArt === 'string') return assetUrl(release.coverArt);
    if (release.coverArt instanceof Blob) return URL.createObjectURL(release.coverArt);
    return '';
  };

  const selectedTracks = Array.isArray(selectedRelease?.tracks) ? selectedRelease.tracks : [];
  const isSelectedAlbum = selectedTracks.length > 1;

  const saveReleaseWorkflow = async () => {
    if (!selectedRelease?.id) return;

    setIsSavingWorkflow(true);
    setWorkflowMessage('');

    try {
      const tracksPayload = selectedTracks.map((track: any, index: number) => ({
        id: track.id,
        isrc: isSelectedAlbum ? (trackIsrcDrafts[track.id || index] || '') : isrcDraft,
      })).filter((track: any) => track.id);

      const response = await fetch(`/api/releases/${selectedRelease.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: statusDraft,
          aggregator: aggregatorDraft,
          upc: upcDraft,
          tracks: tracksPayload,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Gagal menyimpan status rilis');
      }

      const updatedRelease = {
        ...selectedRelease,
        status: statusDraft,
        aggregator: aggregatorDraft,
        upc: upcDraft,
        tracks: selectedTracks.map((track: any, index: number) => ({
          ...track,
          isrc: isSelectedAlbum ? (trackIsrcDrafts[track.id || index] || '') : isrcDraft,
        })),
      };

      setSelectedRelease(updatedRelease);
      setReleases((prev) => prev.map((release) => release.id === selectedRelease.id ? updatedRelease : release));
      setWorkflowMessage('Status rilis berhasil disimpan.');
    } catch (error: any) {
      setWorkflowMessage(error.message || 'Gagal menyimpan status rilis.');
    } finally {
      setIsSavingWorkflow(false);
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
     if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-50" />;
     return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-blue-500" /> 
        : <ArrowDown size={14} className="text-blue-500" />;
  };

  const ThSortable = ({ label, sortKey, align = 'left' }: { label: string, sortKey: SortKey, align?: 'left'|'right' }) => (
      <th 
        className={`px-4 py-2 text-[13px] text-slate-400 tracking-wider cursor-pointer hover:bg-white/5 transition-colors group text-${align}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
            {label}
            <SortIcon columnKey={sortKey} />
        </div>
      </th>
  );

  // Stat card UI
  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext, cardClass }: any) => (
    <div className={`p-5 rounded-3xl border flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md ${cardClass || 'bg-white border-slate-100'}`}>
        <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{count}</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtext}</p>
        </div>
        <div 
            className={`rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
        >
            {icon}
        </div>
    </div>
  );

  // Meta stats
  const uniqueArtists = new Set<string>();
  releases.forEach(r => {
      if (Array.isArray(r.primaryArtists)) {
          r.primaryArtists.forEach(a => {
              const name = typeof a === 'string' ? a : a.name;
              if (name) uniqueArtists.add(name.trim());
          });
      } else if (typeof r.primaryArtists === 'string') {
          if (r.primaryArtists) uniqueArtists.add((r.primaryArtists as string).trim());
      }
  });

  const metaStats = {
    singles: releases.filter(r => r.type === 'SINGLE').length,
    albums: releases.filter(r => r.type === 'ALBUM').length,
    tracks: releases.reduce((sum, r) => sum + (r.tracks?.length || 0), 0),
    artists: uniqueArtists.size
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-none min-h-screen">
        {pathname?.startsWith('/admin') && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-6 w-fit"
          >
            ← Menuju Dashboard
          </Link>
        )}
        {/* META COUNTS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard 
                title="Jumlah Single" 
                count={metaStats.singles} 
                icon={<Music size={16} />} 
                colorClass="text-indigo-600" 
                bgClass="bg-indigo-100"
                subtext="Total rilis single"
                cardClass="bg-indigo-500/10 border-indigo-500/20"
            />
            <StatCard 
                title="Jumlah Album" 
                count={metaStats.albums} 
                icon={<Disc size={16} />} 
                colorClass="text-purple-600" 
                bgClass="bg-purple-100"
                subtext="Total rilis album"
                cardClass="bg-purple-500/10 border-purple-500/20"
            />
            <StatCard 
                title="Jumlah Track" 
                count={metaStats.tracks} 
                icon={<Music size={16} />} 
                colorClass="text-blue-600" 
                bgClass="bg-blue-100"
                subtext="Total track katalog"
                cardClass="bg-blue-500/10 border-blue-500/20"
            />
            <StatCard 
                title="Jumlah Artis" 
                count={metaStats.artists} 
                icon={<Users size={16} />} 
                colorClass="text-emerald-600" 
                bgClass="bg-emerald-100"
                subtext="Total artis unik"
                cardClass="bg-emerald-500/10 border-emerald-500/20"
            />
            
        </div>

        {/* STATUS TABS NAVIGATION */}
        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="font-medium">Koneksi bermasalah: {error}</p>
                <p className="text-sm ml-auto text-red-400">Periksa jaringan atau log server.</p>
            </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-base font-bold text-slate-800">Kelola Rilis</h2>
                    <p className="text-xs text-slate-400 mt-1">Cari data rilis atau buat rilis baru.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                        onClick={() => router.push(`${routePrefix}/new-release`)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-full hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-xs font-bold whitespace-nowrap"
                        style={{ background: getButtonColor() }}
                        title="Buat Rilis Baru"
                    >
                        <Plus size={14} />
                        Rilis Baru
                    </button>
                    <div className="relative w-full sm:w-72">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Cari judul, artis, UPC${(userRole === 'Admin' || userRole === 'Operator') ? ', agregator' : ''}...`} 
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-full focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition-all text-xs text-slate-800"
                        />
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
            </div>
            <div className="flex overflow-x-auto gap-2 no-scrollbar border-t border-slate-100 pt-4">
            {tabs.map((tab) => {
                const isActive = activeStatusTab === tab.id;
                const count = getCount(tab.statusMap);
                const baseColors =
                    tab.id === 'PENDING'
                        ? isActive
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                            : 'bg-amber-500/60 text-white border-transparent hover:bg-amber-500/80'
                        : tab.id === 'REQUEST_EDIT'
                        ? isActive
                            ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/25'
                            : 'bg-orange-500/60 text-white border-transparent hover:bg-orange-500/80'
                        : tab.id === 'PROCESSING'
                        ? isActive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                            : 'bg-blue-600/60 text-white border-transparent hover:bg-blue-600/80'
                        : tab.id === 'RELEASED'
                        ? isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                            : 'bg-emerald-600/60 text-white border-transparent hover:bg-emerald-600/80'
                        : tab.id === 'REJECTED'
                        ? isActive
                            ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25'
                            : 'bg-red-600/60 text-white border-transparent hover:bg-red-600/80'
                        : isActive
                        ? 'bg-[#aa91cc] text-white border-[#aa91cc] shadow-md shadow-[#aa91cc]/25'
                        : 'bg-[#aa91cc]/60 text-white border-transparent hover:bg-[#aa91cc]/80';
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatusTab(tab.id)}
                        className={`
                            whitespace-nowrap px-4 py-2 rounded-full font-normal text-[10px] transition-all flex items-center gap-2 border
                            ${baseColors}
                        `}
                    >
                        {tab.label}
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border bg-white/20 text-white border-white/30">
                            {count}
                        </span>
                    </button>
                );
            })}
            </div>
        </div>

        {isAdminRoute && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
                        <Music size={16} />
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-orange-900">Cek SoundOn</p>
                        <p className="text-xs font-medium text-orange-600">Mohon Tunggu Login SoundOn Berhasil Baru bisa Mengecek Data Rilis</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {soundOnLoginMessage && (
                        <span className={`max-w-xs text-[10px] font-bold ${soundOnLoggedIn ? 'text-emerald-700' : 'text-red-600'}`}>
                            {soundOnLoginMessage}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={loginSoundOn}
                        disabled={isLoggingInSoundOn || !soundOnUserIdOn}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-5 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title={!soundOnUserIdOn ? 'Simpan User ID dan Password SoundOn di Setting terlebih dahulu' : undefined}
                    >
                        {isLoggingInSoundOn ? <RefreshCw size={13} className="animate-spin" /> : <LogIn size={13} />}
                        {soundOnLoggedIn ? 'Login Berhasil' : 'Login SoundOn'}
                    </button>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto flex-1 bg-white">
                <table className="w-full text-left bg-white">
                    <thead className="bg-[#f1f5f9] border-b-2 border-slate-200">
                        <tr>
                            <ThSortable label="Rilis" sortKey="title" />
                            <ThSortable label="Tipe" sortKey="type" />
                            <ThSortable label="Tanggal Rilis" sortKey="date" />
                            <th className="px-4 py-2 text-[13px] text-slate-500 tracking-wider">Tanggal Submit</th>
                            {isAdminRoute && <ThSortable label="Agregator" sortKey="aggregator" />}
                            <ThSortable label="Status" sortKey="status" />
                            <th className="px-4 py-2 text-[13px] text-slate-500 tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayedReleases.map((release) => {
                            // Determine type
                            const type = (release.tracks || []).length > 1 ? "Album/EP" : "Single";
                            
                            // Date priority: Planned > Original > Submission
                            const displayDateRaw = release.plannedReleaseDate || release.originalReleaseDate || release.submissionDate || "N/A";
                            const status = release.status || "Pending";
                            const ownerName = release.company_name || release.user_full_name || release.owner_name || release.owner || release.created_by || "Pengguna Tidak Dikenal";

                            // Determine color based on status
                            let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                            if (status === 'Live' || status === 'Released') statusClass = "bg-green-100 text-green-700 border-green-200";
                            if (status === 'Processing') statusClass = "bg-blue-100 text-blue-700 border-blue-200";
                            if (status === 'Pending') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                            if (status === 'Request Edit') statusClass = "bg-orange-50 text-orange-600 border-orange-200";
                            if (status === 'Rejected') statusClass = "bg-red-100 text-red-700 border-red-200 cursor-help";

                            // ISRC Logic
                            const isSingle = (release.tracks || []).length === 1;
                            const isrcDisplay = isSingle 
                                ? (release.tracks?.[0]?.isrc || "-") 
                                : ((release.tracks || []).length > 0 ? `${release.tracks.length} Track` : "-");

                            // Rejection Tooltip Logic
                            const rejectionTooltip = status === 'Rejected' && release.rejectionReason 
                                ? `Alasan: ${release.rejectionReason}` 
                                : undefined;

                            return (
                                <tr key={release.id || Math.random()} className="hover:bg-slate-50 transition-colors group text-[13px] bg-white">
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg bg-blue-50 overflow-hidden flex items-center justify-center text-slate-400 relative shrink-0 border border-blue-100`}>
                                                {release.coverArt ? (
                                                    <>
                                                        <img 
                                                            src={(typeof release.coverArt === 'string')
                                                                ? assetUrl(release.coverArt)
                                                                : (release.coverArt instanceof Blob ? URL.createObjectURL(release.coverArt) : '')
                                                            } 
                                                            alt="Art" 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                                                if (fallback) fallback.classList.remove('hidden');
                                                                (e.target as HTMLImageElement).onerror = null;
                                                            }}
                                                        />
                                                        <div className="hidden w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                                            <Disc size={20} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Disc size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-[150px]">
                                                <div className="font-medium text-slate-800 truncate max-w-[200px] text-[13px]" title={release.title}>{release.title || "Rilis Tanpa Judul"}</div>
                                                <div className="text-[13px] text-slate-500 truncate max-w-[200px] font-medium" title={(release.primaryArtists || []).map(a => typeof a === 'string' ? a : a.name).join(', ')}>
                                                    {(release.primaryArtists || []).map(a => typeof a === 'string' ? a : a.name).join(', ') || "Artis Tidak Dikenal"}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                                                    <Users size={10} />
                                                    {ownerName || "-"}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium whitespace-nowrap shadow-sm border ${
                                            type === "Single" 
                                                ? "bg-blue-100 text-blue-700 border-blue-200" 
                                                : "bg-green-100 text-green-700 border-green-200"
                                        }`}>
                                            <Music size={10} />
                                            {getTypeLabel(type)}
                                        </span>
                                    </td>
                                <td className="px-4 py-2 text-[13px] text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            {formatDMY(displayDateRaw)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-[13px] text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-slate-400" />
                                            {release.submissionDate ? formatDMY(release.submissionDate) : 'N/A'}
                                        </div>
                                    </td>
                                     {isAdminRoute && (
                                     <td className="px-4 py-2 text-[13px]">
                                         {release.aggregator ? (
                                             <div>
                                                 {isSoundOnAggregator(release.aggregator) ? (
                                                     <button
                                                          type="button"
                                                          onClick={() => checkSoundOnRelease(release)}
                                                          disabled={soundOnChecks[release.id || release.title]?.status === 'checking' || !soundOnLoggedIn || isFinalReleaseCheck(release)}
                                                          className="flex items-center gap-1 text-[13px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit hover:bg-purple-100 disabled:opacity-60"
                                                          title={
                                                              isFinalReleaseCheck(release)
                                                                  ? 'Status final, tidak perlu dicek ulang'
                                                                  : !soundOnLoggedIn
                                                                  ? 'Login SoundOn dahulu sebelum cek rilis'
                                                                  : 'Cek status rilis di SoundOn'
                                                          }
                                                      >
                                                         {soundOnChecks[release.id || release.title]?.status === 'checking' ? (
                                                             <RefreshCw size={10} className="animate-spin" />
                                                         ) : (
                                                             <Music size={10} />
                                                         )}
                                                         {release.aggregator}
                                                     </button>
                                                 ) : (
                                                     <div className="flex items-center gap-1 text-[13px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">
                                                         <Music size={10} />
                                                         {release.aggregator}
                                                     </div>
                                                 )}
                                                 <SoundOnInfo release={release} />
                                             </div>
                                         ) : (
                                             <span className="text-[13px] text-slate-300 italic">Belum diatur</span>
                                        )}
                                    </td>
                                    )}
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col items-start gap-1">
                                            <span 
                                                title={rejectionTooltip}
                                                className={`inline-block px-2 py-0.5 rounded-full text-[13px] font-medium whitespace-nowrap border ${statusClass}`}
                                            >
                                                {getStatusLabel(status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            {isAdminRoute ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRelease(release)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all text-[14px] font-medium shadow-sm whitespace-nowrap"
                                                    title="Lihat detail singkat"
                                                >
                                                    <Eye size={12} /> Lihat
                                                </button>
                                            ) : (
                                                <Link href={`${routePrefix}/releases/${release.id}/view`}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all text-[14px] font-medium shadow-sm whitespace-nowrap"
                                                    title="Lihat dan Kelola"
                                                >
                                                    <Eye size={12} /> Lihat
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {sortedReleases.length === 0 && (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter size={24} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">{error ? "Koneksi Gagal" : "Data rilis tidak ditemukan"}</h3>
                    <p className="text-slate-400 text-xs">
                        {error 
                            ? "Data rilis belum bisa dimuat. Periksa pesan error di atas."
                            : (activeStatusTab === 'ALL' && searchQuery === ''
                                ? "Belum ada rilis yang dibuat." 
                                : `Tidak ada hasil untuk filter atau pencarian saat ini.`)}
                    </p>
                </div>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="text-[13px] text-slate-500 font-medium">
                    Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} sampai {Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, sortedReleases.length)} dari {sortedReleases.length} data
                </div>
                <div className="flex gap-2">
                     <button onClick={() => setIsViewAll(!isViewAll)} className="px-3 py-1.5 text-[14px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        {isViewAll ? "Tampilkan Per Halaman" : "Lihat Semua"}
                     </button>
                     {!isViewAll && totalPages > 1 && (
                     <div className="flex items-center gap-1">
                         <button
                             onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                             disabled={currentPage === 1}
                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                         >
                             <ChevronLeft size={16} />
                         </button>
                         
                         {Array.from({ length: totalPages }, (_, i) => i + 1)
                             .filter(page => {
                                 const distance = Math.abs(page - currentPage);
                                 return distance < 2 || page === 1 || page === totalPages;
                             })
                             .map((page, index, array) => {
                                 if (index > 0 && page - array[index - 1] > 1) {
                                     return (
                                         <span key={`ellipsis-${page}`} className="w-8 h-8 flex items-center justify-center text-slate-400">...</span>
                                     );
                                 }
                                 return (
                                     <button
                                         key={page}
                                         onClick={() => setCurrentPage(page)}
                                         className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                                             currentPage === page
                                                 ? 'bg-green-500 text-white shadow-md shadow-green-200'
                                                 : 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm'
                                         }`}
                                     >
                                         {page}
                                     </button>
                                 );
                             })}

                         <button
                             onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                             disabled={currentPage === totalPages}
                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                         >
                             <ChevronRight size={16} />
                         </button>
                     </div>
                     )}
                </div>
            </div>
        </div>
        {selectedRelease && isAdminRoute && (
            <>
                <div
                    onClick={() => setSelectedRelease(null)}
                    className="fixed inset-0 z-40 bg-slate-900/20"
                />
                <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detail Rilis Singkat</p>
                            <h2 className="mt-1 text-lg font-black text-slate-900">{selectedRelease.title || 'Rilis Tanpa Judul'}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedRelease(null)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-5 flex justify-center">
                        {getReleaseCover(selectedRelease) ? (
                            <img 
                                src={getReleaseCover(selectedRelease)} 
                                alt="Cover Art" 
                                className="h-40 w-40 rounded-xl border border-slate-100 object-cover shadow-sm"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/assets/placeholder-cover.jpg';
                                    (e.target as HTMLImageElement).onerror = null;
                                }}
                            />
                        ) : (
                            <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300 shadow-sm">
                                <Disc size={38} />
                            </div>
                        )}
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Judul Release</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{selectedRelease.title || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Nama Artis</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{getReleaseArtists(selectedRelease)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-100 p-3">
                                <p className="text-[10px] font-black uppercase text-slate-400">Status Saat Ini</p>
                                <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                    {getStatusLabel(selectedRelease.status)}
                                </span>
                            </div>
                            <div className="rounded-lg border border-slate-100 p-3">
                                <p className="text-[10px] font-black uppercase text-slate-400">Status Aggregator</p>
                                <span className="mt-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                                    {selectedSoundOn?.releaseStatus || selectedSoundOn?.message || '-'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-100 p-3">
                                <p className="text-[10px] font-black uppercase text-slate-400">UPC</p>
                                <p className="mt-1 break-all font-mono text-xs font-bold text-slate-700">{selectedSoundOn?.upc || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 p-3">
                                <p className="text-[10px] font-black uppercase text-slate-400">ISRC</p>
                                <p className="mt-1 break-all font-mono text-xs font-bold text-slate-700">{selectedSoundOn?.isrc || '-'}</p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pengisian Status Rilis</p>
                            <div className="mt-3 space-y-3">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Aggregator</span>
                                    <select
                                        value={aggregatorDraft}
                                        onChange={(event) => setAggregatorDraft(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Belum diatur</option>
                                        <option value="SoundOn">SoundOn</option>
                                        <option value="FUGA">FUGA</option>
                                        <option value="Believe">Believe</option>
                                        <option value="Tunecore">Tunecore</option>
                                        <option value="DistroKid">DistroKid</option>
                                        <option value="CD Baby">CD Baby</option>
                                        <option value="LokaMusik">LokaMusik</option>
                                        <option value="Manual">Manual</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Status</span>
                                    <select
                                        value={statusDraft}
                                        onChange={(event) => setStatusDraft(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="Pending">Menunggu</option>
                                        <option value="Request Edit">Minta Revisi</option>
                                        <option value="Processing">Proses</option>
                                        <option value="Live">Rilis</option>
                                        <option value="Rejected">Ditolak</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase text-slate-500">UPC</span>
                                    <input
                                        value={upcDraft}
                                        onChange={(event) => setUpcDraft(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                                        placeholder="Masukkan UPC"
                                    />
                                </label>
                                {isSelectedAlbum ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-500">ISRC per Track</p>
                                        {selectedTracks.map((track: any, index: number) => (
                                            <label key={track.id || index} className="block rounded-lg border border-slate-200 bg-white p-2">
                                                <span className="text-[11px] font-bold text-slate-700">{index + 1}. {track.title || `Track ${index + 1}`}</span>
                                                <input
                                                    value={trackIsrcDrafts[track.id || index] || ''}
                                                    onChange={(event) => setTrackIsrcDrafts((prev) => ({ ...prev, [track.id || index]: event.target.value }))}
                                                    className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                                                    placeholder="Masukkan ISRC track"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase text-slate-500">ISRC</span>
                                        <input
                                            value={isrcDraft}
                                            onChange={(event) => setIsrcDraft(event.target.value)}
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                                            placeholder="Masukkan ISRC"
                                        />
                                    </label>
                                )}
                                {workflowMessage && (
                                    <p className={`text-xs font-bold ${workflowMessage.includes('berhasil') ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {workflowMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                        <Link
                            href={`${routePrefix}/releases/${selectedRelease.id}/view`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <Eye size={16} /> Lihat Detail
                        </Link>
                        <button
                            type="button"
                            onClick={saveReleaseWorkflow}
                            disabled={isSavingWorkflow}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            {isSavingWorkflow ? <RefreshCw size={16} className="animate-spin" /> : <Edit3 size={16} />}
                            {isSavingWorkflow ? 'Menyimpan...' : 'Ubah Status Rilis'}
                        </button>
                    </div>
                </aside>
            </>
        )}
    </div>
  );
};
