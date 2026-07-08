import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

const isAdminRole = (role: string) => String(role || "").toLowerCase() === "admin";

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

    if (!isAdminRole(session.role)) {
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

export async function POST(request: Request) {
  const connection = await db.getConnection();

  try {
    const session = await requireUser();
    const formData = await request.formData();

    const title = String(formData.get("title") || "").trim();
    const performer = String(formData.get("performer") || "").trim();
    const writerName = String(formData.get("writer_name") || "").trim();
    const writerRole = String(formData.get("writer_role") || "Composer").trim();
    const writerShare = Number(formData.get("writer_share") || 100);

    if (!title || !performer) {
      return NextResponse.json(
        { message: "Judul lagu dan performer wajib diisi" },
        { status: 400 }
      );
    }

    let writersData: any[] = [];
    const writersRaw = formData.get("writers");
    if (typeof writersRaw === "string" && writersRaw.trim()) {
      try {
        const parsed = JSON.parse(writersRaw);
        writersData = Array.isArray(parsed) ? parsed : [];
      } catch {
        writersData = [];
      }
    }

    if (writersData.length === 0 && writerName) {
      writersData = [
        {
          name: writerName,
          role: writerRole || "Composer",
          share_percent: Number.isFinite(writerShare) ? writerShare : 100,
        },
      ];
    }

    const status = isAdminRole(session.role)
      ? String(formData.get("status") || "accepted")
      : "pending";

    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO songs (
        song_id, title, other_title, authorized_rights, performer,
        duration, genre, language, region, iswc, isrc, note,
        status, user_id, lyrics_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(formData.get("song_id") || "").trim() || null,
        title,
        String(formData.get("other_title") || "").trim(),
        String(formData.get("authorized_rights") || "100").trim(),
        performer,
        Number(formData.get("duration") || 0),
        String(formData.get("genre") || "").trim(),
        String(formData.get("language") || "Indonesia").trim(),
        String(formData.get("region") || "Indonesia").trim(),
        String(formData.get("iswc") || "").trim(),
        String(formData.get("isrc") || "").trim(),
        String(formData.get("note") || "").trim(),
        status,
        session.userId,
        null,
      ]
    );

    const newSongId = result.insertId;

    const writerValues = writersData
      .map((writer) => [
        newSongId,
        String(writer.name || "").trim(),
        Number(writer.share_percent || 0),
        String(writer.role || "Composer").trim(),
      ])
      .filter((writer) => writer[1]);

    if (writerValues.length > 0) {
      await connection.query(
        "INSERT INTO song_writers (song_id, name, share_percent, role) VALUES ?",
        [writerValues]
      );
    }

    await connection.commit();

    return NextResponse.json(
      { message: "Song created", id: newSongId },
      { status: 201 }
    );
  } catch (error: any) {
    await connection.rollback();
    console.error("API Error - POST /api/publishing/songs:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
