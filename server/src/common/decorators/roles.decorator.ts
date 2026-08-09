import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { ROLES_KEY } from '@/common/auth/auth.constants';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
