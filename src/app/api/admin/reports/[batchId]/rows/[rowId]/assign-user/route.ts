import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { updateBatchSummary } from "@/lib/reports/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string; rowId: string }> }
) {
  try {
    const session = await requireAdminSession();
    await ensureReportTables();
    const { batchId, rowId } = await params;
    const body = await request.json();
    const userId = Number(body?.userId);
    const note = String(body?.note || "").trim();
    if (!Number.isFinite(userId)) return NextResponse.json({ success: false, message: "User tidak valid" }, { status: 400 });
    const [users]: any = await db.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users?.length) return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    await db.query(
      `UPDATE report_rows
       SET matched_user_id = ?, status = 'MATCHED', match_method = 'MANUAL', assignment_method = 'MANUAL',
           manually_assigned_by = ?, manually_assigned_at = NOW(), manual_assignment_note = ?,
           error_message = NULL
       WHERE id = ? AND report_batch_id = ?`,
      [userId, session.userId, note || null, rowId, batchId]
    );
    await updateBatchSummary(Number(batchId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return errorResponse(error, "Gagal assign user");
  }
}
