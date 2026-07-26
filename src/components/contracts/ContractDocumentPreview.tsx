"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PreviewState = "loading" | "ready" | "error";

export function ContractDocumentPreview({
  documentUrl,
  fallbackText,
}: {
  documentUrl: string;
  fallbackText?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PreviewState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let resizeObserver: ResizeObserver | null = null;

    async function renderDocument() {
      const viewport = viewportRef.current;
      const container = documentRef.current;
      if (!viewport || !container) return;

      setState("loading");
      container.replaceChildren();

      try {
        const [response, docxPreview] = await Promise.all([
          fetch(documentUrl, { cache: "no-store", signal: controller.signal }),
          import("docx-preview"),
        ]);
        if (!response.ok) throw new Error("Dokumen kontrak gagal dimuat");

        const blob = await response.blob();
        if (!active) return;

        await docxPreview.renderAsync(blob, container, undefined, {
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderAltChunks: false,
          renderComments: false,
          renderChanges: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
        });
        if (!active) return;

        const fitDocument = () => {
          const wrapper = container.querySelector<HTMLElement>(".docx-wrapper");
          const page = container.querySelector<HTMLElement>("section.docx");
          if (!wrapper || !page || !viewport.clientWidth) return;

          wrapper.style.removeProperty("zoom");
          const pageWidth = page.getBoundingClientRect().width;
          if (!pageWidth) return;

          const availableWidth = Math.max(280, viewport.clientWidth - 16);
          const scale = Math.min(1, availableWidth / pageWidth);
          wrapper.style.setProperty("zoom", String(scale));
          wrapper.dataset.previewScale = scale.toFixed(3);
        };

        fitDocument();
        resizeObserver = new ResizeObserver(fitDocument);
        resizeObserver.observe(viewport);
        setState("ready");
      } catch (error: any) {
        if (error?.name === "AbortError" || !active) return;
        console.error("Gagal merender preview DOCX:", error);
        setState("error");
      }
    }

    renderDocument();
    return () => {
      active = false;
      controller.abort();
      resizeObserver?.disconnect();
    };
  }, [documentUrl]);

  return (
    <div
      ref={viewportRef}
      className="contract-docx-viewport relative min-h-[360px] overflow-auto bg-slate-100 p-2 sm:p-5"
    >
      {state === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-violet-600" size={28} />
            <p className="mt-3 text-sm font-semibold text-slate-500">Memuat tampilan kontrak asli...</p>
          </div>
        </div>
      )}

      <div ref={documentRef} className="contract-docx-render" />

      {state === "error" && (
        <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <p className="flex items-center gap-2 font-bold text-amber-700">
            <AlertCircle size={17} />
            Preview template belum dapat ditampilkan.
          </p>
          <p className="mt-2">Silakan gunakan tombol Unduh DOCX untuk membuka dokumen dengan format lengkap.</p>
          {fallbackText && (
            <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-slate-200 pt-4 text-xs leading-6">
              {fallbackText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
