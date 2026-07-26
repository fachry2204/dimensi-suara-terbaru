import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { DEFAULT_NOTIFICATION_CONFIG } from "@/app/api/settings/notifications/route";

interface NotificationParams {
  releaseId: string | number;
  newStatus: string;
  aggregator?: string;
  upc?: string;
  rejectionReason?: string;
  rejectionDescription?: string;
}

export async function sendReleaseStatusNotification(params: NotificationParams) {
  try {
    const { releaseId, newStatus, aggregator, upc, rejectionReason, rejectionDescription } = params;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT r.id, r.title, r.type, r.release_type, r.upc, r.aggregator, r.rejection_reason, r.rejection_description,
              u.id AS user_id, u.email, u.phone, u.full_name, u.username
       FROM releases r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ? LIMIT 1`,
      [releaseId]
    );

    if (!rows.length) {
      console.log(`[Notification] Release #${releaseId} not found.`);
      return;
    }

    const rel = rows[0];
    const userEmail = String(rel.email || "").trim();
    const userPhone = String(rel.phone || "").trim();
    const userName = rel.full_name || rel.username || "User";
    const releaseTitle = rel.title || "Untitled";
    const releaseType = rel.release_type || rel.type || "Single";
    const statusText = newStatus || rel.status || "Pending";
    const upcVal = upc || rel.upc || "";
    const aggregatorVal = aggregator || rel.aggregator || "";
    const reasonVal = rejectionReason || rel.rejection_reason || "";
    const descVal = rejectionDescription || rel.rejection_description || "";
    const nowStr = new Date().toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // 1. Fetch configurations from DB settings
    const [settingRows] = await db.query<RowDataPacket[]>(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('smtp_config', 'wa_config', 'mpwa_config', 'notification_config')"
    );

    const settingsMap: Record<string, any> = {};
    settingRows.forEach((row) => {
      try {
        settingsMap[row.setting_key] = JSON.parse(row.setting_value);
      } catch (e) {}
    });

    const smtpConfig = settingsMap["smtp_config"] || {};
    const waConfig = settingsMap["wa_config"] || settingsMap["mpwa_config"] || {};
    const notifyConfig = { ...DEFAULT_NOTIFICATION_CONFIG, ...(settingsMap["notification_config"] || {}) };

    // 2. Prepare dynamic replacement strings
    const upcHtml = upcVal ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>UPC:</strong> ${upcVal}</p>` : "";
    const upcText = upcVal ? `🔢 *UPC:* ${upcVal}\n` : "";

    const aggregatorHtml = aggregatorVal ? `<p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Aggregator:</strong> ${aggregatorVal}</p>` : "";
    const aggregatorText = aggregatorVal ? `🏢 *Aggregator:* ${aggregatorVal}\n` : "";

    let rejectionHtml = "";
    let rejectionText = "";
    if (reasonVal || descVal) {
      rejectionHtml = `
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 12px 0;">
          <p style="margin: 0 0 4px 0; color: #dc2626; font-weight: bold; font-size: 13px;">Catatan / Alasan Revisi / Penolakan:</p>
          ${reasonVal ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b;"><strong>Kategori:</strong> ${reasonVal}</p>` : ""}
          ${descVal ? `<p style="margin: 0; font-size: 13px; color: #7f1d1d;">${descVal}</p>` : ""}
        </div>
      `;
      rejectionText = `⚠️ *Catatan / Catatan Revisi:*
${reasonVal ? `• Kategori: ${reasonVal}\n` : ""}${descVal ? `• Detail: ${descVal}\n` : ""}`;
    }

    const replacePlaceholders = (template: string, isHtml: boolean = false) => {
      return template
        .replace(/\{user_name\}/g, userName)
        .replace(/\{release_title\}/g, releaseTitle)
        .replace(/\{release_type\}/g, releaseType)
        .replace(/\{status\}/g, statusText)
        .replace(/\{upc\}/g, upcVal || "-")
        .replace(/\{aggregator\}/g, aggregatorVal || "-")
        .replace(/\{rejection_reason\}/g, reasonVal || "-")
        .replace(/\{rejection_description\}/g, descVal || "-")
        .replace(/\{date\}/g, nowStr)
        .replace(/\{upc_info\}/g, isHtml ? upcHtml : upcText)
        .replace(/\{aggregator_info\}/g, isHtml ? aggregatorHtml : aggregatorText)
        .replace(/\{rejection_info\}/g, isHtml ? rejectionHtml : rejectionText);
    };

    // 3. Save in-app notification in `notifications` table if table exists
    if (rel.user_id) {
      try {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, created_at) VALUES (?, ?, ?, NOW())`,
          [
            rel.user_id,
            `Update Status Rilis: ${releaseTitle}`,
            `Status rilis "${releaseTitle}" telah diperbarui menjadi ${statusText}.`,
          ]
        );
      } catch (e) {
        // Ignore if notifications table doesn't match schema
      }
    }

    // 4. Send Email Notification
    if (notifyConfig.notify_email_enabled && userEmail && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
      try {
        const subject = replacePlaceholders(notifyConfig.email_subject_template || DEFAULT_NOTIFICATION_CONFIG.email_subject_template, false);
        const htmlBody = replacePlaceholders(notifyConfig.email_body_template || DEFAULT_NOTIFICATION_CONFIG.email_body_template, true);

        const transporter = nodemailer.createTransport({
          host: String(smtpConfig.host).trim(),
          port: Number(smtpConfig.port || 587),
          secure: Boolean(smtpConfig.secure),
          auth: {
            user: String(smtpConfig.user).trim(),
            pass: String(smtpConfig.pass).trim(),
          },
        });

        const fromEmail = String(smtpConfig.from_email || smtpConfig.user).trim();
        const fromName = String(smtpConfig.from_name || "Dimensi Suara CMS").trim();

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: userEmail,
          subject,
          html: htmlBody,
        });
        console.log(`[Notification] Email notification sent to ${userEmail} for release #${releaseId}`);
      } catch (emailErr: any) {
        console.error(`[Notification] Failed to send email to ${userEmail}:`, emailErr.message);
      }
    }

    // 5. Send WhatsApp Notification
    if (notifyConfig.notify_wa_enabled && userPhone) {
      try {
        let cleanPhone = userPhone.replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith("0")) {
          cleanPhone = "62" + cleanPhone.slice(1);
        }

        const waMessage = replacePlaceholders(notifyConfig.wa_body_template || DEFAULT_NOTIFICATION_CONFIG.wa_body_template, false);
        const provider = String(waConfig.provider || "fonnte").toLowerCase();

        if (provider === "fonnte" && waConfig.fonnte_token) {
          const formData = new URLSearchParams();
          formData.append("target", cleanPhone);
          formData.append("message", waMessage);

          const resp = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              Authorization: String(waConfig.fonnte_token).trim(),
            },
            body: formData,
          });

          const resJson = await resp.json().catch(() => ({}));
          if (resp.ok && resJson.status !== false) {
            console.log(`[Notification] WA (Fonnte) sent to ${cleanPhone} for release #${releaseId}`);
          } else {
            console.error(`[Notification] WA (Fonnte) error:`, resJson);
          }
        } else if (provider === "mpwa" && waConfig.mpwa_url && waConfig.mpwa_token) {
          const baseUrl = String(waConfig.mpwa_url).trim().replace(/\/$/, "");
          const sendUrl = baseUrl.includes("/api/") ? baseUrl : `${baseUrl}/api/send_message`;
          const payload = {
            token: String(waConfig.mpwa_token).trim(),
            api_key: String(waConfig.mpwa_token).trim(),
            device_id: String(waConfig.mpwa_device_id || "").trim(),
            to: cleanPhone,
            number: cleanPhone,
            target: cleanPhone,
            message: waMessage,
          };

          const resp = await fetch(sendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const resJson = await resp.json().catch(() => ({}));
          if (resp.ok && resJson.status !== false && !resJson.error) {
            console.log(`[Notification] WA (MPWA) sent to ${cleanPhone} for release #${releaseId}`);
          } else {
            console.error(`[Notification] WA (MPWA) error:`, resJson);
          }
        }
      } catch (waErr: any) {
        console.error(`[Notification] Failed to send WA to ${userPhone}:`, waErr.message);
      }
    }
  } catch (error: any) {
    console.error(`[Notification] Error sending release status notification for release #${params.releaseId}:`, error);
  }
}
