"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Filter, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  type: string;
  company_name: string | null;
  full_name: string | null;
  status: string;
  created_at: string;
  account_type: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(q) ||
      (user.company_name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.username || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const displayedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-blue-600" size={28} />
              User Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">Kelola data pengguna, hak akses, dan status akun.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari berdasarkan nama, email, atau username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider w-16">ID</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-[13px] font-bold text-slate-600 uppercase tracking-wider">Terdaftar</th>
                  <th className="px-6 py-4 text-right text-[13px] font-bold text-slate-600 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : displayedUsers.length > 0 ? (
                  displayedUsers.map((user) => {
                    const displayName = user.company_name || user.full_name || user.username;
                    
                    let statusClass = "bg-gray-100 text-gray-600 border-gray-200";
                    if (user.status === 'Active' || user.status === 'Approved') statusClass = "bg-green-100 text-green-700 border-green-200";
                    if (user.status === 'Pending' || user.status === 'Review') statusClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                    if (user.status === 'Rejected' || user.status === 'Blocked' || user.status === 'Inactive') statusClass = "bg-red-100 text-red-700 border-red-200";
                    
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 text-[13px] text-slate-500">#{user.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{displayName}</div>
                          <div className="text-[12px] text-slate-500 mt-0.5">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-slate-600">
                          {user.account_type || user.type || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[12px] font-bold border ${statusClass}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-slate-500">
                          {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Filter size={20} className="text-slate-400" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">Tidak ada user ditemukan</h3>
                      <p className="text-xs text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && filteredUsers.length > 0 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="text-[13px] text-slate-500 font-medium">
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} dari {filteredUsers.length} user
              </div>
              
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
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
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
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                     </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
