import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader } from "mysql2/promise";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_USER_PASSWORD = "User123!";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await params;
    const userId = Number(id);

    if (session.role !== "Admin" && session.role !== "Operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "ID user tidak valid" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);
    const [result] = await db.query<ResultSetHeader>(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [passwordHash, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Password user berhasil direset ke User123!",
    });
  } catch (error: any) {
    console.error("API Error - POST /api/admin/users/[id]/reset-password:", error);

    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Gagal reset password user" },
      { status: 500 }
    );
  }
}
