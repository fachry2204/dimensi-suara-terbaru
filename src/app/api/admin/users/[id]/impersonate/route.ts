import { NextRequest, NextResponse } from "next/server";

import { createSessionToken, requireUser } from "@/lib/auth";
import { findUserById } from "@/repositories/user.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStaffRole(role: string) {
  return ["admin", "operator"].includes(String(role || "").toLowerCase());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();

    if (!isStaffRole(session.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const targetId = Number(id);

    if (!Number.isFinite(targetId)) {
      return NextResponse.json({ success: false, error: "User tidak valid" }, { status: 400 });
    }

    const targetUser = await findUserById(targetId);

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    if (String(targetUser.role || "").toLowerCase() !== "user") {
      return NextResponse.json(
        { success: false, error: "Impersonate hanya tersedia untuk role User" },
        { status: 400 }
      );
    }

    const token = await createSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: "/user/my-releases",
      user: {
        id: targetUser.id,
        name: targetUser.full_name || targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });

    const currentToken = request.cookies.get("dimensi_session")?.value;
    const existingAdminToken = request.cookies.get("dimensi_admin_session")?.value;

    if (currentToken && !existingAdminToken) {
      response.cookies.set({
        name: "dimensi_admin_session",
        value: currentToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    }

    response.cookies.set({
      name: "dimensi_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    response.cookies.set({
      name: "dimensi_impersonating",
      value: "1",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/users/[id]/impersonate gagal:", error);
    return NextResponse.json(
      { success: false, error: "Tidak dapat masuk mode impersonate" },
      { status: 500 }
    );
  }
}
