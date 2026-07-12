import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await params;
    
    // Only Admin or Operator can access user details
    if (session.role !== "Admin" && session.role !== "Operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users]: any = await db.query(
      `SELECT 
        u.id, u.username, u.email, u.role, u.account_type, u.company_name, u.full_name,
        u.nik, u.phone, u.address, u.country, u.province, u.city, u.district, u.subdistrict, u.postal_code,
        u.ktp_doc_path, u.npwp_doc_path, u.signature_doc_path, u.nib_doc_path, u.kemenkumham_doc_path, u.contract_doc_path, u.contract_status,
        u.pic_name, u.pic_position, u.pic_phone,
        COALESCE(u.bank_name, w.bank_name) AS bank_name,
        COALESCE(u.bank_account_number, w.bank_account_number) AS bank_account_number,
        COALESCE(u.bank_account_name, w.bank_account_name) AS bank_account_name,
        u.aggregator_percentage, u.publishing_percentage,
        u.status, u.created_at, NULL AS approved_at, u.rejected_date AS rejected_at, u.rejection_reason, u.block_reason
       FROM users u
       LEFT JOIN (
        SELECT user_id, MAX(bank_name) AS bank_name, MAX(bank_account_number) AS bank_account_number, MAX(bank_account_name) AS bank_account_name
        FROM writers
        GROUP BY user_id
       ) w ON w.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    
    return NextResponse.json(users[0]);
  } catch (error: any) {
    console.error("API Error - GET /api/users/[id]:", error);
    
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const { id } = await params;

    if (session.role !== "Admin" && session.role !== "Operator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, aggregator_percentage, publishing_percentage, rejection_reason, block_reason } = body;

    // Build dynamic SET clause
    const [columns]: any = await db.query("SHOW COLUMNS FROM users");
    const columnNames = Array.isArray(columns) ? columns.map((column: any) => column.Field) : [];
    const fields: string[] = [];
    const values: any[] = [];

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
      if (status === "Approved" && columnNames.includes("approved_at")) {
        fields.push("approved_at = NOW()");
      }
      if (status === "Rejected" && rejection_reason) {
        fields.push("rejection_reason = ?");
        values.push(rejection_reason);
        if (columnNames.includes("rejected_at")) {
          fields.push("rejected_at = NOW()");
        } else if (columnNames.includes("rejected_date")) {
          fields.push("rejected_date = NOW()");
        }
      }
      if (status === "Blocked" && block_reason) {
        fields.push("block_reason = ?");
        values.push(block_reason);
      }
    }
    if (aggregator_percentage !== undefined) {
      fields.push("aggregator_percentage = ?");
      values.push(aggregator_percentage);
    }
    if (publishing_percentage !== undefined) {
      fields.push("publishing_percentage = ?");
      values.push(publishing_percentage);
    }

    const editableColumns = [
      "username",
      "email",
      "account_type",
      "company_name",
      "full_name",
      "nik",
      "phone",
      "address",
      "country",
      "province",
      "city",
      "district",
      "subdistrict",
      "postal_code",
      "pic_name",
      "pic_position",
      "pic_phone",
      "bank_name",
      "bank_account_number",
      "bank_account_name",
      "ktp_doc_path",
      "npwp_doc_path",
      "signature_doc_path",
      "nib_doc_path",
      "kemenkumham_doc_path",
      "contract_doc_path",
      "contract_status",
    ];

    for (const column of editableColumns) {
      if (body[column] !== undefined && columnNames.includes(column)) {
        fields.push(`${column} = ?`);
        const value = typeof body[column] === "string" ? body[column].trim() : body[column];
        values.push(value === "" ? null : value);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    values.push(id);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error - PUT /api/users/[id]:", error);
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
