import type { GradeLevel } from '@prisma/client';

export interface GradeLevelResponse {
  id: string;
  name: string;
  code: string;
}

export function toGradeLevelResponse(
  gradeLevel: GradeLevel,
): GradeLevelResponse {
  return {
    id: gradeLevel.id,
    name: gradeLevel.name,
    code: gradeLevel.code,
  };
}
