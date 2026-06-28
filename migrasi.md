Mengubah aplikasi menjadi aplikasi fullstack dengan arsitektur:

```text
Frontend  : Next.js App Router
Backend   : Next.js Route Handlers
Database  : MySQL
DB Driver : mysql2/promise
Bahasa    : TypeScript
UI        : Tailwind CSS
Runtime   : Node.js
```

Target akhir:

```text
Vite React + React Router + Express
                    ↓
        Next.js Fullstack
                    ↓
 App Router + Route Handlers + MySQL
                    ↓
             mysql2/promise
```

---

# 1. Kondisi Repository Saat Ini

Berdasarkan struktur repository, aplikasi saat ini masih menggunakan:

| Bagian | Teknologi Saat Ini | Target Migrasi |
|---|---|---|
| Frontend | React + Vite | Next.js App Router |
| Routing frontend | React Router DOM | Next.js File-Based Routing |
| Backend | Express.js | Next.js Route Handlers |
| Database | MySQL | MySQL |
| Driver database | mysql2/promise | mysql2/promise |
| Autentikasi | JWT, cookie, localStorage | HttpOnly Cookie |
| Upload file | Multer dan chunk upload | Next.js Node Route Handler |
| Audio processing | FFmpeg dan FFprobe | Tetap digunakan |
| Deployment | Express + Vite Build | Next.js Node Server |

Backend Express saat ini sudah dipisahkan menjadi beberapa modul, seperti:

```text
Auth
Releases
Reports
Publishing
Settings
Users
Tickets
Notifications
Admin
Webhook
Spotify
```

Struktur endpoint `/api/*` tersebut sebaiknya tetap dipertahankan setelah migrasi agar frontend tidak perlu diubah sekaligus.

---

# 2. Hal yang Bisa Dipertahankan

## 2.1 Database MySQL

Database tidak perlu diganti. Schema, tabel, relasi, dan sebagian besar query SQL lama masih dapat digunakan.

## 2.2 mysql2/promise

Repository sudah menggunakan `mysql2/promise`, sehingga driver database tidak perlu diganti.

Contoh konfigurasi lama:

```js
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

Konfigurasi tersebut nantinya dipindahkan menjadi:

```text
src/lib/db.ts
```

## 2.3 Parameterized Query

Query yang memakai placeholder seperti berikut harus dipertahankan:

```sql
SELECT id FROM users WHERE email = ?
```

Parameterized query membantu mengurangi risiko SQL Injection.

## 2.4 FFmpeg dan FFprobe

Fitur pemrosesan audio dapat tetap digunakan melalui Node.js runtime pada Next.js.

Fitur yang dapat dipertahankan:

- Membaca metadata audio
- Validasi WAV
- Mengambil sample rate
- Membaca bit depth
- Membuat preview audio
- Memotong audio
- Mengubah format audio
- Membaca durasi audio

---

# 3. Temuan Keamanan Kritis

## 3.1 Kredensial Database

Pastikan file `.env.example` tidak mengandung data produksi.

Data berikut tidak boleh dimasukkan ke Git:

```env
DB_HOST=host_database_produksi
DB_USER=user_database_produksi
DB_PASSWORD=password_database_produksi
JWT_SECRET=secret_produksi
```

Format `.env.example` yang aman:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

AUTH_SECRET=replace_with_random_secret
UPLOAD_ROOT=/var/www/vhosts/example.com/private/uploads
NEXT_PUBLIC_APP_URL=https://cms.example.com
```

Tindakan yang disarankan:

1. Ganti password database.
2. Buat `AUTH_SECRET` baru.
3. Hapus kredensial asli dari repository.
4. Bersihkan kredensial dari riwayat Git.
5. Batasi akses user MySQL hanya dari server aplikasi.
6. Masukkan `.env` dan `.env.local` ke `.gitignore`.

Contoh `.gitignore`:

```gitignore
.env
.env.local
.env.production
.env.development
.env.*.local

node_modules
.next
dist
uploads
storage
*.log
```

---

## 3.2 Jangan Gunakan JWT Secret Default

Hindari pola:

