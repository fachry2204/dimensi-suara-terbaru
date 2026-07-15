"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Edit3, Eye, KeyRound, X } from "lucide-react";
import { UserContractStatus } from "@/components/admin/users/UserContractStatus";

interface UserDetails {
  id: number;
  username: string;
  email: string;
  role: string;
  account_type: string;
  company_name: string | null;
  full_name: string | null;
  nik: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  pic_name: string | null;
  pic_position: string | null;
  pic_phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  ktp_doc_path: string | null;
  npwp_doc_path: string | null;
  signature_doc_path: string | null;
  nib_doc_path: string | null;
  kemenkumham_doc_path: string | null;
  contract_doc_path: string | null;
  contract_status: string | null;
  aggregator_percentage: number | null;
  publishing_percentage: number | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  block_reason: string | null;
}

const STATUS_FLOW = ["Menunggu", "Diterima", "Ditolak", "Banned"];
const STATUS_MAP: Record<string, string> = {
  "Pending": "Menunggu",
  "Review": "Menunggu",
  "Menunggu": "Menunggu",
  "Approved": "Diterima",
  "Diterima": "Diterima",
  "Rejected": "Ditolak",
  "Ditolak": "Ditolak",
  "Blocked": "Banned",
  "Banned": "Banned",
};

function docLabel(key: string) {
  const map: Record<string, string> = {
    ktp_doc_path: "KTP",
    npwp_doc_path: "NPWP",
    signature_doc_path: "Tanda Tangan",
    nib_doc_path: "NIB",
    kemenkumham_doc_path: "Kemenkumham",
    contract_doc_path: "Kontrak",
  };
  return map[key] || key;
}

