import { z } from 'zod';

export const startPlatformImpersonationSchema = z.object({
  mode: z.enum(['read_only', 'full']).default('read_only'),
});

export type StartPlatformImpersonationInput = z.infer<
  typeof startPlatformImpersonationSchema
>;

export interface PlatformImpersonationStartResult {
  impersonation: {
    targetSchoolId: string;
    targetSchoolName: string;
    impersonatedBy: string;
    mode: 'read_only' | 'full';
    startedAt: string;
  };
  redirectTo: string;
}

export interface PlatformImpersonationEndResult {
  ended: true;
  redirectTo: string;
}
