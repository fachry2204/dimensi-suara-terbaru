import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getReleases } from "@/repositories/release.repository";

export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const releases = await getReleases(session.userId, session.role);
    
    return NextResponse.json(releases);
  } catch (error: any) {
    console.error("API Error - GET /api/releases:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (error.message === "ACCOUNT_NOT_APPROVED") {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
