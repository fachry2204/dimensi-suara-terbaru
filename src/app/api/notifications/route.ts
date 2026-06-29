import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  try {
    const session = await requireUser();

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [session.userId];

    // Filter out login notifications for non-Admin users
    if (session.role !== 'Admin') {
        query += " AND message NOT LIKE 'Login baru terdeteksi%'";
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await db.query<RowDataPacket[]>(query, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("API Error - GET /api/notifications:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json([], { status: 500 });
  }
}
