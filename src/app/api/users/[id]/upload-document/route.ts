import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs";

const ALLOWED_DOC_TYPES: Record<string, string> = {
  ktp_doc_path: "ktp",
  npwp_doc_path: "npwp",
  signature_doc_path: "signature",
  nib_doc_path: "nib",
  kemenkumham_doc_path: "kemenkumham",
  contract_doc_path: "contract",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await params;

    if (session.role !== "Admin" && session.role !== "Operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const docType = String(formData.get("docType") || "").trim();

    if (!docType || !(docType in ALLOWED_DOC_TYPES)) {
      return NextResponse.json({ error: "Tipe dokumen tidak valid" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File dokumen wajib diupload" }, { status: 400 });
    }

    // Get current user doc path to delete old file later
    const [rows]: any = await db.query(
      `SELECT \`${docType}\` FROM users WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const oldPath = rows[0]?.[docType];

    // Determine upload directory and filename
    const prefix = ALLOWED_DOC_TYPES[docType];
    const ext = path.extname(file.name || "") || ".jpg";
    const filename = `${prefix}-${id}-${Date.now()}${ext}`;

    const isContract = docType === "contract_doc_path";
    const uploadSubDir = isContract ? "contracts" : "profiles";
    const uploadDir = path.join(process.cwd(), "public", "uploads", uploadSubDir);

    await fs.promises.mkdir(uploadDir, { recursive: true });

    const diskPath = path.join(uploadDir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(diskPath, bytes);

    const relativePath = `/uploads/${uploadSubDir}/${filename}`;

    // Update database
    await db.query(
      `UPDATE users SET \`${docType}\` = ? WHERE id = ?`,
      [relativePath, id]
    );

    // Delete old file if exists and path is valid local file
    if (oldPath && typeof oldPath === "string" && !oldPath.startsWith("http://") && !oldPath.startsWith("https://")) {
      let absOldPath = "";
      if (oldPath.startsWith("storage/")) {
        absOldPath = path.join(process.cwd(), oldPath);
      } else {
        absOldPath = path.join(process.cwd(), "public", oldPath.replace(/^\//, ""));
      }

      try {
        if (fs.existsSync(absOldPath)) {
          await fs.promises.unlink(absOldPath);
        }
      } catch (unlinkErr) {
        console.warn("Gagal menghapus file lama:", absOldPath, unlinkErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "File dokumen berhasil diupload dan menimpa file lama.",
      path: relativePath,
    });
  } catch (error: any) {
    console.error("Error API POST /api/users/[id]/upload-document:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || "Gagal mengupload dokumen" },
      { status: 500 }
    );
  }
}
