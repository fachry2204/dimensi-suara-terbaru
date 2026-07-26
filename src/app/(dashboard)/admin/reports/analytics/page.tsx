"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, FileSpreadsheet, Loader2, TriangleAlert, WalletCards } from "lucide-react";

const idr = (value: unknown) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown) => Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

export default function AdminReportAnalyticsPage() {
  const [data, setData] = useState<any>({ summary: {}, monthly: [], platforms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/reports/analytics", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || "Gagal mengambil analitik.");
        setData(payload);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxMonthly = useMemo(() => Math.max(1, ...data.monthly.map((item: any) => Number(item.user_revenue || 0) + Number(item.aggregator_revenue || 0))), [data.monthly]);
  const maxPlatform = useMemo(() => Math.max(1, ...data.platforms.map((item: any) => Number(item.revenue || 0))), [data.platforms]);

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center gap-3 text-slate-500"><Loader2 className="animate-spin" /> Memuat analitik...</div>;

  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Menu Report</Link>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">Report</p>
      <h1 className="mt-2 text-3xl font-black">Analitik Report</h1>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Batch", number(data.summary.total_batches), FileSpreadsheet],
          ["Batch Finalized", number(data.summary.finalized_batches), CheckCircle2],
          ["Baris Belum Cocok", number(data.summary.unresolved_rows), TriangleAlert],
          ["Total Hak User", idr(data.summary.user_revenue), WalletCards],
        ].map(([label, value, Icon]: any) => <article key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><Icon size={21} className="text-fuchsia-500" /><p className="mt-4 text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black"><BarChart3 size={19} className="text-fuchsia-500" /> Nilai Report Finalized</h2>
          <div className="mt-6 flex h-72 items-end gap-3 overflow-x-auto pb-2">
            {data.monthly.map((item: any) => {
              const total = Number(item.user_revenue || 0) + Number(item.aggregator_revenue || 0);
              return <div key={item.period} className="flex h-full min-w-20 flex-1 flex-col justify-end"><p className="mb-2 text-center text-[11px] font-bold">{idr(total)}</p><div className="mx-auto w-full max-w-14 rounded-t-lg bg-fuchsia-500" style={{ height: `${Math.max(5, total / maxMonthly * 190)}px` }} /><p className="mt-2 text-center text-[11px] font-semibold text-slate-500">{item.period}</p></div>;
            })}
            {data.monthly.length === 0 && <p className="m-auto text-sm text-slate-400">Belum ada report finalized.</p>}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Platform Teratas</h2>
          <div className="mt-5 space-y-5">{data.platforms.map((item: any) => <div key={item.name}><div className="flex justify-between gap-3 text-sm"><span className="font-bold">{item.name}</span><span className="text-right text-xs font-black">{idr(item.revenue)}<br /><span className="font-medium text-slate-400">{number(item.quantity)} streams</span></span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, Number(item.revenue) / maxPlatform * 100)}%` }} /></div></div>)}</div>
        </article>
      </section>
    </main>
  );
}
