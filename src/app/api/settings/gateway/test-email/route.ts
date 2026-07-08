import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const to = String(body.to || "").trim();

  if (!to) {
    return NextResponse.json({ error: "Email tujuan wajib diisi" }, { status: 400 });
  }

  const [rows]: any = await db.query(
    "SELECT setting_value FROM settings WHERE setting_key = ?",
    ["smtp_config"]
  );

  if (!rows.length) {
    return NextResponse.json(
      { error: "SMTP settings belum dikonfigurasi" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: "Konfigurasi SMTP ditemukan. Pengiriman test email siap dikembangkan dengan SMTP provider.",
  });
}
