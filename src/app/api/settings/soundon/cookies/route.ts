import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { saveCookieSession } from "@/lib/soundon/http-fetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireRole(["Admin", "admin", "Operator", "operator"]);
    const body = await request.json().catch(() => ({}));
    const cookies = String(body.cookies || body.session || "").trim();

    if (!cookies) {
      return NextResponse.json({ error: "Cookie session atau storage-state JSON wajib diisi" }, { status: 400 });
    }

    const result = await saveCookieSession(cookies);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: error.message || "Gagal menyimpan cookie session" }, { status: 500 });
  }
}
