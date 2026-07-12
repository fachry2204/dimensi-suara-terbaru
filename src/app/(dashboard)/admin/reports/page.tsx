"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, FileBarChart, FileText } from "lucide-react";

const reportCards = [
  {
    title: "Report Aggregator",
    href: "/admin/reports/aggregator",
    icon: BarChart3,
    description: "Upload, matching UPC/ISRC, kurs, finalisasi, dan laporan royalti aggregator.",
    tone: "bg-sky-500",
    bgTone: "bg-sky-50 hover:bg-sky-100 border-sky-100 text-sky-950",
  },
  {
    title: "Report Publishing",
    href: "/admin/reports/publishing",
    icon: FileText,
    description: "Kelola laporan publishing, pencipta, karya, pembagian publishing, dan finalisasi.",
    tone: "bg-violet-500",
    bgTone: "bg-violet-50 hover:bg-violet-100 border-violet-100 text-violet-950",
  },
];

export default function AdminReportsMenuPage() {
  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800">
        <ArrowLeft size={14} /> Menuju Dashboard
      </Link>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">Laporan</p>
            <h1 className="mt-2 text-3xl font-black">Pilih Jenis Report</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Pisahkan laporan aggregator dan publishing agar alur upload, matching, dan finalisasi tidak tercampur.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
            <FileBarChart size={24} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`group relative min-h-56 overflow-hidden rounded-2xl border ${card.bgTone} p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="absolute bottom-[-28px] right-[-18px] text-current opacity-10 transition-transform duration-300 group-hover:scale-110">
                  <Icon size={150} strokeWidth={1.4} />
                </div>
                <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl ${card.tone} text-white shadow-sm`}>
                  <Icon size={22} />
                </div>
                <div className="relative z-10 mt-8 max-w-md">
                  <h2 className="text-2xl font-black">{card.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
