"use client";

import Link from "next/link";
import {
  BarChart3,
  FileBarChart,
  FileText,
  Headphones,
  LineChart,
  MessageCircle,
  Megaphone,
  Newspaper,
  Settings,
  Ticket,
  Users,
  Zap,
} from "lucide-react";

const adminCards = [
  {
    title: "Aggregator",
    href: "/admin/releases",
    icon: BarChart3,
    description: "Semua release aggregator client dengan tampilan katalog rilis.",
    tone: "bg-sky-500",
    bgTone: "bg-sky-50 hover:bg-sky-100 border-sky-100/80 text-sky-950",
  },
  {
    title: "Publishing",
    href: "/admin/publishing",
    icon: FileText,
    description: "Semua data release publishing, pencipta, dan lagu.",
    tone: "bg-violet-500",
    bgTone: "bg-violet-50 hover:bg-violet-100 border-violet-100/80 text-violet-950",
  },
  {
    title: "Ticket",
    href: "/admin/tickets",
    icon: Ticket,
    description: "Semua ticket client dan percakapan support.",
    tone: "bg-amber-500",
    bgTone: "bg-amber-50 hover:bg-amber-100 border-amber-100/80 text-amber-950",
  },
  {
    title: "Data User",
    href: "/admin/users",
    icon: Users,
    description: "Data client user dan tab data admin.",
    tone: "bg-emerald-500",
    bgTone: "bg-emerald-50 hover:bg-emerald-100 border-emerald-100/80 text-emerald-950",
  },
  {
    title: "Statistik",
    href: "/admin/statistics",
    icon: LineChart,
    description: "Statistik aggregator dan publishing.",
    tone: "bg-blue-600",
    bgTone: "bg-blue-50 hover:bg-blue-100 border-blue-100/80 text-blue-950",
  },
  {
    title: "Laporan",
    href: "/admin/reports",
    icon: FileBarChart,
    description: "Data laporan, import, dan upload laporan.",
    tone: "bg-rose-500",
    bgTone: "bg-rose-50 hover:bg-rose-100 border-rose-100/80 text-rose-950",
  },
  {
    title: "CMS Website",
    href: "/admin/cms",
    icon: Newspaper,
    description: "Kelola FAQ dan berita website.",
    tone: "bg-fuchsia-500",
    bgTone: "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-100/80 text-fuchsia-950",
  },
  {
    title: "CRM Chat",
    href: "/admin/crm",
    icon: MessageCircle,
    description: "Omnichannel chat untuk layanan client.",
    tone: "bg-cyan-600",
    bgTone: "bg-cyan-50 hover:bg-cyan-100 border-cyan-100/80 text-cyan-950",
  },
  {
    title: "Pengumuman",
    href: "/admin/announcements",
    icon: Megaphone,
    description: "Buat popup pengumuman interaktif untuk dashboard user.",
    tone: "bg-pink-500",
    bgTone: "bg-pink-50 hover:bg-pink-100 border-pink-100/80 text-pink-950",
  },
  {
    title: "Setting",
    href: "/admin/settings",
    icon: Settings,
    description: "Logo, role, kontrak, SMTP, payment, backup, dan integrasi.",
    tone: "bg-slate-700",
    bgTone: "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800",
  },
  {
    title: "Tes Cek SoundOn",
    href: "/admin/tesSO",
    icon: Zap,
    description: "Pengecekan dan verifikasi data rilis di platform SoundOn.",
    tone: "bg-orange-500",
    bgTone: "bg-orange-50 hover:bg-orange-100 border-orange-100/80 text-orange-950",
  },
];

export default function AdminHomePage() {
  return (
    <main className="text-slate-800">
      <div className="flex w-full flex-col py-8 bg-white rounded-2xl px-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-600">Dimensi Suara Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">View Card Admin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pusat kontrol khusus role admin untuk monitoring client, laporan, CMS website, CRM, dan pengaturan sistem.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Headphones size={18} className="text-fuchsia-600" />
            <div>
              <div className="text-xs font-bold text-slate-800">Admin Full View</div>
              <div className="text-[11px] text-slate-500 font-medium">Tanpa sidebar</div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-6 py-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {adminCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative overflow-hidden flex min-h-44 flex-col justify-between rounded-[24px] border ${item.bgTone} p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
              >
                {/* Background Icon Overlay */}
                <div className="absolute right-[-20px] bottom-[-20px] text-current opacity-[0.08] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Icon size={120} strokeWidth={1.5} />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone} text-white shadow-md z-10`}>
                    <Icon size={21} />
                  </div>
                </div>
                <div className="mt-4 z-10">
                  <h2 className="text-xl font-extrabold">{item.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed opacity-75 font-semibold">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
