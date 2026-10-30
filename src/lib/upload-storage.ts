import "server-only";

import { stat } from "fs/promises";
import path from "path";

export function getUploadRoots(): string[] {
  const candidates = [
    process.env.UPLOADS_DIR,
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "httpdocs", "uploads"),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "httpdocs", "public", "uploads"),
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates.map((candidate) => path.resolve(candidate))));
}

export function getWritableUploadRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
}

export function normalizeStoredUploadPath(storedPath: string): string | null {
  let value = String(storedPath || "").trim();
  if (!value || value.includes("\0")) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return null;
    }
  }

  value = value.replace(/\\/g, "/");
  const uploadsMarker = value.toLowerCase().lastIndexOf("/uploads/");
  if (uploadsMarker >= 0) value = value.slice(uploadsMarker + "/uploads/".length);
  value = value.replace(/^\/+/, "").replace(/^uploads\//i, "");

  const parts = value.split("/").filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === "." || part === "..")) return null;

  return parts.join(path.sep);
}

function isInside(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

export async function findStoredUploadFile(storedPath: string) {
  const relativePath = normalizeStoredUploadPath(storedPath);
  if (!relativePath) return null;

  for (const root of getUploadRoots()) {
    const filePath = path.resolve(root, relativePath);
    if (!isInside(root, filePath)) continue;

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) return { filePath, fileStat };
    } catch {
      // Continue to the next configured upload root.
    }
  }

  return null;
}

export const UPLOAD_MIME_TYPES: Record<string, string> = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
