import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db, type RowDataPacket } from "@/lib/db";

export const dynamic = "force-dynamic";

const SETTING_KEY = "soundon_config";

type SoundOnConfig = {
  userId?: string;
  password?: string;
  wsEndpoint?: string;
};

async function getSoundOnConfig(): Promise<SoundOnConfig> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1",
    [SETTING_KEY]
  );

  if (!rows[0]?.setting_value) return {};

  try {
    return JSON.parse(rows[0].setting_value);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);
    const config = await getSoundOnConfig();

    return NextResponse.json({
      userId: config.userId || "",
      wsEndpoint: config.wsEndpoint || "",
      userIdOn: Boolean(config.userId),
      passwordOn: Boolean(config.password),
    });
  } catch (error: any) {
    console.error("API Error - GET /api/settings/soundon:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);
    const body = await request.json().catch(() => ({}));
    const current = await getSoundOnConfig();
    const userId = String(body.userId || "").trim();
    const password = String(body.password || "").trim();
    const wsEndpoint = String(body.wsEndpoint || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "User ID SoundOn wajib diisi" }, { status: 400 });
    }

    const nextConfig: SoundOnConfig = {
      userId,
      password: password || current.password || "",
      wsEndpoint: wsEndpoint !== undefined ? wsEndpoint : current.wsEndpoint,
    };

    if (!nextConfig.password) {
      return NextResponse.json({ error: "Password SoundOn wajib diisi" }, { status: 400 });
    }

    const value = JSON.stringify(nextConfig);
    await db.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [SETTING_KEY, value, value]
    );

    return NextResponse.json({
      message: "Setting SoundOn berhasil disimpan",
      userId: nextConfig.userId,
      wsEndpoint: nextConfig.wsEndpoint,
      userIdOn: true,
      passwordOn: true,
    });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/soundon:", error);
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
