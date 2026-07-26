import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, paginationParams } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    await ensureReportTables();
    const { searchParams } = request.nextUrl;
    if (searchParams.get("view") === "analytics") {
      const [summary]: any = await db.query(
        `SELECT COALESCE(SUM(l.user_revenue_idr),0) AS total_revenue,
                COALESCE(SUM(l.quantity),0) AS total_quantity,
                COUNT(DISTINCT l.report_batch_id) AS total_batches,
                COUNT(DISTINCT NULLIF(l.isrc, '')) AS total_tracks
         FROM user_revenue_ledger l
         WHERE l.user_id = ? AND l.status = 'FINALIZED'`,
        [session.userId]
      );
      const [monthly]: any = await db.query(
        `SELECT DATE_FORMAT(b.report_period, '%Y-%m') AS period,
                COALESCE(SUM(l.user_revenue_idr),0) AS revenue,
                COALESCE(SUM(l.quantity),0) AS quantity
         FROM user_revenue_ledger l
         JOIN report_batches b ON b.id = l.report_batch_id
         WHERE l.user_id = ? AND l.status = 'FINALIZED'
         GROUP BY DATE_FORMAT(b.report_period, '%Y-%m')
         ORDER BY period ASC
         LIMIT 24`,
        [session.userId]
      );
      const [platforms]: any = await db.query(
        `SELECT COALESCE(NULLIF(l.platform, ''), 'Lainnya') AS name,
                COALESCE(SUM(l.user_revenue_idr),0) AS revenue,
                COALESCE(SUM(l.quantity),0) AS quantity
         FROM user_revenue_ledger l
         WHERE l.user_id = ? AND l.status = 'FINALIZED'
         GROUP BY COALESCE(NULLIF(l.platform, ''), 'Lainnya')
         ORDER BY revenue DESC
         LIMIT 8`,
        [session.userId]
      );
      const [tracks]: any = await db.query(
        `SELECT COALESCE(NULLIF(l.track_title, ''), 'Tanpa Judul') AS title,
                MAX(l.artist_name) AS artist_name, MAX(l.isrc) AS isrc,
                COALESCE(SUM(l.user_revenue_idr),0) AS revenue,
                COALESCE(SUM(l.quantity),0) AS quantity
         FROM user_revenue_ledger l
         WHERE l.user_id = ? AND l.status = 'FINALIZED'
         GROUP BY COALESCE(NULLIF(l.isrc, ''), CONCAT('row-', l.report_row_id)),
                  COALESCE(NULLIF(l.track_title, ''), 'Tanpa Judul')
         ORDER BY revenue DESC
         LIMIT 10`,
        [session.userId]
      );
      return NextResponse.json({
        success: true,
        summary: summary?.[0] || {},
        monthly,
        platforms,
        tracks,
      });
    }
    const { page, limit, offset } = paginationParams(searchParams);
    const where = ["l.user_id = ?"];
    const values: any[] = [session.userId];
    const search = searchParams.get("search");
    if (search) {
      where.push("(l.artist_name LIKE ? OR l.release_title LIKE ? OR l.track_title LIKE ? OR l.upc LIKE ? OR l.isrc LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [summary]: any = await db.query(
      `SELECT COALESCE(SUM(user_revenue_idr),0) AS total_revenue,
              COALESCE(SUM(quantity),0) AS total_quantity,
              COUNT(DISTINCT report_batch_id) AS total_batches,
              COUNT(DISTINCT NULLIF(isrc, '')) AS total_tracks
       FROM user_revenue_ledger l
       WHERE l.user_id = ? AND l.status = 'FINALIZED'`,
      [session.userId]
    );
    const [countRows]: any = await db.query(`SELECT COUNT(*) AS total FROM user_revenue_ledger l WHERE ${where.join(" AND ")}`, values);
    const [rows]: any = await db.query(
      `SELECT l.*, b.report_period, b.aggregator_name
       FROM user_revenue_ledger l
       JOIN report_batches b ON b.id = l.report_batch_id
       WHERE ${where.join(" AND ")}
       ORDER BY l.finalized_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    return NextResponse.json({
      success: true,
      summary: summary?.[0] || {},
      data: rows,
      meta: { page, limit, total: Number(countRows?.[0]?.total || 0) },
    });
  } catch (error: any) {
    return errorResponse(error, "Gagal mengambil laporan user");
  }
}
