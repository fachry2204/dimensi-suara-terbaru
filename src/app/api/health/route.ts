import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.query("SELECT 1");

    return NextResponse.json({
      success: true,
      service: "DimensiSuara API Next.js",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check gagal:", error);

    return NextResponse.json(
      {
        success: false,
        service: "DimensiSuara API Next.js",
        database: "disconnected",
      },
      {
        status: 503,
      }
    );
  }
}
