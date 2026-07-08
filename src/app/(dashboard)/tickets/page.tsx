"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
    User
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
    replies: Reply[];
}

export default function TicketsPage() {
    const router = useRouter();
    const { getButtonColor } = useBranding();
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
            
            // Auto select or update active ticket
            if (autoSelectId) {
                const updated = ticketList.find((t: Ticket) => t.id === autoSelectId);
                if (updated) setSelectedTicket(updated);
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
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                        style={{ background: getButtonColor() }}
                    >
                        <Plus size={16} />
                        Buat Tiket Baru
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Loader2 size={36} className="animate-spin text-slate-400" />
                    <span className="mt-3 text-slate-500 font-medium">Memuat tiket bantuan...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 flex-1 items-stretch">
                    {/* Ticket List Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Semua Tiket Anda</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 sidebar-scroll">
                            {tickets.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <HelpCircle size={36} className="mx-auto mb-3 opacity-40" />
                                    <p className="font-semibold text-sm">Belum ada tiket bantuan</p>
                                    <p className="text-xs text-slate-400 mt-1">Gunakan tombol diatas untuk membuat tiket baru.</p>
                                </div>
                            ) : (
                                tickets.map((ticket) => {
                                    const isSelected = selectedTicket?.id === ticket.id;
                                    const lastReply = ticket.replies && ticket.replies.length > 0 
                                        ? ticket.replies[ticket.replies.length - 1] 
                                        : null;

                                    return (
                                        <div 
                                            key={ticket.id}
                                            onClick={() => handleSelectTicket(ticket)}
                                            className={`p-5 cursor-pointer transition-all flex flex-col gap-2.5 relative hover:bg-slate-50/50 ${isSelected ? 'bg-slate-50/80 border-l-4' : ''}`}
                                            style={isSelected ? { borderLeftColor: getButtonColor() } : {}}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Tag size={10} /> {ticket.category}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                            </div>
                                            
                                            <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-blue-600">
                                                {ticket.subject}
                                            </h3>
                                            
                                            <p className="text-xs text-slate-500 line-clamp-1 font-medium">
                                                {lastReply ? lastReply.message : 'Menunggu respon admin...'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-1">
                                                {getStatusBadge(ticket.status)}
                                                <ChevronRight size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Active Ticket Chat Area */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                        {selectedTicket ? (
                            <>
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

                                {/* Replies Body */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 sidebar-scroll">
                                    {selectedTicket.replies && selectedTicket.replies.map((reply) => {
                                        const isAdmin = reply.sender_role?.toLowerCase() === 'admin' || reply.sender_role?.toLowerCase() === 'operator';
                                        return (
                                            <div 
                                                key={reply.id}
                                                className={`flex gap-3 max-w-[80%] ${!isAdmin ? 'ml-auto flex-row-reverse' : ''}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    isAdmin ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {isAdmin ? <ShieldCheck size={14} className="text-purple-600" /> : <User size={14} />}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className={`text-[10px] text-slate-400 font-semibold px-1 ${!isAdmin ? 'text-right' : ''}`}>
                                                        {reply.sender_name} <span className="font-normal">({reply.sender_role})</span>
                                                    </div>
                                                    <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                                                        isAdmin 
                                                            ? 'bg-white border border-slate-150 text-slate-800 rounded-tl-none shadow-sm' 
                                                            : 'text-white rounded-tr-none shadow-md'
                                                    }`} style={!isAdmin ? { background: getButtonColor() || '#aa91cc' } : {}}>
                                                        {reply.message}
                                                    </div>
                                                    <span className={`text-[9px] text-slate-400 px-1 mt-0.5 ${!isAdmin ? 'text-right' : ''}`}>
                                                        {new Date(reply.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                                    </span>
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
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                <MessageSquare size={48} className="opacity-20 mb-3" />
                                <h3 className="font-extrabold text-slate-700 text-base">Tidak Ada Tiket Terpilih</h3>
                                <p className="text-xs text-slate-400 max-w-sm mt-1">
                                    Pilih salah satu tiket di sebelah kiri untuk melihat percakapan detail, atau buat tiket baru.
                                </p>
                            </div>
                        )}
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
