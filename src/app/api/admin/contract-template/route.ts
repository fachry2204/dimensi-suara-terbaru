import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureContractTables } from "@/lib/contracts/contract-schema";
import { sanitizeFileSegment } from "@/lib/contracts/contract-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string) {
  return String(role || "").toLowerCase() === "admin";
}

function normalizeAccountType(value: FormDataEntryValue | string | null) {
  const normalized = String(value || "PERSONAL").toUpperCase();
  return normalized === "COMPANY" ? "COMPANY" : "PERSONAL";
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    if (!isAdmin(session.role) && String(session.role).toLowerCase() !== "operator") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await ensureContractTables();
    const requestedType = request.nextUrl.searchParams.get("accountType");
    const accountType = requestedType ? normalizeAccountType(requestedType) : null;
    const whereClause = accountType ? "WHERE is_active = 1 AND account_type = ?" : "WHERE is_active = 1";
    const values = accountType ? [accountType] : [];
    const [rows]: any = await db.query(
      `SELECT id, file_name, file_size, version, account_type, created_at
       FROM contract_templates
       ${whereClause}
       ORDER BY id DESC`,
      values
    );

    if (accountType) {
      return NextResponse.json({
        success: true,
        data: rows?.[0] || null,
      });
    }

    const templates = { PERSONAL: null as any, COMPANY: null as any };
    for (const row of rows || []) {
      const rowType = normalizeAccountType(row.account_type);
      if (!templates[rowType]) templates[rowType] = row;
    }

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error("GET /api/admin/contract-template gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil template kontrak" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    if (!isAdmin(session.role)) {
      return NextResponse.json({ success: false, error: "Generate/upload template hanya untuk Admin" }, { status: 403 });
    }

    await ensureContractTables();
    const formData = await request.formData();
    const file = formData.get("file");
    const accountType = normalizeAccountType(formData.get("accountType"));

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File template wajib diupload" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ success: false, error: "Template kontrak wajib file .docx" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const [versionRows]: any = await db.query(
      "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM contract_templates WHERE account_type = ?",
      [accountType]
    );
    const version = Number(versionRows?.[0]?.next_version || 1);
    const fileName = `${String(version).padStart(3, "0")}_${Date.now()}_${sanitizeFileSegment(file.name)}`;
    const relativeDir = path.join("storage", "private", "contract-templates");
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const relativePath = path.join(relativeDir, fileName).replace(/\\/g, "/");
    const absolutePath = path.join(absoluteDir, fileName);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    await db.query("UPDATE contract_templates SET is_active = 0 WHERE is_active = 1 AND account_type = ?", [accountType]);
    await db.query(
      `INSERT INTO contract_templates
       (file_name, file_path, mime_type, file_size, checksum_sha256, account_type, version, is_active, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        file.name,
        relativePath,
        file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer.length,
        crypto.createHash("sha256").update(buffer).digest("hex"),
        accountType,
        version,
        session.userId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Template kontrak berhasil diupload.",
      data: { fileName: file.name, version, fileSize: buffer.length, accountType },
    });
  } catch (error: any) {
    console.error("POST /api/admin/contract-template gagal:", error);
    return NextResponse.json({ success: false, error: "Gagal upload template kontrak" }, { status: 500 });
  }
}
