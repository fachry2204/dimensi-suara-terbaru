"use client";

import React, { useState, useEffect } from 'react';
import { 
    CreditCard, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Loader2, 
    Plus,
    Calendar,
    CheckCircle,
    Clock,
    Lock
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

interface Transaction {
    id: string;
    date: string;
    amount: string;
    status: 'Success' | 'Processing' | 'Failed';
    method: string;
    recipient: string;
}

export default function AggregatorPaymentsPage() {
    const { getButtonColor } = useBranding();
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Bank Transfer (BCA)');
    const [accountNum, setAccountNum] = useState('');
    
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Simulated Financial Data
    const balance = "Rp 18.520.000";
    const totalWithdrawn = "Rp 23.660.500";
    const lastWithdrawal = "Rp 8.120.000";

    const transactions: Transaction[] = [
        { id: "TX-90382", date: "2026-06-08", amount: "Rp 8.120.000", status: 'Success', method: 'Bank Transfer (BCA)', recipient: '122-384-***8 (Arka G.)' },
        { id: "TX-89271", date: "2026-05-10", amount: "Rp 5.750.000", status: 'Success', method: 'Bank Transfer (BCA)', recipient: '122-384-***8 (Arka G.)' },
        { id: "TX-88029", date: "2026-04-12", amount: "Rp 9.790.500", status: 'Success', method: 'Bank Transfer (BCA)', recipient: '122-384-***8 (Arka G.)' }
    ];

    const handleRequestPayout = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !accountNum) return;
        
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsModalOpen(false);
            setAmount('');
            setAccountNum('');
            alert('Permintaan penarikan saldo berhasil dikirim. Admin akan segera memproses penarikan Anda.');
        }, 1500);
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle size={12} /> Berhasil
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock size={12} /> Diproses
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        Batal
                    </span>
                );
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                        <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                            <CreditCard size={20} />
                        </div>
                        <span>Pembayaran Agregator</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Kelola penarikan saldo royalti pendapatan aggregator Anda</p>
                </div>
                <div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                        style={{ background: getButtonColor() }}
                    >
                        <Plus size={16} />
                        Tarik Saldo
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat info pembayaran...</span>
                </div>
            ) : (
                <>
                    {/* Metrics row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { label: 'Saldo Tersedia', value: balance, icon: <ArrowDownLeft size={20} />, bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', sub: 'Pendapatan yang bisa ditarik' },
                            { label: 'Total Penarikan', value: totalWithdrawn, icon: <ArrowUpRight size={20} />, bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', sub: 'Akumulasi dana ditarik' },
                            { label: 'Penarikan Terakhir', value: lastWithdrawal, icon: <CreditCard size={20} />, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', sub: 'Telah terkirim ke rekening' },
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

                    {/* Table View */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Riwayat Transaksi</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Semua rekaman penarikan dana dan pembayaran Anda</p>
                        </div>
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                    <tr>
                                        <th className="text-left px-6 py-4">ID Transaksi</th>
                                        <th className="text-left px-6 py-4">Tanggal Pengajuan</th>
                                        <th className="text-left px-6 py-4">Jumlah Penarikan</th>
                                        <th className="text-left px-6 py-4">Metode Penarikan</th>
                                        <th className="text-left px-6 py-4">Rekening Tujuan</th>
                                        <th className="text-right px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-800 font-mono font-bold text-xs">{tx.id}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs font-medium flex items-center gap-1.5">
                                                <Calendar size={14} className="text-indigo-400" />
                                                {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-850 font-extrabold">{tx.amount}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{tx.method}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{tx.recipient}</td>
                                            <td className="px-6 py-4 text-right">
                                                {getStatusBadge(tx.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Payout Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Ajukan Penarikan Saldo</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                        </div>
                        <form onSubmit={handleRequestPayout} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jumlah Penarikan (Rp)</label>
                                <input 
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Min. Rp 100.000"
                                    className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-semibold"
                                    required
                                    min={100000}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metode Penarikan</label>
                                <select 
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm bg-white"
                                >
                                    <option value="Bank Transfer (BCA)">Bank Transfer (BCA)</option>
                                    <option value="Bank Transfer (Mandiri)">Bank Transfer (Mandiri)</option>
                                    <option value="Bank Transfer (BNI)">Bank Transfer (BNI)</option>
                                    <option value="E-Wallet (Dana)">E-Wallet (Dana)</option>
                                    <option value="E-Wallet (GoPay)">E-Wallet (GoPay)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nomor Rekening / E-Wallet</label>
                                <input 
                                    type="text"
                                    value={accountNum}
                                    onChange={(e) => setAccountNum(e.target.value)}
                                    placeholder="Contoh: 122-384-90382 / 0812-****"
                                    className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-mono"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all">Batal</button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !amount || !accountNum}
                                    className="flex items-center gap-1.5 px-6 py-2.5 text-white rounded-full text-xs font-bold transition-all duration-300 disabled:opacity-50 shadow-md"
                                    style={{ background: getButtonColor() }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>Kirim Permintaan</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
