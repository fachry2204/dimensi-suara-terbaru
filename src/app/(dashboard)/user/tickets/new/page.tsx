"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, FileImage, Loader2, Search, Send, Ticket } from "lucide-react";
import { api } from "@/utils/api";

type ReleaseItem = {
  id: string | number;
  title?: string;
  upc?: string;
  tracks?: Array<{ isrc?: string; title?: string }>;
  primaryArtists?: any[];
};

const categories = ["Release", "Lepas Claim", "Publishing", "Lainnya"];

export default function UserTicketCreatePage() {
  const router = useRouter();
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [releaseQuery, setReleaseQuery] = useState("");
  const [releaseDropdownOpen, setReleaseDropdownOpen] = useState(false);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const releaseData = await api.getReleases("");
        setReleases(Array.isArray(releaseData) ? releaseData : []);
      } catch (error) {
        console.error("Failed to load ticket page data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredReleases = useMemo(() => {
    const q = releaseQuery.trim().toLowerCase();
    if (!q) return releases.slice(0, 8);

    return releases
      .filter((release) => {
        const title = String(release.title || "").toLowerCase();
        const upc = String(release.upc || "").toLowerCase();
        const artists = (release.primaryArtists || [])
          .map((artist) => (typeof artist === "string" ? artist : artist?.name || ""))
          .join(" ")
          .toLowerCase();
        return title.includes(q) || upc.includes(q) || artists.includes(q);
      })
      .slice(0, 8);
  }, [releaseQuery, releases]);

  const selectedRelease = releases.find((release) => String(release.id) === selectedReleaseId);
  const selectedUpc = selectedRelease?.upc || "";
  const selectedIsrc = selectedRelease?.tracks?.map((track) => track.isrc).filter(Boolean).join(", ") || "";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFileError("");
    setFile(null);

    if (!nextFile) return;

    const isAllowedType = ["image/jpeg", "image/jpg"].includes(nextFile.type);
    const hasAllowedExt = /\.(jpe?g)$/i.test(nextFile.name);
    const isAllowedSize = nextFile.size <= 1024 * 1024;

    if (!isAllowedType && !hasAllowedExt) {
      setFileError("File wajib JPG atau JPEG.");
      event.target.value = "";
      return;
    }

    if (!isAllowedSize) {
      setFileError("Ukuran file tidak boleh lebih dari 1MB.");
      event.target.value = "";
      return;
    }

    setFile(nextFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ticketTitle.trim() || !category || !selectedRelease || !message.trim() || !file || (category === "Lepas Claim" && !youtubeLink.trim())) {
      setFileError(!file ? "Upload file JPG/JPEG wajib diisi." : "");
      return;
    }

    setIsSubmitting(true);
    try {
      const subject = ticketTitle.trim();
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("category", category);
      formData.append("message", message.trim());
      formData.append("release_id", String(selectedRelease.id));
      formData.append("release_title", selectedRelease.title || "");
      formData.append("upc", selectedUpc);
      formData.append("isrc", selectedIsrc);
      if (category === "Lepas Claim" && youtubeLink.trim()) {
        formData.append("youtube_link", youtubeLink.trim());
      }
      formData.append("attachment", file);

      await api.tickets.create(null, formData);

      router.push("/user/tickets");
    } catch (error) {
      console.error("Failed to submit ticket:", error);
      alert("Gagal mengirim ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800">
            <Ticket className="text-[#aa91cc]" /> Buat Ticket Bantuan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Buat laporan bantuan berdasarkan release Anda. UPC dan ISRC akan terisi otomatis dari data release.
          </p>
        </div>

        <Link
          href="/user/tickets"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          History Ticket
        </Link>
      </header>

      {isLoading ? (
        <div className="mt-8 flex items-center gap-3 rounded-lg bg-white p-8 text-slate-500">
          <Loader2 className="animate-spin" /> Memuat data...
        </div>
      ) : (
        <div className="mt-6 max-w-3xl">
          <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Judul Ticket</span>
                <input
                  value={ticketTitle}
                  onChange={(event) => setTicketTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-[#aa91cc] focus:outline-none"
                  placeholder="Contoh: Permintaan lepas claim lagu"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Kategori</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-[#aa91cc] focus:outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              {category === "Lepas Claim" && (
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Isi Link Youtube Yang ingin di lepas</span>
                  <input
                    type="url"
                    value={youtubeLink}
                    onChange={(event) => setYoutubeLink(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-[#aa91cc] focus:outline-none focus:ring-2 focus:ring-[#aa91cc]/20 transition-all"
                    placeholder="Contoh: https://www.youtube.com/watch?v=..."
                    required
                  />
                </label>
              )}

              <div>
                <span className="text-xs font-bold uppercase text-slate-500">Judul Release</span>
                <div className="relative mt-1">
                  <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input
                    value={releaseQuery}
                    onFocus={() => setReleaseDropdownOpen(true)}
                    onBlur={() => window.setTimeout(() => setReleaseDropdownOpen(false), 120)}
                    onChange={(event) => {
                      setReleaseQuery(event.target.value);
                      setSelectedReleaseId("");
                      setReleaseDropdownOpen(true);
                    }}
                    className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 focus:border-[#aa91cc] focus:outline-none"
                    placeholder="Cari judul release, artis, atau UPC"
                    required={!selectedRelease}
                  />
                </div>
                {releaseDropdownOpen && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredReleases.map((release) => (
                      <div
                        key={release.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedReleaseId(String(release.id));
                          setReleaseQuery(release.title || "");
                          setReleaseDropdownOpen(false);
                        }}
                        className="block h-auto min-h-0 w-full rounded-none border-0 border-b border-solid border-slate-100 bg-white px-4 py-3 text-left text-sm font-normal text-slate-800 shadow-none cursor-pointer hover:bg-slate-50"
                        style={{ backgroundColor: "white", borderRadius: 0, color: "#1e293b" }}
                      >
                        <div className="font-bold text-slate-800">{release.title || "Rilis Tanpa Judul"}</div>
                        <div className="text-xs text-slate-400">UPC: {release.upc || "-"}</div>
                      </div>
                    ))}
                    {filteredReleases.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-400">Release tidak ditemukan.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">UPC</span>
                  <input value={selectedUpc} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" placeholder="Terisi otomatis" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">ISRC</span>
                  <input value={selectedIsrc} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" placeholder="Terisi otomatis" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Isi Ticket</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-[#aa91cc] focus:outline-none"
                  placeholder="Tuliskan detail laporan atau kebutuhan bantuan..."
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Upload File</span>
                <div className="mt-1 rounded-lg border border-dashed border-slate-300 p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="text-[#aa91cc]" />
                    <div className="flex-1">
                      <input type="file" accept=".jpg,.jpeg,image/jpeg" onChange={handleFileChange} className="w-full text-sm text-slate-600" />
                      <p className="mt-1 text-xs text-slate-400">Wajib JPG/JPEG, maksimal 1MB.</p>
                    </div>
                  </div>
                  {file && <p className="mt-2 text-xs font-bold text-emerald-600">{file.name}</p>}
                  {fileError && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600">
                      <AlertCircle size={13} /> {fileError}
                    </p>
                  )}
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#aa91cc] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Kirim Ticket
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
