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

export async function getReleaseById(
  id: string | number,
  userId: number,
  role: string
): Promise<any | null> {
  let query = "SELECT r.*, u.username AS owner_name, u.full_name AS user_full_name, u.company_name, u.full_name AS ownerDisplayName FROM releases r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?";
  const params: any[] = [id];

  if (role !== "Admin") {
    query += " AND r.user_id = ?";
    params.push(userId);
  }

  const [releases] = await db.query<ReleaseRow[]>(query, params);

  if (releases.length === 0) {
    return null;
  }

  const r = releases[0];

  let tracks = [];
  try {
    const [trackRows] = await db.query<TrackRow[]>(
      `SELECT t.*, 
        ru1.file_path as resolved_audio_file, 
        ru2.file_path as resolved_audio_clip 
       FROM tracks t 
       LEFT JOIN release_uploads ru1 ON t.audio_file = ru1.upload_session_id
       LEFT JOIN release_uploads ru2 ON t.audio_clip = ru2.upload_session_id
       WHERE t.release_id = ? ORDER BY t.track_number ASC`,
      [r.id]
    );

    let additionalWritersMap: Record<number, any[]> = {};
    if (trackRows.length > 0) {
      const trackIds = trackRows.map((tr: any) => tr.id);
      const [addWriterRows]: any = await db.query(
        `SELECT * FROM track_additional_writers WHERE track_id IN (${trackIds.map(() => '?').join(',')}) ORDER BY sequence_number ASC`,
        trackIds
      );
      if (Array.isArray(addWriterRows)) {
        addWriterRows.forEach((row: any) => {
          if (!additionalWritersMap[row.track_id]) {
            additionalWritersMap[row.track_id] = [];
          }
          additionalWritersMap[row.track_id].push({
            id: row.id,
            roleId: row.role_id,
            roleName: row.role_name,
            name: row.name,
            sequenceNumber: row.sequence_number
          });
        });
      }
    }

    tracks = trackRows.map((t: any) => {
      const parseJson = (val: any) => {
        if (!val) return [];
        if (typeof val !== 'string') return val;
        try { return JSON.parse(val); } catch (e) { return []; }
      };

      return {
        ...t,
        primaryArtists: parseJson(t.primary_artists),
        featuredArtists: parseJson(t.featured_artists),
        songwriters: parseJson(t.writer),
        lyricists: parseJson(t.lyricist),
        productionCredits: parseJson(t.producer),
        contributors: parseJson(t.contributors),
        additionalWriters: additionalWritersMap[t.id] || [],
        audioFile: t.resolved_audio_file || t.audio_file,
        audioClip: t.resolved_audio_clip || t.audio_clip,
        trackNumber: t.track_number,
        explicitLyrics: t.explicit_lyrics,
        subGenre: t.sub_genre
      };
    });
  } catch (e) {
    console.error("Failed to fetch tracks", e);
  }

  let parsedArtists = [];
  try {
    parsedArtists =
      typeof r.primary_artists === "string"
        ? JSON.parse(r.primary_artists)
        : r.primary_artists;
  } catch (e) {
    parsedArtists = [r.primary_artists];
  }

  return {
    ...r,
    id: r.id,
    user_id: r.user_id,
    company_name: r.company_name,
    user_full_name: r.user_full_name,
    owner_name: r.owner_name,
    ownerDisplayName: (r as any).ownerDisplayName,
    title: r.title,
    status: r.status,
    cover_art: r.cover_art,
    primaryArtists: parsedArtists,
    release_date: r.planned_release_date || r.original_release_date || r.submission_date,
    submission_date: r.submission_date,
    planned_release_date: r.planned_release_date,
    original_release_date: r.original_release_date,
    upc: r.upc,
    label: r.label,
    version: r.version,
    release_type: r.release_type || r.type,
    aggregator: r.aggregator,
    language: r.language,
    genre: r.genre,
    sub_genre: r.sub_genre,
    p_line: r.p_line,
    c_line: r.c_line,
    rejection_reason: r.rejection_reason,
    rejection_description: r.rejection_description,
    tracks: tracks,
    // Ensure camelCase aliases for frontend
    plannedReleaseDate: r.planned_release_date || null,
    originalReleaseDate: r.original_release_date || null,
    preReleaseSocialMedia: (r as any).pre_release_social_media || null,
    preReleaseYoutubeMusic: (r as any).pre_release_youtube_music || null,
    genreId: (r as any).genre_id || null,
    subgenreId: (r as any).subgenre_id || null,
    subGenre: r.sub_genre || '',
    coverArt: r.cover_art || null,
  };
}

export async function deleteRelease(id: string | number): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM tracks WHERE release_id = ?", [id]);
    await connection.query("DELETE FROM releases WHERE id = ?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
