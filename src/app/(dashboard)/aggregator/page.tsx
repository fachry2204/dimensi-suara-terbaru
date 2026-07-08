"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';
import { ReleaseData } from '@/types';
import { 
    Clock, 
    Loader2, 
    CheckCircle, 
    AlertTriangle, 
    Music, 
    ListMusic,
    Plus
} from 'lucide-react';
import { api } from '@/utils/api';

export default function DashboardPage() {

  const [releases, setReleases] = useState<ReleaseData[]>([]);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const data = await api.getReleases('');
        setReleases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch releases', err);
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

  return (
    <div className="p-4 md:p-8 w-full max-w-none min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
            <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
              <Music size={20} />
            </div>
            <span>Dashboard Agregator</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola rilis lagu, data artis, dan laporan aggregator Anda</p>
        </div>
        <div>
          <button 
              onClick={() => router.push('/new-release')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              style={{ background: getButtonColor() }}
          >
              <Plus size={16} />
              Rilis Baru
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {[
          { label: 'Total Rilis', value: releases.length, icon: <Music size={20} />, cardClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700', iconBg: 'bg-indigo-500/20', sub: 'Semua rilis katalog' },
          { label: 'Menunggu', value: releaseStats.pending, icon: <Clock size={20} />, cardClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700', iconBg: 'bg-amber-500/20', sub: 'Menunggu review' },
          { label: 'Diproses', value: releaseStats.processing, icon: <Loader2 size={20} className={releaseStats.processing > 0 ? "animate-spin" : ""} />, cardClass: 'bg-blue-500/10 border-blue-500/20 text-blue-700', iconBg: 'bg-blue-500/20', sub: 'Dikirim ke store' },
          { label: 'Rilis', value: releaseStats.live, icon: <CheckCircle size={20} />, cardClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700', iconBg: 'bg-emerald-500/20', sub: 'Aktif di DSP' },
          { label: 'Ditolak', value: releaseStats.rejected, icon: <AlertTriangle size={20} />, cardClass: 'bg-rose-500/10 border-rose-500/20 text-rose-700', iconBg: 'bg-rose-500/20', sub: 'Perlu diperiksa' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between ${stat.cardClass.split(' ').slice(0, 2).join(' ')}`}>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-2xl font-extrabold text-slate-800">
                {stat.value}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">{stat.sub}</p>
            </div>
            <div 
              className={`rounded-2xl flex items-center justify-center ${stat.iconBg} ${stat.cardClass.split(' ')[2]}`}
              style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
            >
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Releases Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-10">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ListMusic size={18} style={{ color: getButtonColor() }} />
            Rilis Menunggu/Review
          </h2>
          <Link href="/releases" className="text-sm font-semibold hover:underline" style={{ color: getButtonColor() || '#aa91cc' }}>
            Lihat Semua →
          </Link>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                    <tr>
                        <th className="text-left px-6 py-3 w-12">No</th>
                        <th className="text-left px-6 py-3">Judul</th>
                        <th className="text-left px-6 py-3">Artis</th>
                        <th className="text-left px-6 py-3">Tanggal</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-right px-6 py-3">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {pagedPending.length === 0 ? (
                        <tr>
                            <td className="px-6 py-6 text-center text-slate-500 text-sm" colSpan={6}>Tidak ada data</td>
                        </tr>
                    ) : (
                        pagedPending.map((r, idx) => (
                            <tr key={String(r.id)} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{(pendingPage - 1) * pageSize + idx + 1}</td>
                                <td className="px-6 py-3.5 font-semibold text-slate-800">{r.title}</td>
                                <td className="px-6 py-3.5 text-slate-600">
                                    {Array.isArray(r.primaryArtists) ? r.primaryArtists.map(a => typeof a === 'string' ? a : a.name).join(', ') : ''}
                                </td>
                                <td className="px-6 py-3.5 text-xs text-slate-500">
                                    {r.submissionDate ? new Date(r.submissionDate).toLocaleDateString('id-ID') : '-'}
                                </td>
                                <td className="px-6 py-3.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${r.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {r.status === 'Pending' ? 'Menunggu' : r.status === 'Review' ? 'Review' : r.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                    <Link href={`/releases/${r.id}/view`}
                                        className="px-4 py-2 text-xs text-white rounded-full transition-all inline-block font-semibold"
                                        style={{ background: getButtonColor() }}
                                    >
                                        Lihat
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium font-sans">Halaman {pendingPage} dari {totalPendingPages}</div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setPendingPage(Math.max(1, pendingPage - 1))}
                    disabled={pendingPage === 1}
                    className="px-4 py-2 text-xs text-white rounded-full disabled:opacity-50 disabled:bg-slate-300 font-bold transition-colors"
                    style={{ background: getButtonColor() }}
                >
                    Sebelumnya
                </button>
                {Array.from({ length: totalPendingPages })
                    .map((_, i) => i + 1)
                    .filter(page => {
                        if (totalPendingPages <= 5) return true;
                        const start = Math.max(1, Math.min(pendingPage - 2, totalPendingPages - 4));
                        const end = start + 4;
                        return page >= start && page <= end;
                    })
                    .map((page) => (
                    <button
                        key={page}
                        onClick={() => setPendingPage(page)}
                        className={`px-3.5 py-2 text-xs rounded-full font-bold transition-all ${
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
                    className="px-4 py-2 text-xs text-white rounded-full disabled:opacity-50 disabled:bg-slate-300 font-bold transition-colors"
                    style={{ background: getButtonColor() }}
                >
                    Berikutnya
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
