"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Building2, CheckCircle2, CircleCheck, ListChecks, Loader2, RefreshCw, Save, Search, ShieldX, UserPlus, UserRoundCheck, UserX, WalletCards, XCircle } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  MATCHED: "Akun Ditemukan",
  NO_ACCOUNT: "Tidak Ada Akun",
  CONFLICT: "Konflik Data",
  INVALID: "Data Tidak Valid",
};

function idr(value: unknown) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatStatusLabel(value: unknown) {
  return String(value || "-").replaceAll("_", " ");
}

function pageNumbers(current: number, totalPages: number) {
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function parseMatchDetails(value: unknown) {
  if (!value) return { upc: [], isrc: [] };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      upc: Array.isArray((parsed as any)?.upc) ? (parsed as any).upc : [],
      isrc: Array.isArray((parsed as any)?.isrc) ? (parsed as any).isrc : [],
    };
  } catch {
    return { upc: [], isrc: [] };
  }
}

function OwnershipEvidence({ row }: { row: any }) {
  const evidence = parseMatchDetails(row.match_details);
  const uniqueCodes = (values: unknown[]) => Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
  const catalogUpcs = row.matched_catalog_upc
    ? [String(row.matched_catalog_upc)]
    : uniqueCodes([...evidence.upc.map((item: any) => item.catalogUpc), ...evidence.isrc.map((item: any) => item.catalogUpc)]);
  const catalogIsrcs = row.matched_catalog_isrc
    ? [String(row.matched_catalog_isrc)]
    : uniqueCodes(evidence.isrc.map((item: any) => item.catalogIsrc));
  const render = (label: string, codes: string[]) => (
    <div>
      <span className="font-black text-slate-500">{label}:</span>{" "}
      <span className="font-mono">{codes.length ? codes.join(", ") : "tidak ditemukan"}</span>
    </div>
  );
  return (
    <div className="min-w-56 space-y-1 text-xs leading-5 text-slate-600">
      {render("UPC", catalogUpcs)}
      {render("ISRC", catalogIsrcs)}
      {row.error_message && <p className="font-semibold text-rose-600">{row.error_message}</p>}
      {row.warning_message && <p className="font-semibold text-amber-600">{row.warning_message}</p>}
    </div>
  );
}

export default function AdminReportDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const [batch, setBatch] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", currency: "", metric: "" });
  const [activeSummaryCard, setActiveSummaryCard] = useState("total");
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

  async function loadRows(page = meta.page, nextFilters = filters) {
    const params = new URLSearchParams({ page: String(page), limit: String(meta.limit) });
    Object.entries(nextFilters).forEach(([key, value]) => value && params.set(key, value));
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

  const summaryCards = [
    { id: "total", label: "Total Rows", value: batch?.total_rows ?? 0, description: "Seluruh baris dalam report", icon: ListChecks, status: "", metric: "", tone: "from-slate-600 to-slate-800", surface: "bg-slate-50", text: "text-slate-700" },
    { id: "gross", label: "Total Gross IDR", value: idr(batch?.gross_idr_total || batch?.calculated_totals?.gross_idr_total), description: "Baris dengan gross revenue", icon: WalletCards, status: "", metric: "gross", tone: "from-blue-500 to-indigo-600", surface: "bg-blue-50", text: "text-blue-700" },
    { id: "user", label: "Total Hak User", value: idr(batch?.user_revenue_total || batch?.calculated_totals?.user_revenue_total), description: "Pendapatan yang menjadi hak user", icon: UserRoundCheck, status: "", metric: "user", tone: "from-violet-500 to-fuchsia-600", surface: "bg-violet-50", text: "text-violet-700" },
    { id: "aggregator", label: "Total Hak Aggregator", value: idr(batch?.aggregator_revenue_total || batch?.calculated_totals?.aggregator_revenue_total), description: "Pendapatan yang menjadi hak aggregator", icon: Building2, status: "", metric: "aggregator", tone: "from-cyan-500 to-teal-600", surface: "bg-cyan-50", text: "text-cyan-700" },
    { id: "matched", label: "Matched", value: batch?.matched_rows ?? 0, description: "UPC/ISRC berhasil menemukan pemilik", icon: CircleCheck, status: "MATCHED", metric: "", tone: "from-emerald-500 to-green-600", surface: "bg-emerald-50", text: "text-emerald-700" },
    { id: "no-account", label: "Tidak Ada Akun", value: batch?.no_account_rows ?? 0, description: "Belum menemukan katalog milik user", icon: UserX, status: "NO_ACCOUNT", metric: "", tone: "from-amber-400 to-orange-500", surface: "bg-amber-50", text: "text-amber-700" },
    { id: "conflict", label: "Konflik", value: batch?.conflict_rows ?? 0, description: "UPC dan ISRC perlu ditinjau", icon: AlertTriangle, status: "CONFLICT", metric: "", tone: "from-orange-500 to-rose-500", surface: "bg-orange-50", text: "text-orange-700" },
    { id: "invalid", label: "Invalid", value: batch?.invalid_rows ?? 0, description: "Baris tidak dapat diproses", icon: ShieldX, status: "INVALID", metric: "", tone: "from-rose-500 to-red-700", surface: "bg-rose-50", text: "text-rose-700" },
  ];

  function activateSummaryCard(card: (typeof summaryCards)[number]) {
    const nextFilters = { ...filters, status: card.status, metric: card.metric };
    setActiveSummaryCard(card.id);
    setFilters(nextFilters);
    loadRows(1, nextFilters);
    window.setTimeout(() => document.getElementById("report-data-table")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

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
          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-xs font-black">{formatStatusLabel(batch?.status)}</span>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const active = activeSummaryCard === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => activateSummaryCard(card)}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${card.surface} ${active ? "border-slate-400 ring-4 ring-slate-200/70" : "border-white"}`}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.tone}`} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs font-black uppercase tracking-wide ${card.text}`}>{card.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{card.value}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${card.tone}`}>
                  <Icon size={21} />
                </span>
              </div>
              <p className="mt-4 text-xs font-medium leading-5 text-slate-500">{card.description}</p>
              <p className={`mt-3 text-[11px] font-black uppercase tracking-wide ${card.text}`}>
                {active ? "Sedang ditampilkan" : "Klik untuk lihat data"}
              </p>
            </button>
          );
        })}
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

      <section id="report-data-table" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={filters.status} onChange={(e) => { setActiveSummaryCard(""); setFilters((p) => ({ ...p, status: e.target.value, metric: "" })); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input value={filters.currency} onChange={(e) => setFilters((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} placeholder="Currency" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button onClick={() => { setActiveSummaryCard(""); loadRows(1); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Filter</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["No","Artist","Track Title","Release","UPC","ISRC","Akun","Bukti Kepemilikan","Status Match","Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
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
                  <td className="px-4 py-3"><OwnershipEvidence row={row} /></td>
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
