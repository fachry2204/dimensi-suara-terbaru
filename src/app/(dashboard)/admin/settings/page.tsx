"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileSignature,
  HardDrive,
  Info,
  Loader2,
  PlugZap,
  Save,
  Settings,
  Shield,
  Upload,
  Zap,
} from "lucide-react";
import { assetUrl } from "@/utils/url";

const settingGroups = [
  ["Role & Akses", ["Setting Role"], Shield],
  ["Website", ["Log Data Website", "Update Website", "Backup Website"], Database],
  ["Integrasi", ["Setting Google Drive", "Setting Payment Gateway"], HardDrive],
];

function tabKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("branding");

  // Branding State
  const [systemName, setSystemName] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState("");

  // SoundOn State
  const [soundOnUserId, setSoundOnUserId] = useState("");
  const [soundOnPassword, setSoundOnPassword] = useState("");
  const [soundOnWsEndpoint, setSoundOnWsEndpoint] = useState("");
  const [soundOnCookiesInput, setSoundOnCookiesInput] = useState("");
  const [soundOnSaved, setSoundOnSaved] = useState(false);
  const [soundOnPasswordSaved, setSoundOnPasswordSaved] = useState(false);
  const [isLoadingSoundOn, setIsLoadingSoundOn] = useState(true);
  const [isSavingSoundOn, setIsSavingSoundOn] = useState(false);
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [isTestingSoundOn, setIsTestingSoundOn] = useState(false);
  const [soundOnMessage, setSoundOnMessage] = useState("");

  // Format Kontrak State
  const [contractTemplates, setContractTemplates] = useState<Record<"PERSONAL" | "COMPANY", any>>({ PERSONAL: null, COMPANY: null });
  const [contractTemplateFiles, setContractTemplateFiles] = useState<Record<"PERSONAL" | "COMPANY", File | null>>({ PERSONAL: null, COMPANY: null });
  const [isLoadingContractTemplate, setIsLoadingContractTemplate] = useState(true);
  const [uploadingContractType, setUploadingContractType] = useState<"PERSONAL" | "COMPANY" | null>(null);
  const [contractTemplateMessage, setContractTemplateMessage] = useState("");

  const settingTabs = [
    { key: "branding", label: "Branding", Icon: Settings },
    { key: "soundon", label: "SoundOn", Icon: Zap },
    { key: "kontrak", label: "Format Kontrak", Icon: FileSignature },
    ...settingGroups.map(([title, , Icon]: any) => ({
      key: tabKey(String(title)),
      label: String(title),
      Icon,
    })),
  ];

  const activeSettingGroup = settingGroups.find(
    ([title]: any) => tabKey(String(title)) === activeTab
  );

  useEffect(() => {
    fetch("/api/settings/soundon", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setSoundOnUserId(data.userId || "");
        setSoundOnWsEndpoint(data.wsEndpoint || "");
        setSoundOnSaved(Boolean(data.userIdOn));
        setSoundOnPasswordSaved(Boolean(data.passwordOn));
      })
      .catch(() => {})
      .finally(() => setIsLoadingSoundOn(false));

    fetch("/api/settings/branding", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setSystemName(data.system_name || data.login_title || "Dimensi Suara");
        setLogoPath(data.logo || "");
      })
      .catch(() => {})
      .finally(() => setIsLoadingBranding(false));

    fetch("/api/admin/contract-template", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) =>
        setContractTemplates({
          PERSONAL: data?.data?.PERSONAL || null,
          COMPANY: data?.data?.COMPANY || null,
        })
      )
      .catch(() => {})
      .finally(() => setIsLoadingContractTemplate(false));
  }, []);

  async function saveBrandingSetting(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingBranding(true);
    setBrandingMessage("");

    try {
      const formData = new FormData();
      formData.append("system_name", systemName);
      formData.append("login_title", systemName);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await fetch("/api/settings/branding", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan branding.");
      }

      const branding = data.branding || {};
      setSystemName(branding.system_name || branding.login_title || systemName);
      setLogoPath(branding.logo || logoPath);
      setLogoFile(null);
      setBrandingMessage("Branding berhasil disimpan.");
    } catch (error: any) {
      setBrandingMessage(error.message || "Gagal menyimpan branding.");
    } finally {
      setIsSavingBranding(false);
    }
  }

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
          wsEndpoint: soundOnWsEndpoint,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan setting SoundOn");
      }

      setSoundOnSaved(true);
      setSoundOnPasswordSaved(true);
      setSoundOnPassword("");
      setSoundOnMessage("Setting SoundOn & Remote Browser berhasil disimpan.");
    } catch (error: any) {
      setSoundOnMessage(error.message || "Gagal menyimpan setting SoundOn.");
    } finally {
      setIsSavingSoundOn(false);
    }
  }

  async function saveCookieSession(event: React.FormEvent) {
    event.preventDefault();
    if (!soundOnCookiesInput.trim()) return;
    setIsSavingCookies(true);
    setSoundOnMessage("");

    try {
      const response = await fetch("/api/settings/soundon/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cookies: soundOnCookiesInput,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengimpor Cookie Session");
      }

      setSoundOnMessage(data.message || "Cookie Session SoundOn berhasil disimpan!");
      setSoundOnCookiesInput("");
    } catch (error: any) {
      setSoundOnMessage(error.message || "Gagal menyimpan Cookie Session.");
    } finally {
      setIsSavingCookies(false);
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
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-800"
      >
        <ArrowLeft size={14} /> Menuju Dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-black">Setting System</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {settingTabs.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition ${
                  isActive
                    ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BRANDING */}
      <section className={`mt-6 rounded-lg bg-white p-5 text-slate-900 ${activeTab !== "branding" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Settings size={18} className="text-fuchsia-500" /> Branding
          </h2>
          {logoPath && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
              <CheckCircle2 size={12} /> Logo Tersimpan
            </span>
          )}
        </div>

        <form onSubmit={saveBrandingSetting} className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr_auto] lg:items-end">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <span className="text-xs font-bold uppercase text-slate-500">Preview Logo</span>
            <div className="mt-3 flex h-24 items-center justify-center rounded border border-dashed border-slate-200 bg-white p-3">
              {logoPath ? (
                <img src={assetUrl(logoPath)} alt="Logo system" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs font-semibold text-slate-400">Belum ada logo</span>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Logo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                disabled={isLoadingBranding || isSavingBranding}
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                {logoFile ? logoFile.name : "Upload PNG, JPG, WEBP, atau SVG."}
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Nama System</span>
              <input
                value={systemName}
                onChange={(event) => setSystemName(event.target.value)}
                disabled={isLoadingBranding || isSavingBranding}
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nama System"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoadingBranding || isSavingBranding || !systemName.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-8 text-sm font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:opacity-60"
          >
            {isSavingBranding ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan
          </button>
        </form>

        {brandingMessage && (
          <p className={`mt-3 text-xs font-bold ${brandingMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
            {brandingMessage}
          </p>
        )}
      </section>

      {/* SOUNDON */}
      <section className={`mt-6 rounded-lg bg-white p-5 text-slate-900 ${activeTab !== "soundon" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Zap size={18} className="text-orange-500" /> SoundOn Login & Connection
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Konfigurasi kredensial login, Remote Browser WebSocket Endpoint, atau Cookie Session untuk Plesk/Shared Hosting.
            </p>
          </div>
          {soundOnSaved && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
              <CheckCircle2 size={12} /> User ID ON
            </span>
          )}
        </div>

        {/* Informational Tip for Plesk Users */}
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-xs text-orange-950">
          <div className="flex items-start gap-2.5">
            <Info size={18} className="mt-0.5 shrink-0 text-orange-600" />
            <div>
              <p className="font-bold text-orange-900">Solusi Server Plesk / Shared Hosting (Tanpa Chromium Lokal):</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                <li>
                  <strong>Metode 1 (Import Cookie Session):</strong> Login ke <code className="font-mono">soundon.global</code> di browser PC Anda, lalu salin Cookie (atau export Storage State JSON) dan tempel pada form <strong>Import Cookie Session</strong> di bawah.
                </li>
                <li>
                  <strong>Metode 2 (Remote Browser WS Endpoint):</strong> Gunakan service Remote Browser / Browserless container dan masukkan URL WebSocket Endpoint (misal: <code className="font-mono">wss://chrome.browserless.io?token=...</code>).
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FORM 1: USER ID & PASSWORD & WS ENDPOINT */}
        <form onSubmit={saveSoundOnSetting} className="mt-6 space-y-4 rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">1. Kredensial Login & Remote Browser Endpoint</h3>
          <div className="grid gap-4 md:grid-cols-3">
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

            <label className="block">
              <span className="text-xs font-bold uppercase text-slate-500">Remote Browser WS Endpoint (Opsional)</span>
              <input
                type="text"
                value={soundOnWsEndpoint}
                onChange={(event) => setSoundOnWsEndpoint(event.target.value)}
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono text-xs"
                placeholder="wss://... atau http://..."
                disabled={isLoadingSoundOn}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={isSavingSoundOn || isTestingSoundOn || isLoadingSoundOn}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {isSavingSoundOn ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Simpan Kredensial
            </button>

            <button
              type="button"
              onClick={testSoundOnLogin}
              disabled={isSavingSoundOn || isTestingSoundOn || isLoadingSoundOn || !soundOnSaved}
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
            >
              {isTestingSoundOn ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
              Tes Login & Connection
            </button>
          </div>
        </form>

        {/* FORM 2: IMPORT COOKIES (FOR PLESK) */}
        <form onSubmit={saveCookieSession} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">2. Import Cookie Session Manual (Rekomendasi Plesk)</h3>
          <p className="text-xs text-slate-500">
            Tempelkan String Cookie (misal <code className="font-mono">session_id=...; sid=...</code>) atau JSON Storage State dari browser PC Anda.
          </p>

          <textarea
            rows={3}
            value={soundOnCookiesInput}
            onChange={(e) => setSoundOnCookiesInput(e.target.value)}
            placeholder="Tempelkan Cookie String atau JSON Storage State di sini..."
            className="w-full rounded border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:border-orange-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isSavingCookies || !soundOnCookiesInput.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSavingCookies ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan Cookie Session
          </button>
        </form>

        {soundOnMessage && (
          <p className={`mt-3 text-xs font-bold ${soundOnMessage.includes("berhasil") || soundOnMessage.includes("BERHASIL") ? "text-emerald-600" : "text-red-600"}`}>
            {soundOnMessage}
          </p>
        )}
      </section>

      {/* KONTRAK */}
      <section className={`mt-6 rounded-lg bg-white p-5 text-slate-900 ${activeTab !== "kontrak" ? "hidden" : ""}`}>
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

      {/* DYNAMIC FALLBACK FOR OTHER GROUPS */}
      <section className={`mt-6 ${activeSettingGroup ? "" : "hidden"}`}>
        {activeSettingGroup && (() => {
          const [title, items, Icon]: any = activeSettingGroup;
          return (
            <div className="rounded-lg bg-white p-5 text-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Icon size={18} className="text-fuchsia-500" /> {title}
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
          );
        })()}
      </section>
    </main>
  );
}
