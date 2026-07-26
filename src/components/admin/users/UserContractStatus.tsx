"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Download, FileSignature, Loader2, RefreshCw, Send, Wand2 } from "lucide-react";

type ContractStatus = "NOT_GENERATED" | "GENERATING" | "GENERATED" | "FAILED";

type ContractData = {
  id: number;
  version: number;
  fileName: string | null;
  fileSize: number | null;
  generatedAt: string | null;
  errorMessage?: string | null;
};

type SigningData = {
  id: number;
  status: "PENDING_SIGNATURE" | "SIGNING" | "SIGNED" | "EXPIRED" | "SUPERSEDED";
  sentAt: string | null;
  expiresAt: string | null;
  signedAt: string | null;
  signerName: string | null;
  emailStatus: "SENT" | "SKIPPED" | "FAILED" | null;
  emailError: string | null;
  whatsappStatus: "SENT" | "SKIPPED" | "FAILED" | null;
  whatsappError: string | null;
};

function statusBadge(status: ContractStatus) {
  const map: Record<ContractStatus, { label: string; className: string }> = {
    NOT_GENERATED: { label: "Belum Dibuat", className: "bg-slate-100 text-slate-700 border-slate-200" },
    GENERATING: { label: "Sedang Diproses", className: "bg-blue-50 text-blue-700 border-blue-100" },
    GENERATED: { label: "Kontrak Tersedia", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    FAILED: { label: "Gagal Dibuat", className: "bg-red-50 text-red-700 border-red-100" },
  };
  return map[status] || map.NOT_GENERATED;
}

function formatFileSize(value?: number | null) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatGeneratedAt(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date) + " WIB";
}

