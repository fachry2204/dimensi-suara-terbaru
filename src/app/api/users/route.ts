import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

export async function POST(request: Request) {
  try {
    const session = await requireUser();

    if (String(session.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const role = String(body.role || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!["Admin", "Operator"].includes(role)) {
      return NextResponse.json({ error: "Role harus Admin atau Operator" }, { status: 400 });
    }
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Role, nama, email, dan password wajib diisi" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    const [duplicates]: any = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1",
      [email, email]
    );
    if (Array.isArray(duplicates) && duplicates.length > 0) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result]: any = await db.query(
      `INSERT INTO users (username, email, password_hash, role, status, full_name, created_at)
       VALUES (?, ?, ?, ?, 'Active', ?, NOW())`,
      [email, email, passwordHash, role, name]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: result.insertId,
        username: email,
        email,
        role,
        status: "Active",
        full_name: name,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("API Error - POST /api/users:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
