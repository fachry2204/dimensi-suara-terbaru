import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { requireUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { findStoredUploadFile, getWritableUploadRoot } from "@/lib/upload-storage";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

interface BrandingFileRow extends RowDataPacket {
  logo: string | null;
  favicon_url: string | null;
  login_background: string | null;
}

async function ensureBrandingColumns() {
  const [systemNameColumns] = await db.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM login_settings LIKE 'system_name'"
  );

  if (systemNameColumns.length === 0) {
    await db.query("ALTER TABLE login_settings ADD COLUMN system_name VARCHAR(255) NULL");
  }
}

export async function GET() {
  try {
    await ensureBrandingColumns();

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM login_settings WHERE id = 1"
    );

    if (rows.length === 0) {
      return NextResponse.json({
        logo: null,
        favicon_url: null,
        login_background: null,
        system_name: "Dimensi Suara",
        login_title: "Agregator & Publishing Musik",
        login_footer: "Protected CMS Area. Authorized personnel only.",
        login_button_color: "linear-gradient(to right, #2563eb, #0891b2)",
        login_form_bg_color: "rgba(255, 255, 255, 0.9)",
        enable_registration: "true",
      }, { headers: noStoreHeaders });
    }

    return NextResponse.json(rows[0], { headers: noStoreHeaders });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/branding:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const newlySavedFiles: string[] = [];
  try {
    await requireUser();
    await ensureBrandingColumns();

    const formData = await request.formData();
    const uploadDir = path.join(getWritableUploadRoot(), "settings");
    await fs.mkdir(uploadDir, { recursive: true });

    const saveFile = async (field: string) => {
      const file = formData.get(field);
      if (!(file instanceof File) || file.size === 0) return null;

      const allowedTypes: Record<string, string> = {
        "image/gif": ".gif",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/svg+xml": ".svg",
        "image/webp": ".webp",
      };
      const requestedExt = path.extname(file.name || "").toLowerCase();
      const allowedExtensions = new Set(Object.values(allowedTypes));
      const ext = allowedTypes[file.type] || (allowedExtensions.has(requestedExt) ? requestedExt : "");
      if (!ext) throw Object.assign(new Error("Format logo tidak didukung. Gunakan PNG, JPG, WEBP, GIF, atau SVG."), { status: 400 });
      if (file.size > 5 * 1024 * 1024) throw Object.assign(new Error("Ukuran logo maksimal 5 MB."), { status: 400 });

      const safeName = `${field}-${Date.now()}-${randomUUID()}${ext}`;
      const diskPath = path.join(uploadDir, safeName);
      const bytes = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(diskPath, bytes);
      newlySavedFiles.push(diskPath);
      return `/uploads/settings/${safeName}`;
    };

    const fields = [
      "login_title",
      "system_name",
      "login_footer",
      "login_button_color",
      "login_form_bg_color",
      "enable_registration",
      "login_title_color",
      "login_footer_color",
      "login_form_bg_opacity",
      "login_bg_opacity",
      "login_glass_effect",
      "login_form_text_color",
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of fields) {
      const value = formData.get(field);
      if (value !== null) {
        updates.push(`${field} = ?`);
        values.push(String(value));
      }
    }

    const [currentRows] = await db.query<BrandingFileRow[]>(
      "SELECT logo, favicon_url, login_background FROM login_settings WHERE id = 1"
    );
    const previousBranding = currentRows[0];

    const logo = await saveFile("logo");
    const favicon = await saveFile("favicon");
    const loginBackground = await saveFile("login_background");

    if (logo) {
      updates.push("logo = ?");
      values.push(logo);
    }

    if (favicon) {
      updates.push("favicon_url = ?");
      values.push(favicon);
    }

    if (loginBackground) {
      updates.push("login_background = ?");
      values.push(loginBackground);
    }

    await db.query("INSERT IGNORE INTO login_settings (id) VALUES (1)");

    if (updates.length > 0) {
      await db.query(`UPDATE login_settings SET ${updates.join(", ")} WHERE id = 1`, values);
    }

    const systemName = formData.get("system_name");
    if (systemName !== null) {
      await db.query(
        "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
        ["system_name", String(systemName)]
      ).catch(() => {});
    }

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM login_settings WHERE id = 1"
    );

    const replacedPaths = [
      logo ? previousBranding?.logo : null,
      favicon ? previousBranding?.favicon_url : null,
      loginBackground ? previousBranding?.login_background : null,
    ].filter(Boolean) as string[];
    for (const storedPath of replacedPaths) {
      const previousFile = await findStoredUploadFile(storedPath);
      if (previousFile && !newlySavedFiles.includes(previousFile.filePath)) {
        await fs.unlink(previousFile.filePath).catch(() => null);
      }
    }

    return NextResponse.json({
      message: "Branding berhasil disimpan.",
      branding: rows[0] || null,
    }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error("API Error - PUT /api/settings/branding:", error);

    for (const filePath of newlySavedFiles) {
      await fs.unlink(filePath).catch(() => null);
    }

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.status === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Logo gagal disimpan. Pastikan direktori upload dapat ditulis oleh server." },
      { status: 500 }
    );
  }
}
