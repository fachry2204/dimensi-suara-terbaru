"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Save, Search, UserPlus, XCircle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  MATCHED: "Akun Ditemukan",
  NO_ACCOUNT: "Tidak Ada Akun",
  CONFLICT: "Konflik Data",
  INVALID: "Data Tidak Valid",
};

function idr(value: unknown) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function pageNumbers(current: number, totalPages: number) {
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function AdminReportDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const [batch, setBatch] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", currency: "" });
  const [rates, setRates] = useState<Record<string, string>>({ IDR: "1" });
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmUnresolved, setConfirmUnresolved] = useState(false);

  async function loadBatch() {
    const res = await fetch(`/api/admin/reports/${batchId}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBatch(data.data);
      const saved = data.data?.currency_rates_snapshot ? JSON.parse(data.data.currency_rates_snapshot) : {};
      const nextRates: Record<string, string> = { IDR: "1" };
      (data.data?.currency_totals || []).forEach((item: any) => {
        nextRates[item.currency || "IDR"] = String(saved[item.currency] || (item.currency === "IDR" ? 1 : ""));
      });
      setRates(nextRates);
    } else setMessage(data.message || "Gagal mengambil detail report");
  }

  async function loadRows(page = meta.page) {
    const params = new URLSearchParams({ page: String(page), limit: String(meta.limit) });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const res = await fetch(`/api/admin/reports/${batchId}/rows?${params.toString()}`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRows(data.data || []);
      setMeta(data.meta || meta);
    }
  }

  async function loadUsers() {
    const res = await fetch("/api/users", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => []);
    if (res.ok) setUsers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    Promise.all([loadBatch(), loadRows(1), loadUsers()]).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const unresolved = useMemo(() => Number(batch?.no_account_rows || 0) + Number(batch?.conflict_rows || 0) + Number(batch?.invalid_rows || 0), [batch]);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  async function saveRates() {
    setIsBusy(true);
    const payload = Object.fromEntries(Object.entries(rates).map(([key, value]) => [key, Number(value)]));
    const res = await fetch(`/api/admin/reports/${batchId}/exchange-rates`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "Kurs berhasil disimpan." : "Gagal menyimpan kurs."));
    await Promise.all([loadBatch(), loadRows()]);
    setIsBusy(false);
  }

  async function recheck() {
    setIsBusy(true);
    setMessage("Sedang Memeriksa UPC dan ISRC Terbaru...");
    const res = await fetch(`/api/admin/reports/${batchId}/recheck`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "Pemeriksaan ulang selesai." : "Recheck gagal."));
    await Promise.all([loadBatch(), loadRows()]);
    setIsBusy(false);
  }

  async function finalize() {
    if (!confirm("Finalisasi Report?\n\nSetelah difinalisasi, pendapatan akan masuk ke laporan user.")) return;
    setIsBusy(true);
    setMessage("Sedang Memfinalisasi Report...");
    const res = await fetch(`/api/admin/reports/${batchId}/finalize`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmUnresolved }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "Report berhasil difinalisasi." : "Report gagal difinalisasi."));
    await Promise.all([loadBatch(), loadRows()]);
    setIsBusy(false);
  }

  async function assignUser(rowId: number) {
    const userId = assignments[rowId];
    if (!userId) {
      setMessage("Pilih user terlebih dahulu.");
      return;
    }
    setIsBusy(true);
    const res = await fetch(`/api/admin/reports/${batchId}/rows/${rowId}/assign-user`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "User berhasil di-assign." : "Gagal assign user."));
    await Promise.all([loadBatch(), loadRows()]);
    setIsBusy(false);
  }

  async function resetAssignment(rowId: number) {
    if (!confirm("Reset manual assignment untuk baris ini?")) return;
    setIsBusy(true);
    const res = await fetch(`/api/admin/reports/${batchId}/rows/${rowId}/assignment`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    setMessage(data.message || (res.ok ? "Assignment berhasil direset." : "Gagal reset assignment."));
    await Promise.all([loadBatch(), loadRows()]);
    setIsBusy(false);
  }

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin/reports/aggregator" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Aggregator Reporting / View Report
      </Link>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black">{batch?.original_file_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Nilai pada sistem dapat memiliki selisih pembulatan dibandingkan file asli. Silakan periksa total sebelum finalisasi.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-black">{batch?.status}</span>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Total Rows", batch?.total_rows],
          ["Total Gross IDR", idr(batch?.gross_idr_total || batch?.calculated_totals?.gross_idr_total)],
          ["Total Hak User", idr(batch?.user_revenue_total || batch?.calculated_totals?.user_revenue_total)],
          ["Total Hak Aggregator", idr(batch?.aggregator_revenue_total || batch?.calculated_totals?.aggregator_revenue_total)],
          ["Matched", batch?.matched_rows],
          ["Tidak Ada Akun", batch?.no_account_rows],
          ["Konflik", batch?.conflict_rows],
          ["Invalid", batch?.invalid_rows],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-900">{value ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="font-black">Kurs Currency ke IDR</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.keys(rates).map((currency) => (
            <label key={currency} className="text-xs font-bold uppercase text-slate-500">{currency}
              <input value={rates[currency]} onChange={(e) => setRates((p) => ({ ...p, [currency]: e.target.value }))} disabled={currency === "IDR"} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          ))}
          <button onClick={saveRates} disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white">
            <Save size={14} /> Simpan Kurs
          </button>
        </div>
      </section>

      {unresolved > 0 && (
        <label className="mt-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          <input type="checkbox" checked={confirmUnresolved} onChange={(e) => setConfirmUnresolved(e.target.checked)} />
          Masih ada {unresolved} baris report yang belum cocok ke akun. Baris ini tidak akan masuk ke laporan user sampai di-recheck atau di-assign manual.
        </label>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={recheck} disabled={isBusy || batch?.status === "FINALIZED"} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold">
          <RefreshCw size={14} /> Recheck New ISRCs
        </button>
        {batch?.status === "READY_FOR_REVIEW" && (
          <button onClick={finalize} disabled={isBusy || (unresolved > 0 && !confirmUnresolved)} className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            <CheckCircle2 size={14} /> Finalisasi Report
          </button>
        )}
        {message && <p className="self-center text-xs font-bold text-slate-600">{message}</p>}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input value={filters.currency} onChange={(e) => setFilters((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} placeholder="Currency" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={() => loadRows(1)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[2200px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["No","Artist","Track Title","Release","UPC","ISRC","Akun","Status Match","Platform","Country","Quantity","Currency","Gross Revenue","Rate","Gross IDR","User %","User Revenue","Aggregator %","Aggregator Revenue","Match Method","Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.row_number}</td>
                  <td className="px-4 py-3">{row.artist_name}</td>
                  <td className="px-4 py-3">{row.track_title}</td>
                  <td className="px-4 py-3">{row.release_title}</td>
                  <td className="px-4 py-3 font-mono">{row.upc_original}</td>
                  <td className="px-4 py-3 font-mono">{row.isrc_original}</td>
                  <td className="px-4 py-3 font-semibold">{row.full_name || row.company_name || row.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      row.status === "MATCHED" ? "bg-emerald-50 text-emerald-700" :
                      row.status === "NO_ACCOUNT" ? "bg-amber-50 text-amber-700" :
                      row.status === "CONFLICT" ? "bg-rose-50 text-rose-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.platform}</td>
                  <td className="px-4 py-3">{row.country_region}</td>
                  <td className="px-4 py-3 text-right">{row.quantity}</td>
                  <td className="px-4 py-3">{row.client_payment_currency}</td>
                  <td className="px-4 py-3 text-right">{row.net_revenue}</td>
                  <td className="px-4 py-3 text-right">{row.exchange_rate || "-"}</td>
                  <td className="px-4 py-3 text-right">{idr(row.gross_idr_final)}</td>
                  <td className="px-4 py-3 text-right">{row.user_percentage || "-"}</td>
                  <td className="px-4 py-3 text-right">{idr(row.user_revenue)}</td>
                  <td className="px-4 py-3 text-right">{row.aggregator_percentage || "-"}</td>
                  <td className="px-4 py-3 text-right">{idr(row.aggregator_revenue)}</td>
                  <td className="px-4 py-3">{row.match_method || "-"}</td>
                  <td className="px-4 py-3">
                    {batch?.status === "FINALIZED" ? (
                      <span className="text-xs font-bold text-slate-400">Terkunci</span>
                    ) : (
                      <div className="flex min-w-[300px] items-center gap-2">
                        <select
                          value={assignments[row.id] || ""}
                          onChange={(e) => setAssignments((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          className="w-44 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                        >
                          <option value="">Assign User</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.company_name || user.email}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignUser(row.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <UserPlus size={13} /> Assign
                        </button>
                        {row.assignment_method === "MANUAL" && (
                          <button
                            onClick={() => resetAssignment(row.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50"
                          >
                            <XCircle size={13} /> Reset
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-500">
            Menampilkan {rows.length} dari {meta.total} baris report
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadRows(meta.page - 1)}
              disabled={meta.page <= 1 || isBusy}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            {pageNumbers(meta.page, totalPages).map((page) => (
              <button
                key={page}
                onClick={() => loadRows(page)}
                disabled={isBusy}
                className={`h-9 min-w-9 rounded-lg px-3 text-xs font-black ${
                  page === meta.page ? "bg-fuchsia-500 text-white" : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => loadRows(meta.page + 1)}
              disabled={meta.page >= totalPages || isBusy}
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
