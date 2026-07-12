import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, paginationParams, requireAdminSession } from "@/lib/reports/report-api";
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
    const { searchParams } = request.nextUrl;
    const { page, limit, offset } = paginationParams(searchParams);
    const where = ["r.report_batch_id = ?"];
    const values: any[] = [batchId];

    const filters: Record<string, string> = {
      status: "r.status",
      platform: "r.platform",
      country: "r.country_region",
      currency: "r.client_payment_currency",
      isrc: "r.isrc_normalized",
      upc: "r.upc_normalized",
    };
    for (const [param, column] of Object.entries(filters)) {
      const value = searchParams.get(param);
      if (value) {
        where.push(`${column} = ?`);
        values.push(value);
      }
    }
    const userId = searchParams.get("userId");
    if (userId) {
      where.push("r.matched_user_id = ?");
      values.push(userId);
    }
    const search = searchParams.get("search");
    if (search) {
      where.push("(r.artist_name LIKE ? OR r.track_title LIKE ? OR r.release_title LIKE ? OR r.upc_original LIKE ? OR r.isrc_original LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const [countRows]: any = await db.query(`SELECT COUNT(*) AS total FROM report_rows r ${whereSql}`, values);
    const [rows]: any = await db.query(
      `SELECT r.*, u.full_name, u.company_name, u.email
       FROM report_rows r
       LEFT JOIN users u ON u.id = r.matched_user_id
       ${whereSql}
       ORDER BY r.row_number ASC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    return NextResponse.json({ success: true, data: rows, meta: { page, limit, total: Number(countRows?.[0]?.total || 0) } });
  } catch (error: any) {
    return errorResponse(error, "Gagal mengambil rows report");
  }
}
