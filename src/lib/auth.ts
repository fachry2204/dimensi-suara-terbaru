import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const authSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("JWT_SECRET atau AUTH_SECRET wajib diatur");
}

const secretKey = new TextEncoder().encode(authSecret);

export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  status: string;
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    status: payload.status,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secretKey);

  return {
    userId: Number(payload.userId),
    email: String(payload.email),
    role: String(payload.role),
    status: String(payload.status),
  };
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("dimensi_session")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (session.status !== "Approved" && session.status !== "Active" && session.status !== "approved" && session.status !== "active") {
    throw new Error("ACCOUNT_NOT_APPROVED");
  }

  return session;
}

export async function requireRole(
  allowedRoles: string[]
): Promise<SessionPayload> {
  const session = await requireUser();

  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
