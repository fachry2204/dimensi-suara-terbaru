"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileSignature,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  Save,
  Settings,
  Shield,
  Upload,
  Zap,
} from "lucide-react";

const settingGroups = [
  ["Branding", ["Logo", "Nama System"], Settings],
  ["Role & Akses", ["Setting Role"], Shield],
  ["Email", ["SMTP Email"], Mail],
  ["Omnichannel", ["Omnichannel Setting"], KeyRound],
  ["Website", ["Log Data Website", "Update Website", "Backup Website"], Database],
  ["Integrasi", ["Setting Google Drive", "Setting Payment Gateway"], HardDrive],
];

export default function AdminSettingsPage() {
  const [soundOnUserId, setSoundOnUserId] = useState("");
  const [soundOnPassword, setSoundOnPassword] = useState("");
  const [soundOnSaved, setSoundOnSaved] = useState(false);
  const [soundOnPasswordSaved, setSoundOnPasswordSaved] = useState(false);
  const [isLoadingSoundOn, setIsLoadingSoundOn] = useState(true);
  const [isSavingSoundOn, setIsSavingSoundOn] = useState(false);
  const [isTestingSoundOn, setIsTestingSoundOn] = useState(false);
  const [soundOnMessage, setSoundOnMessage] = useState("");
  const [contractTemplates, setContractTemplates] = useState<Record<"PERSONAL" | "COMPANY", any>>({ PERSONAL: null, COMPANY: null });
  const [contractTemplateFiles, setContractTemplateFiles] = useState<Record<"PERSONAL" | "COMPANY", File | null>>({ PERSONAL: null, COMPANY: null });
  const [isLoadingContractTemplate, setIsLoadingContractTemplate] = useState(true);
  const [uploadingContractType, setUploadingContractType] = useState<"PERSONAL" | "COMPANY" | null>(null);
  const [contractTemplateMessage, setContractTemplateMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/soundon", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setSoundOnUserId(data.userId || "");
        setSoundOnSaved(Boolean(data.userIdOn));
        setSoundOnPasswordSaved(Boolean(data.passwordOn));
      })
      .catch(() => {})
      .finally(() => setIsLoadingSoundOn(false));

    fetch("/api/admin/contract-template", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setContractTemplates({
        PERSONAL: data?.data?.PERSONAL || null,
        COMPANY: data?.data?.COMPANY || null,
      }))
      .catch(() => {})
      .finally(() => setIsLoadingContractTemplate(false));
  }, []);

  async function saveSoundOnSetting(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingSoundOn(true);
    setSoundOnMessage("");

    try {
      const response = await fetch("/api/settings/soundon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: soundOnUserId,
          password: soundOnPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan setting SoundOn");
      }

      setSoundOnSaved(true);
      setSoundOnPasswordSaved(true);
      setSoundOnPassword("");
      setSoundOnMessage("Setting SoundOn berhasil disimpan.");
    } catch (error: any) {
      setSoundOnMessage(error.message || "Gagal menyimpan setting SoundOn.");
    } finally {
      setIsSavingSoundOn(false);
    }
  }

  async function testSoundOnLogin() {
    setIsTestingSoundOn(true);
    setSoundOnMessage("");

    try {
      const response = await fetch("/api/settings/soundon/test", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Tes login SoundOn gagal");
      }

      setSoundOnSaved(true);
      setSoundOnPasswordSaved(true);
      setSoundOnMessage(data.message || "Tes login SoundOn berhasil.");
    } catch (error: any) {
      setSoundOnMessage(error.message || "Tes login SoundOn gagal.");
    } finally {
      setIsTestingSoundOn(false);
    }
  }

  async function uploadContractTemplate(event: React.FormEvent, accountType: "PERSONAL" | "COMPANY") {
    event.preventDefault();
    const selectedFile = contractTemplateFiles[accountType];
    if (!selectedFile) {
      setContractTemplateMessage(`Pilih file template kontrak ${accountType} terlebih dahulu.`);
      return;
    }

    setUploadingContractType(accountType);
    setContractTemplateMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("accountType", accountType);

      const response = await fetch("/api/admin/contract-template", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal upload template kontrak");
      }

      setContractTemplates((prev) => ({
        ...prev,
        [accountType]: {
          file_name: data.data?.fileName,
          version: data.data?.version,
          file_size: data.data?.fileSize,
          account_type: accountType,
        },
      }));
      setContractTemplateFiles((prev) => ({ ...prev, [accountType]: null }));
      setContractTemplateMessage(`Template kontrak ${accountType} berhasil diupload dan diaktifkan.`);
    } catch (error: any) {
      setContractTemplateMessage(error.message || "Gagal upload template kontrak.");
    } finally {
      setUploadingContractType(null);
    }
  }

  return (
    <main className="py-6 text-slate-800">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-800">
        <ArrowLeft size={14} /> Menuju Dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-black">Setting System</h1>

      <section className="mt-6 rounded-lg bg-white p-5 text-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Zap size={18} className="text-orange-500" /> SoundOn Login
          </h2>
          {soundOnSaved && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
              <CheckCircle2 size={12} /> User ID ON
            </span>
          )}
        </div>

        <form onSubmit={saveSoundOnSetting} className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-500">User ID SoundOn</span>
            <input
              value={soundOnUserId}
              onChange={(event) => setSoundOnUserId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="User ID / Email SoundOn"
              disabled={isLoadingSoundOn}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-slate-500">Password SoundOn</span>
            <input
              type="password"
              value={soundOnPassword}
              onChange={(event) => setSoundOnPassword(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder={soundOnPasswordSaved ? "Kosongkan jika tidak ingin mengubah password" : "Password SoundOn"}
              disabled={isLoadingSoundOn}
            />
          </label>

          <button
            type="submit"
            disabled={isSavingSoundOn || isTestingSoundOn || isLoadingSoundOn}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {isSavingSoundOn ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan
          </button>

          <button
            type="button"
            onClick={testSoundOnLogin}
            disabled={isSavingSoundOn || isTestingSoundOn || isLoadingSoundOn || !soundOnSaved}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
          >
            {isTestingSoundOn ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
            Tes Login
          </button>
        </form>

        {soundOnMessage && (
          <p className={`mt-3 text-xs font-bold ${soundOnMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
            {soundOnMessage}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg bg-white p-5 text-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <FileSignature size={18} className="text-fuchsia-500" /> Format Kontrak
          </h2>
          {(contractTemplates.PERSONAL || contractTemplates.COMPANY) && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
              <CheckCircle2 size={12} /> Template Aktif
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(["PERSONAL", "COMPANY"] as const).map((accountType) => {
            const template = contractTemplates[accountType];
            const isUploading = uploadingContractType === accountType;
            return (
              <form key={accountType} onSubmit={(event) => uploadContractTemplate(event, accountType)} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-900">Template {accountType === "PERSONAL" ? "Personal" : "Company"}</p>
                    <p className="text-xs font-semibold text-slate-500">Dipakai otomatis untuk user tipe {accountType}.</p>
                  </div>
                  {template && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                      Aktif
                    </span>
                  )}
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase text-slate-500">Upload File Word {accountType}</span>
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => setContractTemplateFiles((prev) => ({ ...prev, [accountType]: event.target.files?.[0] || null }))}
                    disabled={isLoadingContractTemplate || Boolean(uploadingContractType)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                {template && (
                  <div className="mt-3 rounded border border-slate-100 bg-white p-3 text-xs font-semibold text-slate-600">
                    <p>Nama file: <span className="text-slate-900">{template.file_name}</span></p>
                    <p>Versi: <span className="text-slate-900">Versi {template.version}</span></p>
                    <p>Ukuran: <span className="text-slate-900">{template.file_size ? `${Math.ceil(Number(template.file_size) / 1024)} KB` : "-"}</span></p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoadingContractTemplate || Boolean(uploadingContractType)}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-fuchsia-500 px-4 text-xs font-bold text-white hover:bg-fuchsia-600 disabled:opacity-60"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload Template {accountType === "PERSONAL" ? "Personal" : "Company"}
                </button>
              </form>
            );
          })}
        </div>

        {contractTemplateMessage && (
          <p className={`mt-3 text-xs font-bold ${contractTemplateMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
            {contractTemplateMessage}
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {settingGroups.map(([title, items, Icon]: any) => (
          <div key={title} className="rounded-lg bg-white p-5 text-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-black"><Icon size={18} className="text-fuchsia-500" /> {title}</h2>
            <div className="mt-4 space-y-3">
              {items.map((item: string) => (
                <label key={item} className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">{item}</span>
                  {item.includes("Upload") ? (
                    <div className="mt-1 flex items-center gap-2 rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                      <Upload size={16} /> Upload file Word
                    </div>
                  ) : (
                    <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder={item} />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
