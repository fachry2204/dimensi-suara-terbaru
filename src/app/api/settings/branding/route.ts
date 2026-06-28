import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

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
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("API Error - GET /api/settings/branding:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
