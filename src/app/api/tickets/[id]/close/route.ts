import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";
import { ensureTicketTables } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const isStaff = (role: string) => ["Admin", "Operator"].includes(role);

export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    await ensureTicketTables();

    const [tickets] = await db.query<RowDataPacket[]>(
      "SELECT id, user_id FROM tickets WHERE id = ? LIMIT 1",
      [id]
    );

    const ticket = tickets[0];
    if (!ticket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    if (!isStaff(session.role) && Number(ticket.user_id) !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.query("UPDATE tickets SET status = 'Closed', updated_at = NOW() WHERE id = ?", [id]);

    return NextResponse.json({ message: "Tiket berhasil ditutup" });
  } catch (error: any) {
    console.error("API Error - PUT /api/tickets/[id]/close:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "ACCOUNT_NOT_APPROVED") return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
