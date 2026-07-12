"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    MessageSquare, 
    Plus, 
    Send, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    HelpCircle, 
    Tag, 
    ChevronRight,
    Loader2,
    Lock,
    Unlock,
    User,
    Shield,
    Play
} from 'lucide-react';
import { api } from '@/utils/api';
import { useBranding } from '@/contexts/BrandingContext';

interface Reply {
    id: number;
    message: string;
    sender_id: number;
    sender_name: string;
    sender_role: string;
    created_at: string;
}

interface Ticket {
    id: number;
    subject: string;
    category: string;
    status: 'Open' | 'Closed' | 'Pending';
    created_at: string;
    updated_at: string;
    user_id: number;
    user_name: string;
    user_email?: string;
    replies: Reply[];
}

export default function TicketsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { getButtonColor } = useBranding();
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const renderMessageContent = (msg: string) => {
        const fileMatch = msg.match(/Upload File:\s*([^\s\n]+)/);
        const ytMatch = msg.match(/Link Youtube:\s*([^\s\n]+)/);
        
        let displayMessage = msg;
        let imageSrc = null;
        let youtubeLink = null;

        if (fileMatch) {
            imageSrc = fileMatch[1];
            displayMessage = displayMessage.replace(/Upload File:\s*[^\s\n]+/g, '');
        }
        if (ytMatch) {
            youtubeLink = ytMatch[1];
            displayMessage = displayMessage.replace(/Link Youtube:\s*[^\s\n]+/g, '');
        }

        displayMessage = displayMessage.replace(/\n\n+/g, '\n\n').trim();

        return { displayMessage, imageSrc, youtubeLink };
    };
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('Metadata');
    const [message, setMessage] = useState('');
    const [replyText, setReplyText] = useState('');
    
    const replyEndRef = useRef<HTMLDivElement>(null);

    const categories = ['Metadata', 'Keuangan/Royalti', 'Klaim Hak Cipta', 'Masalah Teknis', 'Lainnya'];

    const fetchTickets = async (autoSelectId?: number) => {
        try {
            const data = await api.tickets.list(null);
            const ticketList = Array.isArray(data) ? data : (data?.tickets || []);
            setTickets(ticketList);
            
            const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const queryId = searchParams?.get('id');
            const targetId = autoSelectId || (queryId ? Number(queryId) : undefined);
            
            // Auto select or update active ticket
            if (targetId) {
                const updated = ticketList.find((t: Ticket) => t.id === targetId);
                if (updated) handleSelectTicket(updated);
            } else if (selectedTicket) {
                const updated = ticketList.find((t: Ticket) => t.id === selectedTicket.id);
                if (updated) setSelectedTicket(updated);
            }
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        
        // Poll for updates every 10 seconds
        const interval = setInterval(() => fetchTickets(), 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (replyEndRef.current) {
            replyEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.replies]);

    const handleSelectTicket = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        try {
            // Fetch detailed ticket data (including replies)
            const details = await api.tickets.get(null, ticket.id);
            if (details) {
                setSelectedTicket(details);
            }
        } catch (err) {
            console.error('Failed to load ticket details:', err);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;
        
        setIsSubmitting(true);
        try {
            const newTicket = await api.tickets.create(null, {
                subject,
                category,
                message
            });
            
            setSubject('');
            setMessage('');
            setCategory('Metadata');
            setIsModalOpen(false);
            
            // Refresh list and select the new ticket
            await fetchTickets(newTicket?.id);
        } catch (err) {
            console.error('Failed to create ticket:', err);
            alert('Gagal membuat tiket bantuan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedTicket) return;
        
        const currentText = replyText;
        setReplyText('');
        
        try {
            await api.tickets.reply(null, selectedTicket.id, currentText);
            // Refresh to show new reply
            await fetchTickets(selectedTicket.id);
        } catch (err) {
            console.error('Failed to send reply:', err);
            alert('Gagal mengirim balasan.');
            setReplyText(currentText);
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedTicket) return;
        if (!confirm('Apakah Anda yakin ingin menutup tiket bantuan ini?')) return;
        
        try {
            await api.tickets.close(null, selectedTicket.id);
            await fetchTickets(selectedTicket.id);
        } catch (err) {
            console.error('Failed to close ticket:', err);
            alert('Gagal menutup tiket.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'open':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Open
                    </span>
                );
            case 'closed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <Lock size={12} /> Closed
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock size={12} /> Pending
                    </span>
                );
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-none min-h-screen flex flex-col gap-6">
            {pathname?.startsWith('/admin') && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 w-fit"
              >
                ← Menuju Dashboard
              </Link>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3 whitespace-nowrap">
                        <div className="rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: getButtonColor(), width: '40px', height: '40px', minWidth: '40px' }}>
                            <MessageSquare size={20} />
                        </div>
                        <span>Tiket Bantuan</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Kirim pertanyaan atau laporan masalah langsung ke admin</p>
                </div>
                <div>
                    <Link 
                        href="/user/tickets/new"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                        style={{ background: getButtonColor() }}
                    >
                        <Plus size={16} />
                        Buat Tiket Baru
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat tiket bantuan...</span>
                </div>
            ) : selectedTicket ? (
                <div className="flex-1 flex flex-col items-stretch">
                    {/* Active Ticket Area */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px] w-full">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                                        <Tag size={10} /> {selectedTicket.category}
                                    </span>
                                    {getStatusBadge(selectedTicket.status)}
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                                    {selectedTicket.subject}
                                </h2>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {pathname?.startsWith('/admin') && (
                                    <button
                                        onClick={() => {
                                            setSelectedTicket(null);
                                            router.push('/admin/tickets');
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-all border border-slate-200 shadow-sm"
                                    >
                                        Kembali ke Daftar
                                    </button>
                                )}
                                {selectedTicket.status !== 'Closed' && (
                                    <button
                                        onClick={handleCloseTicket}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-semibold shadow-md shadow-rose-100 hover:shadow-lg transition-all"
                                    >
                                        <Lock size={12} />
                                        Tutup Tiket
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Replies Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20 sidebar-scroll">
                            {selectedTicket.replies && selectedTicket.replies.map((reply, index) => {
                                const isAdmin = reply.sender_role?.toLowerCase() === 'admin' || reply.sender_role?.toLowerCase() === 'operator';
                                const isInitial = index === 0;

                                return (
                                    <div 
                                        key={reply.id}
                                        className={`w-full rounded-2xl border transition-all ${
                                            isInitial 
                                                ? 'bg-slate-50/50 border-slate-200/80 shadow-sm border-l-4 border-l-[#aa91cc]' 
                                                : 'bg-white border-slate-100 shadow-sm'
                                        }`}
                                    >
                                        {/* Header */}
                                        <div className="px-5 py-3 border-b border-slate-100/60 flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {isAdmin ? <Shield size={14} /> : <User size={14} />}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                                        {reply.sender_name}
                                                        {isInitial && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#aa91cc]/15 text-[#aa91cc]">
                                                                Pembuat Tiket
                                                            </span>
                                                        )}
                                                        {isAdmin && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">
                                                                Customer Support
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {reply.sender_role}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {new Date(reply.created_at).toLocaleString('id-ID', { 
                                                    day: 'numeric', 
                                                    month: 'short', 
                                                    year: 'numeric', 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 text-sm text-slate-700 leading-relaxed">
                                            {(() => {
                                                const { displayMessage, imageSrc, youtubeLink } = renderMessageContent(reply.message);
                                                return (
                                                    <div className="space-y-4">
                                                        {isInitial && (
                                                            <div className="mb-3 pb-3 border-b border-slate-150 text-xs text-slate-500 font-semibold flex flex-wrap gap-x-6 gap-y-2">
                                                                <div>KATEGORI: <span className="font-bold text-[#aa91cc]">{selectedTicket.category?.toUpperCase() || "LAINNYA"}</span></div>
                                                            </div>
                                                        )}
                                                        {displayMessage && (
                                                            <div className="whitespace-pre-wrap">{displayMessage}</div>
                                                        )}
                                                        
                                                        {youtubeLink && (
                                                            <div className="mt-2 pt-2 border-t border-slate-100/60">
                                                                <span className="text-xs font-semibold text-slate-400 block mb-1.5">Link Youtube:</span>
                                                                <a 
                                                                    href={youtubeLink} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all text-xs font-bold"
                                                                >
                                                                    <Play size={12} fill="currentColor" /> Buka Link Youtube
                                                                </a>
                                                            </div>
                                                        )}
                                                        
                                                        {imageSrc && (
                                                            <div className="mt-3 pt-2 border-t border-slate-100/60">
                                                                <span className="text-xs font-semibold text-slate-400 block mb-2">Lampiran Gambar:</span>
                                                                <div 
                                                                    onClick={() => setPreviewImage(imageSrc)}
                                                                    className="relative w-48 max-w-full rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in hover:shadow-md hover:border-slate-300 transition-all group"
                                                                >
                                                                    <img 
                                                                        src={imageSrc} 
                                                                        alt="Attachment" 
                                                                        className="w-full h-auto object-cover max-h-36 group-hover:scale-[1.02] transition-transform duration-200" 
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/60 px-2 py-1 rounded-md transition-opacity">Zoom Preview</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={replyEndRef} />
                        </div>

                        {/* Footer Input */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                            {selectedTicket.status === 'Closed' ? (
                                <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-2xl text-slate-400 text-xs font-semibold">
                                    <Lock size={14} /> Tiket ini sudah ditutup. Anda tidak dapat mengirim balasan lagi.
                                </div>
                            ) : (
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Ketik balasan Anda di sini..."
                                        className="flex-1 px-5 h-11 border border-slate-200 rounded-full focus:outline-none focus:border-blue-500 text-sm bg-slate-50/50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!replyText.trim()}
                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all duration-300 disabled:opacity-50 active:scale-95"
                                        style={{ background: getButtonColor() }}
                                    >
                                        <Send size={16} className="translate-x-[-1px] translate-y-[0px]" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            ) : pathname?.startsWith('/admin') ? (
                <div className="flex-1 flex flex-col items-stretch">
                    {tickets.length === 0 ? (
                        <div className="py-14 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <MessageSquare size={22} />
                            </div>
                            <h2 className="mt-4 text-lg font-black text-slate-800">Belum ada ticket</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Belum ada tiket bantuan dari pengguna saat ini.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                            <div className="p-5 border-b border-slate-100">
                                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Semua Tiket Masuk</h2>
                                <p className="text-xs text-slate-400 mt-1">Daftar seluruh tiket bantuan dari client/user</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3.5 font-bold">ID</th>
                                            <th className="px-6 py-3.5 font-bold">Judul Ticket</th>
                                            <th className="px-6 py-3.5 font-bold">Pengguna</th>
                                            <th className="px-6 py-3.5 font-bold">Kategori</th>
                                            <th className="px-6 py-3.5 font-bold">Status</th>
                                            <th className="px-6 py-3.5 font-bold">Terakhir Update</th>
                                            <th className="px-6 py-3.5 font-bold">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {tickets.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-semibold text-slate-400">#{t.id}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{t.subject}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-700">{t.user_name || "Unknown"}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{t.user_email || "-"}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{t.category || "-"}</td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(t.status)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {new Date(t.updated_at).toLocaleString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleSelectTicket(t)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#aa91cc] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#967cba] shadow-sm shadow-[#aa91cc]/10"
                                                    >
                                                        <MessageSquare size={13} />
                                                        Detail Tiket
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-stretch">
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
                        <MessageSquare size={48} className="opacity-20 mb-3" />
                        <h3 className="font-extrabold text-slate-700 text-base">Tidak Ada Tiket Terpilih</h3>
                        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                            Silakan pilih tiket dari halaman riwayat tiket Anda untuk melihat percakapan detail.
                        </p>
                        <Link 
                            href="/user/tickets"
                            className="px-5 py-2.5 rounded-full text-white text-xs font-bold transition-all shadow-md hover:shadow-lg"
                            style={{ background: getButtonColor() }}
                        >
                            Kembali ke Riwayat Tiket
                        </Link>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Buat Tiket Bantuan Baru</h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subjek / Masalah</label>
                                <input 
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Contoh: Metadata lagu X salah"
                                    className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm bg-white"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pesan Detail</label>
                                <textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Jelaskan secara detail kendala atau pertanyaan Anda..."
                                    rows={5}
                                    className="w-full p-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 text-sm"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                                    className="flex items-center gap-1.5 px-6 py-2.5 text-white rounded-full text-xs font-bold transition-all duration-300 disabled:opacity-50 shadow-md"
                                    style={{ background: getButtonColor() }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            Kirim Tiket
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-zoom-out"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all font-bold"
                            onClick={() => setPreviewImage(null)}
                        >
                            ✕
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Upload Preview" 
                            className="max-w-full max-h-[80vh] object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline fallback shieldcheck icon component since it might not be exported from lucide-react directly in some versions
function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width={props.size || "24"}
            height={props.size || "24"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
