"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, Megaphone, Save } from "lucide-react";

type Announcement = {
  id: number;
  title: string;
  body: string;
  start_date: string;
  end_date: string;
  created_at?: string;
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAnnouncements() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/announcements", { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function saveAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body, startDate, endDate }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan pengumuman");
      }

      setTitle("");
      setBody("");
      setStartDate("");
      setEndDate("");
      setMessage("Pengumuman berhasil disimpan.");
      await loadAnnouncements();
    } catch (error: any) {
      setMessage(error.message || "Gagal menyimpan pengumuman");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="text-slate-800">
      <Link href="/admin" className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-800">
        <ArrowLeft size={14} /> Menuju Dashboard
      </Link>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-600">Pengumuman</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Kelola Pengumuman User</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Pengumuman aktif akan muncul sebagai popup interaktif di dashboard user.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-200">
            <Megaphone size={22} />
          </div>
        </div>

        <form onSubmit={saveAnnouncement} className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-500">Judul Pengumuman</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-fuchsia-400"
              placeholder="Contoh: Informasi Pembayaran Royalti"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-500">Isi Pengumuman</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-fuchsia-400"
              placeholder="Tulis isi pengumuman untuk user..."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Tanggal Mulai</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-fuchsia-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Tanggal Selesai</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-fuchsia-400"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {message && (
              <p className={`text-xs font-bold ${message.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-fuchsia-600 px-7 text-sm font-bold text-white shadow-lg shadow-fuchsia-200 transition hover:bg-fuchsia-700 disabled:opacity-60 sm:ml-auto"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Pengumuman
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <CalendarDays size={20} className="text-fuchsia-500" /> List Pengumuman
        </h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Isi</th>
                <th className="px-4 py-3">Tanggal Mulai</th>
                <th className="px-4 py-3">Tanggal Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">Memuat pengumuman...</td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">Belum ada pengumuman.</td>
                </tr>
              ) : (
                announcements.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 font-black text-slate-900">{item.title}</td>
                    <td className="max-w-md px-4 py-4 font-medium leading-6 text-slate-600">{item.body}</td>
                    <td className="px-4 py-4 font-bold text-slate-700">{formatDate(item.start_date)}</td>
                    <td className="px-4 py-4 font-bold text-slate-700">{formatDate(item.end_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
