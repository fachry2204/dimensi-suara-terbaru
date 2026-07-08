import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        check_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_identifier VARCHAR(255) NULL,
        ip_address VARCHAR(100) NULL,
        country VARCHAR(100) NULL,
        attack_type VARCHAR(100) NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(
      `INSERT INTO system_logs (check_type, status, details) VALUES (?, ?, ?)`,
      ["DB_INTEGRITY_CHECK", "FIXED", JSON.stringify({ action: "Ensured required log tables" })]
    ).catch(() => null);

    return NextResponse.json({
      message: "Database structure checked",
      status: "FIXED",
    });
  } catch (error: any) {
    console.error("API Error - POST /api/settings/system/fix-db:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
