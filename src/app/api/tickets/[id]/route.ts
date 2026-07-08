import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";
import { ensureTicketTables, normalizeTicketStatus } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const isStaff = (role: string) => ["Admin", "Operator"].includes(role);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    await ensureTicketTables();

    const [tickets] = await db.query<RowDataPacket[]>(
      `
        SELECT
          t.*,
          COALESCE(NULLIF(u.full_name, ''), NULLIF(u.company_name, ''), u.username, u.email, 'Unknown') AS user_name,
          u.email AS user_email
        FROM tickets t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.id = ?
        LIMIT 1
      `,
      [id]
    );

    const ticket = tickets[0];
    if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    if (!isStaff(session.role) && Number(ticket.user_id) !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [replies] = await db.query<RowDataPacket[]>(
      `
        SELECT
          tr.id,
          tr.message,
          tr.sender_id,
          COALESCE(NULLIF(u.full_name, ''), NULLIF(u.company_name, ''), u.username, u.email, 'Unknown') AS sender_name,
          u.role AS sender_role,
          tr.created_at
        FROM ticket_replies tr
        LEFT JOIN users u ON u.id = tr.sender_id
        WHERE tr.ticket_id = ?
        ORDER BY tr.created_at ASC, tr.id ASC
      `,
      [id]
    );

    return NextResponse.json({
      ...ticket,
      status: normalizeTicketStatus(ticket.status),
      replies,
    });
  } catch (error: any) {
    console.error("API Error - GET /api/tickets/[id]:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
