import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";


export async function GET(req: Request) {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_value FROM settings WHERE setting_key = ?",
      ["aggregators"]
    );

    let aggregators = [];
    if (rows.length > 0 && rows[0].setting_value) {
      try {
        aggregators = JSON.parse(rows[0].setting_value);
      } catch (e) {
        aggregators = [];
      }
    }

    return NextResponse.json({ aggregators });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/aggregators:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { aggregators } = body;

    if (!Array.isArray(aggregators)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const valueStr = JSON.stringify(aggregators);
    await db.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
      ['aggregators', valueStr, valueStr]
    );

    return NextResponse.json({ message: "Aggregators updated", aggregators });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/aggregators:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
