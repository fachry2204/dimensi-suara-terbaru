import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { batchId } = await params;
    const [rows]: any = await db.query(
      `SELECT b.*, a.username AS uploaded_by_name
       FROM report_batches b
       LEFT JOIN admins a ON a.id = b.uploaded_by
       WHERE b.id = ? LIMIT 1`,
      [batchId]
    );
    if (!rows?.length) return NextResponse.json({ success: false, message: "Report tidak ditemukan" }, { status: 404 });

    const [currencyRows]: any = await db.query(
      `SELECT client_payment_currency AS currency, SUM(net_revenue) AS total
       FROM report_rows
       WHERE report_batch_id = ? AND net_revenue IS NOT NULL
       GROUP BY client_payment_currency`,
      [batchId]
    );
    const [totals]: any = await db.query(
      `SELECT COALESCE(SUM(gross_idr_final),0) AS gross_idr_total,
              COALESCE(SUM(user_revenue),0) AS user_revenue_total,
              COALESCE(SUM(aggregator_revenue),0) AS aggregator_revenue_total
       FROM report_rows WHERE report_batch_id = ?`,
      [batchId]
    );
    return NextResponse.json({ success: true, data: { ...rows[0], currency_totals: currencyRows || [], calculated_totals: totals?.[0] || {} } });
  } catch (error: any) {
    return errorResponse(error, "Gagal mengambil detail report");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { batchId } = await params;
    const [rows]: any = await db.query("SELECT status, stored_file_path FROM report_batches WHERE id = ?", [batchId]);
    if (!rows?.length) return NextResponse.json({ success: false, message: "Report tidak ditemukan" }, { status: 404 });
    if (rows[0].status === "FINALIZED") return NextResponse.json({ success: false, message: "Report final tidak boleh dihapus" }, { status: 400 });
    await db.query("DELETE FROM report_rows WHERE report_batch_id = ?", [batchId]);
    await db.query("DELETE FROM report_batches WHERE id = ?", [batchId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return errorResponse(error, "Gagal menghapus report");
  }
}
