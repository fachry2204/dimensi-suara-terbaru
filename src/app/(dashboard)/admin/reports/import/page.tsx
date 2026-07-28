"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  FileSearch,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";

const AGGREGATORS = ["SoundOn", "Believe", "The Orchard", "FUGA", "EVEARA", "Loka", "Lainnya"];
const MONTHS = [
  ["01", "Januari"],
  ["02", "Februari"],
  ["03", "Maret"],
  ["04", "April"],
  ["05", "Mei"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "Agustus"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "Desember"],
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, index) => String(CURRENT_YEAR + 1 - index));
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminImportReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [form, setForm] = useState({
    aggregatorName: "SoundOn",
    reportMonth: String(now.getMonth() + 1).padStart(2, "0"),
    reportYear: String(now.getFullYear()),
    file: null as File | null,
  });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");

  function selectFile(file: File | null) {
    if (!file) return;
    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setMessage("Format file harus XLSX, XLS, atau CSV.");
      return;
    }
    setForm((previous) => ({ ...previous, file }));
    setMessage("");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] || null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] || null);
  }

  function removeFile() {
    setForm((previous) => ({ ...previous, file: null }));
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.file) {
      setMessage("Pilih file report terlebih dahulu.");
      return;
    }

    setBusy(true);
    setMessage("Mengupload, membaca UPC/ISRC, dan mencari pemilik lagu...");
    const payload = new FormData();
    payload.append("aggregatorName", form.aggregatorName);
    payload.append("reportPeriod", `${form.reportMonth}/${form.reportYear}`);
    payload.append("file", form.file);
    const res = await fetch("/api/admin/reports/upload", {
      method: "POST",
      credentials: "include",
      body: payload,
    });
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
      <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Menu Report
      </Link>

      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-500">Report</p>
        <h1 className="mt-2 text-3xl font-black">Import Report</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
          Upload laporan aggregator, pilih periode, lalu review hasil pencocokan UPC dan ISRC sebelum finalisasi.
        </p>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["1", "Import", "Upload file Excel atau CSV dari aggregator.", Upload],
          ["2", "Review Kepemilikan", "Sistem mencocokkan UPC dan ISRC dengan katalog user.", FileSearch],
          ["3", "Finalisasi", "Hanya baris yang cocok yang masuk ke report user.", CheckCircle2],
        ].map(([number, title, description, Icon]: any) => (
          <article key={number} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-50 text-sm font-black text-fuchsia-600">{number}</span>
              <Icon size={19} className="text-fuchsia-500" />
            </div>
            <h2 className="mt-4 font-black">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </article>
        ))}
      </section>

      <form onSubmit={submit} className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900">Informasi Report</h2>
          <p className="mt-1 text-sm text-slate-500">Tentukan sumber dan periode pendapatan yang tercantum pada file.</p>
        </div>

        <div className="p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Nama Aggregator
              <select
                value={form.aggregatorName}
                onChange={(event) => setForm((previous) => ({ ...previous, aggregatorName: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50"
              >
                {AGGREGATORS.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>

            <fieldset>
              <legend className="text-sm font-bold text-slate-700">Periode Report</legend>
              <div className="mt-2 grid grid-cols-[1fr_0.8fr] gap-3">
                <label className="relative">
                  <span className="sr-only">Bulan report</span>
                  <CalendarDays size={17} className="pointer-events-none absolute left-4 top-3.5 text-fuchsia-500" />
                  <select
                    aria-label="Bulan report"
                    value={form.reportMonth}
                    onChange={(event) => setForm((previous) => ({ ...previous, reportMonth: event.target.value }))}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50"
                  >
                    {MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Tahun report</span>
                  <select
                    aria-label="Tahun report"
                    value={form.reportYear}
                    onChange={(event) => setForm((previous) => ({ ...previous, reportYear: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50"
                  >
                    {YEARS.map((year) => <option key={year}>{year}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-700">File Report</h3>
                <p className="mt-1 text-xs text-slate-400">Format yang didukung: XLSX, XLS, dan CSV.</p>
              </div>
              <span className="hidden text-xs font-bold text-slate-400 sm:block">1 file per import</span>
            </div>

            {form.file ? (
              <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{form.file.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{fileSize(form.file.size)} · Siap diimport</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            ) : (
              <label
                htmlFor="report-file"
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-6 text-center transition sm:py-7 ${
                  dragging
                    ? "border-fuchsia-500 bg-fuchsia-50 shadow-[0_0_0_4px_rgba(217,70,239,0.08)]"
                    : "border-slate-200 bg-slate-50/70 hover:border-fuchsia-300 hover:bg-fuchsia-50/40"
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-fuchsia-600 shadow-sm">
                  <CloudUpload size={22} />
                </span>
                <span className="mt-3 text-sm font-black text-slate-800">Tarik dan letakkan file di sini</span>
                <span className="mt-1 text-xs text-slate-500">atau klik untuk memilih file dari komputer</span>
                <span className="mt-3 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-black text-white shadow-sm">Pilih File Report</span>
                <input
                  ref={fileInputRef}
                  id="report-file"
                  required
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <details className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-bold text-slate-700">Lihat daftar kolom wajib dalam file</summary>
            <p className="mt-3 font-medium leading-6">
              Reporting Month, Sales Month, Platform, Country/Region, Label Name, Artist Name, Release Title, Track Title,
              UPC, ISRC, Streaming Subscription Type, Release Type, Sales Type, Quantity, Client Payment Currency, dan Net Revenue.
            </p>
          </details>

          {message && (
            <p className={`mt-4 rounded-xl p-4 text-sm font-bold ${busy ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"}`}>
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            Periode dipilih: {MONTHS.find(([value]) => value === form.reportMonth)?.[1]} {form.reportYear}
          </p>
          <button
            disabled={busy || !form.file}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-fuchsia-100 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
            {busy ? "Memproses Report..." : "Import & Review"}
          </button>
        </div>
      </form>
    </main>
  );
}
