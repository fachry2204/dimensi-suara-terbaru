"use client";

import { useEffect, useState } from "react";
import { BarChart3, Search } from "lucide-react";

function idr(value: unknown) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function UserReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadReports() {
    setIsLoading(true);
    const params = new URLSearchParams({ page: "1", limit: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/user/reports?${params.toString()}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows(data.data || []);
      setSummary(data.summary || {});
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="py-6 text-slate-800">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">Laporan Aggregator</p>
      <h1 className="mt-2 text-3xl font-black">Laporan Royalti</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Total Pendapatan", idr(summary.total_revenue)],
          ["Total Quantity/Streams", Number(summary.total_quantity || 0).toLocaleString("id-ID")],
          ["Total Periode", Number(summary.total_batches || 0).toLocaleString("id-ID")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <BarChart3 className="text-fuchsia-500" size={20} />
            <p className="mt-3 text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex gap-2 border-b border-slate-100 p-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari artist, release, track, UPC, ISRC..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <button onClick={loadReports} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Sales Month","Platform","Country","Artist","Release","Track","UPC","ISRC","Quantity","Gross IDR","Persentase User","Pendapatan User","Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={13} className="p-8 text-center">Memuat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center text-slate-400">Belum ada laporan finalized.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.sales_month || row.report_period}</td>
                  <td className="px-4 py-3">{row.platform}</td>
                  <td className="px-4 py-3">{row.country_region}</td>
                  <td className="px-4 py-3">{row.artist_name}</td>
                  <td className="px-4 py-3">{row.release_title}</td>
                  <td className="px-4 py-3">{row.track_title}</td>
                  <td className="px-4 py-3 font-mono">{row.upc}</td>
                  <td className="px-4 py-3 font-mono">{row.isrc}</td>
                  <td className="px-4 py-3 text-right">{row.quantity}</td>
                  <td className="px-4 py-3 text-right">{idr(row.gross_idr_snapshot)}</td>
                  <td className="px-4 py-3 text-right">{row.user_percentage_snapshot}%</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{idr(row.user_revenue_idr)}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Finalized</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
