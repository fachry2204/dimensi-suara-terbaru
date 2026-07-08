"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
    Music, 
    Clock, 
    AlertTriangle, 
    FileText, 
    MessageSquare, 
    Loader2, 
    ShieldAlert,
    CheckCircle2
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranding } from '@/contexts/BrandingContext';

export default function AdminDashboardPage() {
    const router = useRouter();
    const { getButtonColor } = useBranding();
    
    const [userRole, setUserRole] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isChecking, setIsChecking] = useState(true);
    const [stats, setStats] = useState({
        // Aggregator
        aggregatorTotal: 0,
        aggregatorLive: 0,
        aggregatorPending: 0,
        aggregatorRejected: 0,
        // Publishing
        publishingTotal: 0,
        publishingApproved: 0,
        publishingPending: 0,
        // System
        totalUsers: 0,
        openTickets: 0
    });
    
    const [recentPendingReleases, setRecentPendingReleases] = useState<any[]>([]);
    const [recentTickets, setRecentTickets] = useState<any[]>([]);

    useEffect(() => {
        const checkRoleAndLoadData = async () => {
            try {
                // Fetch profile
                const profileRes = await fetch('/api/auth/me', { credentials: 'include' });
                if (!profileRes.ok) {
                    router.push('/login');
                    return;
                }
                const profile = await profileRes.json();
                const role = profile?.user?.role || profile?.role || '';
                setUserRole(role);

                // If user role is "user", throw 404 not found error
                if (role.toLowerCase() === 'user') {
                    notFound();
                    return;
                }

                setIsChecking(false);

                // If admin/operator, load dashboard stats from real endpoints
                const [releasesData, songsData, ticketsData, usersData] = await Promise.allSettled([
                    api.getReleases(null),
                    api.publishing.getSongs(null),
                    api.tickets.list(null),
                    api.getUsers(null)
                ]);

                // 1. Process Releases
                const releases = releasesData.status === 'fulfilled' && Array.isArray(releasesData.value) 
                    ? releasesData.value 
                    : [];
                const aggregatorTotal = releases.length;
                const aggregatorLive = releases.filter((r: any) => r.status === 'Live' || r.status === 'Released').length;
                const aggregatorPending = releases.filter((r: any) => (r.status || 'Pending') === 'Pending').length;
                const aggregatorRejected = releases.filter((r: any) => r.status === 'Rejected').length;
                
                // Get top 4 pending releases
                const pendingList = releases
                    .filter((r: any) => (r.status || 'Pending') === 'Pending')
                    .slice(0, 4);
                setRecentPendingReleases(pendingList);

                // 2. Process Songs
                const songs = songsData.status === 'fulfilled' && Array.isArray(songsData.value)
                    ? songsData.value
                    : [];
                const publishingTotal = songs.length;
                const publishingApproved = songs.filter((s: any) => s.status === 'Approved' || s.status === 'Active' || !s.status).length;
                const publishingPending = songs.filter((s: any) => s.status === 'Pending').length;

                // 3. Process Tickets
                const tickets = ticketsData.status === 'fulfilled' 
                    ? (Array.isArray(ticketsData.value) ? ticketsData.value : (ticketsData.value?.tickets || []))
                    : [];
                const openTickets = tickets.filter((t: any) => t.status === 'Open' || t.status === 'Pending').length;
                setRecentTickets(tickets.slice(0, 4));

                // 4. Process Users
                const users = usersData.status === 'fulfilled' && Array.isArray(usersData.value)
                    ? usersData.value
                    : [];
                const totalUsers = users.length;

                setStats({
                    aggregatorTotal,
                    aggregatorLive,
                    aggregatorPending,
                    aggregatorRejected,
                    publishingTotal,
                    publishingApproved,
                    publishingPending,
                    totalUsers,
                    openTickets
                });

            } catch (err) {
                console.warn('Failed to load admin stats:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkRoleAndLoadData();
    }, [router]);

    if (isChecking || isLoading) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50/50">
                <Loader2 size={36} className="animate-spin text-slate-400" />
                <span className="mt-3 text-slate-500 font-medium text-sm">Memuat Dashboard Admin...</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-8 bg-slate-50/20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                    <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                        <ShieldAlert size={20} />
                    </div>
                    <span>Dashboard Panel Admin</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">Halaman ringkasan status rilis aggregator, katalog publishing, tiket bantuan, dan data pengguna</p>
            </div>

            {/* SECTION 1: STATUS AGGREGATOR */}
            <div className="space-y-4">
                <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Music size={16} /> Status Agregator (Rilis Lagu)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Rilis', value: stats.aggregatorTotal, icon: <Music size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' },
                        { label: 'Rilis Live/Released', value: stats.aggregatorLive, icon: <CheckCircle2 size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' },
                        { label: 'Pending Review', value: stats.aggregatorPending, icon: <Clock size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
                        { label: 'Rilis Ditolak', value: stats.aggregatorRejected, icon: <AlertTriangle size={20} />, bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600' },
                    ].map((card, i) => (
                        <div key={i} className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between border-slate-100`}>
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{card.label}</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">{card.value}</h3>
                            </div>
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.bg.split(' ')[0]} ${card.bg.split(' ')[2]}`}>
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: STATUS PUBLISHING */}
            <div className="space-y-4">
                <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} /> Status Publishing (Hak Cipta & Pencipta)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Karya Musik', value: stats.publishingTotal, icon: <FileText size={20} />, bg: 'bg-pink-500/10 border-pink-500/20 text-pink-600' },
                        { label: 'Karya Disetujui (Aktif)', value: stats.publishingApproved, icon: <CheckCircle2 size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' },
                        { label: 'Klaim Baru (Pending)', value: stats.publishingPending, icon: <Clock size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
                    ].map((card, i) => (
                        <div key={i} className={`bg-white rounded-3xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between border-slate-100`}>
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{card.label}</p>
                                <h3 className="text-2xl font-extrabold text-slate-800">{card.value}</h3>
                            </div>
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.bg.split(' ')[0]} ${card.bg.split(' ')[2]}`}>
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 3: SYSTEM OVERVIEW (USERS & TICKETS) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
                {/* Pending Approvals Table */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" />
                            Persetujuan Rilis Pending ({recentPendingReleases.length})
                        </h3>
                        <button 
                            onClick={() => router.push('/releases')} 
                            className="text-xs font-bold text-blue-600 hover:underline"
                        >
                            Kelola Rilis
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 flex-1">
                        {recentPendingReleases.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                Tidak ada pengajuan rilis pending
                            </div>
                        ) : (
                            recentPendingReleases.map((release) => (
                                <div key={release.id} className="py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-bold text-xs text-slate-850 line-clamp-1">{release.title}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Artis: {release.artist_name || 'Tidak diketahui'} • {release.type || 'Single'}</p>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        Review
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Open Tickets */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={16} className="text-blue-500" />
                            Tiket Bantuan Masuk ({stats.openTickets})
                        </h3>
                        <button 
                            onClick={() => router.push('/tickets')} 
                            className="text-xs font-bold text-blue-600 hover:underline"
                        >
                            Kelola Tiket
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 flex-1">
                        {recentTickets.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                Tidak ada tiket masuk
                            </div>
                        ) : (
                            recentTickets.map((ticket) => (
                                <div key={ticket.id} className="py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-bold text-xs text-slate-850 line-clamp-1">{ticket.subject}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Oleh: {ticket.user_name || 'User'} • Kategori: {ticket.category}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        ticket.status === 'Closed' 
                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                        {ticket.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
