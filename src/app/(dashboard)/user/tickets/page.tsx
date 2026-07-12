"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Loader2, Plus, Ticket, MessageSquare } from "lucide-react";
import { api } from "@/utils/api";

type TicketItem = {
  id: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

const statusTone: Record<string, string> = {
  Open: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Closed: "bg-slate-100 text-slate-500",
};

export default function UserTicketHistoryPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const ticketData = await api.tickets.list(null);
        setTickets(Array.isArray(ticketData) ? ticketData : ticketData?.tickets || []);
      } catch (error) {
        console.error("Failed to load ticket history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800">
            <Ticket className="text-[#aa91cc]" /> History Ticket Bantuan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pantau semua ticket bantuan yang pernah Anda kirim.
          </p>
        </div>

        <Link
          href="/user/tickets/new"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#aa91cc] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#967cba]"
        >
          <Plus size={16} />
          Buat Tiket Baru
        </Link>
      </header>

      <section className="mt-6 rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-3 py-10 text-sm font-semibold text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Memuat history ticket...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Ticket size={22} />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-800">Belum ada ticket</h2>
            <p className="mt-1 text-sm text-slate-500">
              Buat ticket baru jika Anda membutuhkan bantuan terkait release.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-black">Judul Ticket</th>
                  <th className="px-4 py-3 font-black">Kategori</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Tanggal</th>
                  <th className="px-4 py-3 font-black">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-slate-800">{ticket.subject}</td>
                    <td className="px-4 py-4 text-slate-500">{ticket.category || "-"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[ticket.status] || "bg-slate-100 text-slate-500"}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/tickets?id=${ticket.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#aa91cc] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#967cba]"
                      >
                        <MessageSquare size={13} />
                        Lihat Ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
