import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const [smtpRows] = await db.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'smtp_config'");
    const [mpwaRows] = await db.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'mpwa_config'");

    let smtp = {};
    let mpwa = {};

    if (smtpRows.length > 0 && smtpRows[0].setting_value) {
      try { smtp = JSON.parse(smtpRows[0].setting_value); } catch (e) {}
    }
    
    if (mpwaRows.length > 0 && mpwaRows[0].setting_value) {
      try { mpwa = JSON.parse(mpwaRows[0].setting_value); } catch (e) {}
    }

    return NextResponse.json({ smtp, mpwa });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/gateway:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtp, mpwa } = body;

    if (smtp) {
      const smtpStr = JSON.stringify(smtp);
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['smtp_config', smtpStr, smtpStr]
      );
    }
    
    if (mpwa) {
      const mpwaStr = JSON.stringify(mpwa);
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['mpwa_config', mpwaStr, mpwaStr]
      );
    }

    return NextResponse.json({ message: "Gateway settings updated" });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/gateway:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
