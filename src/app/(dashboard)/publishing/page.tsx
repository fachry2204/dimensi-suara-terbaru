"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const { getButtonColor } = useBranding();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await api.publishing.getSongs('');
        setSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch songs:', err);
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
      pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock size={12} />, label: 'Pending' },
      review: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <Loader2 size={12} />, label: 'Review' },
      accepted: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle size={12} />, label: 'Accepted' },
      rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <AlertTriangle size={12} />, label: 'Rejected' },
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor() }}>
              <FileText size={20} />
            </div>
            Dashboard Publishing
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data pencipta dan lagu publishing</p>
        </div>
        <div className="flex gap-3">
          <Link href="/publishing/writer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: getButtonColor() }}>
            <UserPlus size={16} />
            Data Pencipta
          </Link>
          <Link href="/publishing/songs" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg bg-pink-500 hover:bg-pink-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <ListMusic size={16} />
            Data Lagu
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Lagu', value: stats.total, icon: <Music size={20} />, color: 'from-indigo-500 to-purple-600', bgLight: 'bg-indigo-50' },
          { label: 'Pending', value: stats.pending, icon: <Clock size={20} />, color: 'from-amber-400 to-orange-500', bgLight: 'bg-amber-50' },
          { label: 'Review', value: stats.review, icon: <Loader2 size={20} />, color: 'from-blue-400 to-cyan-500', bgLight: 'bg-blue-50' },
          { label: 'Accepted', value: stats.accepted, icon: <CheckCircle size={20} />, color: 'from-emerald-400 to-teal-500', bgLight: 'bg-emerald-50' },
          { label: 'Rejected', value: stats.rejected, icon: <AlertTriangle size={20} />, color: 'from-red-400 to-rose-500', bgLight: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {isLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : stat.value}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Songs Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ListMusic size={18} className="text-pink-500" />
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
