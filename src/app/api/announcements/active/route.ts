import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
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

export async function GET() {
  try {
    const session = await requireUser();
    if (String(session.role || "").toLowerCase() !== "user") {
      return NextResponse.json({ announcement: null });
    }

    await ensureAnnouncementsTable();

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, title, body, start_date, end_date
       FROM announcements
       WHERE CURDATE() BETWEEN start_date AND end_date
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    );

    return NextResponse.json({ announcement: rows[0] || null });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ announcement: null }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ announcement: null }, { status: 403 });
    console.error("API Error - GET /api/announcements/active:", error);
    return NextResponse.json({ announcement: null });
  }
}
