import { z } from 'zod';

export const createAccountFields = {
  createAccount: z.boolean().optional(),
} as const;

export function refineCreateAccountFields(
  _values: { createAccount?: boolean },
  _ctx: z.RefinementCtx,
) {
  // Email/mật khẩu tự sinh từ mã HS/GV/PH + ngày sinh (hoặc SĐT với PH)
}

export function buildOptionalAccountPayload(values: {
  createAccount?: boolean;
}): { createLogin?: true } {
  if (values.createAccount) {
    return { createLogin: true };
  }

  return {};
}
