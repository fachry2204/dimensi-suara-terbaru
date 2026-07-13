import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
    ensureDirectory,
    ensureReleaseUploadTable,
    getUploadAudioDir,
    isValidUploadId,
    resolveUploadTempDir,
} from "@/lib/release-upload-schema";
import fs from "fs";
import path from "path";
import * as mm from "music-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const formData = await req.formData();
    
    let dataStr = formData.get('data') as string;
    let data: any = {};
    if (dataStr) {
        try { data = JSON.parse(dataStr); } catch (e) {}
    }
    
    const { field, fileId, chunkIndex, totalChunks, filename } = data;
    const releaseUploadId = String(data.uploadId || data.releaseUploadId || "").trim();
    const chunk = formData.get('chunk') as File;

    if (data.releaseUploadMode === true || data.releaseUploadMode === "true") {
        await ensureReleaseUploadTable();

        if (!releaseUploadId || !isValidUploadId(releaseUploadId)) {
            return NextResponse.json({ success: false, message: "Upload session tidak valid." }, { status: 400 });
        }

        if (!chunk || chunkIndex === undefined || totalChunks === undefined) {
            return NextResponse.json({ success: false, message: "Missing chunk data" }, { status: 400 });
        }

        const activeTempDir = resolveUploadTempDir(releaseUploadId);
        if (!fs.existsSync(activeTempDir)) {
            ensureDirectory(activeTempDir);
        }

        const metaPath = path.join(activeTempDir, "meta.json");
        const isFirstChunk = Number(chunkIndex) === 0;

        if (isFirstChunk || !fs.existsSync(metaPath)) {
            fs.writeFileSync(metaPath, JSON.stringify({
                fileName: filename,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                totalChunks,
                filePurpose: data.filePurpose,
            }));

            await db.execute(
                `INSERT INTO release_uploads (upload_session_id, file_purpose, original_name, mime_type, file_size, status)
                 VALUES (?, ?, ?, ?, ?, 'PENDING')
                 ON DUPLICATE KEY UPDATE
                   file_purpose = VALUES(file_purpose),
                   original_name = VALUES(original_name),
                   mime_type = VALUES(mime_type),
                   file_size = VALUES(file_size)`,
                [releaseUploadId, data.filePurpose, filename, data.mimeType, data.fileSize]
            );
        }

        if (!fs.existsSync(activeTempDir)) {
            return NextResponse.json({ success: false, message: "Upload session not found" }, { status: 404 });
        }

        const arrayBuffer = await chunk.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(path.join(activeTempDir, `chunk-${chunkIndex}`), buffer);

        if (Number(chunkIndex) !== Number(totalChunks) - 1) {
            return NextResponse.json({ success: true, done: false, chunkIndex });
        }

        if (!fs.existsSync(metaPath)) {
            return NextResponse.json({ success: false, message: "Metadata upload tidak ditemukan." }, { status: 404 });
        }

        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const ext = path.extname(meta.fileName || filename || "") || (meta.mimeType === "audio/flac" ? ".flac" : ".wav");
        const finalDir = getUploadAudioDir();
        ensureDirectory(finalDir);

        const finalFilename = `${releaseUploadId}${ext}`;
        const finalPath = path.join(finalDir, finalFilename);
        const writeStream = fs.createWriteStream(finalPath);

        for (let i = 0; i < Number(totalChunks); i++) {
            const chunkPath = path.join(activeTempDir, `chunk-${i}`);
            if (!fs.existsSync(chunkPath)) {
                return NextResponse.json({ success: false, message: "Upload belum selesai." }, { status: 400 });
            }
            writeStream.write(fs.readFileSync(chunkPath));
        }

        await new Promise((resolve, reject) => {
            writeStream.on("finish", () => resolve(true));
            writeStream.on("error", reject);
            writeStream.end();
        });

        const metadata = await mm.parseFile(finalPath);
        const format = metadata.format;

        if (!format) {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: "File audio rusak atau tidak dapat dibaca." }, { status: 400 });
        }

        const codecName = (format.container || format.codec || "").toUpperCase();
        if (codecName !== "WAVE" && codecName !== "FLAC") {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: "Format audio harus WAV atau FLAC." }, { status: 400 });
        }

        const bitDepth = format.bitsPerSample || 16;
        if (bitDepth < 16) {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: "Bit depth audio minimal 16-bit." }, { status: 400 });
        }

        const duration = format.duration || 0;
        if (meta.filePurpose === "SOCIAL_MEDIA_AUDIO" && (duration < 30 || duration > 60)) {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: "Durasi file sosial media harus antara 30 hingga 60 detik." }, { status: 400 });
        }

        const sampleRate = format.sampleRate || 44100;
        const relativePath = `/uploads/audio/${finalFilename}`;

        await db.execute(
            `UPDATE release_uploads
             SET status = 'COMPLETED', file_path = ?, duration_seconds = ?, sample_rate = ?, bit_depth = ?
             WHERE upload_session_id = ?`,
            [relativePath, Math.round(duration), sampleRate, bitDepth, releaseUploadId]
        );

        fs.rmSync(activeTempDir, { recursive: true, force: true });

        return NextResponse.json({
            success: true,
            done: true,
            data: {
                filePath: relativePath,
                duration,
                sampleRate,
                bitDepth,
                format: codecName,
            },
        });
    }
    
    if (!chunk || !fileId || chunkIndex === undefined || !totalChunks) {
        return NextResponse.json({ error: "Missing chunk data" }, { status: 400 });
    }

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempDir = path.join(process.cwd(), 'uploads', 'temp', fileId);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, buffer);

    // If this is the last chunk, combine them!
    if (chunkIndex === totalChunks - 1) {
        const ext = path.extname(filename || '');
        const finalFilename = `${fileId}${ext}`;
        const finalPath = path.join(tempDir, finalFilename);
        
        const writeStream = fs.createWriteStream(finalPath);
        for (let i = 0; i < totalChunks; i++) {
            const currentChunkPath = path.join(tempDir, `chunk_${i}`);
            if (fs.existsSync(currentChunkPath)) {
                const chunkBuffer = fs.readFileSync(currentChunkPath);
                writeStream.write(chunkBuffer);
                fs.unlinkSync(currentChunkPath); // clean up chunk
            }
        }
        writeStream.end();

        // Needs to wait for write to finish
        await new Promise((resolve) => writeStream.on('finish', () => resolve(true)));
        
        // Also copy it to public so it's accessible via URL for the frontend
        const publicDir = path.join(process.cwd(), 'public', 'uploads', 'releases', 'temp', session.userId.toString());
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        const publicPath = path.join(publicDir, finalFilename);
        fs.copyFileSync(finalPath, publicPath);

        const relativePath = `/uploads/releases/temp/${session.userId}/${finalFilename}`;

        return NextResponse.json({
            success: true,
            done: true,
            path: relativePath,
            url: relativePath,
            paths: {
                [field || 'file']: relativePath
            }
        });
    }

    // Not the last chunk
    return NextResponse.json({
        success: true,
        done: false,
        chunkIndex
    });

  } catch (error: any) {
    console.error("API Error - POST /api/releases/upload-tmp-chunk:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Terjadi kesalahan pada server saat upload chunk",
        message: error?.message || "Terjadi kesalahan pada server saat upload chunk",
      },
      { status: 500 }
    );
  }
}
