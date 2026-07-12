"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, FileText, Music, Users } from "lucide-react";

export default function AdminStatisticsPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/releases", { cache: "no-store" }).then((r) => r.ok ? r.json() : []).then((d) => setReleases(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/publishing/songs", { cache: "no-store" }).then((r) => r.ok ? r.json() : []).then((d) => setSongs(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const stats = [
    ["Total Aggregator", releases.length, Music, "Rilis client aggregator"],
    ["Aggregator Live", releases.filter((r) => r.status === "Live" || r.status === "Released").length, BarChart3, "Rilis aktif"],
    ["Total Publishing", songs.length, FileText, "Data lagu publishing"],
    ["Publishing Accepted", songs.filter((s) => s.status === "accepted").length, Users, "Lagu diterima"],
  ];

  return (
    <main className="py-6 text-slate-800">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-4">
          ← Menuju Dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-black">Statistik Aggregator dan Publishing</h1>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value, Icon, desc]: any) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 text-slate-900">
              <Icon size={22} className="text-fuchsia-500" />
              <div className="mt-4 text-3xl font-black">{value}</div>
              <div className="mt-1 text-sm font-bold">{label}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          ))}
        </section>
    </main>
  );
}