```js
const secret = process.env.JWT_SECRET || "supersecretkey123";
```

Gunakan validasi:

```ts
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET wajib diatur");
}
```

Aplikasi harus gagal berjalan jika secret belum disiapkan.

---

## 3.3 Jangan Simpan Token di localStorage

Hindari:

```ts
localStorage.setItem("token", token);
```

Risiko utama:

- Token dapat dicuri melalui XSS.
- Token impersonation admin dapat terekspos.
- Token tetap tersimpan meski browser ditutup.
- Sulit mengendalikan session dari server.

Gunakan cookie:

```text
HttpOnly
Secure
SameSite=Lax
Path=/
```

Frontend cukup mengambil user aktif melalui:

```text
GET /api/auth/me
```

---

## 3.4 Jangan Kirim Detail SQL ke Browser

Hindari:

```js
return res.status(500).json({
  error: err.message,
  sqlMessage: err.sqlMessage,
});
```

Gunakan:

```ts
console.error(error);

return Response.json(
  {
    success: false,
    error: "Terjadi kesalahan pada server",
  },
  {
    status: 500,
  }
);
```

---

## 3.5 Hilangkan Pemeriksaan SHOW COLUMNS dari Request

Hindari menjalankan query seperti:

```sql
SHOW COLUMNS FROM users
```

pada setiap request.

Gunakan sistem migration database agar seluruh server memiliki schema yang sama.

---

# 4. Struktur Folder Next.js yang Direkomendasikan

```text
DimensiSuaraNEW/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   │
│   │   ├── (public)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── user-status/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── releases/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── artists/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx
│   │   │   │   └── payments/
│   │   │   │       └── page.tsx
│   │   │   ├── publishing/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── songs/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── contracts/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── users/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── contracts/
│   │   │   │   └── page.tsx
│   │   │   ├── statistics/
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts
│   │       ├── auth/
│   │       ├── releases/
│   │       ├── uploads/
│   │       ├── reports/
│   │       ├── publishing/
│   │       ├── settings/
│   │       ├── users/
│   │       ├── tickets/
│   │       ├── notifications/
│   │       ├── admin/
│   │       ├── webhook/
│   │       ├── spotify/
│   │       └── wilayah/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── dashboard-sidebar.tsx
│   │   │   ├── dashboard-header.tsx
│   │   │   └── mobile-navigation.tsx
│   │   ├── ui/
│   │   ├── forms/
│   │   └── shared/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── releases/
│   │   ├── uploads/
│   │   ├── reports/
│   │   ├── publishing/
│   │   ├── tickets/
│   │   └── users/
│   │
│   ├── lib/
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   ├── permissions.ts
│   │   ├── response.ts
│   │   ├── validation.ts
│   │   ├── upload.ts
│   │   └── logger.ts
│   │
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── release.repository.ts
│   │   ├── report.repository.ts
│   │   ├── publishing.repository.ts
│   │   └── ticket.repository.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── release.service.ts
│   │   ├── upload.service.ts
│   │   ├── ffmpeg.service.ts
│   │   ├── report.service.ts
│   │   └── notification.service.ts
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts
│   │   ├── release.schema.ts
│   │   ├── ticket.schema.ts
│   │   └── user.schema.ts
│   │
│   └── types/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── migrate.ts
│   └── seed.ts
│
├── scripts/
├── public/
├── storage/
│   └── .gitkeep
├── next.config.ts
├── package.json
├── tsconfig.json
├── middleware.ts
├── .env.example
└── README.md
```

---

# 5. Konfigurasi mysql2/promise

Buat file:

```text
src/lib/db.ts
```

Isi:

```ts
import "server-only";

import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

declare global {
  var mysqlPool: Pool | undefined;
}

function validateDatabaseEnvironment(): void {
  const requiredVariables = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
  ] as const;

  for (const variable of requiredVariables) {
    if (!process.env[variable]) {
      throw new Error(`Environment variable ${variable} belum diatur`);
    }
  }
}

function createDatabasePool(): Pool {
  validateDatabaseEnvironment();

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    charset: "utf8mb4",
    timezone: "+00:00",
    decimalNumbers: true,
    dateStrings: true,
  });
}

export const db: Pool =
  global.mysqlPool ?? createDatabasePool();

if (process.env.NODE_ENV !== "production") {
  global.mysqlPool = db;
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
};
```

