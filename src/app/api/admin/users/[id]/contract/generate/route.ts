import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureContractTables } from "@/lib/contracts/contract-schema";
import {
  ContractUserData,
  generateContractDocx,
  validateContractUserData,
} from "@/lib/contracts/contract-generator";
import { resolvePrivatePath } from "@/lib/contracts/contract-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string) {
  return String(role || "").toLowerCase() === "admin";
}

function normalizeAccountType(value: string | null | undefined) {
  return String(value || "PERSONAL").toUpperCase() === "COMPANY" ? "COMPANY" : "PERSONAL";
}

function toSqlDateTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function cleanup(filePath: string | null) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let contractId: number | null = null;
  let tempPath: string | null = null;

  try {
    const session = await requireUser();
    if (!isAdmin(session.role)) {
      return NextResponse.json({ success: false, message: "Generate kontrak hanya untuk Admin" }, { status: 403 });
    }

    await ensureContractTables();
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ success: false, message: "User tidak valid" }, { status: 400 });
    }

    const [processingRows]: any = await db.query(
      "SELECT id FROM user_contracts WHERE user_id = ? AND status = 'GENERATING' AND is_current = 1 LIMIT 1",
      [userId]
    );

    if (processingRows?.length) {
      return NextResponse.json(
        { success: false, message: "Kontrak user sedang diproses." },
        { status: 409 }
      );
    }

    const [userRows]: any = await db.query(
      `SELECT id, username, email, account_type, company_name, full_name, director_name,
              nik, phone, address, country, province, city, district, subdistrict, postal_code,
              pic_name, bank_name, bank_account_number, bank_account_name,
              aggregator_percentage, publishing_percentage
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    const user = userRows?.[0] as ContractUserData | undefined;
    if (!user) {
      return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
    }

    const validation = validateContractUserData(user);
    if (validation.missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Kontrak belum dapat dibuat karena data user belum lengkap.",
          missingFields: validation.missing,
        },
        { status: 400 }
      );
    }

    if (!validation.percentageValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Kontrak tidak dapat dibuat karena persentase aggregator atau publishing tidak valid. Isi masing-masing persentase antara 0 sampai 100.",
        },
        { status: 400 }
      );
    }

    const [templateRows]: any = await db.query(
      `SELECT id, file_path, version
       FROM contract_templates
       WHERE is_active = 1 AND account_type = ?
       ORDER BY id DESC
       LIMIT 1`,
      [normalizeAccountType(user.account_type)]
    );
    const template = templateRows?.[0];

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: `Template kontrak ${normalizeAccountType(user.account_type)} aktif belum tersedia.`,
        },
        { status: 400 }
      );
    }

    const templateAbsolutePath = resolvePrivatePath(template.file_path);
    await fs.access(templateAbsolutePath).catch(() => {
      throw new Error("TEMPLATE_FILE_MISSING");
    });

    const [versionRows]: any = await db.query(
      "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM user_contracts WHERE user_id = ?",
      [userId]
    );
    const version = Number(versionRows?.[0]?.next_version || 1);

    const [insertResult]: any = await db.query(
      `INSERT INTO user_contracts
       (user_id, contract_template_id, version, status, generated_by, is_current)
       VALUES (?, ?, ?, 'GENERATING', ?, 1)`,
      [userId, template.id, version, session.userId]
    );
    contractId = Number(insertResult.insertId);

    const generated = await generateContractDocx({
      user,
      template: { id: Number(template.id), version: Number(template.version), file_path: template.file_path },
      templateAbsolutePath,
    });

    if (generated.unknownPlaceholders.length > 0) {
      throw new Error(`UNKNOWN_PLACEHOLDERS:${generated.unknownPlaceholders.join("|")}`);
    }

    const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(generated.generatedAt);
    const relativeDir = path.join("storage", "private", "contracts", String(userId), year);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const finalRelativePath = path.join(relativeDir, generated.fileName).replace(/\\/g, "/");
    const finalAbsolutePath = path.join(absoluteDir, generated.fileName);
    tempPath = `${finalAbsolutePath}.tmp`;

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(tempPath, generated.buffer);
    await fs.rename(tempPath, finalAbsolutePath);
    tempPath = null;

    await db.query("UPDATE user_contracts SET is_current = 0 WHERE user_id = ? AND id <> ?", [userId, contractId]);
    await db.query(
      `UPDATE user_contracts
       SET status = 'GENERATED',
           file_name = ?,
           file_path = ?,
           mime_type = ?,
           file_size = ?,
           checksum_sha256 = ?,
           generated_data_snapshot = ?,
           error_message = NULL,
           generated_at = ?
       WHERE id = ?`,
      [
        generated.fileName,
        finalRelativePath,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        generated.fileSize,
        generated.checksum,
        JSON.stringify(generated.snapshot),
        toSqlDateTime(generated.generatedAt),
        contractId,
      ]
    );

    await db.query(
      "UPDATE users SET contract_status = ?, contract_doc_path = ? WHERE id = ?",
      ["Berhasil", finalRelativePath, userId]
    );

    return NextResponse.json({
      success: true,
      message: "Kontrak berhasil dibuat.",
      data: {
        contractId,
        status: "GENERATED",
        version,
      },
    });
  } catch (error: any) {
    await cleanup(tempPath);

    let message = "Kontrak gagal dibuat. Silakan periksa data user dan template kontrak.";
    if (error?.message === "TEMPLATE_FILE_MISSING") {
      message = "File template kontrak tidak ditemukan pada server. Silakan upload ulang template kontrak melalui menu Setting.";
    } else if (String(error?.message || "").startsWith("UNKNOWN_PLACEHOLDERS:")) {
      const placeholders = String(error.message).replace("UNKNOWN_PLACEHOLDERS:", "").split("|").filter(Boolean);
      message = `Kontrak gagal dibuat karena terdapat placeholder yang belum memiliki sumber data: ${placeholders.join(", ")}`;
    }

    if (contractId) {
      await db.query(
        "UPDATE user_contracts SET status = 'FAILED', error_message = ?, is_current = 1 WHERE id = ?",
        [message, contractId]
      ).catch(() => {});
    }

    console.error("POST /api/admin/users/[id]/contract/generate gagal:", error?.message || error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
