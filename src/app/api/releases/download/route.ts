import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { requireUser } from "@/lib/auth";
import { getWritableUploadsDir } from "@/lib/release-upload-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function contentDisposition(filename: string) {
  const safeAscii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request) {
  try {
    await requireUser();

    const url = new URL(request.url);
    const requestedPath = url.searchParams.get("filePath") || "";
    const relativePath = requestedPath.replace(/^[\\/]+/, "").replace(/^uploads[\\/]/, "");
    const uploadsRoot = path.resolve(getWritableUploadsDir());
    const filePath = path.resolve(uploadsRoot, relativePath);

    if (!relativePath || (filePath !== uploadsRoot && !filePath.startsWith(`${uploadsRoot}${path.sep}`))) {
      return Response.json({ error: "Path file tidak valid" }, { status: 400 });
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return Response.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const requestedName = url.searchParams.get("fileName") || path.basename(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new Response(stream, {
      headers: {
        "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(fileStat.size),
        "Content-Disposition": contentDisposition(requestedName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.code === "ENOENT") {
      return Response.json({ error: "File tidak ditemukan" }, { status: 404 });
    }
    console.error("Download audio gagal:", error);
    return Response.json({ error: "Gagal mengunduh file" }, { status: 500 });
  }
}
