import { z } from 'zod';

/**
 * Cờ tạo tài khoản đăng nhập.
 * Không nhận email/mật khẩu từ client — BE tự cấp theo mã + ngày sinh.
 * Chấp nhận `true` hoặc object rỗng/legacy `{ email?, password? }` (bỏ qua).
 */
export const createLoginAccountFlagSchema = z
  .union([
    z.literal(true),
    z
      .object({
        email: z.string().optional(),
        password: z.string().optional(),
      })
      .passthrough(),
  ])
  .optional();

export type CreateLoginAccountFlag = z.infer<
  typeof createLoginAccountFlagSchema
>;

/** Body cấp tài khoản sau khi đã có hồ sơ — không cần field. */
export const provisionLoginAccountSchema = z.object({}).default({});

export type ProvisionLoginAccountInput = z.infer<
  typeof provisionLoginAccountSchema
>;
