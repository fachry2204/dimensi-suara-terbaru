import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inspectSystemSchema } from "@/lib/system-schema";

export async function GET() {
  try {
    const inspection = await inspectSystemSchema();

    await db.query(
      `INSERT INTO system_logs (check_type, status, details) VALUES (?, ?, ?)`,
      ["DB_INTEGRITY_CHECK", inspection.status, JSON.stringify(inspection)]
    ).catch(() => null);

    return NextResponse.json({
      status: inspection.status,
      missing: inspection.missingTables,
      missingTables: inspection.missingTables,
      missingColumns: inspection.missingColumns,
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
