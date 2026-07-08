import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const payload = {
    updatesAvailable: false,
    behindCount: 0,
    localHash: "local",
    remoteHash: "local",
    repo: "local workspace",
    checked_at: new Date().toISOString(),
  };

  await db.query(
    `INSERT INTO system_logs (check_type, status, details) VALUES (?, ?, ?)`,
    ["UPDATE_CHECK", "OK", JSON.stringify(payload)]
  ).catch(() => null);

  return NextResponse.json(payload);
}
