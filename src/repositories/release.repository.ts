import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export interface ReleaseRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  version: string;
  release_type: string;
  primary_artists: string;
  cover_art: string;
  label: string;
  p_line: string;
  c_line: string;
  genre: string;
  sub_genre: string;
  language: string;
  upc: string;
  status: string;
  submission_date: string;
  original_release_date: string;
  planned_release_date: string;
  aggregator: string;
  company_name?: string;
  user_full_name?: string;
  owner_name?: string;
  owner?: string;
  created_by?: string;
}

export interface TrackRow extends RowDataPacket {
  id: number;
  release_id: number;
  track_number: number;
  isrc: string;
}

export async function getReleases(
  userId: number,
  role: string
): Promise<any[]> {
  let query = "SELECT r.*, u.username AS owner_name, u.full_name AS user_full_name, u.company_name FROM releases r LEFT JOIN users u ON r.user_id = u.id";
  const params: any[] = [];

  if (role !== "Admin") {
    query += " WHERE r.user_id = ?";
    params.push(userId);
  }

  query += " ORDER BY r.submission_date DESC";

  const [releases] = await db.query<ReleaseRow[]>(query, params);

  let tracksByRelease = new Map<number, any[]>();
  if (releases.length > 0) {
    const releaseIds = releases.map((r) => r.id);
    try {
      const placeholders = releaseIds.map(() => "?").join(",");
      const [trackRows] = await db.query<TrackRow[]>(
        `SELECT id, release_id, track_number, isrc FROM tracks WHERE release_id IN (${placeholders}) ORDER BY release_id, track_number ASC`,
        releaseIds
      );
      trackRows.forEach((t) => {
        if (!tracksByRelease.has(t.release_id)) {
          tracksByRelease.set(t.release_id, []);
        }
        tracksByRelease.get(t.release_id)?.push({
          id: t.id,
          trackNumber: t.track_number,
          isrc: t.isrc,
        });
      });
    } catch (e) {
      tracksByRelease = new Map();
    }
  }

  const processedReleases = releases.map((r) => {
    let parsedArtists = [];
    try {
      parsedArtists =
        typeof r.primary_artists === "string"
          ? JSON.parse(r.primary_artists)
          : r.primary_artists;
    } catch (e) {
      parsedArtists = [r.primary_artists];
    }

    const submissionDate = r.submission_date;
    const plannedReleaseDate = r.planned_release_date;
    const originalReleaseDate = r.original_release_date;

    return {
      id: r.id,
      user_id: r.user_id,
      company_name: r.company_name,
      user_full_name: r.user_full_name,
      owner_name: r.owner_name,
      owner: r.owner,
      created_by: r.created_by,
      title: r.title,
      status: r.status,
      coverArt: r.cover_art,
      primaryArtists: parsedArtists,
      releaseDate: plannedReleaseDate || originalReleaseDate || submissionDate,
      submissionDate,
      plannedReleaseDate,
      originalReleaseDate,
      upc: r.upc,
      label: r.label,
      version: r.version,
      type: r.release_type,
      aggregator: r.aggregator,
      tracks: tracksByRelease.get(r.id) || [],
    };
  });

  return processedReleases;
}
