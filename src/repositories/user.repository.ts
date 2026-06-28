import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  created_at: string;
  
}

export async function findUserByEmail(
  email: string
): Promise<UserRow | null> {
  const [rows] = await db.execute<UserRow[]>(
    `
      SELECT
        id,
        username as name,
        email,
        password_hash as password,
        role,
        status,
        created_at FROM users
      WHERE email = ? OR username = ?
      LIMIT 1
    `,
    [email, email]
  );

  return rows[0] ?? null;
}

export async function findUserById(
  userId: number
): Promise<UserRow | null> {
  const [rows] = await db.execute<UserRow[]>(
    `
      SELECT
        id,
        username as name,
        email,
        role,
        status,
        created_at FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
}): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO users (
        username,
        email,
        password_hash,
        role,
        status,
        created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [
      input.name,
      input.email,
      input.passwordHash,
      input.role,
      input.status,
    ]
  );

  return result.insertId;
}
