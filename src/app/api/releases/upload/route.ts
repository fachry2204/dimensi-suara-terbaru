import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const formData = await req.formData();
    
    // Fallback if data is sent as string
    let dataStr = formData.get('data') as string;
    let data = { title: 'Unknown', primaryArtists: [], field: 'file' };
    if (dataStr) {
        try { data = JSON.parse(dataStr); } catch (e) {}
    }
    
    // Determine the field name to look for the file
    // The frontend sends it under `fieldName` (e.g., 'coverArt') and also under 'file'
    const fieldName = data.field || 'file';
    let file = formData.get(fieldName) as File;
    if (!file) file = formData.get('file') as File;
    
    if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create target directory inside public/uploads/releases/temp
    const targetDir = path.join(process.cwd(), 'public', 'uploads', 'releases', 'temp', session.userId.toString());
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate safe filename
    const ext = path.extname(file.name);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const destPath = path.join(targetDir, filename);

    fs.writeFileSync(destPath, buffer);

    // Return the relative path that the frontend can use
    const relativePath = `/uploads/releases/temp/${session.userId}/${filename}`;

    return NextResponse.json({
        success: true,
        path: relativePath,
        url: relativePath,
        paths: {
            [fieldName]: relativePath,
            file: relativePath
        }
    });

  } catch (error: any) {
    console.error("API Error - POST /api/releases/upload:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat upload" },
      { status: 500 }
    );
  }
}
