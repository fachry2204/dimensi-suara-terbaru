import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await requireUser();
    
    // Only Admin or Operator can access users
    const role = String(session.role || "").toLowerCase();
    if (role !== "admin" && role !== "operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users] = await db.query(
      `SELECT id, username, email, role, type, company_name, full_name, status, created_at, registered_at, joined_date, account_type, contract_status 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("API Error - GET /api/users:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
