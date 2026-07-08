import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";
import { ensureTicketTables } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const isStaff = (role: string) => ["Admin", "Operator"].includes(role);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    await ensureTicketTables();

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });

    const [tickets] = await db.query<RowDataPacket[]>(
      "SELECT id, user_id, status FROM tickets WHERE id = ? LIMIT 1",
      [id]
    );

    const ticket = tickets[0];
    if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    if (!isStaff(session.role) && Number(ticket.user_id) !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (String(ticket.status).toLowerCase() === "closed") {
      return NextResponse.json({ error: "Tiket sudah ditutup" }, { status: 400 });
    }

    await db.query(
      "INSERT INTO ticket_replies (ticket_id, sender_id, message) VALUES (?, ?, ?)",
      [id, session.userId, message]
    );

    await db.query("UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?", [
      isStaff(session.role) ? "Pending" : "Open",
      id,
    ]);

    return NextResponse.json({ message: "Balasan berhasil dikirim" });
  } catch (error: any) {
    console.error("API Error - POST /api/tickets/[id]/reply:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
