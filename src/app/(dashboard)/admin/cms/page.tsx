"use client";

import Link from "next/link";
import { ArrowLeft, HelpCircle, Newspaper, Plus } from "lucide-react";

export default function AdminCmsPage() {
  return (
    <main className="py-6 text-slate-800">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-4">
          ← Menuju Dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-black">CMS Website</h1>
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 text-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black"><HelpCircle className="text-fuchsia-500" /> FAQ Website</h2>
              <button className="rounded bg-fuchsia-500 px-3 py-2 text-xs font-bold text-white"><Plus size={14} className="inline" /> Tambah</button>
            </div>
            <div className="mt-4 space-y-3">
              {["Cara distribusi lagu?", "Kapan royalti dibayarkan?", "Bagaimana klaim YouTube?"].map((item) => (
                <div key={item} className="rounded border border-slate-200 p-3 text-sm font-semibold">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 text-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black"><Newspaper className="text-fuchsia-500" /> Berita Website</h2>
              <button className="rounded bg-fuchsia-500 px-3 py-2 text-xs font-bold text-white"><Plus size={14} className="inline" /> Tambah</button>
            </div>
            <div className="mt-4 space-y-3">
              {["Update layanan publishing", "Panduan metadata rilis", "Informasi pembayaran royalti"].map((item) => (
                <div key={item} className="rounded border border-slate-200 p-3 text-sm font-semibold">{item}</div>
              ))}
            </div>
          </div>
        </section>
    </main>
  );
}
