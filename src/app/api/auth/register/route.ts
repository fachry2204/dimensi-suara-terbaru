import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db, type ResultSetHeader, type RowDataPacket } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const documentPath = z
  .string()
  .trim()
  .regex(/^\/uploads\/profiles\/[A-Za-z0-9._-]+$/, "Lokasi dokumen tidak valid");

const registrationSchema = z.object({
  username: optionalText(255),
  email: z.string().trim().email("Format email tidak valid").max(255),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  accountType: z.enum(["PERSONAL", "COMPANY"]),
  companyName: optionalText(255),
  nik: optionalText(100),
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi").max(255),
  address: optionalText(5000),
  country: optionalText(100),
  province: optionalText(100),
  city: optionalText(100),
  district: optionalText(100),
  subdistrict: optionalText(100),
  postalCode: optionalText(50),
  phone: optionalText(100),
  picName: optionalText(255),
  picPosition: optionalText(255),
  picPhone: optionalText(100),
  bankName: optionalText(150),
  bankAccountNumber: optionalText(150),
  bankAccountName: optionalText(255),
  ktpDocPath: documentPath,
  npwpDocPath: documentPath,
  signatureDocPath: documentPath,
  nibDocPath: documentPath.optional().or(z.literal("")),
  kemenkumhamDocPath: documentPath.optional().or(z.literal("")),
});

function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Data pendaftaran tidak valid";
}

export async function POST(request: Request) {
  try {
    const validation = registrationSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: firstValidationMessage(validation.error) },
        { status: 400 },
      );
    }

    const data = validation.data;
    if (data.accountType === "COMPANY" && (!data.companyName || !data.nibDocPath || !data.kemenkumhamDocPath)) {
      return NextResponse.json(
        { success: false, error: "Nama perusahaan, NIB, dan dokumen Kemenkumham wajib diisi" },
        { status: 400 },
      );
    }

    const email = data.email.toLowerCase();
    const [columnRows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM users");
    const columns = new Set(columnRows.map((row) => String(row.Field)));

    const duplicate: string[] = [];
    const [emailRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1",
      [email, email],
    );
    if (emailRows.length > 0) duplicate.push("EMAIL");

    if (data.phone && columns.has("phone")) {
      const [phoneRows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE phone = ? LIMIT 1", [data.phone]);
      if (phoneRows.length > 0) duplicate.push("PHONE");
    }
    if (data.accountType === "COMPANY" && data.companyName && columns.has("company_name")) {
      const [companyRows] = await db.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE LOWER(company_name) = LOWER(?) LIMIT 1",
        [data.companyName],
      );
      if (companyRows.length > 0) duplicate.push("COMPANY");
    }

    if (duplicate.length > 0) {
      return NextResponse.json(
        { success: false, error: "Data pendaftaran sudah digunakan", duplicate },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const valuesByColumn: Record<string, string | null> = {
      username: data.username.trim().toLowerCase() || email,
      email,
      password_hash: passwordHash,
      password: passwordHash,
      role: "User",
      status: "Pending",
      account_type: data.accountType,
      company_name: data.accountType === "COMPANY" ? data.companyName || null : null,
      nik: data.nik || null,
      full_name: data.fullName,
      address: data.address || null,
      country: data.country || null,
      province: data.province || null,
      city: data.city || null,
      district: data.district || null,
      subdistrict: data.subdistrict || null,
      postal_code: data.postalCode || null,
      phone: data.phone || null,
      pic_name: data.picName || null,
      pic_position: data.picPosition || null,
      pic_phone: data.picPhone || null,
      bank_name: data.bankName || null,
      bank_account_number: data.bankAccountNumber || null,
      bank_account_holder: data.bankAccountName || null,
      bank_account_name: data.bankAccountName || null,
      ktp_doc_path: data.ktpDocPath,
      npwp_doc_path: data.npwpDocPath,
      signature_doc_path: data.signatureDocPath,
      nib_doc_path: data.nibDocPath || null,
      kemenkumham_doc_path: data.kemenkumhamDocPath || null,
    };

    const insertColumns = Object.keys(valuesByColumn).filter((column) => columns.has(column));
    const insertValues = insertColumns.map((column) => valuesByColumn[column]);
    const placeholders = insertColumns.map(() => "?").join(", ");
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO users (${insertColumns.join(", ")}) VALUES (${placeholders})`,
      insertValues,
    );

    return NextResponse.json(
      { success: true, message: "Pendaftaran berhasil dikirim", userId: result.insertId, status: "Pending" },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Registration failed:", error);
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, error: "Email atau data pendaftaran sudah digunakan", duplicate: ["EMAIL"] },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Pendaftaran gagal diproses. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
