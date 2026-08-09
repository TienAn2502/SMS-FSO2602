import type { School, User } from '@prisma/client';

import type { AuthSessionData } from '@/common/auth/auth.types';

type UserWithSchool = User & { school: School };

export function toAuthSessionData(user: UserWithSchool): AuthSessionData {
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    },
    activeSchoolId: user.schoolId,
    activeSchool: {
      id: user.school.id,
      code: user.school.code,
      name: user.school.name,
      shortName: user.school.shortName,
    },
  };
}
