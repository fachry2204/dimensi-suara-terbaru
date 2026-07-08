import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db, withTransaction, PoolConnection } from "@/lib/db";
import fs from "fs";
import pathLib from "path";
import { getReleaseById, deleteRelease } from "@/repositories/release.repository";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await requireUser();
    const release = await getReleaseById(params.id, session.userId, session.role);
    
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    return NextResponse.json(release);
  } catch (error: any) {
    console.error(`API Error - GET /api/releases/${params.id}:`, error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await requireUser();
    
    const release = await getReleaseById(params.id, session.userId, session.role);
    
    if (!release) {
      return NextResponse.json({ error: "Release not found or unauthorized" }, { status: 404 });
    }

    await deleteRelease(params.id);
    
    return NextResponse.json({ success: true, message: "Release deleted" });
  } catch (error: any) {
    console.error(`API Error - DELETE /api/releases/${params.id}:`, error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}


function sanitizeName(name: string) {
    if (!name) return 'Unknown';
    return name.replace(/[<>:"/\\|?*]+/g, '').trim().substring(0, 80);
}

function toDbBoolean(value: any) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return value === true || value === 1 || normalized === '1' || normalized === 'yes' || normalized === 'true' ? 1 : 0;
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const releaseId = params.id;
  try {
    const session = await requireUser();
    
    const existingRelease = await getReleaseById(releaseId, session.userId, session.role);
    if (!existingRelease) {
      return NextResponse.json({ error: "Release not found or unauthorized" }, { status: 404 });
    }

    const formData = await request.formData();
    let dataStr = formData.get('data') as string;
    let data: any = {};
    if (dataStr) {
        try { data = JSON.parse(dataStr); } catch (e) {}
    }
    
    const title = data.title || existingRelease.title;
    const releaseType = data.type === 'ALBUM' ? 'Album' : 'Single';
    const dbReleaseType = data.type || existingRelease.type;
    const version = data.version || existingRelease.version;
    let coverArt = data.coverArt || existingRelease.cover_art;
    const pLine = data.pLine || existingRelease.p_line;
    const cLine = data.cLine || existingRelease.c_line;
    const language = data.language || existingRelease.language;
    const primaryArtists = Array.isArray(data.primaryArtists) ? data.primaryArtists : existingRelease.primaryArtists;
    
    const p = primaryArtists[0];
    const primaryArtistName = (typeof p === 'object' && p !== null && p.name) ? p.name : (p || 'Unknown_Artist');
    const artistDirName = sanitizeName(primaryArtistName);
    const releaseDirName = sanitizeName(`${primaryArtistName} - ${title}`);
    const targetDir = pathLib.join(process.cwd(), 'public', 'uploads', 'releases', artistDirName, releaseDirName);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (coverArt && coverArt.includes('/uploads/releases/temp/')) {
        const absTempPath = pathLib.join(process.cwd(), 'public', coverArt.replace(/^\//, ''));
        if (fs.existsSync(absTempPath)) {
            const ext = pathLib.extname(absTempPath) || '.jpg';
            const newName = `${sanitizeName(primaryArtistName + ' - ' + title)}${ext}`;
            const destPath = pathLib.join(targetDir, newName);
            fs.renameSync(absTempPath, destPath);
            coverArt = `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;
        }
    }

    const plannedReleaseDate = data.plannedReleaseDate || data.planned_release_date || existingRelease.planned_release_date;
    const originalReleaseDate = data.originalReleaseDate || data.original_release_date || existingRelease.original_release_date;
    const preReleaseSocialMedia = data.preReleaseSocialMedia || data.pre_release_social_media || (existingRelease as any).pre_release_social_media;
    const preReleaseYoutubeMusic = data.preReleaseYoutubeMusic || data.pre_release_youtube_music || (existingRelease as any).pre_release_youtube_music;
    const genreId = data.genreId || data.genre_id || (existingRelease as any).genre_id;
    const subgenreId = data.subgenreId || data.subgenre_id || (existingRelease as any).subgenre_id;
    const subGenre = data.subGenre || data.sub_genre || existingRelease.sub_genre;
    
    const upc = data.upc !== undefined ? data.upc : existingRelease.upc;
    const aggregator = data.aggregator !== undefined ? data.aggregator : existingRelease.aggregator;

    await withTransaction(async (conn: PoolConnection) => {
        await conn.execute(
          `UPDATE releases SET 
            title=?, version=?, type=?, release_type=?, cover_art=?, 
            p_line=?, c_line=?, language=?, genre=?, sub_genre=?, primary_artists=?, 
            planned_release_date=?, original_release_date=?, pre_release_social_media=?, pre_release_youtube_music=?, 
            genre_id=?, subgenre_id=?, upc=?, aggregator=?
           WHERE id=?`,
          [
            title, version, releaseType, dbReleaseType, coverArt, 
            pLine, cLine, language, data.genre || existingRelease.genre, subGenre,
            JSON.stringify(primaryArtists),
            plannedReleaseDate, originalReleaseDate, preReleaseSocialMedia, preReleaseYoutubeMusic,
            genreId, subgenreId, upc || null, aggregator || null,
            releaseId
          ]
        );

        let tracks = Array.isArray(data.tracks) ? data.tracks : [];
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
                contributors: data.contributors,
                isrc: data.isrc
            }];
        }
        
        if (tracks.length > 0) {
            await conn.execute("DELETE FROM track_additional_writers WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ?)", [releaseId]).catch(()=>true);
            await conn.execute("DELETE FROM tracks WHERE release_id = ?", [releaseId]);

            for (let i = 0; i < tracks.length; i++) {
                const t = tracks[i];
                let audioFile = t.audioFile || t.tempAudioPath || "";
                let audioClip = t.audioClip || t.tempClipPath || "";
                const trackTitle = t.title || title; 

                const resolveAndRename = async (fileRef: string, type: 'master' | 'clip'): Promise<string> => {
                    if (!fileRef || typeof fileRef !== 'string' || !fileRef.trim()) return fileRef;
                    const isSingle = dbReleaseType === 'SINGLE';
                    const displayName = isSingle ? title : trackTitle;
                    const masterName = sanitizeName(`${primaryArtistName} - ${displayName}`);
                    const clipName   = sanitizeName(`Clip-${primaryArtistName}-${displayName}`);
                    const isUUID = /^[0-9a-f-]{36}$/i.test(fileRef.trim());
                    if (isUUID) {
                        const [uploadRows]: any = await conn.query('SELECT file_path FROM release_uploads WHERE upload_session_id = ?', [fileRef]);
                        if (!uploadRows || uploadRows.length === 0) return fileRef;
                        const existingPath = uploadRows[0].file_path;
                        const absExisting = pathLib.join(process.cwd(), 'public', existingPath.replace(/^\//, ''));
                        if (!fs.existsSync(absExisting)) return fileRef;
                        const ext = pathLib.extname(absExisting) || '.wav';
                        const newName = type === 'master' ? `${masterName}${ext}` : `${clipName}${ext}`;
                        const destPath = pathLib.join(targetDir, newName);
                        fs.renameSync(absExisting, destPath);
                        const newRelPath = `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;
                        await conn.query('UPDATE release_uploads SET file_path = ? WHERE upload_session_id = ?', [newRelPath, fileRef]);
                        return newRelPath;
                    }
                    if (fileRef.includes('/uploads/releases/temp/') || fileRef.includes('/uploads/audio/')) {
                        const absTemp = pathLib.join(process.cwd(), 'public', fileRef.replace(/^\//, ''));
                        if (!fs.existsSync(absTemp)) return fileRef;
                        const ext = pathLib.extname(absTemp) || '.wav';
                        const newName = type === 'master' ? `${masterName}${ext}` : `${clipName}${ext}`;
                        const destPath = pathLib.join(targetDir, newName);
                        fs.renameSync(absTemp, destPath);
                        return `/uploads/releases/${artistDirName}/${releaseDirName}/${newName}`;
                    }
                    return fileRef;
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
                        releaseId, trackTitle, audioFile, audioClip, 
                        toDbBoolean(t.isInstrumental), t.lyricsLanguage || t.language || '', 
                        explicitVal, t.lyrics || '',
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
                if (trackAdditionalWriters.length > 0) {
                    const addWriterValues = trackAdditionalWriters.map((a: any) => [trackId, a.roleId || null, a.roleName || '', a.name || '', a.sequenceNumber || 1]);
                    for (const val of addWriterValues) {
                        await conn.execute(`INSERT INTO track_additional_writers (track_id, role_id, role_name, name, sequence_number) VALUES (?, ?, ?, ?, ?)`, val);
                    }
                }
            }
        }
    });

    return NextResponse.json({ success: true, message: "Release updated successfully" });
  } catch (error: any) {
    console.error("API Error - POST /api/releases/:id:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server", details: error.message }, { status: 500 });
  }
}
