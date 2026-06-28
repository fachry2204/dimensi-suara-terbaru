"use client";

import React, { useState, useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import {
  UserPlus, Search, Loader2, User, Phone, CreditCard, MapPin,
  Edit, Trash2, Plus, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Writer {
  id: number;
  name: string;
  nik: string;
  birth_place: string;
  birth_date: string;
  address: string;
  nationality: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp_number: string;
  ktp_path: string;
  npwp_path: string;
  created_at: string;
  [key: string]: any;
}

export default function WriterPage() {
  const { getButtonColor } = useBranding();
  const [writers, setWriters] = useState<Writer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchWriters();
  }, []);

  const fetchWriters = async () => {
    try {
      const res = await fetch('/api/publishing/creators', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWriters(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch writers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = writers.filter(w => {
    const q = searchQuery.toLowerCase();
    return (
      (w.name || '').toLowerCase().includes(q) ||
      (w.nik || '').includes(q) ||
      (w.whatsapp_number || '').includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const displayed = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor() }}>
              <UserPlus size={20} />
            </div>
            Data Pencipta
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data pencipta lagu (komposer/penulis)</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIK, atau nomor WA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
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
            <User size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada data pencipta</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">No</th>
                    <th className="text-left px-6 py-3">Nama</th>
                    <th className="text-left px-6 py-3">NIK</th>
                    <th className="text-left px-6 py-3">No. WhatsApp</th>
                    <th className="text-left px-6 py-3">Bank</th>
                    <th className="text-left px-6 py-3">No. Rekening</th>
                    <th className="text-left px-6 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((w, i) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <User size={14} />
                          </div>
                          <span className="font-semibold text-slate-800">{w.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">{w.nik || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{w.whatsapp_number || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600">{w.bank_name || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">{w.bank_account_number || '-'}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString('id-ID') : '-'}
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
    </div>
  );
}
