import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const DEFAULT_NOTIFICATION_CONFIG = {
  notify_email_enabled: true,
  notify_wa_enabled: true,
  email_subject_template: "[Dimensi Suara] Update Status Rilis: {release_title} ({status})",
  email_body_template: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
  <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #7c3aed;">
    <h2 style="color: #7c3aed; margin: 0;">Dimensi Suara CMS</h2>
    <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Pemberitahuan Pembaruan Status Rilis Musik</p>
  </div>
  
  <p style="margin-top: 20px;">Halo <strong>{user_name}</strong>,</p>
  <p>Status pengajuan rilis musik Anda telah diperbarui oleh Tim Dimensi Suara.</p>
  
  <div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Judul Rilis:</strong> {release_title}</p>
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Tipe Rilis:</strong> {release_type}</p>
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Status Terbaru:</strong> <span style="background-color: #7c3aed; color: #ffffff; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 12px;">{status}</span></p>
    {upc_info}
    {aggregator_info}
    {rejection_info}
    <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Waktu Pembaruan: {date}</p>
  </div>

  <p>Silakan masuk ke akun Anda di CMS Dimensi Suara untuk melihat detail lengkap rilis Anda.</p>
  
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">Email ini dikirim otomatis oleh sistem Dimensi Suara CMS.</p>
</div>`,
  wa_body_template: `*PEMBERITAHUAN STATUS RILIS - DIMENSI SUARA* 🎵

Halo *{user_name}*,

Status rilis musik Anda telah diperbarui dengan detail sebagai berikut:

📌 *Judul Rilis:* {release_title}
💿 *Tipe Rilis:* {release_type}
📊 *Status Terbaru:* *{status}*
{upc_info}
{aggregator_info}
{rejection_info}
📅 *Waktu:* {date}

Silakan cek akun Anda di CMS Dimensi Suara untuk informasi lebih lengkap.

Terima kasih,
*Tim Dimensi Suara*`,
};

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_value FROM settings WHERE setting_key = 'notification_config'"
    );

    let config = { ...DEFAULT_NOTIFICATION_CONFIG };

    if (rows.length > 0 && rows[0].setting_value) {
      try {
        config = { ...config, ...JSON.parse(rows[0].setting_value) };
      } catch (e) {}
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: "Config data missing" }, { status: 400 });
    }

    const configStr = JSON.stringify(config);
    await db.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
      ["notification_config", configStr, configStr]
    );

    return NextResponse.json({ message: "Notification settings updated successfully" });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
