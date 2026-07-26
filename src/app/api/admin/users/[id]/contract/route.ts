import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureContractTables } from "@/lib/contracts/contract-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStaff(role: string) {
  return ["admin", "operator"].includes(String(role || "").toLowerCase());
}

function sqlUtcToIso(value: string | null) {
  if (!value) return null;
  return new Date(`${String(value).replace(" ", "T")}Z`).toISOString();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    if (!isStaff(session.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await ensureContractTables();
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ success: false, error: "User tidak valid" }, { status: 400 });
    }

    const [rows]: any = await db.query(
      `SELECT id, version, status, file_name, file_size, generated_at, error_message
       FROM user_contracts
       WHERE user_id = ? AND is_current = 1
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    const contract = rows?.[0];
    if (!contract) {
      return NextResponse.json({
        success: true,
        data: { status: "NOT_GENERATED", contract: null },
      });
    }

    const [signingRows]: any = await db.query(
      `SELECT id, status, sent_at, expires_at, signed_at, signer_name,
              email_status, email_error, whatsapp_status, whatsapp_error
       FROM contract_signing_requests
       WHERE contract_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [contract.id]
    );
    const signing = signingRows?.[0];

    return NextResponse.json({
      success: true,
      data: {
        status: contract.status,
        contract: {
          id: contract.id,
          version: contract.version,
          fileName: contract.file_name,
          fileSize: contract.file_size,
          generatedAt: sqlUtcToIso(contract.generated_at),
          errorMessage: contract.error_message,
        },
        signing: signing ? {
          id: signing.id,
          status: signing.status,
          sentAt: sqlUtcToIso(signing.sent_at),
          expiresAt: sqlUtcToIso(signing.expires_at),
          signedAt: sqlUtcToIso(signing.signed_at),
          signerName: signing.signer_name,
          emailStatus: signing.email_status,
          emailError: signing.email_error,
          whatsappStatus: signing.whatsapp_status,
          whatsappError: signing.whatsapp_error,
        } : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users/[id]/contract gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil status kontrak" }, { status: 500 });
  }
}