export function UserContractStatus({ userId, compact = false }: { userId: number | string; compact?: boolean }) {
  const [status, setStatus] = useState<ContractStatus>("NOT_GENERATED");
  const [contract, setContract] = useState<ContractData | null>(null);
  const [signing, setSigning] = useState<SigningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [signingUrl, setSigningUrl] = useState("");

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/contract`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal mengambil status kontrak");

      setStatus(data.data?.status || "NOT_GENERATED");
      setContract(data.data?.contract || null);
      setSigning(data.data?.signing || null);
      setMessage(data.data?.contract?.errorMessage || "");
    } catch (error: any) {
      setStatus("FAILED");
      setMessage(error.message || "Gagal mengambil status kontrak");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function generateContract(force = false) {
    if (force) {
      const ok = window.confirm(
        "Generate Ulang Kontrak?\n\nSistem akan membuat kontrak versi terbaru menggunakan data user saat ini dan template kontrak aktif.\n\nKontrak versi sebelumnya tetap disimpan sebagai riwayat."
      );
      if (!ok) return;
    }

    setIsGenerating(true);
    setMissingFields([]);
    setMessage("");
    setMessageIsError(false);
    setSigningUrl("");
    setStatus("GENERATING");

    try {
      const response = await fetch(`/api/admin/users/${userId}/contract/generate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMissingFields(Array.isArray(data.missingFields) ? data.missingFields : []);
        throw new Error(data.message || "Kontrak gagal dibuat. Silakan periksa data user dan template kontrak.");
      }

      await loadStatus();
      setMessage("Kontrak user berhasil dibuat.");
    } catch (error: any) {
      setStatus("FAILED");
      setMessageIsError(true);
      setMessage(error.message || "Kontrak gagal dibuat.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function sendContract() {
    const ok = window.confirm(
      "Kirim Kontrak?\n\nSistem akan membuat tautan penandatanganan yang berlaku 7 hari, lalu mengirimkannya melalui Email dan WhatsApp user."
    );
    if (!ok) return;

    setIsSending(true);
    setMessage("");
    setMessageIsError(false);
    setSigningUrl("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/contract/send`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Kontrak gagal dikirim");
      setSigningUrl(data.data?.signingUrl || "");
      await loadStatus();
      setMessage(data.message || "Kontrak berhasil dikirim.");
    } catch (error: any) {
      setMessageIsError(true);
      setMessage(error.message || "Kontrak gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  }

  async function copySigningUrl() {
    if (!signingUrl) return;
    await navigator.clipboard.writeText(signingUrl);
    setMessage("Link penandatanganan berhasil disalin.");
    setMessageIsError(false);
  }

  const badge = statusBadge(status);
  const signingBadge = signing?.status === "SIGNED"
    ? { label: "Sudah Ditandatangani", className: "bg-emerald-50 text-emerald-700 border-emerald-100" }
    : signing?.status === "PENDING_SIGNATURE" || signing?.status === "SIGNING"
      ? { label: "Menunggu Tanda Tangan", className: "bg-amber-50 text-amber-700 border-amber-100" }
      : signing?.status === "EXPIRED"
        ? { label: "Link Kedaluwarsa", className: "bg-red-50 text-red-700 border-red-100" }
        : null;

  return (
    <section className={`rounded-xl border border-slate-100 bg-white ${compact ? "p-4" : "p-5"} shadow-sm`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
            <FileSignature size={17} className="text-fuchsia-500" />
            Status Kontrak
          </h2>
          <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${badge.className}`}>
            {isLoading ? "Memuat..." : badge.label}
          </span>
          {signingBadge && (
            <span className={`ml-2 mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${signingBadge.className}`}>
              {signingBadge.label}
            </span>
          )}
        </div>

        {status === "GENERATED" && contract?.id && (
          <a
            href={`/api/contracts/${contract.id}/download`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
          >
            <Download size={14} /> {signing?.status === "SIGNED" ? "Download Kontrak Bertanda Tangan" : "Download Kontrak"}
          </a>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {status === "NOT_GENERATED" && (
          <p className="text-slate-500">
            Kontrak user ini belum dibuat. Klik tombol "Generate Kontrak" untuk membuat dokumen kontrak secara otomatis menggunakan template kontrak aktif.
          </p>
        )}

        {status === "GENERATED" && contract && (
          <div className="grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
            <div className="min-w-0">
              <p>Nama File:</p>
              <p className="break-all text-slate-900">{contract.fileName || "-"}</p>
            </div>
            <div className="min-w-0">
              <p>Versi:</p>
              <p className="text-slate-900">Versi {contract.version}</p>
            </div>
            <div className="min-w-0">
              <p>Dibuat:</p>
              <p className="text-slate-900">{formatGeneratedAt(contract.generatedAt)}</p>
            </div>
            <div className="min-w-0">
              <p>Ukuran:</p>
              <p className="text-slate-900">{formatFileSize(contract.fileSize)}</p>
            </div>
          </div>
        )}

        {signing && ["PENDING_SIGNATURE", "SIGNING", "SIGNED"].includes(signing.status) && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>Dikirim: <strong className="text-slate-900">{formatGeneratedAt(signing.sentAt)}</strong></p>
              <p>
                {signing.status === "SIGNED" ? "Ditandatangani" : "Berlaku hingga"}:{" "}
                <strong className="text-slate-900">
                  {formatGeneratedAt(signing.status === "SIGNED" ? signing.signedAt : signing.expiresAt)}
                </strong>
              </p>
              <p>Email: <strong className={signing.emailStatus === "SENT" ? "text-emerald-700" : "text-amber-700"}>{signing.emailStatus || "-"}</strong></p>
              <p>WhatsApp: <strong className={signing.whatsappStatus === "SENT" ? "text-emerald-700" : "text-amber-700"}>{signing.whatsappStatus || "-"}</strong></p>
            </div>
            {signing.status === "SIGNED" && signing.signerName && (
              <p className="mt-2 flex items-center gap-1.5 font-bold text-emerald-700"><CheckCircle2 size={14} /> Ditandatangani oleh {signing.signerName}</p>
            )}
          </div>
        )}

        {message && (
          <p className={`text-xs font-bold ${messageIsError ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </p>
        )}

        {missingFields.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
            <p className="font-black">Data yang harus dilengkapi:</p>
            <ul className="mt-1 list-disc pl-4">
              {missingFields.map((field) => <li key={field}>{field}</li>)}
            </ul>
            <Link href={`/admin/users/${userId}`} className="mt-2 inline-flex font-black underline">
              Lengkapi Data User
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "GENERATED" && signing?.status !== "SIGNED" && (
          <button
            type="button"
            onClick={sendContract}
            disabled={isSending || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {isSending
              ? "Mengirim Kontrak..."
              : signing?.status === "PENDING_SIGNATURE" || signing?.status === "SIGNING"
                ? "Kirim Ulang Kontrak"
                : "Kirim Kontrak"}
          </button>
        )}

        {signingUrl && (
          <button
            type="button"
            onClick={copySigningUrl}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
          >
            <Copy size={14} /> Salin Link Tanda Tangan
          </button>
        )}

        {status === "GENERATED" ? (
          <button
            type="button"
            onClick={() => generateContract(true)}
            disabled={isGenerating || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 text-xs font-black text-fuchsia-700 hover:bg-fuchsia-100 disabled:opacity-60"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isGenerating ? "Sedang Membuat Kontrak..." : "Generate Ulang"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => generateContract(false)}
            disabled={isGenerating || isLoading || status === "GENERATING"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-black text-white hover:bg-fuchsia-700 disabled:opacity-60"
          >
            {isGenerating || status === "GENERATING" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isGenerating || status === "GENERATING" ? "Sedang Membuat Kontrak..." : "Generate Kontrak"}
          </button>
        )}

        {(message.includes("Template kontrak") || message.includes("template kontrak")) && (
          <Link
            href="/admin/settings"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            Buka Pengaturan Kontrak
          </Link>
        )}
      </div>
    </section>
  );
}
