import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, withTransaction, PoolConnection } from "@/lib/db";
import { getReleases } from "@/repositories/release.repository";
import { getWritableUploadsDir } from "@/lib/release-upload-schema";
import fs from "fs";
import path from "path";

function sanitizeName(name: string) {
    if (!name) return 'Unknown';
    return name.replace(/[<>:"/\\|?*]+/g, '').trim().substring(0, 80);
}

function toDbBoolean(value: any) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return value === true || value === 1 || normalized === '1' || normalized === 'yes' || normalized === 'true' ? 1 : 0;
}

export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const releases = await getReleases(session.userId, session.role);
    return NextResponse.json(releases);
  } catch (error: any) {
    console.error("API Error - GET /api/releases:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const formData = await request.formData();
    let dataStr = formData.get('data') as string;
    let data: any = {};
    if (dataStr) {
        try { data = JSON.parse(dataStr); } catch (e) {}
    }
    
    const title = data.title || "Untitled";
    const releaseType = data.type === 'ALBUM' ? 'Album' : 'Single';
    const dbReleaseType = data.type || 'SINGLE';
    const version = data.version || "Original";
    let coverArt = data.coverArt || "";
    const pLine = data.pLine || "Dimensi Suara";
    const cLine = data.cLine || "Dimensi Suara";
    const language = data.language || "Indonesian";
    const primaryArtists = Array.isArray(data.primaryArtists) ? data.primaryArtists : [];
    
    const p = primaryArtists[0];
    const primaryArtistName = (typeof p === 'object' && p !== null && p.name) ? p.name : (p || 'Unknown_Artist');
    const artistDirName = sanitizeName(primaryArtistName);
    const releaseDirName = sanitizeName(`${primaryArtistName} - ${title}`);
    const uploadsDir = getWritableUploadsDir();
    const targetDir = path.join(uploadsDir, 'releases', artistDirName, releaseDirName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Move Cover Art
    if (coverArt && coverArt.includes('/uploads/releases/temp/')) {
        const absTempPath = path.join(uploadsDir, coverArt.replace(/^\/?uploads\//, ''));
        if (fs.existsSync(absTempPath)) {
            const ext = path.extname(absTempPath) || '.jpg';
            const newName = `${sanitizeName(primaryArtistName + ' - ' + title)}${ext}`;
            const destPath = path.join(targetDir, newName);
            fs.renameSync(absTempPath, destPath);
            coverArt = `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;
        }
    }

    const plannedReleaseDate = data.plannedReleaseDate || data.planned_release_date || null;
    const originalReleaseDate = data.originalReleaseDate || data.original_release_date || null;
    const preReleaseSocialMedia = data.preReleaseSocialMedia || data.pre_release_social_media || null;
    const preReleaseYoutubeMusic = data.preReleaseYoutubeMusic || data.pre_release_youtube_music || null;
    const genreId = data.genreId || data.genre_id || null;
    const subgenreId = data.subgenreId || data.subgenre_id || null;
    const subGenre = data.subGenre || data.sub_genre || '';

    const resultData = await withTransaction(async (conn: PoolConnection) => {
        // 1. Insert Release
        const [result]: any = await conn.execute(
          `INSERT INTO releases (user_id, title, version, type, release_type, cover_art, status, submission_date, p_line, c_line, language, genre, sub_genre, primary_artists, planned_release_date, original_release_date, pre_release_social_media, pre_release_youtube_music, genre_id, subgenre_id)
           VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.userId, title, version, releaseType, dbReleaseType, coverArt, 
            pLine, cLine, language, data.genre || '', subGenre,
            JSON.stringify(primaryArtists),
            plannedReleaseDate, originalReleaseDate, preReleaseSocialMedia, preReleaseYoutubeMusic,
            genreId, subgenreId
          ]
        );
        const releaseId = result.insertId;

        // 2. Tracks
        let tracks = Array.isArray(data.tracks) ? data.tracks : [];
        
        // Construct the single track if missing
        if (tracks.length === 0 && (data.type === 'SINGLE' || data.type === 'Single')) {
            tracks = [{
                title: data.title,
                audioFile: data.masterUploadId || "",
                audioClip: data.socialMediaUploadId || "",
                isInstrumental: data.isInstrumental,
                lyricsLanguage: data.lyricsLanguage || data.language,
                explicitType: data.explicitType,
                lyrics: data.lyrics,
                primaryArtists: data.primaryArtists,
                featuredArtists: data.featuredArtists,
                lyricists: data.lyricists,
                songwriters: data.songwriters,
                productionCredits: data.productionCredits,
                contributors: data.contributors
            }];
        }

        for (let i = 0; i < tracks.length; i++) {
            const t = tracks[i];
            let audioFile = t.audioFile || t.tempAudioPath || "";
            let audioClip = t.audioClip || t.tempClipPath || "";
            const trackTitle = t.title || title; // Fallback for single

            // Helper: rename a file to the release folder with correct naming
            const resolveAndRename = async (
                fileRef: string,
                type: 'master' | 'clip'
            ): Promise<string> => {
                if (!fileRef || typeof fileRef !== 'string' || !fileRef.trim()) return fileRef;

                const isSingle = dbReleaseType === 'SINGLE';
                const displayName = isSingle ? title : trackTitle;
                const masterName = sanitizeName(`${primaryArtistName} - ${displayName}`);
                const clipName   = sanitizeName(`Clip-${primaryArtistName}-${displayName}`);

                // Case 1: UUID only (from release_uploads table)
                const isUUID = /^[0-9a-f-]{36}$/i.test(fileRef.trim());
                if (isUUID) {
                    // Look up actual file path from release_uploads
                    const [uploadRows]: any = await conn.query(
                        'SELECT file_path FROM release_uploads WHERE upload_session_id = ?',
                        [fileRef]
                    );
                    if (!uploadRows || uploadRows.length === 0) return fileRef;
                    const existingPath = uploadRows[0].file_path as string; // e.g. /uploads/audio/[uuid].wav
                    const absExisting = path.join(uploadsDir, existingPath.replace(/^\/?uploads\//, ''));
                    if (!fs.existsSync(absExisting)) return fileRef;

                    const ext = path.extname(absExisting) || '.wav';
                    const newName = type === 'master' ? `${masterName}${ext}` : `${clipName}${ext}`;
                    const destPath = path.join(targetDir, newName);
                    fs.renameSync(absExisting, destPath);
                    const newRelPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;

                    // Update release_uploads record
                    await conn.query(
                        'UPDATE release_uploads SET file_path = ? WHERE upload_session_id = ?',
                        [newRelPath, fileRef]
                    );
                    return newRelPath;
                }

                // Case 2: temp path
                if (fileRef.includes('/uploads/releases/temp/') || fileRef.includes('/uploads/audio/')) {
                    const absTemp = path.join(uploadsDir, fileRef.replace(/^\/?uploads\//, ''));
                    if (!fs.existsSync(absTemp)) return fileRef;
                    const ext = path.extname(absTemp) || '.wav';
                    const newName = type === 'master' ? `${masterName}${ext}` : `${clipName}${ext}`;
                    const destPath = path.join(targetDir, newName);
                    fs.renameSync(absTemp, destPath);
                    return `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;
                }

                return fileRef; // Already a final path, keep as-is
            };

            audioFile = await resolveAndRename(audioFile, 'master');
            audioClip = await resolveAndRename(audioClip, 'clip');

            const isSingle = dbReleaseType === 'SINGLE';
            const trackSongwriters = isSingle && (!t.songwriters || t.songwriters.length === 0) ? (data.songwriters || []) : (t.songwriters || []);
            const trackLyricists = isSingle && (!t.lyricists || t.lyricists.length === 0) ? (data.lyricists || []) : (t.lyricists || []);
            const trackProductionCredits = isSingle && (!t.productionCredits || t.productionCredits.length === 0) ? (data.productionCredits || []) : (t.productionCredits || []);
            const trackContributors = isSingle && (!t.contributors || t.contributors.length === 0) ? (data.contributors || []) : (t.contributors || []);
            const trackAdditionalWriters = isSingle && (!t.additionalWriters || t.additionalWriters.length === 0) ? (data.additionalWriters || []) : (t.additionalWriters || []);

            const rawExplicit = t.explicitType || t.explicitLyrics || data.explicitType;
            const explicitVal = (rawExplicit === 'YES' || rawExplicit === 'Yes' || rawExplicit === true || rawExplicit === 1) ? 1 : 0;
            
            const [trackResult]: any = await conn.execute(
                `INSERT INTO tracks (release_id, title, audio_file, audio_clip, is_instrumental, language, explicit_lyrics, lyrics, primary_artists, featured_artists, lyricist, writer, producer, contributors, track_number, isrc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    releaseId, 
                    trackTitle, 
                    audioFile, 
                    audioClip, 
                    toDbBoolean(t.isInstrumental), 
                    t.lyricsLanguage || t.language || '', 
                    explicitVal, 
                    t.lyrics || '',
                    JSON.stringify(Array.isArray(t.primaryArtists) && t.primaryArtists.length > 0 ? t.primaryArtists : primaryArtists),
                    JSON.stringify(t.featuredArtists || []),
                    JSON.stringify(trackLyricists),
                    JSON.stringify(trackSongwriters),
                    JSON.stringify(trackProductionCredits),
                    JSON.stringify(trackContributors),
                    String(i + 1),
                    t.isrc || null
                ]
            );

            const trackId = trackResult.insertId;

            // Save additional writers if present
            if (trackAdditionalWriters.length > 0) {
                const addWriterValues = trackAdditionalWriters.map((a: any) => [trackId, a.roleId || null, a.roleName || '', a.name || '', a.sequenceNumber || 1]);
                for (const val of addWriterValues) {
                    await conn.execute(
                        `INSERT INTO track_additional_writers (track_id, role_id, role_name, name, sequence_number) VALUES (?, ?, ?, ?, ?)`,
                        val
                    );
                }
            }
        }

        return { releaseId };
    });

    return NextResponse.json({ success: true, id: resultData.releaseId });
  } catch (error: any) {
    console.error("API Error - POST /api/releases:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server", details: error.message }, { status: 500 });
  }
}
