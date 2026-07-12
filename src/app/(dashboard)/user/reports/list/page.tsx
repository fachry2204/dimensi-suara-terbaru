"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Download, FileSpreadsheet, Loader2 } from "lucide-react";

export default function UserAggregatorReportsPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/releases", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReleases(Array.isArray(data) ? data : []))
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800">
          <ClipboardList className="text-[#aa91cc]" /> Laporan Aggregator
        </h1>
        <p className="mt-1 text-sm text-slate-500">Daftar laporan distribusi aggregator berdasarkan katalog rilis Anda.</p>
      </header>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center gap-3 p-8 text-slate-500">
            <Loader2 className="animate-spin" /> Memuat laporan...
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Rilis</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal Submit</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releases.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    <FileSpreadsheet size={14} className="mr-2 inline text-[#aa91cc]" />
                    {item.title || "Rilis Tanpa Judul"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.status || "Pending"}</td>
                  <td className="px-4 py-3 text-slate-500">{item.submissionDate || item.submission_date || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1 rounded bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      <Download size={13} /> Unduh
                    </button>
                  </td>
                </tr>
              ))}
              {releases.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Belum ada laporan aggregator.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
