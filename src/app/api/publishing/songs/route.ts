import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export async function GET() {
  try {
    const session = await requireUser();

    let sql = `
        SELECT s.*, u.email as user_email,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', w.name, 'role', w.role, 'share_percent', w.share_percent)) 
         FROM song_writers w WHERE w.song_id = s.id) as writers
        FROM songs s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (session.role !== "Admin") {
      sql += " AND s.user_id = ?";
      params.push(session.userId);
    }

    sql += " ORDER BY s.created_at DESC";

    const [songs] = await db.query<RowDataPacket[]>(sql, params);
    
    return NextResponse.json(songs);
  } catch (error: any) {
    console.error("API Error - GET /api/publishing/songs:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json([]); // Legacy code returned [] on error
  }
}
