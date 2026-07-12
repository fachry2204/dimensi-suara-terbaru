import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, paginationParams, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORT_MAP: Record<string, string> = {
  uploaded_at: "uploaded_at",
  report_period: "report_period",
  aggregator_name: "aggregator_name",
  status: "status",
  total_rows: "total_rows",
};

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { searchParams } = request.nextUrl;
    const { page, limit, offset } = paginationParams(searchParams);
    const where: string[] = [];
    const values: any[] = [];

    const search = searchParams.get("search");
    if (search) {
      where.push("(original_file_name LIKE ? OR aggregator_name LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    for (const key of ["status", "aggregator_name"] as const) {
      const value = searchParams.get(key === "aggregator_name" ? "aggregator" : key);
      if (value) {
        where.push(`${key} = ?`);
        values.push(value);
      }
    }
    const period = searchParams.get("period");
    if (period) {
      where.push("DATE_FORMAT(report_period, '%Y-%m') = ?");
      values.push(period);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sort = SORT_MAP[searchParams.get("sort") || "uploaded_at"] || "uploaded_at";
    const dir = searchParams.get("dir") === "asc" ? "ASC" : "DESC";
    const [countRows]: any = await db.query(`SELECT COUNT(*) AS total FROM report_batches ${whereSql}`, values);
    const [rows]: any = await db.query(
      `SELECT b.*, a.username AS uploaded_by_name
       FROM report_batches b
       LEFT JOIN admins a ON a.id = b.uploaded_by
       ${whereSql}
       ORDER BY ${sort} ${dir}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    return NextResponse.json({ success: true, data: rows, meta: { page, limit, total: Number(countRows?.[0]?.total || 0) } });
  } catch (error: any) {
    return errorResponse(error, "Gagal mengambil daftar report");
  }
}
