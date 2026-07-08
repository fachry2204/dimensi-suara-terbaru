"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
    BarChart3, 
    TrendingUp, 
    Music, 
    FileText, 
    Award, 
    ArrowUpRight, 
    Calendar,
    Loader2
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function PublishingStatisticsPage() {
    const { getButtonColor } = useBranding();
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Simulated Publishing Data
    const totalRoyalties = "Rp 24.890.000";
    const totalWriters = "3 Pencipta";
    const totalSongs = "28 Lagu Aktif";
    
    // Line Chart: Royalti Publishing Over Time
    const royaltyChartOptions = {
        chart: {
            id: 'royalty-trends',
            toolbar: { show: false },
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        colors: ['#ec4899', '#f43f5e'],
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

    const royaltyChartSeries = [
        {
            name: 'Mechanical Royalty',
            data: [1500000, 1800000, 2100000, 2400000, 2600000, 2900000, 3100000, 3300000, 3700000, 4200000, 4800000, 5200000]
        },
        {
            name: 'Performance Royalty',
            data: [800000, 950000, 1100000, 1200000, 1400000, 1500000, 1600000, 1850000, 2100000, 2300000, 2500000, 2800000]
        }
    ];

    // Pie Chart: Distribution by Type
    const sourceChartOptions = {
        chart: {
            id: 'source-distribution',
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        labels: ['Mechanical (DSP/Kepingan)', 'Performance (RBT/Radio/Konser)', 'Synchronization (Film/Iklan)'],
        colors: ['#db2777', '#f43f5e', '#aa91cc'],
        legend: {
            position: 'bottom' as const
        }
    };

    const sourceChartSeries = [60, 25, 15];

    const topWorks = [
        { title: "Melodi Senja", share: "50% (Arka Genta)", mechanical: "Rp 6.420.000", performance: "Rp 3.100.000", total: "Rp 9.520.000" },
        { title: "Sajak Hujan", share: "100% (Arka Genta)", mechanical: "Rp 4.120.000", performance: "Rp 1.950.000", total: "Rp 6.070.000" },
        { title: "Matahari Pagi", share: "70% (Tiara Kirana)", mechanical: "Rp 3.890.000", performance: "Rp 1.500.000", total: "Rp 5.390.000" },
        { title: "Langkah Pasti", share: "40% (Tiara Kirana)", mechanical: "Rp 2.100.000", performance: "Rp 980.000", total: "Rp 3.080.000" }
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
                        <span>Statistik Publishing</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Pantau performa hak cipta lagu, mechanical, dan performance royalties Anda</p>
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
                            { label: 'Total Royalti Diterima', value: totalRoyalties, icon: <Award size={20} />, bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600', sub: 'Akumulasi semua jenis royalti' },
                            { label: 'Pencipta Terdaftar', value: totalWriters, icon: <FileText size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', sub: 'Pencipta yang dikelola' },
                            { label: 'Katalog Lagu', value: totalSongs, icon: <Music size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', sub: 'Lagu terdaftar hak cipta' },
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
                                <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Pendapatan Royalti Bulanan</h3>
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full">
                                    <Calendar size={12} /> Jan - Des 2026
                                </span>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <Chart options={royaltyChartOptions} series={royaltyChartSeries} type="area" height={320} />
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Distribusi Jenis Royalti</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <Chart options={sourceChartOptions} series={sourceChartSeries} type="donut" width={300} />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Top Tracks Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp size={18} style={{ color: getButtonColor() }} />
                                Karya dengan Pendapatan Tertinggi
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                        <th className="text-left px-6 py-4 w-12">No</th>
                                        <th className="text-left px-6 py-4">Judul Lagu</th>
                                        <th className="text-left px-6 py-4">Split Share</th>
                                        <th className="text-left px-6 py-4">Mechanical</th>
                                        <th className="text-left px-6 py-4">Performance</th>
                                        <th className="text-right px-6 py-4">Total Royalti</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topWorks.map((work, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{i + 1}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{work.title}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{work.share}</td>
                                            <td className="px-6 py-4 text-slate-650 font-semibold">{work.mechanical}</td>
                                            <td className="px-6 py-4 text-slate-650 font-semibold">{work.performance}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: getButtonColor() }}>
                                                    {work.total} <ArrowUpRight size={12} />
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
