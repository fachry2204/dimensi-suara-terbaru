import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { updateBatchSummary } from "@/lib/reports/report-service";
import { isScientificIdentifier } from "@/lib/reports/report-utils";

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

    const [reportRows]: any = await db.query(
      `SELECT upc_original, upc_normalized, isrc_normalized
       FROM report_rows WHERE id = ? AND report_batch_id = ? LIMIT 1`,
      [rowId, batchId]
    );
    const reportRow = reportRows?.[0];
    if (!reportRow) return NextResponse.json({ success: false, message: "Baris report tidak ditemukan" }, { status: 404 });

    const hasIsrc = Boolean(reportRow.isrc_normalized);
    const hasExactUpc = Boolean(reportRow.upc_normalized);
    const upcIsScientific = isScientificIdentifier(reportRow.upc_original);
    let ownershipSql = "";
    let ownershipValues: unknown[] = [];

    if (hasIsrc && hasExactUpc && !upcIsScientific) {
      ownershipSql = `SELECT r.id AS release_id, t.id AS track_id
        FROM tracks t JOIN releases r ON r.id = t.release_id
        WHERE r.user_id = ?
          AND REPLACE(REPLACE(UPPER(t.isrc), '-', ''), ' ', '') = ?
          AND REPLACE(REPLACE(REPLACE(r.upc, '-', ''), ' ', ''), '.', '') = ?`;
      ownershipValues = [userId, reportRow.isrc_normalized, reportRow.upc_normalized];
    } else if (hasIsrc) {
      ownershipSql = `SELECT r.id AS release_id, t.id AS track_id
        FROM tracks t JOIN releases r ON r.id = t.release_id
        WHERE r.user_id = ? AND REPLACE(REPLACE(UPPER(t.isrc), '-', ''), ' ', '') = ?`;
      ownershipValues = [userId, reportRow.isrc_normalized];
    } else if (hasExactUpc) {
      ownershipSql = `SELECT r.id AS release_id, NULL AS track_id
        FROM releases r WHERE r.user_id = ?
          AND REPLACE(REPLACE(REPLACE(r.upc, '-', ''), ' ', ''), '.', '') = ?`;
      ownershipValues = [userId, reportRow.upc_normalized];
    }

    if (!ownershipSql) {
      return NextResponse.json(
        { success: false, message: "Assignment ditolak karena UPC dan ISRC tidak dapat diverifikasi." },
        { status: 409 }
      );
    }

    const [ownershipRows]: any = await db.query(ownershipSql, ownershipValues);
    if (!ownershipRows?.length) {
      return NextResponse.json(
        { success: false, message: "Assignment ditolak. UPC/ISRC tersebut bukan milik user yang dipilih." },
        { status: 409 }
      );
    }
    if (ownershipRows.length > 1) {
      return NextResponse.json(
        { success: false, message: "Assignment ditolak karena UPC/ISRC cocok ke lebih dari satu data katalog." },
        { status: 409 }
      );
    }
    const ownership = ownershipRows[0];

    await db.query(
      `UPDATE report_rows
       SET matched_user_id = ?, matched_release_id = ?, matched_track_id = ?,
           status = 'MATCHED', match_method = 'MANUAL_VERIFIED', assignment_method = 'MANUAL',
           manually_assigned_by = ?, manually_assigned_at = NOW(), manual_assignment_note = ?,
           error_message = NULL
       WHERE id = ? AND report_batch_id = ?`,
      [userId, ownership.release_id, ownership.track_id || null, session.userId, note || null, rowId, batchId]
    );
    await updateBatchSummary(Number(batchId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return errorResponse(error, "Gagal assign user");
  }
}
