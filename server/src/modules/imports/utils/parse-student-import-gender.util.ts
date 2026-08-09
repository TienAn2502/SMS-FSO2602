import type { Gender } from '@prisma/client';

const GENDER_ALIASES: Record<string, Gender> = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  NAM: 'MALE',
  NU: 'FEMALE',
  NỮ: 'FEMALE',
  KHAC: 'OTHER',
  KHÁC: 'OTHER',
};

export function parseStudentImportGender(
  raw: string | undefined,
): Gender | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  return GENDER_ALIASES[normalized];
}
