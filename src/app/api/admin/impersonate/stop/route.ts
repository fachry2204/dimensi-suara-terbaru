import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get("dimensi_admin_session")?.value;

  if (!adminToken) {
    return NextResponse.json(
      { success: false, error: "Session admin tidak ditemukan" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: "/admin/users",
  });

  response.cookies.set({
    name: "dimensi_session",
    value: adminToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  response.cookies.set({
    name: "dimensi_admin_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: "dimensi_impersonating",
    value: "",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
