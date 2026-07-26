"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

const AGGREGATORS = ["SoundOn", "Believe", "The Orchard", "FUGA", "EVEARA", "Loka", "Lainnya"];

export default function AdminImportReportPage() {
  const router = useRouter();
  const [form, setForm] = useState({ aggregatorName: "SoundOn", reportPeriod: "", file: null as File | null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.file) return setMessage("Pilih file report terlebih dahulu.");
    setBusy(true);
    setMessage("Mengupload, membaca UPC/ISRC, dan mencari pemilik lagu...");
    const payload = new FormData();
    payload.append("aggregatorName", form.aggregatorName);
    payload.append("reportPeriod", form.reportPeriod);
    payload.append("file", form.file);
    const res = await fetch("/api/admin/reports/upload", { method: "POST", credentials: "include", body: payload });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.data?.batchId) {
      router.push(`/admin/reports/${data.data.batchId}`);
      return;
    }
    setMessage(data.message || "Report gagal diproses.");
    setBusy(false);
  }

  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Menu Report</Link>
      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">Report</p>
        <h1 className="mt-2 text-3xl font-black">Import Report</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">Setelah file berhasil dibaca, Anda langsung diarahkan ke halaman review. Data belum masuk ke user sampai Admin memeriksa pemilik dan menekan Finalisasi Report.</p>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["1", "Import", "Upload file Excel atau CSV dari aggregator.", Upload],
          ["2", "Review Kepemilikan", "Sistem mencocokkan UPC dan ISRC dengan katalog user.", FileSearch],
          ["3", "Finalisasi", "Hanya baris yang cocok yang masuk ke report user.", CheckCircle2],
        ].map(([number, title, description, Icon]: any) => (
          <article key={number} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-50 text-sm font-black text-fuchsia-600">{number}</span><Icon size={19} className="text-fuchsia-500" /></div>
            <h2 className="mt-4 font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </article>
        ))}
      </section>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Nama Aggregator
            <select value={form.aggregatorName} onChange={(e) => setForm((p) => ({ ...p, aggregatorName: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium">
              {AGGREGATORS.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Periode Report
            <input required value={form.reportPeriod} onChange={(e) => setForm((p) => ({ ...p, reportPeriod: e.target.value }))} placeholder="MM/YYYY — contoh 06/2026" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium" />
          </label>
        </div>
        <label className="mt-5 block text-sm font-bold text-slate-700">File Report
          <input required type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm" />
        </label>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs font-medium leading-6 text-slate-600">
          Kolom wajib: Reporting Month, Sales Month, Platform, Country/Region, Label Name, Artist Name, Release Title, Track Title, UPC, ISRC, Streaming Subscription Type, Release Type, Sales Type, Quantity, Client Payment Currency, dan Net Revenue.
        </div>
        {message && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</p>}
        <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />} Import & Review
        </button>
      </form>
    </main>
  );
}
