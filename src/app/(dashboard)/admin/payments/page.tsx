"use client";

import React, { useState, useEffect } from 'react';
import { 
    CreditCard, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Loader2, 
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    TrendingUp,
    Users
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';

interface PayoutRequest {
    id: string;
    userName: string;
    email: string;
    portal: 'Aggregator' | 'Publishing';
    amount: string;
    method: string;
    recipient: string;
    date: string;
    status: 'Pending' | 'Success' | 'Failed';
}

export default function AdminPaymentsPage() {
    const { getButtonColor } = useBranding();
    const [isLoading, setIsLoading] = useState(true);
    const [isChecking, setIsChecking] = useState(true);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    
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
            setPayouts([
                { id: "PAY-001", userName: "Arka Genta", email: "Hadididien@gmail.com", portal: 'Aggregator', amount: "Rp 8.120.000", method: 'Bank Transfer (BCA)', recipient: '122-384-***8 (Arka G.)', date: "2026-07-08", status: 'Pending' },
                { id: "PAY-002", userName: "Monolog Band", email: "monologband.indo@gmail.com", portal: 'Publishing', amount: "Rp 3.080.000", method: 'Bank Transfer (BCA)', recipient: '122-384-***8 (Monolog)', date: "2026-07-08", status: 'Pending' },
                { id: "PAY-003", userName: "Tiara Kirana", email: "guryanahidayatdtt@gmail.com", portal: 'Aggregator', amount: "Rp 12.400.000", method: 'Bank Transfer (Mandiri)', recipient: '138-002-***1 (Tiara K.)', date: "2026-07-07", status: 'Success' },
                { id: "PAY-004", userName: "Dewa Wisnu", email: "fhilmy14@gmail.com", portal: 'Aggregator', amount: "Rp 5.120.000", method: 'E-Wallet (Dana)', recipient: '0812-4820-****', date: "2026-07-06", status: 'Success' }
            ]);
            setIsLoading(false);
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

    const handleAction = (id: string, newStatus: 'Success' | 'Failed') => {
        const actionLabel = newStatus === 'Success' ? 'menyetujui' : 'menolak';
        if (!confirm(`Apakah Anda yakin ingin ${actionLabel} permintaan penarikan ini?`)) return;
        
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        alert(`Permintaan ${id} telah berhasil diubah statusnya menjadi ${newStatus === 'Success' ? 'Berhasil' : 'Ditolak'}.`);
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle size={12} /> Selesai
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock size={12} /> Menunggu
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <XCircle size={12} /> Ditolak
                    </span>
                );
        }
    };

    // Calculate metrics
    const pendingCount = payouts.filter(p => p.status === 'Pending').length;
    const successSum = payouts
        .filter(p => p.status === 'Success')
        .reduce((sum, p) => sum + Number(p.amount.replace(/[^0-9]/g, '')), 0);
    const successSumFormatted = `Rp ${successSum.toLocaleString('id-ID')}`;

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                        <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                            <CreditCard size={20} />
                        </div>
                        <span>Persetujuan Pembayaran (Admin)</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Tinjau dan setujui permintaan penarikan royalti saldo dari pencipta & label digital</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat data pembayaran...</span>
                </div>
            ) : (
                <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            { label: 'Penarikan Pending', value: `${pendingCount} Permintaan`, icon: <Clock size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', sub: 'Harus segera diproses' },
                            { label: 'Total Dana Terbayar', value: successSumFormatted, icon: <ArrowUpRight size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', sub: 'Pencairan dana disetujui' },
                            { label: 'Kas Keluar Bulanan', value: "Rp 17.520.000", icon: <TrendingUp size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', sub: 'Periode Juli 2026' }
                        ].map((stat, i) => (
                            <div key={i} className={`bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between`}>
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">{stat.label}</p>
                                    <h3 className="text-2xl font-extrabold text-slate-800">{stat.value}</h3>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">{stat.sub}</p>
                                </div>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.bg.split(' ')[0]} ${stat.bg.split(' ')[2]}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Antrean Permintaan Pencairan Saldo</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Daftar lengkap ajuan penarikan saldo pendapatan dari user</p>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                        <th className="text-left px-6 py-4">ID Aju</th>
                                        <th className="text-left px-6 py-4">Nama Kreator</th>
                                        <th className="text-left px-6 py-4">Portal Portal</th>
                                        <th className="text-left px-6 py-4">Jumlah Dana</th>
                                        <th className="text-left px-6 py-4">Metode & Akun Rekening</th>
                                        <th className="text-left px-6 py-4">Tanggal Aju</th>
                                        <th className="text-left px-6 py-4">Status</th>
                                        <th className="text-right px-6 py-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payouts.map((pay) => (
                                        <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500 text-xs">{pay.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{pay.userName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{pay.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    pay.portal === 'Aggregator' 
                                                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                                                        : 'bg-pink-500/10 text-pink-600 border border-pink-500/20'
                                                }`}>
                                                    {pay.portal}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-850 font-extrabold">{pay.amount}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-700 text-xs">{pay.method}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{pay.recipient}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                                                {new Date(pay.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(pay.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {pay.status === 'Pending' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleAction(pay.id, 'Success')}
                                                            className="px-4 py-1.5 rounded-full text-xs font-extrabold text-white shadow-md hover:shadow-lg transition-all"
                                                            style={{ background: getButtonColor() }}
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(pay.id, 'Failed')}
                                                            className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-rose-500 hover:bg-rose-650 text-white shadow-md hover:shadow-lg transition-all"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-semibold">-</span>
                                                )}
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
