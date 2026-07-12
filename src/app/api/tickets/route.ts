import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { db, type ResultSetHeader, type RowDataPacket } from "@/lib/db";
import { ensureTicketTables, normalizeTicketStatus } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const isStaff = (role: string) => ["admin", "operator"].includes(String(role || "").toLowerCase());
const MAX_ATTACHMENT_SIZE = 1024 * 1024;

const isUploadFile = (value: FormDataEntryValue | null): value is File =>
  !!value &&
  typeof value === "object" &&
  "arrayBuffer" in value &&
  "size" in value &&
  "name" in value;

const sanitizeFileName = (name: string) =>
  name
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-") || "ticket-attachment.jpg";

async function saveTicketAttachment(file: File, userId: number | string) {
  const originalName = sanitizeFileName(file.name);
  const isJpegType = ["image/jpeg", "image/jpg"].includes(file.type);
  const isJpegExt = /\.jpe?g$/i.test(originalName);

  if (!isJpegType && !isJpegExt) {
    throw new Error("INVALID_ATTACHMENT_TYPE");
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("ATTACHMENT_TOO_LARGE");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "tickets");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const base = path.basename(originalName, ext);
  const fileName = `${Date.now()}-${userId}-${base}${ext}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/tickets/${fileName}`;
}

async function readTicketPayload(request: Request, role: string, userId: number | string) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const attachmentValue = form.get("attachment");
    const attachment = isUploadFile(attachmentValue) && attachmentValue.size > 0 ? attachmentValue : null;

    if (!attachment && !isStaff(role)) {
      throw new Error("ATTACHMENT_REQUIRED");
    }

    const attachmentPath = attachment ? await saveTicketAttachment(attachment, userId) : "";
    const message = String(form.get("message") || "").trim();
    const releaseTitle = String(form.get("release_title") || "").trim();
    const upc = String(form.get("upc") || "").trim();
    const isrc = String(form.get("isrc") || "").trim();
    const youtubeLink = String(form.get("youtube_link") || "").trim();

    const detailMessage = [
      releaseTitle ? `Judul Release: ${releaseTitle}` : "",
      upc ? `UPC: ${upc}` : "",
      isrc ? `ISRC: ${isrc}` : "",
      youtubeLink ? `Link Youtube: ${youtubeLink}` : "",
      attachmentPath ? `Upload File: ${attachmentPath}` : "",
      "",
      "Isi Ticket:",
      message,
    ]
      .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
      .join("\n")
      .trim();

    return {
      subject: String(form.get("subject") || "").trim(),
      category: String(form.get("category") || "Lainnya").trim() || "Lainnya",
      message: detailMessage,
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    subject: String(body.subject || "").trim(),
    category: String(body.category || "Lainnya").trim() || "Lainnya",
    message: String(body.message || "").trim(),
  };
}

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

    const { subject, category, message } = await readTicketPayload(request, session.role, session.userId);

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
    if (error.message === "ATTACHMENT_REQUIRED") return NextResponse.json({ error: "Upload file JPG/JPEG wajib diisi" }, { status: 400 });
    if (error.message === "INVALID_ATTACHMENT_TYPE") return NextResponse.json({ error: "File wajib JPG atau JPEG" }, { status: 400 });
    if (error.message === "ATTACHMENT_TOO_LARGE") return NextResponse.json({ error: "Ukuran file tidak boleh lebih dari 1MB" }, { status: 400 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
