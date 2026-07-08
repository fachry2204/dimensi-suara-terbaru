import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const requiredTables = [
      "users",
      "releases",
      "tracks",
      "settings",
      "login_settings",
      "songs",
      "writers",
      "song_writers",
      "genres",
      "subgenres",
      "notifications",
      "security_logs",
      "system_logs",
    ];

    const [rows]: any = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );

    const existing = new Set(rows.map((row: any) => row.TABLE_NAME || row.table_name));
    const missing = requiredTables.filter((table) => !existing.has(table));
    const status = missing.length === 0 ? "OK" : "WARNING";

    await db.query(
      `INSERT INTO system_logs (check_type, status, details) VALUES (?, ?, ?)`,
      ["DB_INTEGRITY_CHECK", status, JSON.stringify({ missing })]
    ).catch(() => null);

    return NextResponse.json({
      status,
      missing,
      checked_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/system/check-db:", error);
    return NextResponse.json(
      {
        status: "ERROR",
        missing: [],
        checked_at: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 }
    );
  }
}
