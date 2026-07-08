"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
    BarChart3, 
    TrendingUp, 
    Music, 
    Globe, 
    Tv, 
    ArrowUpRight, 
    Calendar,
    Loader2
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

// Import ApexCharts dynamically to prevent Next.js SSR error
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AggregatorStatisticsPage() {
    const { getButtonColor } = useBranding();
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Simulated Analytics Data
    const totalStreams = "1,845,920";
    const monthlyGrowth = "+12.4%";
    const totalEarnings = "Rp 42.180.500";
    
    // ApexCharts Configurations
    const streamChartOptions = {
        chart: {
            id: 'stream-trends',
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        colors: ['#7c3aed', '#3b82f6'],
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
        },
        legend: {
            position: 'top' as const,
            horizontalAlign: 'right' as const
        }
    };

    const streamChartSeries = [
        {
            name: 'Spotify Streams',
            data: [120000, 150000, 140000, 190000, 220000, 250000, 280000, 270000, 310000, 340000, 390000, 420000]
        },
        {
            name: 'Apple Music Streams',
            data: [50000, 70000, 65000, 85000, 95000, 110000, 115000, 125000, 140000, 155000, 170000, 190000]
        }
    ];

    const dspChartOptions = {
        chart: {
            id: 'dsp-distribution',
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        labels: ['Spotify', 'Apple Music', 'YouTube Music', 'Resso', 'Lainnya'],
        colors: ['#1db954', '#fc3c44', '#ff0000', '#f43f5e', '#64748b'],
        legend: {
            position: 'bottom' as const
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: { width: 200 },
                legend: { position: 'bottom' }
            }
        }]
    };

    const dspChartSeries = [58, 22, 12, 5, 3];

    const topTracks = [
        { title: "Melodi Senja", artist: "Arka Genta", streams: "482,900", share: "26.1%" },
        { title: "Sajak Hujan", artist: "Arka Genta", streams: "320,150", share: "17.3%" },
        { title: "Langkah Pasti", artist: "Tiara Kirana", streams: "295,400", share: "16.0%" },
        { title: "Matahari Pagi", artist: "Tiara Kirana", streams: "190,800", share: "10.3%" },
        { title: "Ruang Rindu (Cover)", artist: "Dewa Wisnu", streams: "124,500", share: "6.7%" }
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
                        <span>Statistik Agregator</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Pantau tren pemutaran musik dan analitik platform streaming Anda</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat statistik...</span>
                </div>
            ) : (
                <>
                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Pemutaran (Streams)', value: totalStreams, icon: <Music size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', sub: 'Akumulasi seluruh DSP' },
                            { label: 'Pertumbuhan Bulan Ini', value: monthlyGrowth, icon: <TrendingUp size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', sub: 'Dibanding bulan lalu' },
                            { label: 'Estimasi Royalti Kasar', value: totalEarnings, icon: <Globe size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', sub: 'Sebelum pemotongan' },
                        ].map((stat, i) => (
                            <div key={i} className={`rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between ${stat.bg.split(' ').slice(0, 2).join(' ')}`}>
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">{stat.label}</p>
                                    <h3 className="text-3xl font-extrabold text-slate-800">{stat.value}</h3>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">{stat.sub}</p>
                                </div>
                                <div className={`rounded-2xl flex items-center justify-center ${stat.bg.split(' ')[0]} ${stat.bg.split(' ')[2]}`} style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                    {stat.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Tren Pemutaran 12 Bulan Terakhir</h3>
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full">
                                    <Calendar size={12} /> Jan - Des 2026
                                </span>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <Chart options={streamChartOptions} series={streamChartSeries} type="area" height={320} />
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Distribusi Store/DSP</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <Chart options={dspChartOptions} series={dspChartSeries} type="donut" width={300} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Top Tracks Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp size={18} style={{ color: getButtonColor() }} />
                                Lagu Terpopuler Anda
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                        <th className="text-left px-6 py-4 w-12">No</th>
                                        <th className="text-left px-6 py-4">Judul Lagu</th>
                                        <th className="text-left px-6 py-4">Artis Utama</th>
                                        <th className="text-left px-6 py-4">Total Streams</th>
                                        <th className="text-left px-6 py-4">Share Persentase</th>
                                        <th className="text-right px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topTracks.map((track, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{i + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{track.title}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{track.artist}</td>
                                            <td className="px-6 py-4 text-slate-800 font-extrabold">{track.streams}</td>
                                            <td className="px-6 py-4 text-slate-500 font-semibold">{track.share}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                    Terus Naik <ArrowUpRight size={12} />
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
