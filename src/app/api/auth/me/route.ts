import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { findUserById } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Belum login",
        },
        {
          status: 401,
        }
      );
    }

    const user = await findUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User tidak ditemukan",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tidak dapat mengambil session",
      },
      {
        status: 500,
      }
    );
  }
}
