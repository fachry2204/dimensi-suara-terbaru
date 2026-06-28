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
    if (process.env[variable] === undefined) {
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
