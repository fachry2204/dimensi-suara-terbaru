import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

type SmtpConfig = {
  host?: string;
  port?: number | string;
  secure?: boolean;
  user?: string;
  pass?: string;
  from_email?: string;
  from_name?: string;
};

const getSmtpConfig = async (): Promise<SmtpConfig | null> => {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1",
    ["smtp_config"]
  );

  if (!rows.length || !rows[0].setting_value) return null;

  try {
    return JSON.parse(String(rows[0].setting_value));
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = schema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    const email = validation.data.email.trim().toLowerCase();
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT id, email, username, full_name FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (!users.length) {
      return NextResponse.json({
        message: "Jika email terdaftar, instruksi reset password akan dikirim.",
      });
    }

    const smtp = await getSmtpConfig();
    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      return NextResponse.json(
        { error: "SMTP email belum dikonfigurasi di menu Setting." },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
      [token, users[0].id]
    );

    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const resetLink = `${origin}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port || 587),
      secure: Boolean(smtp.secure),
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    const displayName = users[0].full_name || users[0].username || "User";
    const fromEmail = smtp.from_email || smtp.user;
    const fromName = smtp.from_name || "Dimensi Suara";

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: users[0].email,
      subject: "Reset Password Dimensi Suara CMS",
      text: [
        `Halo ${displayName},`,
        "",
        "Anda menerima email ini karena ada permintaan untuk mengatur ulang password akun Anda.",
        "Silakan klik link di bawah ini untuk mereset password Anda:",
        resetLink,
        "",
        "Link reset password ini akan kedaluwarsa dalam waktu 1 jam.",
        "Jika Anda tidak meminta reset password, silakan abaikan email ini.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#7c3aed;margin-bottom:20px;">Reset Password Dimensi Suara CMS</h2>
          <p>Halo <strong>${displayName}</strong>,</p>
          <p>Anda menerima email ini karena ada permintaan untuk mengatur ulang password akun Dimensi Suara CMS Anda.</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${resetLink}" style="background-color:#7c3aed;color:#ffffff;padding:12px 24px;text-decoration:none;font-weight:bold;border-radius:8px;display:inline-block;box-shadow:0 4px 6px -1px rgba(124, 58, 237, 0.1), 0 2px 4px -1px rgba(124, 58, 237, 0.06);">
              Reset Password Saya
            </a>
          </p>
          <p style="font-size:13px;color:#64748b;">
            Link ini akan kedaluwarsa dalam 1 jam. Jika tombol di atas tidak berfungsi, salin dan tempel URL berikut ke browser Anda:
            <br />
            <a href="${resetLink}" style="color:#7c3aed;word-break:break-all;">${resetLink}</a>
          </p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;" />
          <p style="color:#94a3b8;font-size:12px;margin:0;">Jika Anda tidak merasa meminta reset password, silakan abaikan email ini atau hubungi administrator.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "Link reset password telah dikirim ke email terdaftar.",
    });
  } catch (error) {
    console.error("API Error - POST /api/auth/forgot-password:", error);
    return NextResponse.json(
      { error: "Gagal memproses reset password. Periksa konfigurasi SMTP." },
      { status: 500 }
    );
  }
}

