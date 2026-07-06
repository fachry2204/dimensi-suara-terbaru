import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

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
    const chunk = formData.get('chunk') as File;
    
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
      { error: "Terjadi kesalahan pada server saat upload chunk" },
      { status: 500 }
    );
  }
}
