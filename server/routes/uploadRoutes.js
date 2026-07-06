/**
 * uploadRoutes.js
 * Handles chunked file uploads for release wizard (Master Audio & Social Media Audio).
 * 
 * Uses FILE-BASED session storage (JSON on disk) so sessions survive server restarts.
 * 
 * Flow:
 *  1. POST /api/uploads/init         → create upload session, return uploadId
 *  2. POST /api/uploads/:id/chunk    → receive each chunk (multipart)
 *  3. POST /api/uploads/:id/complete → assemble chunks, validate audio
 *  4. DELETE /api/uploads/:id        → cleanup (cancel/remove)
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directories
const TMP_DIR    = path.join(__dirname, '../../uploads/tmp_chunks');
const AUDIO_DIR  = path.join(__dirname, '../../uploads/audio');

// Ensure directories exist at startup
[TMP_DIR, AUDIO_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── File-based session helpers ─────────────────────────────────────────────

function sessionMetaPath(uploadId) {
  return path.join(TMP_DIR, uploadId, 'session.json');
}

function readSession(uploadId) {
  try {
    const p = sessionMetaPath(uploadId);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    // receivedChunks is stored as array, convert to Set
    data.receivedChunks = new Set(data.receivedChunks || []);
    return data;
  } catch {
    return null;
  }
}

function writeSession(session) {
  const p = sessionMetaPath(session.uploadId);
  const toWrite = {
    ...session,
    // Convert Set to Array for JSON serialization
    receivedChunks: [...session.receivedChunks]
  };
  fs.writeFileSync(p, JSON.stringify(toWrite), 'utf8');
}

function deleteSession(uploadId) {
  const dir = path.join(TMP_DIR, uploadId);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// ─── Multer (memory storage for chunks) ─────────────────────────────────────

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB per chunk max
});

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/uploads/init
 */
router.post('/init', express.json(), (req, res) => {
  try {
    const { filePurpose, fileName, fileSize, mimeType, totalChunks } = req.body;

    if (!filePurpose || !fileName || !fileSize || !totalChunks) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: filePurpose, fileName, fileSize, totalChunks'
      });
    }

    if (!['MASTER_AUDIO', 'SOCIAL_MEDIA_AUDIO'].includes(filePurpose)) {
      return res.status(400).json({ success: false, message: 'Invalid filePurpose' });
    }

    const uploadId = uuidv4();
    const sessionDir = path.join(TMP_DIR, uploadId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const session = {
      uploadId,
      filePurpose,
      fileName,
      fileSize: Number(fileSize),
      mimeType: mimeType || 'audio/wav',
      totalChunks: Number(totalChunks),
      receivedChunks: new Set(),
      createdAt: Date.now()
    };

    writeSession(session);

    console.log(`[Upload] Init: ${uploadId} | ${filePurpose} | ${totalChunks} chunks`);
    res.json({ success: true, uploadId });

  } catch (err) {
    console.error('[Upload] Init error:', err);
    res.status(500).json({ success: false, message: 'Failed to initialize upload session' });
  }
});

/**
 * POST /api/uploads/:uploadId/chunk
 */
const handleChunkUpload = chunkUpload.single('chunk');

