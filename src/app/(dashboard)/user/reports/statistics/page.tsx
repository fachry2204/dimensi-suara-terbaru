"use client";

import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Clock, Disc, Loader2, Music, TrendingUp } from "lucide-react";

export default function UserAggregatorStatisticsPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/releases", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReleases(Array.isArray(data) ? data : []))
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  const live = releases.filter((item) => item.status === "Live" || item.status === "Released").length;
  const pending = releases.filter((item) => (item.status || "Pending") === "Pending").length;
  const tracks = releases.reduce((sum, item) => sum + (item.tracks?.length || 0), 0);

  const stats = [
    ["Total Rilis", releases.length, Disc, "Semua rilis aggregator"],
    ["Rilis Live", live, CheckCircle2, "Aktif di DSP"],
    ["Menunggu", pending, Clock, "Menunggu review"],
    ["Total Track", tracks, Music, "Track dalam katalog"],
  ];

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800">
          <BarChart3 className="text-[#aa91cc]" /> Statistik Aggregator
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan performa dan status rilis aggregator Anda.</p>
      </header>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 rounded-lg bg-white p-8 text-slate-500">
          <Loader2 className="animate-spin" /> Memuat statistik...
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([label, value, Icon, desc]: any) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                <Icon className="text-[#aa91cc]" size={22} />
                <div className="mt-4 text-3xl font-black text-slate-900">{value}</div>
                <div className="mt-1 text-sm font-bold text-slate-700">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </div>
            ))}
          </section>
          <section className="mt-6 rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-800">
              <TrendingUp size={18} className="text-[#aa91cc]" /> Tren Bulanan
            </h2>
            <div className="mt-5 h-56 rounded bg-slate-50 p-4 text-sm text-slate-400">
              Grafik statistik aggregator akan tampil saat data laporan tersedia.
            </div>
          </section>
        </>
      )}
    </main>
  );
}
