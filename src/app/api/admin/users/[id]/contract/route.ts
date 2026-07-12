import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureContractTables } from "@/lib/contracts/contract-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStaff(role: string) {
  return ["admin", "operator"].includes(String(role || "").toLowerCase());
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

    return NextResponse.json({
      success: true,
      data: {
        status: contract.status,
        contract: {
          id: contract.id,
          version: contract.version,
          fileName: contract.file_name,
          fileSize: contract.file_size,
          generatedAt: contract.generated_at,
          errorMessage: contract.error_message,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users/[id]/contract gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil status kontrak" }, { status: 500 });
  }
}
