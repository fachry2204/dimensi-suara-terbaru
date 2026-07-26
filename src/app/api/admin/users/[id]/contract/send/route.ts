import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { ensureContractTables } from "@/lib/contracts/contract-schema";
import { sendContractSigningNotification } from "@/lib/contracts/contract-notification";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatExpiry(date: Date) {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} WIB`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    if (String(session.role).toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Kirim kontrak hanya untuk Admin" }, { status: 403 });
    }

    await ensureContractTables();
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ success: false, message: "User tidak valid" }, { status: 400 });
    }

    const [rows]: any = await db.query(
      `SELECT uc.id AS contract_id, uc.status AS contract_status,
              u.id AS user_id, u.email, u.phone, u.full_name, u.company_name, u.username
       FROM user_contracts uc
       INNER JOIN users u ON u.id = uc.user_id
       WHERE uc.user_id = ? AND uc.is_current = 1
       ORDER BY uc.id DESC
       LIMIT 1`,
      [userId]
    );
    const data = rows?.[0];
    if (!data || data.contract_status !== "GENERATED") {
      return NextResponse.json(
        { success: false, message: "Generate kontrak terlebih dahulu sebelum mengirimkannya." },
        { status: 400 }
      );
    }

    const [signedRows]: any = await db.query(
      "SELECT id FROM contract_signing_requests WHERE contract_id = ? AND status = 'SIGNED' LIMIT 1",
      [data.contract_id]
    );
    if (signedRows?.length) {
      return NextResponse.json(
        { success: false, message: "Kontrak ini sudah ditandatangani. Generate versi baru jika kontrak perlu dikirim kembali." },
        { status: 409 }
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE contract_signing_requests
       SET status = 'SUPERSEDED'
       WHERE contract_id = ? AND status = 'PENDING_SIGNATURE'`,
      [data.contract_id]
    );

    const [insert]: any = await db.query(
      `INSERT INTO contract_signing_requests
       (contract_id, user_id, token_hash, status, sent_by, sent_at, expires_at)
       VALUES (?, ?, ?, 'PENDING_SIGNATURE', ?, ?, ?)`,
      [data.contract_id, data.user_id, tokenHash, session.userId, toSqlDateTime(new Date()), toSqlDateTime(expiresAt)]
    );
    const requestId = Number(insert.insertId);
    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const signingUrl = `${origin}/contract/sign/${rawToken}`;
    const name = data.full_name || data.company_name || data.username || "User";

    const delivery = await sendContractSigningNotification({
      email: String(data.email || "").trim(),
      phone: String(data.phone || "").trim(),
      name: String(name),
      signingUrl,
      expiresAtLabel: formatExpiry(expiresAt),
    });

    await db.query(
      `UPDATE contract_signing_requests
       SET email_status = ?, email_error = ?, whatsapp_status = ?, whatsapp_error = ?
       WHERE id = ?`,
      [
        delivery.email.status,
        delivery.email.error || null,
        delivery.whatsapp.status,
        delivery.whatsapp.error || null,
        requestId,
      ]
    );

    const sentChannels = [
      delivery.email.status === "SENT" ? "Email" : "",
      delivery.whatsapp.status === "SENT" ? "WhatsApp" : "",
    ].filter(Boolean);

    return NextResponse.json({
      success: true,
      message: sentChannels.length
        ? `Kontrak berhasil dikirim melalui ${sentChannels.join(" dan ")}.`
        : "Link tanda tangan berhasil dibuat, tetapi gateway Email dan WhatsApp belum berhasil mengirim.",
      data: {
        requestId,
        signingUrl,
        expiresAt: expiresAt.toISOString(),
        delivery,
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/contract/send gagal:", error);
    return NextResponse.json(
      { success: false, message: error?.message === "UNAUTHORIZED" ? "Silakan login kembali" : "Gagal mengirim kontrak" },
      { status: error?.message === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}
