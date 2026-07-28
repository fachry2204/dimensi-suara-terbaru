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
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp",
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
    if (!relativePath) {
      return Response.json({ error: "Path file tidak valid" }, { status: 400 });
    }

    // Current uploads live in UPLOADS_DIR. Older releases may still reference
    // files saved under public/uploads, so keep a read-only compatibility root.
    const uploadRoots = Array.from(new Set([
      path.resolve(getWritableUploadsDir()),
      path.resolve(process.cwd(), "uploads"),
      path.resolve(process.cwd(), "httpdocs", "uploads"),
      path.resolve(process.cwd(), "public", "uploads"),
      path.resolve(process.cwd(), "httpdocs", "public", "uploads"),
    ]));

    let filePath = "";
    let fileStat: { isFile(): boolean; size: number } | null = null;
    for (const uploadsRoot of uploadRoots) {
      const candidate = path.resolve(uploadsRoot, relativePath);
      if (candidate !== uploadsRoot && !candidate.startsWith(`${uploadsRoot}${path.sep}`)) {
        continue;
      }
      try {
        const candidateStat = await stat(candidate);
        if (candidateStat.isFile()) {
          filePath = candidate;
          fileStat = candidateStat as { isFile(): boolean; size: number };
          break;
        }
      } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    if (!filePath || !fileStat) {
      return Response.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const requestedName = url.searchParams.get("fileName") || path.basename(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const isInline = url.searchParams.get("inline") === "1";
    const range = request.headers.get("range");

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }

      const start = match[1] ? Number(match[1]) : 0;
      const requestedEnd = match[2] ? Number(match[2]) : fileStat.size - 1;
      const end = Math.min(requestedEnd, fileStat.size - 1);

      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= fileStat.size) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileStat.size}` },
        });
      }

      const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Type": contentType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Content-Disposition": isInline ? "inline" : contentDisposition(requestedName),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new Response(stream, {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": isInline ? "inline" : contentDisposition(requestedName),
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
    console.error("Download file rilis gagal:", error);
    return Response.json({ error: "Gagal mengunduh file" }, { status: 500 });
  }
}
