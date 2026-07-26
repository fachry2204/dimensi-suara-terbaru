import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { DEFAULT_NOTIFICATION_CONFIG } from "@/lib/notification-config";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT setting_value FROM settings WHERE setting_key = 'notification_config'"
    );

    let config = { ...DEFAULT_NOTIFICATION_CONFIG };

    if (rows.length > 0 && rows[0].setting_value) {
      try {
        config = { ...config, ...JSON.parse(rows[0].setting_value) };
      } catch (e) {}
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: "Config data missing" }, { status: 400 });
    }

    const configStr = JSON.stringify(config);
    await db.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
      ["notification_config", configStr, configStr]
    );

    return NextResponse.json({ message: "Notification settings updated successfully" });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
