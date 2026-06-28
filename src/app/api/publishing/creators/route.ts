import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export async function GET() {
  try {
    const session = await requireUser();

    let sql = "SELECT * FROM writers";
    const params: any[] = [];

    if (session.role !== "Admin") {
      sql += " WHERE user_id = ?";
      params.push(session.userId);
    }

    sql += " ORDER BY created_at DESC";

    const [writers] = await db.query<RowDataPacket[]>(sql, params);
    return NextResponse.json(writers);
  } catch (error: any) {
    console.error("API Error - GET /api/publishing/creators:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
