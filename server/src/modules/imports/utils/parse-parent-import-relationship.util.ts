import type { ParentRelationship } from '@prisma/client';

const RELATIONSHIP_ALIASES: Record<string, ParentRelationship> = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  GUARDIAN: 'GUARDIAN',
  OTHER: 'OTHER',
  BO: 'FATHER',
  BỐ: 'FATHER',
  CHA: 'FATHER',
  ME: 'MOTHER',
  MẸ: 'MOTHER',
  GIAM_HO: 'GUARDIAN',
  GIAMHO: 'GUARDIAN',
  'NGUOI GIAM HO': 'GUARDIAN',
  'NGƯỜI GIÁM HỘ': 'GUARDIAN',
  KHAC: 'OTHER',
  KHÁC: 'OTHER',
};

export function parseParentImportRelationship(
  raw: string | undefined,
): ParentRelationship | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toUpperCase();
  return RELATIONSHIP_ALIASES[normalized];
}
