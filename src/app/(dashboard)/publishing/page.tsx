"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';
import { api } from '@/utils/api';
import {
  Music, UserPlus, Clock, CheckCircle, AlertTriangle, Loader2, 
  FileText, Plus, ListMusic, Eye
} from 'lucide-react';

interface Song {
  id: number;
  title: string;
  artist_name: string;
  status: string;
  created_at: string;
  user_email?: string;
  [key: string]: any;
}

export default function PublishingPage() {
  const pathname = usePathname();
  const { getButtonColor } = useBranding();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await api.publishing.getSongs('');
        setSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch songs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const stats = {
    pending: songs.filter(s => s.status === 'pending').length,
    review: songs.filter(s => s.status === 'review').length,
    accepted: songs.filter(s => s.status === 'accepted').length,
    rejected: songs.filter(s => s.status === 'rejected').length,
    total: songs.length,
  };

  const recentSongs = songs.slice(0, 10);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock size={12} />, label: 'Menunggu' },
      review: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <Loader2 size={12} />, label: 'Review' },
      accepted: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle size={12} />, label: 'Diterima' },
      rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <AlertTriangle size={12} />, label: 'Ditolak' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 p-2">
      {pathname?.startsWith('/admin') && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 w-fit"
        >
          ← Menuju Dashboard
        </Link>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
            <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
              <FileText size={20} />
            </div>
            <span>Dashboard Publishing</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data pencipta dan lagu publishing</p>
        </div>
        <div className="flex gap-3">
          <Link href="/publishing/writer" className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-[#aa91cc]/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: getButtonColor() || '#aa91cc' }}>
            <UserPlus size={16} />
            Data Pencipta
          </Link>
          <Link href="/publishing/songs" className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: '#7c3aed' }}>
            <ListMusic size={16} />
            Data Lagu
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Lagu', value: stats.total, icon: <Music size={20} />, cardClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700', iconBg: 'bg-indigo-500/20', sub: 'Semua data lagu' },
          { label: 'Menunggu', value: stats.pending, icon: <Clock size={20} />, cardClass: 'bg-amber-500/10 border-amber-500/20 text-amber-700', iconBg: 'bg-amber-500/20', sub: 'Menunggu review' },
          { label: 'Review', value: stats.review, icon: <Loader2 size={20} />, cardClass: 'bg-blue-500/10 border-blue-500/20 text-blue-700', iconBg: 'bg-blue-500/20', sub: 'Sedang diperiksa' },
          { label: 'Diterima', value: stats.accepted, icon: <CheckCircle size={20} />, cardClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700', iconBg: 'bg-emerald-500/20', sub: 'Diterima publishing' },
          { label: 'Ditolak', value: stats.rejected, icon: <AlertTriangle size={20} />, cardClass: 'bg-rose-500/10 border-rose-500/20 text-rose-700', iconBg: 'bg-rose-500/20', sub: 'Perlu diperbaiki' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between ${stat.cardClass.split(' ').slice(0, 2).join(' ')}`}>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-2xl font-extrabold text-slate-800">
                {isLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : stat.value}
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

      {/* Recent Songs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ListMusic size={18} style={{ color: getButtonColor() }} />
            Lagu Terbaru
          </h2>
          <Link href="/publishing/songs" className="text-sm font-semibold hover:underline" style={{ color: '#aa91cc' }}>
            Lihat Semua →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500 font-medium">Memuat data...</span>
          </div>
        ) : recentSongs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Music size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada data lagu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="text-left px-6 py-3">No</th>
                  <th className="text-left px-6 py-3">Judul Lagu</th>
                  <th className="text-left px-6 py-3">Artis</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSongs.map((song, i) => (
                  <tr key={song.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{song.title || '-'}</td>
                    <td className="px-6 py-3.5 text-slate-600">{song.artist_name || '-'}</td>
                    <td className="px-6 py-3.5">{getStatusBadge(song.status)}</td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
                      {song.created_at ? new Date(song.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
