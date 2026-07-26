import fs from "fs/promises";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureContractTables } from "@/lib/contracts/contract-schema";
import { resolvePrivatePath } from "@/lib/contracts/contract-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStaff(role: string) {
  return ["admin", "operator"].includes(String(role || "").toLowerCase());
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await requireUser();
    await ensureContractTables();

    const { contractId } = await params;
    const id = Number(contractId);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: "Kontrak tidak valid" }, { status: 400 });
    }

    const [rows]: any = await db.query(
      `SELECT uc.id, uc.user_id,
              COALESCE(csr.signed_file_name, uc.file_name) AS file_name,
              COALESCE(csr.signed_file_path, uc.file_path) AS file_path,
              COALESCE(csr.signed_mime_type, uc.mime_type) AS mime_type
       FROM user_contracts uc
       LEFT JOIN contract_signing_requests csr
         ON csr.contract_id = uc.id AND csr.status = 'SIGNED'
       WHERE uc.id = ? AND uc.status = 'GENERATED'
       ORDER BY csr.signed_at DESC
       LIMIT 1`,
      [id]
    );
    const contract = rows?.[0];

    if (!contract) {
      return NextResponse.json({ success: false, error: "Kontrak tidak ditemukan" }, { status: 404 });
    }

    if (!isStaff(session.role) && Number(contract.user_id) !== Number(session.userId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const absolutePath = resolvePrivatePath(contract.file_path);
    const buffer = await fs.readFile(absolutePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contract.mime_type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${String(contract.file_name || "kontrak.docx").replace(/"/g, "")}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: any) {
    console.error("GET /api/contracts/[contractId]/download gagal:", error?.message || error);
    return NextResponse.json({ success: false, error: "Gagal download kontrak" }, { status: 500 });
  }
}
