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
import { usePathname } from 'next/navigation';

export default function PublishingContractPage() {
    const pathname = usePathname();
    const isAggregator = pathname.includes('/aggregator/');
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

    // Fallback publishing split percentage if null
    const percentageField = isAggregator ? user?.aggregator_percentage : user?.publishing_percentage;
    const sharePercentage = percentageField !== undefined && percentageField !== null
        ? `${percentageField}%`
        : "75%"; // Default fallback split

    const contractTerms = isAggregator
        ? [
            { label: 'Distribusi Musik Digital', desc: 'Dimensi Suara mendistribusikan rekaman musik yang disetujui ke platform digital dan mitra distribusi yang tersedia.' },
            { label: 'Kepemilikan Master', desc: 'Hak kepemilikan master tetap berada pada pemilik hak. Dimensi Suara memperoleh izin distribusi selama masa perjanjian.' },
            { label: 'Metadata dan Materi Rilis', desc: 'Pemilik akun bertanggung jawab atas keakuratan metadata, audio, artwork, serta legalitas seluruh materi yang dikirimkan.' },
            { label: 'Bagi Hasil Bersih', desc: 'Pendapatan bersih hasil distribusi dibagikan sesuai persentase aggregator yang tercantum pada akun.' },
          ]
        : [
            { label: 'Administrasi Hak Cipta', desc: 'Dimensi Suara Publishing bertindak sebagai administrator yang mengumpulkan royalti ciptaan (Mechanical & Performance) dari LMK lokal/global serta platform digital.' },
            { label: 'Kepemilikan Hak Moral & Ekonomi', desc: 'Hak moral atas lagu selamanya milik Pencipta asli. Pencipta melisensikan hak ekonomi pengelolaan (publishing rights) kepada administrator selama masa perjanjian.' },
            { label: 'Lagu Terdaftar', desc: 'Perjanjian ini berlaku bagi seluruh katalog ciptaan lagu yang didaftarkan secara eksplisit oleh Pencipta melalui dashboard portal.' },
            { label: 'Bagi Hasil Bersih', desc: 'Pembagian persentase hasil bersih dikreditkan langsung ke saldo akun setelah dikurangi biaya administrasi pemrosesan global.' },
          ];

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
                        <span>Kontrak Kerja {isAggregator ? 'Aggregator' : 'Publishing'}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{isAggregator ? 'Lihat status kontrak distribusi musik dan pembagian hasil aggregator Anda' : 'Lihat status kontrak kerjasama pengumpulan royalti hak cipta lagu dan pembagian hasil publishing Anda'}</p>
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
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Bagi Hasil {isAggregator ? 'Aggregator' : 'Publishing'} (RevShare)</p>
                                    <h3 className="text-3xl font-extrabold text-slate-800">{sharePercentage}</h3>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Dari pendapatan royalti ciptaan terkumpul</p>
                                </div>
                                <div className="rounded-2xl flex items-center justify-center bg-pink-500/10 text-pink-600" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
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
                            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Ketentuan Umum {isAggregator ? 'Distribusi & Aggregator' : 'Hak Cipta & Publishing'}</h2>
                            <div className="divide-y divide-slate-100 text-sm">
                                {contractTerms.map((item, i) => (
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
