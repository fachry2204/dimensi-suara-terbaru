"use client";

import React, { useState, useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { api } from '@/utils/api';
import {
  ListMusic, Search, Loader2, Music, Clock, CheckCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Eye, Plus, X, Save
} from 'lucide-react';

interface Song {
  id: number;
  song_id: string;
  title: string;
  performer: string;
  genre: string;
  language: string;
  status: string;
  created_at: string;
  user_email?: string;
  writers?: any;
  [key: string]: any;
}

export default function SongsPage() {
  const { getButtonColor } = useBranding();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    performer: '',
    writerName: '',
    writerRole: 'Composer',
    genre: '',
    language: 'Indonesia',
    duration: '',
    isrc: '',
  });
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchSongs();
  }, []);

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

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateSong = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.performer.trim()) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('performer', form.performer.trim());
      formData.append('writer_name', form.writerName.trim());
      formData.append('writer_role', form.writerRole);
      formData.append('writer_share', '100');
      formData.append('genre', form.genre.trim());
      formData.append('language', form.language.trim() || 'Indonesia');
      formData.append('duration', form.duration || '0');
      formData.append('isrc', form.isrc.trim());
      formData.append('authorized_rights', '100');
      formData.append('region', 'Indonesia');

      await api.publishing.createSong('', formData);
      setShowAddModal(false);
      setForm({
        title: '',
        performer: '',
        writerName: '',
        writerRole: 'Composer',
        genre: '',
        language: 'Indonesia',
        duration: '',
        isrc: '',
      });
      await fetchSongs();
    } catch (err) {
      console.error('Failed to create song:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'Semua' },
    { id: 'pending', label: 'Menunggu' },
    { id: 'review', label: 'Review' },
    { id: 'accepted', label: 'Diterima' },
    { id: 'rejected', label: 'Ditolak' },
  ];

  const filtered = songs.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (s.title || '').toLowerCase().includes(q) ||
      (s.performer || '').toLowerCase().includes(q) ||
      (s.song_id || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const displayed = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock size={12} />, label: 'Menunggu' },
      review: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <Eye size={12} />, label: 'Review' },
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

  const getWriterNames = (writers: any): string => {
    if (!writers) return '-';
    try {
      const parsed = typeof writers === 'string' ? JSON.parse(writers) : writers;
      if (Array.isArray(parsed)) {
        return parsed.map((w: any) => w.name).filter(Boolean).join(', ') || '-';
      }
    } catch { }
    return '-';
  };

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-pink-500">
              <ListMusic size={20} />
            </div>
            Data Lagu
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data lagu dan hak cipta publishing</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 transition-all"
        >
          <Plus size={18} />
          Tambah Lagu
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul, performer, atau ID Lagu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === tab.id
                  ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-pink-50 hover:border-pink-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-70">
                ({tab.id === 'ALL' ? songs.length : songs.filter(s => s.status === tab.id).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500 font-medium">Memuat data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Music size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada data lagu</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">No</th>
                    <th className="text-left px-6 py-3">Judul</th>
                    <th className="text-left px-6 py-3">Performer</th>
                    <th className="text-left px-6 py-3">Pencipta</th>
                    <th className="text-left px-6 py-3">Genre</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((song, i) => (
                    <tr key={song.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-800">{song.title || '-'}</div>
                        {song.song_id && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {song.song_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{song.performer || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">{getWriterNames(song.writers)}</td>
                      <td className="px-6 py-3.5 text-slate-600">{song.genre || '-'}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(song.status)}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">
                        {song.created_at ? new Date(song.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleCreateSong} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Tambah Lagu</h2>
                <p className="text-xs text-slate-500 mt-0.5">Masukkan data dasar lagu publishing.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Judul Lagu *</label>
                <input
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Performer *</label>
                <input
                  value={form.performer}
                  onChange={(e) => handleFormChange('performer', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pencipta</label>
                <input
                  value={form.writerName}
                  onChange={(e) => handleFormChange('writerName', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Peran Pencipta</label>
                <select
                  value={form.writerRole}
                  onChange={(e) => handleFormChange('writerRole', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                >
                  <option value="Composer">Komposer</option>
                  <option value="Lyricist">Penulis Lirik</option>
                  <option value="Composer & Lyricist">Komposer & Penulis Lirik</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Genre</label>
                <input
                  value={form.genre}
                  onChange={(e) => handleFormChange('genre', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bahasa</label>
                <input
                  value={form.language}
                  onChange={(e) => handleFormChange('language', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Durasi Menit</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => handleFormChange('duration', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ISRC</label>
                <input
                  value={form.isrc}
                  onChange={(e) => handleFormChange('isrc', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Lagu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
