import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FIELDS = new Set(['ktp', 'npwp', 'nib', 'kemenkumham', 'signature']);
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = String(formData.get('type') || '').trim().toLowerCase();
    const file = formData.get('file');

    if (!ALLOWED_FIELDS.has(type)) {
      return NextResponse.json({ error: 'Jenis dokumen tidak valid' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'File dokumen wajib dipilih' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10 MB' }, { status: 413 });
    }

    const extension = ALLOWED_MIME_TYPES[file.type];
    if (!extension || (type === 'kemenkumham' && file.type !== 'application/pdf')) {
      return NextResponse.json(
        { error: type === 'kemenkumham' ? 'Dokumen Kemenkumham wajib berformat PDF' : 'Format file harus JPG, PNG, WEBP, atau PDF' },
        { status: 415 },
      );
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const filename = `${type}-${Date.now()}-${crypto.randomUUID()}${extension}`;
    const targetPath = path.join(uploadDir, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(targetPath, bytes, { flag: 'wx' });

    return NextResponse.json({
      success: true,
      path: `/uploads/profiles/${filename}`,
    });
  } catch (error: any) {
    console.error('Registration document upload failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengupload dokumen' },
      { status: 500 },
    );
  }
}