router.post('/:uploadId/chunk', (req, res) => {
  handleChunkUpload(req, res, (multerErr) => {
    try {
      if (multerErr) {
        console.error('[Upload] Multer error:', multerErr.message);
        return res.status(400).json({ success: false, message: `File upload error: ${multerErr.message}` });
      }

      const { uploadId } = req.params;
      console.log(`[Upload] Chunk received for ${uploadId}, body:`, req.body, 'file:', req.file ? `${req.file.size} bytes` : 'none');

      const session = readSession(uploadId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Upload session not found or expired. Please restart the upload.' });
      }

      const chunkIndex = parseInt(req.body?.chunkIndex, 10);
      if (isNaN(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        return res.status(400).json({ success: false, message: `Invalid chunkIndex: ${req.body?.chunkIndex}` });
      }

      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({ success: false, message: 'No chunk data received in the request' });
      }

      // Write chunk file
      const chunkPath = path.join(TMP_DIR, uploadId, `chunk_${String(chunkIndex).padStart(6, '0')}`);
      fs.writeFileSync(chunkPath, req.file.buffer);

      // Update session
      session.receivedChunks.add(chunkIndex);
      writeSession(session);

      console.log(`[Upload] Chunk ${chunkIndex + 1}/${session.totalChunks} saved for ${uploadId}`);
      res.json({ success: true, chunkIndex, received: session.receivedChunks.size });

    } catch (err) {
      console.error('[Upload] Chunk handler error:', err);
      res.status(500).json({ success: false, message: `Chunk save failed: ${err.message}` });
    }
  });
});

/**
 * POST /api/uploads/:uploadId/complete
 */
router.post('/:uploadId/complete', async (req, res) => {
  const { uploadId } = req.params;
  const session = readSession(uploadId);

  if (!session) {
    return res.status(404).json({ success: false, message: 'Upload session not found or expired' });
  }

  try {
    if (session.receivedChunks.size !== session.totalChunks) {
      return res.status(400).json({
        success: false,
        message: `Missing chunks: received ${session.receivedChunks.size} of ${session.totalChunks}`
      });
    }

    // Assemble
    const ext = path.extname(session.fileName) || '.wav';
    const finalFileName = `${uploadId}${ext}`;
    const finalPath = path.join(AUDIO_DIR, finalFileName);

    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(TMP_DIR, uploadId, `chunk_${String(i).padStart(6, '0')}`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.destroy();
        try { fs.unlinkSync(finalPath); } catch {}
        return res.status(400).json({ success: false, message: `Chunk ${i} missing during assembly` });
      }
      writeStream.write(fs.readFileSync(chunkPath));
    }

    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = fs.statSync(finalPath);
    if (stats.size === 0) {
      try { fs.unlinkSync(finalPath); } catch {}
      return res.status(400).json({ success: false, message: 'Assembled file is empty' });
    }

    // Optional: duration check via ffprobe
    let duration = null;
    try {
      const { execSync } = await import('child_process');
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`,
        { timeout: 10000, encoding: 'utf8' }
      ).trim();
      duration = parseFloat(out);

      if (session.filePurpose === 'SOCIAL_MEDIA_AUDIO' && !isNaN(duration)) {
        if (duration < 30 || duration > 60) {
          try { fs.unlinkSync(finalPath); } catch {}
          deleteSession(uploadId);
          return res.status(422).json({
            success: false,
            message: `Social Media Audio harus berdurasi 30-60 detik. File Anda: ${Math.round(duration)} detik.`
          });
        }
      }
    } catch {
      // ffprobe not available, skip server-side duration check
    }

    // Cleanup temp chunks
    deleteSession(uploadId);

    const fileUrl = `/uploads/audio/${finalFileName}`;
    console.log(`[Upload] Complete: ${uploadId} → ${fileUrl} (${stats.size} bytes)`);

    res.json({
      success: true,
      uploadId,
      data: { uploadId, fileName: finalFileName, fileUrl, fileSize: stats.size, duration }
    });

  } catch (err) {
    console.error('[Upload] Complete error:', err);
    deleteSession(uploadId);
    res.status(500).json({ success: false, message: `Assembly failed: ${err.message}` });
  }
});

/**
 * DELETE /api/uploads/:uploadId
 */
router.delete('/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  deleteSession(uploadId);
  // Also remove assembled file if exists
  try {
    const files = fs.readdirSync(AUDIO_DIR);
    const target = files.find(f => f.startsWith(uploadId));
    if (target) fs.unlinkSync(path.join(AUDIO_DIR, target));
  } catch {}
  res.json({ success: true, message: 'Upload cancelled and cleaned up' });
});

export default router;
