import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const [summary]: any = await db.query(
      `SELECT COUNT(*) AS total_batches,
              SUM(status = 'FINALIZED') AS finalized_batches,
              COALESCE(SUM(total_rows),0) AS total_rows,
              COALESCE(SUM(matched_rows),0) AS matched_rows,
              COALESCE(SUM(no_account_rows + conflict_rows + invalid_rows),0) AS unresolved_rows,
              COALESCE(SUM(user_revenue_total),0) AS user_revenue,
              COALESCE(SUM(aggregator_revenue_total),0) AS aggregator_revenue
       FROM report_batches`
    );
    const [monthly]: any = await db.query(
      `SELECT DATE_FORMAT(report_period, '%Y-%m') AS period,
              COALESCE(SUM(user_revenue_total),0) AS user_revenue,
              COALESCE(SUM(aggregator_revenue_total),0) AS aggregator_revenue,
              COUNT(*) AS batches
       FROM report_batches
       WHERE status = 'FINALIZED'
       GROUP BY DATE_FORMAT(report_period, '%Y-%m')
       ORDER BY period ASC
       LIMIT 24`
    );
    const [platforms]: any = await db.query(
      `SELECT COALESCE(NULLIF(r.platform, ''), 'Lainnya') AS name,
              COALESCE(SUM(r.user_revenue + r.aggregator_revenue),0) AS revenue,
              COALESCE(SUM(r.quantity),0) AS quantity
       FROM report_rows r
       JOIN report_batches b ON b.id = r.report_batch_id
       WHERE b.status = 'FINALIZED' AND r.status = 'MATCHED'
       GROUP BY COALESCE(NULLIF(r.platform, ''), 'Lainnya')
       ORDER BY revenue DESC
       LIMIT 8`
    );
    return NextResponse.json({ success: true, summary: summary?.[0] || {}, monthly, platforms });
  } catch (error: any) {
    return errorResponse(error, "Gagal mengambil analitik report");
  }
}
