"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Code,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  PlugZap,
  RotateCcw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { DEFAULT_NOTIFICATION_CONFIG } from "@/app/api/settings/notifications/route";

export default function AdminGatewayPage() {
  const [activeTab, setActiveTab] = useState<"smtp" | "wa" | "notifications">("smtp");

  // --- SMTP STATE ---
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Dimensi Suara");
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(true);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState("");
  const [testEmailTo, setTestEmailTo] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState("");

  // --- WA GATEWAY STATE ---
  const [waProvider, setWaProvider] = useState<"fonnte" | "mpwa">("fonnte");
  const [fonnteToken, setFonnteToken] = useState("");
  const [fonnteSender, setFonnteSender] = useState("");
  const [mpwaUrl, setMpwaUrl] = useState("");
  const [mpwaToken, setMpwaToken] = useState("");
  const [mpwaDeviceId, setMpwaDeviceId] = useState("");
  const [isLoadingWa, setIsLoadingWa] = useState(true);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [waMessage, setWaMessage] = useState("");
  const [testWaPhone, setTestWaPhone] = useState("");
  const [testWaText, setTestWaText] = useState("");
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [testWaMessage, setTestWaMessage] = useState("");

  // --- NOTIFICATION TEMPLATES STATE ---
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState(true);
  const [notifyWaEnabled, setNotifyWaEnabled] = useState(true);
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("");
  const [emailBodyTemplate, setEmailBodyTemplate] = useState("");
  const [waBodyTemplate, setWaBodyTemplate] = useState("");
  const [isLoadingNotify, setIsLoadingNotify] = useState(true);
  const [isSavingNotify, setIsSavingNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");

  useEffect(() => {
    // 1. Fetch Gateway Settings (SMTP & WA)
    fetch("/api/settings/gateway", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.smtp) {
          setSmtpHost(data.smtp.host || "smtp.gmail.com");
          setSmtpPort(String(data.smtp.port || "587"));
          setSmtpSecure(Boolean(data.smtp.secure));
          setSmtpUser(data.smtp.user || "");
          setSmtpPass(data.smtp.pass || "");
          setSmtpFromEmail(data.smtp.from_email || "");
          setSmtpFromName(data.smtp.from_name || "Dimensi Suara");
        }
        const wa = data.wa || data.mpwa || {};
        setWaProvider(wa.provider === "mpwa" ? "mpwa" : "fonnte");
        setFonnteToken(wa.fonnte_token || "");
        setFonnteSender(wa.fonnte_sender || "");
        setMpwaUrl(wa.mpwa_url || wa.base_url || "");
        setMpwaToken(wa.mpwa_token || wa.token || "");
        setMpwaDeviceId(wa.mpwa_device_id || wa.device_id || "");
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingSmtp(false);
        setIsLoadingWa(false);
      });

    // 2. Fetch Notification Templates Settings
    fetch("/api/settings/notifications", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.config) return;
        const cfg = data.config;
        setNotifyEmailEnabled(cfg.notify_email_enabled ?? true);
        setNotifyWaEnabled(cfg.notify_wa_enabled ?? true);
        setEmailSubjectTemplate(cfg.email_subject_template || DEFAULT_NOTIFICATION_CONFIG.email_subject_template);
        setEmailBodyTemplate(cfg.email_body_template || DEFAULT_NOTIFICATION_CONFIG.email_body_template);
        setWaBodyTemplate(cfg.wa_body_template || DEFAULT_NOTIFICATION_CONFIG.wa_body_template);
      })
      .catch(() => {})
      .finally(() => setIsLoadingNotify(false));
  }, []);

  // --- HANDLERS ---
  function applyGmailPreset() {
    setSmtpHost("smtp.gmail.com");
    setSmtpPort("587");
    setSmtpSecure(false);
    setSmtpMessage("Preset Gmail berhasil diterapkan. Gunakan App Password (Sandi Aplikasi) Google 16 karakter.");
  }

  async function saveSmtpSetting(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpMessage("");

    try {
      const res = await fetch("/api/settings/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          smtp: {
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: smtpSecure,
            user: smtpUser,
            pass: smtpPass,
            from_email: smtpFromEmail || smtpUser,
            from_name: smtpFromName || "Dimensi Suara",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Gagal menyimpan SMTP Email.");
      setSmtpMessage("Konfigurasi SMTP Email berhasil disimpan.");
    } catch (err: any) {
      setSmtpMessage(err.message || "Gagal menyimpan SMTP Email.");
    } finally {
      setIsSavingSmtp(false);
    }
  }

  async function testEmailSending(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmailTo.trim()) {
      setTestEmailMessage("Masukkan email tujuan pengujian.");
      return;
    }

    setIsTestingEmail(true);
    setTestEmailMessage("");

    try {
      const res = await fetch("/api/settings/gateway/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: testEmailTo,
          smtp: {
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: smtpSecure,
            user: smtpUser,
            pass: smtpPass,
            from_email: smtpFromEmail || smtpUser,
            from_name: smtpFromName || "Dimensi Suara",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Gagal mengirim tes email.");
      setTestEmailMessage(data.message || "Tes email berhasil dikirim!");
    } catch (err: any) {
      setTestEmailMessage(err.message || "Pengiriman tes email gagal.");
    } finally {
      setIsTestingEmail(false);
    }
  }

  async function saveWaSetting(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingWa(true);
    setWaMessage("");

    try {
      const res = await fetch("/api/settings/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wa: {
            provider: waProvider,
            fonnte_token: fonnteToken,
            fonnte_sender: fonnteSender,
            mpwa_url: mpwaUrl,
            mpwa_token: mpwaToken,
            mpwa_device_id: mpwaDeviceId,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Gagal menyimpan WhatsApp Gateway.");
      setWaMessage("Konfigurasi WhatsApp Gateway berhasil disimpan.");
    } catch (err: any) {
      setWaMessage(err.message || "Gagal menyimpan WhatsApp Gateway.");
    } finally {
      setIsSavingWa(false);
    }
  }

  async function testWaSending(e: React.FormEvent) {
    e.preventDefault();
    if (!testWaPhone.trim()) {
      setTestWaMessage("Masukkan nomor WhatsApp tujuan untuk pengujian.");
      return;
    }

    setIsTestingWa(true);
    setTestWaMessage("");

    try {
      const res = await fetch("/api/settings/gateway/test-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: testWaPhone,
          message: testWaText,
          wa: {
            provider: waProvider,
            fonnte_token: fonnteToken,
            fonnte_sender: fonnteSender,
            mpwa_url: mpwaUrl,
            mpwa_token: mpwaToken,
            mpwa_device_id: mpwaDeviceId,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Gagal pengiriman tes WhatsApp.");
      setTestWaMessage(data.message || "Tes WhatsApp berhasil dikirim!");
    } catch (err: any) {
      setTestWaMessage(err.message || "Pengiriman tes WhatsApp gagal.");
    } finally {
      setIsTestingWa(false);
    }
  }

  async function saveNotificationTemplates(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingNotify(true);
    setNotifyMessage("");

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          config: {
            notify_email_enabled: notifyEmailEnabled,
            notify_wa_enabled: notifyWaEnabled,
            email_subject_template: emailSubjectTemplate,
            email_body_template: emailBodyTemplate,
            wa_body_template: waBodyTemplate,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Gagal menyimpan template notifikasi.");
      setNotifyMessage("Template notifikasi berhasil disimpan.");
    } catch (err: any) {
      setNotifyMessage(err.message || "Gagal menyimpan template notifikasi.");
    } finally {
      setIsSavingNotify(false);
    }
  }

  function resetDefaultNotificationTemplates() {
    setEmailSubjectTemplate(DEFAULT_NOTIFICATION_CONFIG.email_subject_template);
    setEmailBodyTemplate(DEFAULT_NOTIFICATION_CONFIG.email_body_template);
    setWaBodyTemplate(DEFAULT_NOTIFICATION_CONFIG.wa_body_template);
    setNotifyMessage("Template dikembalikan ke format standard informatif.");
  }

  return (
    <main className="py-6 text-slate-800">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-800"
      >
        <ArrowLeft size={14} /> Menuju Dashboard
      </Link>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Email & WA Gateway</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Pusat konfigurasi SMTP Email, WhatsApp Gateway, dan Notifikasi Otomatis untuk User.
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("smtp")}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition ${
            activeTab === "smtp"
              ? "bg-teal-600 text-white shadow-lg shadow-teal-200"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Mail size={16} /> SMTP Email (Gmail)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wa")}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition ${
            activeTab === "wa"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <MessageSquare size={16} /> WhatsApp Gateway
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black transition ${
            activeTab === "notifications"
              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Bell size={16} /> Pesan Notifikasi User
        </button>
      </div>

      {/* --- TAB 1: SMTP EMAIL --- */}
      <section className={`mt-6 rounded-2xl bg-white p-6 shadow-sm ${activeTab !== "smtp" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Mail size={22} className="text-teal-600" /> Konfigurasi SMTP Email
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Atur kredensial server SMTP pengiriman email sistem untuk Reset Password & Notifikasi User.
            </p>
          </div>
          <button
            type="button"
            onClick={applyGmailPreset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:from-red-600 hover:to-rose-700 transition"
          >
            <Sparkles size={14} /> Gunakan Preset Gmail
          </button>
        </div>

        {/* Gmail Tip Box */}
        <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-xs text-teal-900">
          <div className="flex items-start gap-2.5">
            <Info size={18} className="mt-0.5 shrink-0 text-teal-600" />
            <div>
              <p className="font-bold text-teal-900">Panduan Menggunakan Gmail SMTP:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                <li>Host: <code className="rounded bg-teal-100/80 px-1 py-0.5 text-teal-900 font-mono">smtp.gmail.com</code> | Port: <code className="rounded bg-teal-100/80 px-1 py-0.5 text-teal-900 font-mono">587</code> (TLS) atau <code className="rounded bg-teal-100/80 px-1 py-0.5 text-teal-900 font-mono">465</code> (SSL)</li>
                <li>Username: Alamat Email Gmail Anda (contoh: <code className="font-mono">admin@gmail.com</code>)</li>
                <li>Password: <strong>Gunakan App Password (Sandi Aplikasi) 16 Karakter Google</strong> (bukan password biasa). Buat di: <i>Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords</i>.</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={saveSmtpSetting} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">SMTP Port</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Protokol Keamanan</label>
              <select
                value={smtpSecure ? "ssl" : "tls"}
                onChange={(e) => setSmtpSecure(e.target.value === "ssl")}
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              >
                <option value="tls">TLS / STARTTLS (Port 587)</option>
                <option value="ssl">SSL / Direct (Port 465)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Email User / SMTP Account</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="nama@gmail.com"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Password / App Password</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="Sandi Aplikasi 16 Karakter"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Email Pengirim (From Email)</label>
              <input
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="noreply@dimensisuara.id atau isi email akun"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Nama Pengirim (From Name)</label>
              <input
                type="text"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="Dimensi Suara CMS"
                disabled={isLoadingSmtp || isSavingSmtp}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              disabled={isLoadingSmtp || isSavingSmtp || !smtpHost.trim() || !smtpUser.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-60"
            >
              {isSavingSmtp ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Konfigurasi SMTP
            </button>
          </div>

          {smtpMessage && (
            <p className={`text-xs font-bold ${smtpMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
              {smtpMessage}
            </p>
          )}
        </form>

        {/* Test Email Section */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Send size={16} className="text-teal-600" /> Tes Pengiriman Email
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Kirim email uji coba ke alamat email tujuan untuk memastikan koneksi ke server SMTP berjalan lancar.
          </p>

          <form onSubmit={testEmailSending} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="Masukkan email tujuan (contoh: user@gmail.com)"
              className="w-full flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isTestingEmail || !testEmailTo.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-60 shrink-0"
            >
              {isTestingEmail ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
              Kirim Tes Email
            </button>
          </form>

          {testEmailMessage && (
            <p className={`mt-3 text-xs font-bold ${testEmailMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
              {testEmailMessage}
            </p>
          )}
        </div>
      </section>

      {/* --- TAB 2: WHATSAPP GATEWAY --- */}
      <section className={`mt-6 rounded-2xl bg-white p-6 shadow-sm ${activeTab !== "wa" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <MessageSquare size={22} className="text-emerald-600" /> WhatsApp Gateway
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Pilih dan atur integrasi WhatsApp Gateway menggunakan provider Fonnte.com atau MPWA.
            </p>
          </div>
        </div>

        {/* Provider Switcher */}
        <div className="mt-5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-600">Pilih Provider WhatsApp</span>
          <div className="mt-2 grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setWaProvider("fonnte")}
              className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-extrabold transition ${
                waProvider === "fonnte"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${waProvider === "fonnte" ? "bg-emerald-500" : "bg-slate-300"}`} />
              Fonnte.com (Official API)
            </button>

            <button
              type="button"
              onClick={() => setWaProvider("mpwa")}
              className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-extrabold transition ${
                waProvider === "mpwa"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${waProvider === "mpwa" ? "bg-emerald-500" : "bg-slate-300"}`} />
              MPWA (Multi Device Server)
            </button>
          </div>
        </div>

        <form onSubmit={saveWaSetting} className="mt-6 space-y-5">
          {waProvider === "fonnte" ? (
            <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Info size={16} /> Fonnte.com API Configuration
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">API Token Fonnte</label>
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="Masukkan Token Fonnte.com"
                    disabled={isLoadingWa || isSavingWa}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Dapatkan token dari dashboard Fonnte (fonnte.com).
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Nomor / Label Pengirim (Opsional)</label>
                  <input
                    type="text"
                    value={fonnteSender}
                    onChange={(e) => setFonnteSender(e.target.value)}
                    placeholder="081234567890"
                    disabled={isLoadingWa || isSavingWa}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Info size={16} /> MPWA Server Configuration
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">URL Server MPWA</label>
                  <input
                    type="url"
                    value={mpwaUrl}
                    onChange={(e) => setMpwaUrl(e.target.value)}
                    placeholder="https://mpwa.domain.com"
                    disabled={isLoadingWa || isSavingWa}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">API Key / Token</label>
                  <input
                    type="password"
                    value={mpwaToken}
                    onChange={(e) => setMpwaToken(e.target.value)}
                    placeholder="API Key MPWA"
                    disabled={isLoadingWa || isSavingWa}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Device ID / Number</label>
                  <input
                    type="text"
                    value={mpwaDeviceId}
                    onChange={(e) => setMpwaDeviceId(e.target.value)}
                    placeholder="Device ID / Nomor terhubung"
                    disabled={isLoadingWa || isSavingWa}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isLoadingWa || isSavingWa}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingWa ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan WhatsApp Gateway
            </button>
          </div>

          {waMessage && (
            <p className={`text-xs font-bold ${waMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
              {waMessage}
            </p>
          )}
        </form>

        {/* Test WA Section */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Send size={16} className="text-emerald-600" /> Tes Pengiriman WhatsApp
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Kirim pesan uji coba melalui provider <strong>{waProvider === "fonnte" ? "Fonnte.com" : "MPWA"}</strong> ke nomor WhatsApp tujuan.
          </p>

          <form onSubmit={testWaSending} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <input
                type="text"
                value={testWaPhone}
                onChange={(e) => setTestWaPhone(e.target.value)}
                placeholder="Nomor HP Tujuan (contoh: 081234567890)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                value={testWaText}
                onChange={(e) => setTestWaText(e.target.value)}
                placeholder="Pesan Kustom Tes (Opsional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isTestingWa || !testWaPhone.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-60"
            >
              {isTestingWa ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
              Kirim Tes WhatsApp ({waProvider.toUpperCase()})
            </button>
          </form>

          {testWaMessage && (
            <p className={`mt-3 text-xs font-bold ${testWaMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
              {testWaMessage}
            </p>
          )}
        </div>
      </section>

      {/* --- TAB 3: NOTIFICATION TEMPLATES --- */}
      <section className={`mt-6 rounded-2xl bg-white p-6 shadow-sm ${activeTab !== "notifications" ? "hidden" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Bell size={22} className="text-fuchsia-600" /> Template Notifikasi Status Rilis
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Kelola sakelar & pesan notifikasi informatif yang otomatis dikirim ke Email & WhatsApp User saat status rilis berubah.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDefaultNotificationTemplates}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <RotateCcw size={14} /> Reset ke Standard Template
          </button>
        </div>

        {/* Variables Helper Card */}
        <div className="mt-4 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4 text-xs text-fuchsia-950">
          <p className="flex items-center gap-2 font-bold text-fuchsia-900">
            <Code size={16} /> Variabel Dinamis yang Didukung Dalam Template:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "{user_name}",
              "{release_title}",
              "{release_type}",
              "{status}",
              "{upc}",
              "{aggregator}",
              "{rejection_reason}",
              "{rejection_description}",
              "{date}",
            ].map((v) => (
              <span key={v} className="rounded-lg border border-fuchsia-200 bg-white px-2.5 py-1 font-mono font-bold text-fuchsia-800 shadow-sm">
                {v}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={saveNotificationTemplates} className="mt-6 space-y-6">
          {/* Toggles */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer">
              <div>
                <span className="block text-sm font-extrabold text-slate-900">Notifikasi Email Otomatis</span>
                <span className="text-xs text-slate-500 font-medium">Kirim email ke user saat status rilis berubah</span>
              </div>
              <input
                type="checkbox"
                checked={notifyEmailEnabled}
                onChange={(e) => setNotifyEmailEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer">
              <div>
                <span className="block text-sm font-extrabold text-slate-900">Notifikasi WhatsApp Otomatis</span>
                <span className="text-xs text-slate-500 font-medium">Kirim WA ke user saat status rilis berubah</span>
              </div>
              <input
                type="checkbox"
                checked={notifyWaEnabled}
                onChange={(e) => setNotifyWaEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
            </label>
          </div>

          {/* Email Template Fields */}
          <div className="space-y-4 rounded-xl border border-slate-200 p-5">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              <Mail size={16} className="text-teal-600" /> Template Email Status Rilis
            </h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Subject Email</label>
              <input
                type="text"
                value={emailSubjectTemplate}
                onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                placeholder="[Dimensi Suara] Update Status Rilis: {release_title}"
                disabled={isLoadingNotify || isSavingNotify}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-fuchsia-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Format Body Email (HTML)</label>
              <textarea
                rows={10}
                value={emailBodyTemplate}
                onChange={(e) => setEmailBodyTemplate(e.target.value)}
                disabled={isLoadingNotify || isSavingNotify}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 font-mono text-xs text-slate-800 focus:border-fuchsia-500 focus:bg-white focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* WA Template Field */}
          <div className="space-y-4 rounded-xl border border-slate-200 p-5">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              <MessageSquare size={16} className="text-emerald-600" /> Template WhatsApp Status Rilis
            </h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Format Pesan WhatsApp (Teks WhatsApp)</label>
              <textarea
                rows={10}
                value={waBodyTemplate}
                onChange={(e) => setWaBodyTemplate(e.target.value)}
                disabled={isLoadingNotify || isSavingNotify}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 font-mono text-xs text-slate-800 focus:border-fuchsia-500 focus:bg-white focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isLoadingNotify || isSavingNotify}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-8 text-xs font-bold text-white shadow-md shadow-fuchsia-600/20 hover:bg-fuchsia-700 disabled:opacity-60"
            >
              {isSavingNotify ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Template Notifikasi
            </button>
          </div>

          {notifyMessage && (
            <p className={`text-xs font-bold ${notifyMessage.includes("berhasil") ? "text-emerald-600" : "text-red-600"}`}>
              {notifyMessage}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
