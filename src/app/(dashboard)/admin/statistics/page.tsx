"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
    BarChart3, 
    TrendingUp, 
    Music, 
    Users, 
    DollarSign,
    Award, 
    ArrowUpRight, 
    Calendar,
    Loader2
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AdminStatisticsPage() {
    const { getButtonColor } = useBranding();
    const [isLoading, setIsLoading] = useState(true);
    const [isChecking, setIsChecking] = useState(true);
    
    useEffect(() => {
        const checkRole = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    notFound();
                    return;
                }
                const data = await res.json();
                const role = data?.user?.role || data?.role || '';
                if (role.toLowerCase() !== 'admin') {
                    notFound();
                    return;
                }
            } catch {
                notFound();
                return;
            }
            setIsChecking(false);
            const timer = setTimeout(() => setIsLoading(false), 800);
            return () => clearTimeout(timer);
        };
        checkRole();
    }, []);

    if (isChecking) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 min-h-screen bg-slate-50/50">
                <Loader2 size={36} className="animate-spin text-slate-400" />
            </div>
        );
    }

    // Simulated Admin Stats
    const totalEarnings = "Rp 348.120.000";
    const totalStreams = "14,845,920";
    const activeUsers = "40 Pengguna";
    const liveReleases = "55 Rilis Aktif";

    // ApexCharts configs
    const adminChartOptions = {
        chart: {
            id: 'admin-trends',
            toolbar: { show: false },
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        colors: ['#7c3aed', '#ec4899'],
        stroke: {
            curve: 'smooth' as const,
            width: 3
        },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            labels: { style: { colors: '#64748b' } }
        },
        yaxis: {
            labels: { style: { colors: '#64748b' } }
        },
        grid: {
            borderColor: '#f1f5f9'
        }
    };

    const adminChartSeries = [
        {
            name: 'Pendapatan Agregator',
            data: [15000000, 18000000, 22000000, 26000000, 31000000, 34000000, 39000000, 42000000, 48000000, 52000000, 58000000, 64000000]
        },
        {
            name: 'Pendapatan Publishing',
            data: [8000000, 11000000, 13000000, 15000000, 18000000, 21000000, 24000000, 27000000, 31000000, 35000000, 39000000, 44000000]
        }
    ];

    const sourceChartOptions = {
        chart: {
            id: 'admin-sources',
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        labels: ['Spotify', 'Apple Music', 'YouTube Music', 'RBT/Telco', 'Lainnya'],
        colors: ['#1db954', '#fc3c44', '#ff0000', '#aa91cc', '#64748b'],
        legend: {
            position: 'bottom' as const
        }
    };

    const sourceChartSeries = [52, 21, 15, 8, 4];

    const topEarners = [
        { name: "Arka Genta", type: "Artis & Komposer", aggregator: "Rp 42.900.000", publishing: "Rp 15.520.000", total: "Rp 58.420.000" },
        { name: "Tiara Kirana", type: "Artis & Komposer", aggregator: "Rp 28.150.000", publishing: "Rp 8.470.000", total: "Rp 36.620.000" },
        { name: "Dewa Wisnu", type: "Penyanyi", aggregator: "Rp 19.400.000", publishing: "Rp 0", total: "Rp 19.400.000" },
        { name: "Monolog Band", type: "Grup Musik", aggregator: "Rp 12.800.000", publishing: "Rp 3.080.000", total: "Rp 15.880.000" }
    ];

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                        <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                            <BarChart3 size={20} />
                        </div>
                        <span>Statistik Laporan Global (Admin)</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Pantau analitik omset, pemutaran streaming, rilis aktif, dan pengguna platform</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat statistik global...</span>
                </div>
            ) : (
                <>
                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Omset Royalti', value: totalEarnings, icon: <DollarSign size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', sub: 'Omset kotor platform' },
                            { label: 'Total Pemutaran', value: totalStreams, icon: <Music size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', sub: 'Akumulasi streams' },
                            { label: 'Rilis Live/Released', value: liveReleases, icon: <Award size={20} />, bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600', sub: 'Katalog rilis live' },
                            { label: 'Pengguna Aktif', value: activeUsers, icon: <Users size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', sub: 'Pencipta & label terdaftar' },
                        ].map((stat, i) => (
                            <div key={i} className={`bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between`}>
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-extrabold text-slate-800">{stat.value}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{stat.sub}</p>
                                </div>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.bg.split(' ')[0]} ${stat.bg.split(' ')[2]}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Perbandingan Pendapatan Layanan</h3>
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full">
                                    <Calendar size={12} /> Jan - Des 2026
                                </span>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <Chart options={adminChartOptions} series={adminChartSeries} type="area" height={320} />
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Sumber Royalti Terbanyak</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <Chart options={sourceChartOptions} series={sourceChartSeries} type="donut" width={300} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Top Earners Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp size={18} style={{ color: getButtonColor() }} />
                                Kreator Terlaris Bulan Ini
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                        <th className="text-left px-6 py-4 w-12">No</th>
                                        <th className="text-left px-6 py-4">Nama Pengguna</th>
                                        <th className="text-left px-6 py-4">Klasifikasi</th>
                                        <th className="text-left px-6 py-4">Royalti Agregator</th>
                                        <th className="text-left px-6 py-4">Royalti Publishing</th>
                                        <th className="text-right px-6 py-4">Total Royalti</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topEarners.map((earner, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{i + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-850">{earner.name}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{earner.type}</td>
                                            <td className="px-6 py-4 text-slate-650 font-semibold">{earner.aggregator}</td>
                                            <td className="px-6 py-4 text-slate-650 font-semibold">{earner.publishing}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-white px-3 py-1 rounded-full" style={{ background: getButtonColor() }}>
                                                    {earner.total} <ArrowUpRight size={12} />
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
