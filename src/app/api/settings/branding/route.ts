import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { requireUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM login_settings WHERE id = 1"
    );

    if (rows.length === 0) {
      return NextResponse.json({
        logo: null,
        favicon_url: null,
        login_background: null,
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
  try {
    await requireUser();

    const formData = await request.formData();
    const uploadDir = path.join(process.cwd(), "public", "uploads", "settings");
    await fs.mkdir(uploadDir, { recursive: true });

    const saveFile = async (field: string) => {
      const file = formData.get(field);
      if (!(file instanceof File) || file.size === 0) return null;

      const ext = path.extname(file.name || "") || ".png";
      const safeName = `${field}-${Date.now()}${ext}`;
      const diskPath = path.join(uploadDir, safeName);
      const bytes = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(diskPath, bytes);
      return `/uploads/settings/${safeName}`;
    };

    const fields = [
      "login_title",
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

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM login_settings WHERE id = 1"
    );

    return NextResponse.json({
      message: "Branding updated",
      branding: rows[0] || null,
    }, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error("API Error - PUT /api/settings/branding:", error);

    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
