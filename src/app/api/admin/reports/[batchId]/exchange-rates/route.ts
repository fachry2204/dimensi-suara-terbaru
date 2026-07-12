import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";
import { ensureReportTables } from "@/lib/reports/report-schema";
import { recalculateRowsForBatch, updateBatchSummary } from "@/lib/reports/report-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAdminSession();
    await ensureReportTables();
    const { batchId } = await params;
    const body = await request.json();
    const rates = body?.rates || {};
    rates.IDR = 1;
    for (const [currency, rate] of Object.entries(rates)) {
      const numeric = Number(rate);
      if (!currency || !Number.isFinite(numeric) || numeric <= 0) {
        return NextResponse.json({ success: false, message: `Kurs untuk ${currency} tidak valid.` }, { status: 400 });
      }
      rates[currency.toUpperCase()] = numeric;
    }
    await db.query("UPDATE report_batches SET currency_rates_snapshot = ? WHERE id = ? AND status <> 'FINALIZED'", [JSON.stringify(rates), batchId]);
    await recalculateRowsForBatch(Number(batchId));
    await updateBatchSummary(Number(batchId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return errorResponse(error, "Gagal menyimpan kurs");
  }
}
