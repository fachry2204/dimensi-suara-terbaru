"use client";

import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Music2,
  PenLine,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { ContractDocumentPreview } from "@/components/contracts/ContractDocumentPreview";

type ContractData = {
  status: "PENDING_SIGNATURE" | "SIGNED";
  contractId: number;
  contractNumber: string;
  ownerName: string;
  ownerEmail: string;
  contractType: string;
  version: number;
  generatedAt: string;
  expiresAt: string;
  signedAt: string | null;
  signerName: string | null;
  fileName: string;
  preview: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} WIB`;
}

function SignatureCanvas({
  onChange,
  disabled,
}: {
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || hasInkRef.current) return;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
  }, []);

  useEffect(() => {
    initializeCanvas();
    window.addEventListener("resize", initializeCanvas);
    return () => window.removeEventListener("resize", initializeCanvas);
  }, [initializeCanvas]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    drawingRef.current = true;
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    hasInkRef.current = true;
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = event.currentTarget;
    canvas.getContext("2d")?.closePath();
    if (hasInkRef.current) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    onChange(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-white shadow-[0_0_0_3px_rgba(124,58,237,0.08)]">
        <canvas
          ref={canvasRef}
          aria-label="Area menggambar tanda tangan"
          className="block h-48 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
        {!hasInkRef.current && (
          <div className="pointer-events-none absolute inset-x-6 bottom-5 border-t border-dashed border-slate-300 pt-2 text-center text-xs text-slate-400">
            Gambar tanda tangan di area ini
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <RotateCcw size={15} />
        Hapus
      </button>
    </div>
  );
}

export function ContractSigningPage({ token }: { token: string }) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const loadContract = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/contracts/sign/${token}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Kontrak tidak dapat dibuka");
      setContract(result.data);
      setSignerName(result.data.signerName || result.data.ownerName || "");
    } catch (err: any) {
      setError(err?.message || "Kontrak tidak dapat dibuka");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  async function submitSignature() {
    if (!signature || !consent || signerName.trim().length < 3) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signature, consent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Tanda tangan gagal disimpan");
      await loadContract();
    } catch (err: any) {
      setError(err?.message || "Tanda tangan gagal disimpan");
    } finally {
      setIsSubmitting(false);
    }
  }

  const downloadUrl = `/api/contracts/sign/${token}/download`;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-violet-600" size={34} />
          <p className="mt-4 text-sm font-semibold text-slate-500">Membuka kontrak...</p>
        </div>
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto text-red-500" size={44} />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Kontrak Tidak Dapat Dibuka</h1>
          <p className="mt-2 leading-7 text-slate-500">{error}</p>
          <p className="mt-5 text-sm text-slate-400">Silakan hubungi Admin Dimensi Suara untuk mendapatkan tautan baru.</p>
        </section>
      </main>
    );
  }

  if (contract.status === "SIGNED") {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Music2 size={21} /></span>
            <span className="text-xl font-black text-slate-900">Dimensi Suara</span>
          </div>
        </header>
        <div className="mx-auto flex max-w-2xl items-center px-5 py-16 sm:py-24">
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-12">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={42} strokeWidth={3} />
            </span>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Kontrak Berhasil Ditandatangani</h1>
            <p className="mx-auto mt-3 max-w-md leading-7 text-slate-500">
              Terima kasih, {contract.signerName || contract.ownerName}. Dokumen bertanda tangan telah tersimpan dengan aman.
            </p>
            <div className="mx-auto mt-7 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Nomor Kontrak</span><strong className="text-right text-slate-800">{contract.contractNumber}</strong></div>
              <div className="mt-3 flex justify-between gap-4"><span className="text-slate-500">Ditandatangani</span><strong className="text-right text-slate-800">{formatDate(contract.signedAt)}</strong></div>
            </div>
            <a href={downloadUrl} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white transition hover:bg-violet-700 sm:w-auto">
              <Download size={18} />
              Unduh Kontrak yang Ditandatangani
            </a>
          </section>
        </div>
      </main>
    );
  }

  const canSubmit = Boolean(signature && consent && signerName.trim().length >= 3 && !isSubmitting);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-5 py-5 lg:px-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Music2 size={21} /></span>
          <span className="text-xl font-black">Dimensi Suara</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-7 px-5 py-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:px-8 lg:py-10">
        <section id="contract-preview" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black"><FileText className="text-violet-600" size={20} /> Dokumen Kontrak</h2>
              <p className="mt-1 break-all text-sm text-slate-500">{contract.fileName}</p>
            </div>
            <a href={downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50">
              <Download size={16} /> Unduh DOCX
            </a>
          </div>
          <div className="max-h-[440px] min-h-[360px] overflow-auto lg:max-h-[calc(100vh-190px)] lg:min-h-[620px]">
            <ContractDocumentPreview documentUrl={downloadUrl} fallbackText={contract.preview} />
          </div>
        </section>

        <section className="self-start lg:sticky lg:top-7">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Tandatangani Kontrak</h1>
          <p className="mt-2 text-slate-500">Tinjau dokumen dan bubuhkan tanda tangan Anda.</p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <dl className="grid grid-cols-[125px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-slate-500">Nomor Kontrak</dt><dd className="break-all font-bold text-slate-800">{contract.contractNumber}</dd>
              <dt className="text-slate-500">Nama Pemilik</dt><dd className="font-bold text-slate-800">{contract.ownerName}</dd>
              <dt className="text-slate-500">Jenis Kontrak</dt><dd className="font-bold text-slate-800">{contract.contractType}</dd>
              <dt className="text-slate-500">Versi</dt><dd className="font-bold text-slate-800">{contract.version}</dd>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <a href="#contract-preview" className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"><FileText size={16} /> Lihat Kontrak</a>
              <a href={downloadUrl} className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"><Download size={16} /> Unduh</a>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-b border-slate-200 px-1 pb-5 text-sm text-slate-500">
            <p className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-slate-500" size={17} /> Tautan ini bersifat pribadi. Tanda tangan dan jejak audit disimpan bersama dokumen.</p>
            <p className="flex gap-3"><CalendarClock className="mt-0.5 shrink-0 text-slate-500" size={17} /> Tautan berlaku hingga {formatDate(contract.expiresAt)}.</p>
          </div>

          <div className="mt-5">
            <label htmlFor="signer-name" className="mb-2 block text-sm font-bold text-slate-800">Nama Penanda Tangan</label>
            <input
              id="signer-name"
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              autoComplete="name"
            />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-slate-800">Tanda Tangan</p>
            <SignatureCanvas onChange={setSignature} disabled={isSubmitting} />
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
            />
            <span>Saya telah membaca dan menyetujui isi kontrak ini.</span>
          </label>

          {error && (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submitSignature}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <PenLine size={18} />}
            {isSubmitting ? "Menyimpan Tanda Tangan..." : "Tandatangani Kontrak"}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <CheckCircle2 size={14} /> Tindakan ini bersifat mengikat dan tercatat dalam jejak audit.
          </p>
        </section>
      </div>
    </main>
  );
}
