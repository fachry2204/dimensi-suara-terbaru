import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil",
  });

  const cookieOptions = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set({
    name: "dimensi_session",
    value: "",
    httpOnly: true,
    ...cookieOptions,
  });

  response.cookies.set({
    name: "dimensi_admin_session",
    value: "",
    httpOnly: true,
    ...cookieOptions,
  });

  response.cookies.set({
    name: "dimensi_impersonating",
    value: "",
    httpOnly: false,
    ...cookieOptions,
  });

  return response;
}
