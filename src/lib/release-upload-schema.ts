import "server-only";

import fs from "fs";
import path from "path";
import { db, type RowDataPacket } from "@/lib/db";

let initialized = false;

export async function ensureReleaseUploadTable() {
  if (initialized) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS release_uploads (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      upload_session_id VARCHAR(100) NOT NULL,
      release_id BIGINT UNSIGNED NULL,
      track_id BIGINT UNSIGNED NULL,
      file_purpose VARCHAR(50) NULL,
      original_name VARCHAR(500) NULL,
      mime_type VARCHAR(150) NULL,
      file_size BIGINT UNSIGNED NULL,
      file_path VARCHAR(500) NULL,
      duration_seconds INT NULL,
      sample_rate INT NULL,
      bit_depth INT NULL,
      status VARCHAR(30) NULL DEFAULT 'PENDING',
      created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_release_upload_session (upload_session_id),
      INDEX idx_release_upload_release (release_id),
      INDEX idx_release_upload_track (track_id),
      INDEX idx_release_upload_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [columns] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM release_uploads");
  const names = new Set(columns.map((column) => String(column.Field)));
  const additions: Array<[string, string]> = [
    ["release_id", "BIGINT UNSIGNED NULL"],
    ["track_id", "BIGINT UNSIGNED NULL"],
    ["file_purpose", "VARCHAR(50) NULL"],
    ["original_name", "VARCHAR(500) NULL"],
    ["mime_type", "VARCHAR(150) NULL"],
    ["file_size", "BIGINT UNSIGNED NULL"],
    ["file_path", "VARCHAR(500) NULL"],
    ["duration_seconds", "INT NULL"],
    ["sample_rate", "INT NULL"],
    ["bit_depth", "INT NULL"],
    ["status", "VARCHAR(30) NULL DEFAULT 'PENDING'"],
    ["created_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP"],
  ];

  for (const [name, definition] of additions) {
    if (!names.has(name)) {
      await db.query(`ALTER TABLE release_uploads ADD COLUMN \`${name}\` ${definition}`).catch(() => null);
    }
  }

  initialized = true;
}

export function getUploadTempDir(uploadId: string) {
  return path.join(process.cwd(), "public", "uploads", "tmp", uploadId);
}

export function getUploadAudioDir() {
  return path.join(process.cwd(), "public", "uploads", "audio");
}

export function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
