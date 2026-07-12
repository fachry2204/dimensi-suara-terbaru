import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await requireUser();
  const role = String(session.role || "").toLowerCase();
  if (role !== "admin" && role !== "operator") {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return session;
}

export function errorResponse(error: any, fallback = "Terjadi kesalahan pada server") {
  const inferredStatus =
    error?.message === "UNAUTHORIZED" ? 401 :
    error?.message === "ACCOUNT_NOT_APPROVED" ? 403 :
    undefined;
  const status = Number(error?.status || inferredStatus || 500);
  const message = status >= 500 ? fallback : error?.message || fallback;
  if (status >= 500) console.error(error);
  return NextResponse.json({ success: false, message, error: message }, { status });
}

export function paginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
