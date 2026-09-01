import { NextRequest, NextResponse } from "next/server";

import { db, type RowDataPacket } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DuplicateInput = {
  email?: unknown;
  phone?: unknown;
  companyName?: unknown;
  company_name?: unknown;
};

async function findDuplicates(input: DuplicateInput) {
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();
  const companyName = String(input.companyName || input.company_name || "").trim();
  const duplicate: string[] = [];

  const [columnRows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM users");
  const columns = new Set(columnRows.map((row) => String(row.Field)));

  if (email) {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1",
      [email, email],
    );
    if (rows.length > 0) duplicate.push("EMAIL");
  }
  if (phone && columns.has("phone")) {
    const [rows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE phone = ? LIMIT 1", [phone]);
    if (rows.length > 0) duplicate.push("PHONE");
  }
  if (companyName && columns.has("company_name")) {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE LOWER(company_name) = LOWER(?) LIMIT 1",
      [companyName],
    );
    if (rows.length > 0) duplicate.push("COMPANY");
  }

  return NextResponse.json({ success: true, duplicate });
}

export async function POST(request: NextRequest) {
  try {
    return await findDuplicates(await request.json());
  } catch (error) {
    console.error("Duplicate registration check failed:", error);
    return NextResponse.json({ success: false, error: "Pemeriksaan data gagal" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    return await findDuplicates(Object.fromEntries(request.nextUrl.searchParams.entries()));
  } catch (error) {
    console.error("Duplicate registration check failed:", error);
    return NextResponse.json({ success: false, error: "Pemeriksaan data gagal" }, { status: 500 });
  }
}
