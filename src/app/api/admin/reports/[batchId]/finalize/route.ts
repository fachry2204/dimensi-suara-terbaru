import { NextRequest, NextResponse } from "next/server";

import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { finalizeReportBatch } from "@/lib/reports/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const session = await requireAdminSession();
    await ensureReportTables();
    const { batchId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await finalizeReportBatch(Number(batchId), session.userId, Boolean(body?.confirmUnresolved));
    return NextResponse.json({
      success: true,
      message: "Report berhasil difinalisasi dan pendapatan sudah masuk ke laporan user.",
      data: result,
    });
  } catch (error: any) {
    return errorResponse(error, "Report gagal difinalisasi. Silakan periksa data dan coba kembali.");
  }
}
