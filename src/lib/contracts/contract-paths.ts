import path from "path";

export function sanitizeFileSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80) || "User";
}

export function resolvePrivatePath(relativePath: string) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error("Path file tidak valid");
  }
  return path.join(process.cwd(), normalized);
}
