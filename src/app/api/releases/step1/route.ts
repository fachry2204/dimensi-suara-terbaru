import { NextResponse } from 'next/server';
import { db, withTransaction, PoolConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            releaseId, // if updating an existing draft
            releaseType = 'SINGLE',
            masterUploadId,
            socialMediaUploadId,
            title,
            releaseVersion = 'Original',
            genreId,
            subgenreId,
            isInstrumental = false,
            lyricsLanguage,
            explicitType,
            lyrics,
            primaryArtists = [],
            featuredArtists = [],
            contributors = [],
            productionCredits = [],
            songwriters = [],
            lyricists = [],
            additionalWriters = [],
            recordLabelId = null,
            action = 'DRAFT' // 'DRAFT' or 'CONTINUE'
        } = body;

        // Dummy user id for now, should be from session
        const userId = 1; 

        // Validate basic rules if action === 'CONTINUE'
        if (action === 'CONTINUE') {
            if (!masterUploadId || !socialMediaUploadId) return NextResponse.json({ success: false, message: 'Audio files missing' }, { status: 400 });
            if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
            if (!genreId || !subgenreId) return NextResponse.json({ success: false, message: 'Genre and Subgenre required' }, { status: 400 });
            if (primaryArtists.length === 0) return NextResponse.json({ success: false, message: 'Primary artist is required' }, { status: 400 });
            if (songwriters.length === 0) return NextResponse.json({ success: false, message: 'Songwriter is required' }, { status: 400 });
            if (!isInstrumental && (!lyricsLanguage || !explicitType || !lyrics)) {
                return NextResponse.json({ success: false, message: 'Lyrics info is required for non-instrumental tracks' }, { status: 400 });
            }
        }

        // Validate genre and subgenre relation
        if (genreId && subgenreId) {
            const [subgenres]: any = await db.query(
                `SELECT id FROM subgenres WHERE id = ? AND genre_id = ? AND is_active = 1`,
                [subgenreId, genreId]
            );
            if (subgenres.length === 0) {
                return NextResponse.json({ success: false, message: 'Subgenre tidak sesuai dengan genre' }, { status: 400 });
            }
        }

        // Validate upload files
        if (masterUploadId) {
            const [masterRow]: any = await db.query(
                `SELECT status, file_purpose FROM release_uploads WHERE upload_session_id = ?`,
                [masterUploadId]
            );
            if (masterRow.length === 0 || masterRow[0].status !== 'COMPLETED' || masterRow[0].file_purpose !== 'MASTER_AUDIO') {
                return NextResponse.json({ success: false, message: 'Master audio invalid' }, { status: 400 });
            }
        }
        
        if (socialMediaUploadId) {
            const [socialRow]: any = await db.query(
                `SELECT status, file_purpose FROM release_uploads WHERE upload_session_id = ?`,
                [socialMediaUploadId]
            );
            if (socialRow.length === 0 || socialRow[0].status !== 'COMPLETED' || socialRow[0].file_purpose !== 'SOCIAL_MEDIA_AUDIO') {
                return NextResponse.json({ success: false, message: 'Social media audio invalid' }, { status: 400 });
            }
        }

        const result = await withTransaction(async (conn: PoolConnection) => {
            let finalReleaseId = releaseId;
            let finalTrackId = null;

            // 1. Insert or update release
            if (finalReleaseId) {
                await conn.query(
                    `UPDATE releases SET 
                        title = ?, release_version = ?, genre_id = ?, subgenre_id = ?, record_label_id = ?, status = ?, current_step = 2
                     WHERE id = ? AND user_id = ?`,
                    [title, releaseVersion, genreId || null, subgenreId || null, recordLabelId || null, action === 'CONTINUE' ? 'PENDING' : 'DRAFT', finalReleaseId, userId]
                );
            } else {
                const [insertRelease]: any = await conn.query(
                    `INSERT INTO releases (user_id, release_type, title, release_version, genre_id, subgenre_id, record_label_id, status, current_step)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)`,
                    [userId, releaseType, title, releaseVersion, genreId || null, subgenreId || null, recordLabelId || null, action === 'CONTINUE' ? 'PENDING' : 'DRAFT']
                );
                finalReleaseId = insertRelease.insertId;
            }

            // 2. Insert or update track
            const [existingTrackRows]: any = await conn.query(
                `SELECT id FROM tracks WHERE release_id = ? LIMIT 1`,
                [finalReleaseId]
            );
            
            const isInst = isInstrumental ? 1 : 0;
            const finalLanguage = isInstrumental ? null : lyricsLanguage;
            const finalExplicit = isInstrumental ? null : explicitType;
            const finalLyrics = isInstrumental ? null : lyrics;

            if (existingTrackRows.length > 0) {
                finalTrackId = existingTrackRows[0].id;
                await conn.query(
                    `UPDATE tracks SET 
                        title = ?, is_instrumental = ?, lyrics_language = ?, explicit_type = ?, lyrics = ?
                     WHERE id = ?`,
                    [title, isInst, finalLanguage, finalExplicit, finalLyrics, finalTrackId]
                );
            } else {
                const [insertTrack]: any = await conn.query(
                    `INSERT INTO tracks (release_id, title, is_instrumental, lyrics_language, explicit_type, lyrics)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [finalReleaseId, title, isInst, finalLanguage, finalExplicit, finalLyrics]
                );
                finalTrackId = insertTrack.insertId;
            }

            // 3. Hubungkan dua upload audio
            if (masterUploadId) {
                await conn.query(
                    `UPDATE release_uploads SET release_id = ?, track_id = ? WHERE upload_session_id = ?`,
                    [finalReleaseId, finalTrackId, masterUploadId]
                );
            }
            if (socialMediaUploadId) {
                await conn.query(
                    `UPDATE release_uploads SET release_id = ?, track_id = ? WHERE upload_session_id = ?`,
                    [finalReleaseId, finalTrackId, socialMediaUploadId]
                );
            }

            // Helper function to insert relations
            const insertRelation = async (table: string, columns: string[], valuesList: any[][]) => {
                if (valuesList.length === 0) return;
                const placeholders = valuesList.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
                const flatValues = valuesList.flat();
                await conn.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`, flatValues);
            };

            // 4. Track artists
            await conn.query(`DELETE FROM track_artists WHERE track_id = ?`, [finalTrackId]);
            const artistValues = [
                ...primaryArtists.map((a: any) => [finalTrackId, a.artistId || null, a.name || '', 'PRIMARY', a.sequenceNumber || 1]),
                ...featuredArtists.map((a: any) => [finalTrackId, a.artistId || null, a.name || '', 'FEATURED', a.sequenceNumber || 1])
            ];
            await insertRelation('track_artists', ['track_id', 'artist_id', 'artist_name', 'role', 'sequence_number'], artistValues);

            // 5. Contributors
            await conn.query(`DELETE FROM track_contributors WHERE track_id = ?`, [finalTrackId]);
            const contribValues = contributors.map((c: any) => [finalTrackId, c.roleId || null, c.roleName || '', c.name || '', c.sequenceNumber || 1]);
            await insertRelation('track_contributors', ['track_id', 'role_id', 'role_name', 'name', 'sequence_number'], contribValues);

            // 6. Production credits
            await conn.query(`DELETE FROM track_production_credits WHERE track_id = ?`, [finalTrackId]);
            const prodValues = productionCredits.map((p: any) => [finalTrackId, p.roleId || null, p.roleName || '', p.name || '', p.sequenceNumber || 1]);
            await insertRelation('track_production_credits', ['track_id', 'role_id', 'role_name', 'name', 'sequence_number'], prodValues);

            // 7. Songwriters
            await conn.query(`DELETE FROM track_songwriters WHERE track_id = ?`, [finalTrackId]);
            const songValues = songwriters.map((s: any) => [finalTrackId, s.name || '', s.sequenceNumber || 1]);
            await insertRelation('track_songwriters', ['track_id', 'name', 'sequence_number'], songValues);

            // 8. Lyricists
            await conn.query(`DELETE FROM track_lyricists WHERE track_id = ?`, [finalTrackId]);
            const lyricValues = lyricists.map((l: any) => [finalTrackId, l.name || '', l.sequenceNumber || 1]);
            await insertRelation('track_lyricists', ['track_id', 'name', 'sequence_number'], lyricValues);

            // 9. Additional writers
            await conn.query(`DELETE FROM track_additional_writers WHERE track_id = ?`, [finalTrackId]);
            const addWriterValues = additionalWriters.map((a: any) => [finalTrackId, a.roleId || null, a.roleName || '', a.name || '', a.sequenceNumber || 1]);
            await insertRelation('track_additional_writers', ['track_id', 'role_id', 'role_name', 'name', 'sequence_number'], addWriterValues);

            return { releaseId: finalReleaseId, trackId: finalTrackId };
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error submitting step 1:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
