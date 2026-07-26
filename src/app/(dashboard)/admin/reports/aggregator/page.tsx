"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, RefreshCw, Trash2, Upload } from "lucide-react";

const STATUSES: Record<string, string> = {
  UPLOADING: "Mengupload",
  PROCESSING: "Memproses",
  READY_FOR_REVIEW: "Siap Diperiksa",
  FINALIZING: "Sedang Difinalisasi",
  FINALIZED: "Selesai",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
};

const AGGREGATORS = ["SoundOn", "Believe", "The Orchard", "FUGA", "EVEARA", "Loka", "Lainnya"];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID");
}

function pageNumbers(current: number, totalPages: number) {
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminReportsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [activeTab, setActiveTab] = useState<"batches" | "data">("batches");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", aggregator: "", period: "" });

  async function loadBatches(page = meta.page) {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(meta.limit) });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const res = await fetch(`/api/admin/reports?${params.toString()}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBatches(data.data || []);
      setMeta(data.meta || meta);
    } else {
      setMessage(data.message || "Gagal mengambil report");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadBatches(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteBatch(id: number) {
    if (!confirm("Hapus batch report ini?")) return;
    const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "Report dihapus." : "Gagal menghapus report."));
    if (res.ok) loadBatches();
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin/reports" className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800">
        <ArrowLeft size={14} /> Kembali ke Pilihan Report
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">Aggregator Reporting</p>
          <h1 className="mt-2 text-3xl font-black">Aggregator Reporting</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadBatches()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">
            <RefreshCw size={14} /> Recheck New ISRCs
          </button>
          <Link href="/admin/reports/import" className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-500 px-4 py-2 text-xs font-bold text-white">
            <Upload size={14} /> Import Report
          </Link>
        </div>
      </div>

      <div className="mt-6 flex rounded-xl border border-slate-200 bg-white p-1">
        <button onClick={() => setActiveTab("batches")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "batches" ? "bg-fuchsia-500 text-white" : "text-slate-500"}`}>Report Batches</button>
        <button onClick={() => setActiveTab("data")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === "data" ? "bg-fuchsia-500 text-white" : "text-slate-500"}`}>Data</button>
      </div>
      {message && <p className="mt-4 rounded-xl bg-slate-100 p-4 text-xs font-bold text-slate-600">{message}</p>}

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <input placeholder="Search" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua Status</option>
            {Object.entries(STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={filters.aggregator} onChange={(e) => setFilters((p) => ({ ...p, aggregator: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua Aggregator</option>
            {AGGREGATORS.map((name) => <option key={name}>{name}</option>)}
          </select>
          <button onClick={() => loadBatches(1)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>

        {activeTab === "data" ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-500">Pilih batch dan klik View untuk melihat data detail report.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["File Name","Report Period","Aggregator","Sheet","# of Rows","Matched","No Account","Conflict","Invalid","Uploaded By","Uploaded At","Status","Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={13} className="p-8 text-center">Memuat...</td></tr>
                ) : batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-bold">{batch.original_file_name}</td>
                    <td className="px-4 py-3">{batch.report_period || "-"}</td>
                    <td className="px-4 py-3">{batch.aggregator_name}</td>
                    <td className="px-4 py-3">{batch.sheet_name || "-"}</td>
                    <td className="px-4 py-3">{batch.total_rows}</td>
                    <td className="px-4 py-3 text-emerald-600">{batch.matched_rows}</td>
                    <td className="px-4 py-3 text-amber-600">{batch.no_account_rows}</td>
                    <td className="px-4 py-3 text-red-600">{batch.conflict_rows}</td>
                    <td className="px-4 py-3 text-red-600">{batch.invalid_rows}</td>
                    <td className="px-4 py-3">{batch.uploaded_by_name || batch.uploaded_by}</td>
                    <td className="px-4 py-3">{formatDate(batch.uploaded_at)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{STATUSES[batch.status] || batch.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/admin/reports/${batch.id}`} className="rounded-lg bg-blue-50 p-2 text-blue-700"><Eye size={14} /></Link>
                        {batch.status !== "FINALIZED" && <button onClick={() => deleteBatch(batch.id)} className="rounded-lg bg-red-50 p-2 text-red-700"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-500">
            Menampilkan {batches.length} dari {meta.total} batch
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadBatches(meta.page - 1)}
              disabled={meta.page <= 1 || isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            {pageNumbers(meta.page, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => loadBatches(page)}
                disabled={isLoading}
                className={`h-9 min-w-9 rounded-lg px-3 text-xs font-black ${
                  page === meta.page ? "bg-fuchsia-500 text-white" : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => loadBatches(meta.page + 1)}
              disabled={meta.page >= totalPages || isLoading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
