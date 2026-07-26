import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { ensureContractTables } from "@/lib/contracts/contract-schema";
import { resolvePrivatePath, sanitizeFileSegment } from "@/lib/contracts/contract-paths";
import { createSignedContractDocx } from "@/lib/contracts/contract-signature";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function formatJakarta(value: string | Date) {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))} WIB`;
}

function sqlUtcToIso(value: string | null) {
  if (!value) return null;
  return new Date(`${String(value).replace(" ", "T")}Z`).toISOString();
}

async function findSigningRequest(token: string) {
  const [rows]: any = await db.query(
    `SELECT csr.*, (csr.expires_at <= UTC_TIMESTAMP()) AS is_expired,
            uc.file_name, uc.file_path, uc.mime_type, uc.checksum_sha256,
            uc.generated_at, uc.generated_data_snapshot, uc.version,
            u.email, u.phone, u.full_name, u.company_name, u.username, u.account_type
     FROM contract_signing_requests csr
     INNER JOIN user_contracts uc ON uc.id = csr.contract_id
     INNER JOIN users u ON u.id = csr.user_id
     WHERE csr.token_hash = ?
     LIMIT 1`,
    [hashToken(token)]
  );
  return rows?.[0];
}

function publicData(row: any) {
  let snapshot: Record<string, any> = {};
  try {
    snapshot = typeof row.generated_data_snapshot === "string"
      ? JSON.parse(row.generated_data_snapshot)
      : row.generated_data_snapshot || {};
  } catch {
    snapshot = {};
  }

  const displayName = row.full_name || row.company_name || row.username || "";
  return {
    status: row.status,
    contractId: Number(row.contract_id),
    contractNumber: snapshot.nomor_kontrak_aggregator || `DS-CONTRACT-${row.contract_id}`,
    ownerName: displayName,
    ownerEmail: row.email || "",
    contractType: String(row.account_type || "PERSONAL").toUpperCase() === "COMPANY"
      ? "Kontrak Perusahaan"
      : "Kontrak Personal",
    version: Number(row.version || 1),
    generatedAt: sqlUtcToIso(row.generated_at),
    expiresAt: sqlUtcToIso(row.expires_at),
    signedAt: sqlUtcToIso(row.signed_at),
    signerName: row.signer_name,
    fileName: row.status === "SIGNED" && row.signed_file_name ? row.signed_file_name : row.file_name,
    preview: "",
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await ensureContractTables();
    const { token } = await params;
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ success: false, error: "Tautan kontrak tidak valid" }, { status: 404 });
    }

    const row = await findSigningRequest(token);
    if (!row) {
      return NextResponse.json({ success: false, error: "Tautan kontrak tidak ditemukan" }, { status: 404 });
    }

    if (row.status === "PENDING_SIGNATURE" && Boolean(row.is_expired)) {
      await db.query("UPDATE contract_signing_requests SET status = 'EXPIRED' WHERE id = ?", [row.id]);
      row.status = "EXPIRED";
    }

    if (["SUPERSEDED", "EXPIRED"].includes(row.status)) {
      return NextResponse.json(
        {
          success: false,
          error: row.status === "EXPIRED"
            ? "Tautan penandatanganan sudah kedaluwarsa. Hubungi Admin untuk meminta tautan baru."
            : "Tautan ini sudah digantikan oleh tautan kontrak yang lebih baru.",
          status: row.status,
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: publicData(row),
    });
  } catch (error: any) {
    console.error("GET /api/contracts/sign/[token] gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal membuka kontrak" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  let signatureAbsolutePath = "";
  let signedAbsolutePath = "";
  let signingRequestId: number | null = null;

  try {
    await ensureContractTables();
    const { token } = await params;
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ success: false, error: "Tautan kontrak tidak valid" }, { status: 404 });
    }

    const body = await request.json();
    const signerName = String(body.signerName || "").trim();
    const consent = body.consent === true;
    const signatureMatch = String(body.signature || "").match(PNG_DATA_URL);
    if (signerName.length < 3 || signerName.length > 255) {
      return NextResponse.json({ success: false, error: "Nama penanda tangan harus diisi dengan benar" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ success: false, error: "Persetujuan isi kontrak wajib dicentang" }, { status: 400 });
    }
    if (!signatureMatch) {
      return NextResponse.json({ success: false, error: "Tanda tangan belum dibubuhkan" }, { status: 400 });
    }

    const signatureBuffer = Buffer.from(signatureMatch[1], "base64");
    if (signatureBuffer.length < 300 || signatureBuffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Data tanda tangan tidak valid" }, { status: 400 });
    }

    const row = await findSigningRequest(token);
    if (!row) {
      return NextResponse.json({ success: false, error: "Tautan kontrak tidak ditemukan" }, { status: 404 });
    }
    if (row.status === "SIGNED") {
      return NextResponse.json({ success: true, message: "Kontrak sudah ditandatangani", data: publicData(row) });
    }
    if (row.status !== "PENDING_SIGNATURE" || Boolean(row.is_expired)) {
      if (Boolean(row.is_expired)) {
        await db.query("UPDATE contract_signing_requests SET status = 'EXPIRED' WHERE id = ?", [row.id]);
      }
      return NextResponse.json({ success: false, error: "Tautan penandatanganan tidak lagi aktif" }, { status: 410 });
    }

    const [lockResult]: any = await db.query(
      `UPDATE contract_signing_requests
       SET status = 'SIGNING'
       WHERE id = ? AND status = 'PENDING_SIGNATURE'`,
      [row.id]
    );
    if (lockResult.affectedRows !== 1) {
      return NextResponse.json({ success: false, error: "Kontrak sedang diproses atau sudah ditandatangani" }, { status: 409 });
    }
    signingRequestId = Number(row.id);

    const originalBuffer = await fs.readFile(resolvePrivatePath(row.file_path));
    const signedAt = new Date();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const signerIp = forwardedFor || request.headers.get("x-real-ip") || "Tidak tersedia";
    const signerUserAgent = request.headers.get("user-agent") || "";
    const signed = createSignedContractDocx({
      originalBuffer,
      signatureBuffer,
      requestId: Number(row.id),
      signerName,
      signerEmail: String(row.email || ""),
      signedAtLabel: formatJakarta(signedAt),
      signerIp,
      contractChecksum: String(row.checksum_sha256 || ""),
    });

    const relativeDir = path.join("storage", "private", "contracts", String(row.user_id), "signed");
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const signatureName = `signature-${row.id}.png`;
    const baseName = sanitizeFileSegment(String(row.file_name || "Kontrak").replace(/\.docx$/i, ""));
    const signedFileName = `${baseName}_Ditandatangani.docx`;
    const signatureRelativePath = path.join(relativeDir, signatureName).replace(/\\/g, "/");
    const signedRelativePath = path.join(relativeDir, signedFileName).replace(/\\/g, "/");
    signatureAbsolutePath = path.join(absoluteDir, signatureName);
    signedAbsolutePath = path.join(absoluteDir, signedFileName);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(signatureAbsolutePath, signatureBuffer);
    await fs.writeFile(signedAbsolutePath, signed.buffer);

    await db.query(
      `UPDATE contract_signing_requests
       SET status = 'SIGNED',
           signed_at = ?,
           signer_name = ?,
           signer_email = ?,
           signer_ip = ?,
           signer_user_agent = ?,
           signature_file_path = ?,
           signed_file_name = ?,
           signed_file_path = ?,
           signed_mime_type = ?,
           signed_file_size = ?,
           signed_checksum_sha256 = ?
       WHERE id = ?`,
      [
        signedAt.toISOString().slice(0, 19).replace("T", " "),
        signerName,
        row.email || null,
        signerIp,
        signerUserAgent,
        signatureRelativePath,
        signedFileName,
        signedRelativePath,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        signed.buffer.length,
        signed.checksum,
        row.id,
      ]
    );
    await db.query(
      "UPDATE users SET contract_status = 'Ditandatangani', contract_doc_path = ? WHERE id = ?",
      [signedRelativePath, row.user_id]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, created_at)
       VALUES (?, 'Kontrak Berhasil Ditandatangani', ?, NOW())`,
      [row.user_id, `Kontrak Anda berhasil ditandatangani pada ${formatJakarta(signedAt)}.`]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Kontrak berhasil ditandatangani",
      data: {
        status: "SIGNED",
        signedAt: signedAt.toISOString(),
        signerName,
      },
    });
  } catch (error: any) {
    if (signingRequestId) {
      await db.query(
        "UPDATE contract_signing_requests SET status = 'PENDING_SIGNATURE' WHERE id = ? AND status = 'SIGNING'",
        [signingRequestId]
      ).catch(() => {});
    }
    if (signatureAbsolutePath) await fs.unlink(signatureAbsolutePath).catch(() => {});
    if (signedAbsolutePath) await fs.unlink(signedAbsolutePath).catch(() => {});
    console.error("POST /api/contracts/sign/[token] gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan tanda tangan kontrak" }, { status: 500 });
  }
}
