import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Nhập mã HS/GV/PH, số điện thoại hoặc email'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
