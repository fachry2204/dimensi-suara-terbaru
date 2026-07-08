"use client";

import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Download, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Percent, 
    Calendar, 
    ShieldCheck, 
    Info,
    Loader2
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { assetUrl } from '@/utils/url';

export default function AggregatorContractPage() {
    const { getButtonColor } = useBranding();
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data?.user || data);
                }
            } catch (err) {
                console.warn('Failed to load user profile for contract:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved':
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Aktif / Disetujui
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock size={12} /> Menunggu Review
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
                        Belum Ditandatangani
                    </span>
                );
        }
    };

    // Fallback split percentage if null
    const sharePercentage = user?.aggregator_percentage !== undefined && user?.aggregator_percentage !== null
        ? `${user.aggregator_percentage}%`
        : "80%"; // Default fallback split

    const contractDoc = user?.contract_doc_path || '';

    const handleDownload = () => {
        if (!contractDoc) {
            alert('File dokumen kontrak belum diunggah oleh admin.');
            return;
        }
        window.open(assetUrl(contractDoc), '_blank');
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                        <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                            <FileText size={20} />
                        </div>
                        <span>Kontrak Kerja Agregator</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Lihat status kontrak kerjasama distribusi musik dan pembagian hasil pendapatan aggregator Anda</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat data kontrak...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                    {/* Left: Contract Terms & Details */}
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Bagi Hasil Anda (RevShare)</p>
                                    <h3 className="text-3xl font-extrabold text-slate-800">{sharePercentage}</h3>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Dari pendapatan bersih streaming</p>
                                </div>
                                <div className="rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-600" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                    <Percent size={20} />
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Status Dokumen</p>
                                    <div className="mt-1.5">{getStatusBadge(user?.contract_status || 'Pending')}</div>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Diulas oleh tim hukum kami</p>
                                </div>
                                <div className="rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-600" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                    <ShieldCheck size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Ketentuan Umum Kerjasama</h2>
                            <div className="divide-y divide-slate-100 text-sm">
                                {[
                                    { label: 'Kepemilikan Hak Cipta', desc: 'Hak cipta atas seluruh master lagu (sound recording) tetap 100% menjadi milik Artis/Pencipta. Dimensi Suara hanya bertindak sebagai fasilitator distribusi.' },
                                    { label: 'Wilayah Distribusi (Territory)', desc: 'Distribusi berlaku secara Global / Seluruh Dunia (Worldwide) ke seluruh platform digital (DSP) terintegrasi.' },
                                    { label: 'Jangka Waktu (Term)', desc: 'Perjanjian kerjasama ini berlaku selama 1 (satu) tahun sejak tanggal ditandatangani dan otomatis diperpanjang.' },
                                    { label: 'Pembayaran Royalti', desc: 'Royalti dicairkan setiap bulan setelah laporan pendapatan diterima dari DSP dengan batas minimum pencairan Rp 100.000.' }
                                ].map((item, i) => (
                                    <div key={i} className="py-4 first:pt-0 last:pb-0">
                                        <h3 className="font-bold text-slate-800 text-sm mb-1">{item.label}</h3>
                                        <p className="text-slate-600 leading-relaxed text-xs font-medium">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: File Download Info */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
                        <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Dokumen Perjanjian</h2>
                        
                        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-6 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                            <FileText size={48} className="text-slate-400 mb-3" />
                            <h3 className="text-xs font-bold text-slate-700 truncate max-w-full px-2">
                                {contractDoc ? contractDoc.split('/').pop() : 'Belum ada dokumen'}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1">Format PDF / Word signed</p>
                        </div>

                        {contractDoc ? (
                            <button
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                                style={{ background: getButtonColor() }}
                            >
                                <Download size={16} /> Unduh Dokumen Kontrak
                            </button>
                        ) : (
                            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs p-4 rounded-2xl flex items-start gap-2">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <span className="font-semibold leading-relaxed">
                                    Dokumen fisik kontrak Anda sedang dipersiapkan oleh tim kami atau belum diunggah. Silakan hubungi admin via tiket bantuan jika diperlukan.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
