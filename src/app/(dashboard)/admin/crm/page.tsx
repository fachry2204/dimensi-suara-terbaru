"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";

const channels = ["WhatsApp", "Email", "Instagram", "Website Chat"];

export default function AdminCrmPage() {
  return (
    <main className="py-6 text-slate-800">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-4">
          ← Menuju Dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-black">CRM Omnichannel Chat</h1>
        <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-lg bg-white p-4 text-slate-900">
            <h2 className="text-sm font-black uppercase text-slate-500">Channel</h2>
            <div className="mt-3 space-y-2">
              {channels.map((channel) => (
                <button key={channel} className="flex w-full items-center gap-2 rounded border border-slate-200 p-3 text-left text-sm font-bold hover:bg-slate-50">
                  <MessageCircle size={16} className="text-fuchsia-500" /> {channel}
                </button>
              ))}
            </div>
          </aside>
          <section className="rounded-lg bg-white p-5 text-slate-900">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl font-black">Inbox Client</h2>
              <p className="text-sm text-slate-500">Area omnichannel chat untuk menangani percakapan client.</p>
            </div>
            <div className="mt-6 min-h-72 rounded bg-slate-50 p-4 text-sm text-slate-500">Belum ada percakapan dipilih.</div>
            <div className="mt-4 flex gap-2">
              <input className="flex-1 rounded border border-slate-200 px-4 py-3 text-sm" placeholder="Tulis balasan..." />
              <button className="rounded bg-fuchsia-500 px-4 text-white"><Send size={18} /></button>
            </div>
          </section>
        </section>
    </main>
  );
}
