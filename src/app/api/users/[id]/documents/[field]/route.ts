import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";
import { findStoredUploadFile, UPLOAD_MIME_TYPES } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCUMENT_FIELDS = new Set([
  "ktp_doc_path",
  "npwp_doc_path",
  "signature_doc_path",
  "nib_doc_path",
  "kemenkumham_doc_path",
  "contract_doc_path",
]);

function contentDisposition(filename: string, download: boolean): string {
  const safeAscii = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `${download ? "attachment" : "inline"}; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; field: string }> },
) {
  try {
    const session = await requireUser();
    const role = String(session.role || "").toLowerCase();
    if (role !== "admin" && role !== "operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, field } = await params;
    if (!/^\d+$/.test(id) || !DOCUMENT_FIELDS.has(field)) {
      return NextResponse.json({ error: "Dokumen tidak valid" }, { status: 400 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT \`${field}\` AS document_path FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const storedPath = String(rows[0].document_path || "").trim();
    if (!storedPath) {
      return NextResponse.json({ error: "Dokumen belum diupload" }, { status: 404 });
    }

    const found = await findStoredUploadFile(storedPath);
    if (!found) {
      console.warn("Document file missing:", { userId: id, field, storedPath });
      return NextResponse.json(
        { error: "File dokumen tidak ditemukan di penyimpanan server" },
        { status: 404 },
      );
    }

    const filename = path.basename(found.filePath);
    const contentType = UPLOAD_MIME_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream";
    const download = request.nextUrl.searchParams.get("download") === "1";
    const stream = Readable.toWeb(createReadStream(found.filePath)) as ReadableStream;

    return new Response(stream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": contentDisposition(filename, download),
        "Content-Length": String(found.fileStat.size),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Document delivery failed:", error);
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Gagal membaca dokumen" }, { status: 500 });
  }
}
