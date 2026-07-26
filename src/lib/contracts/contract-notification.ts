import nodemailer from "nodemailer";
import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

type DeliveryResult = {
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizePhone(phone: string) {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) normalized = `62${normalized.slice(1)}`;
  if (normalized.startsWith("8")) normalized = `62${normalized}`;
  return normalized;
}

async function getGatewaySettings() {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('smtp_config', 'wa_config', 'mpwa_config')"
  );

  const settings: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    try {
      settings[String(row.setting_key)] = JSON.parse(String(row.setting_value || "{}"));
    } catch {
      settings[String(row.setting_key)] = {};
    }
  }

  return {
    smtp: settings.smtp_config || {},
    wa: settings.wa_config || settings.mpwa_config || {},
  };
}

async function sendEmail(input: {
  config: Record<string, unknown>;
  email: string;
  name: string;
  signingUrl: string;
  expiresAtLabel: string;
}) : Promise<DeliveryResult> {
  const config = input.config;
  if (!input.email) return { status: "SKIPPED", error: "Email user belum tersedia" };
  if (!config.host || !config.user || !config.pass) {
    return { status: "SKIPPED", error: "Konfigurasi SMTP belum lengkap" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: String(config.host).trim(),
      port: Number(config.port || 587),
      secure: Boolean(config.secure),
      auth: {
        user: String(config.user).trim(),
        pass: String(config.pass).trim(),
      },
    });

    const safeName = escapeHtml(input.name);
    const safeUrl = escapeHtml(input.signingUrl);
    await transporter.sendMail({
      from: `"${String(config.from_name || "Dimensi Suara").replace(/"/g, "")}" <${String(config.from_email || config.user).trim()}>`,
      to: input.email,
      subject: "Kontrak Dimensi Suara Menunggu Tanda Tangan Anda",
      html: `
        <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#172033">
          <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <div style="padding:24px 28px;border-bottom:1px solid #e2e8f0">
              <div style="font-size:20px;font-weight:700;color:#25155b">Dimensi Suara</div>
            </div>
            <div style="padding:28px">
              <h1 style="font-size:24px;line-height:1.3;margin:0 0 14px">Kontrak menunggu tanda tangan Anda</h1>
              <p style="font-size:15px;line-height:1.7;margin:0 0 16px">Halo ${safeName}, kontrak Anda telah dibuat dan dikirim oleh Admin Dimensi Suara.</p>
              <p style="font-size:15px;line-height:1.7;margin:0 0 24px">Silakan tinjau dokumen dan bubuhkan tanda tangan digital melalui tombol berikut.</p>
              <a href="${safeUrl}" style="display:inline-block;background:#6d3df5;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Tandatangani Kontrak</a>
              <p style="font-size:13px;line-height:1.6;color:#64748b;margin:24px 0 0">Tautan berlaku hingga ${escapeHtml(input.expiresAtLabel)}. Jangan bagikan tautan ini kepada pihak lain.</p>
            </div>
          </div>
        </div>
      `,
    });
    return { status: "SENT" };
  } catch (error: any) {
    return { status: "FAILED", error: error?.message || "Email gagal dikirim" };
  }
}

async function sendWhatsApp(input: {
  config: Record<string, unknown>;
  phone: string;
  name: string;
  signingUrl: string;
  expiresAtLabel: string;
}) : Promise<DeliveryResult> {
  if (!input.phone) return { status: "SKIPPED", error: "Nomor WhatsApp user belum tersedia" };
  const phone = normalizePhone(input.phone);
  const provider = String(input.config.provider || "fonnte").toLowerCase();
  const message = [
    `Halo ${input.name},`,
    "",
    "Kontrak Dimensi Suara Anda telah dibuat dan menunggu tanda tangan digital.",
    `Tandatangani kontrak: ${input.signingUrl}`,
    "",
    `Tautan berlaku hingga ${input.expiresAtLabel}. Jangan bagikan tautan ini kepada pihak lain.`,
  ].join("\n");

  try {
    if (provider === "fonnte") {
      const token = String(input.config.fonnte_token || "").trim();
      if (!token) return { status: "SKIPPED", error: "Token Fonnte belum diatur" };
      const body = new URLSearchParams({ target: phone, message });
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: token },
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.status === false) {
        throw new Error(result?.reason || result?.message || "Fonnte menolak pengiriman");
      }
      return { status: "SENT" };
    }

    if (provider === "mpwa") {
      const baseUrl = String(input.config.mpwa_url || input.config.base_url || "").trim().replace(/\/$/, "");
      const token = String(input.config.mpwa_token || input.config.token || "").trim();
      if (!baseUrl || !token) return { status: "SKIPPED", error: "Konfigurasi MPWA belum lengkap" };
      const response = await fetch(baseUrl.includes("/api/") ? baseUrl : `${baseUrl}/api/send_message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          api_key: token,
          device_id: String(input.config.mpwa_device_id || input.config.device_id || ""),
          to: phone,
          number: phone,
          target: phone,
          message,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.status === false || result?.error) {
        throw new Error(result?.message || result?.error || "MPWA menolak pengiriman");
      }
      return { status: "SENT" };
    }

    return { status: "SKIPPED", error: `Provider WhatsApp ${provider} tidak didukung` };
  } catch (error: any) {
    return { status: "FAILED", error: error?.message || "WhatsApp gagal dikirim" };
  }
}

export async function sendContractSigningNotification(input: {
  email: string;
  phone: string;
  name: string;
  signingUrl: string;
  expiresAtLabel: string;
}) {
  const settings = await getGatewaySettings();
  const [email, whatsapp] = await Promise.all([
    sendEmail({ config: settings.smtp, ...input }),
    sendWhatsApp({ config: settings.wa, ...input }),
  ]);

  return { email, whatsapp };
}
