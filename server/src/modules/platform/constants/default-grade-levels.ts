import type { SchoolType } from '@prisma/client';

export interface DefaultGradeLevelTemplate {
  code: string;
  name: string;
}

const DEFAULT_GRADE_LEVELS_BY_TYPE: Record<
  SchoolType,
  DefaultGradeLevelTemplate[]
> = {
  TH: [
    { code: '1', name: 'Khối 1' },
    { code: '2', name: 'Khối 2' },
    { code: '3', name: 'Khối 3' },
    { code: '4', name: 'Khối 4' },
    { code: '5', name: 'Khối 5' },
  ],
  THCS: [
    { code: '6', name: 'Khối 6' },
    { code: '7', name: 'Khối 7' },
    { code: '8', name: 'Khối 8' },
    { code: '9', name: 'Khối 9' },
  ],
  THPT: [
    { code: '10', name: 'Khối 10' },
    { code: '11', name: 'Khối 11' },
    { code: '12', name: 'Khối 12' },
  ],
};

export function getDefaultGradeLevelsForSchoolType(
  schoolType: SchoolType | null | undefined,
): DefaultGradeLevelTemplate[] {
  if (!schoolType) {
    return [];
  }

  return DEFAULT_GRADE_LEVELS_BY_TYPE[schoolType] ?? [];
}
