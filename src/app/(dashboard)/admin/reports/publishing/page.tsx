"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Upload } from "lucide-react";

export default function AdminPublishingReportsPage() {
  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin/reports" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali ke Pilihan Report
      </Link>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-400">Publishing Reporting</p>
            <h1 className="mt-2 text-3xl font-black">Report Publishing</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Halaman khusus laporan publishing untuk data karya, pencipta, pembagian publishing, dan finalisasi report publishing.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-xs font-bold text-white">
            <Upload size={14} /> Upload Report Publishing
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500 text-white">
            <FileText size={24} />
          </div>
          <h2 className="mt-4 text-xl font-black">Data Report Publishing</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
            Area ini dipisahkan dari report aggregator agar perubahan publishing tidak memengaruhi workflow aggregator.
          </p>
        </div>
      </section>
    </main>
  );
}
