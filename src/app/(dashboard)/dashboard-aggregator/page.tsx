"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';
import { ReleaseData } from '@/types';
import { 
    LayoutDashboard, 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    FileText,
    Plus
} from 'lucide-react';
import { api } from '@/utils/api';



interface Song {
    status: 'pending' | 'review' | 'accepted' | 'rejected';
    [key: string]: any;
}

export default function DashboardPage() {

  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const data = await api.getReleases('');
        setReleases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch releases', err);
      }
    };
    fetchReleases();
  }, []);

  const router = useRouter();
  const { getButtonColor } = useBranding();
  const [pendingPage, setPendingPage] = useState(1);
  const pageSize = 5;

  // Calculate Release Stats
  const releaseStats = {
    pending: releases.filter(r => (r.status || 'Pending') === 'Pending').length,
    processing: releases.filter(r => r.status === 'Processing').length,
    live: releases.filter(r => r.status === 'Live' || r.status === 'Released').length,
    rejected: releases.filter(r => r.status === 'Rejected').length,
  };

  const pendingList = releases.filter(r => r.status === 'Pending' || r.status === 'Review');
  const totalPendingPages = Math.max(1, Math.ceil(pendingList.length / pageSize));
  const pagedPending = pendingList.slice((pendingPage - 1) * pageSize, (pendingPage - 1) * pageSize + pageSize);

  useEffect(() => {
    if (pendingPage > totalPendingPages) {
      setPendingPage(1);
    }
  }, [releases]);

  const StatCard = ({ title, count, icon, colorClass, bgClass, subtext, cardClass, isLoading }: any) => (
    <div className={`p-5 rounded-2xl shadow-sm border border-brand-border flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md ${cardClass || 'bg-brand-card'}`}>
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800">
                {isLoading ? <Loader2 className="animate-spin h-6 w-6 text-slate-400" /> : count}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">{subtext}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgClass} ${colorClass}`}>
            {icon}
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
        <div className="mb-8">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
            <p className="text-slate-500 mt-1 text-xs">Welcome back, here is your catalog and publishing overview.</p>
       </div>

       {/* AGGREGATOR / RELEASES SECTION */}
       <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Music className="text-blue-500" size={18} />
                    <h2 className="text-sm font-bold text-slate-700">Aggregator Status</h2>
                </div>
                <button 
                    onClick={() => router.push('/new-release')}
                    className="flex items-center gap-2 px-3 py-1.5 text-white rounded-lg shadow-sm hover:opacity-90 transition-all text-xs font-bold"
                    style={{ backgroundColor: getButtonColor() }}
                >
                    <Plus size={14} />
                    New Release
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Pending Review" 
                    count={releaseStats.pending} 
                    icon={<Clock size={20} />} 
                    colorClass="text-yellow-600" 
                    bgClass="bg-yellow-50"
                    subtext="Waiting for approval"
                    cardClass="bg-yellow-500/10 border-yellow-500/20"
                />
                <StatCard 
                    title="Processing" 
                    count={releaseStats.processing} 
                    icon={<Loader2 size={20} className={releaseStats.processing > 0 ? "animate-spin-slow" : ""} />} 
                    colorClass="text-blue-600" 
                    bgClass="bg-blue-50"
                    subtext="Sent to stores"
                    cardClass="bg-blue-500/10 border-blue-500/20"
                />
                <StatCard 
                    title="Released" 
                    count={releaseStats.live} 
                    icon={<CheckCircle size={20} />} 
                    colorClass="text-green-600" 
                    bgClass="bg-green-50"
                    subtext="Active on DSPs"
                    cardClass="bg-green-500/10 border-green-500/20"
                />
                <StatCard 
                    title="Rejected" 
                    count={releaseStats.rejected} 
                    icon={<AlertTriangle size={20} />} 
                    colorClass="text-red-600" 
                    bgClass="bg-red-50"
                    subtext="Requires attention"
                    cardClass="bg-red-500/10 border-red-500/20"
                />
            </div>
       </div>

            <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Clock className="text-blue-500" size={18} />
                        <h3 className="text-sm font-bold text-slate-700">Release Pending/Review</h3>
                    </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider w-12">No</th>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider">Judul</th>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider">Artist</th>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-normal text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagedPending.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-6 text-center text-slate-500 text-sm" colSpan={6}>Tidak ada data</td>
                                </tr>
                            ) : (
                                pagedPending.map((r, idx) => (
                                    <tr key={String(r.id)} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                        <td className="px-4 py-3 text-xs text-slate-500">{(pendingPage - 1) * pageSize + idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-normal text-slate-800">{r.title}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-slate-600">
                                                {Array.isArray(r.primaryArtists) ? r.primaryArtists.map(a => typeof a === 'string' ? a : a.name).join(', ') : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{r.submissionDate ? new Date(r.submissionDate).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${r.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/releases/${r.id}/view`}
                                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-block font-normal"
                                            >
                                                Lihat
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50/50">
                        <div className="text-xs text-slate-500">Halaman {pendingPage} dari {totalPendingPages}</div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPendingPage(Math.max(1, pendingPage - 1))}
                                disabled={pendingPage === 1}
                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 font-bold hover:bg-blue-600 transition-colors"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPendingPages })
                                .map((_, i) => i + 1)
                                .filter(page => {
                                    // Show first 5 pages or range around current
                                    if (totalPendingPages <= 5) return true;
                                    const start = Math.max(1, Math.min(pendingPage - 2, totalPendingPages - 4));
                                    const end = start + 4;
                                    return page >= start && page <= end;
                                })
                                .map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setPendingPage(page)}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
                                        pendingPage === page 
                                            ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' 
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setPendingPage(Math.min(totalPendingPages, pendingPage + 1))}
                                disabled={pendingPage === totalPendingPages}
                                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-300 font-bold hover:bg-blue-600 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
    </div>
  );
};
