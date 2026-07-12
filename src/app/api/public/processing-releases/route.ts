import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function parseArtists(value: any) {
  if (!value) return "";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed
        .map((artist) => {
          if (typeof artist === "string") return artist;
          return artist?.name || artist?.artistName || "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (typeof parsed === "object") return parsed.name || parsed.artistName || "";
    return String(parsed);
  } catch {
    return String(value);
  }
}

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `SELECT id, title, release_type, type, primary_artists, cover_art, planned_release_date, original_release_date, submission_date
       FROM releases
       WHERE status = 'Processing'
       ORDER BY COALESCE(planned_release_date, original_release_date, submission_date) DESC
       LIMIT 12`
    );

    const releases = Array.isArray(rows)
      ? rows.map((row: any) => ({
          id: row.id,
          title: row.title || "Untitled",
          artist: parseArtists(row.primary_artists) || "Unknown Artist",
          type: row.release_type || row.type || "Single",
          coverArt: row.cover_art || "",
          releaseDate: row.planned_release_date || row.original_release_date || row.submission_date || null,
        }))
      : [];

    return NextResponse.json({ releases });
  } catch (error) {
    console.error("API Error - GET /api/public/processing-releases:", error);
    return NextResponse.json({ releases: [] });
  }
}
