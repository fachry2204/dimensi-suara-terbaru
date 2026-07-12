import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { updateBatchSummary } from "@/lib/reports/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string; rowId: string }> }
) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { batchId, rowId } = await params;
    await db.query(
      `UPDATE report_rows
       SET matched_user_id = NULL, match_method = NULL, assignment_method = NULL,
           manually_assigned_by = NULL, manually_assigned_at = NULL, manual_assignment_note = NULL,
           status = 'NO_ACCOUNT', error_message = 'Tidak ada akun yang memiliki UPC atau ISRC ini.'
       WHERE id = ? AND report_batch_id = ? AND assignment_method = 'MANUAL'`,
      [rowId, batchId]
    );
    await updateBatchSummary(Number(batchId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return errorResponse(error, "Gagal reset assignment");
  }
}
