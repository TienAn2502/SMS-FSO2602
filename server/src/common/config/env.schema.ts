import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET phải có ít nhất 32 ký tự'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET phải có ít nhất 32 ký tự'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN phải là URL hợp lệ'),
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID là bắt buộc'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID là bắt buộc'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY là bắt buộc'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET là bắt buộc'),
  R2_SIGNED_URL_EXPIRES_SEC: z.coerce.number().int().positive().default(900),
  R2_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(2_097_152),
  IMPORT_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  IMPORT_MAX_ROWS: z.coerce.number().int().positive().default(10_000),
  IMPORT_DEFAULT_STUDENT_PASSWORD: z.string().min(8).default('Demo@123456'),
  PUPPETEER_EXECUTABLE_PATH: z.string().trim().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(
      `Cấu hình môi trường không hợp lệ:\n${messages.join('\n')}`,
    );
  }
  return result.data;
}
