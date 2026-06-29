import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    
    let id: number | undefined;
    try {
        const body = await request.json();
        id = body.id;
    } catch (e) {
        // Body is optional
    }

    if (id) {
        // Mark specific notification
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, session.userId]
        );
    } else {
        // Mark all for user
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [session.userId]
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error - POST /api/notifications/mark-read:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
