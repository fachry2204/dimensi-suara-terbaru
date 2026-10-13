"use client";

import Link from "next/link";
import { Clock3, Construction, FileText, ShieldCheck } from "lucide-react";

type PublishingReportSection = "Statistik" | "Laporan" | "Pembayaran";

export function PublishingReportsMaintenance({ section }: { section: PublishingReportSection }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/50">
        <div className="h-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500" />
        <div className="px-6 py-12 text-center sm:px-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-100 text-violet-600 shadow-inner">
            <Construction size={38} strokeWidth={1.8} />
          </div>
          <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <Clock3 size={14} /> Under Maintenance
          </span>
          <h1 className="mt-5 text-3xl font-black text-slate-900 sm:text-4xl">{section} Publishing</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
            Modul report Publishing sedang dalam pengembangan dan integrasi data. Data demo telah dinonaktifkan agar tidak dianggap sebagai laporan royalti yang sebenarnya.
          </p>
          <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <FileText className="text-violet-500" size={20} />
              <p className="mt-3 text-sm font-black text-slate-800">Integrasi Laporan</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Menyiapkan data laporan publishing yang valid dan terverifikasi.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <ShieldCheck className="text-emerald-500" size={20} />
              <p className="mt-3 text-sm font-black text-slate-800">Data Aman</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tidak ada nilai demo yang ditampilkan kepada user selama pemeliharaan.</p>
            </div>
          </div>
          <Link href="/user/publishing" className="mt-8 inline-flex items-center justify-center rounded-xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700">
            Kembali ke Menu Publishing
          </Link>
        </div>
      </section>
    </main>
  );
}
