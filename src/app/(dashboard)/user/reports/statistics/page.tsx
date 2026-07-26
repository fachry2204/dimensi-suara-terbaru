"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Disc3, Loader2, Music2, Play, WalletCards } from "lucide-react";

function idr(value: unknown) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function monthLabel(value: string) {
  if (!value) return "-";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export default function UserReportAnalyticsPage() {
  const [data, setData] = useState<any>({ summary: {}, monthly: [], platforms: [], tracks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/reports?view=analytics", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || "Gagal mengambil analitik report.");
        setData(payload);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthly = useMemo(
    () => Math.max(1, ...data.monthly.map((item: any) => Number(item.revenue || 0))),
    [data.monthly]
  );
  const maxPlatform = useMemo(
    () => Math.max(1, ...data.platforms.map((item: any) => Number(item.revenue || 0))),
    [data.platforms]
  );

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center gap-3 text-slate-500"><Loader2 className="animate-spin" /> Memuat analitik report...</div>;
  }

  return (
    <main className="py-6 text-slate-800">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">Report</p>
      <h1 className="mt-2 text-3xl font-black">Analitik Royalti</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">Hanya menampilkan report yang telah direview dan difinalisasi Admin untuk UPC/ISRC milik Anda.</p>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Royalti", idr(data.summary.total_revenue), WalletCards],
          ["Quantity / Streams", number(data.summary.total_quantity), Play],
          ["Track Terdeteksi", number(data.summary.total_tracks), Music2],
          ["Periode Report", number(data.summary.total_batches), Disc3],
        ].map(([label, value, Icon]: any) => (
          <article key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <Icon size={21} className="text-fuchsia-500" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black"><BarChart3 size={19} className="text-fuchsia-500" /> Tren Royalti Bulanan</h2>
          {data.monthly.length === 0 ? (
            <p className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">Belum ada report finalized.</p>
          ) : (
            <div className="mt-6 flex h-72 items-end gap-3 overflow-x-auto pb-2">
              {data.monthly.map((item: any) => (
                <div key={item.period} className="flex h-full min-w-20 flex-1 flex-col justify-end">
                  <p className="mb-2 text-center text-[11px] font-bold text-slate-600">{idr(item.revenue)}</p>
                  <div className="mx-auto w-full max-w-14 rounded-t-lg bg-gradient-to-t from-fuchsia-600 to-violet-400" style={{ height: `${Math.max(5, (Number(item.revenue) / maxMonthly) * 190)}px` }} />
                  <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">{monthLabel(item.period)}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Platform Teratas</h2>
          <div className="mt-5 space-y-5">
            {data.platforms.map((item: any) => (
              <div key={item.name}>
                <div className="flex items-end justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-700">{item.name}</span>
                  <span className="text-right text-xs font-black text-slate-600">{idr(item.revenue)}<br /><span className="font-medium text-slate-400">{number(item.quantity)} streams</span></span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${Math.max(2, (Number(item.revenue) / maxPlatform) * 100)}%` }} />
                </div>
              </div>
            ))}
            {data.platforms.length === 0 && <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-400">Belum ada data platform.</p>}
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black">Track dengan Royalti Terbesar</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Track</th><th className="px-5 py-3">ISRC</th><th className="px-5 py-3 text-right">Quantity</th><th className="px-5 py-3 text-right">Royalti</th></tr></thead>
            <tbody>
              {data.tracks.map((item: any) => (
                <tr key={`${item.isrc}-${item.title}`} className="border-t border-slate-100">
                  <td className="px-5 py-4"><p className="font-bold text-slate-800">{item.title}</p><p className="text-xs text-slate-400">{item.artist_name || "-"}</p></td>
                  <td className="px-5 py-4 font-mono text-xs">{item.isrc || "-"}</td>
                  <td className="px-5 py-4 text-right">{number(item.quantity)}</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600">{idr(item.revenue)}</td>
                </tr>
              ))}
              {data.tracks.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-400">Belum ada data track finalized.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
