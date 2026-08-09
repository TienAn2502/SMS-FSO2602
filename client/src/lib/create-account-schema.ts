import { z } from 'zod';

export const createAccountFields = {
  createAccount: z.boolean().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
} as const;

export function refineCreateAccountFields(
  values: {
    createAccount?: boolean;
    email?: string;
    password?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (!values.createAccount) {
    return;
  }

  if (!values.email?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Email là bắt buộc khi tạo tài khoản',
      path: ['email'],
    });
  }

  if (!values.password || values.password.length < 8) {
    ctx.addIssue({
      code: 'custom',
      message: 'Mật khẩu phải có ít nhất 8 ký tự',
      path: ['password'],
    });
  }
}

export function buildOptionalAccountPayload(values: {
  createAccount?: boolean;
  email?: string;
  password?: string;
}) {
  if (values.createAccount && values.email && values.password) {
    return {
      account: {
        email: values.email,
        password: values.password,
      },
    };
  }

  return {};
}
