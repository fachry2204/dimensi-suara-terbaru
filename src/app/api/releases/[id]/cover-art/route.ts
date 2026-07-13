import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReleaseById } from "@/repositories/release.repository";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

function isAdminRole(role: string) {
  return String(role || "").toLowerCase() === "admin";
}

function safeExtension(fileName: string, fileType: string) {
  const ext = path.extname(fileName || "").toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return ext;
  if (fileType === "image/jpeg" || fileType === "image/jpg") return ".jpg";
  return "";
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await requireUser();
    const release = await getReleaseById(params.id, session.userId, session.role);

    if (!release) {
      return NextResponse.json({ error: "Release not found or unauthorized" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("cover_art");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File cover art wajib diupload" }, { status: 400 });
    }

    const ext = safeExtension(file.name, file.type);
    if (!ext) {
      return NextResponse.json({ error: "Cover art wajib JPG/JPEG" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran cover art tidak boleh lebih dari 5MB" }, { status: 400 });
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "releases",
      "cover-art",
      String(release.user_id || session.userId)
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `cover-${params.id}-${Date.now()}${ext}`;
    const diskPath = path.join(uploadDir, fileName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(diskPath, bytes);

    const coverArt = `/uploads/releases/cover-art/${release.user_id || session.userId}/${fileName}`;
    const nextStatus = isAdminRole(session.role) ? release.status : "Request Edit";

    await db.query("UPDATE releases SET cover_art = ?, status = ? WHERE id = ?", [
      coverArt,
      nextStatus,
      params.id,
    ]);

    return NextResponse.json({
      success: true,
      coverArt,
      status: nextStatus,
    });
  } catch (error: any) {
    console.error(`API Error - POST /api/releases/${params.id}/cover-art:`, error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat upload cover art" },
      { status: 500 }
    );
  }
}
