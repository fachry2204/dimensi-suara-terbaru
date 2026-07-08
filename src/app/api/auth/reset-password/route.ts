import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1, "Token tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = schema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Format data tidak valid";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, password } = validation.data;

    // Cari user dengan token yang valid dan belum expired
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW() LIMIT 1",
      [token]
    );

    if (!users.length) {
      return NextResponse.json(
        { error: "Link reset password tidak valid atau telah kedaluwarsa." },
        { status: 400 }
      );
    }

    const userId = users[0].id;
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password dan bersihkan token reset
    await db.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [passwordHash, userId]
    );

    return NextResponse.json({
      message: "Password berhasil diubah. Silakan kembali login dengan password baru Anda.",
    });
  } catch (error) {
    console.error("API Error - POST /api/auth/reset-password:", error);
    return NextResponse.json(
      { error: "Gagal memproses reset password. Silakan hubungi administrator." },
      { status: 500 }
    );
  }
}
