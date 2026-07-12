import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { matchReportBatch } from "@/lib/reports/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { batchId } = await params;
    const [batchRows]: any = await db.query("SELECT status FROM report_batches WHERE id = ?", [batchId]);
    if (!batchRows?.length) return NextResponse.json({ success: false, message: "Report tidak ditemukan" }, { status: 404 });
    if (batchRows[0].status === "FINALIZED") return NextResponse.json({ success: false, message: "Report final tidak dapat diperiksa ulang" }, { status: 400 });
    await matchReportBatch(Number(batchId), true);
    const [rows]: any = await db.query(
      `SELECT
        SUM(status = 'MATCHED') AS matched,
        SUM(status IN ('NO_ACCOUNT','CONFLICT')) AS unresolved
       FROM report_rows WHERE report_batch_id = ?`,
      [batchId]
    );
    return NextResponse.json({
      success: true,
      message: `Pemeriksaan ulang selesai. ${Number(rows?.[0]?.matched || 0)} baris sudah cocok ke akun. ${Number(rows?.[0]?.unresolved || 0)} baris masih belum cocok dan perlu dicek atau di-assign manual.`,
    });
  } catch (error: any) {
    return errorResponse(error, "Gagal recheck report");
  }
}