function toTitleCase(value: string | null | undefined) {
  if (!value) return "";

  return value
    .toLowerCase()
    .split(/(\s+|[./-])/)
    .map((part) => {
      if (!/[a-z0-9]/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function formatInfoValue(label: string, value: string | null | undefined) {
  if (!value) return "-";

  const titleCaseLabels = new Set([
    "Account Type",
    "Nama Perusahaan",
    "Nama Lengkap",
    "Nama PIC",
    "Jabatan PIC",
    "Address",
    "Country",
    "Province",
    "City",
    "District",
    "Subdistrict",
    "Nama Bank",
    "Atas Nama Rekening",
  ]);

  return titleCaseLabels.has(label) ? toTitleCase(value) : value;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  // Editable percentage fields
  const [aggPct, setAggPct] = useState("");

  useEffect(() => {
    fetch(`/api/users/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Gagal mengambil data user");
        }
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setAggPct(data.aggregator_percentage?.toString() ?? "70.00");
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function updateStatus(newStatus: string) {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      setUser((prev) => prev ? { ...prev, status: newStatus } : prev);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  async function savePercentages() {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          aggregator_percentage: parseFloat(aggPct) || 70,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  async function resetUserPassword() {
    if (!user || isResettingPassword) return;
    const confirmed = window.confirm("Reset password user ini ke password standar User123!?");
    if (!confirmed) return;

    setIsResettingPassword(true);
    setResetPasswordMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Gagal reset password user");
      }

      setResetPasswordMessage(data?.message || "Password user berhasil direset ke User123!");
      setTimeout(() => setResetPasswordMessage(null), 5000);
    } catch (err: any) {
      setResetPasswordMessage(err?.message || "Gagal reset password user");
    } finally {
      setIsResettingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <main className="py-6 text-slate-800">
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-6">
            <ArrowLeft size={16} /> Kembali ke Daftar User
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl font-semibold shadow-sm">
            {error || "User tidak ditemukan"}
          </div>
      </main>
    );
  }

  const currentStatusLabel = STATUS_MAP[user.status] || user.status;

  // All document fields
  const docFields = [
    "ktp_doc_path",
    "npwp_doc_path",
    "signature_doc_path",
    "nib_doc_path",
    "kemenkumham_doc_path",
    "contract_doc_path",
  ] as const;

  const existingDocs = docFields.filter((f) => user[f]);

  // Personal info rows
  const infoRows: { label: string; value: string | null | undefined }[] = [
    { label: "Account Type", value: user.account_type },
    ...(user.account_type === "COMPANY"
      ? [
          { label: "Nama Perusahaan", value: user.company_name },
          { label: "Nama PIC", value: user.pic_name },
          { label: "Jabatan PIC", value: user.pic_position },
          { label: "Phone PIC", value: user.pic_phone },
        ]
      : [{ label: "Nama Lengkap", value: user.full_name }]),
    { label: "NIK", value: user.nik },
    { label: "Phone", value: user.phone },
    { label: "Address", value: user.address },
    { label: "Country", value: user.country },
    { label: "Province", value: user.province },
    { label: "City", value: user.city },
    { label: "District", value: user.district },
    { label: "Subdistrict", value: user.subdistrict },
    { label: "Postal Code", value: user.postal_code },
    { label: "Nama Bank", value: user.bank_name },
    { label: "Nomor Rekening", value: user.bank_account_number },
    { label: "Atas Nama Rekening", value: user.bank_account_name },
  ];

  const renderDocumentCard = (field: (typeof docFields)[number]) => {
    const path = user[field]!;
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);

    return (
      <div key={field} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
        <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative group">
          {isImage ? (
            <img
              src={path.startsWith("http") ? path : `/${path.replace(/^\//, "")}`}
              alt={docLabel(field)}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
              <Download size={26} />
              <span className="text-xs font-semibold">{docLabel(field)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 bg-white">
          <button
            onClick={() => setPreviewDoc(path)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 transition"
          >
            <Eye size={13} /> Preview
          </button>
          <span className="text-slate-300">|</span>
          <a
            href={path.startsWith("http") ? path : `/${path.replace(/^\//, "")}`}
            download
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-700 transition"
          >
            <Download size={13} /> Download
          </a>
        </div>
      </div>
    );
  };

  const statusButtons = (
    <div>
      <h2 className="text-base font-extrabold text-slate-800 mb-4">Status User</h2>
      <div className="grid grid-cols-2 gap-2">
        {STATUS_FLOW.map((label) => {
          const isActive = currentStatusLabel === label;
          const dbMap: Record<string, string> = {
            "Menunggu": "Pending",
            "Diterima": "Approved",
            "Ditolak": "Rejected",
            "Banned": "Blocked",
          };

          return (
            <button
              key={label}
              onClick={() => updateStatus(dbMap[label] || label)}
              disabled={isSaving}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                isActive
                  ? "bg-emerald-400 text-white border-emerald-400 shadow-md"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {saveSuccess && (
        <p className="mt-3 text-xs font-semibold text-emerald-600">Berhasil disimpan</p>
      )}
    </div>
  );

  return (
    <main className="py-6 text-slate-800 space-y-6">

        {/* Top nav */}
        <div className="flex items-center justify-between">
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
            <ArrowLeft size={16} /> Kembali ke Daftar User
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetUserPassword}
              disabled={isResettingPassword}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 transition-all shadow-md shadow-amber-500/20"
            >
              <KeyRound size={14} /> {isResettingPassword ? "Mereset..." : "Reset Password"}
            </button>
            <Link href={`/admin/users/${user.id}/edit`} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20">
              <Edit3 size={14} /> Edit Data
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20">
              ← Menuju Dashboard
            </Link>
          </div>
        </div>

        {/* User header */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <p className="font-bold text-base text-slate-900">{toTitleCase(user.full_name || user.company_name || user.username)}</p>
          <p className="text-sm text-blue-600">{user.email}</p>
          <p className="text-xs text-slate-500 mt-0.5">Role: {user.role}</p>
          <p className="text-xs text-slate-500">Joined: {new Date(user.created_at).toISOString().split("T")[0]}</p>
          {resetPasswordMessage && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${
              resetPasswordMessage.toLowerCase().includes("gagal")
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {resetPasswordMessage}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
          {/* Info Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {infoRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-5 py-3 font-semibold text-slate-500 w-44">{row.label}</td>
                    <td className="px-5 py-3 text-blue-600 font-medium">{formatInfoValue(row.label, row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 p-5">
              {statusButtons}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-extrabold text-slate-800 mb-4">Documents</h2>
            {existingDocs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingDocs.map((field) => renderDocumentCard(field))}
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                Belum ada dokumen
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h2 className="text-base font-extrabold text-slate-800 mb-4">Persentase</h2>
              <p className="mb-3 text-xs font-semibold text-slate-500">
                Isi persentase bagian user. Bagian penyedia/perusahaan dihitung otomatis dari 100% dikurangi persentase user.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Aggregator (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={aggPct}
                    onChange={(e) => setAggPct(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Penyedia: {Math.max(0, 100 - (parseFloat(aggPct) || 0))}%</p>
                </div>
              </div>
              <button
                onClick={savePercentages}
                disabled={isSaving}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
              >
                {isSaving ? "Menyimpan..." : "Simpan Persentase"}
              </button>
              {saveSuccess && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">Berhasil disimpan</p>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <UserContractStatus userId={user.id} />
            </div>
          </div>
        </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow text-slate-600 hover:text-red-600 transition"
            >
              <X size={16} />
            </button>
            {/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(previewDoc) ? (
              <img
                src={previewDoc.startsWith("http") ? previewDoc : `/${previewDoc.replace(/^\//, "")}`}
                alt="Preview"
                className="w-full max-h-[80vh] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-12 text-slate-500">
                <Download size={40} />
                <p className="text-sm font-semibold">File tidak dapat di-preview. Klik download untuk mengunduh.</p>
                <a
                  href={previewDoc.startsWith("http") ? previewDoc : `/${previewDoc.replace(/^\//, "")}`}
                  download
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
