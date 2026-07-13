import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSystemSchema } from "@/lib/system-schema";

export async function POST() {
  try {
    const result = await ensureSystemSchema();

    await db.query(
      `INSERT INTO system_logs (check_type, status, details) VALUES (?, ?, ?)`,
      ["DB_INTEGRITY_CHECK", result.status, JSON.stringify(result)]
    ).catch(() => null);

    return NextResponse.json({
      message:
        result.status === "FIXED"
          ? "Database berhasil diperbaiki tanpa menghapus data lama"
          : "Database diperiksa, tetapi sebagian kolom perlu dicek manual",
      status: result.status,
      result,
    });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/system/fix-db:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
