import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();

  if (!phone) {
    return NextResponse.json({ error: "Nomor WhatsApp tujuan wajib diisi" }, { status: 400 });
  }

  const [rows]: any = await db.query(
    "SELECT setting_value FROM settings WHERE setting_key = ?",
    ["mpwa_config"]
  );

  if (!rows.length) {
    return NextResponse.json(
      { error: "MPWA settings belum dikonfigurasi" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: "Konfigurasi MPWA ditemukan. Pengiriman test WhatsApp siap dikembangkan dengan provider.",
  });
}