---

# 6. Validasi Environment Variable

Buat:

```text
src/lib/env.ts
```

```ts
import "server-only";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  AUTH_SECRET: z.string().min(32),

  UPLOAD_ROOT: z.string().min(1),

  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error(
    "Environment variable tidak valid:",
    parsedEnvironment.error.flatten().fieldErrors
  );

  throw new Error("Konfigurasi environment tidak valid");
}

export const env = parsedEnvironment.data;
```

---

# 7. Contoh Repository Pattern

Buat:

```text
src/repositories/user.repository.ts
```

```ts
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function findUserByEmail(
  email: string
): Promise<UserRow | null> {
  const [rows] = await db.execute<UserRow[]>(
    `
      SELECT
        id,
        name,
        email,
        password,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
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
        name,
        email,
        password,
        role,
        status,
        created_at,
        updated_at
      FROM users
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
        name,
        email,
        password,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
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
```

---

# 8. Contoh Route Handler

## 8.1 Health Check

Buat:

```text
src/app/api/health/route.ts
```

```ts
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.query("SELECT 1");

    return NextResponse.json({
      success: true,
      service: "DimensiSuara API",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check gagal:", error);

    return NextResponse.json(
      {
        success: false,
        service: "DimensiSuara API",
        database: "disconnected",
      },
      {
        status: 503,
      }
    );
  }
}
```

## 8.2 Daftar Releases

Buat:

```text
src/app/api/releases/route.ts
```

```ts
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReleaseRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  release_type: string;
  status: string;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const session = await requireUser();

    const parameters: Array<string | number> = [];

    let query = `
      SELECT
        id,
        user_id,
        title,
        release_type,
        status,
        release_date,
        created_at,
        updated_at
      FROM releases
    `;

    if (session.role !== "Admin") {
      query += " WHERE user_id = ?";
      parameters.push(session.userId);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await db.execute<ReleaseRow[]>(
      query,
      parameters
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/releases gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tidak dapat mengambil data rilisan",
      },
      {
        status: 500,
      }
    );
  }
}
```

## 8.3 Detail Release

Buat:

```text
src/app/api/releases/[id]/route.ts
```

```ts
import { NextRequest, NextResponse } from "next/server";
import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReleaseRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  release_type: string;
  status: string;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireUser();
    const { id } = await context.params;

    const releaseId = Number(id);

    if (!Number.isInteger(releaseId) || releaseId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID rilisan tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const parameters: number[] = [releaseId];

    let query = `
      SELECT
        id,
        user_id,
        title,
        release_type,
        status,
        release_date,
        created_at,
        updated_at
      FROM releases
      WHERE id = ?
    `;

    if (session.role !== "Admin") {
      query += " AND user_id = ?";
      parameters.push(session.userId);
    }

    query += " LIMIT 1";

    const [rows] = await db.execute<ReleaseRow[]>(
      query,
      parameters
    );

    const release = rows[0];

    if (!release) {
      return NextResponse.json(
        {
          success: false,
          error: "Rilisan tidak ditemukan",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: release,
    });
  } catch (error) {
    console.error("GET release detail gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tidak dapat mengambil detail rilisan",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireUser();
    const { id } = await context.params;

    const releaseId = Number(id);

    if (!Number.isInteger(releaseId) || releaseId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID rilisan tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const parameters: number[] = [releaseId];

    let query = `
      DELETE FROM releases
      WHERE id = ?
    `;

    if (session.role !== "Admin") {
      query += " AND user_id = ?";
      parameters.push(session.userId);
    }

    const [result] = await db.execute<ResultSetHeader>(
      query,
      parameters
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Rilisan tidak ditemukan atau tidak memiliki akses",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rilisan berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE release gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tidak dapat menghapus rilisan",
      },
      {
        status: 500,
      }
    );
  }
}
```

---

# 9. Autentikasi dengan HttpOnly Cookie

Gunakan library:

```bash
npm install jose bcryptjs
```

Buat:

```text
src/lib/auth.ts
```

```ts
import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET wajib diatur");
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

export async function getCurrentSession():
  Promise<SessionPayload | null> {
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

export async function requireUser():
  Promise<SessionPayload> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (session.status !== "Approved") {
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
```

---

# 10. Contoh Login API

Buat:

```text
src/app/api/auth/login/route.ts
```

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  createSessionToken,
} from "@/lib/auth";
import {
  findUserByEmail,
} from "@/repositories/user.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const user = await findUserByEmail(
      validation.data.email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah",
        },
        {
          status: 401,
        }
      );
    }

    const passwordValid = await bcrypt.compare(
      validation.data.password,
      user.password
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Email atau password salah",
        },
        {
          status: 401,
        }
      );
    }

    if (user.status !== "Approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Akun belum disetujui atau sedang dinonaktifkan",
        },
        {
          status: 403,
        }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set({
      name: "dimensi_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server",
      },
      {
        status: 500,
      }
    );
  }
}
```

---

# 11. Contoh Logout API

Buat:

```text
src/app/api/auth/logout/route.ts
```

```ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil",
  });

  response.cookies.set({
    name: "dimensi_session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
```

---

# 12. Endpoint User Aktif

Buat:

```text
src/app/api/auth/me/route.ts
```

```ts
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { findUserById } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Belum login",
        },
        {
          status: 401,
        }
      );
    }

    const user = await findUserById(session.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User tidak ditemukan",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me gagal:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tidak dapat mengambil session",
      },
      {
        status: 500,
      }
    );
  }
}
```

---

# 13. Mapping React Router ke Next.js

| Route Lama | Route Next.js |
|---|---|
| `/login` | `app/(public)/login/page.tsx` |
| `/register` | `app/(public)/register/page.tsx` |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` |
| `/releases` | `app/(dashboard)/releases/page.tsx` |
| `/releases/:id` | `app/(dashboard)/releases/[id]/page.tsx` |
| `/new-release` | `app/(dashboard)/releases/new/page.tsx` |
| `/artists` | `app/(dashboard)/artists/page.tsx` |
| `/artists/:id` | `app/(dashboard)/artists/[id]/page.tsx` |
| `/users` | `app/(dashboard)/users/page.tsx` |
| `/users/:id` | `app/(dashboard)/users/[id]/page.tsx` |
| `/tickets` | `app/(dashboard)/tickets/page.tsx` |
| `/tickets/:id` | `app/(dashboard)/tickets/[id]/page.tsx` |
| `/reports` | `app/(dashboard)/reports/page.tsx` |
| `/publishing` | `app/(dashboard)/publishing/page.tsx` |
| `/settings` | `app/(dashboard)/settings/page.tsx` |

---

# 14. Pemecahan App.tsx

Jangan memindahkan seluruh `App.tsx` menjadi satu file `page.tsx`.

Pecah menjadi beberapa bagian:

```text
src/app/(dashboard)/layout.tsx
src/components/layout/dashboard-sidebar.tsx
src/components/layout/dashboard-header.tsx
src/features/auth/auth-provider.tsx
src/features/notifications/notification-provider.tsx
src/features/releases/release-form.tsx
src/features/releases/release-table.tsx
src/features/reports/report-table.tsx
src/features/tickets/ticket-board.tsx
```

Gunakan Server Component untuk:

- Mengambil data dashboard
- Mengambil daftar rilisan
- Mengambil detail pengguna
- Mengambil laporan
- Membaca statistik
- Membaca konfigurasi

Gunakan Client Component untuk:

- Form
- Modal
- Drag-and-drop
- Audio player
- Upload progress
- Grafik
- Dropdown
- Filter interaktif
- Sidebar mobile

---

# 15. Strategi API

Pertahankan pola URL lama:

```text
/api/auth/*
/api/releases/*
/api/reports/*
/api/publishing/*
/api/settings/*
/api/users/*
/api/tickets/*
/api/notifications/*
/api/admin/*
/api/webhook/*
/api/spotify/*
```

Contoh mapping:

```text
server/routes/authRoutes.js
↓
src/app/api/auth/*/route.ts
```

```text
server/routes/releaseRoutes.js
↓
src/app/api/releases/*/route.ts
```

```text
server/routes/reportRoutes.js
↓
src/app/api/reports/*/route.ts
```

```text
server/routes/publishingRoutes.js
↓
src/app/api/publishing/*/route.ts
```

---

# 16. Upload Audio Besar

Upload audio besar tidak boleh hanya menggunakan:

```ts
const formData = await request.formData();
```

untuk file beberapa GB.

Gunakan chunk upload:

```text
POST   /api/uploads/init
POST   /api/uploads/chunk
POST   /api/uploads/complete
GET    /api/uploads/[id]
DELETE /api/uploads/[id]
```

## 16.1 Tabel Upload Session

```sql
CREATE TABLE upload_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  release_id BIGINT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100) NULL,
  total_size BIGINT NOT NULL,
  uploaded_size BIGINT NOT NULL DEFAULT 0,
  chunk_size INT NOT NULL,
  total_chunks INT NOT NULL,
  uploaded_chunks INT NOT NULL DEFAULT 0,
  checksum VARCHAR(128) NULL,
  status ENUM(
    'pending',
    'uploading',
    'processing',
    'completed',
    'failed',
    'cancelled'
  ) NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_upload_user_id (user_id),
  INDEX idx_upload_release_id (release_id),
  INDEX idx_upload_status (status),
  INDEX idx_upload_expires_at (expires_at)
);
```

## 16.2 Struktur Penyimpanan

Jangan simpan file upload di dalam `.next`.

Gunakan:

```text
/var/www/vhosts/cms.dimensisuara.id/private/uploads/
├── tmp/
├── chunks/
├── releases/
│   ├── audio/
│   ├── covers/
│   └── previews/
├── contracts/
├── documents/
├── reports/
└── invoices/
```

Set environment:

```env
UPLOAD_ROOT=/var/www/vhosts/cms.dimensisuara.id/private/uploads
```

## 16.3 Alur Chunk Upload

```text
1. Frontend mengirim nama, ukuran, tipe file.
2. Server membuat upload session.
3. Frontend mengirim file per chunk.
4. Server menyimpan chunk sementara.
5. Server mencatat chunk yang sudah masuk.
6. Setelah lengkap, server menggabungkan chunk.
7. Server menjalankan FFprobe.
8. Server memvalidasi WAV.
9. Server memindahkan file ke folder release.
10. Server mengubah status upload menjadi completed.
```

---

# 17. FFmpeg Service

Buat:

```text
src/services/ffmpeg.service.ts
```

Contoh:

```ts
import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  codecName: string;
  bitRate: number | null;
  bitsPerSample: number | null;
}

export async function probeAudio(
  filePath: string
): Promise<AudioMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    [
      "stream=codec_name,sample_rate,channels,bit_rate,bits_per_sample",
      "format=duration",
    ].join(":"),
    "-of",
    "json",
    filePath,
  ]);

  const result = JSON.parse(stdout);

  const stream = result.streams?.[0];
  const format = result.format;

  if (!stream) {
    throw new Error("Audio stream tidak ditemukan");
  }

  return {
    duration: Number(format?.duration ?? 0),
    sampleRate: Number(stream.sample_rate ?? 0),
    channels: Number(stream.channels ?? 0),
    codecName: String(stream.codec_name ?? ""),
    bitRate: stream.bit_rate
      ? Number(stream.bit_rate)
      : null,
    bitsPerSample: stream.bits_per_sample
      ? Number(stream.bits_per_sample)
      : null,
  };
}
```

---

# 18. Validasi File Audio

Contoh aturan:

```ts
export function validateAudioMetadata(metadata: {
  codecName: string;
  sampleRate: number;
  bitsPerSample: number | null;
  channels: number;
}): string[] {
  const errors: string[] = [];

  const allowedCodecs = [
    "pcm_s16le",
    "pcm_s24le",
  ];

  if (!allowedCodecs.includes(metadata.codecName)) {
    errors.push(
      "Audio harus WAV PCM 16-bit atau 24-bit"
    );
  }

  const allowedSampleRates = [
    44100,
    48000,
    88200,
    96000,
  ];

  if (!allowedSampleRates.includes(metadata.sampleRate)) {
    errors.push(
      "Sample rate harus 44.1 kHz, 48 kHz, 88.2 kHz, atau 96 kHz"
    );
  }

  if (
    metadata.bitsPerSample &&
    ![16, 24].includes(metadata.bitsPerSample)
  ) {
    errors.push(
      "Bit depth harus 16-bit atau 24-bit"
    );
  }

  if (metadata.channels !== 2) {
    errors.push("Audio harus stereo");
  }

  return errors;
}
```

---

# 19. Database Migration

Buat folder:

```text
database/migrations
```

Contoh file:

```text
database/migrations/001_create_schema_migrations.sql
database/migrations/002_create_users.sql
database/migrations/003_create_releases.sql
database/migrations/004_create_tracks.sql
database/migrations/005_create_upload_sessions.sql
database/migrations/006_create_tickets.sql
database/migrations/007_create_notifications.sql
database/migrations/008_create_audit_logs.sql
```

Tabel migration:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Hindari mengubah schema otomatis saat request berjalan.

---

# 20. Audit Log

Buat tabel:

```sql
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(100) NULL,
  description TEXT NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_user_id (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_module (module),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created_at (created_at)
);
```

Catat aktivitas:

- Login
- Logout
- Login gagal
- Membuat user
- Mengubah role
- Menghapus user
- Membuat release
- Mengubah metadata release
- Menghapus release
- Mengubah status release
- Upload kontrak
- Mengubah pembayaran
- Impersonation
- Mengubah pengaturan

---

# 21. Package.json Target

Contoh:

```json
{
  "name": "dimensi-suara",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:migrate": "tsx database/migrate.ts",
    "db:seed": "tsx database/seed.ts"
  },
  "dependencies": {
    "bcryptjs": "^3.0.0",
    "jose": "^6.0.0",
    "lucide-react": "^0.500.0",
    "mysql2": "^3.14.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "xlsx": "^0.18.5",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Sesuaikan versi dependency dengan versi stabil yang digunakan pada saat implementasi.

---

# 22. Next.js Config

Buat:

```text
next.config.ts
```

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

# 23. Middleware Dasar

Buat:

```text
middleware.ts
```

```ts
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/user-status",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  const sessionToken =
    request.cookies.get("dimensi_session")?.value;

  if (!isPublicRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (
    isPublicRoute &&
    sessionToken &&
    pathname === "/login"
  ) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

Middleware hanya memeriksa keberadaan cookie. Validasi session penuh tetap dilakukan di server.

---

# 24. Tahapan Migrasi

## Tahap 0 — Pengamanan

- [ ] Backup database.
- [ ] Backup seluruh folder upload.
- [ ] Rotasi password database.
- [ ] Rotasi JWT atau AUTH secret.
- [ ] Hapus kredensial dari repository.
- [ ] Bersihkan riwayat Git.
- [ ] Hapus akun admin default.
- [ ] Buat branch migrasi.

Branch:

```bash
git checkout -b migration/nextjs-fullstack
```

---

## Tahap 1 — Bootstrap Next.js

- [ ] Buat project Next.js.
- [ ] Aktifkan TypeScript.
- [ ] Siapkan Tailwind CSS.
- [ ] Buat `src/lib/db.ts`.
- [ ] Buat `.env.local`.
- [ ] Buat endpoint health check.
- [ ] Tes koneksi MySQL.

---

## Tahap 2 — Layout dan Navigasi

- [ ] Pindahkan sidebar.
- [ ] Pindahkan header.
- [ ] Pindahkan logo.
- [ ] Pindahkan global CSS.
- [ ] Buat dashboard layout.
- [ ] Buat mobile navigation.
- [ ] Pertahankan tema visual saat ini.

---

## Tahap 3 — Autentikasi

- [ ] Pindahkan login.
- [ ] Pindahkan register.
- [ ] Buat HttpOnly cookie.
- [ ] Buat endpoint `/api/auth/me`.
- [ ] Buat logout.
- [ ] Buat middleware.
- [ ] Hapus localStorage token.
- [ ] Tambahkan rate limit.
- [ ] Tambahkan audit log.

---

## Tahap 4 — Modul User

- [ ] Daftar user.
- [ ] Detail user.
- [ ] Edit user.
- [ ] Verifikasi user.
- [ ] Ubah status.
- [ ] Ubah role.
- [ ] Upload dokumen.
- [ ] Kontrak user.
- [ ] Impersonation yang aman.

---

## Tahap 5 — Modul Release

- [ ] Daftar release.
- [ ] Detail release.
- [ ] Form release baru.
- [ ] Edit metadata.
- [ ] Track management.
- [ ] Artist management.
- [ ] Cover art.
- [ ] Tanggal rilis.
- [ ] Final review.
- [ ] Status workflow.
- [ ] UPC dan ISRC.
- [ ] Activity log.

---

## Tahap 6 — Upload

- [ ] Upload session.
- [ ] Chunk upload.
- [ ] Resume upload.
- [ ] Cancel upload.
- [ ] Cleanup temporary file.
- [ ] FFprobe validation.
- [ ] FFmpeg processing.
- [ ] Preview audio.
- [ ] File permission.
- [ ] Storage quota.

---

## Tahap 7 — Reports

- [ ] Import Excel.
- [ ] Validasi kolom.
- [ ] Grouping berdasarkan ISRC.
- [ ] Revenue calculation.
- [ ] User share.
- [ ] Invoice.
- [ ] Payment request.
- [ ] Payment approval.
- [ ] Export laporan.

---

## Tahap 8 — Publishing

- [ ] Lagu publishing.
- [ ] Composer.
- [ ] Owner.
- [ ] Kontrak.
- [ ] Report.
- [ ] Payment.
- [ ] Dashboard publishing.
- [ ] Upload dokumen.

---

## Tahap 9 — Ticketing

- [ ] Daftar tiket.
- [ ] Detail tiket.
- [ ] Status tiket.
- [ ] Riwayat pesan.
- [ ] Attachment.
- [ ] Admin reply.
- [ ] User reply.
- [ ] Notification.

---

## Tahap 10 — Settings dan Integrasi

- [ ] Application setting.
- [ ] Logo.
- [ ] Background login.
- [ ] SMTP.
- [ ] Google Drive.
- [ ] Spotify API.
- [ ] Webhook.
- [ ] Email template.
- [ ] Notification setting.

---

## Tahap 11 — Testing

- [ ] Unit test repository.
- [ ] Test API auth.
- [ ] Test role permission.
- [ ] Test SQL Injection.
- [ ] Test XSS.
- [ ] Test CSRF.
- [ ] Test upload besar.
- [ ] Test upload terputus.
- [ ] Test FFmpeg.
- [ ] Test Excel import.
- [ ] Test invoice.
- [ ] Test semua role.

---

## Tahap 12 — Deployment Plesk

- [ ] Gunakan Node.js 20 atau lebih baru.
- [ ] Jalankan `npm install`.
- [ ] Jalankan `npm run build`.
- [ ] Jalankan database migration.
- [ ] Atur environment variable di Plesk.
- [ ] Atur folder upload.
- [ ] Atur permission.
- [ ] Konfigurasi reverse proxy.
- [ ] Konfigurasi process manager.
- [ ] Konfigurasi backup.
- [ ] Konfigurasi log rotation.

---

# 25. Perintah Awal Migrasi

```bash
git clone https://github.com/fachry2204/DimensiSuaraNEW.git

cd DimensiSuaraNEW

git checkout -b migration/nextjs-fullstack
```

Install Next.js:

```bash
npm install next react react-dom
```

Install database dan backend dependency:

```bash
npm install mysql2 zod jose bcryptjs
```

Install dependency development:

```bash
npm install -D typescript @types/node @types/react @types/react-dom tsx
```

Jalankan:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production:

```bash
npm run start
```

---

# 26. Strategi Migrasi Tanpa Downtime Besar

Jangan langsung menghapus Express.

Gunakan pendekatan bertahap:

```text
Tahap 1:
Frontend lama + Express lama tetap berjalan.

Tahap 2:
Buat Next.js di branch terpisah.

Tahap 3:
Pindahkan login dan dashboard.

Tahap 4:
Pindahkan API satu per satu.

Tahap 5:
Pindahkan upload dan FFmpeg.

Tahap 6:
Lakukan user acceptance test.

Tahap 7:
Aktifkan Next.js sebagai aplikasi utama.

Tahap 8:
Matikan Express lama setelah stabil.
```

Database tetap sama selama migrasi agar data tidak perlu dipindahkan.

---

# 27. Prioritas Implementasi

Urutan yang direkomendasikan:

```text
1. Security dan backup
2. Fondasi Next.js
3. Koneksi MySQL
4. Authentication
5. Dashboard layout
6. User management
7. Release management
8. Upload audio dan cover
9. Reports
10. Publishing
11. Ticketing
12. Settings dan integrasi
13. Testing
14. Deployment
```

---

# 28. Risiko Migrasi

## Risiko Tinggi

- Upload audio berukuran besar.
- Chunk upload gagal dilanjutkan.
- File lama tidak terbaca.
- Perbedaan schema database antarserver.
- Token autentikasi lama.
- Role permission tidak konsisten.
- Path file hardcoded.
- FFmpeg tidak tersedia di server.
- Folder permission Plesk.
- Query SQL yang bergantung pada nama kolom lama.

## Mitigasi

- Gunakan staging server.
- Backup database dan upload.
- Pertahankan endpoint lama.
- Gunakan migration SQL.
- Tes satu modul per tahap.
- Tambahkan audit log.
- Jangan menghapus server lama sebelum UAT selesai.
- Gunakan environment variable untuk seluruh path.

---

# 29. Definition of Done

Migrasi dianggap selesai jika:

- [ ] Aplikasi menggunakan Next.js App Router.
- [ ] Tidak lagi menggunakan Vite.
- [ ] Tidak lagi menggunakan React Router.
- [ ] Tidak lagi membutuhkan Express sebagai server utama.
- [ ] Seluruh endpoint menggunakan Route Handler.
- [ ] Database menggunakan `mysql2/promise`.
- [ ] Token tidak disimpan di localStorage.
- [ ] Session menggunakan HttpOnly cookie.
- [ ] Upload audio besar dapat dilanjutkan.
- [ ] FFmpeg dan FFprobe berfungsi.
- [ ] Seluruh role memiliki akses yang benar.
- [ ] Seluruh modul utama lolos testing.
- [ ] Tidak ada secret di Git.
- [ ] Tidak ada SQL error yang dikirim ke browser.
- [ ] Deployment Plesk stabil.
- [ ] Backup dan rollback tersedia.

---

# 30. Kesimpulan

Migrasi DimensiSuaraNEW ke Next.js fullstack sangat memungkinkan tanpa mengganti MySQL.

Arsitektur akhir yang disarankan:

```text
Next.js App Router
├── Server Components
├── Client Components
├── Route Handlers
├── HttpOnly Cookie Authentication
├── Role-Based Access Control
├── MySQL
├── mysql2/promise
├── Chunk Upload
├── FFmpeg dan FFprobe
├── Audit Log
└── Database Migration
```

Bagian paling penting yang harus dikerjakan terlebih dahulu:

1. Mengamankan kredensial.
2. Membuat backup database dan file.
3. Membuat fondasi Next.js.
4. Memindahkan autentikasi.
5. Memecah `App.tsx`.
6. Memindahkan Express Router ke Route Handler.
7. Menangani upload audio besar.
8. Menormalisasi schema database.
9. Melakukan testing seluruh role.
10. Melakukan deployment bertahap.

Database dan query lama dapat dipertahankan selama query tersebut menggunakan parameterized query, transaction, validasi input, dan permission yang benar.
