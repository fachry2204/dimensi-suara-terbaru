import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

async function ensureAnnouncementsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_announcement_dates (start_date, end_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalizeDate(value: unknown) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  return text;
}

export async function GET() {
  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);
    await ensureAnnouncementsTable();

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, title, body, start_date, end_date, created_at, updated_at
       FROM announcements
       ORDER BY created_at DESC, id DESC`
    );

    return NextResponse.json({ announcements: rows });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("API Error - GET /api/admin/announcements:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["Admin", "admin", "Operator", "operator"]);
    await ensureAnnouncementsTable();

    const payload = await request.json().catch(() => ({}));
    const title = String(payload.title || "").trim();
    const body = String(payload.body || "").trim();
    const startDate = normalizeDate(payload.startDate);
    const endDate = normalizeDate(payload.endDate);

    if (!title || !body || !startDate || !endDate) {
      return NextResponse.json({ error: "Judul, isi, tanggal mulai, dan tanggal selesai wajib diisi" }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai" }, { status: 400 });
    }

    await db.query(
      `INSERT INTO announcements (title, body, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [title, body, startDate, endDate, session.userId]
    );

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, title, body, start_date, end_date, created_at, updated_at
       FROM announcements
       ORDER BY id DESC
       LIMIT 1`
    );

    return NextResponse.json({ message: "Pengumuman berhasil disimpan", announcement: rows[0] || null }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("API Error - POST /api/admin/announcements:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
