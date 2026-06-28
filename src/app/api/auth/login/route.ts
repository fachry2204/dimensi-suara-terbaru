import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { createSessionToken } from "@/lib/auth";
import { findUserByEmail } from "@/repositories/user.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const user = await findUserByEmail(validation.data.email.toLowerCase());

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah",
        },
        {
          status: 401,
        }
      );
    }

    const passwordValid = await bcrypt.compare(
      validation.data.password,
      user.password
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah",
        },
        {
          status: 401,
        }
      );
    }

    if (user.status !== "Approved" && user.status !== "Active" && user.status !== "active" && user.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Akun belum disetujui atau sedang dinonaktifkan",
        },
        {
          status: 403,
        }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set({
      name: "dimensi_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    console.error("Login gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server",
      },
      {
        status: 500,
      }
    );
  }
}
