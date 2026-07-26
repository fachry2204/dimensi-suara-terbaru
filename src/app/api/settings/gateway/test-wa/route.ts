import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || "").trim();
    const customMessage = String(body.message || "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Nomor WhatsApp tujuan (phone) wajib diisi" }, { status: 400 });
    }

    let wa = body.wa;

    if (!wa || (!wa.fonnte_token && !wa.mpwa_token)) {
      const [rows] = await db.query<RowDataPacket[]>(
        "SELECT setting_value FROM settings WHERE setting_key IN ('wa_config', 'mpwa_config')"
      );

      if (!rows.length || !rows[0].setting_value) {
        return NextResponse.json(
          { error: "Konfigurasi WhatsApp Gateway belum disimpan." },
          { status: 400 }
        );
      }

      try {
        wa = JSON.parse(String(rows[0].setting_value));
      } catch (e) {
        return NextResponse.json(
          { error: "Format konfigurasi WhatsApp Gateway tidak valid." },
          { status: 400 }
        );
      }
    }

    const provider = String(wa.provider || "fonnte").toLowerCase();
    const message = customMessage || `Halo, ini adalah pesan tes dari sistem Dimensi Suara CMS. Pengujian gateway WhatsApp (${provider.toUpperCase()}) berhasil!`;

    if (provider === "fonnte") {
      const token = String(wa.fonnte_token || "").trim();
      if (!token) {
        return NextResponse.json({ error: "API Token Fonnte.com belum diisi." }, { status: 400 });
      }

      const formData = new URLSearchParams();
      formData.append("target", phone);
      formData.append("message", message);
      if (wa.fonnte_sender) {
        formData.append("countryCode", "62");
      }

      const resp = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok || resJson.status === false) {
        const errDetail = resJson.reason || resJson.detail || resJson.message || "Gagal mengirim pesan melalui Fonnte.com";
        return NextResponse.json(
          { error: `Fonnte Error: ${errDetail}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: `Pesan WhatsApp berhasil dikirim via Fonnte.com ke ${phone}`,
        details: resJson,
      });
    } else {
      // MPWA Provider
      const baseUrl = String(wa.mpwa_url || "").trim().replace(/\/$/, "");
      const token = String(wa.mpwa_token || "").trim();
      const deviceId = String(wa.mpwa_device_id || "").trim();

      if (!baseUrl) {
        return NextResponse.json({ error: "URL Server MPWA belum diisi." }, { status: 400 });
      }
      if (!token) {
        return NextResponse.json({ error: "API Token MPWA belum diisi." }, { status: 400 });
      }

      const sendUrl = baseUrl.includes("/api/") ? baseUrl : `${baseUrl}/api/send_message`;
      const payload = {
        token,
        api_key: token,
        device_id: deviceId,
        to: phone,
        number: phone,
        target: phone,
        message,
      };

      const resp = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await resp.json().catch(() => ({}));

      if (!resp.ok || resJson.status === false || resJson.error) {
        const errDetail = resJson.error || resJson.message || resJson.detail || `Server HTTP Status ${resp.status}`;
        return NextResponse.json(
          { error: `MPWA Error: ${errDetail}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: `Pesan WhatsApp berhasil dikirim via MPWA ke ${phone}`,
        details: resJson,
      });
    }
  } catch (error: any) {
    console.error("API Error - POST /api/settings/gateway/test-wa:", error);
    return NextResponse.json(
      { error: `Gagal mengirim test WhatsApp: ${error.message || "Gagal koneksi ke server WhatsApp gateway"}` },
      { status: 500 }
    );
  }
}
