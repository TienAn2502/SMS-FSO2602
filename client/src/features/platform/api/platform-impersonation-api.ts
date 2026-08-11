import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

import type { ImpersonationMode, ImpersonationSession } from '@/features/auth/types';

export interface StartImpersonationResult {
  impersonation: ImpersonationSession;
  redirectTo: string;
}

export interface EndImpersonationResult {
  ended: true;
  redirectTo: string;
}

export async function startPlatformImpersonation(
  schoolId: string,
  mode: ImpersonationMode = 'read_only',
) {
  const { data } = await api.post<ApiSuccessResponse<StartImpersonationResult>>(
    `/platform/schools/${schoolId}/impersonate`,
    { mode },
  );

  return data.data;
}

export async function endPlatformImpersonation() {
  const { data } = await api.post<ApiSuccessResponse<EndImpersonationResult>>(
    '/platform/impersonation/end',
  );

  return data.data;
}
