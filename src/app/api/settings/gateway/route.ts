import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export async function GET(req: Request) {
  try {
    const [smtpRows] = await db.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'smtp_config'");
    const [waRows] = await db.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'wa_config'");
    const [mpwaRows] = await db.query<RowDataPacket[]>("SELECT setting_value FROM settings WHERE setting_key = 'mpwa_config'");

    let smtp = {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      from_email: "",
      from_name: "Dimensi Suara",
    };
    let wa = {
      provider: "fonnte",
      fonnte_token: "",
      fonnte_sender: "",
      mpwa_url: "",
      mpwa_token: "",
      mpwa_device_id: "",
    };

    if (smtpRows.length > 0 && smtpRows[0].setting_value) {
      try {
        smtp = { ...smtp, ...JSON.parse(smtpRows[0].setting_value) };
      } catch (e) {}
    }

    if (waRows.length > 0 && waRows[0].setting_value) {
      try {
        wa = { ...wa, ...JSON.parse(waRows[0].setting_value) };
      } catch (e) {}
    } else if (mpwaRows.length > 0 && mpwaRows[0].setting_value) {
      try {
        const legacyMpwa = JSON.parse(mpwaRows[0].setting_value);
        wa = {
          ...wa,
          provider: "mpwa",
          mpwa_url: legacyMpwa.base_url || legacyMpwa.mpwa_url || "",
          mpwa_token: legacyMpwa.token || legacyMpwa.mpwa_token || "",
          mpwa_device_id: legacyMpwa.device_id || legacyMpwa.mpwa_device_id || "",
        };
      } catch (e) {}
    }

    return NextResponse.json({ smtp, wa, mpwa: wa });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/gateway:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtp, wa, mpwa } = body;

    if (smtp) {
      const smtpStr = JSON.stringify(smtp);
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['smtp_config', smtpStr, smtpStr]
      );
    }
    
    const waData = wa || mpwa;
    if (waData) {
      const waStr = JSON.stringify(waData);
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['wa_config', waStr, waStr]
      );
      await db.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['mpwa_config', waStr, waStr]
      );
    }

    return NextResponse.json({ message: "Gateway settings updated" });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/gateway:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
