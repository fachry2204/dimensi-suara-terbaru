import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || "").trim();

    if (!to) {
      return NextResponse.json({ error: "Email tujuan (to) wajib diisi" }, { status: 400 });
    }

    let smtp = body.smtp;

    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
      const [rows] = await db.query<RowDataPacket[]>(
        "SELECT setting_value FROM settings WHERE setting_key = ?",
        ["smtp_config"]
      );

      if (!rows.length || !rows[0].setting_value) {
        return NextResponse.json(
          { error: "Konfigurasi SMTP Email belum disimpan." },
          { status: 400 }
        );
      }

      try {
        smtp = JSON.parse(String(rows[0].setting_value));
      } catch (e) {
        return NextResponse.json(
          { error: "Format konfigurasi SMTP tidak valid." },
          { status: 400 }
        );
      }
    }

    if (!smtp.host || !smtp.user || !smtp.pass) {
      return NextResponse.json(
        { error: "Host SMTP, User Email, dan Password wajib diisi." },
        { status: 400 }
      );
    }

    const host = String(smtp.host).trim();
    const port = Number(smtp.port || 587);
    const secure = Boolean(smtp.secure);
    const user = String(smtp.user).trim();
    const pass = String(smtp.pass).trim();
    const fromEmail = String(smtp.from_email || user).trim();
    const fromName = String(smtp.from_name || "Dimensi Suara CMS").trim();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: "Test Email SMTP - Dimensi Suara CMS",
      text: `Halo,\n\nIni adalah email tes dari sistem Dimensi Suara CMS untuk memverifikasi bahwa konfigurasi SMTP (${host}:${port}) telah berhasil dikoneksikan dengan sukses.\n\nWaktu pengujian: ${new Date().toLocaleString("id-ID")}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
          <h2 style="color: #0d9488; margin-top: 0;">Tes Konfigurasi SMTP Berhasil!</h2>
          <p>Halo,</p>
          <p>Email ini dikirim otomatis untuk menguji konfigurasi server SMTP di <strong>Dimensi Suara CMS</strong>.</p>
          <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; margin: 16px 0; border-left: 4px solid #0d9488;">
            <p style="margin: 4px 0;"><strong>Host:</strong> ${host}:${port}</p>
            <p style="margin: 4px 0;"><strong>User:</strong> ${user}</p>
            <p style="margin: 4px 0;"><strong>Pengirim:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
            <p style="margin: 4px 0;"><strong>Status Secure:</strong> ${secure ? "SSL (True)" : "TLS/Plain (False)"}</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Pengujian berhasil dilakukan pada ${new Date().toLocaleString("id-ID")}.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: `Test email berhasil dikirim ke ${to}`,
    });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/gateway/test-email:", error);
    return NextResponse.json(
      { error: `Gagal mengirim test email: ${error.message || "Gagal terkoneksi ke SMTP server"}` },
      { status: 500 }
    );
  }
}
