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

  JWT_SECRET: z.string().min(10).optional(),
  AUTH_SECRET: z.string().min(10).optional(),

  UPLOAD_ROOT: z.string().min(1).optional(),
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
