import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const releaseId = params.id;

  try {
    const session = await requireUser();
    const body = await request.json().catch(() => ({}));
    const { status, aggregator, upc, rejectionReason, rejectionDescription, tracks } = body || {};

    const [releases]: any = await db.query("SELECT id FROM releases WHERE id = ?", [releaseId]);
    if (!Array.isArray(releases) || releases.length === 0) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    if (String(session.role).toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [releaseCols]: any = await db.query("SHOW COLUMNS FROM releases");
    const releaseColNames = Array.isArray(releaseCols)
      ? releaseCols.map((col: any) => col.Field)
      : [];
    const setParts: string[] = [];
    const values: any[] = [];

    if (typeof status === "string" && status.trim()) {
      setParts.push("status = ?");
      values.push(status.trim());
    }

    if (releaseColNames.includes("aggregator")) {
      setParts.push("aggregator = ?");
      values.push(aggregator || null);
    }

    if (releaseColNames.includes("upc")) {
      setParts.push("upc = ?");
      values.push(upc || null);
    }

    if (releaseColNames.includes("rejection_reason")) {
      setParts.push("rejection_reason = ?");
      values.push(rejectionReason || null);
    }

    if (releaseColNames.includes("rejection_description")) {
      setParts.push("rejection_description = ?");
      values.push(rejectionDescription || null);
    }

    if (setParts.length > 0) {
      await db.query(`UPDATE releases SET ${setParts.join(", ")} WHERE id = ?`, [
        ...values,
        releaseId,
      ]);
    }

    if (Array.isArray(tracks) && tracks.length > 0) {
      for (const track of tracks) {
        if (!track?.id) continue;
        await db.query("UPDATE tracks SET isrc = ? WHERE id = ? AND release_id = ?", [
          track.isrc || null,
          track.id,
          releaseId,
        ]);
      }
    }

    return NextResponse.json({ success: true, message: "Workflow updated" });
  } catch (error: any) {
    console.error(`API Error - POST /api/releases/${releaseId}/workflow:`, error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server", details: error.message },
      { status: 500 }
    );
  }
}
