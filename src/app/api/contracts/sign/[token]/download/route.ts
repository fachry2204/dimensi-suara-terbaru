import crypto from "crypto";
import fs from "fs/promises";
import { NextResponse } from "next/server";

import { ensureContractTables } from "@/lib/contracts/contract-schema";
import { resolvePrivatePath } from "@/lib/contracts/contract-paths";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await ensureContractTables();
    const { token } = await params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [rows]: any = await db.query(
      `SELECT csr.status, (csr.expires_at <= UTC_TIMESTAMP()) AS is_expired,
              csr.signed_file_name, csr.signed_file_path, csr.signed_mime_type,
              uc.file_name, uc.file_path, uc.mime_type
       FROM contract_signing_requests csr
       INNER JOIN user_contracts uc ON uc.id = csr.contract_id
       WHERE csr.token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    const row = rows?.[0];
    if (!row || ["SUPERSEDED", "EXPIRED"].includes(row.status)) {
      return NextResponse.json({ success: false, error: "Tautan kontrak tidak aktif" }, { status: 404 });
    }
    if (row.status !== "SIGNED" && Boolean(row.is_expired)) {
      return NextResponse.json({ success: false, error: "Tautan kontrak telah kedaluwarsa" }, { status: 410 });
    }

    const isSigned = row.status === "SIGNED" && row.signed_file_path;
    const filePath = isSigned ? row.signed_file_path : row.file_path;
    const fileName = isSigned ? row.signed_file_name : row.file_name;
    const mimeType = isSigned ? row.signed_mime_type : row.mime_type;
    const buffer = await fs.readFile(resolvePrivatePath(filePath));

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${String(fileName || "kontrak.docx").replace(/"/g, "")}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("GET /api/contracts/sign/[token]/download gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal mengunduh kontrak" }, { status: 500 });
  }
}
