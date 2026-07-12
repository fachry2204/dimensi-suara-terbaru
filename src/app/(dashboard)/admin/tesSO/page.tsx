"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Zap, Search, Filter, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown, LogIn
} from "lucide-react";

interface ReleaseRow {
  id: number | string;
  upc?: string;
  title: string;
  artist?: string;
  primaryArtists?: Array<string | { name?: string }>;
  tracks?: Array<{ isrc?: string }>;
  status?: string;
  aggregator?: string;
  release_date?: string;
  label?: string;
  type?: string;
}

type CheckStatus = "idle" | "checking" | "found" | "not_found" | "error";

interface CheckResult {
  id: number | string;
  status: CheckStatus;
  message?: string;
  releaseStatus?: string;
  matchedTitle?: string;
  soundOnUpc?: string;
  soundOnIsrc?: string;
}

const TABS = [
  { id: "ALL", label: "Semua" },
  { id: "PENDING", label: "Belum Dicek" },
  { id: "FOUND", label: "Ditemukan" },
  { id: "NOT_FOUND", label: "Tidak Ditemukan" },
];

const ITEMS_PER_PAGE = 15;

export default function TesSoundOnPage() {
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [checkResults, setCheckResults] = useState<Record<string | number, CheckResult>>({});
  const [isBulkChecking, setIsBulkChecking] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [soundOnUserIdOn, setSoundOnUserIdOn] = useState(false);
  const [soundOnLoggedIn, setSoundOnLoggedIn] = useState(false);
  const [isLoggingInSoundOn, setIsLoggingInSoundOn] = useState(false);
  const [soundOnLoginMessage, setSoundOnLoginMessage] = useState("");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch("/api/releases", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
      fetch("/api/settings/soundon", { credentials: "include", cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([releaseData, soundOnData]) => {
        setReleases(Array.isArray(releaseData) ? releaseData : Array.isArray(releaseData?.data) ? releaseData.data : []);
        setSoundOnUserIdOn(Boolean(soundOnData?.userIdOn));
      })
      .catch(() => {
        setReleases([]);
        setSoundOnUserIdOn(false);
        setSoundOnLoggedIn(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  function getResultStatus(id: string | number): CheckStatus {
    return checkResults[id]?.status ?? "idle";
  }

  async function checkSingle(release: ReleaseRow) {
    if (!soundOnLoggedIn) return;
    const id = release.id;
    setCheckResults((prev) => ({ ...prev, [id]: { id, status: "checking" as CheckStatus } }));
    try {
      const response = await fetch("/api/admin/soundon/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: release.title,
          upc: release.upc,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal scraping SoundOn");
      }

      const status: CheckStatus = data.status === "found" ? "found" : "not_found";
      setCheckResults((prev) => ({
        ...prev,
        [id]: {
          id,
          status,
          message: data.message,
          releaseStatus: data.releaseStatus,
          matchedTitle: data.matchedTitle,
          soundOnUpc: data.upc,
          soundOnIsrc: data.isrc,
        },
      }));
    } catch (error: any) {
      setCheckResults((prev) => ({
        ...prev,
        [id]: {
          id,
          status: "error" as CheckStatus,
          message: error.message || "Gagal scraping SoundOn",
        },
      }));
    }
  }

  async function bulkCheck() {
    if (!soundOnLoggedIn) return;
    setIsBulkChecking(true);
    setBulkProgress(0);
    const unchecked = filtered.filter((r) => getResultStatus(r.id) === "idle");
    for (let i = 0; i < unchecked.length; i++) {
      await checkSingle(unchecked[i]);
      setBulkProgress(Math.round(((i + 1) / unchecked.length) * 100));
    }
    setIsBulkChecking(false);
  }

  async function loginSoundOn() {
    setIsLoggingInSoundOn(true);
    setSoundOnLoginMessage("");

    try {
      const response = await fetch("/api/settings/soundon/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Login SoundOn gagal");
      }

      setSoundOnLoggedIn(true);
      setSoundOnLoginMessage(data.message || "Login SoundOn berhasil.");
    } catch (error: any) {
      setSoundOnLoggedIn(false);
      setSoundOnLoginMessage(error.message || "Login SoundOn gagal.");
    } finally {
      setIsLoggingInSoundOn(false);
    }
  }

  const filtered = useMemo(() => {
    let result = releases;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.upc?.toLowerCase().includes(q) ||
          r.artist?.toLowerCase().includes(q) ||
          getArtistName(r).toLowerCase().includes(q)
      );
    }
    if (activeTab === "PENDING") result = result.filter((r) => getResultStatus(r.id) === "idle");
    if (activeTab === "FOUND") result = result.filter((r) => getResultStatus(r.id) === "found");
    if (activeTab === "NOT_FOUND") result = result.filter((r) => getResultStatus(r.id) === "not_found");
    return result;
  }, [releases, searchQuery, activeTab, checkResults]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const counts = {
    ALL: releases.length,
    PENDING: releases.filter((r) => getResultStatus(r.id) === "idle").length,
    FOUND: releases.filter((r) => getResultStatus(r.id) === "found").length,
    NOT_FOUND: releases.filter((r) => getResultStatus(r.id) === "not_found").length,
  };

  function getArtistName(release: ReleaseRow) {
    if (release.artist) return release.artist;
    const artists = Array.isArray(release.primaryArtists) ? release.primaryArtists : [];
    const names = artists
      .map((artist) => (typeof artist === "string" ? artist : artist?.name || ""))
      .filter(Boolean);
    return names.join(", ") || "-";
  }

  function getCurrentIsrc(release: ReleaseRow) {
    const tracks = Array.isArray(release.tracks) ? release.tracks : [];
    const isrcList = tracks.map((track) => track.isrc).filter(Boolean);
    return isrcList.length > 0 ? isrcList.join(", ") : "-";
  }

  function CodeStack({ current, soundOn }: { current?: string; soundOn?: string }) {
    return (
      <div className="space-y-1 font-mono text-[11px]">
        <div>
          <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[9px] font-black uppercase text-slate-500">Saat ini</span>
          <span className="font-semibold text-slate-600">{current || "-"}</span>
        </div>
        <div>
          <span className="mr-1 rounded bg-orange-50 px-1.5 py-0.5 font-sans text-[9px] font-black uppercase text-orange-600">SoundOn</span>
          <span className="font-semibold text-slate-600">{soundOn || "-"}</span>
        </div>
      </div>
    );
  }

  function StatusBadge({ status }: { status: CheckStatus }) {
    if (status === "idle") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
        <Clock size={10} /> Belum dicek
      </span>
    );
    if (status === "checking") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
        <RefreshCw size={10} className="animate-spin" /> Memeriksa...
      </span>
    );
    if (status === "found") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={10} /> Ditemukan
      </span>
    );
    if (status === "not_found") return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
        <AlertCircle size={10} /> Tidak ditemukan
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
        <XCircle size={10} /> Error
      </span>
    );
  }

  function SoundOnReleaseStatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
    const tone =
      normalized.includes("delivered") || normalized.includes("approved") || normalized.includes("live")
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : normalized.includes("rejected") || normalized.includes("failed")
          ? "bg-red-50 text-red-600 border-red-100"
          : normalized.includes("pending") || normalized.includes("processing") || normalized.includes("review") || normalized.includes("submitted")
            ? "bg-blue-50 text-blue-600 border-blue-100"
            : normalized.includes("take")
              ? "bg-amber-50 text-amber-700 border-amber-100"
              : "bg-slate-100 text-slate-600 border-slate-200";

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
        <CheckCircle2 size={10} />
        {status}
      </span>
    );
  }

  function CurrentReleaseStatusBadge({ status }: { status?: string }) {
    const rawValue = status || "Pending";
    const value =
      rawValue === "Live" || rawValue === "Released"
        ? "Rilis"
        : rawValue === "Processing"
          ? "Diproses"
          : rawValue === "Pending"
            ? "Menunggu"
            : rawValue === "Request Edit"
              ? "Minta Revisi"
              : rawValue === "Rejected"
                ? "Ditolak"
                : rawValue;
    const normalized = rawValue.toLowerCase();
    const tone =
      normalized.includes("approved") || normalized.includes("live") || normalized.includes("delivered")
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : normalized.includes("reject") || normalized.includes("fail")
          ? "bg-red-50 text-red-600 border-red-100"
          : normalized.includes("pending") || normalized.includes("process") || normalized.includes("review") || normalized.includes("submitted")
            ? "bg-blue-50 text-blue-600 border-blue-100"
            : normalized.includes("draft")
              ? "bg-slate-100 text-slate-600 border-slate-200"
              : "bg-amber-50 text-amber-700 border-amber-100";

    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
        {value}
      </span>
    );
  }

  return (
    <div className="space-y-6 py-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Admin &bull; SoundOn</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap size={22} className="text-orange-500" /> Tes Cek SoundOn
            {soundOnUserIdOn && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                USER ID ON
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Verifikasi keberadaan rilis client di platform distribusi SoundOn.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 w-fit"
        >
          ← Menuju Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Rilis", value: counts.ALL, color: "text-slate-800", bg: "bg-white" },
          { label: "Belum Dicek", value: counts.PENDING, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Ditemukan", value: counts.FOUND, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Tidak Ditemukan", value: counts.NOT_FOUND, color: "text-amber-700", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-100 shadow-sm p-5`}>
            <p className="text-xs font-semibold text-slate-400">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bulk Check + Progress */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-orange-900">Cek Massal SoundOn</p>
            <p className="text-xs text-orange-600 font-medium">
              Menggunakan cookie session SoundOn tersimpan, login ulang hanya jika session expired
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isBulkChecking && (
            <div className="flex items-center gap-2 text-xs font-bold text-orange-700">
              <RefreshCw size={12} className="animate-spin" />
              {bulkProgress}%
            </div>
          )}
          {soundOnLoginMessage && (
            <span className={`max-w-xs text-[10px] font-bold ${soundOnLoggedIn ? "text-emerald-700" : "text-red-600"}`}>
              {soundOnLoginMessage}
            </span>
          )}
          <button
            onClick={loginSoundOn}
            disabled={isLoggingInSoundOn || isBulkChecking || !soundOnUserIdOn}
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-5 py-2 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={!soundOnUserIdOn ? "Simpan User ID dan Password SoundOn di Setting terlebih dahulu" : undefined}
          >
            {isLoggingInSoundOn ? <RefreshCw size={13} className="animate-spin" /> : <LogIn size={13} />}
            {soundOnLoggedIn ? "Login Berhasil" : "Login SoundOn"}
          </button>
          <button
            onClick={bulkCheck}
            disabled={isBulkChecking || counts.PENDING === 0 || !soundOnLoggedIn}
            className="rounded-full bg-orange-500 px-5 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            title={!soundOnLoggedIn ? "Login SoundOn dahulu sebelum cek rilis" : undefined}
          >
            {isBulkChecking ? "Memeriksa..." : `Cek ${counts.PENDING} Rilis`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, UPC, atau artis..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab.id ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {counts[tab.id as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm font-semibold">Memuat data rilis...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <Zap size={32} className="opacity-30" />
            <p className="text-sm font-semibold">Tidak ada data ditemukan</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">Judul / Artis</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">UPC</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">ISRC</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">Tipe</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">Status Saat Ini</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider">Status SoundOn</th>
                <th className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((release) => {
                const st = getResultStatus(release.id);
                return (
                  <tr key={release.id} className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 leading-tight">{release.title || "-"}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{getArtistName(release)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <CodeStack current={release.upc || "-"} soundOn={checkResults[release.id]?.soundOnUpc || "-"} />
                    </td>
                    <td className="px-4 py-3">
                      <CodeStack current={getCurrentIsrc(release)} soundOn={checkResults[release.id]?.soundOnIsrc || "-"} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {release.type || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CurrentReleaseStatusBadge status={release.status} />
                    </td>
                    <td className="px-4 py-3">
                      {checkResults[release.id]?.releaseStatus ? (
                        <SoundOnReleaseStatusBadge status={checkResults[release.id].releaseStatus || ""} />
                      ) : (
                        <StatusBadge status={st} />
                      )}
                      {checkResults[release.id]?.message && st !== "checking" && (
                        <p className={`mt-0.5 max-w-md text-[10px] ${st === "error" ? "font-semibold text-red-500" : "text-slate-400"}`}>
                          {checkResults[release.id].message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => checkSingle(release)}
                        disabled={st === "checking" || !soundOnLoggedIn}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                        title={!soundOnLoggedIn ? "Login SoundOn dahulu sebelum cek rilis" : undefined}
                      >
                        {st === "checking" ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <Zap size={11} />
                        )}
                        {st === "checking" ? "Cek..." : "Cek"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400 font-medium">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length} rilis
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                    currentPage === page
                      ? "bg-orange-500 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
