import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

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

const makeTemporaryPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${password}!7`;
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

    const temporaryPassword = makeTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      users[0].id,
    ]);

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
        "Permintaan reset password untuk akun Dimensi Suara CMS Anda telah diproses.",
        `Password sementara Anda: ${temporaryPassword}`,
        "",
        "Silakan login menggunakan password sementara tersebut, lalu ubah password dari menu profil/setting akun.",
        "Jika Anda tidak meminta reset password, segera hubungi administrator.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <h2>Reset Password Dimensi Suara CMS</h2>
          <p>Halo <strong>${displayName}</strong>,</p>
          <p>Permintaan reset password untuk akun Anda telah diproses.</p>
          <p style="padding:14px 16px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px">
            Password sementara Anda:<br />
            <strong style="font-size:20px;color:#7c3aed">${temporaryPassword}</strong>
          </p>
          <p>Silakan login menggunakan password sementara tersebut, lalu ubah password dari menu profil/setting akun.</p>
          <p style="color:#64748b;font-size:13px">Jika Anda tidak meminta reset password, segera hubungi administrator.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "Password sementara sudah dikirim ke email terdaftar.",
    });
  } catch (error) {
    console.error("API Error - POST /api/auth/forgot-password:", error);
    return NextResponse.json(
      { error: "Gagal memproses reset password. Periksa konfigurasi SMTP." },
      { status: 500 }
    );
  }
}
