import { NextRequest, NextResponse } from "next/server";

import { createReportBatch } from "@/lib/reports/report-service";
import { errorResponse, requireAdminSession } from "@/lib/reports/report-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const form = await request.formData();
    const file = form.get("file");
    const aggregatorName = String(form.get("aggregatorName") || "").trim();
    const reportPeriod = String(form.get("reportPeriod") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "File report wajib diupload" }, { status: 400 });
    }
    if (!aggregatorName) {
      return NextResponse.json({ success: false, message: "Nama Aggregator wajib diisi" }, { status: 400 });
    }

    const result = await createReportBatch({
      file,
      aggregatorName,
      reportPeriod,
      uploadedBy: session.userId,
    });
    return NextResponse.json({ success: true, message: "Report berhasil diproses", data: result });
  } catch (error: any) {
    return errorResponse(error, "Report gagal diproses. Silakan periksa data dan coba kembali.");
  }
}
