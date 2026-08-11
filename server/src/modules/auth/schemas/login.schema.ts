import { z } from 'zod';

/**
 * Đăng nhập bằng:
 * - Email (SCHOOL_ADMIN / SYSTEM_ADMIN, hoặc tài khoản còn dùng email)
 * - Mã hồ sơ: HS-261, GV-1, PH-12
 * - Số điện thoại trên hồ sơ HS/GV/PH
 *
 * `email` giữ tương thích ngược với client cũ.
 */
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().min(1).max(255).optional(),
    password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  })
  .superRefine((value, ctx) => {
    if (!value.identifier?.trim() && !value.email?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Nhập mã HS/GV/PH, số điện thoại hoặc email',
        path: ['identifier'],
      });
    }
  })
  .transform((value) => ({
    identifier: (value.identifier ?? value.email ?? '').trim(),
    password: value.password,
  }));

export type LoginInput = z.infer<typeof loginSchema>;
