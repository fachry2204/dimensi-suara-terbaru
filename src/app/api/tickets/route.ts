import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { ensureTicketTables, normalizeTicketStatus } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const isStaff = (role: string) => ["Admin", "Operator"].includes(role);

export async function GET() {
  try {
    const session = await requireUser();
    await ensureTicketTables();

    const where = isStaff(session.role) ? "" : "WHERE t.user_id = ?";
    const params = isStaff(session.role) ? [] : [session.userId];

    const [tickets] = await db.query<RowDataPacket[]>(
      `
        SELECT
          t.id,
          t.subject,
          t.category,
          t.status,
          t.created_at,
          t.updated_at,
          t.user_id,
          COALESCE(NULLIF(u.full_name, ''), NULLIF(u.company_name, ''), u.username, u.email, 'Unknown') AS user_name,
          u.email AS user_email,
          (
            SELECT COUNT(*)
            FROM ticket_replies tr
            WHERE tr.ticket_id = t.id
          ) AS reply_count
        FROM tickets t
        LEFT JOIN users u ON u.id = t.user_id
        ${where}
        ORDER BY t.updated_at DESC, t.id DESC
      `,
      params
    );

    return NextResponse.json(
      tickets.map((ticket) => ({
        ...ticket,
        status: normalizeTicketStatus(ticket.status),
        replies: [],
      }))
    );
  } catch (error: any) {
    console.error("API Error - GET /api/tickets:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    await ensureTicketTables();

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const category = String(body.category || "Lainnya").trim() || "Lainnya";
    const message = String(body.message || "").trim();

    if (!subject || !message) {
      return NextResponse.json({ error: "Subjek dan pesan wajib diisi" }, { status: 400 });
    }

    const [ticketResult] = await db.query<ResultSetHeader>(
      "INSERT INTO tickets (user_id, subject, category, status) VALUES (?, ?, ?, 'Open')",
      [session.userId, subject, category]
    );

    await db.query(
      "INSERT INTO ticket_replies (ticket_id, sender_id, message) VALUES (?, ?, ?)",
      [ticketResult.insertId, session.userId, message]
    );

    const [tickets] = await db.query<RowDataPacket[]>(
      "SELECT * FROM tickets WHERE id = ? LIMIT 1",
      [ticketResult.insertId]
    );

    return NextResponse.json({
      ...tickets[0],
      status: normalizeTicketStatus(tickets[0]?.status),
      replies: [],
    });
  } catch (error: any) {
    console.error("API Error - POST /api/tickets:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
