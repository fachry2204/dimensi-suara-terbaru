const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../src/app/api/uploads');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 1. init/route.ts
const initContent = `import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { filePurpose, fileName, fileSize, mimeType, totalChunks } = body;

        const uploadId = crypto.randomUUID();
        
        const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(tempDir, 'meta.json'), JSON.stringify({
            fileName, fileSize, mimeType, totalChunks, filePurpose
        }));

        await db.execute(
            \`INSERT INTO release_uploads (upload_session_id, file_purpose, original_name, mime_type, file_size, status) 
             VALUES (?, ?, ?, ?, ?, 'PENDING')\`,
            [uploadId, filePurpose, fileName, mimeType, fileSize]
        );

        return NextResponse.json({ success: true, uploadId });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
`;

// 2. [uploadId]/chunk/route.ts
const chunkContent = `import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request, { params }: { params: { uploadId: string } }) {
    try {
        const { uploadId } = params;
        const formData = await req.formData();
        const chunkIndex = formData.get('chunkIndex');
        const chunk = formData.get('chunk') as File;

        if (!chunk || chunkIndex === null) {
            return NextResponse.json({ success: false, message: 'Invalid chunk data' }, { status: 400 });
        }

        const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
        if (!fs.existsSync(tempDir)) {
            return NextResponse.json({ success: false, message: 'Upload session not found' }, { status: 404 });
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());
        fs.writeFileSync(path.join(tempDir, \`chunk-\${chunkIndex}\`), buffer);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
`;

// 3. [uploadId]/status/route.ts
const statusContent = `import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: { uploadId: string } }) {
    try {
        const { uploadId } = params;
        const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
        
        if (!fs.existsSync(tempDir)) {
            return NextResponse.json({ success: false, message: 'Upload session not found' }, { status: 404 });
        }

        const files = fs.readdirSync(tempDir);
        const chunks = files.filter(f => f.startsWith('chunk-')).map(f => parseInt(f.replace('chunk-', '')));
        
        return NextResponse.json({ success: true, receivedChunks: chunks });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
`;

// 4. [uploadId]/complete/route.ts
const completeContent = `import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';

ffmpeg.setFfprobePath(ffprobeStatic.path);

export async function POST(req: Request, { params }: { params: { uploadId: string } }) {
    try {
        const { uploadId } = params;
        const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
        
        if (!fs.existsSync(tempDir)) {
            return NextResponse.json({ success: false, message: 'Upload session not found' }, { status: 404 });
        }

        const meta = JSON.parse(fs.readFileSync(path.join(tempDir, 'meta.json'), 'utf-8'));
        const ext = path.extname(meta.fileName) || (meta.mimeType === 'audio/flac' ? '.flac' : '.wav');
        
        const finalDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
        }
        
        const finalFilename = \`\${uploadId}\${ext}\`;
        const finalPath = path.join(finalDir, finalFilename);
        
        const writeStream = fs.createWriteStream(finalPath);
        for (let i = 0; i < meta.totalChunks; i++) {
            const chunkPath = path.join(tempDir, \`chunk-\${i}\`);
            if (!fs.existsSync(chunkPath)) {
                return NextResponse.json({ success: false, message: 'Upload belum selesai.' }, { status: 400 });
            }
            const data = fs.readFileSync(chunkPath);
            writeStream.write(data);
        }
        writeStream.end();

        // Validasi dengan ffprobe
        const probeData: any = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(finalPath, (err, metadata) => {
                if (err) reject(new Error('File audio rusak atau tidak dapat dibaca.'));
                else resolve(metadata);
            });
        });

        const format = probeData.format;
        const stream = probeData.streams.find((s: any) => s.codec_type === 'audio');
        
        if (!stream) {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: 'File audio rusak atau tidak dapat dibaca.' }, { status: 400 });
        }

        const codecName = stream.codec_name;
        if (codecName !== 'pcm_s16le' && codecName !== 'pcm_s24le' && codecName !== 'pcm_s32le' && codecName !== 'flac') {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: 'Format audio harus WAV atau FLAC.' }, { status: 400 });
        }

        const bitDepth = stream.bits_per_raw_sample || stream.bits_per_sample || 16;
        if (bitDepth < 16) {
            fs.unlinkSync(finalPath);
            return NextResponse.json({ success: false, message: 'Bit depth audio minimal 16-bit.' }, { status: 400 });
        }

        const duration = parseFloat(format.duration);
        if (meta.filePurpose === 'SOCIAL_MEDIA_AUDIO') {
            if (duration < 30 || duration > 60) {
                fs.unlinkSync(finalPath);
                return NextResponse.json({ success: false, message: 'Durasi file sosial media harus antara 30 hingga 60 detik.' }, { status: 400 });
            }
        }

        const sampleRate = parseInt(stream.sample_rate);
        
        // Simpan ke DB
        const relativePath = \`/uploads/audio/\${finalFilename}\`;
        await db.execute(
            \`UPDATE release_uploads 
             SET status = 'COMPLETED', file_path = ?, duration_seconds = ?, sample_rate = ?, bit_depth = ?
             WHERE upload_session_id = ?\`,
            [relativePath, Math.round(duration), sampleRate, bitDepth, uploadId]
        );

        // Hapus temp files
        fs.rmSync(tempDir, { recursive: true, force: true });

        return NextResponse.json({ 
            success: true, 
            data: {
                filePath: relativePath,
                duration,
                sampleRate,
                bitDepth,
                format: codecName
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
`;

// 5. [uploadId]/route.ts (DELETE)
const deleteContent = `import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function DELETE(req: Request, { params }: { params: { uploadId: string } }) {
    try {
        const { uploadId } = params;
        
        const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        const [rows]: any = await db.execute('SELECT file_path FROM release_uploads WHERE upload_session_id = ?', [uploadId]);
        if (rows.length > 0 && rows[0].file_path) {
            const finalPath = path.join(process.cwd(), 'public', rows[0].file_path);
            if (fs.existsSync(finalPath)) {
                fs.unlinkSync(finalPath);
            }
        }

        await db.execute('DELETE FROM release_uploads WHERE upload_session_id = ?', [uploadId]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
`;

ensureDir(path.join(basePath, 'init'));
fs.writeFileSync(path.join(basePath, 'init', 'route.ts'), initContent);

ensureDir(path.join(basePath, '[uploadId]', 'chunk'));
fs.writeFileSync(path.join(basePath, '[uploadId]', 'chunk', 'route.ts'), chunkContent);

ensureDir(path.join(basePath, '[uploadId]', 'status'));
fs.writeFileSync(path.join(basePath, '[uploadId]', 'status', 'route.ts'), statusContent);

ensureDir(path.join(basePath, '[uploadId]', 'complete'));
fs.writeFileSync(path.join(basePath, '[uploadId]', 'complete', 'route.ts'), completeContent);

// the delete route is on [uploadId]/route.ts
fs.writeFileSync(path.join(basePath, '[uploadId]', 'route.ts'), deleteContent);

console.log('Upload endpoints generated.');
