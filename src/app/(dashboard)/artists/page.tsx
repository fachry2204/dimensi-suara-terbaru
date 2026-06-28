"use client";

import React, { useState, useEffect } from 'react';
import { Mic, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/utils/api';
import Link from 'next/link';

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchAndAggregateArtists = async () => {
      try {
        setIsLoading(true);
        const releases = await api.getReleases('');
        const data = Array.isArray(releases) ? releases : [];
        
        // Aggregate artists
        const artistMap = new Map();

        data.forEach((r: any) => {
            const processArtists = (artistList: any[]) => {
                if (!Array.isArray(artistList)) return;
                artistList.forEach(a => {
                    const name = typeof a === 'string' ? a : a?.name;
                    if (!name || name.trim() === '') return;
                    
                    const cleanName = name.trim();
                    const key = cleanName.toLowerCase();
                    
                    if (!artistMap.has(key)) {
                        artistMap.set(key, {
                            name: cleanName,
                            totalReleases: 1,
                            latestRelease: r.submissionDate ? new Date(r.submissionDate) : null,
                            releases: [r.title]
                        });
                    } else {
                        const existing = artistMap.get(key);
                        existing.totalReleases += 1;
                        existing.releases.push(r.title);
                        if (r.submissionDate) {
                            const rDate = new Date(r.submissionDate);
                            if (!existing.latestRelease || rDate > existing.latestRelease) {
                                existing.latestRelease = rDate;
                            }
                        }
                    }
                });
            };

            processArtists(r.primaryArtists);
            processArtists(r.featuringArtists);
        });

        // Convert map to array and sort by total releases (descending)
        const aggregatedArtists = Array.from(artistMap.values()).sort((a, b) => b.totalReleases - a.totalReleases);
        setArtists(aggregatedArtists);
      } catch (error) {
        console.error('Failed to fetch and aggregate artists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndAggregateArtists();
  }, []);

  // Filter & Pagination
  const filteredArtists = artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredArtists.length / ITEMS_PER_PAGE));
  
  // Ensure current page is valid after search
  useEffect(() => {
      if (currentPage > totalPages) {
          setCurrentPage(1);
      }
  }, [searchQuery, totalPages, currentPage]);

  const pagedArtists = filteredArtists.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Data Artis</h1>
            <p className="text-slate-500 mt-1 text-xs">Kelola data artis dan profil musisi berdasarkan rilis Anda.</p>
        </div>
        
        <div className="flex flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-60">
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari artis..." 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition-all text-xs text-slate-800"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100 flex-shrink-0" title="Total Artis">
                <Users size={18} />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
         <div className="overflow-x-auto flex-1">
             <table className="w-full text-left bg-white">
                <thead className="bg-[#f1f5f9] border-b-2 border-slate-200">
                    <tr>
                        <th className="px-4 py-3 text-[13px] font-semibold text-slate-600 tracking-wider w-16">No</th>
                        <th className="px-4 py-3 text-[13px] font-semibold text-slate-600 tracking-wider">Nama Artis</th>
                        <th className="px-4 py-3 text-[13px] font-semibold text-slate-600 tracking-wider text-center">Total Rilis</th>
                        <th className="px-4 py-3 text-[13px] font-semibold text-slate-600 tracking-wider">Rilis Terakhir</th>
                        <th className="px-4 py-3 text-[13px] font-semibold text-slate-600 tracking-wider text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">Memuat data artis...</td>
                        </tr>
                    ) : filteredArtists.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-12 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Mic size={20} className="text-slate-400" />
                                    </div>
                                    <h3 className="text-slate-700 font-bold mb-1">Artis tidak ditemukan</h3>
                                    <p className="text-slate-500 text-xs">Belum ada artis dari data rilis atau pencarian tidak cocok.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        pagedArtists.map((artist, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-slate-500 font-medium">
                                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                            {artist.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-slate-700 text-sm">{artist.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {artist.totalReleases} Rilis
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                                    {artist.latestRelease ? artist.latestRelease.toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    }) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
                                        onClick={() => alert(`Artis: ${artist.name}\nLagu: ${artist.releases.slice(0,5).join(', ')}${artist.releases.length > 5 ? '...' : ''}`)}
                                    >
                                        Detail
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
         </div>
         
         {/* Pagination */}
         {!isLoading && filteredArtists.length > 0 && (
             <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                 <span className="text-xs text-slate-500 font-medium">
                     Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredArtists.length)} dari {filteredArtists.length} artis
                 </span>
                 <div className="flex gap-2">
                     <button className="px-3 py-1.5 text-[14px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        View All
                     </button>
                     <div className="flex items-center gap-1">
                         <button
                             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                             disabled={currentPage === 1}
                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                         >
                             <ChevronLeft size={16} />
                         </button>
                         {Array.from({ length: totalPages }).map((_, i) => i + 1).filter(p => {
                             const distance = Math.abs(p - currentPage);
                             return distance < 2 || p === 1 || p === totalPages;
                         }).map((p, index, array) => {
                             if (index > 0 && p - array[index - 1] > 1) {
                                 return (
                                     <span key={`ellipsis-${p}`} className="w-8 h-8 flex items-center justify-center text-slate-400">...</span>
                                 );
                             }
                             return (
                                 <button
                                     key={p}
                                     onClick={() => setCurrentPage(p)}
                                     className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                                         currentPage === p
                                             ? 'bg-green-500 text-white shadow-md shadow-green-200'
                                             : 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm'
                                     }`}
                                 >
                                     {p}
                                 </button>
                             );
                         })}
                         <button
                             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                             disabled={currentPage === totalPages}
                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                         >
                             <ChevronRight size={16} />
                         </button>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
}
